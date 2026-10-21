package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/mail"
	"net/url"
	"regexp"
	"strings"
	"time"
	"github.com/akeluwa/software-hub/backend/internal/auth"
	"github.com/akeluwa/software-hub/backend/internal/config"
	"github.com/akeluwa/software-hub/backend/internal/mailer"
	"github.com/akeluwa/software-hub/backend/internal/store"
	"github.com/jackc/pgx/v5/pgconn"
)

type contextKey string

const (
	claimsKey    contextKey = "session_claims"
	adminUserKey contextKey = "admin_user"
	authUserKey  contextKey = "authenticated_user"
)

var (
	slugPattern          = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
	currencyPattern      = regexp.MustCompile(`^[A-Z]{3}$`)
	uuidPattern          = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$`)
	invoiceNumberPattern = regexp.MustCompile(`^[A-Z0-9][A-Z0-9_/-]*$`)
	contractHashPattern  = regexp.MustCompile(`^[a-f0-9]{64}$`)
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
	email      mailer.Sender
	logger     *slog.Logger
	origins    map[string]struct{}
	rateLimits *rateLimiter
	metrics    apiMetrics
}

func New(cfg config.Config, data *store.Store, tokens *auth.Manager, mfaSecrets *auth.SecretCipher, email mailer.Sender, logger *slog.Logger) *API {
	if email == nil {
		email = mailer.Disabled{}
	}
	if logger == nil {
		logger = slog.Default()
	}
	origins := make(map[string]struct{}, len(cfg.AllowedOrigins))
	for _, origin := range cfg.AllowedOrigins {
		origins[origin] = struct{}{}
	}
	return &API{cfg: cfg, store: data, tokens: tokens, mfaSecrets: mfaSecrets, email: email, logger: logger, origins: origins, rateLimits: newRateLimiter(time.Now)}
}

func (a *API) Router() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /livez", a.live)
	mux.HandleFunc("GET /readyz", a.health)
	mux.HandleFunc("GET /healthz", a.health)
	mux.HandleFunc("GET /metrics", a.prometheusMetrics)
	mux.Handle("POST /api/v1/auth/register", a.limitRequests("register", 5, time.Hour, http.HandlerFunc(a.register)))
	mux.Handle("POST /api/v1/auth/verify-email", a.limitRequests("verify-email", 10, time.Hour, http.HandlerFunc(a.verifyEmail)))
	mux.Handle("POST /api/v1/auth/resend-verification", a.limitRequests("resend-verification", 3, time.Hour, http.HandlerFunc(a.resendVerification)))
	mux.Handle("POST /api/v1/auth/password-reset/request", a.limitRequests("password-reset-request", 3, time.Hour, http.HandlerFunc(a.requestPasswordReset)))
	mux.Handle("POST /api/v1/auth/password-reset/confirm", a.limitRequests("password-reset-confirm", 8, time.Hour, http.HandlerFunc(a.confirmPasswordReset)))
	mux.Handle("POST /api/v1/auth/login", a.limitRequests("login", 8, time.Minute, http.HandlerFunc(a.login)))
	mux.Handle("POST /api/v1/auth/mfa/verify", a.limitRequests("mfa-verify", 8, time.Minute, http.HandlerFunc(a.verifyMFA)))
	mux.Handle("POST /api/v1/auth/mfa/recovery-codes", a.requireAdmin(a.limitRequests("mfa-recovery-regenerate", 3, time.Minute, a.auditAdmin(http.HandlerFunc(a.regenerateMFARecoveryCodes)))))
	mux.HandleFunc("POST /api/v1/auth/logout", a.logout)
	mux.Handle("GET /api/v1/auth/me", a.requireAuth(http.HandlerFunc(a.me)))
	mux.Handle("PATCH /api/v1/account/profile", a.requireAuth(http.HandlerFunc(a.updateProfile)))
	mux.Handle("POST /api/v1/account/avatar", a.requireAuth(http.HandlerFunc(a.updateAvatar)))
	mux.Handle("DELETE /api/v1/account/avatar", a.requireAuth(http.HandlerFunc(a.removeAvatar)))
	mux.Handle("GET /api/v1/account/avatar", a.requireAuth(http.HandlerFunc(a.avatar)))
	mux.HandleFunc("GET /api/v1/company-brand", a.publicCompanyBrand)
	mux.Handle("GET /api/v1/records/verify", a.limitRequests("record-verify", 30, time.Minute, http.HandlerFunc(a.publicVerifyRecord)))
	mux.Handle("GET /api/v1/contracts/verify", a.limitRequests("contract-verify", 20, time.Minute, http.HandlerFunc(a.publicVerifyContract)))
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
	mux.Handle("GET /api/v1/admin/verification-records", a.requireAdminPermission(permissionContractsView, http.HandlerFunc(a.adminVerificationRecords)))
	mux.Handle("POST /api/v1/admin/verification-records", a.requireAdminPermission(permissionContractsCreate, a.auditAdmin(http.HandlerFunc(a.adminCreateVerificationRecord))))
	mux.Handle("PUT /api/v1/admin/verification-records/{id}", a.requireAdminPermission(permissionContractsUpdate, a.auditAdmin(http.HandlerFunc(a.adminUpdateVerificationRecord))))
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

	return a.recoverPanic(a.measureRequests(a.logRequests(a.securityHeaders(a.cors(a.protectCookieWrites(mux))))))
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
		(databaseError.Code == "23503" || databaseError.Code == "23001") &&
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
