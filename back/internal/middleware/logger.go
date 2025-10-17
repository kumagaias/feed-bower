package middleware

import (
	"log"
	"net/http"
	"time"
)

// LoggerConfig holds logger configuration
type LoggerConfig struct {
	Logger *log.Logger
}

// Logger middleware for HTTP request logging
func Logger(config *LoggerConfig) func(http.Handler) http.Handler {
	logger := log.Default()
	if config != nil && config.Logger != nil {
		logger = config.Logger
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			// Create a response writer wrapper to capture status code
			wrapped := &responseWriter{
				ResponseWriter: w,
				statusCode:     http.StatusOK,
			}

			// Process request
			next.ServeHTTP(wrapped, r)

			// Log request details
			duration := time.Since(start)
			logger.Printf(
				"%s %s %d %v %s %s",
				r.Method,
				r.RequestURI,
				wrapped.statusCode,
				duration,
				r.RemoteAddr,
				r.UserAgent(),
			)
		})
	}
}

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

// WriteHeader captures the status code
func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// Write ensures WriteHeader is called with 200 if not already called
func (rw *responseWriter) Write(b []byte) (int, error) {
	if rw.statusCode == 0 {
		rw.statusCode = http.StatusOK
	}
	return rw.ResponseWriter.Write(b)
}
