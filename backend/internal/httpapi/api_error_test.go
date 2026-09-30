package httpapi

import (
	"bytes"
	"encoding/base64"
	"errors"
	"image"
	"image/color"
	"image/png"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/akeluwa/software-hub/backend/internal/config"
	"github.com/jackc/pgx/v5/pgconn"
)

func TestIsCareerApplicationReference(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want bool
	}{
		{
			name: "career application foreign key",
			err:  &pgconn.PgError{Code: "23503", ConstraintName: "career_applications_career_id_fkey"},
			want: true,
		},
		{
			name: "different foreign key",
			err:  &pgconn.PgError{Code: "23503", ConstraintName: "another_constraint"},
		},
		{
			name: "wrapped career application foreign key",
			err:  errors.Join(errors.New("delete failed"), &pgconn.PgError{Code: "23503", ConstraintName: "career_applications_career_id_fkey"}),
			want: true,
		},
		{name: "ordinary error", err: errors.New("delete failed")},
		{name: "nil error", err: nil},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := isCareerApplicationReference(test.err); got != test.want {
				t.Fatalf("isCareerApplicationReference() = %v, want %v", got, test.want)
			}
		})
	}
}

func TestDecodeCompanyAccount(t *testing.T) {
	validBody := `{
		"display_name":"  AKELUWA SH  ","legal_name":"AKELUWA Software Hub",
		"tagline":"Reliable systems","tagline_meaning":"  Engineering clarity behind every system  ",
		"primary_email":"INFO@EXAMPLE.COM",
		"support_email":"support@example.com","careers_email":"careers@example.com",
		"phone":"+977 9800000000","website_url":"https://example.com",
		"registration_number":"REG-1","tax_id":"PAN-1","address_line":"Kathmandu",
		"city":"Kathmandu","region":"Bagmati","postal_code":"44600","country":"Nepal",
		"timezone":"Asia/Kathmandu","currency":"npr",
		"linkedin_url":"https://linkedin.com/company/example","github_url":"https://github.com/example"
	}`
	api := &API{cfg: config.Config{MaxRequestBytes: 1 << 20}}
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPut, "/api/v1/admin/company-account", strings.NewReader(validBody))
	item, ok := api.decodeCompanyAccount(response, request)
	if !ok {
		t.Fatalf("valid company account was rejected with status %d: %s", response.Code, response.Body.String())
	}
	if item.DisplayName != "AKELUWA SH" || item.TaglineMeaning != "Engineering clarity behind every system" || item.PrimaryEmail != "info@example.com" || item.Currency != "NPR" {
		t.Fatalf("company account was not normalized: %#v", item)
	}

	invalidBody := strings.Replace(validBody, "Asia/Kathmandu", "Mars/Olympus", 1)
	response = httptest.NewRecorder()
	request = httptest.NewRequest(http.MethodPut, "/api/v1/admin/company-account", strings.NewReader(invalidBody))
	if _, ok := api.decodeCompanyAccount(response, request); ok || response.Code != http.StatusUnprocessableEntity {
		t.Fatalf("invalid timezone: expected 422, got %d", response.Code)
	}
}

func TestDecodeContractAllowsClientInvitationWithoutRegisteredID(t *testing.T) {
	body := `{
		"contract_number":"ak-2026-101","title":"Website delivery agreement",
		"client_name":"Future Client","client_email":"CLIENT@EXAMPLE.COM","provider_name":"AKELUWA SH",
		"currency":"npr","amount_cents":150000,"start_date":"2026-10-01","end_date":"2026-11-15",
		"scope":"Build the agreed website.","deliverables":"Production website and source code.",
		"milestones":"Design, development, review, and launch.","payment_terms":"Fifty percent deposit and balance on acceptance.",
		"revision_terms":"Two revision rounds are included.","support_terms":"Thirty days of defect support.",
		"ownership_terms":"Custom work transfers after full payment.","confidentiality_terms":"Both parties protect confidential information.",
		"termination_terms":"Material breach requires notice and a cure period.","dispute_terms":"Disputes follow the law and venue stated by the parties.",
		"special_terms":""
	}`
	api := &API{cfg: config.Config{MaxRequestBytes: 1 << 20}}
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/admin/contracts", strings.NewReader(body))
	item, ok := api.decodeContract(response, request)
	if !ok {
		t.Fatalf("contract invitation was rejected with status %d: %s", response.Code, response.Body.String())
	}
	if item.UserID != "" || item.ClientEmail != "client@example.com" {
		t.Fatalf("contract invitation was not normalized: %#v", item)
	}
}

func TestDecodeSignatureRequiresRealPNG(t *testing.T) {
	canvas := image.NewRGBA(image.Rect(0, 0, 300, 100))
	for x := 30; x < 120; x++ {
		canvas.Set(x, 50, color.RGBA{R: 23, G: 37, B: 84, A: 255})
	}
	var pngBuffer bytes.Buffer
	if err := png.Encode(&pngBuffer, canvas); err != nil {
		t.Fatalf("encode test signature: %v", err)
	}
	pngData := base64.StdEncoding.EncodeToString(pngBuffer.Bytes())
	api := &API{cfg: config.Config{MaxRequestBytes: 1 << 20}}
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/account/contracts/id/sign", strings.NewReader(`{"signer_name":"Client Name","signature":"data:image/png;base64,`+pngData+`"}`))
	if _, _, ok := api.decodeSignature(response, request); !ok {
		t.Fatalf("valid PNG signature was rejected with status %d: %s", response.Code, response.Body.String())
	}

	response = httptest.NewRecorder()
	request = httptest.NewRequest(http.MethodPost, "/api/v1/account/contracts/id/sign", strings.NewReader(`{"signer_name":"Client Name","signature":"data:image/png;base64,bm90LWEtcG5n"}`))
	if _, _, ok := api.decodeSignature(response, request); ok || response.Code != http.StatusUnprocessableEntity {
		t.Fatalf("fake PNG signature: expected 422, got %d", response.Code)
	}
}

