package httpapi

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"github.com/akeluwa/software-hub/backend/internal/auth"
	"github.com/akeluwa/software-hub/backend/internal/model"
	"github.com/akeluwa/software-hub/backend/internal/store"
)

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
