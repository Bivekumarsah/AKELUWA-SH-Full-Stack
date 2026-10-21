package httpapi

import (
	"errors"
	"fmt"
	"io"
	"mime"
	"net"
	"net/http"
	"path/filepath"
	"strings"
	"github.com/akeluwa/software-hub/backend/internal/model"
	"github.com/akeluwa/software-hub/backend/internal/store"
)

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

func (a *API) publicVerifyContract(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	contractNumber := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("number")))
	contentHash := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("fingerprint")))
	if len(contractNumber) < 3 || len(contractNumber) > 60 || !invoiceNumberPattern.MatchString(contractNumber) || !contractHashPattern.MatchString(contentHash) {
		writeError(w, http.StatusUnprocessableEntity, "provide a valid contract reference and SHA-256 fingerprint")
		return
	}

	item, err := a.store.VerifyContract(r.Context(), contractNumber, contentHash)
	if !a.handleStoreError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"verification": item})
}

func (a *API) publicVerifyRecord(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	code := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("code")))
	if len(code) < 3 || len(code) > 80 || !invoiceNumberPattern.MatchString(code) {
		writeError(w, http.StatusUnprocessableEntity, "provide a valid document or certificate code")
		return
	}

	contentHash := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("fingerprint")))
	if contentHash != "" && !contractHashPattern.MatchString(contentHash) {
		writeError(w, http.StatusUnprocessableEntity, "provide a valid 64-character SHA-256 fingerprint")
		return
	}

	item, err := a.store.VerifyCompanyRecord(r.Context(), code, contentHash)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "This code is not registered in AKELUWA SH records. Contact akeluwasoftwarehub@gmail.com for confirmation.")
		return
	}
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"verification": item})
}
