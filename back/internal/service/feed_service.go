package service

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"

	"feed-bower-api/internal/model"
	"feed-bower-api/internal/repository"
	"feed-bower-api/pkg/httpclient"
)

// FeedService defines the interface for feed operations
type FeedService interface {
	// Feed CRUD operations
	AddFeed(ctx context.Context, userID string, req *AddFeedRequest) (*model.Feed, error)
	GetFeedByID(ctx context.Context, feedID string, userID string) (*model.Feed, error)
	GetFeedsByBowerID(ctx context.Context, bowerID string, userID string) ([]*model.Feed, error)
	UpdateFeed(ctx context.Context, userID string, feedID string, req *UpdateFeedRequest) (*model.Feed, error)
	DeleteFeed(ctx context.Context, userID string, feedID string) error
	
	// Feed preview and validation
	PreviewFeed(ctx context.Context, userID string, feedURL string) (*FeedPreview, error)
	ValidateFeedURL(feedURL string) error
	
	// Feed management
	GetStaleFeeds(ctx context.Context, maxAgeHours int) ([]*model.Feed, error)
}

// AddFeedRequest represents the request to add a feed to a bower
type AddFeedRequest struct {
	BowerID string `json:"bower_id" validate:"required"`
	URL     string `json:"url" validate:"required,url"`
}

// UpdateFeedRequest represents the request to update a feed
type UpdateFeedRequest struct {
	Title       *string `json:"title,omitempty" validate:"omitempty,min=1,max=200"`
	Description *string `json:"description,omitempty" validate:"omitempty,max=1000"`
	Category    *string `json:"category,omitempty" validate:"omitempty,max=50"`
}

// FeedPreview represents a preview of a feed with sample articles
type FeedPreview struct {
	Title       string           `json:"title"`
	Description string           `json:"description"`
	URL         string           `json:"url"`
	Category    string           `json:"category"`
	Articles    []ArticlePreview `json:"articles"`
	IsValid     bool             `json:"is_valid"`
	Error       string           `json:"error,omitempty"`
}

// ArticlePreview represents a preview of an article
type ArticlePreview struct {
	Title       string `json:"title"`
	Content     string `json:"content"`
	URL         string `json:"url"`
	PublishedAt int64  `json:"published_at"`
	ImageURL    string `json:"image_url,omitempty"`
}

// feedService implements FeedService interface
type feedService struct {
	feedRepo   repository.FeedRepository
	bowerRepo  repository.BowerRepository
	rssService RSSService
}

// NewFeedService creates a new feed service
func NewFeedService(feedRepo repository.FeedRepository, bowerRepo repository.BowerRepository, rssService RSSService) FeedService {
	return &feedService{
		feedRepo:   feedRepo,
		bowerRepo:  bowerRepo,
		rssService: rssService,
	}
}

// AddFeed adds a new feed to a bower
func (s *feedService) AddFeed(ctx context.Context, userID string, req *AddFeedRequest) (*model.Feed, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}
	if req == nil {
		return nil, errors.New("add feed request is required")
	}

	// Validate request
	if err := s.validateAddFeedRequest(req); err != nil {
		return nil, fmt.Errorf("invalid request: %w", err)
	}

	// Validate feed URL
	if err := s.ValidateFeedURL(req.URL); err != nil {
		return nil, fmt.Errorf("invalid feed URL: %w", err)
	}

	// Check if bower exists and user has access
	bower, err := s.bowerRepo.GetByID(ctx, req.BowerID)
	if err != nil {
		return nil, fmt.Errorf("bower not found: %w", err)
	}

	if bower.UserID != userID {
		return nil, errors.New("access denied: not bower owner")
	}

	// Check if feed URL already exists in this bower
	existingFeeds, err := s.feedRepo.GetByBowerID(ctx, req.BowerID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing feeds: %w", err)
	}

	for _, existingFeed := range existingFeeds {
		if existingFeed.URL == req.URL {
			return nil, errors.New("feed URL already exists in this bower")
		}
	}

	// Fetch feed information from RSS
	feedInfo, err := s.rssService.FetchFeedInfo(ctx, req.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch feed information: %w", err)
	}

	// Create feed
	feed := model.NewFeed(req.BowerID, req.URL, feedInfo.Title, feedInfo.Description, feedInfo.Category)

	err = s.feedRepo.Create(ctx, feed)
	if err != nil {
		return nil, fmt.Errorf("failed to create feed: %w", err)
	}

	return feed, nil
}

