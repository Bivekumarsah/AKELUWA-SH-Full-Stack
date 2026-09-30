package httpapi

import (
	"context"
	"encoding/json"
	"errors"
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
	failNext int
}

func (m *captureMailer) Send(_ context.Context, to, subject, body string) error {
	if m.failNext > 0 {
		m.failNext--
		return errors.New("simulated SMTP failure")
	}
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
	defer func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM document_notification_outbox WHERE record_id IN (
			SELECT id FROM contracts WHERE user_id=$1 UNION SELECT id FROM accounting_invoices WHERE user_id=$1)`, client.ID)
		_, _ = pool.Exec(context.Background(), `DELETE FROM accounting_invoices WHERE user_id=$1`, client.ID)
		_, _ = pool.Exec(context.Background(), `DELETE FROM contracts WHERE user_id=$1`, client.ID)
		_, _ = pool.Exec(context.Background(), `DELETE FROM users WHERE id=$1`, client.ID)
	}()
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

	mailbox.failNext = 1
	retryNumber := fmt.Sprintf("INV-2026-RETRY-%d", suffix)
	retryBody := strings.Replace(invoiceBody, invoiceNumber, retryNumber, 1)
	request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/accounting/invoices", strings.NewReader(retryBody))
	response = httptest.NewRecorder()
	api.adminCreateInvoice(response, request)
	if response.Code != http.StatusCreated {
		t.Fatalf("create invoice after SMTP failure: status=%d body=%s", response.Code, response.Body.String())
	}
	var retryResult struct {
		Invoice   model.Invoice `json:"invoice"`
		EmailSent bool          `json:"email_sent"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &retryResult); err != nil {
		t.Fatalf("decode retry invoice response: %v", err)
	}
	if retryResult.EmailSent || len(mailbox.messages) != 3 {
		t.Fatalf("failed SMTP send was reported as delivered: result=%#v messages=%d", retryResult, len(mailbox.messages))
	}
	pending, oldestSeconds, err := data.DocumentNotificationBacklog(ctx)
	if err != nil || pending != 1 || oldestSeconds < 0 {
		t.Fatalf("notification backlog is incorrect: pending=%d oldest=%f err=%v", pending, oldestSeconds, err)
	}
	var notificationID string
	if err := pool.QueryRow(ctx, `UPDATE document_notification_outbox SET next_attempt_at=now()
		WHERE kind='invoice_created' AND record_id=$1 RETURNING id::text`, retryResult.Invoice.ID).Scan(&notificationID); err != nil {
		t.Fatalf("find queued retry: %v", err)
	}
	sent, err := api.deliverDocumentNotification(ctx, "")
	if err != nil || !sent || len(mailbox.messages) != 4 {
		t.Fatalf("retry did not deliver: sent=%t err=%v messages=%d", sent, err, len(mailbox.messages))
	}
	var delivered bool
	if err := pool.QueryRow(ctx, `SELECT sent_at IS NOT NULL FROM document_notification_outbox WHERE id=$1`, notificationID).Scan(&delivered); err != nil || !delivered {
		t.Fatalf("retry was not recorded as sent: delivered=%t err=%v", delivered, err)
	}

	mailbox.failNext = 1
	voidNumber := fmt.Sprintf("INV-2026-VOID-%d", suffix)
	voidBody := strings.Replace(invoiceBody, invoiceNumber, voidNumber, 1)
	request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/accounting/invoices", strings.NewReader(voidBody))
	response = httptest.NewRecorder()
	api.adminCreateInvoice(response, request)
	if response.Code != http.StatusCreated {
		t.Fatalf("create invoice to void: status=%d body=%s", response.Code, response.Body.String())
	}
	var voidResult struct {
		Invoice model.Invoice `json:"invoice"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &voidResult); err != nil {
		t.Fatalf("decode void invoice response: %v", err)
	}
	if _, err := data.VoidInvoice(ctx, voidResult.Invoice.ID); err != nil {
		t.Fatalf("void invoice with queued email: %v", err)
	}
	var cancelled bool
	if err := pool.QueryRow(ctx, `SELECT cancelled_at IS NOT NULL FROM document_notification_outbox
		WHERE kind='invoice_created' AND record_id=$1`, voidResult.Invoice.ID).Scan(&cancelled); err != nil || !cancelled {
		t.Fatalf("void invoice email was not cancelled: cancelled=%t err=%v", cancelled, err)
	}
}

func TestDocumentNotificationConcurrentClaims(t *testing.T) {
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
	var recordID string
	if err := pool.QueryRow(ctx, `SELECT gen_random_uuid()::text`).Scan(&recordID); err != nil {
		t.Fatalf("create record ID: %v", err)
	}
	id, err := data.QueueDocumentNotification(ctx, "invoice_created", recordID, map[string]string{"to": "claim-test@example.test"})
	if err != nil {
		t.Fatalf("queue notification: %v", err)
	}
	defer func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM document_notification_outbox WHERE id=$1`, id)
	}()

	type claimResult struct {
		job store.DocumentNotification
		err error
	}
	start := make(chan struct{})
	results := make(chan claimResult, 8)
	for range 8 {
		go func() {
			<-start
			job, err := data.ClaimDocumentNotification(ctx, id)
			results <- claimResult{job: job, err: err}
		}()
	}
	close(start)
	var first store.DocumentNotification
	claimed := 0
	for range 8 {
		result := <-results
		if result.err == nil {
			first = result.job
			claimed++
		} else if !errors.Is(result.err, store.ErrNotFound) {
			t.Fatalf("claim notification: %v", result.err)
		}
	}
	if claimed != 1 || first.Attempts != 1 {
		t.Fatalf("expected exactly one first claim, got %d claims and %d attempts", claimed, first.Attempts)
	}
	if _, err := pool.Exec(ctx, `UPDATE document_notification_outbox SET lease_until=now()-interval '1 second' WHERE id=$1`, id); err != nil {
		t.Fatalf("expire first lease: %v", err)
	}
	second, err := data.ClaimDocumentNotification(ctx, id)
	if err != nil || second.Attempts != 2 {
		t.Fatalf("reclaim expired notification: job=%#v err=%v", second, err)
	}
	if err := data.FinishDocumentNotification(ctx, first, true); err == nil {
		t.Fatal("stale worker completed a reclaimed notification")
	}
	if err := data.FinishDocumentNotification(ctx, second, true); err != nil {
		t.Fatalf("complete active claim: %v", err)
	}
	if _, err := data.ClaimDocumentNotification(ctx, id); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("delivered notification was claimable again: %v", err)
	}
}
