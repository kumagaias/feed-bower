package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"

	"feed-bower-api/internal/model"
	"feed-bower-api/internal/repository"
	"feed-bower-api/pkg/bedrock"
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

	// Feed recommendations
	GetFeedRecommendations(ctx context.Context, userID string, bowerID string, keywords []string) ([]*model.Feed, error)

	// Feed auto-registration
	AutoRegisterFeeds(ctx context.Context, userID string, bowerID string, keywords []string, maxFeeds int) (*AutoRegisterResult, error)

	// Feed management
	GetStaleFeeds(ctx context.Context, maxAgeHours int) ([]*model.Feed, error)

	// Feed fetching
	FetchBowerFeeds(ctx context.Context, userID string, bowerID string) (*FetchBowerFeedsResult, error)
}

// AddFeedRequest represents the request to add a feed to a bower
type AddFeedRequest struct {
	BowerID string `json:"bower_id" validate:"required"`
	URL     string `json:"url" validate:"required,url"`
}

// UpdateFeedRequest represents the request to update a feed
type UpdateFeedRequest struct {
	URL         *string `json:"url,omitempty" validate:"omitempty,url"`
	Title       *string `json:"title,omitempty" validate:"omitempty,min=1,max=200"`
	Description *string `json:"description,omitempty" validate:"omitempty,max=1000"`
	Category    *string `json:"category,omitempty" validate:"omitempty,max=50"`
}

// FeedPreview represents a preview of a feed with sample articles
type FeedPreview struct {
	Feed     *FeedPreviewInfo `json:"feed"`
	Articles []ArticlePreview `json:"articles"`
	IsValid  bool             `json:"is_valid"`
	Error    string           `json:"error,omitempty"`
}

// FeedPreviewInfo represents basic feed information for preview
type FeedPreviewInfo struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	URL         string `json:"url"`
	Category    string `json:"category"`
}

// ArticlePreview represents a preview of an article
type ArticlePreview struct {
	Title       string `json:"title"`
	Content     string `json:"content"`
	URL         string `json:"url"`
	PublishedAt int64  `json:"published_at"`
	ImageURL    string `json:"image_url,omitempty"`
}

// AutoRegisterResult represents the result of auto-registering feeds
type AutoRegisterResult struct {
	AddedFeeds   []*model.Feed `json:"added_feeds"`
	SkippedFeeds []string      `json:"skipped_feeds"`
	FailedFeeds  []FailedFeed  `json:"failed_feeds"`
	TotalAdded   int           `json:"total_added"`
	TotalSkipped int           `json:"total_skipped"`
	TotalFailed  int           `json:"total_failed"`
	Source       string        `json:"source"` // "bedrock" or "static_mapping"
}

// FailedFeed represents a feed that failed to be added
type FailedFeed struct {
	URL    string `json:"url"`
	Reason string `json:"reason"`
}

// BedrockClient defines the interface for Bedrock operations
type BedrockClient interface {
	GetFeedRecommendations(ctx context.Context, keywords []string) ([]bedrock.FeedRecommendation, error)
}

// FeedServiceConfig holds configuration for Feed Service
type FeedServiceConfig struct {
	AWSConfig         aws.Config
	BedrockAgentID    string
	BedrockAgentAlias string
	BedrockRegion     string
}

// feedService implements FeedService interface
type feedService struct {
	feedRepo      repository.FeedRepository
	bowerRepo     repository.BowerRepository
	articleRepo   repository.ArticleRepository
	rssService    RSSService
	bedrockClient BedrockClient
}

// NewFeedService creates a new feed service
func NewFeedService(feedRepo repository.FeedRepository, bowerRepo repository.BowerRepository, articleRepo repository.ArticleRepository, rssService RSSService, bedrockClient BedrockClient) FeedService {
	return &feedService{
		feedRepo:      feedRepo,
		bowerRepo:     bowerRepo,
		articleRepo:   articleRepo,
		rssService:    rssService,
		bedrockClient: bedrockClient,
	}
}

