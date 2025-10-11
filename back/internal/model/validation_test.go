package model

import (
	"testing"

	"github.com/go-playground/validator/v10"
)

func TestUserValidation(t *testing.T) {
	validate := validator.New()

	tests := []struct {
		name    string
		user    User
		wantErr bool
	}{
		{
			name: "valid user",
			user: User{
				UserID:       "user-123",
				Email:        "test@example.com",
				PasswordHash: "hashedpassword",
				Name:         "Test User",
				Language:     "ja",
			},
			wantErr: false,
		},
		{
			name: "invalid email",
			user: User{
				UserID:       "user-123",
				Email:        "invalid-email",
				PasswordHash: "hashedpassword",
				Name:         "Test User",
				Language:     "ja",
			},
			wantErr: true,
		},
		{
			name: "invalid language",
			user: User{
				UserID:       "user-123",
				Email:        "test@example.com",
				PasswordHash: "hashedpassword",
				Name:         "Test User",
				Language:     "fr",
			},
			wantErr: true,
		},
		{
			name: "empty name",
			user: User{
				UserID:       "user-123",
				Email:        "test@example.com",
				PasswordHash: "hashedpassword",
				Name:         "",
				Language:     "ja",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validate.Struct(tt.user)
			if (err != nil) != tt.wantErr {
				t.Errorf("validation error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestBowerValidation(t *testing.T) {
	validate := validator.New()

	tests := []struct {
		name    string
		bower   Bower
		wantErr bool
	}{
		{
			name: "valid bower",
			bower: Bower{
				BowerID:  "bower-123",
				UserID:   "user-123",
				Name:     "Tech News",
				Keywords: []string{"AI", "Programming"},
				Color:    "#14b8a6",
				IsPublic: false,
			},
			wantErr: false,
		},
		{
			name: "invalid color",
			bower: Bower{
				BowerID:  "bower-123",
				UserID:   "user-123",
				Name:     "Tech News",
				Keywords: []string{"AI", "Programming"},
				Color:    "invalid-color",
				IsPublic: false,
			},
			wantErr: true,
		},
		{
			name: "too many keywords",
			bower: Bower{
				BowerID:  "bower-123",
				UserID:   "user-123",
				Name:     "Tech News",
				Keywords: []string{"AI", "Programming", "ML", "Data", "Science", "Tech", "News", "Blog", "Extra"},
				Color:    "#14b8a6",
				IsPublic: false,
			},
			wantErr: true,
		},
		{
			name: "empty keywords",
			bower: Bower{
				BowerID:  "bower-123",
				UserID:   "user-123",
				Name:     "Tech News",
				Keywords: []string{},
				Color:    "#14b8a6",
				IsPublic: false,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validate.Struct(tt.bower)
			if (err != nil) != tt.wantErr {
				t.Errorf("validation error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}