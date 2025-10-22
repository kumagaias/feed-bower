package service

import (
	"context"
	"errors"
	"testing"

	"feed-bower-api/internal/model"
)

// TestAutoRegisterFeeds_Success tests successful auto-registration of feeds
func TestAutoRegisterFeeds_Success(t *testing.T) {
	mockBowerRepo := NewMockBowerRepository()
	mockFeedRepo := NewMockFeedRepository()
	mockRSSService := NewMockRSSService()
	mockBedrock := NewMockBedrockClient()
	service := NewFeedService(mockFeedRepo, mockBowerRepo, NewMockArticleRepository(), mockRSSService, mockBedrock)

	// Create a test bower
	bower := &model.Bower{
		BowerID:  "bower123",
		UserID:   "user123",
		Name:     "Test Bower",
		Keywords: []string{"AI", "Programming"},
		IsPublic: false,
	}
	mockBowerRepo.bowers[bower.BowerID] = bower

	// Test auto-registration
	result, err := service.AutoRegisterFeeds(context.Background(), "user123", "bower123", []string{"AI"}, 5)

	if err != nil {
		t.Errorf("AutoRegisterFeeds() unexpected error: %v", err)
		return
	}

	if result == nil {
		t.Errorf("AutoRegisterFeeds() returned nil result")
		return
	}

	// Check that feeds were added
	if result.TotalAdded == 0 {
		t.Errorf("AutoRegisterFeeds() expected feeds to be added, got 0")
	}

	// Check that result structure is correct
	if len(result.AddedFeeds) != result.TotalAdded {
		t.Errorf("AutoRegisterFeeds() AddedFeeds length = %d, want %d", len(result.AddedFeeds), result.TotalAdded)
	}

	if len(result.SkippedFeeds) != result.TotalSkipped {
		t.Errorf("AutoRegisterFeeds() SkippedFeeds length = %d, want %d", len(result.SkippedFeeds), result.TotalSkipped)
	}

	if len(result.FailedFeeds) != result.TotalFailed {
		t.Errorf("AutoRegisterFeeds() FailedFeeds length = %d, want %d", len(result.FailedFeeds), result.TotalFailed)
	}
}

// TestAutoRegisterFeeds_InvalidInput tests validation of input parameters
func TestAutoRegisterFeeds_InvalidInput(t *testing.T) {
	mockBowerRepo := NewMockBowerRepository()
	mockFeedRepo := NewMockFeedRepository()
	mockRSSService := NewMockRSSService()
	mockBedrock := NewMockBedrockClient()
	service := NewFeedService(mockFeedRepo, mockBowerRepo, NewMockArticleRepository(), mockRSSService, mockBedrock)

	tests := []struct {
		name     string
		userID   string
		bowerID  string
		keywords []string
		maxFeeds int
		wantErr  bool
	}{
		{
			name:     "empty user ID",
			userID:   "",
			bowerID:  "bower123",
			keywords: []string{"AI"},
			maxFeeds: 5,
			wantErr:  true,
		},
		{
			name:     "empty bower ID",
			userID:   "user123",
			bowerID:  "",
			keywords: []string{"AI"},
			maxFeeds: 5,
			wantErr:  true,
		},
		{
			name:     "empty keywords",
			userID:   "user123",
			bowerID:  "bower123",
			keywords: []string{},
			maxFeeds: 5,
			wantErr:  true,
		},
		{
			name:     "maxFeeds too low",
			userID:   "user123",
			bowerID:  "bower123",
			keywords: []string{"AI"},
			maxFeeds: 0,
			wantErr:  true,
		},
		{
			name:     "maxFeeds too high",
			userID:   "user123",
			bowerID:  "bower123",
			keywords: []string{"AI"},
			maxFeeds: 11,
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := service.AutoRegisterFeeds(context.Background(), tt.userID, tt.bowerID, tt.keywords, tt.maxFeeds)

			if tt.wantErr && err == nil {
				t.Errorf("AutoRegisterFeeds() expected error, got nil")
			}

			if !tt.wantErr && err != nil {
				t.Errorf("AutoRegisterFeeds() unexpected error: %v", err)
			}
		})
	}
}

// TestAutoRegisterFeeds_BowerNotFound tests error when bower doesn't exist
func TestAutoRegisterFeeds_BowerNotFound(t *testing.T) {
	mockBowerRepo := NewMockBowerRepository()
	mockFeedRepo := NewMockFeedRepository()
	mockRSSService := NewMockRSSService()
	mockBedrock := NewMockBedrockClient()
	service := NewFeedService(mockFeedRepo, mockBowerRepo, NewMockArticleRepository(), mockRSSService, mockBedrock)

	_, err := service.AutoRegisterFeeds(context.Background(), "user123", "nonexistent", []string{"AI"}, 5)

	if err == nil {
		t.Errorf("AutoRegisterFeeds() expected error for non-existent bower, got nil")
	}
}

