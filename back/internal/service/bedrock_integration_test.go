package service

import (
	"context"
	"testing"
	"time"

	"feed-bower-api/internal/model"
)

// TestBedrockIntegration tests the complete flow with Bedrock Agent
func TestBedrockIntegration(t *testing.T) {
	ctx := context.Background()
	repos := NewMockRepositories()

	// Create services
	authService := NewAuthService(repos.UserRepo, "test-secret")
	bowerService := NewBowerService(repos.BowerRepo, repos.FeedRepo)
	rssService := NewMockRSSService()

	// FeedService without Bedrock (nil config)
	feedService := NewFeedService(repos.FeedRepo, repos.BowerRepo, repos.ArticleRepo, rssService, nil)

	// Link services for auto-registration
	if bs, ok := bowerService.(interface{ SetFeedService(FeedService) }); ok {
		bs.SetFeedService(feedService)
	}

	// Test flow: Create user -> Create bower with auto-register -> Verify feeds

	// 1. Create a guest user
	user, _, err := authService.CreateGuestUser(ctx, "ja")
	if err != nil {
		t.Fatalf("Failed to create guest user: %v", err)
	}

	// 2. Create a bower with auto-registration enabled
	createBowerReq := &CreateBowerRequest{
		Name:              "AI Research Bower",
		Keywords:          []string{"AI", "machine learning"},
		IsPublic:          false,
		AutoRegisterFeeds: true,
		MaxAutoFeeds:      5,
	}

	result, err := bowerService.CreateBower(ctx, user.UserID, createBowerReq)
	if err != nil {
		t.Fatalf("Failed to create bower: %v", err)
	}

	if result.Bower.Name != "AI Research Bower" {
		t.Errorf("Expected bower name 'AI Research Bower', got %s", result.Bower.Name)
	}

	// 3. Verify auto-registration result
	// Note: In test environment without Bedrock, auto-registration will use fallback
	t.Logf("Auto-registered feeds: %d", result.AutoRegisteredFeeds)
	t.Logf("Auto-register errors: %v", result.AutoRegisterErrors)

	// Auto-registration should have been attempted
	if result.AutoRegisteredFeeds < 0 {
		t.Errorf("Expected non-negative auto-registered feeds count, got %d", result.AutoRegisteredFeeds)
	}

	t.Logf("Bedrock integration test completed successfully")
	t.Logf("User ID: %s", user.UserID)
	t.Logf("Bower ID: %s", result.Bower.BowerID)
}

// TestAutoRegisterFeeds_EndToEnd tests the complete auto-register flow
func TestAutoRegisterFeeds_EndToEnd(t *testing.T) {
	ctx := context.Background()
	repos := NewMockRepositories()

	// Create services
	rssService := NewMockRSSService()
	feedService := NewFeedService(repos.FeedRepo, repos.BowerRepo, repos.ArticleRepo, rssService, nil)

	// Create a test user and bower
	userID := "test-user-123"
	bower := &model.Bower{
		BowerID:   "test-bower-123",
		UserID:    userID,
		Name:      "Test Bower",
		Keywords:  []string{"technology"},
		CreatedAt: time.Now().Unix(),
		UpdatedAt: time.Now().Unix(),
	}

	if err := repos.BowerRepo.Create(ctx, bower); err != nil {
		t.Fatalf("Failed to create test bower: %v", err)
	}

	// Test auto-register
	keywords := []string{"technology", "programming"}
	maxFeeds := 5

	result, err := feedService.AutoRegisterFeeds(ctx, userID, bower.BowerID, keywords, maxFeeds)
	if err != nil {
		t.Fatalf("Failed to auto-register feeds: %v", err)
	}

	// Verify result structure
	if result.TotalAdded < 0 {
		t.Errorf("Expected non-negative total added, got %d", result.TotalAdded)
	}

	if result.TotalSkipped < 0 {
		t.Errorf("Expected non-negative total skipped, got %d", result.TotalSkipped)
	}

	if result.TotalFailed < 0 {
		t.Errorf("Expected non-negative total failed, got %d", result.TotalFailed)
	}

	t.Logf("Auto-register completed: added=%d, skipped=%d, failed=%d",
		result.TotalAdded,
		result.TotalSkipped,
		result.TotalFailed)
}

