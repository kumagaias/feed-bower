package handler

import (
	"net/http"

	"github.com/gorilla/mux"

	"feed-bower-api/internal/model"
	"feed-bower-api/internal/service"
	"feed-bower-api/pkg/response"
	"feed-bower-api/pkg/validator"
)

// AuthHandler handles authentication-related HTTP requests
type AuthHandler struct {
	authService service.AuthService
	validator   *validator.Validator
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(authService service.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		validator:   validator.New(),
	}
}

// RegisterRoutes registers auth routes
func (h *AuthHandler) RegisterRoutes(router *mux.Router) {
	authRouter := router.PathPrefix("/api/auth").Subrouter()

	authRouter.HandleFunc("/guest", h.CreateGuestUser).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/register", h.Register).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/login", h.Login).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/refresh", h.RefreshToken).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/me", h.GetCurrentUser).Methods("GET", "OPTIONS")
	authRouter.HandleFunc("/change-password", h.ChangePassword).Methods("PUT", "OPTIONS")
	authRouter.HandleFunc("/dev-user", h.GetDevUser).Methods("GET", "OPTIONS")
}

// CreateGuestUserRequest represents the request to create a guest user
type CreateGuestUserRequest struct {
	Language string `json:"language" validate:"omitempty,oneof=ja en"`
}

// CreateGuestUserResponse represents the response for guest user creation
type CreateGuestUserResponse struct {
	User  *UserResponse `json:"user"`
	Token string        `json:"token"`
}

// RegisterRequest represents the registration request
type RegisterRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	Name     string `json:"name" validate:"required,min=1,max=100"`
	Language string `json:"language" validate:"omitempty,oneof=ja en"`
}

// LoginRequest represents the login request
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// AuthResponse represents the authentication response
type AuthResponse struct {
	User  *UserResponse `json:"user"`
	Token string        `json:"token"`
}

// RefreshTokenRequest represents the refresh token request
type RefreshTokenRequest struct {
	Token string `json:"token" validate:"required"`
}

// RefreshTokenResponse represents the refresh token response
type RefreshTokenResponse struct {
	Token string `json:"token"`
}

// ChangePasswordRequest represents the change password request
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=6"`
}

// UserResponse represents a user in API responses
type UserResponse struct {
	UserID    string `json:"user_id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	Language  string `json:"language"`
	CreatedAt int64  `json:"created_at"`
}

// CreateGuestUser creates a temporary guest user
func (h *AuthHandler) CreateGuestUser(w http.ResponseWriter, r *http.Request) {
	var req CreateGuestUserRequest
	if !ParseJSONBodySecure(w, r, &req) {
		return
	}

	if err := h.validator.Validate(&req); err != nil {
		response.ValidationError(w, err.Error())
		return
	}

	// Default to Japanese if not specified
	if req.Language == "" {
		req.Language = "ja"
	}

	user, token, err := h.authService.CreateGuestUser(r.Context(), req.Language)
	if err != nil {
		response.InternalServerError(w, "Failed to create guest user")
		return
	}

	resp := &CreateGuestUserResponse{
		User:  h.toUserResponse(user),
		Token: token,
	}

	response.Created(w, resp)
}

// Register creates a new user account
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if !ParseJSONBodySecure(w, r, &req) {
		return
	}

	if err := h.validator.Validate(&req); err != nil {
		response.ValidationError(w, err.Error())
		return
	}

	// Default to Japanese if not specified
	if req.Language == "" {
		req.Language = "ja"
	}

	user, token, err := h.authService.Register(r.Context(), req.Email, req.Password, req.Name, req.Language)
	if err != nil {
		if err.Error() == "user with this email already exists" {
			response.Conflict(w, err.Error())
			return
		}
		response.InternalServerError(w, "Failed to register user")
		return
	}

	resp := &AuthResponse{
		User:  h.toUserResponse(user),
		Token: token,
	}

	response.Created(w, resp)
}

// Login authenticates a user
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if !ParseJSONBodySecure(w, r, &req) {
		return
	}

	if err := h.validator.Validate(&req); err != nil {
		response.ValidationError(w, err.Error())
		return
	}

	user, token, err := h.authService.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		if err.Error() == "invalid email or password" {
			response.Unauthorized(w, err.Error())
			return
		}
		response.InternalServerError(w, "Failed to login")
		return
	}

	resp := &AuthResponse{
		User:  h.toUserResponse(user),
		Token: token,
	}

	response.Success(w, resp)
}

// RefreshToken generates a new token from an existing token
func (h *AuthHandler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	var req RefreshTokenRequest
	if !ParseJSONBodySecure(w, r, &req) {
		return
	}

	if err := h.validator.Validate(&req); err != nil {
		response.ValidationError(w, err.Error())
		return
	}

	newToken, err := h.authService.RefreshToken(r.Context(), req.Token)
	if err != nil {
		response.Unauthorized(w, "Invalid or expired token")
		return
	}

	resp := &RefreshTokenResponse{
		Token: newToken,
	}

	response.Success(w, resp)
}

// GetCurrentUser returns the current authenticated user
func (h *AuthHandler) GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	user, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	response.Success(w, h.toUserResponse(user))
}

// ChangePassword changes the user's password
func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	user, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	var req ChangePasswordRequest
	if !ParseJSONBodySecure(w, r, &req) {
		return
	}

	if err := h.validator.Validate(&req); err != nil {
		response.ValidationError(w, err.Error())
		return
	}

	err := h.authService.ChangePassword(r.Context(), user.UserID, req.OldPassword, req.NewPassword)
	if err != nil {
		if err.Error() == "invalid old password" {
			response.BadRequest(w, err.Error())
			return
		}
		response.InternalServerError(w, "Failed to change password")
		return
	}

	response.Success(w, map[string]string{"message": "Password changed successfully"})
}

// toUserResponse converts a model.User to UserResponse
func (h *AuthHandler) toUserResponse(user *model.User) *UserResponse {
	return &UserResponse{
		UserID:    user.UserID,
		Email:     user.Email,
		Name:      user.Name,
		Language:  user.Language,
		CreatedAt: user.CreatedAt,
	}
}
// GetDevUser returns the development user information (development only)
func (h *AuthHandler) GetDevUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get development user by email using auth service
	// We'll use a mock token to trigger the dev user lookup
	user, err := h.authService.ValidateToken(ctx, "mock-jwt-token-dev")
	if err != nil {
		response.Error(w, http.StatusNotFound, "Development user not found", err.Error())
		return
	}
	
	// Return user information in a simple format for mock auth
	userInfo := map[string]interface{}{
		"user_id": user.UserID,
		"email":   user.Email,
		"name":    user.Name,
	}

	response.Success(w, userInfo)
}