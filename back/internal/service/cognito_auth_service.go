package service

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"feed-bower-api/internal/model"
	"feed-bower-api/internal/repository"
)

// CognitoAuthService implements AuthService using AWS Cognito
type CognitoAuthService struct {
	userRepo     repository.UserRepository
	userPoolID   string
	region       string
	clientID     string
	jwksCache    map[string]*rsa.PublicKey
	jwksCacheExp time.Time
}

// NewCognitoAuthService creates a new Cognito auth service
func NewCognitoAuthService(userRepo repository.UserRepository, userPoolID, region, clientID string) AuthService {
	return &CognitoAuthService{
		userRepo:   userRepo,
		userPoolID: userPoolID,
		region:     region,
		clientID:   clientID,
		jwksCache:  make(map[string]*rsa.PublicKey),
	}
}

// CognitoJWTClaims represents Cognito JWT token claims
type CognitoJWTClaims struct {
	TokenUse string `json:"token_use"`
	Sub      string `json:"sub"`
	Email    string `json:"email"`
	jwt.RegisteredClaims
}

// JWKS represents the JSON Web Key Set
type JWKS struct {
	Keys []JWK `json:"keys"`
}

// JWK represents a JSON Web Key
type JWK struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	Use string `json:"use"`
	N   string `json:"n"`
	E   string `json:"e"`
}

// CreateGuestUser - Not supported with Cognito
func (s *CognitoAuthService) CreateGuestUser(ctx context.Context, language string) (*model.User, string, error) {
	return nil, "", errors.New("guest users not supported with Cognito")
}

// Register - Not supported with Cognito (handled by Cognito directly)
func (s *CognitoAuthService) Register(ctx context.Context, email, password, name, language string) (*model.User, string, error) {
	return nil, "", errors.New("registration handled by Cognito")
}

// Login - Not supported with Cognito (handled by Cognito directly)
func (s *CognitoAuthService) Login(ctx context.Context, email, password string) (*model.User, string, error) {
	return nil, "", errors.New("login handled by Cognito")
}

// ValidateToken validates a Cognito JWT token and returns the user
func (s *CognitoAuthService) ValidateToken(ctx context.Context, tokenString string) (*model.User, error) {
	if tokenString == "" {
		return nil, errors.New("token is required")
	}

	// Create parser with explicit options to handle RS256
	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{"RS256"}),
		jwt.WithoutClaimsValidation(),
	)
	
	// Parse token with proper keyfunc
	token, err := parser.ParseWithClaims(tokenString, &CognitoJWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Ensure the signing method is what we expect
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Method)
		}

		// Get the kid from token header
		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, errors.New("kid not found in token header")
		}

		// Get the public key for this kid
		publicKey, err := s.getPublicKey(kid)
		if err != nil {
			return nil, fmt.Errorf("failed to get public key: %w", err)
		}

		return publicKey, nil
	})

	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	claims, ok := token.Claims.(*CognitoJWTClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token claims")
	}

	// Verify token_use is "id" (ID token)
	if claims.TokenUse != "id" {
		return nil, errors.New("invalid token type, expected ID token")
	}

	// Verify audience (client ID)
	if len(claims.Audience) == 0 || claims.Audience[0] != s.clientID {
		return nil, errors.New("invalid token audience")
	}

	// Verify issuer
	expectedIssuer := fmt.Sprintf("https://cognito-idp.%s.amazonaws.com/%s", s.region, s.userPoolID)
	if claims.Issuer != expectedIssuer {
		return nil, errors.New("invalid token issuer")
	}

	// Get or create user in our database
	user, err := s.getOrCreateUser(ctx, claims.Sub, claims.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to get or create user: %w", err)
	}

	return user, nil
}

// RefreshToken - Not supported with Cognito (handled by Cognito directly)
func (s *CognitoAuthService) RefreshToken(ctx context.Context, tokenString string) (string, error) {
	return "", errors.New("token refresh handled by Cognito")
}

