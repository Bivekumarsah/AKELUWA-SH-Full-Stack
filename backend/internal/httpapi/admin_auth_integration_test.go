package httpapi

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/akeluwa/software-hub/backend/internal/auth"
	"github.com/akeluwa/software-hub/backend/internal/config"
	"github.com/akeluwa/software-hub/backend/internal/database"
	"github.com/akeluwa/software-hub/backend/internal/model"
	"github.com/akeluwa/software-hub/backend/internal/store"
)

func TestAdminAuthorizationAgainstStoredRoles(t *testing.T) {
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("set TEST_DATABASE_URL to run PostgreSQL authorization integration tests")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	pool, err := database.Open(ctx, databaseURL)
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	defer pool.Close()
	if err := database.Migrate(ctx, pool); err != nil {
		t.Fatalf("migrate test database: %v", err)
	}

	data := store.New(pool)
	passwordHash, err := auth.HashPassword("integration-test-password")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	suffix := time.Now().UnixNano()
	admin, err := data.CreateUser(ctx, "Integration Admin", fmt.Sprintf("admin-%d@example.test", suffix), passwordHash, "admin")
	if err != nil {
		t.Fatalf("create admin: %v", err)
	}
	user, err := data.CreateUser(ctx, "Integration User", fmt.Sprintf("user-%d@example.test", suffix), passwordHash, "user")
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	subAdmin, err := data.CreateSubAdmin(ctx, "Integration Sub-admin", fmt.Sprintf("sub-admin-%d@example.test", suffix), passwordHash, []string{permissionOverviewView})
	if err != nil {
		t.Fatalf("create sub-admin: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), "DELETE FROM admin_action_requests WHERE requester_id=$1 OR reviewed_by=$2", subAdmin.ID, admin.ID)
		_, _ = pool.Exec(context.Background(), "DELETE FROM users WHERE id=$1", admin.ID)
		_, _ = pool.Exec(context.Background(), "DELETE FROM users WHERE id=$1", user.ID)
		_, _ = pool.Exec(context.Background(), "DELETE FROM users WHERE id=$1", subAdmin.ID)
	})
	if err := data.SetUserMFASecret(ctx, admin.ID, []byte("integration-secret")); err != nil {
		t.Fatalf("set admin MFA secret: %v", err)
	}
	if err := data.EnableUserMFA(ctx, admin.ID); err != nil {
		t.Fatalf("enable admin MFA: %v", err)
	}
	if err := data.SetUserMFASecret(ctx, subAdmin.ID, []byte("integration-sub-admin-secret")); err != nil {
		t.Fatalf("set sub-admin MFA secret: %v", err)
	}
	if err := data.EnableUserMFA(ctx, subAdmin.ID); err != nil {
		t.Fatalf("enable sub-admin MFA: %v", err)
	}

	tokens := auth.NewManager("integration-jwt-secret-with-at-least-thirty-two-characters", "integration-test", time.Hour)
	secretCipher, err := auth.NewSecretCipher("integration-mfa-secret-with-at-least-thirty-two-characters")
	if err != nil {
		t.Fatalf("create secret cipher: %v", err)
	}
	api := New(config.Config{CookieName: "session", MaxRequestBytes: 1 << 20}, data, tokens, secretCipher, slog.New(slog.NewTextHandler(io.Discard, nil)))

	requestStatus := func(userID, role string, mfaVerified bool, path string) int {
		t.Helper()
		token, _, issueErr := tokens.Issue(userID, role, "Test User", mfaVerified)
		if issueErr != nil {
			t.Fatalf("issue token: %v", issueErr)
		}
		request := httptest.NewRequest(http.MethodGet, path, nil)
		request.Header.Set("Authorization", "Bearer "+token)
		response := httptest.NewRecorder()
		api.Router().ServeHTTP(response, request)
		return response.Code
	}

	if status := requestStatus(user.ID, "user", false, "/api/v1/admin/stats"); status != http.StatusForbidden {
		t.Fatalf("normal user: expected 403, got %d", status)
	}
	if status := requestStatus(admin.ID, "admin", false, "/api/v1/admin/stats"); status != http.StatusForbidden {
		t.Fatalf("admin without MFA: expected 403, got %d", status)
	}
	if status := requestStatus(admin.ID, "admin", true, "/api/v1/admin/stats"); status != http.StatusOK {
		t.Fatalf("MFA-verified admin: expected 200, got %d", status)
	}
	if status := requestStatus(subAdmin.ID, "sub_admin", true, "/api/v1/admin/stats"); status != http.StatusOK {
		t.Fatalf("sub-admin with overview access: expected 200, got %d", status)
	}
	if status := requestStatus(subAdmin.ID, "sub_admin", true, "/api/v1/admin/services"); status != http.StatusForbidden {
		t.Fatalf("sub-admin without services access: expected 403, got %d", status)
	}
	if status := requestStatus(subAdmin.ID, "sub_admin", true, "/api/v1/admin/sub-admins"); status != http.StatusForbidden {
		t.Fatalf("sub-admin opening delegated-access management: expected 403, got %d", status)
	}
	if _, err := data.UpdateSubAdminAccess(ctx, subAdmin.ID, []string{permissionServicesView}, true); err != nil {
		t.Fatalf("change sub-admin access: %v", err)
	}
	if status := requestStatus(subAdmin.ID, "sub_admin", true, "/api/v1/admin/services"); status != http.StatusOK {
		t.Fatalf("sub-admin with services access: expected 200, got %d", status)
	}
	if status := requestStatus(subAdmin.ID, "sub_admin", true, "/api/v1/admin/stats"); status != http.StatusForbidden {
		t.Fatalf("sub-admin after overview removal: expected 403, got %d", status)
	}
	if _, err := data.UpdateSubAdminAccess(ctx, subAdmin.ID, []string{permissionServicesView}, false); err != nil {
		t.Fatalf("suspend sub-admin: %v", err)
	}
	if status := requestStatus(subAdmin.ID, "sub_admin", true, "/api/v1/admin/services"); status != http.StatusForbidden {
		t.Fatalf("suspended sub-admin: expected 403, got %d", status)
	}

	service, err := data.CreateService(ctx, model.Service{
		Number: "99", Slug: fmt.Sprintf("approval-test-%d", suffix), Title: "Approval Test Service",
		Summary: "Temporary service used to verify destructive action review.", Stack: "Go / PostgreSQL",
		Position: 99, Active: false,
	})
	if err != nil {
		t.Fatalf("create review test service: %v", err)
	}
	t.Cleanup(func() { _ = data.DeleteService(context.Background(), service.ID) })
	if _, err := data.UpdateSubAdminAccess(ctx, subAdmin.ID, []string{permissionServicesView}, true); err != nil {
		t.Fatalf("reactivate sub-admin: %v", err)
	}
	subAdminToken, _, err := tokens.Issue(subAdmin.ID, "sub_admin", subAdmin.Name, true)
	if err != nil {
		t.Fatalf("issue sub-admin token: %v", err)
	}
	requestDelete := func(token string) *httptest.ResponseRecorder {
		request := httptest.NewRequest(http.MethodDelete, "/api/v1/admin/services/"+service.ID, nil)
		request.Header.Set("Authorization", "Bearer "+token)
		response := httptest.NewRecorder()
		api.Router().ServeHTTP(response, request)
		return response
	}
	if response := requestDelete(subAdminToken); response.Code != http.StatusForbidden {
		t.Fatalf("sub-admin without delete grant: expected 403, got %d", response.Code)
	}
	if _, err := data.UpdateSubAdminAccess(ctx, subAdmin.ID, []string{permissionServicesView, permissionServicesDelete}, true); err != nil {
		t.Fatalf("grant delete permission: %v", err)
	}
	if response := requestDelete(subAdminToken); response.Code != http.StatusAccepted {
		t.Fatalf("delegated delete request: expected 202, got %d: %s", response.Code, response.Body.String())
	}
	services, err := data.ListServices(ctx, true)
	if err != nil {
		t.Fatalf("list services after review request: %v", err)
	}
	if !containsService(services, service.ID) {
		t.Fatal("service was deleted before full-admin approval")
	}
	requests, err := data.ListAdminActionRequests(ctx)
	if err != nil {
		t.Fatalf("list action requests: %v", err)
	}
	var reviewID string
	for _, item := range requests {
		if item.Action == "service.delete" && item.TargetID == service.ID && item.Status == "pending" {
			reviewID = item.ID
			break
		}
	}
	if reviewID == "" {
		t.Fatal("delegated delete request was not added to the review queue")
	}
	adminTokenForReview, _, err := tokens.Issue(admin.ID, "admin", admin.Name, true)
	if err != nil {
		t.Fatalf("issue review token: %v", err)
	}
	approveRequest := httptest.NewRequest(http.MethodPost, "/api/v1/admin/action-requests/"+reviewID+"/approve", strings.NewReader(`{"note":"approved by integration test"}`))
	approveRequest.Header.Set("Authorization", "Bearer "+adminTokenForReview)
	approveRequest.Header.Set("Content-Type", "application/json")
	approveResponse := httptest.NewRecorder()
	api.Router().ServeHTTP(approveResponse, approveRequest)
	if approveResponse.Code != http.StatusOK {
		t.Fatalf("approve delegated delete: expected 200, got %d: %s", approveResponse.Code, approveResponse.Body.String())
	}
	services, err = data.ListServices(ctx, true)
	if err != nil {
		t.Fatalf("list services after approval: %v", err)
	}
	if containsService(services, service.ID) {
		t.Fatal("approved service deletion was not executed")
	}

	career, err := data.CreateCareer(ctx, model.Career{
		Title:            "Integration Test Engineer",
		Department:       "Engineering",
		Location:         "Remote",
		EmploymentType:   "Full-time",
		Summary:          "A temporary opening used to verify protected deletion.",
		Responsibilities: "Build and verify integration-test behavior.",
		Requirements:     "Experience testing PostgreSQL-backed applications.",
		ApplyEmail:       fmt.Sprintf("careers-%d@example.test", suffix),
		Active:           true,
	})
	if err != nil {
		t.Fatalf("create career: %v", err)
	}
	application, err := data.CreateCareerApplication(ctx, model.CareerApplication{
		CareerID:   career.ID,
		FullName:   "Integration Candidate",
		Email:      fmt.Sprintf("candidate-%d@example.test", suffix),
		Phone:      "+977-9800000000",
		Location:   "Kathmandu",
		CoverNote:  "This temporary application verifies relationship-safe deletion.",
		ResumeName: "integration-test.pdf",
		ResumeType: "application/pdf",
		ResumeSize: 4,
	}, []byte("test"), "127.0.0.1")
	if err != nil {
		t.Fatalf("create career application: %v", err)
	}
	t.Cleanup(func() {
		_ = data.DeleteCareerApplication(context.Background(), application.ID)
		_ = data.DeleteCareer(context.Background(), career.ID)
	})

	adminToken, _, err := tokens.Issue(admin.ID, "admin", admin.Name, true)
	if err != nil {
		t.Fatalf("issue admin token: %v", err)
	}
	deleteRequest := httptest.NewRequest(http.MethodDelete, "/api/v1/admin/careers/"+career.ID, nil)
	deleteRequest.Header.Set("Authorization", "Bearer "+adminToken)
	deleteResponse := httptest.NewRecorder()
	api.Router().ServeHTTP(deleteResponse, deleteRequest)
	if deleteResponse.Code != http.StatusConflict {
		t.Fatalf("career with applications: expected 409, got %d", deleteResponse.Code)
	}
	if !strings.Contains(deleteResponse.Body.String(), "has candidate applications") {
		t.Fatalf("career conflict response was not actionable: %s", deleteResponse.Body.String())
	}

	protectedReview, err := data.CreateAdminActionRequest(ctx, subAdmin.ID, "career.delete", career.ID, career.Title)
	if err != nil {
		t.Fatal(err)
	}
	protectedRequest := httptest.NewRequest(http.MethodPost, "/api/v1/admin/action-requests/"+protectedReview.ID+"/approve", strings.NewReader(`{"note":"Cannot delete a referenced opening"}`))
	protectedRequest.Header.Set("Authorization", "Bearer "+adminToken)
	protectedRequest.Header.Set("Content-Type", "application/json")
	protectedResponse := httptest.NewRecorder()
	api.Router().ServeHTTP(protectedResponse, protectedRequest)
	if protectedResponse.Code != http.StatusConflict {
		t.Fatalf("protected approval: %d %s", protectedResponse.Code, protectedResponse.Body.String())
	}
	var protectedStatus string
	if err := pool.QueryRow(ctx, "SELECT status FROM admin_action_requests WHERE id=$1", protectedReview.ID).Scan(&protectedStatus); err != nil {
		t.Fatal(err)
	}
	if protectedStatus != "failed" {
		t.Fatalf("failed SQL action left request in %q", protectedStatus)
	}

	if _, err := data.UpdateUserRole(ctx, admin.ID, "user"); err != nil {
		t.Fatalf("demote admin: %v", err)
	}
	if status := requestStatus(admin.ID, "admin", true, "/api/v1/admin/stats"); status != http.StatusForbidden {
		t.Fatalf("demoted admin with stale token: expected 403, got %d", status)
	}
}

func containsService(items []model.Service, id string) bool {
	for _, item := range items {
		if item.ID == id {
			return true
		}
	}
	return false
}
