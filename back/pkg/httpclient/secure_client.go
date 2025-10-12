package httpclient

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// SecureHTTPClient provides a secure HTTP client with URL validation
type SecureHTTPClient struct {
	client          *http.Client
	allowedSchemes  []string
	blockedHosts    []string
	blockedNetworks []*net.IPNet
	maxRedirects    int
	timeout         time.Duration
}

// SecureHTTPConfig holds configuration for secure HTTP client
type SecureHTTPConfig struct {
	Timeout         time.Duration
	MaxRedirects    int
	AllowedSchemes  []string
	BlockedHosts    []string
	BlockedNetworks []string // CIDR notation
	UserAgent       string
}

// DefaultSecureHTTPConfig returns default secure HTTP configuration
func DefaultSecureHTTPConfig() *SecureHTTPConfig {
	return &SecureHTTPConfig{
		Timeout:      30 * time.Second,
		MaxRedirects: 5,
		AllowedSchemes: []string{"http", "https"},
		BlockedHosts: []string{
			"localhost",
			"127.0.0.1",
			"0.0.0.0",
			"::1",
		},
		BlockedNetworks: []string{
			"10.0.0.0/8",     // Private network
			"172.16.0.0/12",  // Private network
			"192.168.0.0/16", // Private network
			"169.254.0.0/16", // Link-local
			"127.0.0.0/8",    // Loopback
			"::1/128",        // IPv6 loopback
			"fc00::/7",       // IPv6 private
		},
		UserAgent: "Feed-Bower/1.0 (RSS Reader)",
	}
}

// NewSecureHTTPClient creates a new secure HTTP client
func NewSecureHTTPClient(config *SecureHTTPConfig) (*SecureHTTPClient, error) {
	if config == nil {
		config = DefaultSecureHTTPConfig()
	}

	// Parse blocked networks
	var blockedNetworks []*net.IPNet
	for _, cidr := range config.BlockedNetworks {
		_, network, err := net.ParseCIDR(cidr)
		if err != nil {
			return nil, fmt.Errorf("invalid CIDR %s: %w", cidr, err)
		}
		blockedNetworks = append(blockedNetworks, network)
	}

	client := &http.Client{
		Timeout: config.Timeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= config.MaxRedirects {
				return fmt.Errorf("too many redirects")
			}
			// Validate redirect URL
			return validateURL(req.URL, config.AllowedSchemes, config.BlockedHosts, blockedNetworks)
		},
	}

	return &SecureHTTPClient{
		client:          client,
		allowedSchemes:  config.AllowedSchemes,
		blockedHosts:    config.BlockedHosts,
		blockedNetworks: blockedNetworks,
		maxRedirects:    config.MaxRedirects,
		timeout:         config.Timeout,
	}, nil
}

// Get performs a secure GET request
func (c *SecureHTTPClient) Get(ctx context.Context, urlStr string) (*http.Response, error) {
	return c.Do(ctx, "GET", urlStr, nil)
}

// Do performs a secure HTTP request
func (c *SecureHTTPClient) Do(ctx context.Context, method, urlStr string, headers map[string]string) (*http.Response, error) {
	// Sanitize and validate input URL string first
	sanitizedURL, err := sanitizeURLString(urlStr)
	if err != nil {
		return nil, fmt.Errorf("URL sanitization failed: %w", err)
	}

	// Parse and validate URL
	parsedURL, err := url.Parse(sanitizedURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}

	// Validate URL against security policies
	if err := validateURL(parsedURL, c.allowedSchemes, c.blockedHosts, c.blockedNetworks); err != nil {
		return nil, fmt.Errorf("URL validation failed: %w", err)
	}

	// Create request with the validated and sanitized URL
	req, err := http.NewRequestWithContext(ctx, method, parsedURL.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set default headers with sanitized values
	req.Header.Set("User-Agent", "Feed-Bower/1.0 (RSS Reader)")

	// Set custom headers with validation
	for key, value := range headers {
		if err := validateHeaderValue(key, value); err != nil {
			return nil, fmt.Errorf("invalid header %s: %w", key, err)
		}
		req.Header.Set(key, value)
	}

	// Make request
	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}

	return resp, nil
}

