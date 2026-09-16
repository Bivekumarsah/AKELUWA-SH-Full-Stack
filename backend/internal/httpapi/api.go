package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime"
	"net"
	"net/http"
	"net/mail"
	"net/url"
	"path/filepath"
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
	mux.Handle("PATCH /api/v1/account/profile", a.requireAuth(http.HandlerFunc(a.updateProfile)))
	mux.Handle("POST /api/v1/account/avatar", a.requireAuth(http.HandlerFunc(a.updateAvatar)))
	mux.Handle("DELETE /api/v1/account/avatar", a.requireAuth(http.HandlerFunc(a.removeAvatar)))
	mux.Handle("GET /api/v1/account/avatar", a.requireAuth(http.HandlerFunc(a.avatar)))
	mux.HandleFunc("GET /api/v1/services", a.publicServices)
	mux.HandleFunc("GET /api/v1/portfolio", a.publicPortfolio)
	mux.HandleFunc("GET /api/v1/downloads", a.publicDownloads)
	mux.HandleFunc("GET /api/v1/downloads/{id}/file", a.publicDownloadFile)
	mux.HandleFunc("GET /api/v1/careers", a.publicCareers)
	mux.Handle("POST /api/v1/careers/{id}/applications", a.limitRequests("career-application", 5, time.Hour, http.HandlerFunc(a.createCareerApplication)))
	mux.Handle("POST /api/v1/inquiries", a.limitRequests("inquiry", 5, 10*time.Minute, http.HandlerFunc(a.createInquiry)))
	mux.Handle("GET /api/v1/account/inquiries", a.requireAuth(http.HandlerFunc(a.accountInquiries)))
	mux.Handle("GET /api/v1/account/contracts", a.requireAuth(http.HandlerFunc(a.accountContracts)))
	mux.Handle("POST /api/v1/account/contracts/{id}/sign", a.requireAuth(http.HandlerFunc(a.accountSignContract)))

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
	mux.Handle("GET /api/v1/admin/contracts", a.requireAdmin(http.HandlerFunc(a.adminContracts)))
	mux.Handle("POST /api/v1/admin/contracts", a.requireAdmin(a.auditAdmin(http.HandlerFunc(a.adminCreateContract))))
	mux.Handle("PUT /api/v1/admin/contracts/{id}", a.requireAdmin(a.auditAdmin(http.HandlerFunc(a.adminUpdateContract))))
	mux.Handle("POST /api/v1/admin/contracts/{id}/send", a.requireAdmin(a.auditAdmin(http.HandlerFunc(a.adminSendContract))))
	mux.Handle("POST /api/v1/admin/contracts/{id}/sign", a.requireAdmin(a.auditAdmin(http.HandlerFunc(a.adminSignContract))))
	mux.Handle("PATCH /api/v1/admin/contracts/{id}/status", a.requireAdmin(a.auditAdmin(http.HandlerFunc(a.adminContractStatus))))
	mux.Handle("GET /api/v1/admin/downloads", a.requireAdmin(http.HandlerFunc(a.adminDownloads)))
	mux.Handle("POST /api/v1/admin/downloads", a.requireAdmin(a.auditAdmin(http.HandlerFunc(a.adminCreateDownload))))
	mux.Handle("PATCH /api/v1/admin/downloads/{id}", a.requireAdmin(a.auditAdmin(http.HandlerFunc(a.adminUpdateDownload))))
	mux.Handle("DELETE /api/v1/admin/downloads/{id}", a.requireAdmin(a.auditAdmin(http.HandlerFunc(a.adminDeleteDownload))))
	mux.Handle("GET /api/v1/admin/careers", a.requireAdmin(http.HandlerFunc(a.adminCareers)))
	mux.Handle("POST /api/v1/admin/careers", a.requireAdmin(a.auditAdmin(http.HandlerFunc(a.adminCreateCareer))))
	mux.Handle("PUT /api/v1/admin/careers/{id}", a.requireAdmin(a.auditAdmin(http.HandlerFunc(a.adminUpdateCareer))))
	mux.Handle("DELETE /api/v1/admin/careers/{id}", a.requireAdmin(a.auditAdmin(http.HandlerFunc(a.adminDeleteCareer))))
	mux.Handle("GET /api/v1/admin/career-applications", a.requireAdmin(http.HandlerFunc(a.adminCareerApplications)))
	mux.Handle("PATCH /api/v1/admin/career-applications/{id}", a.requireAdmin(a.auditAdmin(http.HandlerFunc(a.adminUpdateCareerApplication))))
	mux.Handle("GET /api/v1/admin/career-applications/{id}/resume", a.requireAdmin(http.HandlerFunc(a.adminCareerResume)))
	mux.Handle("DELETE /api/v1/admin/career-applications/{id}", a.requireAdmin(a.auditAdmin(http.HandlerFunc(a.adminDeleteCareerApplication))))

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

