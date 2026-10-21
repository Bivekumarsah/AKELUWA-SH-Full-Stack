package httpapi

import (
	"net"
	"net/http"
)

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