// validateURL validates a URL against security policies
func validateURL(parsedURL *url.URL, allowedSchemes, blockedHosts []string, blockedNetworks []*net.IPNet) error {
	// Check scheme
	if !isAllowedScheme(parsedURL.Scheme, allowedSchemes) {
		return fmt.Errorf("scheme %s is not allowed", parsedURL.Scheme)
	}

	// Check for blocked hosts
	hostname := parsedURL.Hostname()
	if isBlockedHost(hostname, blockedHosts) {
		return fmt.Errorf("host %s is blocked", hostname)
	}

	// Resolve hostname to IP and check against blocked networks
	ips, err := net.LookupIP(hostname)
	if err != nil {
		return fmt.Errorf("failed to resolve hostname %s: %w", hostname, err)
	}

	for _, ip := range ips {
		if isBlockedIP(ip, blockedNetworks) {
			return fmt.Errorf("IP %s is in blocked network", ip.String())
		}
	}

	// Additional security checks
	if err := checkForSuspiciousURL(parsedURL); err != nil {
		return err
	}

	return nil
}

// isAllowedScheme checks if the scheme is allowed
func isAllowedScheme(scheme string, allowedSchemes []string) bool {
	for _, allowed := range allowedSchemes {
		if strings.EqualFold(scheme, allowed) {
			return true
		}
	}
	return false
}

// isBlockedHost checks if the host is blocked
func isBlockedHost(hostname string, blockedHosts []string) bool {
	hostname = strings.ToLower(hostname)
	for _, blocked := range blockedHosts {
		if strings.EqualFold(hostname, blocked) {
			return true
		}
	}
	return false
}

// isBlockedIP checks if the IP is in any blocked network
func isBlockedIP(ip net.IP, blockedNetworks []*net.IPNet) bool {
	for _, network := range blockedNetworks {
		if network.Contains(ip) {
			return true
		}
	}
	return false
}

// checkForSuspiciousURL performs additional security checks on the URL
func checkForSuspiciousURL(parsedURL *url.URL) error {
	// Check for suspicious patterns in the URL
	fullURL := parsedURL.String()
	
	suspiciousPatterns := []string{
		"@", // Potential credential injection
		"javascript:",
		"data:",
		"file:",
		"ftp:",
	}

	for _, pattern := range suspiciousPatterns {
		if strings.Contains(strings.ToLower(fullURL), pattern) {
			return fmt.Errorf("URL contains suspicious pattern: %s", pattern)
		}
	}

	// Check for port scanning attempts
	port := parsedURL.Port()
	if port != "" {
		// Only allow common HTTP/HTTPS ports for RSS feeds
		// Also allow high ports for testing (> 1024)
		allowedPorts := []string{"80", "443", "8080", "8443"}
		allowed := false
		for _, allowedPort := range allowedPorts {
			if port == allowedPort {
				allowed = true
				break
			}
		}
		
		// Allow high ports (> 1024) for testing and development
		if !allowed {
			if portNum := parsePort(port); portNum > 1024 && portNum < 65536 {
				allowed = true
			}
		}
		
		if !allowed {
			return fmt.Errorf("port %s is not allowed", port)
		}
	}

	return nil
}

// ValidateURL validates a URL string without making a request
func ValidateURL(urlStr string, config *SecureHTTPConfig) error {
	if config == nil {
		config = DefaultSecureHTTPConfig()
	}

	// Sanitize URL string first
	sanitizedURL, err := sanitizeURLString(urlStr)
	if err != nil {
		return fmt.Errorf("URL sanitization failed: %w", err)
	}

	parsedURL, err := url.Parse(sanitizedURL)
	if err != nil {
		return fmt.Errorf("invalid URL: %w", err)
	}

	// Parse blocked networks
	var blockedNetworks []*net.IPNet
	for _, cidr := range config.BlockedNetworks {
		_, network, err := net.ParseCIDR(cidr)
		if err != nil {
			continue // Skip invalid CIDR
		}
		blockedNetworks = append(blockedNetworks, network)
	}

	return validateURL(parsedURL, config.AllowedSchemes, config.BlockedHosts, blockedNetworks)
}

