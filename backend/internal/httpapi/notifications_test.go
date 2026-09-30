package httpapi

import (
	"strings"
	"testing"

	"github.com/akeluwa/software-hub/backend/internal/model"
)

func TestContractNotificationCopyIncludesDocumentAndSecureAccess(t *testing.T) {
	item := model.Contract{
		ContractNumber: "AK-2026-101",
		Title:          "Website delivery agreement",
		ClientName:     "Future Client",
		Currency:       "NPR",
		AmountCents:    150050,
		StartDate:      "2026-10-01",
		EndDate:        "2026-11-15",
		Status:         "pending",
	}
	subject, body := contractNotificationCopy(item, "Set your password: https://example.com/reset-password?token=secret", true)
	for _, expected := range []string{"AK-2026-101", "Website delivery agreement", "NPR 1500.50", "ready for review", "Set your password"} {
		if !strings.Contains(subject+body, expected) {
			t.Errorf("notification does not contain %q", expected)
		}
	}
}

func TestInvoiceNotificationCopyIncludesTotalsAndItems(t *testing.T) {
	item := model.Invoice{
		InvoiceNumber: "INV-2026-101",
		ClientName:    "Future Client",
		IssueDate:     "2026-10-01",
		DueDate:       "2026-10-15",
		Currency:      "NPR",
		SubtotalCents: 200000,
		TaxCents:      26000,
		TotalCents:    226000,
		BalanceCents:  226000,
		Status:        "sent",
		Items:         []model.InvoiceItem{{Description: "Product engineering", Quantity: 2, UnitPriceCents: 100000}},
	}
	subject, body := invoiceNotificationCopy(item, "Open your account: https://example.com/account")
	for _, expected := range []string{"INV-2026-101", "Product engineering", "NPR 2260.00", "2026-10-15", "Open your account"} {
		if !strings.Contains(subject+body, expected) {
			t.Errorf("notification does not contain %q", expected)
		}
	}
}

func TestNotificationWarningOnlyReportsFailure(t *testing.T) {
	if notificationWarning(true) != "" {
		t.Fatal("successful delivery returned a warning")
	}
	if notificationWarning(false) == "" {
		t.Fatal("failed delivery did not return a warning")
	}
}