// GetUserByID retrieves a user by ID
func (s *CognitoAuthService) GetUserByID(ctx context.Context, userID string) (*model.User, error) {
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
func (s *CognitoAuthService) UpdateUser(ctx context.Context, user *model.User) error {
	if user == nil {
		return errors.New("user is required")
	}
	if user.UserID == "" {
		return errors.New("user ID is required")
	}

	err := s.userRepo.Update(ctx, user)
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	return nil
}

// ChangePassword - Not supported with Cognito (handled by Cognito directly)
func (s *CognitoAuthService) ChangePassword(ctx context.Context, userID, oldPassword, newPassword string) error {
	return errors.New("password change handled by Cognito")
}

// getPublicKey retrieves the public key for a given kid from Cognito JWKS
func (s *CognitoAuthService) getPublicKey(kid string) (*rsa.PublicKey, error) {
	// Check cache first
	if publicKey, exists := s.jwksCache[kid]; exists && time.Now().Before(s.jwksCacheExp) {
		return publicKey, nil
	}

	// Fetch JWKS from Cognito
	jwksURL := fmt.Sprintf("https://cognito-idp.%s.amazonaws.com/%s/.well-known/jwks.json", s.region, s.userPoolID)
	
	resp, err := http.Get(jwksURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch JWKS: %w", err)
	}
	defer resp.Body.Close()

	var jwks JWKS
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return nil, fmt.Errorf("failed to decode JWKS: %w", err)
	}

	// Find the key with matching kid
	for _, key := range jwks.Keys {
		if key.Kid == kid {
			publicKey, err := s.jwkToRSAPublicKey(key)
			if err != nil {
				return nil, fmt.Errorf("failed to convert JWK to RSA public key: %w", err)
			}

			// Cache the key for 1 hour
			s.jwksCache[kid] = publicKey
			s.jwksCacheExp = time.Now().Add(time.Hour)

			return publicKey, nil
		}
	}

	return nil, errors.New("public key not found for kid")
}

// jwkToRSAPublicKey converts a JWK to RSA public key
func (s *CognitoAuthService) jwkToRSAPublicKey(jwk JWK) (*rsa.PublicKey, error) {
	// Decode the modulus
	nBytes, err := base64.RawURLEncoding.DecodeString(jwk.N)
	if err != nil {
		return nil, fmt.Errorf("failed to decode modulus: %w", err)
	}

	// Decode the exponent
	eBytes, err := base64.RawURLEncoding.DecodeString(jwk.E)
	if err != nil {
		return nil, fmt.Errorf("failed to decode exponent: %w", err)
	}

	// Convert to big integers
	n := new(big.Int).SetBytes(nBytes)
	e := new(big.Int).SetBytes(eBytes)

	// Create RSA public key
	publicKey := &rsa.PublicKey{
		N: n,
		E: int(e.Int64()),
	}

	return publicKey, nil
}

// getOrCreateUser gets an existing user or creates a new one
func (s *CognitoAuthService) getOrCreateUser(ctx context.Context, cognitoUserID, email string) (*model.User, error) {
	// Try to get user by Cognito user ID first
	user, err := s.userRepo.GetByID(ctx, cognitoUserID)
	if err == nil {
		return user, nil
	}

	// Try to get user by email
	user, err = s.userRepo.GetByEmail(ctx, email)
	if err == nil {
		// Update user ID to Cognito user ID if different
		if user.UserID != cognitoUserID {
			user.UserID = cognitoUserID
			user.UpdateTimestamp()
			err = s.userRepo.Update(ctx, user)
			if err != nil {
				return nil, fmt.Errorf("failed to update user ID: %w", err)
			}
		}
		return user, nil
	}

	// Create new user
	user = &model.User{
		UserID:      cognitoUserID,
		Email:       email,
		Name:        strings.Split(email, "@")[0], // Use email prefix as default name
		Language:    "ja",                        // Default to Japanese
		CreatedAt:   time.Now().Unix(),
		UpdatedAt:   time.Now().Unix(),
	}

	err = s.userRepo.Create(ctx, user)
	if err != nil {
		// Check if user already exists (race condition)
		if strings.Contains(err.Error(), "already exists") {
			// Try to get the existing user
			existingUser, getErr := s.userRepo.GetByID(ctx, cognitoUserID)
			if getErr == nil {
				return existingUser, nil
			}
		}
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}