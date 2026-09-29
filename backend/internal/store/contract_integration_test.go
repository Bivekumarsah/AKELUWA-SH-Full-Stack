package store_test

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/akeluwa/software-hub/backend/internal/database"
	"github.com/akeluwa/software-hub/backend/internal/model"
	"github.com/akeluwa/software-hub/backend/internal/store"
)

func TestContractIdentityAndOwnershipRoundTrip(t *testing.T) {
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("set TEST_DATABASE_URL to run PostgreSQL contract integration tests")
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
	email := fmt.Sprintf("contract-%d@example.test", suffix)
	client, err := data.CreateUser(ctx, "Contract Client", email, "unused-test-password-hash", "user")
	if err != nil {
		t.Fatalf("create client: %v", err)
	}
	defer pool.Exec(context.Background(), `DELETE FROM users WHERE id=$1`, client.ID)

	item := model.Contract{
		UserID: client.ID, ContractNumber: fmt.Sprintf("TEST-%d", suffix), Title: "Contract integration test",
		ClientName: client.Name, ClientEmail: client.Email, ProviderName: "AKELUWA SH", Currency: "NPR",
		AmountCents: 125000, StartDate: "2026-10-01", EndDate: "2026-11-01",
		Scope: "Build the agreed application.", Deliverables: "Application and handover documentation.",
		Milestones: "Discovery, delivery, review, and launch.", PaymentTerms: "Payment is due against agreed milestones.",
		RevisionTerms: "Two revision rounds are included.", SupportTerms: "Thirty days of defect support are included.",
		OwnershipTerms: "Custom work transfers after full payment.", ConfidentialityTerms: "Both parties protect confidential information.",
		TerminationTerms: "Material breach requires notice and a cure period.", DisputeTerms: "The parties first attempt good-faith negotiation.",
	}
	created, err := data.CreateContract(ctx, item)
	if err != nil {
		t.Fatalf("create contract: %v", err)
	}
	defer pool.Exec(context.Background(), `DELETE FROM contracts WHERE id=$1`, created.ID)

	issued, err := data.SendContract(ctx, created.ID)
	if err != nil {
		t.Fatalf("send contract: %v", err)
	}
	if issued.Status != "pending" || len(issued.ContentHash) != 64 || issued.ProviderLegalName == "" || issued.ProviderEmail == "" {
		t.Fatalf("issued contract did not lock identity and content: %#v", issued)
	}

	visible, err := data.ListContracts(ctx, client.ID)
	if err != nil {
		t.Fatalf("list client contracts: %v", err)
	}
	found := false
	for _, contract := range visible {
		found = found || contract.ID == issued.ID
	}
	if !found {
		t.Fatal("issued contract was not visible to its assigned client")
	}

	signed, err := data.SignContract(ctx, issued.ID, client.ID, "client", client.Name, "data:image/png;base64,test", "127.0.0.1", "integration-test")
	if err != nil {
		t.Fatalf("sign contract: %v", err)
	}
	if signed.ClientSignerName != client.Name || signed.ClientSignedAt == nil {
		t.Fatalf("client acceptance was not recorded: %#v", signed)
	}
}
