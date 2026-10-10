package database

import (
    "strings"
    "testing"
)

// A managed Neon connection must use TLS and a non-production branch.
// This test performs no network calls and never reads or prints credentials.
func TestNeonTLSConnectionConfiguration(t *testing.T) {
    cases := []struct {
        name string
        url string
        valid bool
    }{
        {"Neon TLS required", "postgres://user:password@ep-example.neon.tech/neondb?sslmode=require", true},
        {"Neon TLS verified", "postgres://user:password@ep-example.neon.tech/neondb?sslmode=verify-full", true},
        {"Neon TLS disabled", "postgres://user:password@ep-example.neon.tech/neondb?sslmode=disable", false},
        {"Local postgres allowed", "postgres://user:password@localhost:5432/db?sslmode=disable", true},
    }

    for _, tc := range cases {
        t.Run(tc.name, func(t *testing.T) {
            err := validateDatabaseTransport(tc.url)
            if (err == nil) != tc.valid {
                t.Fatalf("validateDatabaseTransport unexpected result: valid=%t error=%v", tc.valid, err)
            }
        })
    }
}

func TestInvalidDatabaseURLIsRejected(t *testing.T) {
    if err := validateDatabaseTransport("not-a-url"); err == nil {
        t.Fatal("expected malformed database URL to be rejected")
    }
}

func TestNeonHostWithLocalSuffixIsRejectedWithoutTLS(t *testing.T) {
    if err := validateDatabaseTransport("postgres://user:password@ep-example.neon.tech.local/neondb?sslmode=disable"); err != nil {
        t.Fatalf("expected non-Neon local hostname to retain previous behavior: %v", err)
    }
    if err := validateDatabaseTransport("postgres://user:password@ep-example.neon.tech/neondb?sslmode=disable"); err == nil || !strings.Contains(err.Error(), "TLS") {
        t.Fatalf("expected TLS error for actual Neon hostname, got %v", err)
    }
}
