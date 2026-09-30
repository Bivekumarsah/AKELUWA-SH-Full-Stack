package httpapi

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/akeluwa/software-hub/backend/internal/config"
	"github.com/akeluwa/software-hub/backend/internal/database"
	"github.com/akeluwa/software-hub/backend/internal/model"
	"github.com/akeluwa/software-hub/backend/internal/store"
)

type capturedEmail struct {
	to      string
	subject string
	body    string
}

type captureMailer struct {
	messages []capturedEmail
}

func (m *captureMailer) Send(_ context.Context, to, subject, body string) error {
	m.messages = append(m.messages, capturedEmail{to: to, subject: subject, body: body})
	return nil
}

func TestContractInvitationPublishingAndInvoiceNotifications(t *testing.T) {
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("set TEST_DATABASE_URL to run PostgreSQL document-notification integration tests")
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
	mailbox := &captureMailer{}
	api := &API{
		cfg:    config.Config{FrontendURL: "https://portal.example.test", MaxRequestBytes: 1 << 20},
		store:  data,
		email:  mailbox,
		logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
	suffix := time.Now().UnixNano()
	clientEmail := fmt.Sprintf("invited-client-%d@example.test", suffix)
	contractNumber := fmt.Sprintf("AK-2026-%d", suffix)
	contractBody := fmt.Sprintf(`{
		"contract_number":%q,"title":"Website delivery agreement",
		"client_name":"Invited Client","client_email":%q,"provider_name":"AKELUWA SH",
		"currency":"NPR","amount_cents":150000,"start_date":"2026-10-01","end_date":"2026-11-15",
		"scope":"Build the agreed website.","deliverables":"Production website and source code.",
		"milestones":"Design, development, review, and launch.","payment_terms":"Fifty percent deposit and balance on acceptance.",
		"revision_terms":"Two revision rounds are included.","support_terms":"Thirty days of defect support.",
		"ownership_terms":"Custom work transfers after full payment.","confidentiality_terms":"Both parties protect confidential information.",
		"termination_terms":"Material breach requires notice and a cure period.","dispute_terms":"Disputes follow the law and venue stated by the parties.",
		"special_terms":""
	}`, contractNumber, clientEmail)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/admin/contracts", strings.NewReader(contractBody))
	response := httptest.NewRecorder()
	api.adminCreateContract(response, request)
	if response.Code != http.StatusCreated {
		t.Fatalf("create contract: status=%d body=%s", response.Code, response.Body.String())
	}
	var contractResult struct {
		Contract       model.Contract `json:"contract"`
		AccountCreated bool           `json:"account_created"`
		EmailSent      bool           `json:"email_sent"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &contractResult); err != nil {
		t.Fatalf("decode contract response: %v", err)
	}
	if !contractResult.AccountCreated || !contractResult.EmailSent || len(mailbox.messages) != 1 {
		t.Fatalf("contract invitation result=%#v messages=%d", contractResult, len(mailbox.messages))
	}
	client, err := data.FindUserByEmail(ctx, clientEmail)
	if err != nil {
		t.Fatalf("find invited client: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM accounting_invoices WHERE user_id=$1`, client.ID)
		_, _ = pool.Exec(context.Background(), `DELETE FROM contracts WHERE user_id=$1`, client.ID)
		_, _ = pool.Exec(context.Background(), `DELETE FROM users WHERE id=$1`, client.ID)
	})
	if contractResult.Contract.UserID != client.ID || client.EmailVerifiedAt != nil || !strings.Contains(mailbox.messages[0].body, "/reset-password?token=") {
		t.Fatalf("invited client was not securely linked: client=%#v email=%#v", client, mailbox.messages[0])
	}

	request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/contracts/"+contractResult.Contract.ID+"/send", strings.NewReader(`{}`))
	request.SetPathValue("id", contractResult.Contract.ID)
	response = httptest.NewRecorder()
	api.adminSendContract(response, request)
	if response.Code != http.StatusOK || len(mailbox.messages) != 2 || !strings.Contains(mailbox.messages[1].subject, "ready for review") {
		t.Fatalf("publish contract: status=%d body=%s messages=%#v", response.Code, response.Body.String(), mailbox.messages)
	}

	invoiceNumber := fmt.Sprintf("INV-2026-%d", suffix)
	invoiceBody := fmt.Sprintf(`{
		"invoice_number":%q,"client_name":"Invited Client","client_email":%q,
		"issue_date":"2026-10-01","due_date":"2026-10-15","currency":"NPR",
		"tax_cents":13000,"discount_cents":0,"notes":"Thank you.",
		"items":[{"description":"Product engineering","quantity":1,"unit_price_cents":100000,"position":0}]
	}`, invoiceNumber, clientEmail)
	request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/accounting/invoices", strings.NewReader(invoiceBody))
	response = httptest.NewRecorder()
	api.adminCreateInvoice(response, request)
	if response.Code != http.StatusCreated || len(mailbox.messages) != 3 {
		t.Fatalf("create invoice: status=%d body=%s messages=%d", response.Code, response.Body.String(), len(mailbox.messages))
	}
	var invoiceResult struct {
		Invoice   model.Invoice `json:"invoice"`
		EmailSent bool          `json:"email_sent"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &invoiceResult); err != nil {
		t.Fatalf("decode invoice response: %v", err)
	}
	if !invoiceResult.EmailSent || invoiceResult.Invoice.UserID != client.ID || !strings.Contains(mailbox.messages[2].body, "NPR 1130.00") {
		t.Fatalf("invoice was not linked and notified: result=%#v email=%#v", invoiceResult, mailbox.messages[2])
	}
}
