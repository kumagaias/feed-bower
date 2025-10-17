package middleware

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"feed-bower-api/internal/model"
)

// RateLimiter implements a simple token bucket rate limiter
type RateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*bucket
	rate    int           // requests per window
	window  time.Duration // time window
	cleanup time.Duration // cleanup interval
}

type bucket struct {
	tokens   int
	lastSeen time.Time
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(rate int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		buckets: make(map[string]*bucket),
		rate:    rate,
		window:  window,
		cleanup: window * 2, // cleanup old buckets every 2 windows
	}

	// Start cleanup goroutine
	go rl.cleanupLoop()

	return rl
}

// Allow checks if a request from the given key is allowed
func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	b, exists := rl.buckets[key]

	if !exists {
		// First request from this key
		rl.buckets[key] = &bucket{
			tokens:   rl.rate - 1,
			lastSeen: now,
		}
		return true
	}

	// Calculate tokens to add based on time elapsed
	elapsed := now.Sub(b.lastSeen)
	tokensToAdd := int(elapsed / rl.window * time.Duration(rl.rate))

	if tokensToAdd > 0 {
		b.tokens = min(rl.rate, b.tokens+tokensToAdd)
		b.lastSeen = now
	}

	if b.tokens > 0 {
		b.tokens--
		return true
	}

	return false
}

// cleanupLoop removes old buckets to prevent memory leaks
func (rl *RateLimiter) cleanupLoop() {
	ticker := time.NewTicker(rl.cleanup)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for key, bucket := range rl.buckets {
			if now.Sub(bucket.lastSeen) > rl.cleanup {
				delete(rl.buckets, key)
			}
		}
		rl.mu.Unlock()
	}
}

// RateLimit middleware for HTTP requests
func RateLimit(limiter *RateLimiter, keyFunc func(*http.Request) string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := keyFunc(r)
			if !limiter.Allow(key) {
				http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// IPBasedKeyFunc returns a key function that uses client IP
func IPBasedKeyFunc(r *http.Request) string {
	// Try to get real IP from headers (for proxy/load balancer scenarios)
	if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
		return ip
	}
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return ip
	}

	// Extract IP from RemoteAddr (remove port)
	addr := r.RemoteAddr
	if idx := strings.LastIndex(addr, ":"); idx != -1 {
		return addr[:idx]
	}
	return addr
}

// UserBasedKeyFunc returns a key function that uses user ID from context
func UserBasedKeyFunc(r *http.Request) string {
	if user, ok := r.Context().Value(UserKey).(*model.User); ok && user != nil {
		return "user:" + user.UserID
	}
	// Fallback to IP if no user context
	return IPBasedKeyFunc(r)
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
