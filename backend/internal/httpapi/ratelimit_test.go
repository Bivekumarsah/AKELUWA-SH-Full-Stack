package httpapi

import (
	"net/http"
	"testing"
	"time"
)

func TestRateLimiterBlocksAfterLimitUntilWindowResets(t *testing.T) {
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	limiter := newRateLimiter(func() time.Time { return now })

	if !limiter.allow("login:127.0.0.1", 2, time.Minute) {
		t.Fatal("first request should be allowed")
	}
	if !limiter.allow("login:127.0.0.1", 2, time.Minute) {
		t.Fatal("second request should be allowed")
	}
	if limiter.allow("login:127.0.0.1", 2, time.Minute) {
		t.Fatal("third request should be blocked")
	}

	now = now.Add(time.Minute + time.Second)
	if !limiter.allow("login:127.0.0.1", 2, time.Minute) {
		t.Fatal("request should be allowed after the window resets")
	}
}

func TestClientIPUsesFirstForwardedAddress(t *testing.T) {
	request, err := http.NewRequest(http.MethodPost, "/api/v1/auth/login", nil)
	if err != nil {
		t.Fatal(err)
	}
	request.RemoteAddr = "10.0.0.10:12345"
	request.Header.Set("X-Forwarded-For", "203.0.113.9, 10.0.0.10")

	if got := clientIP(request); got != "203.0.113.9" {
		t.Fatalf("clientIP() = %q, want %q", got, "203.0.113.9")
	}
}
