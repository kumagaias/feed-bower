package handler

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
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