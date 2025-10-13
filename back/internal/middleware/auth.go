package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"feed-bower-api/internal/service"
)

// AuthConfig holds authentication configuration
type AuthConfig struct {
	AuthService service.AuthService
	SkipPaths   []string // Paths that don't require authentication
}

// UserContextKey is the key for storing user in context
type UserContextKey string

const (
	UserKey UserContextKey = "user"
)

// Auth middleware for JWT token validation
func Auth(config *AuthConfig) func(http.Handler) http.Handler {
	if config == nil || config.AuthService == nil {
		panic("AuthService is required for Auth middleware")
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Check if path should skip authentication
			if shouldSkipAuth(r.URL.Path, config.SkipPaths) {
				// Debug log
				// fmt.Printf("Skipping auth for path: %s\n", r.URL.Path)
				next.ServeHTTP(w, r)
				return
			}

			// Extract token from Authorization header
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				writeErrorResponse(w, http.StatusUnauthorized, "Authorization header is required")
				return
			}

			// Check Bearer token format
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				writeErrorResponse(w, http.StatusUnauthorized, "Invalid authorization header format")
				return
			}

			token := parts[1]
			if token == "" {
				writeErrorResponse(w, http.StatusUnauthorized, "Token is required")
				return
			}

			// Validate token
			user, err := config.AuthService.ValidateToken(r.Context(), token)
			if err != nil {
				writeErrorResponse(w, http.StatusUnauthorized, "Invalid or expired token")
				return
			}

			// Add user to request context
			ctx := context.WithValue(r.Context(), UserKey, user)
			r = r.WithContext(ctx)

			next.ServeHTTP(w, r)
		})
	}
}

// OptionalAuth middleware for endpoints that can work with or without authentication
func OptionalAuth(config *AuthConfig) func(http.Handler) http.Handler {
	if config == nil || config.AuthService == nil {
		panic("AuthService is required for OptionalAuth middleware")
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract token from Authorization header
			authHeader := r.Header.Get("Authorization")
			if authHeader != "" {
				// Check Bearer token format
				parts := strings.SplitN(authHeader, " ", 2)
				if len(parts) == 2 && parts[0] == "Bearer" {
					token := parts[1]
					if token != "" {
						// Validate token
						user, err := config.AuthService.ValidateToken(r.Context(), token)
						if err == nil {
							// Add user to request context
							ctx := context.WithValue(r.Context(), UserKey, user)
							r = r.WithContext(ctx)
						}
					}
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

// shouldSkipAuth checks if the given path should skip authentication
func shouldSkipAuth(path string, skipPaths []string) bool {
	for _, skipPath := range skipPaths {
		if strings.HasPrefix(path, skipPath) {
			return true
		}
	}
	return false
}

// writeErrorResponse writes a JSON error response
func writeErrorResponse(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	
	response := map[string]interface{}{
		"error":   true,
		"message": message,
	}
	
	json.NewEncoder(w).Encode(response)
}