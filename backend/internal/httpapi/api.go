package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/mail"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/akeluwa/software-hub/backend/internal/auth"
	"github.com/akeluwa/software-hub/backend/internal/config"
	"github.com/akeluwa/software-hub/backend/internal/model"
	"github.com/akeluwa/software-hub/backend/internal/store"
	"github.com/jackc/pgx/v5/pgconn"
)

type contextKey string

const claimsKey contextKey = "session_claims"

var slugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

type API struct {
	cfg        config.Config
	store      *store.Store
	tokens     *auth.Manager
	logger     *slog.Logger
	origins    map[string]struct{}
	rateLimits *rateLimiter
}

func New(cfg config.Config, data *store.Store, tokens *auth.Manager, logger *slog.Logger) *API {
	origins := make(map[string]struct{}, len(cfg.AllowedOrigins))
	for _, origin := range cfg.AllowedOrigins {
		origins[origin] = struct{}{}
	}
	return &API{cfg: cfg, store: data, tokens: tokens, logger: logger, origins: origins, rateLimits: newRateLimiter(time.Now)}
}

func (a *API) Router() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", a.health)
	mux.Handle("POST /api/v1/auth/register", a.limitRequests("register", 5, time.Hour, http.HandlerFunc(a.register)))
	mux.Handle("POST /api/v1/auth/login", a.limitRequests("login", 8, time.Minute, http.HandlerFunc(a.login)))
	mux.HandleFunc("POST /api/v1/auth/logout", a.logout)
	mux.Handle("GET /api/v1/auth/me", a.requireAuth(http.HandlerFunc(a.me)))
	mux.HandleFunc("GET /api/v1/services", a.publicServices)
	mux.HandleFunc("GET /api/v1/portfolio", a.publicPortfolio)
	mux.Handle("POST /api/v1/inquiries", a.limitRequests("inquiry", 5, 10*time.Minute, http.HandlerFunc(a.createInquiry)))
	mux.Handle("GET /api/v1/account/inquiries", a.requireAuth(http.HandlerFunc(a.accountInquiries)))

	mux.Handle("GET /api/v1/admin/stats", a.requireAdmin(http.HandlerFunc(a.adminStats)))
	mux.Handle("GET /api/v1/admin/users", a.requireAdmin(http.HandlerFunc(a.adminUsers)))
	mux.Handle("PATCH /api/v1/admin/users/{id}/role", a.requireAdmin(a.auditAdmin(http.HandlerFunc(a.adminUpdateUserRole))))
	mux.Handle("GET /api/v1/admin/inquiries", a.requireAdmin(http.HandlerFunc(a.adminInquiries)))
	mux.Handle("PATCH /api/v1/admin/inquiries/{id}", a.requireAdmin(a.auditAdmin(http.HandlerFunc(a.adminUpdateInquiry))))
	mux.Handle("GET /api/v1/admin/services", a.requireAdmin(http.HandlerFunc(a.adminServices)))
	mux.Handle("POST /api/v1/admin/services", a.requireAdmin(a.auditAdmin(http.HandlerFunc(a.adminCreateService))))
	mux.Handle("PUT /api/v1/admin/services/{id}", a.requireAdmin(a.auditAdmin(http.HandlerFunc(a.adminUpdateService))))
	mux.Handle("DELETE /api/v1/admin/services/{id}", a.requireAdmin(a.auditAdmin(http.HandlerFunc(a.adminDeleteService))))
	mux.Handle("GET /api/v1/admin/portfolio", a.requireAdmin(http.HandlerFunc(a.adminPortfolio)))
	mux.Handle("POST /api/v1/admin/portfolio", a.requireAdmin(a.auditAdmin(http.HandlerFunc(a.adminCreatePortfolio))))
	mux.Handle("PUT /api/v1/admin/portfolio/{id}", a.requireAdmin(a.auditAdmin(http.HandlerFunc(a.adminUpdatePortfolio))))
	mux.Handle("DELETE /api/v1/admin/portfolio/{id}", a.requireAdmin(a.auditAdmin(http.HandlerFunc(a.adminDeletePortfolio))))

	return a.recoverPanic(a.logRequests(a.securityHeaders(a.cors(a.protectCookieWrites(mux)))))
}

