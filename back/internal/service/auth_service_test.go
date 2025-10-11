package service

import (
	"context"
	"testing"

	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"

	"feed-bower-api/internal/model"
)

// MockUserRepository is a mock implementation of UserRepository for testing
type MockUserRepository struct {
	users map[string]*model.User
}

func NewMockUserRepository() *MockUserRepository {
	return &MockUserRepository{
		users: make(map[string]*model.User),
	}
}

func (m *MockUserRepository) Create(ctx context.Context, user *model.User) error {
	if user.UserID == "" {
		user.UserID = "test-user-id"
	}
	m.users[user.UserID] = user
	return nil
}

func (m *MockUserRepository) GetByID(ctx context.Context, userID string) (*model.User, error) {
	if user, exists := m.users[userID]; exists {
		return user, nil
	}
	return nil, nil
}

func (m *MockUserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	for _, user := range m.users {
		if user.Email == email {
			return user, nil
		}
	}
	return nil, nil
}

func (m *MockUserRepository) Update(ctx context.Context, user *model.User) error {
	m.users[user.UserID] = user
	return nil
}

func (m *MockUserRepository) Delete(ctx context.Context, userID string) error {
	delete(m.users, userID)
	return nil
}

func (m *MockUserRepository) List(ctx context.Context, limit int32, lastKey map[string]types.AttributeValue) ([]*model.User, map[string]types.AttributeValue, error) {
	users := make([]*model.User, 0, len(m.users))
	for _, user := range m.users {
		users = append(users, user)
	}
	return users, nil, nil
}

func TestAuthService_CreateGuestUser(t *testing.T) {
	mockRepo := NewMockUserRepository()
	authService := NewAuthService(mockRepo, "test-secret")

	ctx := context.Background()
	user, token, err := authService.CreateGuestUser(ctx, "ja")

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if user == nil {
		t.Fatal("Expected user to be created")
	}

	if token == "" {
		t.Fatal("Expected token to be generated")
	}

	if user.Language != "ja" {
		t.Errorf("Expected language to be 'ja', got %s", user.Language)
	}

	// Check if user was stored in mock repository
	storedUser, err := mockRepo.GetByID(ctx, user.UserID)
	if err != nil {
		t.Fatalf("Error retrieving stored user: %v", err)
	}

	if storedUser == nil {
		t.Fatal("User was not stored in repository")
	}
}

func TestAuthService_Register(t *testing.T) {
	mockRepo := NewMockUserRepository()
	authService := NewAuthService(mockRepo, "test-secret")

	ctx := context.Background()
	email := "test@example.com"
	password := "testpassword"
	name := "Test User"
	language := "en"

	user, token, err := authService.Register(ctx, email, password, name, language)

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if user == nil {
		t.Fatal("Expected user to be created")
	}

	if token == "" {
		t.Fatal("Expected token to be generated")
	}

	if user.Email != email {
		t.Errorf("Expected email to be %s, got %s", email, user.Email)
	}

	if user.Name != name {
		t.Errorf("Expected name to be %s, got %s", name, user.Name)
	}

	if user.Language != language {
		t.Errorf("Expected language to be %s, got %s", language, user.Language)
	}
}

func TestAuthService_ValidateToken(t *testing.T) {
	mockRepo := NewMockUserRepository()
	authService := NewAuthService(mockRepo, "test-secret")

	ctx := context.Background()
	
	// First create a user and get a token
	user, token, err := authService.CreateGuestUser(ctx, "ja")
	if err != nil {
		t.Fatalf("Failed to create guest user: %v", err)
	}

	// Now validate the token
	validatedUser, err := authService.ValidateToken(ctx, token)
	if err != nil {
		t.Fatalf("Expected no error validating token, got %v", err)
	}

	if validatedUser == nil {
		t.Fatal("Expected validated user to be returned")
	}

	if validatedUser.UserID != user.UserID {
		t.Errorf("Expected user ID to be %s, got %s", user.UserID, validatedUser.UserID)
	}
}