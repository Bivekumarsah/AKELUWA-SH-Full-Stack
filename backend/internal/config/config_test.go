package config

import (
	"strings"
	"testing"
)

func setValidEnvironment(t *testing.T) {
	t.Helper()
	t.Setenv("APP_ENV", "test")
	t.Setenv("DATABASE_URL", "postgres://user:password@localhost:5432/akeluwa?sslmode=disable")
	t.Setenv("JWT_SECRET", "test-secret-with-more-than-thirty-two-characters")
	t.Setenv("MFA_ENCRYPTION_KEY", "test-mfa-key-with-more-than-thirty-two-characters")
	t.Setenv("CORS_ORIGINS", "http://localhost:5173")
	t.Setenv("COOKIE_SECURE", "false")
	t.Setenv("COOKIE_SAME_SITE", "lax")
	t.Setenv("SESSION_TTL", "24h")
	t.Setenv("TRUST_PROXY_HEADERS", "false")
	t.Setenv("ADMIN_EMAIL", "")
	t.Setenv("ADMIN_PASSWORD", "")
}

func TestLoadAcceptsValidTestConfiguration(t *testing.T) {
	setValidEnvironment(t)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load returned an error: %v", err)
	}
	if cfg.Environment != "test" || cfg.TrustProxyHeaders || cfg.MaxHeaderBytes == 0 || cfg.ReadHeaderTimeout == 0 {
		t.Fatalf("unexpected configuration: %#v", cfg)
	}
}

func TestLoadRejectsUnsafeProductionConfiguration(t *testing.T) {
	tests := []struct {
		name    string
		key     string
		value   string
		message string
	}{
		{name: "insecure cookie", key: "COOKIE_SECURE", value: "false", message: "COOKIE_SECURE"},
		{name: "http origin", key: "CORS_ORIGINS", value: "http://example.com", message: "https"},
		{name: "placeholder secret", key: "JWT_SECRET", value: "replace-with-a-long-random-production-secret", message: "placeholder"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			setValidEnvironment(t)
			t.Setenv("APP_ENV", "production")
			t.Setenv("COOKIE_SECURE", "true")
			t.Setenv("CORS_ORIGINS", "https://example.com")
			t.Setenv(test.key, test.value)

			_, err := Load()
			if err == nil || !strings.Contains(err.Error(), test.message) {
				t.Fatalf("expected an error containing %q, got %v", test.message, err)
			}
		})
	}
}

func TestLoadRejectsOriginWithPath(t *testing.T) {
	setValidEnvironment(t)
	t.Setenv("CORS_ORIGINS", "https://example.com/api")

	_, err := Load()
	if err == nil || !strings.Contains(err.Error(), "path") {
		t.Fatalf("expected an invalid origin error, got %v", err)
	}
}