func (a *API) updateProfile(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name string `json:"name"`
	}
	if !a.decode(w, r, &input) {
		return
	}
	input.Name = strings.TrimSpace(input.Name)
	if len(input.Name) < 2 || len(input.Name) > 120 {
		writeError(w, http.StatusUnprocessableEntity, "name must contain 2 to 120 characters")
		return
	}
	user, err := a.store.UpdateProfile(r.Context(), claimsFromContext(r.Context()).UserID, input.Name)
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}
func (a *API) updateAvatar(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 3<<20)
	if err := r.ParseMultipartForm(3 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "profile picture must be no larger than 2 MB")
		return
	}
	file, header, err := r.FormFile("avatar")
	if err != nil {
		writeError(w, http.StatusBadRequest, "choose a profile picture")
		return
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, (2<<20)+1))
	if err != nil || len(data) == 0 || len(data) > 2<<20 {
		writeError(w, http.StatusUnprocessableEntity, "profile picture must be between 1 byte and 2 MB")
		return
	}
	contentType := http.DetectContentType(data)
	if contentType != "image/jpeg" && contentType != "image/png" && contentType != "image/webp" {
		writeError(w, http.StatusUnsupportedMediaType, "profile picture must be JPG, PNG, or WebP")
		return
	}
	_ = header
	user, err := a.store.UpdateAvatar(r.Context(), claimsFromContext(r.Context()).UserID, contentType, data)
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}
func (a *API) removeAvatar(w http.ResponseWriter, r *http.Request) {
	user, err := a.store.RemoveAvatar(r.Context(), claimsFromContext(r.Context()).UserID)
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}
func (a *API) avatar(w http.ResponseWriter, r *http.Request) {
	contentType, data, err := a.store.UserAvatar(r.Context(), claimsFromContext(r.Context()).UserID)
	if !a.handleStoreError(w, r, err) {
		return
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "private, max-age=300")
	w.Header().Set("Content-Length", fmt.Sprint(len(data)))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
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

func (a *API) publicDownloads(w http.ResponseWriter, r *http.Request) {
	items, err := a.store.ListDownloads(r.Context(), false)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"downloads": items})
}

func (a *API) publicDownloadFile(w http.ResponseWriter, r *http.Request) {
	item, data, err := a.store.DownloadFile(r.Context(), r.PathValue("id"))
	if !a.handleStoreError(w, r, err) {
		return
	}
	w.Header().Set("Content-Type", item.ContentType)
	w.Header().Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": item.FileName}))
	w.Header().Set("Content-Length", fmt.Sprint(len(data)))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func (a *API) publicCareers(w http.ResponseWriter, r *http.Request) {
	items, err := a.store.ListCareers(r.Context(), false)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"careers": items})
}

func (a *API) createCareerApplication(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 6<<20)
	if err := r.ParseMultipartForm(6 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "application and resume must be no larger than 5 MB")
		return
	}
	file, header, err := r.FormFile("resume")
	if err != nil {
		writeError(w, http.StatusBadRequest, "attach your resume")
		return
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, (5<<20)+1))
	if err != nil || len(data) == 0 || len(data) > 5<<20 {
		writeError(w, http.StatusUnprocessableEntity, "resume must be between 1 byte and 5 MB")
		return
	}
	contentType := strings.Split(header.Header.Get("Content-Type"), ";")[0]
	allowed := contentType == "application/pdf" || contentType == "application/msword" || contentType == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	if !allowed {
		writeError(w, http.StatusUnsupportedMediaType, "resume must be a PDF, DOC, or DOCX file")
		return
	}
	item := model.CareerApplication{CareerID: r.PathValue("id"), FullName: strings.TrimSpace(r.FormValue("full_name")), Email: strings.ToLower(strings.TrimSpace(r.FormValue("email"))), Phone: strings.TrimSpace(r.FormValue("phone")), Location: strings.TrimSpace(r.FormValue("location")), LinkedInURL: strings.TrimSpace(r.FormValue("linkedin_url")), PortfolioURL: strings.TrimSpace(r.FormValue("portfolio_url")), CoverNote: strings.TrimSpace(r.FormValue("cover_note")), ResumeName: filepath.Base(strings.ReplaceAll(header.Filename, "\x00", "")), ResumeType: contentType, ResumeSize: int64(len(data))}
	if r.FormValue("consent") != "true" || len(item.FullName) < 2 || len(item.FullName) > 120 || !validEmail(item.Email) || len(item.Phone) < 5 || len(item.Phone) > 40 || len(item.Location) < 2 || len(item.Location) > 160 || len(item.CoverNote) < 20 || len(item.CoverNote) > 5000 || !validOptionalURL(item.LinkedInURL) || !validOptionalURL(item.PortfolioURL) {
		writeError(w, http.StatusUnprocessableEntity, "complete the required application fields and consent")
		return
	}
	host, _, _ := net.SplitHostPort(r.RemoteAddr)
	created, err := a.store.CreateCareerApplication(r.Context(), item, data, host)
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"application": created})
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

