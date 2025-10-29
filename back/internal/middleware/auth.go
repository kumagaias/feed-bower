package middleware

import (
	"context"
	"encoding/json"
	"log"
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

// detectPreferredLanguage extracts preferred language from Accept-Language header
func detectPreferredLanguage(acceptLanguage string) string {
	if acceptLanguage == "" {
		return ""
	}

	// Parse Accept-Language header (e.g., "ja,en-US;q=0.9,en;q=0.8")
	// Take the first language
	parts := strings.Split(acceptLanguage, ",")
	if len(parts) > 0 {
		lang := strings.TrimSpace(parts[0])
		// Extract language code (e.g., "ja" from "ja-JP")
		if idx := strings.Index(lang, "-"); idx > 0 {
			lang = lang[:idx]
		}
		// Remove quality value if present
		if idx := strings.Index(lang, ";"); idx > 0 {
			lang = lang[:idx]
		}
		return strings.ToLower(strings.TrimSpace(lang))
	}

	return ""
}

// Auth middleware for JWT token validation
func Auth(config *AuthConfig) func(http.Handler) http.Handler {
	if config == nil || config.AuthService == nil {
		panic("AuthService is required for Auth middleware")
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			log.Printf("🔐 Auth middleware: Processing request to %s", r.URL.Path)

			// Extract and store preferred language from Accept-Language header
			acceptLanguage := r.Header.Get("Accept-Language")
			if acceptLanguage != "" {
				preferredLang := detectPreferredLanguage(acceptLanguage)
				if preferredLang != "" {
					ctx := context.WithValue(r.Context(), "preferred_language", preferredLang)
					r = r.WithContext(ctx)
					log.Printf("🌐 Detected preferred language: %s", preferredLang)
				}
			}

			// Check if path should skip authentication
			if shouldSkipAuth(r.URL.Path, config.SkipPaths) {
				log.Printf("✅ Auth middleware: Skipping authentication for path %s", r.URL.Path)
				next.ServeHTTP(w, r)
				return
			}

			// Extract token from Authorization header
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				log.Printf("❌ Auth middleware: No Authorization header found for %s", r.URL.Path)
				writeErrorResponse(w, http.StatusUnauthorized, "Authorization header is required")
				return
			}

			// Check Bearer token format
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				log.Printf("❌ Auth middleware: Invalid authorization header format for %s", r.URL.Path)
				writeErrorResponse(w, http.StatusUnauthorized, "Invalid authorization header format")
				return
			}

			token := parts[1]
			if token == "" {
				log.Printf("❌ Auth middleware: Empty token for %s", r.URL.Path)
				writeErrorResponse(w, http.StatusUnauthorized, "Token is required")
				return
			}

			// NEVER log the token or its preview. For debug, log only the token length.
			log.Printf("🔍 Auth middleware: Token received for %s (length: %d)", r.URL.Path, len(token))

			// Validate token
			user, err := config.AuthService.ValidateToken(r.Context(), token)
			if err != nil {
				log.Printf("❌ Auth middleware: Token validation failed for %s: %v", r.URL.Path, err)
				writeErrorResponse(w, http.StatusUnauthorized, "Invalid or expired token")
				return
			}

			log.Printf("✅ Auth middleware: Token validated successfully for %s, user: %s", r.URL.Path, user.UserID)

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
			// Extract and store preferred language from Accept-Language header
			acceptLanguage := r.Header.Get("Accept-Language")
			if acceptLanguage != "" {
				preferredLang := detectPreferredLanguage(acceptLanguage)
				if preferredLang != "" {
					ctx := context.WithValue(r.Context(), "preferred_language", preferredLang)
					r = r.WithContext(ctx)
				}
			}

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
	// Log all 4xx and 5xx errors
	if statusCode >= 400 {
		log.Printf("🚨 HTTP %d Error: %s", statusCode, message)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	response := map[string]interface{}{
		"error":   true,
		"message": message,
	}

	json.NewEncoder(w).Encode(response)
}