func TestPublicContractVerificationRejectsMalformedLookup(t *testing.T) {
	api := &API{cfg: config.Config{MaxRequestBytes: 1 << 20}}
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/contracts/verify?number=AK-1&fingerprint=not-a-hash", nil)

	api.publicVerifyContract(response, request)

	if response.Code != http.StatusUnprocessableEntity {
		t.Fatalf("malformed verification: expected 422, got %d", response.Code)
	}
	if !strings.Contains(response.Body.String(), "SHA-256 fingerprint") {
		t.Fatalf("malformed verification returned an unclear response: %s", response.Body.String())
	}
}

func TestDecodeVerificationRecordNormalizesAndValidates(t *testing.T) {
	api := &API{cfg: config.Config{MaxRequestBytes: 1 << 20}}
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/admin/verification-records", strings.NewReader(`{
		"verification_code":" ak-cert-2026-001 ","record_type":"Certificate","title":"Security Training",
		"holder_name":"Example Person","issued_on":"2026-09-01","expires_on":"2027-09-01",
		"status":"ACTIVE","public_note":"Issued after assessment."
	}`))
	item, ok := api.decodeVerificationRecord(response, request)
	if !ok {
		t.Fatalf("valid verification record was rejected with status %d: %s", response.Code, response.Body.String())
	}
	if item.VerificationCode != "AK-CERT-2026-001" || item.RecordType != "certificate" || item.Status != "active" {
		t.Fatalf("verification record was not normalized: %#v", item)
	}

	response = httptest.NewRecorder()
	request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/verification-records", strings.NewReader(`{
		"verification_code":"bad code","record_type":"certificate","title":"Test certificate",
		"issued_on":"2027-09-01","expires_on":"2026-09-01","status":"active"
	}`))
	if _, ok := api.decodeVerificationRecord(response, request); ok || response.Code != http.StatusUnprocessableEntity {
		t.Fatalf("invalid verification record: expected 422, got %d", response.Code)
	}
}

func TestDecodeInvoiceCalculatesTrustedTotals(t *testing.T) {
	body := `{
		"invoice_number":"inv-2026-001","client_name":"Example Client","client_email":"client@example.com",
		"issue_date":"2026-09-18","due_date":"2026-10-02","currency":"npr",
		"tax_cents":100,"discount_cents":50,
		"items":[{"description":"Development milestone","quantity":2.5,"unit_price_cents":1000}]
	}`
	api := &API{cfg: config.Config{MaxRequestBytes: 1 << 20}}
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/admin/accounting/invoices", strings.NewReader(body))
	item, ok := api.decodeInvoice(response, request)
	if !ok {
		t.Fatalf("valid invoice was rejected with status %d: %s", response.Code, response.Body.String())
	}
	if item.InvoiceNumber != "INV-2026-001" || item.Currency != "NPR" || item.SubtotalCents != 2500 || item.TotalCents != 2550 {
		t.Fatalf("invoice was not normalized and calculated: %#v", item)
	}
}

func TestDecodeAccountingTransactionRejectsExpenseAgainstInvoice(t *testing.T) {
	body := `{
		"invoice_id":"11111111-1111-1111-1111-111111111111","direction":"expense",
		"category":"Hosting","description":"Cloud hosting","counterparty":"Example Vendor",
		"amount_cents":1000,"currency":"USD","payment_method":"card","reference":"REF-1",
		"transaction_date":"2026-09-18","notes":""
	}`
	api := &API{cfg: config.Config{MaxRequestBytes: 1 << 20}}
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/admin/accounting/transactions", strings.NewReader(body))
	if _, ok := api.decodeAccountingTransaction(response, request); ok || response.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expense linked to invoice: expected 422, got %d", response.Code)
	}
}

func TestNormalizeAdminPermissions(t *testing.T) {
	permissions, ok := normalizeAdminPermissions([]string{"accounts.delete", "overview.view", " services.update "})
	if !ok {
		t.Fatal("valid delegated permissions were rejected")
	}
	want := []string{"overview.view", "services.view", "services.update", "accounts.view", "accounts.delete"}
	if len(permissions) != len(want) {
		t.Fatalf("normalizeAdminPermissions() = %#v, want %#v", permissions, want)
	}
	for index := range want {
		if permissions[index] != want[index] {
			t.Fatalf("normalizeAdminPermissions() = %#v, want %#v", permissions, want)
		}
	}

	if _, ok := normalizeAdminPermissions(nil); ok {
		t.Fatal("empty delegated permissions were accepted")
	}
	if _, ok := normalizeAdminPermissions([]string{"overview.view", "superuser"}); ok {
		t.Fatal("unknown delegated permission was accepted")
	}
}