// NewFeedServiceWithConfig creates a new feed service with AWS config
func NewFeedServiceWithConfig(feedRepo repository.FeedRepository, bowerRepo repository.BowerRepository, articleRepo repository.ArticleRepository, rssService RSSService, config *FeedServiceConfig) FeedService {
	var bedrockClient BedrockClient

	// Initialize Bedrock client if configured
	if config != nil && config.BedrockAgentID != "" {
		bedrockClient = bedrock.NewClient(config.AWSConfig, config.BedrockAgentID, config.BedrockAgentAlias)
		log.Printf("✅ Bedrock client initialized for feed recommendations")
	}

	return &feedService{
		feedRepo:      feedRepo,
		bowerRepo:     bowerRepo,
		articleRepo:   articleRepo,
		rssService:    rssService,
		bedrockClient: bedrockClient,
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

	log.Printf("[AddFeed] SUCCESS | user_id=%s | bower_id=%s | feed_id=%s | url=%s | title=%s",
		userID, req.BowerID, feed.FeedID, feed.URL, feed.Title)

	// Fetch articles for the newly added feed in background
	go func() {
		bgCtx := context.Background()
		log.Printf("[AddFeed] FETCH_ARTICLES_START | user_id=%s | bower_id=%s | feed_id=%s", userID, req.BowerID, feed.FeedID)
		if err := s.fetchFeedArticles(bgCtx, feed); err != nil {
			log.Printf("[AddFeed] FETCH_ARTICLES_FAILED | user_id=%s | bower_id=%s | feed_id=%s | error=%v",
				userID, req.BowerID, feed.FeedID, err)
		} else {
			log.Printf("[AddFeed] FETCH_ARTICLES_SUCCESS | user_id=%s | bower_id=%s | feed_id=%s",
				userID, req.BowerID, feed.FeedID)
		}
	}()

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

	// Store original URL to check if it changed
	originalURL := feed.URL

	// Check if user has access through bower ownership
	bower, err := s.bowerRepo.GetByID(ctx, feed.BowerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get bower: %w", err)
	}

	if bower.UserID != userID {
		return nil, errors.New("access denied: not bower owner")
	}

	// Apply updates
	if req.URL != nil {
		if *req.URL == "" {
			return nil, errors.New("feed URL cannot be empty")
		}
		// Validate new URL
		if err := s.ValidateFeedURL(*req.URL); err != nil {
			return nil, fmt.Errorf("invalid feed URL: %w", err)
		}
		feed.URL = *req.URL
	}

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

	log.Printf("[UpdateFeed] SUCCESS | user_id=%s | feed_id=%s | url=%s | title=%s",
		userID, feedID, feed.URL, feed.Title)

	// If URL was changed, fetch articles for the updated feed in background
	if req.URL != nil && *req.URL != originalURL {
		go func() {
			bgCtx := context.Background()
			log.Printf("[UpdateFeed] FETCH_ARTICLES_START | user_id=%s | feed_id=%s | new_url=%s", userID, feedID, feed.URL)
			if err := s.fetchFeedArticles(bgCtx, feed); err != nil {
				log.Printf("[UpdateFeed] FETCH_ARTICLES_FAILED | user_id=%s | feed_id=%s | error=%v",
					userID, feedID, err)
			} else {
				log.Printf("[UpdateFeed] FETCH_ARTICLES_SUCCESS | user_id=%s | feed_id=%s",
					userID, feedID)
			}
		}()
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
			Feed: &FeedPreviewInfo{
				URL: feedURL,
			},
			IsValid: false,
			Error:   err.Error(),
		}, nil
	}

	// Fetch feed information and articles
	feedData, err := s.rssService.FetchFeed(ctx, feedURL)
	if err != nil {
		return &FeedPreview{
			Feed: &FeedPreviewInfo{
				URL: feedURL,
			},
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
		Feed: &FeedPreviewInfo{
			Title:       feedData.Title,
			Description: feedData.Description,
			URL:         feedURL,
			Category:    feedData.Category,
		},
		Articles: articles,
		IsValid:  true,
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

// GetFeedRecommendations returns recommended feeds based on keywords
func (s *feedService) GetFeedRecommendations(ctx context.Context, userID string, bowerID string, keywords []string) ([]*model.Feed, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}
	if bowerID == "" {
		return nil, errors.New("bower ID is required")
	}
	if len(keywords) == 0 {
		return nil, errors.New("keywords are required")
	}

	// Log request start with structured information
	log.Printf("[FeedRecommendations] START | user_id=%s | bower_id=%s | keywords=%v | keyword_count=%d",
		userID, bowerID, keywords, len(keywords))

	// Check if user has access to bower
	bower, err := s.bowerRepo.GetByID(ctx, bowerID)
	if err != nil {
		log.Printf("[FeedRecommendations] ERROR | user_id=%s | bower_id=%s | error=bower_not_found | details=%v",
			userID, bowerID, err)
		return nil, fmt.Errorf("bower not found: %w", err)
	}

	if bower.UserID != userID {
		log.Printf("[FeedRecommendations] ERROR | user_id=%s | bower_id=%s | error=access_denied | reason=not_bower_owner",
			userID, bowerID)
		return nil, errors.New("access denied: not bower owner")
	}

	// Get existing feeds to avoid duplicates
	existingFeeds, err := s.feedRepo.GetByBowerID(ctx, bowerID)
	if err != nil {
		log.Printf("[FeedRecommendations] ERROR | user_id=%s | bower_id=%s | error=failed_to_get_existing_feeds | details=%v",
			userID, bowerID, err)
		return nil, fmt.Errorf("failed to get existing feeds: %w", err)
	}

	existingURLs := make(map[string]bool)
	for _, feed := range existingFeeds {
		existingURLs[feed.URL] = true
	}

	log.Printf("[FeedRecommendations] INFO | user_id=%s | bower_id=%s | existing_feeds_count=%d",
		userID, bowerID, len(existingFeeds))

	// Try Bedrock Agent first if configured
	if s.bedrockClient != nil {
		log.Printf("[FeedRecommendations] BEDROCK_START | user_id=%s | bower_id=%s | keywords=%v | method=bedrock_agent",
			userID, bowerID, keywords)
		startTime := time.Now()

		recommendations, err := s.getFeedRecommendationsFromBedrock(ctx, bowerID, keywords, existingURLs)
		latency := time.Since(startTime).Milliseconds()

		if err == nil && len(recommendations) > 0 {
			log.Printf("[FeedRecommendations] BEDROCK_SUCCESS | user_id=%s | bower_id=%s | keywords=%v | feed_count=%d | latency_ms=%d | method=bedrock_agent",
				userID, bowerID, keywords, len(recommendations), latency)

			// Log performance metrics
			s.logPerformanceMetrics("bedrock_agent", latency, len(recommendations), true, "")

			return recommendations, nil
		}

		// Log error and fallback to static mapping
		if err != nil {
			log.Printf("[FeedRecommendations] BEDROCK_ERROR | user_id=%s | bower_id=%s | keywords=%v | latency_ms=%d | error=%v | fallback=static_mapping",
				userID, bowerID, keywords, latency, err)

			// Log performance metrics for failed attempt
			s.logPerformanceMetrics("bedrock_agent", latency, 0, false, err.Error())
		} else {
			log.Printf("[FeedRecommendations] BEDROCK_EMPTY | user_id=%s | bower_id=%s | keywords=%v | latency_ms=%d | feed_count=0 | fallback=static_mapping",
				userID, bowerID, keywords, latency)

			// Log performance metrics for empty result
			s.logPerformanceMetrics("bedrock_agent", latency, 0, true, "")
		}
	} else {
		log.Printf("[FeedRecommendations] BEDROCK_DISABLED | user_id=%s | bower_id=%s | keywords=%v | reason=not_configured | fallback=static_mapping",
			userID, bowerID, keywords)
	}

	// Fallback to static mapping
	log.Printf("[FeedRecommendations] STATIC_MAPPING_START | user_id=%s | bower_id=%s | keywords=%v | method=static_mapping",
		userID, bowerID, keywords)
	startTime := time.Now()

	staticRecommendations := s.getStaticFeedRecommendations(bowerID, keywords, existingURLs)
	latency := time.Since(startTime).Milliseconds()

	log.Printf("[FeedRecommendations] STATIC_MAPPING_SUCCESS | user_id=%s | bower_id=%s | keywords=%v | feed_count=%d | latency_ms=%d | method=static_mapping",
		userID, bowerID, keywords, len(staticRecommendations), latency)

	// Log performance metrics
	s.logPerformanceMetrics("static_mapping", latency, len(staticRecommendations), true, "")

	return staticRecommendations, nil
}

// logPerformanceMetrics logs structured performance metrics for monitoring
func (s *feedService) logPerformanceMetrics(method string, latencyMs int64, feedCount int, success bool, errorMsg string) {
	status := "success"
	if !success {
		status = "failure"
	}

	log.Printf("[PerformanceMetrics] method=%s | latency_ms=%d | feed_count=%d | status=%s | error=%s",
		method, latencyMs, feedCount, status, errorMsg)
}

// getFeedRecommendationsFromBedrock gets feed recommendations from Bedrock Agent
func (s *feedService) getFeedRecommendationsFromBedrock(ctx context.Context, bowerID string, keywords []string, existingURLs map[string]bool) ([]*model.Feed, error) {
	log.Printf("[BedrockIntegration] INVOKE_START | bower_id=%s | keywords=%v | timeout=10s",
		bowerID, keywords)

	// Create context with timeout
	timeoutCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// Call Bedrock Agent
	invokeStart := time.Now()
	bedrockRecommendations, err := s.bedrockClient.GetFeedRecommendations(timeoutCtx, keywords)
	invokeLatency := time.Since(invokeStart).Milliseconds()

	if err != nil {
		log.Printf("[BedrockIntegration] INVOKE_ERROR | bower_id=%s | keywords=%v | latency_ms=%d | error=%v",
			bowerID, keywords, invokeLatency, err)
		return nil, fmt.Errorf("bedrock agent failed: %w", err)
	}

	log.Printf("[BedrockIntegration] INVOKE_SUCCESS | bower_id=%s | keywords=%v | latency_ms=%d | raw_feed_count=%d",
		bowerID, keywords, invokeLatency, len(bedrockRecommendations))

	// Convert Bedrock recommendations to model.Feed
	recommendations := make([]*model.Feed, 0)
	duplicateCount := 0

	for i, rec := range bedrockRecommendations {
		// Skip if URL already exists
		if existingURLs[rec.URL] {
			log.Printf("[BedrockIntegration] SKIP_DUPLICATE | bower_id=%s | url=%s | reason=already_exists",
				bowerID, rec.URL)
			duplicateCount++
			continue
		}

		// Log each recommendation details
		log.Printf("[BedrockIntegration] FEED_RECOMMENDATION | bower_id=%s | index=%d | url=%s | title=%s | category=%s | relevance=%.2f",
			bowerID, i, rec.URL, rec.Title, rec.Category, rec.Relevance)

		// Create feed from recommendation
		feed := model.NewFeed(bowerID, rec.URL, rec.Title, rec.Description, rec.Category)
		recommendations = append(recommendations, feed)

		// Mark as existing to avoid duplicates in this batch
		existingURLs[rec.URL] = true

		// Limit to 10 recommendations
		if len(recommendations) >= 10 {
			log.Printf("[BedrockIntegration] LIMIT_REACHED | bower_id=%s | max_recommendations=10",
				bowerID)
			break
		}
	}

	log.Printf("[BedrockIntegration] CONVERSION_COMPLETE | bower_id=%s | raw_count=%d | duplicate_count=%d | final_count=%d",
		bowerID, len(bedrockRecommendations), duplicateCount, len(recommendations))

	return recommendations, nil
}

// getStaticFeedRecommendations returns feed recommendations using static keyword mapping
func (s *feedService) getStaticFeedRecommendations(bowerID string, keywords []string, existingURLs map[string]bool) []*model.Feed {
	log.Printf("[StaticMapping] START | bower_id=%s | keywords=%v", bowerID, keywords)

	// Static keyword to feed URL mapping
	staticMapping := map[string][]struct {
		URL         string
		Title       string
		Description string
		Category    string
	}{
		"technology": {
			{URL: "https://techcrunch.com/feed/", Title: "TechCrunch", Description: "Latest technology news", Category: "Technology"},
			{URL: "https://www.theverge.com/rss/index.xml", Title: "The Verge", Description: "Technology news and reviews", Category: "Technology"},
			{URL: "https://arstechnica.com/feed/", Title: "Ars Technica", Description: "Technology news and analysis", Category: "Technology"},
		},
		"programming": {
			{URL: "https://dev.to/feed", Title: "DEV Community", Description: "Programming articles and tutorials", Category: "Programming"},
			{URL: "https://stackoverflow.blog/feed/", Title: "Stack Overflow Blog", Description: "Programming insights", Category: "Programming"},
			{URL: "https://github.blog/feed/", Title: "GitHub Blog", Description: "Software development news", Category: "Programming"},
		},
		"ai": {
			{URL: "https://openai.com/blog/rss/", Title: "OpenAI Blog", Description: "AI research and updates", Category: "AI"},
			{URL: "https://deepmind.google/blog/rss.xml", Title: "Google DeepMind", Description: "AI research", Category: "AI"},
		},
		"machine learning": {
			{URL: "https://www.reddit.com/r/MachineLearning/.rss", Title: "r/MachineLearning", Description: "Machine learning discussions", Category: "AI"},
			{URL: "https://machinelearningmastery.com/feed/", Title: "Machine Learning Mastery", Description: "ML tutorials", Category: "AI"},
		},
		"news": {
			{URL: "https://feeds.bbci.co.uk/news/rss.xml", Title: "BBC News", Description: "World news", Category: "News"},
			{URL: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", Title: "New York Times", Description: "News and analysis", Category: "News"},
		},
		"science": {
			{URL: "https://www.nature.com/nature.rss", Title: "Nature", Description: "Scientific research", Category: "Science"},
			{URL: "https://www.sciencedaily.com/rss/all.xml", Title: "Science Daily", Description: "Science news", Category: "Science"},
		},
		"web": {
			{URL: "https://css-tricks.com/feed/", Title: "CSS-Tricks", Description: "Web development tips", Category: "Web Development"},
			{URL: "https://www.smashingmagazine.com/feed/", Title: "Smashing Magazine", Description: "Web design and development", Category: "Web Development"},
		},
		"dev": {
			{URL: "https://dev.to/feed", Title: "DEV Community", Description: "Developer community", Category: "Programming"},
		},
	}

	recommendations := make([]*model.Feed, 0)
	seenURLs := make(map[string]bool)

	// Match keywords to feeds
	for _, keyword := range keywords {
		normalizedKeyword := strings.ToLower(strings.TrimSpace(keyword))
		log.Printf("[StaticMapping] KEYWORD | bower_id=%s | keyword=%s | normalized=%s",
			bowerID, keyword, normalizedKeyword)

		if feeds, ok := staticMapping[normalizedKeyword]; ok {
			log.Printf("[StaticMapping] MATCH_FOUND | bower_id=%s | keyword=%s | feed_count=%d",
				bowerID, normalizedKeyword, len(feeds))

			for _, feedData := range feeds {
				// Skip if already exists or already added in this batch
				if existingURLs[feedData.URL] || seenURLs[feedData.URL] {
					log.Printf("[StaticMapping] SKIP_DUPLICATE | bower_id=%s | url=%s | reason=already_exists",
						bowerID, feedData.URL)
					continue
				}

				log.Printf("[StaticMapping] ADD_FEED | bower_id=%s | url=%s | title=%s | category=%s",
					bowerID, feedData.URL, feedData.Title, feedData.Category)

				feed := model.NewFeed(bowerID, feedData.URL, feedData.Title, feedData.Description, feedData.Category)
				recommendations = append(recommendations, feed)
				seenURLs[feedData.URL] = true

				// Limit to 10 recommendations
				if len(recommendations) >= 10 {
					log.Printf("[StaticMapping] LIMIT_REACHED | bower_id=%s | max_recommendations=10",
						bowerID)
					return recommendations
				}
			}
		} else {
			log.Printf("[StaticMapping] NO_MATCH | bower_id=%s | keyword=%s",
				bowerID, normalizedKeyword)
		}
	}

	log.Printf("[StaticMapping] COMPLETE | bower_id=%s | recommendation_count=%d",
		bowerID, len(recommendations))

	return recommendations
}

// AutoRegisterFeeds automatically registers recommended feeds to a bower
func (s *feedService) AutoRegisterFeeds(ctx context.Context, userID string, bowerID string, keywords []string, maxFeeds int) (*AutoRegisterResult, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}
	if bowerID == "" {
		return nil, errors.New("bower ID is required")
	}
	if len(keywords) == 0 {
		return nil, errors.New("keywords are required")
	}
	if maxFeeds < 1 || maxFeeds > 10 {
		return nil, errors.New("max_feeds must be between 1 and 10")
	}

	log.Printf("[AutoRegisterFeeds] START | user_id=%s | bower_id=%s | keywords=%v | max_feeds=%d",
		userID, bowerID, keywords, maxFeeds)

	// Check if user has access to bower
	bower, err := s.bowerRepo.GetByID(ctx, bowerID)
	if err != nil {
		log.Printf("[AutoRegisterFeeds] ERROR | user_id=%s | bower_id=%s | error=bower_not_found | details=%v",
			userID, bowerID, err)
		return nil, fmt.Errorf("bower not found: %w", err)
	}

	if bower.UserID != userID {
		log.Printf("[AutoRegisterFeeds] ERROR | user_id=%s | bower_id=%s | error=access_denied | reason=not_bower_owner",
			userID, bowerID)
		return nil, errors.New("access denied: not bower owner")
	}

	// Get feed recommendations
	log.Printf("[AutoRegisterFeeds] GET_RECOMMENDATIONS | user_id=%s | bower_id=%s | keywords=%v",
		userID, bowerID, keywords)

	recommendations, err := s.GetFeedRecommendations(ctx, userID, bowerID, keywords)
	if err != nil {
		log.Printf("[AutoRegisterFeeds] ERROR | user_id=%s | bower_id=%s | error=failed_to_get_recommendations | details=%v",
			userID, bowerID, err)
		return nil, fmt.Errorf("failed to get recommendations: %w", err)
	}

	// Determine source based on whether Bedrock was used
	source := "static_mapping"
	if s.bedrockClient != nil && len(recommendations) > 0 {
		// Check if recommendations came from Bedrock by looking at the first feed
		// Static mapping feeds have specific URLs we know
		if len(recommendations) > 0 {
			firstURL := recommendations[0].URL
			// If URL is from our static mapping, it's static
			staticURLs := []string{
				"techcrunch.com", "theverge.com", "arstechnica.com",
				"dev.to", "stackoverflow.blog", "github.blog",
				"openai.com", "deepmind.google",
				"reddit.com/r/MachineLearning", "machinelearningmastery.com",
				"css-tricks.com", "smashingmagazine.com",
			}
			isStatic := false
			for _, staticURL := range staticURLs {
				if strings.Contains(firstURL, staticURL) {
					isStatic = true
					break
				}
			}
			if !isStatic {
				source = "bedrock"
			}
		}
	}

	log.Printf("[AutoRegisterFeeds] RECOMMENDATIONS_RECEIVED | user_id=%s | bower_id=%s | recommendation_count=%d | source=%s",
		userID, bowerID, len(recommendations), source)

	// Limit recommendations to maxFeeds
	if len(recommendations) > maxFeeds {
		recommendations = recommendations[:maxFeeds]
		log.Printf("[AutoRegisterFeeds] LIMIT_APPLIED | user_id=%s | bower_id=%s | limited_to=%d",
			userID, bowerID, maxFeeds)
	}

	// Get existing feeds to check for duplicates
	existingFeeds, err := s.feedRepo.GetByBowerID(ctx, bowerID)
	if err != nil {
		log.Printf("[AutoRegisterFeeds] ERROR | user_id=%s | bower_id=%s | error=failed_to_get_existing_feeds | details=%v",
			userID, bowerID, err)
		return nil, fmt.Errorf("failed to get existing feeds: %w", err)
	}

	existingURLs := make(map[string]bool)
	for _, feed := range existingFeeds {
		existingURLs[feed.URL] = true
	}

	log.Printf("[AutoRegisterFeeds] EXISTING_FEEDS | user_id=%s | bower_id=%s | existing_count=%d",
		userID, bowerID, len(existingFeeds))

	// Process feeds in parallel with controlled concurrency
	type feedResult struct {
		feed   *model.Feed
		url    string
		status string // "added", "skipped", "failed"
		reason string
	}

	resultChan := make(chan feedResult, len(recommendations))

	// Create context with timeout for the entire operation
	processCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// Use a wait group to track goroutine completion
	var wg sync.WaitGroup
	semaphore := make(chan struct{}, 5) // Limit to 5 concurrent operations

	// Process each recommendation
	for _, rec := range recommendations {
		wg.Add(1)
		semaphore <- struct{}{} // Acquire semaphore

		go func(recommendation *model.Feed) {
			defer wg.Done()
			defer func() { <-semaphore }() // Release semaphore

			// Create individual timeout for each feed validation
			feedCtx, feedCancel := context.WithTimeout(processCtx, 5*time.Second)
			defer feedCancel()

			result := feedResult{
				url: recommendation.URL,
			}

			// Check if URL already exists
			if existingURLs[recommendation.URL] {
				result.status = "skipped"
				result.reason = "feed URL already exists in this bower"
				log.Printf("[AutoRegisterFeeds] SKIP_DUPLICATE | user_id=%s | bower_id=%s | url=%s",
					userID, bowerID, recommendation.URL)
				resultChan <- result
				return
			}

			// Validate feed URL
			if err := s.ValidateFeedURL(recommendation.URL); err != nil {
				result.status = "failed"
				result.reason = fmt.Sprintf("invalid feed URL: %v", err)
				log.Printf("[AutoRegisterFeeds] VALIDATION_FAILED | user_id=%s | bower_id=%s | url=%s | error=%v",
					userID, bowerID, recommendation.URL, err)
				resultChan <- result
				return
			}

			// Fetch feed information to verify it's a valid RSS/Atom feed (with retry)
			var feedInfo *model.FeedInfo
			var err error
			maxRetries := 3
			retryDelay := 1 * time.Second

			for attempt := 1; attempt <= maxRetries; attempt++ {
				feedInfo, err = s.rssService.FetchFeedInfo(feedCtx, recommendation.URL)
				if err == nil {
					break // Success
				}

				if attempt < maxRetries {
					log.Printf("[AutoRegisterFeeds] FETCH_RETRY | user_id=%s | bower_id=%s | url=%s | attempt=%d/%d | error=%v",
						userID, bowerID, recommendation.URL, attempt, maxRetries, err)
					time.Sleep(retryDelay)
					retryDelay *= 2 // Exponential backoff
				}
			}

			if err != nil {
				result.status = "failed"
				result.reason = fmt.Sprintf("failed to fetch feed after %d attempts: %v", maxRetries, err)
				log.Printf("[AutoRegisterFeeds] FETCH_FAILED | user_id=%s | bower_id=%s | url=%s | attempts=%d | error=%v",
					userID, bowerID, recommendation.URL, maxRetries, err)
				resultChan <- result
				return
			}

			// Update feed with fetched information
			feed := model.NewFeed(bowerID, recommendation.URL, feedInfo.Title, feedInfo.Description, feedInfo.Category)

			// Create feed in repository
			if err := s.feedRepo.Create(feedCtx, feed); err != nil {
				result.status = "failed"
				result.reason = fmt.Sprintf("failed to create feed: %v", err)
				log.Printf("[AutoRegisterFeeds] CREATE_FAILED | user_id=%s | bower_id=%s | url=%s | error=%v",
					userID, bowerID, recommendation.URL, err)
				resultChan <- result
				return
			}

			result.status = "added"
			result.feed = feed
			log.Printf("[AutoRegisterFeeds] FEED_ADDED | user_id=%s | bower_id=%s | feed_id=%s | url=%s | title=%s",
				userID, bowerID, feed.FeedID, feed.URL, feed.Title)
			resultChan <- result

			// Add small delay between operations to avoid overwhelming external services
			time.Sleep(100 * time.Millisecond)
		}(rec)
	}

	// Wait for all goroutines to complete, then close the channel
	go func() {
		wg.Wait()
		close(resultChan)
	}()

	// Collect results
	result := &AutoRegisterResult{
		AddedFeeds:   make([]*model.Feed, 0),
		SkippedFeeds: make([]string, 0),
		FailedFeeds:  make([]FailedFeed, 0),
	}

	for res := range resultChan {
		switch res.status {
		case "added":
			result.AddedFeeds = append(result.AddedFeeds, res.feed)
			result.TotalAdded++
		case "skipped":
			result.SkippedFeeds = append(result.SkippedFeeds, res.url)
			result.TotalSkipped++
		case "failed":
			result.FailedFeeds = append(result.FailedFeeds, FailedFeed{
				URL:    res.url,
				Reason: res.reason,
			})
			result.TotalFailed++
		}
	}

	log.Printf("[AutoRegisterFeeds] COMPLETE | user_id=%s | bower_id=%s | total_added=%d | total_skipped=%d | total_failed=%d | source=%s",
		userID, bowerID, result.TotalAdded, result.TotalSkipped, result.TotalFailed, source)

	result.Source = source
	return result, nil
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

// FetchBowerFeedsResult represents the result of fetching feeds for a bower
type FetchBowerFeedsResult struct {
	TotalFeeds      int `json:"total_feeds"`
	TotalArticles   int `json:"total_articles"`
	SuccessfulFeeds int `json:"successful_feeds"`
	FailedFeeds     int `json:"failed_feeds"`
}

// FetchBowerFeeds fetches articles from all feeds in a bower
func (s *feedService) FetchBowerFeeds(ctx context.Context, userID string, bowerID string) (*FetchBowerFeedsResult, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}
	if bowerID == "" {
		return nil, errors.New("bower ID is required")
	}

	log.Printf("[FetchBowerFeeds] START | user_id=%s | bower_id=%s", userID, bowerID)

	// Check if user has access to bower
	bower, err := s.bowerRepo.GetByID(ctx, bowerID)
	if err != nil {
		log.Printf("[FetchBowerFeeds] ERROR | user_id=%s | bower_id=%s | error=bower_not_found", userID, bowerID)
		return nil, fmt.Errorf("bower not found: %w", err)
	}

	if bower.UserID != userID {
		log.Printf("[FetchBowerFeeds] ERROR | user_id=%s | bower_id=%s | error=access_denied", userID, bowerID)
		return nil, errors.New("access denied: not bower owner")
	}

	// Get all feeds for the bower
	feeds, err := s.feedRepo.GetByBowerID(ctx, bowerID)
	if err != nil {
		log.Printf("[FetchBowerFeeds] ERROR | user_id=%s | bower_id=%s | error=failed_to_get_feeds", userID, bowerID)
		return nil, fmt.Errorf("failed to get feeds: %w", err)
	}

	if len(feeds) == 0 {
		log.Printf("[FetchBowerFeeds] NO_FEEDS | user_id=%s | bower_id=%s", userID, bowerID)
		return &FetchBowerFeedsResult{
			TotalFeeds:      0,
			TotalArticles:   0,
			SuccessfulFeeds: 0,
			FailedFeeds:     0,
		}, nil
	}

	log.Printf("[FetchBowerFeeds] FEEDS_FOUND | user_id=%s | bower_id=%s | count=%d", userID, bowerID, len(feeds))

	result := &FetchBowerFeedsResult{
		TotalFeeds: len(feeds),
	}

	// Fetch articles from each feed
	for i, feed := range feeds {
		log.Printf("[FetchBowerFeeds] FETCHING | user_id=%s | bower_id=%s | feed=%d/%d | url=%s",
			userID, bowerID, i+1, len(feeds), feed.URL)

		// Fetch feed data
		feedData, err := s.rssService.FetchFeed(ctx, feed.URL)
		if err != nil {
			log.Printf("[FetchBowerFeeds] FETCH_FAILED | user_id=%s | bower_id=%s | feed_id=%s | error=%v",
				userID, bowerID, feed.FeedID, err)
			result.FailedFeeds++
			continue
		}

		log.Printf("[FetchBowerFeeds] FETCHED | user_id=%s | bower_id=%s | feed_id=%s | articles=%d",
			userID, bowerID, feed.FeedID, len(feedData.Articles))

		// Save articles to DynamoDB
		if len(feedData.Articles) > 0 {
			// Check for duplicates and save new articles
			newArticles := make([]*model.Article, 0)
			for _, articleData := range feedData.Articles {
				// Check if article already exists by URL
				existing, err := s.articleRepo.GetByURL(ctx, articleData.URL)
				if err == nil && existing != nil {
					// Article already exists, skip
					continue
				}

				// Convert ArticleData to model.Article
				article := &model.Article{
					FeedID:      feed.FeedID,
					Title:       articleData.Title,
					Content:     articleData.Content,
					URL:         articleData.URL,
					PublishedAt: articleData.PublishedAt.Unix(),
					ImageURL:    articleData.ImageURL,
					CreatedAt:   time.Now().Unix(),
				}
				newArticles = append(newArticles, article)
			}

			if len(newArticles) > 0 {
				log.Printf("[FetchBowerFeeds] SAVING | user_id=%s | bower_id=%s | feed_id=%s | new_articles=%d",
					userID, bowerID, feed.FeedID, len(newArticles))

				// Batch create articles
				err = s.articleRepo.BatchCreate(ctx, newArticles)
				if err != nil {
					log.Printf("[FetchBowerFeeds] SAVE_FAILED | user_id=%s | bower_id=%s | feed_id=%s | error=%v",
						userID, bowerID, feed.FeedID, err)
				} else {
					log.Printf("[FetchBowerFeeds] SAVED | user_id=%s | bower_id=%s | feed_id=%s | saved=%d",
						userID, bowerID, feed.FeedID, len(newArticles))
				}
			}
		}

		result.TotalArticles += len(feedData.Articles)
		result.SuccessfulFeeds++
	}

	log.Printf("[FetchBowerFeeds] COMPLETE | user_id=%s | bower_id=%s | total_feeds=%d | successful=%d | failed=%d | total_articles=%d",
		userID, bowerID, result.TotalFeeds, result.SuccessfulFeeds, result.FailedFeeds, result.TotalArticles)

	return result, nil
}

// fetchFeedArticles fetches and saves articles for a single feed
func (s *feedService) fetchFeedArticles(ctx context.Context, feed *model.Feed) error {
	if feed == nil {
		return errors.New("feed is required")
	}

	// Fetch feed data
	feedData, err := s.rssService.FetchFeed(ctx, feed.URL)
	if err != nil {
		return fmt.Errorf("failed to fetch feed data: %w", err)
	}

	if len(feedData.Articles) == 0 {
		log.Printf("[FetchFeedArticles] NO_ARTICLES | feed_id=%s | url=%s", feed.FeedID, feed.URL)
		return nil
	}

	log.Printf("[FetchFeedArticles] ARTICLES_FOUND | feed_id=%s | url=%s | count=%d",
		feed.FeedID, feed.URL, len(feedData.Articles))

	// Note: Article saving would be implemented here when article repository is available
	// For now, we just log the success
	log.Printf("[FetchFeedArticles] ARTICLES_PROCESSED | feed_id=%s | count=%d",
		feed.FeedID, len(feedData.Articles))

	return nil
}