func (a *API) accountContracts(w http.ResponseWriter, r *http.Request) {
	items, err := a.store.ListContracts(r.Context(), claimsFromContext(r.Context()).UserID)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"contracts": items})
}

func (a *API) accountSignContract(w http.ResponseWriter, r *http.Request) {
	signer, signature, ok := a.decodeSignature(w, r)
	if !ok {
		return
	}
	host, _, _ := net.SplitHostPort(r.RemoteAddr)
	agent := r.UserAgent()
	if len(agent) > 500 {
		agent = agent[:500]
	}
	item, err := a.store.SignContract(r.Context(), r.PathValue("id"), claimsFromContext(r.Context()).UserID, "client", signer, signature, host, agent)
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"contract": item})
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

func (a *API) adminContracts(w http.ResponseWriter, r *http.Request) {
	items, err := a.store.ListContracts(r.Context(), "")
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"contracts": items})
}

func (a *API) adminCreateContract(w http.ResponseWriter, r *http.Request) {
	item, ok := a.decodeContract(w, r)
	if !ok {
		return
	}
	created, err := a.store.CreateContract(r.Context(), item)
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"contract": created})
}

func (a *API) adminUpdateContract(w http.ResponseWriter, r *http.Request) {
	item, ok := a.decodeContract(w, r)
	if !ok {
		return
	}
	updated, err := a.store.UpdateContract(r.Context(), r.PathValue("id"), item)
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"contract": updated})
}

func (a *API) adminSendContract(w http.ResponseWriter, r *http.Request) {
	item, err := a.store.SendContract(r.Context(), r.PathValue("id"))
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"contract": item})
}

func (a *API) adminSignContract(w http.ResponseWriter, r *http.Request) {
	signer, signature, ok := a.decodeSignature(w, r)
	if !ok {
		return
	}
	item, err := a.store.SignContract(r.Context(), r.PathValue("id"), "", "provider", signer, signature, "", "")
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"contract": item})
}

func (a *API) adminContractStatus(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Status string `json:"status"`
	}
	if !a.decode(w, r, &input) {
		return
	}
	if input.Status != "completed" && input.Status != "cancelled" {
		writeError(w, http.StatusUnprocessableEntity, "status must be completed or cancelled")
		return
	}
	item, err := a.store.UpdateContractStatus(r.Context(), r.PathValue("id"), input.Status)
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"contract": item})
}

func (a *API) decodeSignature(w http.ResponseWriter, r *http.Request) (string, string, bool) {
	var input struct {
		SignerName string `json:"signer_name"`
		Signature  string `json:"signature"`
	}
	if !a.decode(w, r, &input) {
		return "", "", false
	}
	input.SignerName = strings.TrimSpace(input.SignerName)
	if len(input.SignerName) < 2 || len(input.SignerName) > 120 || len(input.Signature) > 300000 || !strings.HasPrefix(input.Signature, "data:image/png;base64,") {
		writeError(w, http.StatusUnprocessableEntity, "provide a valid signer name and drawn signature")
		return "", "", false
	}
	return input.SignerName, input.Signature, true
}

