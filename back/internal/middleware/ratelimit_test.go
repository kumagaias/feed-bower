package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestRateLimiter_Allow(t *testing.T) {
	limiter := NewRateLimiter(2, time.Second) // 2 requests per second

	// First request should be allowed
	if !limiter.Allow("test-key") {
		t.Error("Expected first request to be allowed")
	}

	// Second request should be allowed
	if !limiter.Allow("test-key") {
		t.Error("Expected second request to be allowed")
	}

	// Third request should be denied (rate limit exceeded)
	if limiter.Allow("test-key") {
		t.Error("Expected third request to be denied")
	}
}

func TestRateLimiter_DifferentKeys(t *testing.T) {
	limiter := NewRateLimiter(1, time.Second) // 1 request per second

	// First key should be allowed
	if !limiter.Allow("key1") {
		t.Error("Expected request for key1 to be allowed")
	}

	// Different key should also be allowed
	if !limiter.Allow("key2") {
		t.Error("Expected request for key2 to be allowed")
	}

	// Same keys should be denied
	if limiter.Allow("key1") {
		t.Error("Expected second request for key1 to be denied")
	}

	if limiter.Allow("key2") {
		t.Error("Expected second request for key2 to be denied")
	}
}

func TestRateLimit_Middleware(t *testing.T) {
	limiter := NewRateLimiter(1, time.Second)
	middleware := RateLimit(limiter, IPBasedKeyFunc)

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware(testHandler)

	// First request should succeed
	req1 := httptest.NewRequest("GET", "/test", nil)
	req1.RemoteAddr = "192.168.1.1:12345"
	w1 := httptest.NewRecorder()

	handler.ServeHTTP(w1, req1)

	if w1.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w1.Code)
	}

	// Second request from same IP should be rate limited
	req2 := httptest.NewRequest("GET", "/test", nil)
	req2.RemoteAddr = "192.168.1.1:12346" // Same IP, different port
	w2 := httptest.NewRecorder()

	handler.ServeHTTP(w2, req2)

	if w2.Code != http.StatusTooManyRequests {
		t.Errorf("Expected status %d, got %d", http.StatusTooManyRequests, w2.Code)
	}
}

func TestIPBasedKeyFunc(t *testing.T) {
	// Test with X-Forwarded-For header
	req1 := httptest.NewRequest("GET", "/test", nil)
	req1.Header.Set("X-Forwarded-For", "203.0.113.1")
	req1.RemoteAddr = "192.168.1.1:12345"

	key1 := IPBasedKeyFunc(req1)
	if key1 != "203.0.113.1" {
		t.Errorf("Expected key '203.0.113.1', got '%s'", key1)
	}

	// Test with X-Real-IP header
	req2 := httptest.NewRequest("GET", "/test", nil)
	req2.Header.Set("X-Real-IP", "203.0.113.2")
	req2.RemoteAddr = "192.168.1.1:12345"

	key2 := IPBasedKeyFunc(req2)
	if key2 != "203.0.113.2" {
		t.Errorf("Expected key '203.0.113.2', got '%s'", key2)
	}

	// Test with RemoteAddr fallback
	req3 := httptest.NewRequest("GET", "/test", nil)
	req3.RemoteAddr = "192.168.1.1:12345"

	key3 := IPBasedKeyFunc(req3)
	if key3 != "192.168.1.1" {
		t.Errorf("Expected key '192.168.1.1', got '%s'", key3)
	}
}