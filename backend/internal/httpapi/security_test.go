package httpapi

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/akeluwa/software-hub/backend/internal/config"
)

func testAPI() *API {
	return &API{
		cfg:     config.Config{CookieName: "session", CookieSecure: true},
		logger:  slog.New(slog.NewTextHandler(io.Discard, nil)),
		origins: map[string]struct{}{"https://app.example.com": {}},
	}
}

func TestProtectCookieWritesRejectsMissingOrUnknownOrigin(t *testing.T) {
	api := testAPI()
	handler := api.protectCookieWrites(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	for _, origin := range []string{"", "https://attacker.example"} {
		request := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
		request.AddCookie(&http.Cookie{Name: "session", Value: "token"})
		if origin != "" {
			request.Header.Set("Origin", origin)
		}
		response := httptest.NewRecorder()

		handler.ServeHTTP(response, request)
		if response.Code != http.StatusForbidden {
			t.Fatalf("origin %q: expected 403, got %d", origin, response.Code)
		}
	}
}

func TestProtectCookieWritesAllowsTrustedOriginAndCookieFreeRequest(t *testing.T) {
	api := testAPI()
	handler := api.protectCookieWrites(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	tests := []struct {
		name   string
		cookie bool
		origin string
	}{
		{name: "trusted browser", cookie: true, origin: "https://app.example.com"},
		{name: "public request", cookie: false, origin: ""},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, "/api/v1/inquiries", nil)
			if test.cookie {
				request.AddCookie(&http.Cookie{Name: "session", Value: "token"})
			}
			if test.origin != "" {
				request.Header.Set("Origin", test.origin)
			}
			response := httptest.NewRecorder()

			handler.ServeHTTP(response, request)
			if response.Code != http.StatusNoContent {
				t.Fatalf("expected 204, got %d", response.Code)
			}
		})
	}
}

func TestSecurityHeaders(t *testing.T) {
	api := testAPI()
	handler := api.securityHeaders(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/healthz", nil))

	for _, name := range []string{"Content-Security-Policy", "Permissions-Policy", "Strict-Transport-Security", "X-Content-Type-Options"} {
		if response.Header().Get(name) == "" {
			t.Errorf("expected %s header", name)
		}
	}
}