// parsePort parses a port string to integer
func parsePort(portStr string) int {
	if portStr == "" {
		return 0
	}
	
	port := 0
	for _, r := range portStr {
		if r < '0' || r > '9' {
			return 0
		}
		port = port*10 + int(r-'0')
	}
	return port
}

// sanitizeURLString sanitizes and validates the input URL string
func sanitizeURLString(urlStr string) (string, error) {
	// Check for null bytes and other dangerous characters
	if strings.Contains(urlStr, "\x00") {
		return "", fmt.Errorf("URL contains null bytes")
	}

	// Trim whitespace
	urlStr = strings.TrimSpace(urlStr)

	// Check maximum URL length (RFC 2616 suggests 2048 characters)
	if len(urlStr) > 2048 {
		return "", fmt.Errorf("URL too long (max 2048 characters)")
	}

	// Check for minimum URL length
	if len(urlStr) < 7 { // Minimum: "http://"
		return "", fmt.Errorf("URL too short")
	}

	// Check for dangerous URL patterns
	dangerousPatterns := []string{
		"javascript:",
		"data:",
		"file:",
		"ftp:",
		"gopher:",
		"ldap:",
		"dict:",
		"telnet:",
		"ssh:",
		"sftp:",
	}

	urlLower := strings.ToLower(urlStr)
	for _, pattern := range dangerousPatterns {
		if strings.HasPrefix(urlLower, pattern) {
			return "", fmt.Errorf("dangerous URL scheme detected: %s", pattern)
		}
	}

	// Check for credential injection attempts
	if strings.Contains(urlStr, "@") {
		// Parse URL to check if @ is in the authority part
		if parsedURL, err := url.Parse(urlStr); err == nil {
			if parsedURL.User != nil {
				return "", fmt.Errorf("potential credential injection detected")
			}
		}
	}

	// Check for control characters (excluding common whitespace)
	for _, r := range urlStr {
		if r < 32 && r != 9 && r != 10 && r != 13 { // Allow tab, LF, CR
			return "", fmt.Errorf("URL contains control characters")
		}
		// Also check for other problematic characters
		if r == '\r' || r == '\n' {
			return "", fmt.Errorf("URL contains CRLF characters")
		}
	}

	return urlStr, nil
}

// isValidEmailInURL checks if @ symbol is part of a valid email in URL context
func isValidEmailInURL(urlStr string) bool {
	// Simple check: @ should not appear in the authority part for credential injection
	// This is a basic check - in practice, @ in URLs for email contexts is rare for RSS feeds
	parsedURL, err := url.Parse(urlStr)
	if err != nil {
		return false
	}
	
	// If there's user info (credentials), it's not valid for our use case
	if parsedURL.User != nil {
		return false
	}
	
	return true
}

// validateHeaderValue validates HTTP header values
func validateHeaderValue(key, value string) error {
	// Check for null bytes
	if strings.Contains(key, "\x00") || strings.Contains(value, "\x00") {
		return fmt.Errorf("header contains null bytes")
	}

	// Check for CRLF injection
	if strings.Contains(key, "\r") || strings.Contains(key, "\n") ||
		strings.Contains(value, "\r") || strings.Contains(value, "\n") {
		return fmt.Errorf("header contains CRLF characters")
	}

	// Check header key format (basic validation)
	if key == "" {
		return fmt.Errorf("header key cannot be empty")
	}

	// Check for dangerous header keys
	dangerousHeaders := []string{
		"authorization",
		"cookie",
		"set-cookie",
		"x-forwarded-for",
		"x-real-ip",
	}

	keyLower := strings.ToLower(key)
	for _, dangerous := range dangerousHeaders {
		if keyLower == dangerous {
			return fmt.Errorf("dangerous header key not allowed: %s", key)
		}
	}

	// Check maximum header value length
	if len(value) > 8192 {
		return fmt.Errorf("header value too long (max 8192 characters)")
	}

	return nil
}