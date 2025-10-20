package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"feed-bower-api/internal/model"
)

// mockAuthService implements service.AuthService for testing
type mockAuthService struct {
	validateTokenFunc func(ctx context.Context, tokenString string) (*model.User, error)
}

func (m *mockAuthService) CreateGuestUser(ctx context.Context, language string) (*model.User, string, error) {
	return nil, "", nil
}

func (m *mockAuthService) Register(ctx context.Context, email, password, name, language string) (*model.User, string, error) {
	return nil, "", nil
}

func (m *mockAuthService) Login(ctx context.Context, email, password string) (*model.User, string, error) {
	return nil, "", nil
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
	return "", nil
}

func (m *mockAuthService) GetUserByID(ctx context.Context, userID string) (*model.User, error) {
	return nil, nil
}

func (m *mockAuthService) UpdateUser(ctx context.Context, user *model.User) error {
	return nil
}

func (m *mockAuthService) ChangePassword(ctx context.Context, userID, oldPassword, newPassword string) error {
	return nil
}

func (m *mockAuthService) DeleteUser(ctx context.Context, userID string) error {
	return nil
}

func TestAuth_ValidToken(t *testing.T) {
	mockService := &mockAuthService{}
	config := &AuthConfig{
		AuthService: mockService,
		SkipPaths:   []string{"/api/auth"},
	}

	middleware := Auth(config)

	// Create a test handler that checks if user is in context
	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, ok := GetUserFromContext(r.Context())
		if !ok || user == nil {
			t.Error("Expected user to be in context")
			return
		}
		if user.UserID != "test-user-id" {
			t.Errorf("Expected user ID 'test-user-id', got '%s'", user.UserID)
		}
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware(testHandler)

	req := httptest.NewRequest("GET", "/api/test", nil)
	req.Header.Set("Authorization", "Bearer valid-token")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}
}

func TestAuth_MissingToken(t *testing.T) {
	mockService := &mockAuthService{}
	config := &AuthConfig{
		AuthService: mockService,
	}

	middleware := Auth(config)

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware(testHandler)

	req := httptest.NewRequest("GET", "/api/test", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestAuth_SkipPath(t *testing.T) {
	mockService := &mockAuthService{}
	config := &AuthConfig{
		AuthService: mockService,
		SkipPaths:   []string{"/api/auth"},
	}

	middleware := Auth(config)

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware(testHandler)

	req := httptest.NewRequest("GET", "/api/auth/login", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}
}

// Helper function to get user from context (same as in utils.go)
func GetUserFromContext(ctx context.Context) (*model.User, bool) {
	user, ok := ctx.Value(UserKey).(*model.User)
	return user, ok
}