// GetFeedByID retrieves a feed by ID, ensuring user has access
func (s *feedService) GetFeedByID(ctx context.Context, feedID string, userID string) (*model.Feed, error) {
	if feedID == "" {
		return nil, errors.New("feed ID is required")
	}
	if userID == "" {
		return nil, errors.New("user ID is required")
	}

	feed, err := s.feedRepo.GetByID(ctx, feedID)
	if err != nil {
		return nil, fmt.Errorf("failed to get feed: %w", err)
	}

	// Check if user has access through bower ownership
	bower, err := s.bowerRepo.GetByID(ctx, feed.BowerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get bower: %w", err)
	}

	if bower.UserID != userID && !bower.IsPublic {
		return nil, errors.New("access denied: bower is private")
	}

	return feed, nil
}

// GetFeedsByBowerID retrieves all feeds for a bower
func (s *feedService) GetFeedsByBowerID(ctx context.Context, bowerID string, userID string) ([]*model.Feed, error) {
	if bowerID == "" {
		return nil, errors.New("bower ID is required")
	}
	if userID == "" {
		return nil, errors.New("user ID is required")
	}

	// Check if user has access to bower
	bower, err := s.bowerRepo.GetByID(ctx, bowerID)
	if err != nil {
		return nil, fmt.Errorf("bower not found: %w", err)
	}

	if bower.UserID != userID && !bower.IsPublic {
		return nil, errors.New("access denied: bower is private")
	}

	feeds, err := s.feedRepo.GetByBowerID(ctx, bowerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get feeds: %w", err)
	}

	return feeds, nil
}

// UpdateFeed updates an existing feed
func (s *feedService) UpdateFeed(ctx context.Context, userID string, feedID string, req *UpdateFeedRequest) (*model.Feed, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}
	if feedID == "" {
		return nil, errors.New("feed ID is required")
	}
	if req == nil {
		return nil, errors.New("update feed request is required")
	}

	// Get existing feed
	feed, err := s.feedRepo.GetByID(ctx, feedID)
	if err != nil {
		return nil, fmt.Errorf("failed to get feed: %w", err)
	}

	// Check if user has access through bower ownership
	bower, err := s.bowerRepo.GetByID(ctx, feed.BowerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get bower: %w", err)
	}

	if bower.UserID != userID {
		return nil, errors.New("access denied: not bower owner")
	}

	// Apply updates
	if req.Title != nil {
		if *req.Title == "" {
			return nil, errors.New("feed title cannot be empty")
		}
		feed.Title = *req.Title
	}

	if req.Description != nil {
		feed.Description = *req.Description
	}

	if req.Category != nil {
		feed.Category = *req.Category
	}

	// Update feed
	err = s.feedRepo.Update(ctx, feed)
	if err != nil {
		return nil, fmt.Errorf("failed to update feed: %w", err)
	}

	return feed, nil
}

// DeleteFeed deletes a feed from a bower
func (s *feedService) DeleteFeed(ctx context.Context, userID string, feedID string) error {
	if userID == "" {
		return errors.New("user ID is required")
	}
	if feedID == "" {
		return errors.New("feed ID is required")
	}

	// Get existing feed
	feed, err := s.feedRepo.GetByID(ctx, feedID)
	if err != nil {
		return fmt.Errorf("failed to get feed: %w", err)
	}

	// Check if user has access through bower ownership
	bower, err := s.bowerRepo.GetByID(ctx, feed.BowerID)
	if err != nil {
		return fmt.Errorf("failed to get bower: %w", err)
	}

	if bower.UserID != userID {
		return errors.New("access denied: not bower owner")
	}

	// Check if this is the last feed in the bower
	feeds, err := s.feedRepo.GetByBowerID(ctx, feed.BowerID)
	if err != nil {
		return fmt.Errorf("failed to check bower feeds: %w", err)
	}

	if len(feeds) <= 1 {
		return errors.New("cannot delete the last feed in a bower")
	}

	// Delete feed
	err = s.feedRepo.Delete(ctx, feedID)
	if err != nil {
		return fmt.Errorf("failed to delete feed: %w", err)
	}

	return nil
}

