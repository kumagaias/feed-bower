package response

import (
	"encoding/json"
	"log"
	"net/http"
)

// APIResponse represents a standard API response
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *APIError   `json:"error,omitempty"`
	Meta    *Meta       `json:"meta,omitempty"`
}

// APIError represents an error in API response
type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// Meta represents metadata for paginated responses
type Meta struct {
	Total    int64  `json:"total,omitempty"`
	Page     int    `json:"page,omitempty"`
	PageSize int    `json:"page_size,omitempty"`
	HasMore  bool   `json:"has_more,omitempty"`
	NextKey  string `json:"next_key,omitempty"`
}

// Success writes a successful JSON response
func Success(w http.ResponseWriter, data interface{}) {
	WriteJSON(w, http.StatusOK, &APIResponse{
		Success: true,
		Data:    data,
	})
}

// SuccessWithMeta writes a successful JSON response with metadata
func SuccessWithMeta(w http.ResponseWriter, data interface{}, meta *Meta) {
	WriteJSON(w, http.StatusOK, &APIResponse{
		Success: true,
		Data:    data,
		Meta:    meta,
	})
}

// Created writes a 201 Created response
func Created(w http.ResponseWriter, data interface{}) {
	WriteJSON(w, http.StatusCreated, &APIResponse{
		Success: true,
		Data:    data,
	})
}

// NoContent writes a 204 No Content response
func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}

// Error writes an error JSON response
func Error(w http.ResponseWriter, statusCode int, code, message string) {
	// Log all 4xx and 5xx errors
	if statusCode >= 500 {
		// 5xx errors: log with more details and stack trace hint
		log.Printf("🚨 HTTP %d Error [%s]: %s (Check handler for detailed error)", statusCode, code, message)
	} else if statusCode >= 400 {
		// 4xx errors: log normally
		log.Printf("⚠️  HTTP %d Error [%s]: %s", statusCode, code, message)
	}

	WriteJSON(w, statusCode, &APIResponse{
		Success: false,
		Error: &APIError{
			Code:    code,
			Message: message,
		},
	})
}

// ErrorWithDetails writes an error JSON response with details
func ErrorWithDetails(w http.ResponseWriter, statusCode int, code, message, details string) {
	// Log all 4xx and 5xx errors with details
	if statusCode >= 500 {
		// 5xx errors: log with full details
		log.Printf("🚨 HTTP %d Error [%s]: %s\n  Details: %s", statusCode, code, message, details)
	} else if statusCode >= 400 {
		// 4xx errors: log with details
		log.Printf("⚠️  HTTP %d Error [%s]: %s - Details: %s", statusCode, code, message, details)
	}

	WriteJSON(w, statusCode, &APIResponse{
		Success: false,
		Error: &APIError{
			Code:    code,
			Message: message,
			Details: details,
		},
	})
}

// BadRequest writes a 400 Bad Request response
func BadRequest(w http.ResponseWriter, message string) {
	Error(w, http.StatusBadRequest, "BAD_REQUEST", message)
}

// Unauthorized writes a 401 Unauthorized response
func Unauthorized(w http.ResponseWriter, message string) {
	Error(w, http.StatusUnauthorized, "UNAUTHORIZED", message)
}

// Forbidden writes a 403 Forbidden response
func Forbidden(w http.ResponseWriter, message string) {
	Error(w, http.StatusForbidden, "FORBIDDEN", message)
}

// NotFound writes a 404 Not Found response
func NotFound(w http.ResponseWriter, message string) {
	Error(w, http.StatusNotFound, "NOT_FOUND", message)
}

// Conflict writes a 409 Conflict response
func Conflict(w http.ResponseWriter, message string) {
	Error(w, http.StatusConflict, "CONFLICT", message)
}

// InternalServerError writes a 500 Internal Server Error response
func InternalServerError(w http.ResponseWriter, message string) {
	Error(w, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", message)
}

// InternalServerErrorWithErr writes a 500 Internal Server Error response with error details
func InternalServerErrorWithErr(w http.ResponseWriter, message string, err error) {
	if err != nil {
		log.Printf("💥 Internal Server Error: %s\n  Error: %v", message, err)
		ErrorWithDetails(w, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", message, err.Error())
	} else {
		InternalServerError(w, message)
	}
}

// ValidationError writes a 422 Unprocessable Entity response for validation errors
func ValidationError(w http.ResponseWriter, message string) {
	Error(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", message)
}

// WriteJSON writes a JSON response with the given status code
func WriteJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("🚨 HTTP 500 Error [ENCODING_ERROR]: Failed to encode JSON response: %v", err)
		// If encoding fails, write a simple error response
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"success":false,"error":{"code":"ENCODING_ERROR","message":"Failed to encode response"}}`))
	}
}
