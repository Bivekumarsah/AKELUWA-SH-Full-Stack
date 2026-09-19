package auth

import (
	"encoding/base32"
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

func TestMFAChallengeCannotBeUsedAsSession(t *testing.T) {
	manager := NewManager("a-secret-that-is-long-enough-for-testing", "test-issuer", time.Minute)
	value, err := manager.IssueMFAChallenge("admin-id")
	if err != nil {
		t.Fatalf("IssueMFAChallenge returned an error: %v", err)
	}
	if _, err := manager.Parse(value); err == nil {
		t.Fatal("expected an MFA challenge to be rejected as a session")
	}
	claims, err := manager.ParseMFAChallenge(value)
	if err != nil || claims.UserID != "admin-id" {
		t.Fatalf("unexpected MFA challenge result: claims=%#v err=%v", claims, err)
	}
}

func TestTOTPValidationUsesRFC6238Calculation(t *testing.T) {
	secret := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString([]byte("12345678901234567890"))
	if !ValidateTOTP(secret, "287082", time.Unix(59, 0)) {
		t.Fatal("expected the RFC 6238 test code to validate")
	}
	if ValidateTOTP(secret, "000000", time.Unix(59, 0)) {
		t.Fatal("expected an incorrect code to be rejected")
	}
}

func TestSecretCipherRoundTrip(t *testing.T) {
	cipher, err := NewSecretCipher("a-different-secret-that-is-long-enough-for-testing")
	if err != nil {
		t.Fatalf("NewSecretCipher returned an error: %v", err)
	}
	encrypted, err := cipher.Encrypt("TOTPSECRET")
	if err != nil {
		t.Fatalf("Encrypt returned an error: %v", err)
	}
	plain, err := cipher.Decrypt(encrypted)
	if err != nil || plain != "TOTPSECRET" {
		t.Fatalf("unexpected decrypted value %q: %v", plain, err)
	}
}

func TestTokenRoundTrip(t *testing.T) {
	manager := NewManager("a-secret-that-is-long-enough-for-testing", "test-issuer", time.Minute)
	value, _, err := manager.Issue("user-id", "admin", "Akeluwa Admin", true)
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
