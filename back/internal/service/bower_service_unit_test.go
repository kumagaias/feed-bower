package service

import (
	"context"
	"testing"

	"feed-bower-api/internal/model"
)

func TestBowerService_CreateBower_Unit(t *testing.T) {
	mockBowerRepo := NewMockBowerRepository()
	mockFeedRepo := NewMockFeedRepository()
	service := NewBowerService(mockBowerRepo, mockFeedRepo)

	tests := []struct {
		name    string
		userID  string
		req     *CreateBowerRequest
		wantErr bool
	}{
		{
			name:   "valid bower creation",
			userID: "user123",
			req: &CreateBowerRequest{
				Name:     "Tech News",
				Keywords: []string{"AI", "Programming"},
				IsPublic: false,
			},
			wantErr: false,
		},
		{
			name:   "empty name should auto-generate",
			userID: "user123",
			req: &CreateBowerRequest{
				Name:     "",
				Keywords: []string{"AI"},
				IsPublic: false,
			},
			wantErr: false,
		},
		{
			name:   "no keywords should fail",
			userID: "user123",
			req: &CreateBowerRequest{
				Name:     "Tech News",
				Keywords: []string{},
				IsPublic: false,
			},
			wantErr: true,
		},
		{
			name:   "too many keywords should fail",
			userID: "user123",
			req: &CreateBowerRequest{
				Name:     "Tech News",
				Keywords: []string{"1", "2", "3", "4", "5", "6", "7", "8", "9"},
				IsPublic: false,
			},
			wantErr: true,
		},
		{
			name:   "keyword too long should fail",
			userID: "user123",
			req: &CreateBowerRequest{
				Name:     "Tech News",
				Keywords: []string{"this_is_a_very_long_keyword_that_exceeds_twenty_characters"},
				IsPublic: false,
			},
			wantErr: true,
		},
		{
			name:   "duplicate keywords should fail",
			userID: "user123",
			req: &CreateBowerRequest{
				Name:     "Tech News",
				Keywords: []string{"AI", "AI"},
				IsPublic: false,
			},
			wantErr: true,
		},
		{
			name:   "Japanese keywords should work",
			userID: "user123",
			req: &CreateBowerRequest{
				Name:     "テックニュース",
				Keywords: []string{"プログラミング", "AI"},
				IsPublic: false,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			bower, err := service.CreateBower(context.Background(), tt.userID, tt.req)

			if tt.wantErr {
				if err == nil {
					t.Errorf("CreateBower() expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Errorf("CreateBower() unexpected error: %v", err)
				return
			}

			if bower == nil {
				t.Errorf("CreateBower() returned nil bower")
				return
			}

			// Check name - if request name is empty, it should be auto-generated
			if tt.req.Name != "" && bower.Name != tt.req.Name {
				t.Errorf("CreateBower() name = %v, want %v", bower.Name, tt.req.Name)
			} else if tt.req.Name == "" && bower.Name == "" {
				t.Errorf("CreateBower() should auto-generate name when empty")
			}

			if len(bower.Keywords) != len(tt.req.Keywords) {
				t.Errorf("CreateBower() keywords length = %v, want %v", len(bower.Keywords), len(tt.req.Keywords))
			}

			if bower.UserID != tt.userID {
				t.Errorf("CreateBower() userID = %v, want %v", bower.UserID, tt.userID)
			}

			if bower.IsPublic != tt.req.IsPublic {
				t.Errorf("CreateBower() isPublic = %v, want %v", bower.IsPublic, tt.req.IsPublic)
			}
		})
	}
}

func TestBowerService_GetBowerByID_Unit(t *testing.T) {
	mockBowerRepo := NewMockBowerRepository()
	mockFeedRepo := NewMockFeedRepository()
	service := NewBowerService(mockBowerRepo, mockFeedRepo)

	// Create a test bower
	bower := &model.Bower{
		BowerID:  "bower123",
		UserID:   "user123",
		Name:     "Test Bower",
		Keywords: []string{"AI"},
		IsPublic: false,
	}
	mockBowerRepo.bowers[bower.BowerID] = bower

	tests := []struct {
		name     string
		bowerID  string
		wantErr  bool
		wantName string
	}{
		{
			name:     "existing bower",
			bowerID:  "bower123",
			wantErr:  false,
			wantName: "Test Bower",
		},
		{
			name:    "non-existing bower",
			bowerID: "nonexistent",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := service.GetBowerByID(context.Background(), tt.bowerID, "user123")

			if tt.wantErr {
				if err == nil {
					t.Errorf("GetBower() expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Errorf("GetBower() unexpected error: %v", err)
				return
			}

			if result.Name != tt.wantName {
				t.Errorf("GetBower() name = %v, want %v", result.Name, tt.wantName)
			}
		})
	}
}

func TestBowerService_DeleteBower_Unit(t *testing.T) {
	mockBowerRepo := NewMockBowerRepository()
	mockFeedRepo := NewMockFeedRepository()
	service := NewBowerService(mockBowerRepo, mockFeedRepo)

	// Create a test bower
	bower := &model.Bower{
		BowerID: "bower123",
		UserID:  "user123",
		Name:    "Test Bower",
	}
	mockBowerRepo.bowers[bower.BowerID] = bower

	tests := []struct {
		name    string
		bowerID string
		userID  string
		wantErr bool
	}{
		{
			name:    "valid deletion",
			bowerID: "bower123",
			userID:  "user123",
			wantErr: false,
		},
		{
			name:    "non-existing bower",
			bowerID: "nonexistent",
			userID:  "user123",
			wantErr: true,
		},
		{
			name:    "unauthorized user",
			bowerID: "bower123",
			userID:  "otheruser",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := service.DeleteBower(context.Background(), tt.userID, tt.bowerID)

			if tt.wantErr {
				if err == nil {
					t.Errorf("DeleteBower() expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Errorf("DeleteBower() unexpected error: %v", err)
				return
			}

			// Verify bower was deleted
			_, exists := mockBowerRepo.bowers[tt.bowerID]
			if exists {
				t.Errorf("DeleteBower() bower still exists after deletion")
			}
		})
	}
}
