package auth

import (
	"testing"
	"time"
)

func TestPasswordHashRoundTrip(t *testing.T) {
	hash, err := HashPassword("correct-horse-battery-staple")
	if err != nil {
		t.Fatalf("HashPassword returned an error: %v", err)
	}
	if !CheckPassword(hash, "correct-horse-battery-staple") {
		t.Fatal("expected the original password to match")
	}
	if CheckPassword(hash, "wrong-password") {
		t.Fatal("expected a different password not to match")
	}
}

func TestTokenRoundTrip(t *testing.T) {
	manager := NewManager("a-secret-that-is-long-enough-for-testing", "test-issuer", time.Minute)
	value, _, err := manager.Issue("user-id", "admin", "Akeluwa Admin")
	if err != nil {
		t.Fatalf("Issue returned an error: %v", err)
	}
	claims, err := manager.Parse(value)
	if err != nil {
		t.Fatalf("Parse returned an error: %v", err)
	}
	if claims.UserID != "user-id" || claims.Role != "admin" {
		t.Fatalf("unexpected claims: %#v", claims)
	}
}