func (a *API) decodeContract(w http.ResponseWriter, r *http.Request) (model.Contract, bool) {
	var item model.Contract
	if !a.decode(w, r, &item) {
		return model.Contract{}, false
	}
	item.ContractNumber = strings.ToUpper(strings.TrimSpace(item.ContractNumber))
	item.Title = strings.TrimSpace(item.Title)
	item.ClientName = strings.TrimSpace(item.ClientName)
	item.ClientEmail = strings.ToLower(strings.TrimSpace(item.ClientEmail))
	item.ClientCompany = strings.TrimSpace(item.ClientCompany)
	item.ProviderName = strings.TrimSpace(item.ProviderName)
	item.Currency = strings.ToUpper(strings.TrimSpace(item.Currency))
	start, startErr := time.Parse("2006-01-02", item.StartDate)
	end, endErr := time.Parse("2006-01-02", item.EndDate)
	fields := []string{item.Scope, item.Deliverables, item.Milestones, item.PaymentTerms, item.RevisionTerms, item.SupportTerms, item.OwnershipTerms, item.ConfidentialityTerms, item.TerminationTerms, item.DisputeTerms}
	validTerms := true
	for _, field := range fields {
		if len(strings.TrimSpace(field)) < 5 || len(field) > 10000 {
			validTerms = false
		}
	}
	if item.UserID == "" || len(item.ContractNumber) < 3 || len(item.ContractNumber) > 60 || len(item.Title) < 3 || len(item.Title) > 200 || len(item.ClientName) < 2 || !validEmail(item.ClientEmail) || len(item.ClientCompany) > 160 || len(item.ProviderName) < 2 || len(item.ProviderName) > 160 || len(item.Currency) != 3 || item.AmountCents < 0 || startErr != nil || endErr != nil || end.Before(start) || !validTerms || len(item.SpecialTerms) > 10000 {
		writeError(w, http.StatusUnprocessableEntity, "contract fields are incomplete or invalid")
		return model.Contract{}, false
	}
	return item, true
}

func (a *API) adminDownloads(w http.ResponseWriter, r *http.Request) {
	items, err := a.store.ListDownloads(r.Context(), true)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"downloads": items})
}

var allowedUploadTypes = map[string]struct{}{
	"application/pdf": {}, "application/zip": {}, "application/msword": {},
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": {},
	"application/vnd.ms-excel": {}, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {},
	"application/vnd.ms-powerpoint": {}, "application/vnd.openxmlformats-officedocument.presentationml.presentation": {},
	"image/png": {}, "image/jpeg": {}, "text/plain": {}, "text/csv": {},
}

func (a *API) adminCreateDownload(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 11<<20)
	if err := r.ParseMultipartForm(11 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "file upload must be no larger than 10 MB")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "choose a file to upload")
		return
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, (10<<20)+1))
	if err != nil || len(data) == 0 || len(data) > 10<<20 {
		writeError(w, http.StatusUnprocessableEntity, "file must be between 1 byte and 10 MB")
		return
	}
	contentType := http.DetectContentType(data)
	if declared := header.Header.Get("Content-Type"); declared != "" && declared != "application/octet-stream" {
		contentType = strings.Split(declared, ";")[0]
	}
	if _, ok := allowedUploadTypes[contentType]; !ok {
		writeError(w, http.StatusUnsupportedMediaType, "file type is not allowed; use PDF, Office, ZIP, image, text, or CSV files")
		return
	}
	fileName := filepath.Base(strings.ReplaceAll(header.Filename, "\x00", ""))
	if fileName == "." || fileName == "" {
		writeError(w, http.StatusUnprocessableEntity, "file name is invalid")
		return
	}
	position := 0
	_, _ = fmt.Sscan(r.FormValue("position"), &position)
	item := model.Download{Title: strings.TrimSpace(r.FormValue("title")), Description: strings.TrimSpace(r.FormValue("description")), FileName: fileName, ContentType: contentType, FileSize: int64(len(data)), Active: r.FormValue("active") == "true", Position: position}
	if len(item.Title) < 2 || len(item.Title) > 180 || len(item.Description) < 5 || len(item.Description) > 2000 {
		writeError(w, http.StatusUnprocessableEntity, "provide a valid title and description")
		return
	}
	created, err := a.store.CreateDownload(r.Context(), item, data)
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"download": created})
}

