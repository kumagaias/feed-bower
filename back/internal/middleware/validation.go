package middleware

import (
	"net/http"
	"regexp"
	"strings"
)

// ValidationConfig holds validation middleware configuration
type ValidationConfig struct {
	MaxHeaderSize    int      // Maximum size for headers
	MaxURILength     int      // Maximum URI length
	AllowedMethods   []string // Allowed HTTP methods
	BlockedUserAgent []string // Blocked user agent patterns
	BlockedPaths     []string // Blocked path patterns
}

// DefaultValidationConfig returns default validation configuration
func DefaultValidationConfig() *ValidationConfig {
	return &ValidationConfig{
		MaxHeaderSize:  8192, // 8KB
		MaxURILength:   2048, // 2KB
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"},
		BlockedUserAgent: []string{
			"(?i)bot",
			"(?i)crawler",
			"(?i)spider",
			"(?i)scraper",
		},
		BlockedPaths: []string{
			"(?i)/\\.env",
			"(?i)/\\.git",
			"(?i)/admin",
			"(?i)/wp-admin",
			"(?i)/phpmyadmin",
		},
	}
}

// RequestValidation middleware validates incoming requests
func RequestValidation(config *ValidationConfig) func(http.Handler) http.Handler {
	if config == nil {
		config = DefaultValidationConfig()
	}

	// Compile regex patterns
	var userAgentPatterns []*regexp.Regexp
	for _, pattern := range config.BlockedUserAgent {
		if re, err := regexp.Compile(pattern); err == nil {
			userAgentPatterns = append(userAgentPatterns, re)
		}
	}

	var pathPatterns []*regexp.Regexp
	for _, pattern := range config.BlockedPaths {
		if re, err := regexp.Compile(pattern); err == nil {
			pathPatterns = append(pathPatterns, re)
		}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Validate HTTP method
			if !isAllowedMethod(r.Method, config.AllowedMethods) {
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
				return
			}

			// Validate URI length
			if len(r.RequestURI) > config.MaxURILength {
				http.Error(w, "URI too long", http.StatusRequestURITooLong)
				return
			}

			// Validate header size
			headerSize := calculateHeaderSize(r)
			if headerSize > config.MaxHeaderSize {
				http.Error(w, "Request header too large", http.StatusRequestHeaderFieldsTooLarge)
				return
			}

			// Check blocked user agents
			userAgent := r.Header.Get("User-Agent")
			for _, pattern := range userAgentPatterns {
				if pattern.MatchString(userAgent) {
					http.Error(w, "Forbidden", http.StatusForbidden)
					return
				}
			}

			// Check blocked paths
			for _, pattern := range pathPatterns {
				if pattern.MatchString(r.URL.Path) {
					http.Error(w, "Not found", http.StatusNotFound)
					return
				}
			}

			// Validate for common attack patterns in URL
			if containsSuspiciousPatterns(r.URL.Path) {
				http.Error(w, "Bad request", http.StatusBadRequest)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// isAllowedMethod checks if the HTTP method is allowed
func isAllowedMethod(method string, allowed []string) bool {
	for _, allowedMethod := range allowed {
		if method == allowedMethod {
			return true
		}
	}
	return false
}

// calculateHeaderSize calculates the total size of request headers
func calculateHeaderSize(r *http.Request) int {
	size := 0
	for name, values := range r.Header {
		size += len(name)
		for _, value := range values {
			size += len(value)
		}
	}
	return size
}

// containsSuspiciousPatterns checks for common attack patterns
func containsSuspiciousPatterns(path string) bool {
	suspiciousPatterns := []string{
		"../",
		"..\\",
		"<script",
		"javascript:",
		"vbscript:",
		"onload=",
		"onerror=",
		"eval(",
		"alert(",
		"document.cookie",
		"union select",
		"drop table",
		"insert into",
		"delete from",
		"update set",
	}

	lowerPath := strings.ToLower(path)
	for _, pattern := range suspiciousPatterns {
		if strings.Contains(lowerPath, pattern) {
			return true
		}
	}

	return false
}
