package middleware

import (
	"context"
	"io"
	"net/http"
	"strings"
	"time"
)

// RequestSecurityConfig holds configuration for request security middleware
type RequestSecurityConfig struct {
	MaxBodySize     int64         // Maximum request body size
	MaxReadTimeout  time.Duration // Maximum time to read request body
	MaxHeaderSize   int           // Maximum total header size
	MaxURILength    int           // Maximum URI length
	BlockedMethods  []string      // HTTP methods to block
	RequiredHeaders []string      // Headers that must be present
}

// DefaultRequestSecurityConfig returns default request security configuration
func DefaultRequestSecurityConfig() *RequestSecurityConfig {
	return &RequestSecurityConfig{
		MaxBodySize:     1 << 20,          // 1MB
		MaxReadTimeout:  10 * time.Second, // 10 seconds
		MaxHeaderSize:   8192,             // 8KB
		MaxURILength:    2048,             // 2KB
		BlockedMethods:  []string{"TRACE", "CONNECT"},
		RequiredHeaders: []string{}, // No required headers by default
	}
}

// RequestSecurity middleware provides comprehensive request security
func RequestSecurity(config *RequestSecurityConfig) func(http.Handler) http.Handler {
	if config == nil {
		config = DefaultRequestSecurityConfig()
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Check HTTP method
			if isBlockedMethod(r.Method, config.BlockedMethods) {
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
				return
			}

			// Check URI length
			if len(r.RequestURI) > config.MaxURILength {
				http.Error(w, "URI too long", http.StatusRequestURITooLong)
				return
			}

			// Check header size
			if calculateTotalHeaderSize(r) > config.MaxHeaderSize {
				http.Error(w, "Request header fields too large", http.StatusRequestHeaderFieldsTooLarge)
				return
			}

			// Check required headers
			for _, header := range config.RequiredHeaders {
				if r.Header.Get(header) == "" {
					http.Error(w, "Missing required header: "+header, http.StatusBadRequest)
					return
				}
			}

			// Wrap request body with secure reader if it has content
			if r.Body != nil && r.ContentLength != 0 {
				secureBody := &secureRequestBody{
					original:   r.Body,
					maxSize:    config.MaxBodySize,
					maxTimeout: config.MaxReadTimeout,
					ctx:        r.Context(),
				}
				r.Body = secureBody
			}

			next.ServeHTTP(w, r)
		})
	}
}

// secureRequestBody wraps the original request body with security controls
type secureRequestBody struct {
	original   io.ReadCloser
	maxSize    int64
	maxTimeout time.Duration
	ctx        context.Context
	bytesRead  int64
}

// Read implements io.Reader with security controls
func (srb *secureRequestBody) Read(p []byte) (n int, err error) {
	// Create timeout context
	ctx, cancel := context.WithTimeout(srb.ctx, srb.maxTimeout)
	defer cancel()

	// Channel for read result
	type readResult struct {
		n   int
		err error
	}

	resultChan := make(chan readResult, 1)

	// Perform read in goroutine
	go func() {
		n, err := srb.original.Read(p)
		resultChan <- readResult{n: n, err: err}
	}()

	// Wait for result or timeout
	select {
	case result := <-resultChan:
		// Check size limit
		if srb.bytesRead+int64(result.n) > srb.maxSize {
			return 0, io.ErrUnexpectedEOF
		}

		srb.bytesRead += int64(result.n)
		return result.n, result.err

	case <-ctx.Done():
		return 0, ctx.Err()
	}
}

// Close implements io.Closer
func (srb *secureRequestBody) Close() error {
	return srb.original.Close()
}

// isBlockedMethod checks if HTTP method is blocked
func isBlockedMethod(method string, blockedMethods []string) bool {
	for _, blocked := range blockedMethods {
		if strings.EqualFold(method, blocked) {
			return true
		}
	}
	return false
}

// calculateTotalHeaderSize calculates total size of all headers
func calculateTotalHeaderSize(r *http.Request) int {
	size := 0
	for name, values := range r.Header {
		size += len(name)
		for _, value := range values {
			size += len(value)
		}
	}
	return size
}

// SecureBodyLimit middleware specifically for body size limiting
func SecureBodyLimit(maxSize int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.ContentLength > maxSize {
				http.Error(w, "Request entity too large", http.StatusRequestEntityTooLarge)
				return
			}

			// Wrap body with size-limited reader
			if r.Body != nil {
				r.Body = &sizeLimitedReader{
					reader:  r.Body,
					maxSize: maxSize,
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

// sizeLimitedReader limits the amount of data that can be read
type sizeLimitedReader struct {
	reader    io.ReadCloser
	maxSize   int64
	bytesRead int64
}

func (slr *sizeLimitedReader) Read(p []byte) (n int, err error) {
	if slr.bytesRead >= slr.maxSize {
		return 0, io.ErrUnexpectedEOF
	}

	// Limit read size
	maxRead := slr.maxSize - slr.bytesRead
	if int64(len(p)) > maxRead {
		p = p[:maxRead]
	}

	n, err = slr.reader.Read(p)
	slr.bytesRead += int64(n)

	if slr.bytesRead > slr.maxSize {
		return n, io.ErrUnexpectedEOF
	}

	return n, err
}

func (slr *sizeLimitedReader) Close() error {
	return slr.reader.Close()
}