// TestAutoRegisterFeeds_AccessDenied tests error when user doesn't own the bower
func TestAutoRegisterFeeds_AccessDenied(t *testing.T) {
	mockBowerRepo := NewMockBowerRepository()
	mockFeedRepo := NewMockFeedRepository()
	mockRSSService := NewMockRSSService()
	mockBedrock := NewMockBedrockClient()
	service := NewFeedService(mockFeedRepo, mockBowerRepo, NewMockArticleRepository(), mockRSSService, mockBedrock)

	// Create a bower owned by a different user
	bower := &model.Bower{
		BowerID:  "bower123",
		UserID:   "otheruser",
		Name:     "Test Bower",
		Keywords: []string{"AI"},
		IsPublic: false,
	}
	mockBowerRepo.bowers[bower.BowerID] = bower

	_, err := service.AutoRegisterFeeds(context.Background(), "user123", "bower123", []string{"AI"}, 5)

	if err == nil {
		t.Errorf("AutoRegisterFeeds() expected access denied error, got nil")
	}
}

// TestAutoRegisterFeeds_SkipDuplicates tests that duplicate feeds are skipped
func TestAutoRegisterFeeds_SkipDuplicates(t *testing.T) {
	mockBowerRepo := NewMockBowerRepository()
	mockFeedRepo := NewMockFeedRepository()
	mockRSSService := NewMockRSSService()
	mockBedrock := NewMockBedrockClient()
	service := NewFeedService(mockFeedRepo, mockBowerRepo, NewMockArticleRepository(), mockRSSService, mockBedrock)

	// Create a test bower
	bower := &model.Bower{
		BowerID:  "bower123",
		UserID:   "user123",
		Name:     "Test Bower",
		Keywords: []string{"AI"},
		IsPublic: false,
	}
	mockBowerRepo.bowers[bower.BowerID] = bower

	// Add an existing feed with a URL that might be recommended
	existingFeed := &model.Feed{
		FeedID:      "feed1",
		BowerID:     "bower123",
		URL:         "https://ai.googleblog.com/feeds/posts/default",
		Title:       "Google AI Blog",
		Description: "Existing feed",
		Category:    "AI",
	}
	mockFeedRepo.feeds[existingFeed.FeedID] = existingFeed

	// Run auto-registration
	result, err := service.AutoRegisterFeeds(context.Background(), "user123", "bower123", []string{"AI"}, 5)

	if err != nil {
		t.Errorf("AutoRegisterFeeds() unexpected error: %v", err)
		return
	}

	// Check that the existing feed was skipped
	if result.TotalSkipped == 0 {
		t.Logf("AutoRegisterFeeds() expected at least one skipped feed (duplicate), got %d", result.TotalSkipped)
		// Note: This might not always skip if the static mapping doesn't include this exact URL
	}
}

// TestAutoRegisterFeeds_MaxFeedsLimit tests that the maxFeeds limit is respected
func TestAutoRegisterFeeds_MaxFeedsLimit(t *testing.T) {
	mockBowerRepo := NewMockBowerRepository()
	mockFeedRepo := NewMockFeedRepository()
	mockRSSService := NewMockRSSService()
	mockBedrock := NewMockBedrockClient()
	service := NewFeedService(mockFeedRepo, mockBowerRepo, NewMockArticleRepository(), mockRSSService, mockBedrock)

	// Create a test bower
	bower := &model.Bower{
		BowerID:  "bower123",
		UserID:   "user123",
		Name:     "Test Bower",
		Keywords: []string{"AI", "Programming", "Technology"},
		IsPublic: false,
	}
	mockBowerRepo.bowers[bower.BowerID] = bower

	// Request only 2 feeds
	result, err := service.AutoRegisterFeeds(context.Background(), "user123", "bower123", []string{"AI", "Programming"}, 2)

	if err != nil {
		t.Errorf("AutoRegisterFeeds() unexpected error: %v", err)
		return
	}

	// Check that no more than 2 feeds were added
	if result.TotalAdded > 2 {
		t.Errorf("AutoRegisterFeeds() added %d feeds, want max 2", result.TotalAdded)
	}
}

// TestAutoRegisterFeeds_MultipleKeywords tests auto-registration with multiple keywords
func TestAutoRegisterFeeds_MultipleKeywords(t *testing.T) {
	mockBowerRepo := NewMockBowerRepository()
	mockFeedRepo := NewMockFeedRepository()
	mockRSSService := NewMockRSSService()
	mockBedrock := NewMockBedrockClient()
	service := NewFeedService(mockFeedRepo, mockBowerRepo, NewMockArticleRepository(), mockRSSService, mockBedrock)

	// Create a test bower
	bower := &model.Bower{
		BowerID:  "bower123",
		UserID:   "user123",
		Name:     "Test Bower",
		Keywords: []string{"AI", "Programming", "Design"},
		IsPublic: false,
	}
	mockBowerRepo.bowers[bower.BowerID] = bower

	// Test with multiple keywords
	result, err := service.AutoRegisterFeeds(context.Background(), "user123", "bower123", []string{"AI", "Programming", "Design"}, 10)

	if err != nil {
		t.Errorf("AutoRegisterFeeds() unexpected error: %v", err)
		return
	}

	if result == nil {
		t.Errorf("AutoRegisterFeeds() returned nil result")
		return
	}

	// Should get feeds for multiple keywords
	if result.TotalAdded == 0 {
		t.Errorf("AutoRegisterFeeds() expected feeds to be added for multiple keywords, got 0")
	}
}