func (a *API) health(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := a.store.Ping(ctx); err != nil {
		writeError(w, http.StatusServiceUnavailable, "database unavailable")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *API) register(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !a.decode(w, r, &input) {
		return
	}
	input.Name = strings.TrimSpace(input.Name)
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))
	if len(input.Name) < 2 || len(input.Name) > 120 || !validEmail(input.Email) || len(input.Password) < 8 || len(input.Password) > 72 {
		writeError(w, http.StatusUnprocessableEntity, "provide a valid name, email, and password of 8–72 characters")
		return
	}
	hash, err := auth.HashPassword(input.Password)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	user, err := a.store.CreateUser(r.Context(), input.Name, input.Email, hash, "user")
	if err != nil {
		if isUniqueViolation(err) {
			writeError(w, http.StatusConflict, "an account already exists for this email")
			return
		}
		a.internalError(w, r, err)
		return
	}
	if err := a.startSession(w, user); err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"user": user})
}

func (a *API) login(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !a.decode(w, r, &input) {
		return
	}
	user, err := a.store.FindUserByEmail(r.Context(), strings.TrimSpace(input.Email))
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusUnauthorized, "invalid email or password")
			return
		}
		a.internalError(w, r, err)
		return
	}
	if !auth.CheckPassword(user.PasswordHash, input.Password) {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}
	user.PasswordHash = ""
	if err := a.startSession(w, user); err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}

func (a *API) logout(w http.ResponseWriter, _ *http.Request) {
	a.clearSession(w)
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) me(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	user, err := a.store.FindUserByID(r.Context(), claims.UserID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			a.clearSession(w)
			writeError(w, http.StatusUnauthorized, "session is no longer valid")
			return
		}
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}

func (a *API) publicServices(w http.ResponseWriter, r *http.Request) {
	items, err := a.store.ListServices(r.Context(), false)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"services": items})
}

func (a *API) publicPortfolio(w http.ResponseWriter, r *http.Request) {
	items, err := a.store.ListPortfolio(r.Context(), false)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"portfolio": items})
}

func (a *API) createInquiry(w http.ResponseWriter, r *http.Request) {
	var input model.Inquiry
	if !a.decode(w, r, &input) {
		return
	}
	input.Name = strings.TrimSpace(input.Name)
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))
	input.Company = strings.TrimSpace(input.Company)
	input.Budget = strings.TrimSpace(input.Budget)
	input.Message = strings.TrimSpace(input.Message)
	if len(input.Name) < 2 || len(input.Name) > 120 || !validEmail(input.Email) || len(input.Message) < 10 || len(input.Message) > 5000 || len(input.Company) > 160 || len(input.Budget) > 80 {
		writeError(w, http.StatusUnprocessableEntity, "provide a valid name, email, and project message")
		return
	}
	if claims, ok := a.optionalClaims(r); ok {
		input.UserID = claims.UserID
	}
	item, err := a.store.CreateInquiry(r.Context(), input)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"inquiry": item})
}

func (a *API) accountInquiries(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	items, err := a.store.ListInquiries(r.Context(), claims.UserID)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"inquiries": items})
}

func (a *API) adminStats(w http.ResponseWriter, r *http.Request) {
	stats, err := a.store.DashboardStats(r.Context())
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"stats": stats})
}

func (a *API) adminUsers(w http.ResponseWriter, r *http.Request) {
	users, err := a.store.ListUsers(r.Context())
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"users": users})
}

func (a *API) adminUpdateUserRole(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Role string `json:"role"`
	}
	if !a.decode(w, r, &input) {
		return
	}
	if input.Role != "user" && input.Role != "admin" {
		writeError(w, http.StatusUnprocessableEntity, "role must be user or admin")
		return
	}
	claims := claimsFromContext(r.Context())
	if claims.UserID == r.PathValue("id") && input.Role != "admin" {
		writeError(w, http.StatusConflict, "you cannot remove your own administrator role")
		return
	}
	user, err := a.store.UpdateUserRole(r.Context(), r.PathValue("id"), input.Role)
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}

func (a *API) adminInquiries(w http.ResponseWriter, r *http.Request) {
	items, err := a.store.ListInquiries(r.Context(), "")
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"inquiries": items})
}

func (a *API) adminUpdateInquiry(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Status string `json:"status"`
	}
	if !a.decode(w, r, &input) {
		return
	}
	if input.Status != "new" && input.Status != "in_progress" && input.Status != "closed" {
		writeError(w, http.StatusUnprocessableEntity, "status must be new, in_progress, or closed")
		return
	}
	item, err := a.store.UpdateInquiryStatus(r.Context(), r.PathValue("id"), input.Status)
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"inquiry": item})
}

func (a *API) adminServices(w http.ResponseWriter, r *http.Request) {
	items, err := a.store.ListServices(r.Context(), true)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"services": items})
}

func (a *API) adminCreateService(w http.ResponseWriter, r *http.Request) {
	item, ok := a.decodeService(w, r)
	if !ok {
		return
	}
	created, err := a.store.CreateService(r.Context(), item)
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"service": created})
}