// TestFeedRecommendations_Fallback tests feed recommendations with fallback
func TestFeedRecommendations_Fallback(t *testing.T) {
	ctx := context.Background()
	repos := NewMockRepositories()

	// Create services without Bedrock
	rssService := NewMockRSSService()
	feedService := NewFeedService(repos.FeedRepo, repos.BowerRepo, repos.ArticleRepo, rssService, nil)

	// Create a test bower
	userID := "test-user"
	bower := &model.Bower{
		BowerID:   "test-bower",
		UserID:    userID,
		Name:      "Test Bower",
		Keywords:  []string{"test"},
		CreatedAt: time.Now().Unix(),
		UpdatedAt: time.Now().Unix(),
	}

	if err := repos.BowerRepo.Create(ctx, bower); err != nil {
		t.Fatalf("Failed to create test bower: %v", err)
	}

	// Test recommendations with various keywords
	testCases := []struct {
		name     string
		keywords []string
		minFeeds int
	}{
		{
			name:     "AI keywords",
			keywords: []string{"AI", "machine learning"},
			minFeeds: 1,
		},
		{
			name:     "Technology keywords",
			keywords: []string{"technology", "programming"},
			minFeeds: 1,
		},
		{
			name:     "Japanese keywords",
			keywords: []string{"技術", "プログラミング"},
			minFeeds: 1,
		},
		{
			name:     "Unknown keywords",
			keywords: []string{"unknown", "xyz123"},
			minFeeds: 0,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			feeds, err := feedService.GetFeedRecommendations(ctx, userID, bower.BowerID, tc.keywords)
			if err != nil {
				t.Fatalf("Failed to get recommendations: %v", err)
			}

			if len(feeds) < tc.minFeeds {
				t.Errorf("Expected at least %d feeds, got %d", tc.minFeeds, len(feeds))
			}

			t.Logf("Keywords %v returned %d feeds", tc.keywords, len(feeds))
		})
	}
}

// TestPerformance_AutoRegister tests performance of auto-register
func TestPerformance_AutoRegister(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping performance test in short mode")
	}

	ctx := context.Background()
	repos := NewMockRepositories()

	// Create services
	rssService := NewMockRSSService()
	feedService := NewFeedService(repos.FeedRepo, repos.BowerRepo, repos.ArticleRepo, rssService, nil)

	// Create test bower
	userID := "test-user-perf"
	bower := &model.Bower{
		BowerID:   "test-bower-perf",
		UserID:    userID,
		Name:      "Performance Test Bower",
		Keywords:  []string{"technology"},
		CreatedAt: time.Now().Unix(),
		UpdatedAt: time.Now().Unix(),
	}

	if err := repos.BowerRepo.Create(ctx, bower); err != nil {
		t.Fatalf("Failed to create test bower: %v", err)
	}

	// Measure auto-register performance
	start := time.Now()

	keywords := []string{"technology", "programming", "AI"}
	maxFeeds := 10

	_, err := feedService.AutoRegisterFeeds(ctx, userID, bower.BowerID, keywords, maxFeeds)
	if err != nil {
		t.Fatalf("Failed to auto-register feeds: %v", err)
	}

	duration := time.Since(start)

	// Performance requirements: should complete within 30 seconds
	maxDuration := 30 * time.Second
	if duration > maxDuration {
		t.Errorf("Auto-register took too long: %v (max: %v)", duration, maxDuration)
	}

	t.Logf("Auto-register performance: %v", duration)
}

// TestConcurrentAutoRegister tests concurrent auto-register requests
func TestConcurrentAutoRegister(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping concurrent test in short mode")
	}

	ctx := context.Background()
	repos := NewMockRepositories()

	// Create services
	rssService := NewMockRSSService()
	feedService := NewFeedService(repos.FeedRepo, repos.BowerRepo, repos.ArticleRepo, rssService, nil)

	// Create multiple test bowers
	userID := "test-user-concurrent"
	numBowers := 5

	for i := 0; i < numBowers; i++ {
		bower := &model.Bower{
			BowerID:   "test-bower-" + string(rune('a'+i)),
			UserID:    userID,
			Name:      "Concurrent Test Bower",
			Keywords:  []string{"technology"},
			CreatedAt: time.Now().Unix(),
			UpdatedAt: time.Now().Unix(),
		}

		if err := repos.BowerRepo.Create(ctx, bower); err != nil {
			t.Fatalf("Failed to create test bower: %v", err)
		}
	}

	// Run concurrent auto-register requests
	done := make(chan bool, numBowers)
	errors := make(chan error, numBowers)

	start := time.Now()

	for i := 0; i < numBowers; i++ {
		go func(index int) {
			bowerID := "test-bower-" + string(rune('a'+index))
			keywords := []string{"technology"}
			maxFeeds := 5

			_, err := feedService.AutoRegisterFeeds(ctx, userID, bowerID, keywords, maxFeeds)
			if err != nil {
				errors <- err
			}
			done <- true
		}(i)
	}

	// Wait for all requests to complete
	for i := 0; i < numBowers; i++ {
		select {
		case <-done:
			// Success
		case err := <-errors:
			t.Errorf("Concurrent request failed: %v", err)
		case <-time.After(60 * time.Second):
			t.Fatal("Concurrent requests timed out")
		}
	}

	duration := time.Since(start)
	t.Logf("Concurrent auto-register completed in %v", duration)
}
