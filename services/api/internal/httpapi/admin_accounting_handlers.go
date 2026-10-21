package httpapi

import (
	"net/http"
	"sort"
	"github.com/akeluwa/software-hub/backend/internal/model"
	"github.com/akeluwa/software-hub/backend/internal/store"
)

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
	} else if user, err := a.store.FindUserByEmail(r.Context(), item.ClientEmail); err == nil && user.Role == "user" && user.AccountActive {
		item.UserID = user.ID
	}
	var created model.Invoice
	var notificationID string
	err := a.store.WithTransaction(r.Context(), func(data *store.Store) error {
		var createErr error
		created, createErr = data.CreateInvoice(r.Context(), item)
		if createErr != nil {
			return createErr
		}
		notificationID, createErr = data.QueueDocumentNotification(r.Context(), "invoice_created", created.ID, created)
		return createErr
	})
	if !a.handleAccountingError(w, r, err) {
		return
	}
	emailSent, err := a.deliverDocumentNotification(r.Context(), notificationID)
	if err != nil {
		a.logger.Error("deliver invoice notification", "invoice_id", created.ID, "error", err)
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"invoice": created, "email_sent": emailSent,
		"email_warning": notificationWarning(emailSent),
	})
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
