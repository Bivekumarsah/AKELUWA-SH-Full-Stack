package httpapi

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"image/png"
	"net/http"
	"strings"
	"time"
	"github.com/akeluwa/software-hub/backend/internal/config"
	"github.com/akeluwa/software-hub/backend/internal/model"
	"github.com/akeluwa/software-hub/backend/internal/store"
)

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
	var created model.Contract
	var client model.User
	var notificationID string
	accountCreated := false
	err := a.store.WithTransaction(r.Context(), func(data *store.Store) error {
		var resolveErr error
		client, accountCreated, resolveErr = resolveContractClient(r.Context(), data, item)
		if resolveErr != nil {
			return resolveErr
		}
		item.UserID = client.ID
		item, resolveErr = companyContractIdentity(r.Context(), data, item)
		if resolveErr != nil {
			return resolveErr
		}
		created, resolveErr = data.CreateContract(r.Context(), item)
		if resolveErr != nil {
			return resolveErr
		}
		notificationID, resolveErr = data.QueueDocumentNotification(r.Context(), "contract_draft", created.ID, created)
		return resolveErr
	})
	if errors.Is(err, errInvalidContractClient) {
		writeError(w, http.StatusUnprocessableEntity, "contract client must be an active customer account and match the supplied email")
		return
	}
	if !a.handleStoreError(w, r, err) {
		return
	}
	emailSent, err := a.deliverDocumentNotification(r.Context(), notificationID)
	if err != nil {
		a.logger.Error("deliver contract creation notification", "contract_id", created.ID, "error", err)
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"contract": created, "account_created": accountCreated, "email_sent": emailSent,
		"email_warning": notificationWarning(emailSent),
	})
}

func (a *API) adminUpdateContract(w http.ResponseWriter, r *http.Request) {
	item, ok := a.decodeContract(w, r)
	if !ok {
		return
	}
	if !a.validateContractClient(w, r, item) {
		return
	}
	item, err := a.withCompanyContractIdentity(r.Context(), item)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	var updated model.Contract
	err = a.store.WithTransaction(r.Context(), func(data *store.Store) error {
		var updateErr error
		updated, updateErr = data.UpdateContract(r.Context(), r.PathValue("id"), item)
		if updateErr != nil {
			return updateErr
		}
		return data.RefreshDocumentNotification(r.Context(), "contract_draft", updated.ID, updated)
	})
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"contract": updated})
}

func (a *API) adminSendContract(w http.ResponseWriter, r *http.Request) {
	var item model.Contract
	var notificationID string
	err := a.store.WithTransaction(r.Context(), func(data *store.Store) error {
		var sendErr error
		item, sendErr = data.SendContract(r.Context(), r.PathValue("id"))
		if sendErr != nil {
			return sendErr
		}
		if sendErr = data.CancelDocumentNotification(r.Context(), "contract_draft", item.ID); sendErr != nil {
			return sendErr
		}
		notificationID, sendErr = data.QueueDocumentNotification(r.Context(), "contract_published", item.ID, item)
		return sendErr
	})
	if !a.handleStoreError(w, r, err) {
		return
	}
	emailSent, err := a.deliverDocumentNotification(r.Context(), notificationID)
	if err != nil {
		a.logger.Error("deliver published contract notification", "contract_id", item.ID, "error", err)
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"contract": item, "email_sent": emailSent,
		"email_warning": notificationWarning(emailSent),
	})
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
	var item model.Contract
	err := a.store.WithTransaction(r.Context(), func(data *store.Store) error {
		var updateErr error
		item, updateErr = data.UpdateContractStatus(r.Context(), r.PathValue("id"), input.Status)
		if updateErr != nil || input.Status != "cancelled" {
			return updateErr
		}
		return data.CancelDocumentNotification(r.Context(), "contract_published", item.ID)
	})
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"contract": item})
}

func (a *API) adminVerificationRecords(w http.ResponseWriter, r *http.Request) {
	items, err := a.store.ListVerificationRecords(r.Context())
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"verification_records": items})
}

func (a *API) adminCreateVerificationRecord(w http.ResponseWriter, r *http.Request) {
	item, ok := a.decodeVerificationRecord(w, r)
	if !ok {
		return
	}
	created, err := a.store.CreateVerificationRecord(r.Context(), item, claimsFromContext(r.Context()).UserID)
	if isUniqueViolation(err) {
		writeError(w, http.StatusConflict, "a verification record already uses this code")
		return
	}
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"verification_record": created})
}

func (a *API) adminUpdateVerificationRecord(w http.ResponseWriter, r *http.Request) {
	item, ok := a.decodeVerificationRecord(w, r)
	if !ok {
		return
	}
	updated, err := a.store.UpdateVerificationRecord(r.Context(), r.PathValue("id"), item, claimsFromContext(r.Context()).UserID)
	if isUniqueViolation(err) {
		writeError(w, http.StatusConflict, "a verification record already uses this code")
		return
	}
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"verification_record": updated})
}

