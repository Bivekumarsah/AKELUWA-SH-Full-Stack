package store_test

import (
	"context"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/akeluwa/software-hub/backend/internal/database"
	"github.com/akeluwa/software-hub/backend/internal/model"
	"github.com/akeluwa/software-hub/backend/internal/store"
)

func TestAccountingWorkflow(t *testing.T) {
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("set TEST_DATABASE_URL to run PostgreSQL accounting integration tests")
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
	suffix := time.Now().UnixNano()
	invoice, err := data.CreateInvoice(ctx, model.Invoice{
		InvoiceNumber: fmt.Sprintf("TEST-INV-%d", suffix),
		ClientName:    "Integration Client",
		ClientEmail:   fmt.Sprintf("accounts-%d@example.test", suffix),
		IssueDate:     time.Now().Format("2006-01-02"),
		DueDate:       time.Now().AddDate(0, 0, 14).Format("2006-01-02"),
		Currency:      "NPR",
		SubtotalCents: 10000,
		TotalCents:    10000,
		Items: []model.InvoiceItem{{
			Description:    "Integration service",
			Quantity:       1,
			UnitPriceCents: 10000,
		}},
	})
	if err != nil {
		t.Fatalf("create invoice: %v", err)
	}
	defer func() {
		_, _ = pool.Exec(context.Background(), "DELETE FROM accounting_transactions WHERE invoice_id=$1", invoice.ID)
		_, _ = pool.Exec(context.Background(), "DELETE FROM accounting_invoice_items WHERE invoice_id=$1", invoice.ID)
		_, _ = pool.Exec(context.Background(), "DELETE FROM accounting_invoices WHERE id=$1", invoice.ID)
	}()

	payment, err := data.CreateAccountingTransaction(ctx, model.AccountingTransaction{
		InvoiceID:       invoice.ID,
		Direction:       "income",
		Category:        "Invoice payment",
		Description:     "Partial project payment",
		Counterparty:    "Integration Client",
		AmountCents:     4000,
		Currency:        "NPR",
		PaymentMethod:   "bank_transfer",
		Reference:       "TEST-REFERENCE",
		TransactionDate: time.Now().Format("2006-01-02"),
	})
	if err != nil {
		t.Fatalf("record payment: %v", err)
	}
	if payment.ReceiptNumber == "" {
		t.Fatal("income payment did not receive a receipt number")
	}

	invoices, err := data.ListInvoices(ctx)
	if err != nil {
		t.Fatalf("list invoices: %v", err)
	}
	stored := findInvoice(t, invoices, invoice.ID)
	if stored.Status != "partial" || stored.PaidCents != 4000 || stored.BalanceCents != 6000 {
		t.Fatalf("unexpected partial invoice: %#v", stored)
	}

	_, err = data.CreateAccountingTransaction(ctx, model.AccountingTransaction{
		InvoiceID:       invoice.ID,
		Direction:       "income",
		Category:        "Invoice payment",
		Description:     "Excess payment",
		Counterparty:    "Integration Client",
		AmountCents:     6001,
		Currency:        "NPR",
		PaymentMethod:   "cash",
		TransactionDate: time.Now().Format("2006-01-02"),
	})
	if !errors.Is(err, store.ErrInvoiceOverpayment) {
		t.Fatalf("overpayment error = %v, want ErrInvoiceOverpayment", err)
	}

	voided, err := data.VoidAccountingTransaction(ctx, payment.ID)
	if err != nil {
		t.Fatalf("void payment: %v", err)
	}
	if voided.Status != "void" {
		t.Fatalf("voided payment status = %q", voided.Status)
	}
	invoices, err = data.ListInvoices(ctx)
	if err != nil {
		t.Fatalf("list invoices after void: %v", err)
	}
	stored = findInvoice(t, invoices, invoice.ID)
	if stored.Status != "sent" || stored.PaidCents != 0 || stored.BalanceCents != 10000 {
		t.Fatalf("invoice was not restored after payment void: %#v", stored)
	}

	var voidInvoice model.Invoice
	err = data.WithTransaction(ctx, func(tx *store.Store) error {
		var voidErr error
		voidInvoice, voidErr = tx.VoidInvoice(ctx, invoice.ID)
		return voidErr
	})
	if err != nil {
		t.Fatalf("void invoice: %v", err)
	}
	if voidInvoice.Status != "void" {
		t.Fatalf("voided invoice status = %q", voidInvoice.Status)
	}
}

func findInvoice(t *testing.T, invoices []model.Invoice, id string) model.Invoice {
	t.Helper()
	for _, invoice := range invoices {
		if invoice.ID == id {
			return invoice
		}
	}
	t.Fatalf("invoice %s not found", id)
	return model.Invoice{}
}