func (a *API) adminUpdateService(w http.ResponseWriter, r *http.Request) {
	item, ok := a.decodeService(w, r)
	if !ok {
		return
	}
	updated, err := a.store.UpdateService(r.Context(), r.PathValue("id"), item)
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"service": updated})
}

func (a *API) adminDeleteService(w http.ResponseWriter, r *http.Request) {
	if !a.handleStoreError(w, r, a.store.DeleteService(r.Context(), r.PathValue("id"))) {
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) adminPortfolio(w http.ResponseWriter, r *http.Request) {
	items, err := a.store.ListPortfolio(r.Context(), true)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"portfolio": items})
}

func (a *API) adminCreatePortfolio(w http.ResponseWriter, r *http.Request) {
	item, ok := a.decodePortfolio(w, r)
	if !ok {
		return
	}
	created, err := a.store.CreatePortfolioItem(r.Context(), item)
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"portfolio_item": created})
}

func (a *API) adminUpdatePortfolio(w http.ResponseWriter, r *http.Request) {
	item, ok := a.decodePortfolio(w, r)
	if !ok {
		return
	}
	updated, err := a.store.UpdatePortfolioItem(r.Context(), r.PathValue("id"), item)
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"portfolio_item": updated})
}

func (a *API) adminDeletePortfolio(w http.ResponseWriter, r *http.Request) {
	if !a.handleStoreError(w, r, a.store.DeletePortfolioItem(r.Context(), r.PathValue("id"))) {
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) decodeService(w http.ResponseWriter, r *http.Request) (model.Service, bool) {
	var item model.Service
	if !a.decode(w, r, &item) {
		return model.Service{}, false
	}
	item.Number = strings.TrimSpace(item.Number)
	item.Slug = strings.ToLower(strings.TrimSpace(item.Slug))
	item.Title = strings.TrimSpace(item.Title)
	item.Summary = strings.TrimSpace(item.Summary)
	item.Stack = strings.TrimSpace(item.Stack)
	if item.Number == "" || len(item.Number) > 10 || !slugPattern.MatchString(item.Slug) || len(item.Title) < 2 || len(item.Title) > 140 || len(item.Summary) < 10 || len(item.Summary) > 1000 || len(item.Stack) < 2 || len(item.Stack) > 300 {
		writeError(w, http.StatusUnprocessableEntity, "service fields are incomplete or invalid")
		return model.Service{}, false
	}
	return item, true
}

func (a *API) decodePortfolio(w http.ResponseWriter, r *http.Request) (model.PortfolioItem, bool) {
	var item model.PortfolioItem
	if !a.decode(w, r, &item) {
		return model.PortfolioItem{}, false
	}
	item.Slug = strings.ToLower(strings.TrimSpace(item.Slug))
	item.Title = strings.TrimSpace(item.Title)
	item.Summary = strings.TrimSpace(item.Summary)
	item.Technologies = strings.TrimSpace(item.Technologies)
	item.ProjectURL = strings.TrimSpace(item.ProjectURL)
	if !slugPattern.MatchString(item.Slug) || len(item.Title) < 2 || len(item.Title) > 160 || len(item.Summary) < 10 || len(item.Summary) > 1200 || len(item.Technologies) < 2 || len(item.Technologies) > 300 || !validOptionalURL(item.ProjectURL) {
		writeError(w, http.StatusUnprocessableEntity, "portfolio fields are incomplete or invalid")
		return model.PortfolioItem{}, false
	}
	return item, true
}

func (a *API) startSession(w http.ResponseWriter, user model.User) error {
	value, expiresAt, err := a.tokens.Issue(user.ID, user.Role, user.Name)
	if err != nil {
		return err
	}
	http.SetCookie(w, &http.Cookie{
		Name:     a.cfg.CookieName,
		Value:    value,
		Path:     "/",
		Domain:   a.cfg.CookieDomain,
		Expires:  expiresAt,
		MaxAge:   int(time.Until(expiresAt).Seconds()),
		HttpOnly: true,
		Secure:   a.cfg.CookieSecure,
		SameSite: a.sameSite(),
	})
	return nil
}

func (a *API) clearSession(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     a.cfg.CookieName,
		Value:    "",
		Path:     "/",
		Domain:   a.cfg.CookieDomain,
		MaxAge:   -1,
		Expires:  time.Unix(1, 0),
		HttpOnly: true,
		Secure:   a.cfg.CookieSecure,
		SameSite: a.sameSite(),
	})
}

func (a *API) sameSite() http.SameSite {
	switch a.cfg.CookieSameSite {
	case "strict":
		return http.SameSiteStrictMode
	case "none":
		return http.SameSiteNoneMode
	default:
		return http.SameSiteLaxMode
	}
}

