package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math"
	"mime"
	"net"
	"net/http"
	"net/mail"
	"net/url"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/akeluwa/software-hub/backend/internal/auth"
	"github.com/akeluwa/software-hub/backend/internal/config"
	"github.com/akeluwa/software-hub/backend/internal/model"
	"github.com/akeluwa/software-hub/backend/internal/store"
	"github.com/jackc/pgx/v5/pgconn"
)

type contextKey string

const (
	claimsKey    contextKey = "session_claims"
	adminUserKey contextKey = "admin_user"
)

var (
	slugPattern          = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
	currencyPattern      = regexp.MustCompile(`^[A-Z]{3}$`)
	uuidPattern          = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$`)
	invoiceNumberPattern = regexp.MustCompile(`^[A-Z0-9][A-Z0-9_/-]*$`)
)

const (
	permissionOverviewView    = "overview.view"
	permissionInquiriesView   = "inquiries.view"
	permissionInquiriesUpdate = "inquiries.update"
	permissionContractsView   = "contracts.view"
	permissionContractsCreate = "contracts.create"
	permissionContractsUpdate = "contracts.update"
	permissionServicesView    = "services.view"
	permissionServicesCreate  = "services.create"
	permissionServicesUpdate  = "services.update"
	permissionServicesDelete  = "services.delete"
	permissionPortfolioView   = "portfolio.view"
	permissionPortfolioCreate = "portfolio.create"
	permissionPortfolioUpdate = "portfolio.update"
	permissionPortfolioDelete = "portfolio.delete"
	permissionDownloadsView   = "downloads.view"
	permissionDownloadsCreate = "downloads.create"
	permissionDownloadsUpdate = "downloads.update"
	permissionDownloadsDelete = "downloads.delete"
	permissionCareersView     = "careers.view"
	permissionCareersCreate   = "careers.create"
	permissionCareersUpdate   = "careers.update"
	permissionCareersDelete   = "careers.delete"
	permissionAccountsView    = "accounts.view"
	permissionAccountsCreate  = "accounts.create"
	permissionAccountsUpdate  = "accounts.update"
	permissionAccountsDelete  = "accounts.delete"
)

var adminPermissionOrder = []string{
	permissionOverviewView,
	permissionInquiriesView, permissionInquiriesUpdate,
	permissionContractsView, permissionContractsCreate, permissionContractsUpdate,
	permissionServicesView, permissionServicesCreate, permissionServicesUpdate, permissionServicesDelete,
	permissionPortfolioView, permissionPortfolioCreate, permissionPortfolioUpdate, permissionPortfolioDelete,
	permissionDownloadsView, permissionDownloadsCreate, permissionDownloadsUpdate, permissionDownloadsDelete,
	permissionCareersView, permissionCareersCreate, permissionCareersUpdate, permissionCareersDelete,
	permissionAccountsView, permissionAccountsCreate, permissionAccountsUpdate, permissionAccountsDelete,
}

type API struct {
	cfg        config.Config
	store      *store.Store
	tokens     *auth.Manager
	mfaSecrets *auth.SecretCipher
	logger     *slog.Logger
	origins    map[string]struct{}
	rateLimits *rateLimiter
}

func New(cfg config.Config, data *store.Store, tokens *auth.Manager, mfaSecrets *auth.SecretCipher, logger *slog.Logger) *API {
	origins := make(map[string]struct{}, len(cfg.AllowedOrigins))
	for _, origin := range cfg.AllowedOrigins {
		origins[origin] = struct{}{}
	}
	return &API{cfg: cfg, store: data, tokens: tokens, mfaSecrets: mfaSecrets, logger: logger, origins: origins, rateLimits: newRateLimiter(time.Now)}
}

func (a *API) Router() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /livez", a.live)
	mux.HandleFunc("GET /readyz", a.health)
	mux.HandleFunc("GET /healthz", a.health)
	mux.Handle("POST /api/v1/auth/register", a.limitRequests("register", 5, time.Hour, http.HandlerFunc(a.register)))
	mux.Handle("POST /api/v1/auth/login", a.limitRequests("login", 8, time.Minute, http.HandlerFunc(a.login)))
	mux.Handle("POST /api/v1/auth/mfa/verify", a.limitRequests("mfa-verify", 8, time.Minute, http.HandlerFunc(a.verifyMFA)))
	mux.HandleFunc("POST /api/v1/auth/logout", a.logout)
	mux.Handle("GET /api/v1/auth/me", a.requireAuth(http.HandlerFunc(a.me)))
	mux.Handle("PATCH /api/v1/account/profile", a.requireAuth(http.HandlerFunc(a.updateProfile)))
	mux.Handle("POST /api/v1/account/avatar", a.requireAuth(http.HandlerFunc(a.updateAvatar)))
	mux.Handle("DELETE /api/v1/account/avatar", a.requireAuth(http.HandlerFunc(a.removeAvatar)))
	mux.Handle("GET /api/v1/account/avatar", a.requireAuth(http.HandlerFunc(a.avatar)))
	mux.HandleFunc("GET /api/v1/company-brand", a.publicCompanyBrand)
	mux.HandleFunc("GET /api/v1/services", a.publicServices)
	mux.HandleFunc("GET /api/v1/portfolio", a.publicPortfolio)
	mux.HandleFunc("GET /api/v1/downloads", a.publicDownloads)
	mux.HandleFunc("GET /api/v1/downloads/{id}/file", a.publicDownloadFile)
	mux.HandleFunc("GET /api/v1/careers", a.publicCareers)
	mux.Handle("POST /api/v1/careers/{id}/applications", a.limitRequests("career-application", 5, time.Hour, http.HandlerFunc(a.createCareerApplication)))
	mux.Handle("POST /api/v1/inquiries", a.limitRequests("inquiry", 5, 10*time.Minute, http.HandlerFunc(a.createInquiry)))
	mux.Handle("GET /api/v1/account/inquiries", a.requireAuth(http.HandlerFunc(a.accountInquiries)))
	mux.Handle("GET /api/v1/account/contracts", a.requireAuth(http.HandlerFunc(a.accountContracts)))
	mux.Handle("GET /api/v1/account/invoices", a.requireAuth(http.HandlerFunc(a.accountInvoices)))
	mux.Handle("POST /api/v1/account/contracts/{id}/sign", a.requireAuth(http.HandlerFunc(a.accountSignContract)))

	mux.Handle("GET /api/v1/admin/stats", a.requireAdminPermission(permissionOverviewView, http.HandlerFunc(a.adminStats)))
	mux.Handle("GET /api/v1/admin/users", a.requireFullAdmin(http.HandlerFunc(a.adminUsers)))
	mux.Handle("GET /api/v1/admin/client-options", a.requireAnyAdminPermission([]string{permissionContractsView, permissionAccountsView}, http.HandlerFunc(a.adminClientOptions)))
	mux.Handle("GET /api/v1/admin/sub-admins", a.requireFullAdmin(http.HandlerFunc(a.adminSubAdmins)))
	mux.Handle("POST /api/v1/admin/sub-admins", a.requireFullAdmin(a.auditAdmin(http.HandlerFunc(a.adminCreateSubAdmin))))
	mux.Handle("PATCH /api/v1/admin/sub-admins/{id}", a.requireFullAdmin(a.auditAdmin(http.HandlerFunc(a.adminUpdateSubAdmin))))
	mux.Handle("GET /api/v1/admin/action-requests", a.requireFullAdmin(http.HandlerFunc(a.adminActionRequests)))
	mux.Handle("POST /api/v1/admin/action-requests/{id}/approve", a.requireFullAdmin(a.auditAdmin(http.HandlerFunc(a.adminApproveActionRequest))))
	mux.Handle("POST /api/v1/admin/action-requests/{id}/reject", a.requireFullAdmin(a.auditAdmin(http.HandlerFunc(a.adminRejectActionRequest))))
	mux.Handle("GET /api/v1/admin/audit-logs", a.requireFullAdmin(http.HandlerFunc(a.adminAuditLogs)))
	mux.Handle("GET /api/v1/admin/company-account", a.requireAdminPermission(permissionAccountsView, http.HandlerFunc(a.adminCompanyAccount)))
	mux.Handle("PUT /api/v1/admin/company-account", a.requireAdminPermission(permissionAccountsUpdate, a.auditAdmin(http.HandlerFunc(a.adminUpdateCompanyAccount))))
	mux.Handle("GET /api/v1/admin/accounting", a.requireAdminPermission(permissionAccountsView, http.HandlerFunc(a.adminAccounting)))
	mux.Handle("POST /api/v1/admin/accounting/invoices", a.requireAdminPermission(permissionAccountsCreate, a.auditAdmin(http.HandlerFunc(a.adminCreateInvoice))))
	mux.Handle("POST /api/v1/admin/accounting/invoices/{id}/void", a.requireAdminPermission(permissionAccountsDelete, a.auditAdmin(http.HandlerFunc(a.adminVoidInvoice))))
	mux.Handle("POST /api/v1/admin/accounting/transactions", a.requireAdminPermission(permissionAccountsCreate, a.auditAdmin(http.HandlerFunc(a.adminCreateAccountingTransaction))))
	mux.Handle("POST /api/v1/admin/accounting/transactions/{id}/void", a.requireAdminPermission(permissionAccountsDelete, a.auditAdmin(http.HandlerFunc(a.adminVoidAccountingTransaction))))
	mux.Handle("PATCH /api/v1/admin/users/{id}/role", a.requireFullAdmin(a.auditAdmin(http.HandlerFunc(a.adminUpdateUserRole))))
	mux.Handle("GET /api/v1/admin/inquiries", a.requireAdminPermission(permissionInquiriesView, http.HandlerFunc(a.adminInquiries)))
	mux.Handle("PATCH /api/v1/admin/inquiries/{id}", a.requireAdminPermission(permissionInquiriesUpdate, a.auditAdmin(http.HandlerFunc(a.adminUpdateInquiry))))
	mux.Handle("GET /api/v1/admin/services", a.requireAdminPermission(permissionServicesView, http.HandlerFunc(a.adminServices)))
	mux.Handle("POST /api/v1/admin/services", a.requireAdminPermission(permissionServicesCreate, a.auditAdmin(http.HandlerFunc(a.adminCreateService))))
	mux.Handle("PUT /api/v1/admin/services/{id}", a.requireAdminPermission(permissionServicesUpdate, a.auditAdmin(http.HandlerFunc(a.adminUpdateService))))
	mux.Handle("DELETE /api/v1/admin/services/{id}", a.requireAdminPermission(permissionServicesDelete, a.auditAdmin(http.HandlerFunc(a.adminDeleteService))))
	mux.Handle("GET /api/v1/admin/portfolio", a.requireAdminPermission(permissionPortfolioView, http.HandlerFunc(a.adminPortfolio)))
	mux.Handle("POST /api/v1/admin/portfolio", a.requireAdminPermission(permissionPortfolioCreate, a.auditAdmin(http.HandlerFunc(a.adminCreatePortfolio))))
	mux.Handle("PUT /api/v1/admin/portfolio/{id}", a.requireAdminPermission(permissionPortfolioUpdate, a.auditAdmin(http.HandlerFunc(a.adminUpdatePortfolio))))
	mux.Handle("DELETE /api/v1/admin/portfolio/{id}", a.requireAdminPermission(permissionPortfolioDelete, a.auditAdmin(http.HandlerFunc(a.adminDeletePortfolio))))
	mux.Handle("GET /api/v1/admin/contracts", a.requireAdminPermission(permissionContractsView, http.HandlerFunc(a.adminContracts)))
	mux.Handle("POST /api/v1/admin/contracts", a.requireAdminPermission(permissionContractsCreate, a.auditAdmin(http.HandlerFunc(a.adminCreateContract))))
	mux.Handle("PUT /api/v1/admin/contracts/{id}", a.requireAdminPermission(permissionContractsUpdate, a.auditAdmin(http.HandlerFunc(a.adminUpdateContract))))
	mux.Handle("POST /api/v1/admin/contracts/{id}/send", a.requireAdminPermission(permissionContractsUpdate, a.auditAdmin(http.HandlerFunc(a.adminSendContract))))
	mux.Handle("POST /api/v1/admin/contracts/{id}/sign", a.requireAdminPermission(permissionContractsUpdate, a.auditAdmin(http.HandlerFunc(a.adminSignContract))))
	mux.Handle("PATCH /api/v1/admin/contracts/{id}/status", a.requireAdminPermission(permissionContractsUpdate, a.auditAdmin(http.HandlerFunc(a.adminContractStatus))))
	mux.Handle("GET /api/v1/admin/downloads", a.requireAdminPermission(permissionDownloadsView, http.HandlerFunc(a.adminDownloads)))
	mux.Handle("POST /api/v1/admin/downloads", a.requireAdminPermission(permissionDownloadsCreate, a.auditAdmin(http.HandlerFunc(a.adminCreateDownload))))
	mux.Handle("PATCH /api/v1/admin/downloads/{id}", a.requireAdminPermission(permissionDownloadsUpdate, a.auditAdmin(http.HandlerFunc(a.adminUpdateDownload))))
	mux.Handle("DELETE /api/v1/admin/downloads/{id}", a.requireAdminPermission(permissionDownloadsDelete, a.auditAdmin(http.HandlerFunc(a.adminDeleteDownload))))
	mux.Handle("GET /api/v1/admin/careers", a.requireAdminPermission(permissionCareersView, http.HandlerFunc(a.adminCareers)))
	mux.Handle("POST /api/v1/admin/careers", a.requireAdminPermission(permissionCareersCreate, a.auditAdmin(http.HandlerFunc(a.adminCreateCareer))))
	mux.Handle("PUT /api/v1/admin/careers/{id}", a.requireAdminPermission(permissionCareersUpdate, a.auditAdmin(http.HandlerFunc(a.adminUpdateCareer))))
	mux.Handle("DELETE /api/v1/admin/careers/{id}", a.requireAdminPermission(permissionCareersDelete, a.auditAdmin(http.HandlerFunc(a.adminDeleteCareer))))
	mux.Handle("GET /api/v1/admin/career-applications", a.requireAdminPermission(permissionCareersView, http.HandlerFunc(a.adminCareerApplications)))
	mux.Handle("PATCH /api/v1/admin/career-applications/{id}", a.requireAdminPermission(permissionCareersUpdate, a.auditAdmin(http.HandlerFunc(a.adminUpdateCareerApplication))))
	mux.Handle("GET /api/v1/admin/career-applications/{id}/resume", a.requireAdminPermission(permissionCareersView, http.HandlerFunc(a.adminCareerResume)))
	mux.Handle("DELETE /api/v1/admin/career-applications/{id}", a.requireAdminPermission(permissionCareersDelete, a.auditAdmin(http.HandlerFunc(a.adminDeleteCareerApplication))))

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

func (a *API) live(w http.ResponseWriter, _ *http.Request) {
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
	if err := a.startSession(w, user, false); err != nil {
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
	if !user.AccountActive {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}
	user.PasswordHash = ""
	if isPrivilegedRole(user.Role) {
		secret := ""
		enrollmentRequired := !user.MFAEnabled
		if len(user.MFASecret) == 0 {
			var err error
			secret, err = auth.GenerateTOTPSecret()
			if err != nil {
				a.internalError(w, r, err)
				return
			}
			encrypted, err := a.mfaSecrets.Encrypt(secret)
			if err != nil {
				a.internalError(w, r, err)
				return
			}
			if err := a.store.SetUserMFASecret(r.Context(), user.ID, encrypted); err != nil {
				a.internalError(w, r, err)
				return
			}
		} else if enrollmentRequired {
			var err error
			secret, err = a.mfaSecrets.Decrypt(user.MFASecret)
			if err != nil {
				a.internalError(w, r, err)
				return
			}
		}
		challenge, err := a.tokens.IssueMFAChallenge(user.ID)
		if err != nil {
			a.internalError(w, r, err)
			return
		}
		response := map[string]any{
			"mfa_required":        true,
			"enrollment_required": enrollmentRequired,
			"challenge_token":     challenge,
		}
		if enrollmentRequired {
			response["secret"] = secret
			response["otpauth_uri"] = auth.TOTPURI(secret, user.Email, "AKELUWA SH")
		}
		writeJSON(w, http.StatusAccepted, response)
		return
	}
	if err := a.startSession(w, user, false); err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}

func (a *API) verifyMFA(w http.ResponseWriter, r *http.Request) {
	var input struct {
		ChallengeToken string `json:"challenge_token"`
		Code           string `json:"code"`
	}
	if !a.decode(w, r, &input) {
		return
	}
	claims, err := a.tokens.ParseMFAChallenge(strings.TrimSpace(input.ChallengeToken))
	if err != nil {
		writeError(w, http.StatusUnauthorized, "MFA challenge expired; sign in again")
		return
	}
	user, err := a.store.FindUserByID(r.Context(), claims.UserID)
	if err != nil || !user.AccountActive || !isPrivilegedRole(user.Role) || len(user.MFASecret) == 0 {
		writeError(w, http.StatusUnauthorized, "MFA challenge is no longer valid")
		return
	}
	secret, err := a.mfaSecrets.Decrypt(user.MFASecret)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	if !auth.ValidateTOTP(secret, input.Code, time.Now().UTC()) {
		writeError(w, http.StatusUnauthorized, "invalid authenticator code")
		return
	}
	if !user.MFAEnabled {
		if err := a.store.EnableUserMFA(r.Context(), user.ID); err != nil {
			a.internalError(w, r, err)
			return
		}
		user.MFAEnabled = true
	}
	if err := a.startSession(w, user, true); err != nil {
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
	if !user.AccountActive {
		a.clearSession(w)
		writeError(w, http.StatusUnauthorized, "session is no longer valid")
		return
	}
	if isPrivilegedRole(user.Role) && (!claims.MFAVerified || !user.MFAEnabled) {
		a.clearSession(w)
		writeError(w, http.StatusUnauthorized, "administrator sign-in requires MFA")
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

func (a *API) publicCompanyBrand(w http.ResponseWriter, r *http.Request) {
	item, err := a.store.CompanyAccount(r.Context())
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"company_brand": model.CompanyBrand{
			DisplayName:    item.DisplayName,
			Tagline:        item.Tagline,
			TaglineMeaning: item.TaglineMeaning,
		},
	})
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

func (a *API) accountInvoices(w http.ResponseWriter, r *http.Request) {
	items, err := a.store.ListInvoicesForUser(r.Context(), claimsFromContext(r.Context()).UserID)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"invoices": items})
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

func (a *API) adminClientOptions(w http.ResponseWriter, r *http.Request) {
	users, err := a.store.ListClientUsers(r.Context())
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"users": users})
}

func (a *API) adminSubAdmins(w http.ResponseWriter, r *http.Request) {
	users, err := a.store.ListSubAdmins(r.Context())
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"sub_admins": users})
}

func (a *API) adminCreateSubAdmin(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name        string   `json:"name"`
		Email       string   `json:"email"`
		Password    string   `json:"password"`
		Permissions []string `json:"permissions"`
	}
	if !a.decode(w, r, &input) {
		return
	}
	input.Name = strings.TrimSpace(input.Name)
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))
	permissions, validPermissions := normalizeAdminPermissions(input.Permissions)
	if len(input.Name) < 2 || len(input.Name) > 120 || !validEmail(input.Email) ||
		len(input.Password) < 12 || len(input.Password) > 128 || !validPermissions {
		writeError(w, http.StatusUnprocessableEntity, "sub-administrator fields or privileges are invalid")
		return
	}
	hash, err := auth.HashPassword(input.Password)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	user, err := a.store.CreateSubAdmin(r.Context(), input.Name, input.Email, hash, permissions)
	if isUniqueViolation(err) {
		writeError(w, http.StatusConflict, "an account already exists for this email")
		return
	}
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"sub_admin": user})
}

func (a *API) adminUpdateSubAdmin(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Permissions   []string `json:"permissions"`
		AccountActive *bool    `json:"account_active"`
	}
	if !a.decode(w, r, &input) {
		return
	}
	permissions, ok := normalizeAdminPermissions(input.Permissions)
	if !ok || input.AccountActive == nil {
		writeError(w, http.StatusUnprocessableEntity, "select at least one valid privilege and provide the account status")
		return
	}
	user, err := a.store.UpdateSubAdminAccess(r.Context(), r.PathValue("id"), permissions, *input.AccountActive)
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"sub_admin": user})
}

func normalizeAdminPermissions(input []string) ([]string, bool) {
	allowed := make(map[string]bool, len(adminPermissionOrder))
	for _, permission := range adminPermissionOrder {
		allowed[permission] = true
	}
	selected := make(map[string]bool, len(input))
	for _, permission := range input {
		permission = strings.TrimSpace(permission)
		if !allowed[permission] {
			return nil, false
		}
		selected[permission] = true
		parts := strings.Split(permission, ".")
		if len(parts) == 2 && parts[1] != "view" {
			selected[parts[0]+".view"] = true
		}
	}
	permissions := make([]string, 0, len(selected))
	for _, permission := range adminPermissionOrder {
		if selected[permission] {
			permissions = append(permissions, permission)
		}
	}
	return permissions, len(permissions) > 0
}

func (a *API) adminActionRequests(w http.ResponseWriter, r *http.Request) {
	items, err := a.store.ListAdminActionRequests(r.Context())
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"action_requests": items})
}

func (a *API) adminApproveActionRequest(w http.ResponseWriter, r *http.Request) {
	note, ok := a.decodeReviewNote(w, r)
	if !ok {
		return
	}
	var reviewed model.AdminActionRequest
	err := a.store.WithTransaction(r.Context(), func(data *store.Store) error {
		item, err := data.ClaimAdminActionRequest(r.Context(), r.PathValue("id"), claimsFromContext(r.Context()).UserID)
		if err != nil {
			return err
		}
		status, message := "approved", ""
		if err := data.WithTransaction(r.Context(), func(actionStore *store.Store) error {
			return executeAdminActionRequest(r.Context(), actionStore, item)
		}); err != nil {
			status, message = "failed", adminActionFailureMessage(err)
		}
		reviewed, err = data.CompleteAdminActionRequest(r.Context(), item.ID, status, note, message)
		return err
	})
	if !a.handleStoreError(w, r, err) {
		return
	}
	if reviewed.Status == "failed" {
		writeJSON(w, http.StatusConflict, map[string]any{"error": reviewed.FailureMessage, "action_request": reviewed})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"action_request": reviewed})
}

func (a *API) adminRejectActionRequest(w http.ResponseWriter, r *http.Request) {
	note, ok := a.decodeReviewNote(w, r)
	if !ok {
		return
	}
	item, err := a.store.RejectAdminActionRequest(r.Context(), r.PathValue("id"), claimsFromContext(r.Context()).UserID, note)
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"action_request": item})
}

func (a *API) decodeReviewNote(w http.ResponseWriter, r *http.Request) (string, bool) {
	var input struct {
		Note string `json:"note"`
	}
	if !a.decode(w, r, &input) {
		return "", false
	}
	input.Note = strings.TrimSpace(input.Note)
	if len(input.Note) > 500 {
		writeError(w, http.StatusUnprocessableEntity, "review note must be 500 characters or fewer")
		return "", false
	}
	return input.Note, true
}

func executeAdminActionRequest(ctx context.Context, data *store.Store, item model.AdminActionRequest) error {
	switch item.Action {
	case "service.delete":
		return data.DeleteService(ctx, item.TargetID)
	case "portfolio.delete":
		return data.DeletePortfolioItem(ctx, item.TargetID)
	case "download.delete":
		return data.DeleteDownload(ctx, item.TargetID)
	case "career.delete":
		return data.DeleteCareer(ctx, item.TargetID)
	case "career_application.delete":
		return data.DeleteCareerApplication(ctx, item.TargetID)
	case "invoice.void":
		_, err := data.VoidInvoice(ctx, item.TargetID)
		return err
	case "transaction.void":
		_, err := data.VoidAccountingTransaction(ctx, item.TargetID)
		return err
	default:
		return store.ErrNotFound
	}
}

func adminActionFailureMessage(err error) string {
	switch {
	case isCareerApplicationReference(err):
		return "the career opening still has candidate applications"
	case errors.Is(err, store.ErrNotFound):
		return "the requested record no longer exists"
	case errors.Is(err, store.ErrInvalidAccountingState):
		return "the financial record cannot be voided in its current state"
	default:
		return "the approved action could not be completed"
	}
}

func (a *API) adminAuditLogs(w http.ResponseWriter, r *http.Request) {
	items, err := a.store.ListAdminAuditLogs(r.Context())
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"audit_logs": items})
}

func (a *API) adminCompanyAccount(w http.ResponseWriter, r *http.Request) {
	item, err := a.store.CompanyAccount(r.Context())
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"company_account": item})
}

func (a *API) adminUpdateCompanyAccount(w http.ResponseWriter, r *http.Request) {
	item, ok := a.decodeCompanyAccount(w, r)
	if !ok {
		return
	}
	updated, err := a.store.UpdateCompanyAccount(r.Context(), item)
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"company_account": updated})
}

func (a *API) adminAccounting(w http.ResponseWriter, r *http.Request) {
	companyAccount, err := a.store.CompanyAccount(r.Context())
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	invoices, err := a.store.ListInvoices(r.Context())
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	transactions, err := a.store.ListAccountingTransactions(r.Context())
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	byCurrency := make(map[string]*model.AccountingSummary)
	getSummary := func(currency string) *model.AccountingSummary {
		if byCurrency[currency] == nil {
			byCurrency[currency] = &model.AccountingSummary{Currency: currency}
		}
		return byCurrency[currency]
	}
	for _, invoice := range invoices {
		if invoice.Status != "void" {
			getSummary(invoice.Currency).ReceivableCents += invoice.BalanceCents
		}
	}
	for _, transaction := range transactions {
		if transaction.Status != "posted" {
			continue
		}
		summary := getSummary(transaction.Currency)
		if transaction.Direction == "income" {
			summary.IncomeCents += transaction.AmountCents
		} else {
			summary.ExpenseCents += transaction.AmountCents
		}
	}
	summaries := make([]model.AccountingSummary, 0, len(byCurrency))
	for _, summary := range byCurrency {
		summary.NetCents = summary.IncomeCents - summary.ExpenseCents
		summaries = append(summaries, *summary)
	}
	sort.Slice(summaries, func(i, j int) bool { return summaries[i].Currency < summaries[j].Currency })
	writeJSON(w, http.StatusOK, map[string]any{"company_account": companyAccount, "invoices": invoices, "transactions": transactions, "summaries": summaries})
}

func (a *API) adminCreateInvoice(w http.ResponseWriter, r *http.Request) {
	item, ok := a.decodeInvoice(w, r)
	if !ok {
		return
	}
	if item.UserID != "" {
		user, err := a.store.FindUserByID(r.Context(), item.UserID)
		if !a.handleStoreError(w, r, err) {
			return
		}
		if user.Role != "user" || !user.AccountActive || item.ClientEmail != user.Email {
			writeError(w, http.StatusUnprocessableEntity, "invoice client must be an active registered client")
			return
		}
		item.ClientName = user.Name
	}
	created, err := a.store.CreateInvoice(r.Context(), item)
	if !a.handleAccountingError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"invoice": created})
}

func (a *API) adminVoidInvoice(w http.ResponseWriter, r *http.Request) {
	if a.deferDestructiveAction(w, r, "invoice.void") {
		return
	}
	item, err := a.store.VoidInvoice(r.Context(), r.PathValue("id"))
	if !a.handleAccountingError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"invoice": item})
}

func (a *API) adminCreateAccountingTransaction(w http.ResponseWriter, r *http.Request) {
	item, ok := a.decodeAccountingTransaction(w, r)
	if !ok {
		return
	}
	created, err := a.store.CreateAccountingTransaction(r.Context(), item)
	if !a.handleAccountingError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"transaction": created})
}

func (a *API) adminVoidAccountingTransaction(w http.ResponseWriter, r *http.Request) {
	if a.deferDestructiveAction(w, r, "transaction.void") {
		return
	}
	item, err := a.store.VoidAccountingTransaction(r.Context(), r.PathValue("id"))
	if !a.handleAccountingError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"transaction": item})
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
	if a.deferDestructiveAction(w, r, "service.delete") {
		return
	}
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
	if a.deferDestructiveAction(w, r, "portfolio.delete") {
		return
	}
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
	if a.deferDestructiveAction(w, r, "download.delete") {
		return
	}
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
	if a.deferDestructiveAction(w, r, "career.delete") {
		return
	}
	err := a.store.DeleteCareer(r.Context(), r.PathValue("id"))
	if isCareerApplicationReference(err) {
		writeError(w, http.StatusConflict, "this career opening has candidate applications; remove them first or unpublish the opening")
		return
	}
	if !a.handleStoreError(w, r, err) {
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
	if a.deferDestructiveAction(w, r, "career_application.delete") {
		return
	}
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

func (a *API) decodeCompanyAccount(w http.ResponseWriter, r *http.Request) (model.CompanyAccount, bool) {
	var item model.CompanyAccount
	if !a.decode(w, r, &item) {
		return model.CompanyAccount{}, false
	}
	item.DisplayName = strings.TrimSpace(item.DisplayName)
	item.LegalName = strings.TrimSpace(item.LegalName)
	item.Tagline = strings.TrimSpace(item.Tagline)
	item.TaglineMeaning = strings.TrimSpace(item.TaglineMeaning)
	item.PrimaryEmail = strings.ToLower(strings.TrimSpace(item.PrimaryEmail))
	item.SupportEmail = strings.ToLower(strings.TrimSpace(item.SupportEmail))
	item.CareersEmail = strings.ToLower(strings.TrimSpace(item.CareersEmail))
	item.Phone = strings.TrimSpace(item.Phone)
	item.WebsiteURL = strings.TrimSpace(item.WebsiteURL)
	item.RegistrationNumber = strings.TrimSpace(item.RegistrationNumber)
	item.TaxID = strings.TrimSpace(item.TaxID)
	item.AddressLine = strings.TrimSpace(item.AddressLine)
	item.City = strings.TrimSpace(item.City)
	item.Region = strings.TrimSpace(item.Region)
	item.PostalCode = strings.TrimSpace(item.PostalCode)
	item.Country = strings.TrimSpace(item.Country)
	item.Timezone = strings.TrimSpace(item.Timezone)
	item.Currency = strings.ToUpper(strings.TrimSpace(item.Currency))
	item.LinkedInURL = strings.TrimSpace(item.LinkedInURL)
	item.GitHubURL = strings.TrimSpace(item.GitHubURL)

	_, timezoneError := time.LoadLocation(item.Timezone)
	validOptionalEmail := func(value string) bool { return value == "" || validEmail(value) }
	if len(item.DisplayName) < 2 || len(item.DisplayName) > 120 ||
		len(item.LegalName) < 2 || len(item.LegalName) > 180 || len(item.Tagline) > 300 || len(item.TaglineMeaning) > 500 ||
		!validEmail(item.PrimaryEmail) || !validOptionalEmail(item.SupportEmail) || !validOptionalEmail(item.CareersEmail) ||
		len(item.Phone) > 60 || !validOptionalURL(item.WebsiteURL) || len(item.RegistrationNumber) > 120 ||
		len(item.TaxID) > 120 || len(item.AddressLine) > 240 || len(item.City) > 100 || len(item.Region) > 100 ||
		len(item.PostalCode) > 30 || len(item.Country) < 2 || len(item.Country) > 100 || timezoneError != nil ||
		!currencyPattern.MatchString(item.Currency) || !validOptionalURL(item.LinkedInURL) || !validOptionalURL(item.GitHubURL) {
		writeError(w, http.StatusUnprocessableEntity, "company account fields are incomplete or invalid")
		return model.CompanyAccount{}, false
	}
	return item, true
}

func (a *API) decodeInvoice(w http.ResponseWriter, r *http.Request) (model.Invoice, bool) {
	var item model.Invoice
	if !a.decode(w, r, &item) {
		return model.Invoice{}, false
	}
	item.ContractID = strings.TrimSpace(item.ContractID)
	item.UserID = strings.TrimSpace(item.UserID)
	item.InvoiceNumber = strings.ToUpper(strings.TrimSpace(item.InvoiceNumber))
	item.ClientName = strings.TrimSpace(item.ClientName)
	item.ClientEmail = strings.ToLower(strings.TrimSpace(item.ClientEmail))
	item.ClientCompany = strings.TrimSpace(item.ClientCompany)
	item.Currency = strings.ToUpper(strings.TrimSpace(item.Currency))
	item.Notes = strings.TrimSpace(item.Notes)
	issueDate, issueError := time.Parse("2006-01-02", item.IssueDate)
	dueDate, dueError := time.Parse("2006-01-02", item.DueDate)
	if len(item.InvoiceNumber) < 2 || len(item.InvoiceNumber) > 80 || !invoiceNumberPattern.MatchString(item.InvoiceNumber) ||
		(item.ContractID != "" && !uuidPattern.MatchString(item.ContractID)) || (item.UserID != "" && !uuidPattern.MatchString(item.UserID)) || len(item.ClientName) < 2 ||
		len(item.ClientName) > 180 || !validEmail(item.ClientEmail) || len(item.ClientCompany) > 180 ||
		!currencyPattern.MatchString(item.Currency) || issueError != nil || dueError != nil ||
		dueDate.Before(issueDate) || len(item.Notes) > 3000 || len(item.Items) == 0 || len(item.Items) > 100 ||
		item.TaxCents < 0 || item.DiscountCents < 0 {
		writeError(w, http.StatusUnprocessableEntity, "invoice fields are incomplete or invalid")
		return model.Invoice{}, false
	}
	item.SubtotalCents = 0
	for index := range item.Items {
		line := &item.Items[index]
		line.Description = strings.TrimSpace(line.Description)
		line.Position = index
		if len(line.Description) < 2 || len(line.Description) > 500 || line.Quantity <= 0 ||
			line.Quantity > 1000000 || line.UnitPriceCents < 0 {
			writeError(w, http.StatusUnprocessableEntity, "invoice line items are incomplete or invalid")
			return model.Invoice{}, false
		}
		item.SubtotalCents += int64(math.Round(line.Quantity * float64(line.UnitPriceCents)))
	}
	item.TotalCents = item.SubtotalCents + item.TaxCents - item.DiscountCents
	if item.TotalCents <= 0 {
		writeError(w, http.StatusUnprocessableEntity, "invoice total must be greater than zero")
		return model.Invoice{}, false
	}
	return item, true
}

func (a *API) decodeAccountingTransaction(w http.ResponseWriter, r *http.Request) (model.AccountingTransaction, bool) {
	var item model.AccountingTransaction
	if !a.decode(w, r, &item) {
		return model.AccountingTransaction{}, false
	}
	item.InvoiceID = strings.TrimSpace(item.InvoiceID)
	item.Category = strings.TrimSpace(item.Category)
	item.Description = strings.TrimSpace(item.Description)
	item.Counterparty = strings.TrimSpace(item.Counterparty)
	item.Currency = strings.ToUpper(strings.TrimSpace(item.Currency))
	item.PaymentMethod = strings.TrimSpace(item.PaymentMethod)
	item.Reference = strings.TrimSpace(item.Reference)
	item.Notes = strings.TrimSpace(item.Notes)
	_, dateError := time.Parse("2006-01-02", item.TransactionDate)
	validDirection := item.Direction == "income" || item.Direction == "expense"
	validMethod := map[string]bool{"cash": true, "bank_transfer": true, "card": true, "mobile_wallet": true, "cheque": true, "other": true}
	if !validDirection || (item.InvoiceID != "" && !uuidPattern.MatchString(item.InvoiceID)) ||
		(item.Direction == "expense" && item.InvoiceID != "") || len(item.Category) < 2 ||
		len(item.Category) > 100 || len(item.Description) < 2 || len(item.Description) > 500 ||
		len(item.Counterparty) < 2 || len(item.Counterparty) > 180 || item.AmountCents <= 0 ||
		!currencyPattern.MatchString(item.Currency) || !validMethod[item.PaymentMethod] || len(item.Reference) > 180 ||
		dateError != nil || len(item.Notes) > 3000 {
		writeError(w, http.StatusUnprocessableEntity, "transaction fields are incomplete or invalid")
		return model.AccountingTransaction{}, false
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

func (a *API) startSession(w http.ResponseWriter, user model.User, mfaVerified bool) error {
	value, expiresAt, err := a.tokens.Issue(user.ID, user.Role, user.Name, mfaVerified)
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
		user, err := a.store.FindUserByID(r.Context(), claims.UserID)
		if err != nil {
			if errors.Is(err, store.ErrNotFound) {
				writeError(w, http.StatusUnauthorized, "session is no longer valid")
				return
			}
			a.internalError(w, r, err)
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

func isCareerApplicationReference(err error) bool {
	var databaseError *pgconn.PgError
	return errors.As(err, &databaseError) &&
		databaseError.Code == "23503" &&
		databaseError.ConstraintName == "career_applications_career_id_fkey"
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
