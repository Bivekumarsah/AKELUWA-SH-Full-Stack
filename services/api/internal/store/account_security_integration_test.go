package store_test

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/akeluwa/software-hub/backend/internal/auth"
	"github.com/akeluwa/software-hub/backend/internal/database"
	"github.com/akeluwa/software-hub/backend/internal/store"
)

func TestAccountVerificationAndPasswordResetTokensAreSingleUse(t *testing.T) {
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("set TEST_DATABASE_URL to run PostgreSQL account-security integration tests")
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
	passwordHash, err := auth.HashPassword("initial-account-password")
	if err != nil {
		t.Fatalf("hash initial password: %v", err)
	}
	user, err := data.CreateUser(ctx, "Security Test Client", fmt.Sprintf("security-%d@example.test", time.Now().UnixNano()), passwordHash, "user")
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	defer pool.Exec(context.Background(), `DELETE FROM users WHERE id=$1`, user.ID)
	if user.EmailVerifiedAt != nil {
		t.Fatal("new customer should require email verification")
	}

	_, verificationHash, err := auth.GenerateAccountToken()
	if err != nil {
		t.Fatalf("generate verification token: %v", err)
	}
	if err := data.ReplaceAccountToken(ctx, user.ID, "email_verification", verificationHash, time.Now().Add(time.Hour)); err != nil {
		t.Fatalf("store verification token: %v", err)
	}
	_, replacementVerificationHash, err := auth.GenerateAccountToken()
	if err != nil {
		t.Fatalf("generate replacement verification token: %v", err)
	}
	if err := data.ReplaceAccountToken(ctx, user.ID, "email_verification", replacementVerificationHash, time.Now().Add(time.Hour)); err != nil {
		t.Fatalf("replace verification token: %v", err)
	}
	if _, err := data.VerifyEmailToken(ctx, verificationHash); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("replaced verification token: expected not found, got %v", err)
	}
	verified, err := data.VerifyEmailToken(ctx, replacementVerificationHash)
	if err != nil || verified.EmailVerifiedAt == nil {
		t.Fatalf("verify email token: user=%#v err=%v", verified, err)
	}
	if _, err := data.VerifyEmailToken(ctx, replacementVerificationHash); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("reused verification token: expected not found, got %v", err)
	}

	_, resetHash, err := auth.GenerateAccountToken()
	if err != nil {
		t.Fatalf("generate reset token: %v", err)
	}
	if err := data.ReplaceAccountToken(ctx, user.ID, "password_reset", resetHash, time.Now().Add(time.Hour)); err != nil {
		t.Fatalf("store reset token: %v", err)
	}
	newPasswordHash, err := auth.HashPassword("replacement-account-password")
	if err != nil {
		t.Fatalf("hash replacement password: %v", err)
	}
	resetUser, err := data.ResetPasswordWithToken(ctx, resetHash, newPasswordHash)
	if err != nil {
		t.Fatalf("reset password: %v", err)
	}
	if resetUser.SessionVersion != user.SessionVersion+1 {
		t.Fatalf("password reset did not revoke sessions: before=%d after=%d", user.SessionVersion, resetUser.SessionVersion)
	}
	stored, err := data.FindUserByEmail(ctx, user.Email)
	if err != nil || !auth.CheckPassword(stored.PasswordHash, "replacement-account-password") {
		t.Fatalf("replacement password was not stored: %v", err)
	}
	if _, err := data.ResetPasswordWithToken(ctx, resetHash, newPasswordHash); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("reused reset token: expected not found, got %v", err)
	}
}

func TestEnsureClientUserCreatesOnceAndMatchesEmailCaseInsensitively(t *testing.T) {
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("set TEST_DATABASE_URL to run PostgreSQL account-security integration tests")
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
	passwordHash, err := auth.HashPassword("invited-client-random-password")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	email := fmt.Sprintf("invited-%d@example.test", time.Now().UnixNano())
	user, created, err := data.EnsureClientUser(ctx, "Invited Client", email, passwordHash)
	if err != nil || !created {
		t.Fatalf("create invited client: created=%v err=%v", created, err)
	}
	defer pool.Exec(context.Background(), `DELETE FROM users WHERE id=$1`, user.ID)
	if user.EmailVerifiedAt != nil || user.Role != "user" {
		t.Fatalf("invited account should be an unverified client: %#v", user)
	}

	matched, createdAgain, err := data.EnsureClientUser(ctx, "Different Name", strings.ToUpper(email), passwordHash)
	if err != nil || createdAgain || matched.ID != user.ID || matched.Name != "Invited Client" {
		t.Fatalf("match existing invited client: matched=%#v created=%v err=%v", matched, createdAgain, err)
	}
}
