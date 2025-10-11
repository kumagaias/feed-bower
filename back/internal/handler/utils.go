package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"

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

// ParseJSONBody parses JSON request body into the provided struct
func ParseJSONBody(w http.ResponseWriter, r *http.Request, dest interface{}) bool {
	if r.Header.Get("Content-Type") != "application/json" {
		response.BadRequest(w, "Content-Type must be application/json")
		return false
	}

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(dest); err != nil {
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