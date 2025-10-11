package httpclient

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestNewSecureHTTPClient(t *testing.T) {
	config := DefaultSecureHTTPConfig()
	client, err := NewSecureHTTPClient(config)

	if err != nil {
		t.Fatalf("Failed to create secure HTTP client: %v", err)
	}

	if client == nil {
		t.Fatal("Expected client to be non-nil")
	}
}

func TestValidateURL_ValidURL(t *testing.T) {
	config := DefaultSecureHTTPConfig()
	
	// Use URLs that don't require DNS resolution for testing
	validURLs := []string{
		"https://google.com/feed.xml",
		"http://github.com/rss",
		"https://stackoverflow.com:443/atom.xml",
	}

	for _, url := range validURLs {
		err := ValidateURL(url, config)
		if err != nil {
			t.Errorf("Expected URL %s to be valid, got error: %v", url, err)
		}
	}
}

func TestValidateURL_InvalidScheme(t *testing.T) {
	config := DefaultSecureHTTPConfig()
	
	invalidURLs := []string{
		"ftp://example.com/feed.xml",
		"file:///etc/passwd",
		"javascript:alert('xss')",
		"data:text/html,<script>alert('xss')</script>",
	}

	for _, url := range invalidURLs {
		err := ValidateURL(url, config)
		if err == nil {
			t.Errorf("Expected URL %s to be invalid", url)
		}
	}
}

func TestValidateURL_BlockedHost(t *testing.T) {
	config := DefaultSecureHTTPConfig()
	
	blockedURLs := []string{
		"http://localhost/feed.xml",
		"https://127.0.0.1/rss",
		"http://0.0.0.0:8080/atom.xml",
	}

	for _, url := range blockedURLs {
		err := ValidateURL(url, config)
		if err == nil {
			t.Errorf("Expected URL %s to be blocked", url)
		}
	}
}

func TestValidateURL_InvalidPort(t *testing.T) {
	config := DefaultSecureHTTPConfig()
	
	invalidPortURLs := []string{
		"http://example.com:22/feed.xml",  // SSH port (low port, should be blocked)
		"http://example.com:23/rss",       // Telnet port (low port, should be blocked)
		"http://example.com:21/atom.xml",  // FTP port (low port, should be blocked)
	}

	for _, url := range invalidPortURLs {
		err := ValidateURL(url, config)
		if err == nil {
			t.Errorf("Expected URL %s with invalid port to be blocked", url)
		}
	}
}

func TestValidateURL_SuspiciousPatterns(t *testing.T) {
	config := DefaultSecureHTTPConfig()
	
	suspiciousURLs := []string{
		"http://user:pass@example.com/feed.xml", // Contains credentials
		"javascript:alert('xss')",
		"data:text/html,content",
	}

	for _, url := range suspiciousURLs {
		err := ValidateURL(url, config)
		if err == nil {
			t.Errorf("Expected URL %s with suspicious pattern to be blocked", url)
		}
	}
}

func TestSecureHTTPClient_Get(t *testing.T) {
	// Create test server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/xml")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`<?xml version="1.0"?><rss><channel><title>Test Feed</title></channel></rss>`))
	}))
	defer server.Close()

	// Create secure client with relaxed restrictions for testing
	config := DefaultSecureHTTPConfig()
	// Allow localhost and private networks for testing
	config.BlockedHosts = []string{}
	config.BlockedNetworks = []string{}
	
	client, err := NewSecureHTTPClient(config)
	if err != nil {
		t.Fatalf("Failed to create secure client: %v", err)
	}

	// Make request
	ctx := context.Background()
	resp, err := client.Get(ctx, server.URL)
	if err != nil {
		t.Fatalf("Failed to make request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}
}

func TestSecureHTTPClient_BlockedRequest(t *testing.T) {
	config := DefaultSecureHTTPConfig()
	client, err := NewSecureHTTPClient(config)
	if err != nil {
		t.Fatalf("Failed to create secure client: %v", err)
	}

	// Try to make request to blocked host
	ctx := context.Background()
	_, err = client.Get(ctx, "http://localhost:8080/feed.xml")
	if err == nil {
		t.Error("Expected request to localhost to be blocked")
	}
}

func TestSecureHTTPClient_Timeout(t *testing.T) {
	// Create server that delays response
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(2 * time.Second)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	// Create client with short timeout
	config := DefaultSecureHTTPConfig()
	config.Timeout = 100 * time.Millisecond
	config.BlockedHosts = []string{} // Allow localhost for testing
	config.BlockedNetworks = []string{}
	
	client, err := NewSecureHTTPClient(config)
	if err != nil {
		t.Fatalf("Failed to create secure client: %v", err)
	}

	// Make request that should timeout
	ctx := context.Background()
	_, err = client.Get(ctx, server.URL)
	if err == nil {
		t.Error("Expected request to timeout")
	}
}

func TestIsAllowedScheme(t *testing.T) {
	allowedSchemes := []string{"http", "https"}

	testCases := []struct {
		scheme   string
		expected bool
	}{
		{"http", true},
		{"https", true},
		{"HTTP", true},  // Case insensitive
		{"HTTPS", true}, // Case insensitive
		{"ftp", false},
		{"file", false},
		{"javascript", false},
	}

	for _, tc := range testCases {
		result := isAllowedScheme(tc.scheme, allowedSchemes)
		if result != tc.expected {
			t.Errorf("For scheme %s, expected %v, got %v", tc.scheme, tc.expected, result)
		}
	}
}

func TestIsBlockedHost(t *testing.T) {
	blockedHosts := []string{"localhost", "127.0.0.1", "example.com"}

	testCases := []struct {
		hostname string
		expected bool
	}{
		{"localhost", true},
		{"127.0.0.1", true},
		{"example.com", true},
		{"LOCALHOST", true}, // Case insensitive
		{"google.com", false},
		{"sub.example.com", false}, // Subdomain not blocked
	}

	for _, tc := range testCases {
		result := isBlockedHost(tc.hostname, blockedHosts)
		if result != tc.expected {
			t.Errorf("For hostname %s, expected %v, got %v", tc.hostname, tc.expected, result)
		}
	}
}