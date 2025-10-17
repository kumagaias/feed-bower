package model

import (
	"time"
)

// User represents a user in the system
type User struct {
	UserID       string `json:"user_id" dynamodbav:"user_id" validate:"required"`
	Email        string `json:"email" dynamodbav:"email" validate:"required,email"`
	PasswordHash string `json:"-" dynamodbav:"password_hash" validate:"required"`
	Name         string `json:"name" dynamodbav:"name" validate:"required,min=1,max=100"`
	Language     string `json:"language" dynamodbav:"language" validate:"required,oneof=ja en"`
	CreatedAt    int64  `json:"created_at" dynamodbav:"created_at"`
	UpdatedAt    int64  `json:"updated_at" dynamodbav:"updated_at"`
}

// NewUser creates a new User instance with current timestamps
func NewUser(email, passwordHash, name, language string) *User {
	now := time.Now().Unix()
	return &User{
		Email:        email,
		PasswordHash: passwordHash,
		Name:         name,
		Language:     language,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
}

// UpdateTimestamp updates the UpdatedAt field to current time
func (u *User) UpdateTimestamp() {
	u.UpdatedAt = time.Now().Unix()
}

// IsValidLanguage checks if the language is valid
func (u *User) IsValidLanguage() bool {
	return u.Language == "ja" || u.Language == "en"
}
