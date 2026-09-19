package store_test

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/akeluwa/software-hub/backend/internal/database"
	"github.com/akeluwa/software-hub/backend/internal/store"
)

func TestCompanyAccountRoundTrip(t *testing.T) {
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("set TEST_DATABASE_URL to run PostgreSQL company-account integration tests")
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
	original, err := data.CompanyAccount(ctx)
	if err != nil {
		t.Fatalf("read company account: %v", err)
	}
	defer func() {
		if _, restoreErr := data.UpdateCompanyAccount(context.Background(), original); restoreErr != nil {
			t.Errorf("restore company account: %v", restoreErr)
		}
	}()

	wantTagline := fmt.Sprintf("Integration account check %d", time.Now().UnixNano())
	wantTaglineMeaning := "A temporary supporting meaning for the integration test"
	changed := original
	changed.Tagline = wantTagline
	changed.TaglineMeaning = wantTaglineMeaning
	updated, err := data.UpdateCompanyAccount(ctx, changed)
	if err != nil {
		t.Fatalf("update company account: %v", err)
	}
	if updated.Tagline != wantTagline || updated.TaglineMeaning != wantTaglineMeaning || updated.DisplayName != original.DisplayName {
		t.Fatalf("unexpected updated company account: %#v", updated)
	}

	stored, err := data.CompanyAccount(ctx)
	if err != nil {
		t.Fatalf("reread company account: %v", err)
	}
	if stored.Tagline != wantTagline || stored.TaglineMeaning != wantTaglineMeaning {
		t.Fatalf("stored tagline data = (%q, %q), want (%q, %q)", stored.Tagline, stored.TaglineMeaning, wantTagline, wantTaglineMeaning)
	}
}
