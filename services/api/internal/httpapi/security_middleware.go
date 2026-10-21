package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
	"github.com/akeluwa/software-hub/backend/internal/auth"
	"github.com/akeluwa/software-hub/backend/internal/model"
	"github.com/akeluwa/software-hub/backend/internal/store"
)

func (a *API) startSession(w http.ResponseWriter, user model.User, mfaVerified bool) error {
	value, expiresAt, err := a.tokens.Issue(user.ID, user.Role, user.Name, mfaVerified, user.SessionVersion)
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
		user, err := a.store.FindUserByID(r.Context(), claims.UserID)
		if err != nil {
			if !errors.Is(err, store.ErrNotFound) {
				a.internalError(w, r, err)
				return
			}
			a.clearSession(w)
			writeError(w, http.StatusUnauthorized, "session is no longer valid")
			return
		}
		if !user.AccountActive || user.SessionVersion != claims.SessionVersion || (user.Role == "user" && user.EmailVerifiedAt == nil) {
			a.clearSession(w)
			writeError(w, http.StatusUnauthorized, "session is no longer valid")
			return
		}
		ctx := context.WithValue(r.Context(), claimsKey, claims)
		ctx = context.WithValue(ctx, authUserKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (a *API) requireAdmin(next http.Handler) http.Handler {
	return a.requireAnyAdminPermission(nil, next)
}

func (a *API) requireFullAdmin(next http.Handler) http.Handler {
	return a.requireAdminAccess(nil, true, next)
}

func (a *API) requireAdminPermission(permission string, next http.Handler) http.Handler {
	return a.requireAnyAdminPermission([]string{permission}, next)
}

func (a *API) requireAnyAdminPermission(permissions []string, next http.Handler) http.Handler {
	return a.requireAdminAccess(permissions, false, next)
}

func (a *API) requireAdminAccess(permissions []string, fullAdminOnly bool, next http.Handler) http.Handler {
	return a.requireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := claimsFromContext(r.Context())
		user, ok := r.Context().Value(authUserKey).(model.User)
		if !ok {
			writeError(w, http.StatusUnauthorized, "session is no longer valid")
			return
		}
		if !user.AccountActive || !isPrivilegedRole(user.Role) {
			writeError(w, http.StatusForbidden, "administrator access required")
			return
		}
		if !claims.MFAVerified || !user.MFAEnabled {
			writeError(w, http.StatusForbidden, "administrator MFA verification required")
			return
		}
		if fullAdminOnly && user.Role != "admin" {
			writeError(w, http.StatusForbidden, "full administrator access required")
			return
		}
		if user.Role == "sub_admin" && len(permissions) > 0 && !hasAnyAdminPermission(user.AdminPermissions, permissions) {
			writeError(w, http.StatusForbidden, "this administrator privilege is not assigned")
			return
		}
		ctx := context.WithValue(r.Context(), adminUserKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	}))
}

func (a *API) deferDestructiveAction(w http.ResponseWriter, r *http.Request, action string) bool {
	user, ok := r.Context().Value(adminUserKey).(model.User)
	if !ok || user.Role != "sub_admin" {
		return false
	}
	targetID := r.PathValue("id")
	label, err := a.store.AdminActionTargetLabel(r.Context(), action, targetID)
	if !a.handleStoreError(w, r, err) {
		return true
	}
	item, err := a.store.CreateAdminActionRequest(r.Context(), user.ID, action, targetID, label)
	if isUniqueViolation(err) {
		writeError(w, http.StatusConflict, "this action is already waiting for administrator review")
		return true
	}
	if !a.handleStoreError(w, r, err) {
		return true
	}
	writeJSON(w, http.StatusAccepted, map[string]any{
		"queued":         true,
		"action_request": item,
	})
	return true
}

func isPrivilegedRole(role string) bool {
	return role == "admin" || role == "sub_admin"
}

func hasAnyAdminPermission(assigned, required []string) bool {
	for _, permission := range required {
		for _, value := range assigned {
			if value == permission {
				return true
			}
		}
	}
	return false
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

func (a *API) handleAccountingError(w http.ResponseWriter, r *http.Request, err error) bool {
	if errors.Is(err, store.ErrInvoiceOverpayment) {
		writeError(w, http.StatusConflict, "payment exceeds the remaining invoice balance")
		return false
	}
	if errors.Is(err, store.ErrInvalidAccountingState) {
		writeError(w, http.StatusConflict, "this accounting record cannot be changed in its current state")
		return false
	}
	if isUniqueViolation(err) {
		writeError(w, http.StatusConflict, "an accounting record with this number already exists")
		return false
	}
	return a.handleStoreError(w, r, err)
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
		recorder := &statusResponseWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(recorder, r)
		agent := r.UserAgent()
		if len(agent) > 500 {
			agent = agent[:500]
		}
		entry := model.AdminAuditLog{
			ActorID:   claims.UserID,
			Method:    r.Method,
			Path:      r.URL.Path,
			Status:    recorder.status,
			SourceIP:  a.clientIP(r),
			UserAgent: agent,
		}
		if err := a.store.CreateAdminAuditLog(r.Context(), entry); err != nil {
			a.logger.Error("admin audit persistence failed", "actor_id", claims.UserID, "method", r.Method, "path", r.URL.Path, "error", err)
		}
	})
}

type statusResponseWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusResponseWriter) WriteHeader(status int) {
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

func (w *statusResponseWriter) Write(body []byte) (int, error) {
	return w.ResponseWriter.Write(body)
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
