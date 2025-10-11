package middleware

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRequestSecurity_BlockedMethod(t *testing.T) {
	config := DefaultRequestSecurityConfig()
	middleware := RequestSecurity(config)

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware(testHandler)

	// Test blocked method
	req := httptest.NewRequest("TRACE", "/test", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("Expected status %d, got %d", http.StatusMethodNotAllowed, w.Code)
	}
}

func TestRequestSecurity_URITooLong(t *testing.T) {
	config := DefaultRequestSecurityConfig()
	config.MaxURILength = 10 // Very short for testing

	middleware := RequestSecurity(config)

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware(testHandler)

	// Test long URI
	req := httptest.NewRequest("GET", "/very-long-uri-that-exceeds-limit", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusRequestURITooLong {
		t.Errorf("Expected status %d, got %d", http.StatusRequestURITooLong, w.Code)
	}
}

func TestRequestSecurity_HeadersTooLarge(t *testing.T) {
	config := DefaultRequestSecurityConfig()
	config.MaxHeaderSize = 50 // Very small for testing

	middleware := RequestSecurity(config)

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware(testHandler)

	// Test large headers
	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Large-Header", strings.Repeat("a", 100))
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusRequestHeaderFieldsTooLarge {
		t.Errorf("Expected status %d, got %d", http.StatusRequestHeaderFieldsTooLarge, w.Code)
	}
}

func TestRequestSecurity_RequiredHeaders(t *testing.T) {
	config := DefaultRequestSecurityConfig()
	config.RequiredHeaders = []string{"Authorization"}

	middleware := RequestSecurity(config)

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware(testHandler)

	// Test missing required header
	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	// Test with required header
	req2 := httptest.NewRequest("GET", "/test", nil)
	req2.Header.Set("Authorization", "Bearer token")
	w2 := httptest.NewRecorder()

	handler.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w2.Code)
	}
}

func TestSecureBodyLimit_TooLarge(t *testing.T) {
	middleware := SecureBodyLimit(10) // 10 bytes limit

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Try to read body
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Failed to read body", http.StatusInternalServerError)
			return
		}
		w.Write(body)
	})

	handler := middleware(testHandler)

	// Test body larger than limit
	largeBody := strings.Repeat("a", 20)
	req := httptest.NewRequest("POST", "/test", strings.NewReader(largeBody))
	req.ContentLength = int64(len(largeBody))
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("Expected status %d, got %d", http.StatusRequestEntityTooLarge, w.Code)
	}
}

func TestSecureBodyLimit_WithinLimit(t *testing.T) {
	middleware := SecureBodyLimit(100) // 100 bytes limit

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Failed to read body", http.StatusInternalServerError)
			return
		}
		w.Write(body)
	})

	handler := middleware(testHandler)

	// Test body within limit
	smallBody := "small body"
	req := httptest.NewRequest("POST", "/test", strings.NewReader(smallBody))
	req.ContentLength = int64(len(smallBody))
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if w.Body.String() != smallBody {
		t.Errorf("Expected body '%s', got '%s'", smallBody, w.Body.String())
	}
}

func TestIsBlockedMethod(t *testing.T) {
	blockedMethods := []string{"TRACE", "CONNECT"}

	testCases := []struct {
		method   string
		expected bool
	}{
		{"GET", false},
		{"POST", false},
		{"TRACE", true},
		{"trace", true}, // Case insensitive
		{"CONNECT", true},
		{"connect", true}, // Case insensitive
		{"DELETE", false},
	}

	for _, tc := range testCases {
		result := isBlockedMethod(tc.method, blockedMethods)
		if result != tc.expected {
			t.Errorf("For method %s, expected %v, got %v", tc.method, tc.expected, result)
		}
	}
}

func TestCalculateTotalHeaderSize(t *testing.T) {
	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer token123")

	size := calculateTotalHeaderSize(req)

	expectedSize := len("Content-Type") + len("application/json") +
		len("Authorization") + len("Bearer token123")

	if size != expectedSize {
		t.Errorf("Expected header size %d, got %d", expectedSize, size)
	}
}