func (a *API) adminUpdateDownload(w http.ResponseWriter, r *http.Request) {
	var item model.Download
	if !a.decode(w, r, &item) {
		return
	}
	item.Title = strings.TrimSpace(item.Title)
	item.Description = strings.TrimSpace(item.Description)
	if len(item.Title) < 2 || len(item.Title) > 180 || len(item.Description) < 5 || len(item.Description) > 2000 {
		writeError(w, http.StatusUnprocessableEntity, "provide a valid title and description")
		return
	}
	updated, err := a.store.UpdateDownload(r.Context(), r.PathValue("id"), item)
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"download": updated})
}

func (a *API) adminDeleteDownload(w http.ResponseWriter, r *http.Request) {
	if !a.handleStoreError(w, r, a.store.DeleteDownload(r.Context(), r.PathValue("id"))) {
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
func (a *API) adminCareers(w http.ResponseWriter, r *http.Request) {
	items, err := a.store.ListCareers(r.Context(), true)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"careers": items})
}
func (a *API) adminCreateCareer(w http.ResponseWriter, r *http.Request) {
	item, ok := a.decodeCareer(w, r)
	if !ok {
		return
	}
	created, err := a.store.CreateCareer(r.Context(), item)
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"career": created})
}
func (a *API) adminUpdateCareer(w http.ResponseWriter, r *http.Request) {
	item, ok := a.decodeCareer(w, r)
	if !ok {
		return
	}
	updated, err := a.store.UpdateCareer(r.Context(), r.PathValue("id"), item)
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"career": updated})
}
func (a *API) adminDeleteCareer(w http.ResponseWriter, r *http.Request) {
	if !a.handleStoreError(w, r, a.store.DeleteCareer(r.Context(), r.PathValue("id"))) {
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) adminCareerApplications(w http.ResponseWriter, r *http.Request) {
	items, err := a.store.ListCareerApplications(r.Context())
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"applications": items})
}
func (a *API) adminUpdateCareerApplication(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Status string `json:"status"`
	}
	if !a.decode(w, r, &input) {
		return
	}
	valid := map[string]bool{"new": true, "reviewing": true, "shortlisted": true, "interview": true, "rejected": true, "hired": true}
	if !valid[input.Status] {
		writeError(w, http.StatusUnprocessableEntity, "invalid application status")
		return
	}
	item, err := a.store.UpdateCareerApplicationStatus(r.Context(), r.PathValue("id"), input.Status)
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"application": item})
}
func (a *API) adminCareerResume(w http.ResponseWriter, r *http.Request) {
	item, data, err := a.store.CareerResume(r.Context(), r.PathValue("id"))
	if !a.handleStoreError(w, r, err) {
		return
	}
	w.Header().Set("Content-Type", item.ResumeType)
	w.Header().Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": item.ResumeName}))
	w.Header().Set("Content-Length", fmt.Sprint(len(data)))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}
func (a *API) adminDeleteCareerApplication(w http.ResponseWriter, r *http.Request) {
	if !a.handleStoreError(w, r, a.store.DeleteCareerApplication(r.Context(), r.PathValue("id"))) {
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) decodeCareer(w http.ResponseWriter, r *http.Request) (model.Career, bool) {
	var item model.Career
	if !a.decode(w, r, &item) {
		return model.Career{}, false
	}
	item.Title = strings.TrimSpace(item.Title)
	item.Department = strings.TrimSpace(item.Department)
	item.Location = strings.TrimSpace(item.Location)
	item.EmploymentType = strings.TrimSpace(item.EmploymentType)
	item.Summary = strings.TrimSpace(item.Summary)
	item.Responsibilities = strings.TrimSpace(item.Responsibilities)
	item.Requirements = strings.TrimSpace(item.Requirements)
	item.ApplyEmail = strings.ToLower(strings.TrimSpace(item.ApplyEmail))
	validDeadline := true
	if item.Deadline != "" {
		_, err := time.Parse("2006-01-02", item.Deadline)
		validDeadline = err == nil
	}
	if len(item.Title) < 2 || len(item.Title) > 180 || len(item.Department) < 2 || len(item.Department) > 100 || len(item.Location) < 2 || len(item.Location) > 120 || len(item.EmploymentType) < 2 || len(item.EmploymentType) > 80 || len(item.Summary) < 10 || len(item.Summary) > 2000 || len(item.Responsibilities) < 10 || len(item.Responsibilities) > 10000 || len(item.Requirements) < 10 || len(item.Requirements) > 10000 || !validEmail(item.ApplyEmail) || !validDeadline {
		writeError(w, http.StatusUnprocessableEntity, "career fields are incomplete or invalid")
		return model.Career{}, false
	}
	return item, true
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
