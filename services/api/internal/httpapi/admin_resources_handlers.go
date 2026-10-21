package httpapi

import (
	"fmt"
	"io"
	"mime"
	"net/http"
	"path/filepath"
	"strings"
	"github.com/akeluwa/software-hub/backend/internal/model"
	"github.com/akeluwa/software-hub/backend/internal/store"
)

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
