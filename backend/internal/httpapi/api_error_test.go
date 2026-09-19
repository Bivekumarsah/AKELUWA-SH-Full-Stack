package httpapi

import (
	"errors"
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
