package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"feed-bower-api/internal/middleware"
	"feed-bower-api/internal/model"
	"feed-bower-api/pkg/response"
)

// GetUserFromContext extracts the user from request context
func GetUserFromContext(ctx context.Context) (*model.User, bool) {
	user, ok := ctx.Value(middleware.UserKey).(*model.User)
	return user, ok
}

// GetRequiredUserFromContext extracts the user from context and returns error if not found
func GetRequiredUserFromContext(w http.ResponseWriter, r *http.Request) (*model.User, bool) {
	user, ok := GetUserFromContext(r.Context())
	if !ok || user == nil {
		response.Unauthorized(w, "Authentication required")
		return nil, false
	}
	return user, true
}

// ParseJSONBody parses JSON request body into the provided struct with security controls
func ParseJSONBody(w http.ResponseWriter, r *http.Request, dest interface{}) bool {
	if r.Header.Get("Content-Type") != "application/json" {
		response.BadRequest(w, "Content-Type must be application/json")
		return false
	}

	// Limit request body size to prevent DoS attacks (1MB limit)
	const maxBodySize = 1 << 20 // 1MB

	// Create a limited reader to prevent reading too much data
	limitedReader := io.LimitReader(r.Body, maxBodySize+1) // +1 to detect if size exceeded
	defer r.Body.Close()

	// Read body with size limit
	body, err := io.ReadAll(limitedReader)
	if err != nil {
		response.BadRequest(w, "Failed to read request body: "+err.Error())
		return false
	}

	// Check if body size exceeds limit
	if len(body) > maxBodySize {
		response.BadRequest(w, "Request body too large (max 1MB)")
		return false
	}

	// Parse JSON from the read body
	if err := json.Unmarshal(body, dest); err != nil {
		response.BadRequest(w, "Invalid JSON format: "+err.Error())
		return false
	}

	return true
}