func (a *API) decodeVerificationRecord(w http.ResponseWriter, r *http.Request) (model.VerificationRecord, bool) {
	var item model.VerificationRecord
	if !a.decode(w, r, &item) {
		return item, false
	}
	item.VerificationCode = strings.ToUpper(strings.TrimSpace(item.VerificationCode))
	item.RecordType = strings.ToLower(strings.TrimSpace(item.RecordType))
	item.Title = strings.TrimSpace(item.Title)
	item.HolderName = strings.TrimSpace(item.HolderName)
	item.Status = strings.ToLower(strings.TrimSpace(item.Status))
	item.PublicNote = strings.TrimSpace(item.PublicNote)
	item.ContentHash = strings.ToLower(strings.TrimSpace(item.ContentHash))
	issued, issuedErr := time.Parse("2006-01-02", item.IssuedOn)
	expires, expiresErr := time.Time{}, error(nil)
	if item.ExpiresOn != "" {
		expires, expiresErr = time.Parse("2006-01-02", item.ExpiresOn)
	}
	validType := item.RecordType == "certificate" || item.RecordType == "document" || item.RecordType == "letter" || item.RecordType == "report" || item.RecordType == "approval" || item.RecordType == "other"
	validStatus := item.Status == "active" || item.Status == "revoked"
	validHash := item.ContentHash == "" || contractHashPattern.MatchString(item.ContentHash)
	if len(item.VerificationCode) < 3 || len(item.VerificationCode) > 80 || !invoiceNumberPattern.MatchString(item.VerificationCode) || !validType || len(item.Title) < 3 || len(item.Title) > 200 || len(item.HolderName) > 160 || issuedErr != nil || expiresErr != nil || (!expires.IsZero() && expires.Before(issued)) || !validStatus || len(item.PublicNote) > 500 || !validHash {
		writeError(w, http.StatusUnprocessableEntity, "verification record fields are incomplete or invalid")
		return item, false
	}
	return item, true
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
	const prefix = "data:image/png;base64,"
	encoded := strings.TrimPrefix(input.Signature, prefix)
	data, decodeErr := base64.StdEncoding.DecodeString(encoded)
	config, imageErr := png.DecodeConfig(bytes.NewReader(data))
	validImage := decodeErr == nil && imageErr == nil && len(data) <= 225000 && config.Width >= 200 && config.Width <= 4096 && config.Height >= 80 && config.Height <= 1024
	if validImage {
		decoded, err := png.Decode(bytes.NewReader(data))
		validImage = err == nil
		inkPixels := 0
		if validImage {
			bounds := decoded.Bounds()
			for y := bounds.Min.Y; y < bounds.Max.Y && inkPixels < 24; y++ {
				for x := bounds.Min.X; x < bounds.Max.X && inkPixels < 24; x++ {
					r, g, b, alpha := decoded.At(x, y).RGBA()
					if alpha > 0x1000 && (r < 0xe000 || g < 0xe000 || b < 0xe000) {
						inkPixels++
					}
				}
			}
			validImage = inkPixels >= 24
		}
	}
	if len(input.SignerName) < 2 || len(input.SignerName) > 120 || len(input.Signature) > 300000 || !strings.HasPrefix(input.Signature, prefix) || !validImage {
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
	fields := []*string{&item.Scope, &item.Deliverables, &item.Milestones, &item.PaymentTerms, &item.RevisionTerms, &item.SupportTerms, &item.OwnershipTerms, &item.ConfidentialityTerms, &item.TerminationTerms, &item.DisputeTerms}
	validTerms := true
	for _, field := range fields {
		*field = strings.TrimSpace(*field)
		if len(*field) < 5 || len(*field) > 10000 {
			validTerms = false
		}
	}
	item.SpecialTerms = strings.TrimSpace(item.SpecialTerms)
	if (item.UserID != "" && !uuidPattern.MatchString(item.UserID)) || len(item.ContractNumber) < 3 || len(item.ContractNumber) > 60 || len(item.Title) < 3 || len(item.Title) > 200 || len(item.ClientName) < 2 || !validEmail(item.ClientEmail) || len(item.ClientCompany) > 160 || len(item.ProviderName) < 2 || len(item.ProviderName) > 160 || len(item.Currency) != 3 || item.AmountCents < 0 || startErr != nil || endErr != nil || end.Before(start) || !validTerms || len(item.SpecialTerms) > 10000 {
		writeError(w, http.StatusUnprocessableEntity, "contract fields are incomplete or invalid")
		return model.Contract{}, false
	}
	return item, true
}

func (a *API) validateContractClient(w http.ResponseWriter, r *http.Request, item model.Contract) bool {
	client, err := a.store.FindUserByID(r.Context(), item.UserID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusUnprocessableEntity, "select an active registered client")
			return false
		}
		a.internalError(w, r, err)
		return false
	}
	if client.Role != "user" || !client.AccountActive || !strings.EqualFold(client.Email, item.ClientEmail) {
		writeError(w, http.StatusUnprocessableEntity, "contract email must match the selected active client account")
		return false
	}
	return true
}

func (a *API) withCompanyContractIdentity(ctx context.Context, item model.Contract) (model.Contract, error) {
	return companyContractIdentity(ctx, a.store, item)
}
