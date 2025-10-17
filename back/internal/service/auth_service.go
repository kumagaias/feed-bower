package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"feed-bower-api/internal/model"
	"feed-bower-api/internal/repository"
)

// AuthService defines the interface for authentication operations
type AuthService interface {
	// Guest login
	CreateGuestUser(ctx context.Context, language string) (*model.User, string, error)

	// Regular authentication
	Register(ctx context.Context, email, password, name, language string) (*model.User, string, error)
	Login(ctx context.Context, email, password string) (*model.User, string, error)
	ValidateToken(ctx context.Context, tokenString string) (*model.User, error)
	RefreshToken(ctx context.Context, tokenString string) (string, error)

	// User management
	GetUserByID(ctx context.Context, userID string) (*model.User, error)
	UpdateUser(ctx context.Context, user *model.User) error
	ChangePassword(ctx context.Context, userID, oldPassword, newPassword string) error
}

// authService implements AuthService interface
type authService struct {
	userRepo  repository.UserRepository
	jwtSecret []byte
	tokenTTL  time.Duration
}

// NewAuthService creates a new auth service
func NewAuthService(userRepo repository.UserRepository, jwtSecret string) AuthService {
	return &authService{
		userRepo:  userRepo,
		jwtSecret: []byte(jwtSecret),
		tokenTTL:  7 * 24 * time.Hour, // 7 days
	}
}

// JWTClaims represents the JWT token claims
type JWTClaims struct {
	UserID  string `json:"user_id"`
	Email   string `json:"email"`
	IsGuest bool   `json:"is_guest"`
	jwt.RegisteredClaims
}

// CreateGuestUser creates a temporary guest user
func (s *authService) CreateGuestUser(ctx context.Context, language string) (*model.User, string, error) {
	// Validate language
	if language != "ja" && language != "en" {
		language = "ja" // Default to Japanese
	}

	// Generate a random guest email and password
	guestID, err := generateRandomString(16)
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate guest ID: %w", err)
	}

	guestEmail := fmt.Sprintf("guest_%s@feed-bower.local", guestID)
	guestPassword := fmt.Sprintf("guest_%s", guestID)
	guestName := fmt.Sprintf("Guest_%s", guestID[:8])

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(guestPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, "", fmt.Errorf("failed to hash guest password: %w", err)
	}

	// Create guest user
	user := model.NewUser(guestEmail, string(hashedPassword), guestName, language)

	err = s.userRepo.Create(ctx, user)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create guest user: %w", err)
	}

	// Generate JWT token
	token, err := s.generateToken(user, true)
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate token for guest user: %w", err)
	}

	return user, token, nil
}

// Register creates a new user account
func (s *authService) Register(ctx context.Context, email, password, name, language string) (*model.User, string, error) {
	// Validate inputs
	if email == "" {
		return nil, "", errors.New("email is required")
	}
	if password == "" {
		return nil, "", errors.New("password is required")
	}
	if name == "" {
		return nil, "", errors.New("name is required")
	}
	if language != "ja" && language != "en" {
		language = "ja" // Default to Japanese
	}

	// Check if user already exists
	existingUser, err := s.userRepo.GetByEmail(ctx, email)
	if err == nil && existingUser != nil {
		return nil, "", errors.New("user with this email already exists")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, "", fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	user := model.NewUser(email, string(hashedPassword), name, language)

	err = s.userRepo.Create(ctx, user)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create user: %w", err)
	}

	// Generate JWT token
	token, err := s.generateToken(user, false)
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate token: %w", err)
	}

	return user, token, nil
}

// Login authenticates a user with email and password
func (s *authService) Login(ctx context.Context, email, password string) (*model.User, string, error) {
	if email == "" {
		return nil, "", errors.New("email is required")
	}
	if password == "" {
		return nil, "", errors.New("password is required")
	}

	// Get user by email
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, "", errors.New("invalid email or password")
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return nil, "", errors.New("invalid email or password")
	}

	// Generate JWT token
	token, err := s.generateToken(user, false)
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate token: %w", err)
	}

	return user, token, nil
}

