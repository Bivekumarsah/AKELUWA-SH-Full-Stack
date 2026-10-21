package auth

import (
	"bytes"
	"encoding/base32"
	"strings"
	"testing"
	"time"
)

func TestRecoveryCodesAreUniqueAndHashNormalized(t *testing.T) {
	codes, err := GenerateRecoveryCodes(10)
	if err != nil {
		t.Fatalf("GenerateRecoveryCodes returned an error: %v", err)
	}
	seen := make(map[string]struct{}, len(codes))
	for _, code := range codes {
		if _, exists := seen[code]; exists {
			t.Fatalf("duplicate recovery code generated: %s", code)
		}
		seen[code] = struct{}{}
		hash, ok := RecoveryCodeHash(code)
		if !ok {
			t.Fatalf("generated recovery code was rejected: %s", code)
		}
		compact := strings.ToLower(strings.ReplaceAll(code, "-", ""))
		normalizedHash, ok := RecoveryCodeHash(compact)
		if !ok || !bytes.Equal(hash, normalizedHash) {
			t.Fatal("recovery code hashing should ignore case and separators")
		}
	}
	if _, ok := RecoveryCodeHash("not-a-valid-code"); ok {
		t.Fatal("invalid recovery code was accepted")
	}
}

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
	value, err := manager.IssueMFAChallenge("admin-id", 3)
	if err != nil {
		t.Fatalf("IssueMFAChallenge returned an error: %v", err)
	}
	if _, err := manager.Parse(value); err == nil {
		t.Fatal("expected an MFA challenge to be rejected as a session")
	}
	claims, err := manager.ParseMFAChallenge(value)
	if err != nil || claims.UserID != "admin-id" || claims.SessionVersion != 3 {
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

func TestAccountTokensAreRandomAndHashable(t *testing.T) {
	first, firstHash, err := GenerateAccountToken()
	if err != nil {
		t.Fatalf("GenerateAccountToken returned an error: %v", err)
	}
	second, secondHash, err := GenerateAccountToken()
	if err != nil {
		t.Fatalf("GenerateAccountToken returned an error: %v", err)
	}
	if first == second || bytes.Equal(firstHash, secondHash) {
		t.Fatal("account tokens must be unique")
	}
	parsed, ok := AccountTokenHash(first)
	if !ok || !bytes.Equal(parsed, firstHash) {
		t.Fatal("generated account token should reproduce its stored hash")
	}
	if _, ok := AccountTokenHash("not-a-token"); ok {
		t.Fatal("malformed account token was accepted")
	}
}

func TestSessionVersionRoundTrip(t *testing.T) {
	manager := NewManager("a-secret-that-is-long-enough-for-testing", "test-issuer", time.Minute)
	value, _, err := manager.Issue("user-id", "user", "Akeluwa Client", false, 7)
	if err != nil {
		t.Fatalf("Issue returned an error: %v", err)
	}
	claims, err := manager.Parse(value)
	if err != nil || claims.SessionVersion != 7 {
		t.Fatalf("unexpected session version: claims=%#v err=%v", claims, err)
	}
}
