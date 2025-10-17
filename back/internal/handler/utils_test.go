package handler

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestParseJSONBodySecure_ValidJSON(t *testing.T) {
	type testStruct struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	}

	jsonData := `{"name":"test","email":"test@example.com"}`
	req := httptest.NewRequest("POST", "/test", strings.NewReader(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	var result testStruct
	success := ParseJSONBodySecure(w, req, &result)

	if !success {
		t.Error("Expected parsing to succeed")
	}

	if result.Name != "test" {
		t.Errorf("Expected name 'test', got '%s'", result.Name)
	}

	if result.Email != "test@example.com" {
		t.Errorf("Expected email 'test@example.com', got '%s'", result.Email)
	}
}

func TestParseJSONBodySecure_TooLarge(t *testing.T) {
	// Create a JSON payload larger than 1MB
	largeData := strings.Repeat("a", 1024*1024+1)
	jsonData := `{"data":"` + largeData + `"}`

	req := httptest.NewRequest("POST", "/test", strings.NewReader(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	var result map[string]interface{}
	success := ParseJSONBodySecure(w, req, &result)

	if success {
		t.Error("Expected parsing to fail for large payload")
	}

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestParseJSONBodySecure_InvalidContentType(t *testing.T) {
	jsonData := `{"name":"test"}`
	req := httptest.NewRequest("POST", "/test", strings.NewReader(jsonData))
	req.Header.Set("Content-Type", "text/plain")
	w := httptest.NewRecorder()

	var result map[string]interface{}
	success := ParseJSONBodySecure(w, req, &result)

	if success {
		t.Error("Expected parsing to fail for invalid content type")
	}

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestParseJSONBodySecure_InvalidJSON(t *testing.T) {
	jsonData := `{"name":"test",}`
	req := httptest.NewRequest("POST", "/test", strings.NewReader(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	var result map[string]interface{}
	success := ParseJSONBodySecure(w, req, &result)

	if success {
		t.Error("Expected parsing to fail for invalid JSON")
	}

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestSecureJSONParser_ValidateJSONDepth(t *testing.T) {
	parser := &SecureJSONParser{
		MaxBodySize: 1024,
		MaxDepth:    3,
	}

	// Valid depth (2 levels)
	validJSON := `{"level1":{"level2":"value"}}`
	if !parser.validateJSONDepth([]byte(validJSON)) {
		t.Error("Expected valid JSON depth to pass")
	}

	// Invalid depth (4 levels, exceeds limit of 3)
	invalidJSON := `{"level1":{"level2":{"level3":{"level4":"value"}}}}`
	if parser.validateJSONDepth([]byte(invalidJSON)) {
		t.Error("Expected invalid JSON depth to fail")
	}
}

func TestSanitizeInput_SanitizeString(t *testing.T) {
	sanitizer := DefaultSanitizer()

	// Test with control characters
	input := "test\x00\x01string"
	expected := "teststring"
	result := sanitizer.SanitizeString(input)

	if result != expected {
		t.Errorf("Expected '%s', got '%s'", expected, result)
	}

	// Test with valid characters
	input = "Hello World 123!"
	result = sanitizer.SanitizeString(input)

	if result != input {
		t.Errorf("Expected '%s', got '%s'", input, result)
	}
}

func TestSanitizeInput_ValidateStringLength(t *testing.T) {
	sanitizer := DefaultSanitizer()

	// Valid length
	if !sanitizer.ValidateStringLength("test", 1, 10) {
		t.Error("Expected valid length to pass")
	}

	// Too short
	if sanitizer.ValidateStringLength("", 1, 10) {
		t.Error("Expected too short string to fail")
	}

	// Too long
	if sanitizer.ValidateStringLength("this is too long", 1, 10) {
		t.Error("Expected too long string to fail")
	}
}

func TestSecureBodyReader_ReadBody(t *testing.T) {
	reader := DefaultSecureBodyReader()

	// Test normal body reading
	body := "test body content"
	req := httptest.NewRequest("POST", "/test", strings.NewReader(body))

	result, err := reader.ReadBody(req)
	if err != nil {
		t.Fatalf("Failed to read body: %v", err)
	}

	if string(result) != body {
		t.Errorf("Expected body '%s', got '%s'", body, string(result))
	}
}

func TestSecureBodyReader_TooLarge(t *testing.T) {
	reader := &SecureBodyReader{
		MaxSize:     10, // Very small limit
		MaxReadTime: 5 * time.Second,
	}

	// Create body larger than limit
	largeBody := strings.Repeat("a", 20)
	req := httptest.NewRequest("POST", "/test", strings.NewReader(largeBody))

	_, err := reader.ReadBody(req)
	if err == nil {
		t.Error("Expected error for large body")
	}

	if !strings.Contains(err.Error(), "exceeds maximum size") {
		t.Errorf("Expected size error, got: %v", err)
	}
}

func TestSecureBodyReader_Timeout(t *testing.T) {
	reader := &SecureBodyReader{
		MaxSize:     1024,
		MaxReadTime: 1 * time.Millisecond, // Very short timeout
	}

	// Create a slow reader
	slowReader := &slowReader{data: "test", delay: 100 * time.Millisecond}
	req := httptest.NewRequest("POST", "/test", slowReader)

	_, err := reader.ReadBody(req)
	if err == nil {
		t.Error("Expected timeout error")
	}

	if !strings.Contains(err.Error(), "timeout") {
		t.Errorf("Expected timeout error, got: %v", err)
	}
}

func TestParseJSONBodyWithTimeout_Success(t *testing.T) {
	jsonData := `{"name":"test","value":123}`
	req := httptest.NewRequest("POST", "/test", strings.NewReader(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	var result map[string]interface{}
	success := ParseJSONBodyWithTimeout(w, req, &result, 5*time.Second)

	if !success {
		t.Error("Expected parsing to succeed")
	}

	if result["name"] != "test" {
		t.Errorf("Expected name 'test', got %v", result["name"])
	}
}

func TestParseJSONBodyWithTimeout_Timeout(t *testing.T) {
	// Create a slow reader
	slowReader := &slowReader{data: `{"test":"data"}`, delay: 100 * time.Millisecond}
	req := httptest.NewRequest("POST", "/test", slowReader)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	var result map[string]interface{}
	success := ParseJSONBodyWithTimeout(w, req, &result, 1*time.Millisecond)

	if success {
		t.Error("Expected parsing to fail due to timeout")
	}

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

// slowReader simulates a slow network connection
type slowReader struct {
	data  string
	delay time.Duration
	pos   int
}

func (sr *slowReader) Read(p []byte) (n int, err error) {
	if sr.pos >= len(sr.data) {
		return 0, io.EOF
	}

	// Simulate slow reading
	time.Sleep(sr.delay)

	// Read one byte at a time to make it slow
	p[0] = sr.data[sr.pos]
	sr.pos++
	return 1, nil
}

func (sr *slowReader) Close() error {
	return nil
}
