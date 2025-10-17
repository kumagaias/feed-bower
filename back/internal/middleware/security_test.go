package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSecurity_DefaultHeaders(t *testing.T) {
	middleware := Security(DefaultSecurityConfig())

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware(testHandler)

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	// Check security headers
	expectedHeaders := map[string]string{
		"Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'",
		"X-Frame-Options":         "DENY",
		"X-Content-Type-Options":  "nosniff",
		"Referrer-Policy":         "strict-origin-when-cross-origin",
		"X-XSS-Protection":        "1; mode=block",
	}

	for header, expectedValue := range expectedHeaders {
		actualValue := w.Header().Get(header)
		if actualValue != expectedValue {
			t.Errorf("Expected header %s to be '%s', got '%s'", header, expectedValue, actualValue)
		}
	}
}

func TestNoCache_Headers(t *testing.T) {
	middleware := NoCache()

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware(testHandler)

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	// Check no-cache headers
	expectedHeaders := map[string]string{
		"Cache-Control": "no-cache, no-store, must-revalidate",
		"Pragma":        "no-cache",
		"Expires":       "0",
	}

	for header, expectedValue := range expectedHeaders {
		actualValue := w.Header().Get(header)
		if actualValue != expectedValue {
			t.Errorf("Expected header %s to be '%s', got '%s'", header, expectedValue, actualValue)
		}
	}
}

func TestSecureHeaders_Combined(t *testing.T) {
	middleware := SecureHeaders()

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware(testHandler)

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	// Check that both security and no-cache headers are present
	if w.Header().Get("X-Frame-Options") == "" {
		t.Error("Expected X-Frame-Options header to be present")
	}

	if w.Header().Get("Cache-Control") == "" {
		t.Error("Expected Cache-Control header to be present")
	}
}
