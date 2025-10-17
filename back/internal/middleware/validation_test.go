package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRequestValidation_AllowedMethod(t *testing.T) {
	middleware := RequestValidation(DefaultValidationConfig())

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware(testHandler)

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}
}

func TestRequestValidation_DisallowedMethod(t *testing.T) {
	middleware := RequestValidation(DefaultValidationConfig())

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware(testHandler)

	req := httptest.NewRequest("TRACE", "/test", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("Expected status %d, got %d", http.StatusMethodNotAllowed, w.Code)
	}
}

func TestRequestValidation_URITooLong(t *testing.T) {
	config := DefaultValidationConfig()
	config.MaxURILength = 10 // Very short limit for testing

	middleware := RequestValidation(config)

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware(testHandler)

	req := httptest.NewRequest("GET", "/this-is-a-very-long-uri-that-exceeds-the-limit", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusRequestURITooLong {
		t.Errorf("Expected status %d, got %d", http.StatusRequestURITooLong, w.Code)
	}
}

func TestRequestValidation_BlockedUserAgent(t *testing.T) {
	middleware := RequestValidation(DefaultValidationConfig())

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware(testHandler)

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("User-Agent", "Googlebot/2.1")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("Expected status %d, got %d", http.StatusForbidden, w.Code)
	}
}

func TestRequestValidation_BlockedPath(t *testing.T) {
	middleware := RequestValidation(DefaultValidationConfig())

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware(testHandler)

	req := httptest.NewRequest("GET", "/.env", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status %d, got %d", http.StatusNotFound, w.Code)
	}
}

func TestRequestValidation_SuspiciousPattern(t *testing.T) {
	middleware := RequestValidation(DefaultValidationConfig())

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware(testHandler)

	req := httptest.NewRequest("GET", "/test/<script>alert", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestContainsSuspiciousPatterns(t *testing.T) {
	testCases := []struct {
		path     string
		expected bool
	}{
		{"/normal/path", false},
		{"/path/with/../traversal", true},
		{"/path/with/<script>", true},
		{"/path/with/javascript:", true},
		{"/path/with/union select", true},
		{"/safe/path/123", false},
	}

	for _, tc := range testCases {
		result := containsSuspiciousPatterns(tc.path)
		if result != tc.expected {
			t.Errorf("For path '%s', expected %v, got %v", tc.path, tc.expected, result)
		}
	}
}

func TestCalculateHeaderSize(t *testing.T) {
	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer token123")
	req.Header.Set("Content-Type", "application/json")

	size := calculateHeaderSize(req)

	// Should be sum of header names and values
	expectedSize := len("Authorization") + len("Bearer token123") + len("Content-Type") + len("application/json")
	if size != expectedSize {
		t.Errorf("Expected header size %d, got %d", expectedSize, size)
	}
}