// PreviewFeed fetches and previews a feed without adding it to a bower
func (s *feedService) PreviewFeed(ctx context.Context, userID string, feedURL string) (*FeedPreview, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}
	if feedURL == "" {
		return nil, errors.New("feed URL is required")
	}

	// Validate feed URL
	if err := s.ValidateFeedURL(feedURL); err != nil {
		return &FeedPreview{
			URL:     feedURL,
			IsValid: false,
			Error:   err.Error(),
		}, nil
	}

	// Fetch feed information and articles
	feedData, err := s.rssService.FetchFeed(ctx, feedURL)
	if err != nil {
		return &FeedPreview{
			URL:     feedURL,
			IsValid: false,
			Error:   fmt.Sprintf("Failed to fetch feed: %v", err),
		}, nil
	}

	// Convert articles to preview format
	articles := make([]ArticlePreview, 0, len(feedData.Articles))
	maxArticles := 10 // Limit preview to 10 articles
	for i, article := range feedData.Articles {
		if i >= maxArticles {
			break
		}

		preview := ArticlePreview{
			Title:       article.Title,
			Content:     truncateContent(article.Content, 200),
			URL:         article.URL,
			PublishedAt: article.PublishedAt.Unix(),
		}

		if article.ImageURL != nil {
			preview.ImageURL = *article.ImageURL
		}

		articles = append(articles, preview)
	}

	return &FeedPreview{
		Title:       feedData.Title,
		Description: feedData.Description,
		URL:         feedURL,
		Category:    feedData.Category,
		Articles:    articles,
		IsValid:     true,
	}, nil
}

// ValidateFeedURL validates a feed URL format and accessibility
func (s *feedService) ValidateFeedURL(feedURL string) error {
	if feedURL == "" {
		return errors.New("feed URL is required")
	}

	// Use secure HTTP client validation
	config := httpclient.DefaultSecureHTTPConfig()
	if err := httpclient.ValidateURL(feedURL, config); err != nil {
		return fmt.Errorf("URL security validation failed: %w", err)
	}

	// Parse URL for additional feed-specific validation
	parsedURL, err := url.Parse(feedURL)
	if err != nil {
		return fmt.Errorf("invalid URL format: %w", err)
	}

	// Check for common feed patterns (optional validation)
	path := strings.ToLower(parsedURL.Path)
	query := strings.ToLower(parsedURL.RawQuery)
	
	// Common feed indicators
	feedIndicators := []string{
		"rss", "feed", "atom", "xml", "feeds",
	}

	hasIndicator := false
	for _, indicator := range feedIndicators {
		if strings.Contains(path, indicator) || strings.Contains(query, indicator) {
			hasIndicator = true
			break
		}
	}

	// Also check for common feed file extensions
	feedExtensions := []string{
		".rss", ".xml", ".atom",
	}

	for _, ext := range feedExtensions {
		if strings.HasSuffix(path, ext) {
			hasIndicator = true
			break
		}
	}

	if !hasIndicator {
		// This is just a warning, not an error - some feeds don't follow conventions
		// We'll let the RSS service try to fetch it anyway
	}

	return nil
}

// GetStaleFeeds retrieves feeds that haven't been updated recently
func (s *feedService) GetStaleFeeds(ctx context.Context, maxAgeHours int) ([]*model.Feed, error) {
	if maxAgeHours <= 0 {
		maxAgeHours = 24 // Default to 24 hours
	}

	maxAgeSeconds := int64(maxAgeHours * 3600)
	
	feeds, err := s.feedRepo.GetStaleFeeds(ctx, maxAgeSeconds, 100)
	if err != nil {
		return nil, fmt.Errorf("failed to get stale feeds: %w", err)
	}

	return feeds, nil
}

// validateAddFeedRequest validates the add feed request
func (s *feedService) validateAddFeedRequest(req *AddFeedRequest) error {
	if req.BowerID == "" {
		return errors.New("bower ID is required")
	}
	if req.URL == "" {
		return errors.New("feed URL is required")
	}

	return nil
}

// truncateContent truncates content to a specified length with ellipsis
func truncateContent(content string, maxLength int) string {
	if len(content) <= maxLength {
		return content
	}

	// Find the last space before the limit to avoid cutting words
	truncated := content[:maxLength]
	lastSpace := strings.LastIndex(truncated, " ")
	if lastSpace > 0 && lastSpace > maxLength-20 { // Don't go too far back
		truncated = content[:lastSpace]
	}

	return truncated + "..."
}