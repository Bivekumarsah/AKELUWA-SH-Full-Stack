package httpapi

import (
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

type rateLimitBucket struct {
	count     int
	resetAt   time.Time
	updatedAt time.Time
}

type rateLimiter struct {
	now     func() time.Time
	mu      sync.Mutex
	buckets map[string]rateLimitBucket
}

func newRateLimiter(now func() time.Time) *rateLimiter {
	return &rateLimiter{now: now, buckets: make(map[string]rateLimitBucket)}
}

func (l *rateLimiter) allow(key string, maxRequests int, window time.Duration) bool {
	now := l.now()

	l.mu.Lock()
	defer l.mu.Unlock()

	if len(l.buckets) > 10000 {
		for bucketKey, bucket := range l.buckets {
			if now.After(bucket.resetAt) || now.Sub(bucket.updatedAt) > time.Hour {
				delete(l.buckets, bucketKey)
			}
		}
	}

	bucket := l.buckets[key]
	if bucket.resetAt.IsZero() || now.After(bucket.resetAt) {
		l.buckets[key] = rateLimitBucket{count: 1, resetAt: now.Add(window), updatedAt: now}
		return true
	}

	if bucket.count >= maxRequests {
		bucket.updatedAt = now
		l.buckets[key] = bucket
		return false
	}

	bucket.count++
	bucket.updatedAt = now
	l.buckets[key] = bucket
	return true
}

func (a *API) limitRequests(name string, maxRequests int, window time.Duration, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := name + ":" + a.clientIP(r)
		if !a.rateLimits.allow(key, maxRequests, window) {
			w.Header().Set("Retry-After", formatRetryAfter(window))
			writeError(w, http.StatusTooManyRequests, "too many requests; please try again later")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (a *API) clientIP(r *http.Request) string {
	if a.cfg.TrustProxyHeaders {
		forwardedFor := strings.TrimSpace(r.Header.Get("X-Forwarded-For"))
		if forwardedFor != "" {
			first, _, _ := strings.Cut(forwardedFor, ",")
			if ip := net.ParseIP(strings.TrimSpace(first)); ip != nil {
				return ip.String()
			}
		}
	}

	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return host
	}
	return r.RemoteAddr
}

func formatRetryAfter(window time.Duration) string {
	seconds := int(window.Seconds())
	if seconds < 1 {
		seconds = 1
	}
	return strconv.Itoa(seconds)
}
