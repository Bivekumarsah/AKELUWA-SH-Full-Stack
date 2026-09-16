package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Environment       string
	Address           string
	DatabaseURL       string
	JWTSecret         string
	JWTIssuer         string
	SessionTTL        time.Duration
	CookieName        string
	CookieDomain      string
	CookieSecure      bool
	CookieSameSite    string
	AllowedOrigins    []string
	AdminName         string
	AdminEmail        string
	AdminPassword     string
	ShutdownTimeout   time.Duration
	ReadTimeout       time.Duration
	ReadHeaderTimeout time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	MaxRequestBytes   int64
	MaxHeaderBytes    int
}

func Load() (Config, error) {
	cfg := Config{
		Environment:       strings.ToLower(env("APP_ENV", "development")),
		Address:           env("HTTP_ADDRESS", ":8080"),
		DatabaseURL:       strings.TrimSpace(os.Getenv("DATABASE_URL")),
		JWTSecret:         os.Getenv("JWT_SECRET"),
		JWTIssuer:         env("JWT_ISSUER", "akeluwa-api"),
		CookieName:        env("COOKIE_NAME", "akeluwa_session"),
		CookieDomain:      strings.TrimSpace(os.Getenv("COOKIE_DOMAIN")),
		CookieSameSite:    strings.ToLower(env("COOKIE_SAME_SITE", "lax")),
		AllowedOrigins:    splitCSV(env("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")),
		AdminName:         env("ADMIN_NAME", "AKELUWA Administrator"),
		AdminEmail:        strings.ToLower(strings.TrimSpace(os.Getenv("ADMIN_EMAIL"))),
		AdminPassword:     os.Getenv("ADMIN_PASSWORD"),
		ShutdownTimeout:   10 * time.Second,
		ReadTimeout:       15 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxRequestBytes:   1 << 20,
		MaxHeaderBytes:    1 << 20,
	}

	var err error
	if cfg.SessionTTL, err = time.ParseDuration(env("SESSION_TTL", "24h")); err != nil {
		return Config{}, fmt.Errorf("parse SESSION_TTL: %w", err)
	}
	if cfg.CookieSecure, err = strconv.ParseBool(env("COOKIE_SECURE", "true")); err != nil {
		return Config{}, fmt.Errorf("parse COOKIE_SECURE: %w", err)
	}

	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.Environment != "development" && cfg.Environment != "test" && cfg.Environment != "production" {
		return Config{}, fmt.Errorf("APP_ENV must be development, test, or production")
	}
	if len(cfg.JWTSecret) < 32 {
		return Config{}, fmt.Errorf("JWT_SECRET must contain at least 32 characters")
	}
	if cfg.CookieSameSite != "lax" && cfg.CookieSameSite != "strict" && cfg.CookieSameSite != "none" {
		return Config{}, fmt.Errorf("COOKIE_SAME_SITE must be lax, strict, or none")
	}
	if cfg.CookieSameSite == "none" && !cfg.CookieSecure {
		return Config{}, fmt.Errorf("COOKIE_SECURE must be true when COOKIE_SAME_SITE is none")
	}
	if (cfg.AdminEmail == "") != (cfg.AdminPassword == "") {
		return Config{}, fmt.Errorf("ADMIN_EMAIL and ADMIN_PASSWORD must be configured together")
	}
	if cfg.AdminPassword != "" && len(cfg.AdminPassword) < 12 {
		return Config{}, fmt.Errorf("ADMIN_PASSWORD must contain at least 12 characters")
	}
	if cfg.SessionTTL <= 0 || cfg.SessionTTL > 30*24*time.Hour {
		return Config{}, fmt.Errorf("SESSION_TTL must be greater than zero and no more than 720h")
	}
	for _, origin := range cfg.AllowedOrigins {
		if err := validateOrigin(origin); err != nil {
			return Config{}, fmt.Errorf("invalid CORS origin %q: %w", origin, err)
		}
	}
	if cfg.Environment == "production" {
		if !cfg.CookieSecure {
			return Config{}, fmt.Errorf("COOKIE_SECURE must be true in production")
		}
		if len(cfg.AllowedOrigins) == 0 {
			return Config{}, fmt.Errorf("CORS_ORIGINS must contain at least one origin in production")
		}
		for _, origin := range cfg.AllowedOrigins {
			parsed, _ := url.Parse(origin)
			if parsed.Scheme != "https" {
				return Config{}, fmt.Errorf("production CORS origins must use https")
			}
		}
		if looksLikePlaceholder(cfg.JWTSecret) || looksLikePlaceholder(cfg.AdminPassword) {
			return Config{}, fmt.Errorf("production secrets must not use example or local placeholder values")
		}
	}

	return cfg, nil
}

func validateOrigin(value string) error {
	parsed, err := url.Parse(value)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
		return fmt.Errorf("must be an absolute http or https origin")
	}
	if parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" || (parsed.Path != "" && parsed.Path != "/") {
		return fmt.Errorf("must not include credentials, a path, query, or fragment")
	}
	return nil
}

func looksLikePlaceholder(value string) bool {
	normalized := strings.ToLower(value)
	for _, marker := range []string{"replace-with", "change-me", "local-only", "example-secret"} {
		if strings.Contains(normalized, marker) {
			return true
		}
	}
	return false
}

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			result = append(result, strings.TrimRight(trimmed, "/"))
		}
	}
	return result
}
