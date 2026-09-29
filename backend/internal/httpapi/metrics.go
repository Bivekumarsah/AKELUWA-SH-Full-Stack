package httpapi

import (
	"fmt"
	"net/http"
	"sync/atomic"
	"time"
)

type apiMetrics struct {
	requests          atomic.Uint64
	errors            atomic.Uint64
	inFlight          atomic.Int64
	durationMicros    atomic.Uint64
	rateLimitRejected atomic.Uint64
}

func (a *API) measureRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		a.metrics.inFlight.Add(1)
		writer := &metricsResponseWriter{ResponseWriter: w}
		defer func() {
			a.metrics.inFlight.Add(-1)
			a.metrics.requests.Add(1)
			a.metrics.durationMicros.Add(uint64(time.Since(started).Microseconds()))
			if writer.status >= http.StatusInternalServerError || writer.status == 0 {
				a.metrics.errors.Add(1)
			}
		}()
		next.ServeHTTP(writer, r)
	})
}

func (a *API) prometheusMetrics(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	_, _ = fmt.Fprintf(w, `# HELP akeluwa_http_requests_total Total HTTP requests.
# TYPE akeluwa_http_requests_total counter
akeluwa_http_requests_total %d
# HELP akeluwa_http_errors_total Total HTTP responses with a 5xx status.
# TYPE akeluwa_http_errors_total counter
akeluwa_http_errors_total %d
# HELP akeluwa_http_requests_in_flight Current HTTP requests being served.
# TYPE akeluwa_http_requests_in_flight gauge
akeluwa_http_requests_in_flight %d
# HELP akeluwa_http_request_duration_seconds_total Cumulative request duration.
# TYPE akeluwa_http_request_duration_seconds_total counter
akeluwa_http_request_duration_seconds_total %.6f
# HELP akeluwa_rate_limit_rejections_total Requests rejected by rate limiting.
# TYPE akeluwa_rate_limit_rejections_total counter
akeluwa_rate_limit_rejections_total %d
`, a.metrics.requests.Load(), a.metrics.errors.Load(), a.metrics.inFlight.Load(), float64(a.metrics.durationMicros.Load())/1_000_000, a.metrics.rateLimitRejected.Load())
}

type metricsResponseWriter struct {
	http.ResponseWriter
	status int
}

func (w *metricsResponseWriter) WriteHeader(status int) {
	if w.status != 0 {
		return
	}
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

func (w *metricsResponseWriter) Write(body []byte) (int, error) {
	if w.status == 0 {
		w.WriteHeader(http.StatusOK)
	}
	return w.ResponseWriter.Write(body)
}
