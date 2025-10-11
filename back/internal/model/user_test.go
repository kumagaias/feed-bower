package model

import (
	"testing"
	"time"
)

func TestNewUser(t *testing.T) {
	email := "test@example.com"
	passwordHash := "hashedpassword"
	name := "Test User"
	language := "ja"

	user := NewUser(email, passwordHash, name, language)

	if user.Email != email {
		t.Errorf("Expected email %s, got %s", email, user.Email)
	}
	if user.PasswordHash != passwordHash {
		t.Errorf("Expected password hash %s, got %s", passwordHash, user.PasswordHash)
	}
	if user.Name != name {
		t.Errorf("Expected name %s, got %s", name, user.Name)
	}
	if user.Language != language {
		t.Errorf("Expected language %s, got %s", language, user.Language)
	}
	if user.CreatedAt == 0 {
		t.Error("CreatedAt should be set")
	}
	if user.UpdatedAt == 0 {
		t.Error("UpdatedAt should be set")
	}
}

func TestUser_UpdateTimestamp(t *testing.T) {
	user := NewUser("test@example.com", "hash", "Test", "en")
	originalTime := user.UpdatedAt
	
	// Wait a full second to ensure timestamp changes
	time.Sleep(1001 * time.Millisecond)
	user.UpdateTimestamp()
	
	if user.UpdatedAt <= originalTime {
		t.Errorf("UpdatedAt should be updated to a newer timestamp. Original: %d, New: %d", originalTime, user.UpdatedAt)
	}
}

func TestUser_IsValidLanguage(t *testing.T) {
	tests := []struct {
		language string
		expected bool
	}{
		{"ja", true},
		{"en", true},
		{"fr", false},
		{"", false},
		{"invalid", false},
	}

	for _, test := range tests {
		user := &User{Language: test.language}
		result := user.IsValidLanguage()
		if result != test.expected {
			t.Errorf("For language %s, expected %v, got %v", test.language, test.expected, result)
		}
	}
}