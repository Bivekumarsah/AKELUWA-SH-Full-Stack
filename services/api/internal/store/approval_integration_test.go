package store_test

import (
	"context"
	"errors"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/akeluwa/software-hub/backend/internal/database"
	"github.com/akeluwa/software-hub/backend/internal/model"
	"github.com/akeluwa/software-hub/backend/internal/store"
)

func TestApprovalAtomicity(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("set TEST_DATABASE_URL to run approval integration tests")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	pool, err := database.Open(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	if err := database.Migrate(ctx, pool); err != nil {
		t.Fatal(err)
	}
	data := store.New(pool)
	suffix := time.Now().UnixNano()
	user, err := data.CreateUser(ctx, "Review Test", fmt.Sprintf("review-%d@example.test", suffix), "unused", "admin")
	if err != nil {
		t.Fatal(err)
	}
	service, err := data.CreateService(ctx, model.Service{Number: "01", Slug: fmt.Sprintf("review-%d", suffix), Title: "Review test", Summary: "Temporary service", Stack: "Go", Active: true})
	if err != nil {
		t.Fatal(err)
	}
	request, err := data.CreateAdminActionRequest(ctx, user.ID, "service.delete", service.ID, service.Title)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		_, _ = pool.Exec(context.Background(), "DELETE FROM admin_action_requests WHERE id=$1", request.ID)
		_, _ = pool.Exec(context.Background(), "DELETE FROM services WHERE id=$1", service.ID)
		_, _ = pool.Exec(context.Background(), "DELETE FROM users WHERE id=$1", user.ID)
	}()
	interrupted := errors.New("interrupted before audit completion")
	err = data.WithTransaction(ctx, func(tx *store.Store) error {
		if _, err := tx.ClaimAdminActionRequest(ctx, request.ID, user.ID); err != nil {
			return err
		}
		if err := tx.DeleteService(ctx, service.ID); err != nil {
			return err
		}
		return interrupted
	})
	if !errors.Is(err, interrupted) {
		t.Fatalf("rollback error: %v", err)
	}
	var status string
	if err := pool.QueryRow(ctx, "SELECT status FROM admin_action_requests WHERE id=$1", request.ID).Scan(&status); err != nil {
		t.Fatal(err)
	}
	if status != "pending" {
		t.Fatalf("interrupted request is %q", status)
	}
	var exists bool
	if err := pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM services WHERE id=$1)", service.ID).Scan(&exists); err != nil {
		t.Fatal(err)
	}
	if !exists {
		t.Fatal("interrupted approval deleted its target")
	}

	var wg sync.WaitGroup
	outcomes := make(chan error, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			outcomes <- data.WithTransaction(ctx, func(tx *store.Store) error {
				if _, err := tx.ClaimAdminActionRequest(ctx, request.ID, user.ID); err != nil {
					return err
				}
				if err := tx.WithTransaction(ctx, func(action *store.Store) error { return action.DeleteService(ctx, service.ID) }); err != nil {
					return err
				}
				_, err := tx.CompleteAdminActionRequest(ctx, request.ID, "approved", "Verified", "")
				return err
			})
		}()
	}
	wg.Wait()
	close(outcomes)
	success, conflict := 0, 0
	for err := range outcomes {
		if err == nil {
			success++
		} else if errors.Is(err, store.ErrNotFound) {
			conflict++
		} else {
			t.Fatal(err)
		}
	}
	if success != 1 || conflict != 1 {
		t.Fatalf("success=%d conflict=%d", success, conflict)
	}
}
