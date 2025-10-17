package repository

import (
	"context"
	"testing"

	"feed-bower-api/internal/model"
	dynamodbpkg "feed-bower-api/pkg/dynamodb"
)

// TestRepositoryInterfaces verifies that all repository implementations satisfy their interfaces
func TestRepositoryInterfaces(t *testing.T) {
	// Create a mock client for testing
	client := &dynamodbpkg.Client{}

	// Test that all repositories implement their interfaces
	var _ UserRepository = NewUserRepository(client)
	var _ BowerRepository = NewBowerRepository(client)
	var _ FeedRepository = NewFeedRepository(client)
	var _ ArticleRepository = NewArticleRepository(client)
	var _ ChickRepository = NewChickRepository(client)

	t.Log("All repository interfaces are correctly implemented")
}

// TestModelCreation verifies that model creation functions work correctly
func TestModelCreation(t *testing.T) {
	// Test User creation
	user := model.NewUser("test@example.com", "hashedpassword", "Test User", "en")
	if user.Email != "test@example.com" {
		t.Errorf("Expected email 'test@example.com', got '%s'", user.Email)
	}
	if user.Language != "en" {
		t.Errorf("Expected language 'en', got '%s'", user.Language)
	}

	// Test Bower creation
	bower := model.NewBower("user123", "Tech News", []string{"AI", "Programming"}, []string{}, "#14b8a6", false)
	if bower.Name != "Tech News" {
		t.Errorf("Expected name 'Tech News', got '%s'", bower.Name)
	}
	if len(bower.Keywords) != 2 {
		t.Errorf("Expected 2 keywords, got %d", len(bower.Keywords))
	}

	// Test Feed creation
	feed := model.NewFeed("bower123", "https://example.com/feed.xml", "Example Feed", "Description", "Tech")
	if feed.URL != "https://example.com/feed.xml" {
		t.Errorf("Expected URL 'https://example.com/feed.xml', got '%s'", feed.URL)
	}

	// Test ChickStats creation
	stats := model.NewChickStats("user123")
	if stats.Level != 1 {
		t.Errorf("Expected level 1, got %d", stats.Level)
	}
	if stats.TotalLikes != 0 {
		t.Errorf("Expected 0 total likes, got %d", stats.TotalLikes)
	}

	// Test LikedArticle creation
	likedArticle := model.NewLikedArticle("user123", "article123")
	if likedArticle.UserID != "user123" {
		t.Errorf("Expected user ID 'user123', got '%s'", likedArticle.UserID)
	}

	t.Log("All model creation functions work correctly")
}

// TestRepositoryCreation verifies that repository constructors work
func TestRepositoryCreation(t *testing.T) {
	client := &dynamodbpkg.Client{}

	userRepo := NewUserRepository(client)
	if userRepo == nil {
		t.Error("UserRepository creation failed")
	}

	bowerRepo := NewBowerRepository(client)
	if bowerRepo == nil {
		t.Error("BowerRepository creation failed")
	}

	feedRepo := NewFeedRepository(client)
	if feedRepo == nil {
		t.Error("FeedRepository creation failed")
	}

	articleRepo := NewArticleRepository(client)
	if articleRepo == nil {
		t.Error("ArticleRepository creation failed")
	}

	chickRepo := NewChickRepository(client)
	if chickRepo == nil {
		t.Error("ChickRepository creation failed")
	}

	t.Log("All repositories created successfully")
}

// TestValidationErrors verifies that repositories handle validation errors correctly
func TestValidationErrors(t *testing.T) {
	client := &dynamodbpkg.Client{}
	ctx := context.Background()

	// Test UserRepository validation
	userRepo := NewUserRepository(client)
	err := userRepo.Create(ctx, nil)
	if err == nil || err.Error() != "user cannot be nil" {
		t.Errorf("Expected 'user cannot be nil' error, got: %v", err)
	}

	// Test BowerRepository validation
	bowerRepo := NewBowerRepository(client)
	err = bowerRepo.Create(ctx, nil)
	if err == nil || err.Error() != "bower cannot be nil" {
		t.Errorf("Expected 'bower cannot be nil' error, got: %v", err)
	}

	// Test FeedRepository validation
	feedRepo := NewFeedRepository(client)
	err = feedRepo.Create(ctx, nil)
	if err == nil || err.Error() != "feed cannot be nil" {
		t.Errorf("Expected 'feed cannot be nil' error, got: %v", err)
	}

	// Test ArticleRepository validation
	articleRepo := NewArticleRepository(client)
	err = articleRepo.Create(ctx, nil)
	if err == nil || err.Error() != "article cannot be nil" {
		t.Errorf("Expected 'article cannot be nil' error, got: %v", err)
	}

	// Test ChickRepository validation
	chickRepo := NewChickRepository(client)
	err = chickRepo.CreateStats(ctx, nil)
	if err == nil || err.Error() != "stats cannot be nil" {
		t.Errorf("Expected 'stats cannot be nil' error, got: %v", err)
	}

	t.Log("All validation errors handled correctly")
}