func (a *API) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := a.optionalClaims(r)
		if !ok {
			writeError(w, http.StatusUnauthorized, "authentication required")
			return
		}
		ctx := context.WithValue(r.Context(), claimsKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (a *API) requireAdmin(next http.Handler) http.Handler {
	return a.requireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := claimsFromContext(r.Context())
		user, err := a.store.FindUserByID(r.Context(), claims.UserID)
		if err != nil {
			if errors.Is(err, store.ErrNotFound) {
				writeError(w, http.StatusUnauthorized, "session is no longer valid")
				return
			}
			a.internalError(w, r, err)
			return
		}
		if user.Role != "admin" {
			writeError(w, http.StatusForbidden, "administrator access required")
			return
		}
		next.ServeHTTP(w, r)
	}))
}

func (a *API) optionalClaims(r *http.Request) (auth.Claims, bool) {
	value := ""
	if cookie, err := r.Cookie(a.cfg.CookieName); err == nil {
		value = cookie.Value
	}
	if value == "" {
		const prefix = "Bearer "
		authorization := r.Header.Get("Authorization")
		if strings.HasPrefix(authorization, prefix) {
			value = strings.TrimSpace(strings.TrimPrefix(authorization, prefix))
		}
	}
	if value == "" {
		return auth.Claims{}, false
	}
	claims, err := a.tokens.Parse(value)
	return claims, err == nil
}

func claimsFromContext(ctx context.Context) auth.Claims {
	claims, _ := ctx.Value(claimsKey).(auth.Claims)
	return claims
}

func (a *API) decode(w http.ResponseWriter, r *http.Request, target any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, a.cfg.MaxRequestBytes)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON request")
		return false
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "request must contain one JSON object")
		return false
	}
	return true
}

func (a *API) handleStoreError(w http.ResponseWriter, r *http.Request, err error) bool {
	if err == nil {
		return true
	}
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "record not found")
		return false
	}
	if isUniqueViolation(err) {
		writeError(w, http.StatusConflict, "a record with this email or slug already exists")
		return false
	}
	a.internalError(w, r, err)
	return false
}

func (a *API) internalError(w http.ResponseWriter, r *http.Request, err error) {
	a.logger.Error("request failed", "method", r.Method, "path", r.URL.Path, "error", err)
	writeError(w, http.StatusInternalServerError, "the server could not complete this request")
}

func (a *API) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := strings.TrimRight(r.Header.Get("Origin"), "/")
		if origin != "" {
			if _, allowed := a.origins[origin]; !allowed {
				if r.Method == http.MethodOptions || (r.Method != http.MethodGet && r.Method != http.MethodHead) {
					writeError(w, http.StatusForbidden, "origin is not allowed")
					return
				}
			} else {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
				w.Header().Add("Vary", "Origin")
			}
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (a *API) securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
		w.Header().Set("Permissions-Policy", "camera=(), geolocation=(), microphone=()")
		if a.cfg.CookieSecure {
			w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		w.Header().Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}

func (a *API) protectCookieWrites(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}
		if _, err := r.Cookie(a.cfg.CookieName); err == nil {
			origin := strings.TrimRight(strings.TrimSpace(r.Header.Get("Origin")), "/")
			if _, allowed := a.origins[origin]; !allowed {
				writeError(w, http.StatusForbidden, "request origin is not allowed")
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func (a *API) auditAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := claimsFromContext(r.Context())
		a.logger.Info("admin action", "actor_id", claims.UserID, "method", r.Method, "path", r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

func (a *API) logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		next.ServeHTTP(w, r)
		a.logger.Info("request", "method", r.Method, "path", r.URL.Path, "duration", time.Since(started))
	})
}

func (a *API) recoverPanic(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if value := recover(); value != nil {
				a.logger.Error("panic recovered", "value", fmt.Sprint(value), "path", r.URL.Path)
				writeError(w, http.StatusInternalServerError, "the server could not complete this request")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func validEmail(value string) bool {
	address, err := mail.ParseAddress(value)
	return err == nil && strings.EqualFold(address.Address, value) && len(value) <= 254
}

func validOptionalURL(value string) bool {
	if value == "" {
		return true
	}
	if len(value) > 500 {
		return false
	}
	parsed, err := url.ParseRequestURI(value)
	return err == nil && (parsed.Scheme == "https" || parsed.Scheme == "http") && parsed.Host != ""
}

func isUniqueViolation(err error) bool {
	var databaseError *pgconn.PgError
	return errors.As(err, &databaseError) && databaseError.Code == "23505"
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		slog.Error("encode response", "error", err)
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
