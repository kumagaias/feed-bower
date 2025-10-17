package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"

	"feed-bower-api/internal/model"
)

// mockAuthService implements service.AuthService for testing
type mockAuthService struct {
	createGuestUserFunc func(ctx context.Context, language string) (*model.User, string, error)
	registerFunc        func(ctx context.Context, email, password, name, language string) (*model.User, string, error)
	loginFunc           func(ctx context.Context, email, password string) (*model.User, string, error)
	validateTokenFunc   func(ctx context.Context, tokenString string) (*model.User, error)
	refreshTokenFunc    func(ctx context.Context, tokenString string) (string, error)
	getUserByIDFunc     func(ctx context.Context, userID string) (*model.User, error)
	updateUserFunc      func(ctx context.Context, user *model.User) error
	changePasswordFunc  func(ctx context.Context, userID, oldPassword, newPassword string) error
}

func (m *mockAuthService) CreateGuestUser(ctx context.Context, language string) (*model.User, string, error) {
	if m.createGuestUserFunc != nil {
		return m.createGuestUserFunc(ctx, language)
	}
	user := &model.User{
		UserID:   "test-user-id",
		Email:    "guest@test.com",
		Name:     "Test Guest",
		Language: language,
	}
	return user, "test-token", nil
}

func (m *mockAuthService) Register(ctx context.Context, email, password, name, language string) (*model.User, string, error) {
	if m.registerFunc != nil {
		return m.registerFunc(ctx, email, password, name, language)
	}
	user := &model.User{
		UserID:   "test-user-id",
		Email:    email,
		Name:     name,
		Language: language,
	}
	return user, "test-token", nil
}

func (m *mockAuthService) Login(ctx context.Context, email, password string) (*model.User, string, error) {
	if m.loginFunc != nil {
		return m.loginFunc(ctx, email, password)
	}
	user := &model.User{
		UserID:   "test-user-id",
		Email:    email,
		Name:     "Test User",
		Language: "ja",
	}
	return user, "test-token", nil
}

func (m *mockAuthService) ValidateToken(ctx context.Context, tokenString string) (*model.User, error) {
	if m.validateTokenFunc != nil {
		return m.validateTokenFunc(ctx, tokenString)
	}
	return &model.User{
		UserID:   "test-user-id",
		Email:    "test@example.com",
		Name:     "Test User",
		Language: "ja",
	}, nil
}

func (m *mockAuthService) RefreshToken(ctx context.Context, tokenString string) (string, error) {
	if m.refreshTokenFunc != nil {
		return m.refreshTokenFunc(ctx, tokenString)
	}
	return "new-test-token", nil
}

func (m *mockAuthService) GetUserByID(ctx context.Context, userID string) (*model.User, error) {
	if m.getUserByIDFunc != nil {
		return m.getUserByIDFunc(ctx, userID)
	}
	return &model.User{
		UserID:   userID,
		Email:    "test@example.com",
		Name:     "Test User",
		Language: "ja",
	}, nil
}

func (m *mockAuthService) UpdateUser(ctx context.Context, user *model.User) error {
	if m.updateUserFunc != nil {
		return m.updateUserFunc(ctx, user)
	}
	return nil
}

func (m *mockAuthService) ChangePassword(ctx context.Context, userID, oldPassword, newPassword string) error {
	if m.changePasswordFunc != nil {
		return m.changePasswordFunc(ctx, userID, oldPassword, newPassword)
	}
	return nil
}

func TestAuthHandler_CreateGuestUser(t *testing.T) {
	mockService := &mockAuthService{}
	handler := NewAuthHandler(mockService)

	router := mux.NewRouter()
	handler.RegisterRoutes(router)

	reqBody := CreateGuestUserRequest{
		Language: "ja",
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest("POST", "/api/auth/guest", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("Expected status %d, got %d", http.StatusCreated, w.Code)
	}

	var response struct {
		Success bool                     `json:"success"`
		Data    *CreateGuestUserResponse `json:"data"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	if err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if !response.Success {
		t.Error("Expected success to be true")
	}

	if response.Data.User.Language != "ja" {
		t.Errorf("Expected language 'ja', got '%s'", response.Data.User.Language)
	}

	if response.Data.Token == "" {
		t.Error("Expected token to be present")
	}
}

func TestAuthHandler_Register(t *testing.T) {
	mockService := &mockAuthService{}
	handler := NewAuthHandler(mockService)

	router := mux.NewRouter()
	handler.RegisterRoutes(router)

	reqBody := RegisterRequest{
		Email:    "test@example.com",
		Password: "password123",
		Name:     "Test User",
		Language: "en",
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("Expected status %d, got %d", http.StatusCreated, w.Code)
	}

	var response struct {
		Success bool          `json:"success"`
		Data    *AuthResponse `json:"data"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	if err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if !response.Success {
		t.Error("Expected success to be true")
	}

	if response.Data.User.Email != "test@example.com" {
		t.Errorf("Expected email 'test@example.com', got '%s'", response.Data.User.Email)
	}
}

func TestAuthHandler_Login(t *testing.T) {
	mockService := &mockAuthService{}
	handler := NewAuthHandler(mockService)

	router := mux.NewRouter()
	handler.RegisterRoutes(router)

	reqBody := LoginRequest{
		Email:    "test@example.com",
		Password: "password123",
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response struct {
		Success bool          `json:"success"`
		Data    *AuthResponse `json:"data"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	if err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if !response.Success {
		t.Error("Expected success to be true")
	}

	if response.Data.Token == "" {
		t.Error("Expected token to be present")
	}
}