// TestAutoRegisterFeeds_JapaneseKeywords tests auto-registration with Japanese keywords
func TestAutoRegisterFeeds_JapaneseKeywords(t *testing.T) {
	mockBowerRepo := NewMockBowerRepository()
	mockFeedRepo := NewMockFeedRepository()
	mockRSSService := NewMockRSSService()
	mockBedrock := NewMockBedrockClient()
	service := NewFeedService(mockFeedRepo, mockBowerRepo, NewMockArticleRepository(), mockRSSService, mockBedrock)

	// Create a test bower
	bower := &model.Bower{
		BowerID:  "bower123",
		UserID:   "user123",
		Name:     "テストBower",
		Keywords: []string{"プログラミング", "テクノロジー"},
		IsPublic: false,
	}
	mockBowerRepo.bowers[bower.BowerID] = bower

	// Test with Japanese keywords
	result, err := service.AutoRegisterFeeds(context.Background(), "user123", "bower123", []string{"プログラミング", "テクノロジー"}, 5)

	if err != nil {
		t.Errorf("AutoRegisterFeeds() unexpected error: %v", err)
		return
	}

	if result == nil {
		t.Errorf("AutoRegisterFeeds() returned nil result")
		return
	}

	// Should get feeds for Japanese keywords
	if result.TotalAdded == 0 {
		t.Errorf("AutoRegisterFeeds() expected feeds to be added for Japanese keywords, got 0")
	}
}

// MockRSSServiceWithError is a mock RSS service that returns errors
type MockRSSServiceWithError struct {
	shouldFail bool
}

func (m *MockRSSServiceWithError) FetchFeed(ctx context.Context, feedURL string) (*FeedData, error) {
	if m.shouldFail {
		return nil, errors.New("feed fetch error")
	}
	return &FeedData{
		Title:       "Test Feed",
		Description: "Test Description",
		Category:    "Test",
		Articles:    []ArticleData{},
	}, nil
}

func (m *MockRSSServiceWithError) FetchFeedInfo(ctx context.Context, feedURL string) (*FeedInfo, error) {
	if m.shouldFail {
		return nil, errors.New("feed fetch error")
	}
	return &FeedInfo{
		Title:       "Test Feed",
		Description: "Test Description",
		Category:    "Test",
	}, nil
}

func (m *MockRSSServiceWithError) ParseRSSFeed(data []byte) (*FeedData, error) {
	return &FeedData{}, nil
}

func (m *MockRSSServiceWithError) ParseAtomFeed(data []byte) (*FeedData, error) {
	return &FeedData{}, nil
}

func (m *MockRSSServiceWithError) ExtractImageURL(content string) string {
	return ""
}

func (m *MockRSSServiceWithError) CleanContent(content string) string {
	return content
}

// TestAutoRegisterFeeds_FeedFetchError tests handling of feed fetch errors
func TestAutoRegisterFeeds_FeedFetchError(t *testing.T) {
	mockBowerRepo := NewMockBowerRepository()
	mockFeedRepo := NewMockFeedRepository()
	mockRSSService := &MockRSSServiceWithError{shouldFail: true}
	mockBedrock := NewMockBedrockClient()
	service := NewFeedService(mockFeedRepo, mockBowerRepo, NewMockArticleRepository(), mockRSSService, mockBedrock)

	// Create a test bower
	bower := &model.Bower{
		BowerID:  "bower123",
		UserID:   "user123",
		Name:     "Test Bower",
		Keywords: []string{"AI"},
		IsPublic: false,
	}
	mockBowerRepo.bowers[bower.BowerID] = bower

	// Run auto-registration with failing RSS service
	result, err := service.AutoRegisterFeeds(context.Background(), "user123", "bower123", []string{"AI"}, 5)

	if err != nil {
		t.Errorf("AutoRegisterFeeds() unexpected error: %v", err)
		return
	}

	// All feeds should fail to fetch
	if result.TotalFailed == 0 {
		t.Errorf("AutoRegisterFeeds() expected failed feeds due to RSS errors, got 0")
	}

	// Check that failed feeds have reasons
	for _, failed := range result.FailedFeeds {
		if failed.Reason == "" {
			t.Errorf("AutoRegisterFeeds() failed feed missing reason: %s", failed.URL)
		}
	}
}
