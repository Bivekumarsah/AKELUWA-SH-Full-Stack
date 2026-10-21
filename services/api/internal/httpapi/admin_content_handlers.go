package httpapi

import (
	"net/http"
)

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