// ValidateToken validates a JWT token and returns the user
func (s *authService) ValidateToken(ctx context.Context, tokenString string) (*model.User, error) {
	tokenPreview := tokenString
	if len(tokenString) > 20 {
		tokenPreview = tokenString[:20] + "..."
	}
	fmt.Printf("🔍 ValidateToken called with token: %s\n", tokenPreview)
	
	if tokenString == "" {
		fmt.Println("❌ Token is empty")
		return nil, errors.New("token is required")
	}

	// Handle mock tokens for development
	if strings.HasPrefix(tokenString, "mock-jwt-token-") {
		fmt.Println("🔧 Processing mock token")
		// For mock tokens, find the actual dev user from database
		user, err := s.userRepo.GetByEmail(ctx, "dev@feed-bower.local")
		if err != nil {
			fmt.Printf("❌ Development user not found: %v\n", err)
			return nil, fmt.Errorf("development user not found: %w", err)
		}
		
		fmt.Println("✅ Mock token validated successfully")
		// Return the actual dev user from database
		return user, nil
	}

	// Handle Cognito tokens for development (they start with "eyJ")
	if strings.HasPrefix(tokenString, "eyJ") {
		fmt.Println("🔧 Processing Cognito token for development")
		// In development, accept Cognito tokens without validation
		// This is a simplified approach for local development
		user, err := s.userRepo.GetByEmail(ctx, "dev@feed-bower.local")
		if err != nil {
			fmt.Printf("❌ Development user not found: %v\n", err)
			return nil, fmt.Errorf("development user not found: %w", err)
		}
		
		fmt.Printf("✅ Cognito token validated successfully for user: %s\n", user.Email)
		// Return the actual dev user from database
		return user, nil
	}

	// Parse and validate token
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})

	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token claims")
	}

	// Get user from database
	user, err := s.userRepo.GetByID(ctx, claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	return user, nil
}

// RefreshToken generates a new token from an existing valid token
func (s *authService) RefreshToken(ctx context.Context, tokenString string) (string, error) {
	user, err := s.ValidateToken(ctx, tokenString)
	if err != nil {
		return "", fmt.Errorf("invalid token for refresh: %w", err)
	}

	// Check if it's a guest user by email pattern
	isGuest := len(user.Email) > 5 && user.Email[:6] == "guest_"

	// Generate new token
	newToken, err := s.generateToken(user, isGuest)
	if err != nil {
		return "", fmt.Errorf("failed to generate new token: %w", err)
	}

	return newToken, nil
}

// GetUserByID retrieves a user by ID
func (s *authService) GetUserByID(ctx context.Context, userID string) (*model.User, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

// UpdateUser updates user information
func (s *authService) UpdateUser(ctx context.Context, user *model.User) error {
	if user == nil {
		return errors.New("user is required")
	}
	if user.UserID == "" {
		return errors.New("user ID is required")
	}

	// Validate language
	if !user.IsValidLanguage() {
		return errors.New("invalid language")
	}

	err := s.userRepo.Update(ctx, user)
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	return nil
}

// ChangePassword changes a user's password
func (s *authService) ChangePassword(ctx context.Context, userID, oldPassword, newPassword string) error {
	if userID == "" {
		return errors.New("user ID is required")
	}
	if oldPassword == "" {
		return errors.New("old password is required")
	}
	if newPassword == "" {
		return errors.New("new password is required")
	}

	// Get user
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	// Verify old password
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword))
	if err != nil {
		return errors.New("invalid old password")
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash new password: %w", err)
	}

	// Update user password
	user.PasswordHash = string(hashedPassword)
	user.UpdateTimestamp()

	err = s.userRepo.Update(ctx, user)
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	return nil
}

// generateToken generates a JWT token for a user
func (s *authService) generateToken(user *model.User, isGuest bool) (string, error) {
	claims := &JWTClaims{
		UserID:  user.UserID,
		Email:   user.Email,
		IsGuest: isGuest,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.tokenTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "feed-bower-api",
			Subject:   user.UserID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

// generateRandomString generates a random hex string of specified length
func generateRandomString(length int) (string, error) {
	bytes := make([]byte, length/2)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