// GetQueryParam gets a query parameter with a default value
func GetQueryParam(r *http.Request, key, defaultValue string) string {
	value := r.URL.Query().Get(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// GetQueryParamInt gets an integer query parameter with a default value
func GetQueryParamInt(r *http.Request, key string, defaultValue int) int {
	value := r.URL.Query().Get(key)
	if value == "" {
		return defaultValue
	}

	intValue, err := strconv.Atoi(value)
	if err != nil {
		return defaultValue
	}

	return intValue
}

// GetQueryParamInt32 gets an int32 query parameter with a default value
func GetQueryParamInt32(r *http.Request, key string, defaultValue int32) int32 {
	value := r.URL.Query().Get(key)
	if value == "" {
		return defaultValue
	}

	intValue, err := strconv.ParseInt(value, 10, 32)
	if err != nil {
		return defaultValue
	}

	return int32(intValue)
}

// GetQueryParamBool gets a boolean query parameter with a default value
func GetQueryParamBool(r *http.Request, key string, defaultValue bool) bool {
	value := r.URL.Query().Get(key)
	if value == "" {
		return defaultValue
	}

	boolValue, err := strconv.ParseBool(value)
	if err != nil {
		return defaultValue
	}

	return boolValue
}

// SecureJSONParser provides secure JSON parsing with configurable limits
type SecureJSONParser struct {
	MaxBodySize int64 // Maximum request body size in bytes
	MaxDepth    int   // Maximum JSON nesting depth
}

// DefaultSecureJSONParser returns a parser with sensible security defaults
func DefaultSecureJSONParser() *SecureJSONParser {
	return &SecureJSONParser{
		MaxBodySize: 1 << 20, // 1MB
		MaxDepth:    32,      // Maximum nesting depth
	}
}

// ParseSecureJSON parses JSON with enhanced security controls
func (p *SecureJSONParser) ParseSecureJSON(w http.ResponseWriter, r *http.Request, dest interface{}) bool {
	if r.Header.Get("Content-Type") != "application/json" {
		response.BadRequest(w, "Content-Type must be application/json")
		return false
	}

	// Create a limited reader to prevent reading too much data
	limitedReader := io.LimitReader(r.Body, p.MaxBodySize+1) // +1 to detect if size exceeded
	defer r.Body.Close()

	// Read body with size limit
	body, err := io.ReadAll(limitedReader)
	if err != nil {
		response.BadRequest(w, "Failed to read request body: "+err.Error())
		return false
	}

	// Check if body size exceeds limit
	if int64(len(body)) > p.MaxBodySize {
		response.BadRequest(w, "Request body too large")
		return false
	}

	// Validate JSON structure depth to prevent stack overflow attacks
	if !p.validateJSONDepth(body) {
		response.BadRequest(w, "JSON nesting too deep")
		return false
	}

	// Parse JSON from the read body
	if err := json.Unmarshal(body, dest); err != nil {
		response.BadRequest(w, "Invalid JSON format: "+err.Error())
		return false
	}

	return true
}

// validateJSONDepth checks if JSON nesting depth is within limits
func (p *SecureJSONParser) validateJSONDepth(data []byte) bool {
	depth := 0
	maxDepth := 0
	inString := false
	escaped := false

	for _, b := range data {
		if escaped {
			escaped = false
			continue
		}

		switch b {
		case '\\':
			if inString {
				escaped = true
			}
		case '"':
			inString = !inString
		case '{', '[':
			if !inString {
				depth++
				if depth > maxDepth {
					maxDepth = depth
				}
				if maxDepth > p.MaxDepth {
					return false
				}
			}
		case '}', ']':
			if !inString {
				depth--
			}
		}
	}

	return true
}

// ParseJSONBodySecure parses JSON request body with enhanced security controls
func ParseJSONBodySecure(w http.ResponseWriter, r *http.Request, dest interface{}) bool {
	parser := DefaultSecureJSONParser()
	return parser.ParseSecureJSON(w, r, dest)
}

// ParseJSONBodyWithLimits parses JSON with custom size and depth limits
func ParseJSONBodyWithLimits(w http.ResponseWriter, r *http.Request, dest interface{}, maxSize int64, maxDepth int) bool {
	parser := &SecureJSONParser{
		MaxBodySize: maxSize,
		MaxDepth:    maxDepth,
	}
	return parser.ParseSecureJSON(w, r, dest)
}

// SanitizeInput provides input sanitization utilities
type SanitizeInput struct{}

// SanitizeString removes potentially dangerous characters from string input
func (s *SanitizeInput) SanitizeString(input string) string {
	// Remove null bytes and control characters
	sanitized := ""
	for _, r := range input {
		if r >= 32 && r != 127 { // Printable ASCII characters only
			sanitized += string(r)
		}
	}
	return sanitized
}

// ValidateStringLength checks if string length is within acceptable bounds
func (s *SanitizeInput) ValidateStringLength(input string, minLen, maxLen int) bool {
	length := len(input)
	return length >= minLen && length <= maxLen
}

// DefaultSanitizer returns a default input sanitizer
func DefaultSanitizer() *SanitizeInput {
	return &SanitizeInput{}
}

// SecureBodyReader provides secure reading of HTTP request bodies
type SecureBodyReader struct {
	MaxSize     int64
	MaxReadTime time.Duration
}

// DefaultSecureBodyReader returns a secure body reader with default settings
func DefaultSecureBodyReader() *SecureBodyReader {
	return &SecureBodyReader{
		MaxSize:     1 << 20,          // 1MB
		MaxReadTime: 10 * time.Second, // 10 seconds max read time
	}
}

// ReadBody safely reads an HTTP request body with size and time limits
func (sbr *SecureBodyReader) ReadBody(r *http.Request) ([]byte, error) {
	if r.Body == nil {
		return nil, fmt.Errorf("request body is nil")
	}

	// Create context with timeout for reading
	ctx, cancel := context.WithTimeout(r.Context(), sbr.MaxReadTime)
	defer cancel()

	// Create a channel to handle the read operation
	type readResult struct {
		data []byte
		err  error
	}

	resultChan := make(chan readResult, 1)

	// Perform the read operation in a goroutine
	go func() {
		defer r.Body.Close()

		// Create limited reader
		limitedReader := io.LimitReader(r.Body, sbr.MaxSize+1)

		// Read the body
		data, err := io.ReadAll(limitedReader)

		resultChan <- readResult{data: data, err: err}
	}()

	// Wait for either completion or timeout
	select {
	case result := <-resultChan:
		if result.err != nil {
			return nil, fmt.Errorf("failed to read body: %w", result.err)
		}

		// Check size limit
		if int64(len(result.data)) > sbr.MaxSize {
			return nil, fmt.Errorf("request body exceeds maximum size of %d bytes", sbr.MaxSize)
		}

		return result.data, nil

	case <-ctx.Done():
		return nil, fmt.Errorf("request body read timeout exceeded")
	}
}

// ParseJSONBodyWithTimeout parses JSON with timeout protection
func ParseJSONBodyWithTimeout(w http.ResponseWriter, r *http.Request, dest interface{}, timeout time.Duration) bool {
	if r.Header.Get("Content-Type") != "application/json" {
		response.BadRequest(w, "Content-Type must be application/json")
		return false
	}

	reader := &SecureBodyReader{
		MaxSize:     1 << 20, // 1MB
		MaxReadTime: timeout,
	}

	body, err := reader.ReadBody(r)
	if err != nil {
		if strings.Contains(err.Error(), "timeout") {
			response.BadRequest(w, "Request processing timeout")
			return false
		}
		if strings.Contains(err.Error(), "exceeds maximum size") {
			response.BadRequest(w, "Request body too large")
			return false
		}
		response.BadRequest(w, "Failed to read request body")
		return false
	}

	// Parse JSON
	if err := json.Unmarshal(body, dest); err != nil {
		response.BadRequest(w, "Invalid JSON format: "+err.Error())
		return false
	}

	return true
}
