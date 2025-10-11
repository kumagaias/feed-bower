package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"

	"feed-bower-api/internal/model"
	"feed-bower-api/internal/repository"
)

// ChickService defines the interface for chick (mascot) operations
type ChickService interface {
	// Stats management
	GetStats(ctx context.Context, userID string) (*model.ChickStats, error)
	UpdateStats(ctx context.Context, userID string, req *UpdateStatsRequest) (*ChickStatsResponse, error)
	
	// Like management (integrated with stats)
	AddLike(ctx context.Context, userID string, articleID string) (*ChickStatsResponse, error)
	RemoveLike(ctx context.Context, userID string, articleID string) (*ChickStatsResponse, error)
	
	// Date checking
	CheckDate(ctx context.Context, userID string, date string) (*ChickStatsResponse, error)
	
	// Liked articles
	GetLikedArticles(ctx context.Context, userID string, limit int32, lastKey map[string]types.AttributeValue) (*LikedArticlesResponse, error)
	
	// Reset (for debugging)
	ResetStats(ctx context.Context, userID string) error
}

// UpdateStatsRequest represents a request to update chick stats
type UpdateStatsRequest struct {
	Action string `json:"action" validate:"required,oneof=add_like remove_like check_date"`
	Data   string `json:"data,omitempty"` // For check_date, this is the date string
}

// ChickStatsResponse represents the response with updated stats and level up info
type ChickStatsResponse struct {
	Stats     *model.ChickStats `json:"stats"`
	LeveledUp bool              `json:"leveled_up"`
	OldLevel  int               `json:"old_level,omitempty"`
	NewLevel  int               `json:"new_level,omitempty"`
}

// LikedArticlesResponse represents the response for liked articles
type LikedArticlesResponse struct {
	Articles []EnrichedLikedArticle          `json:"articles"`
	Total    int                             `json:"total"`
	HasMore  bool                            `json:"has_more"`
	LastKey  map[string]types.AttributeValue `json:"last_key,omitempty"`
}

// EnrichedLikedArticle represents a liked article with full details
type EnrichedLikedArticle struct {
	model.LikedArticle
	Title    string  `json:"title"`
	URL      string  `json:"url"`
	Bower    *string `json:"bower,omitempty"`
	ImageURL *string `json:"image_url,omitempty"`
}

// chickService implements ChickService interface
type chickService struct {
	chickRepo   repository.ChickRepository
	articleRepo repository.ArticleRepository
	feedRepo    repository.FeedRepository
	bowerRepo   repository.BowerRepository
}

// NewChickService creates a new chick service
func NewChickService(
	chickRepo repository.ChickRepository,
	articleRepo repository.ArticleRepository,
	feedRepo repository.FeedRepository,
	bowerRepo repository.BowerRepository,
) ChickService {
	return &chickService{
		chickRepo:   chickRepo,
		articleRepo: articleRepo,
		feedRepo:    feedRepo,
		bowerRepo:   bowerRepo,
	}
}

// GetStats retrieves chick stats for a user
func (s *chickService) GetStats(ctx context.Context, userID string) (*model.ChickStats, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}

	stats, err := s.chickRepo.GetStats(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get chick stats: %w", err)
	}

	return stats, nil
}

// UpdateStats updates chick stats based on the action
func (s *chickService) UpdateStats(ctx context.Context, userID string, req *UpdateStatsRequest) (*ChickStatsResponse, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}
	if req == nil {
		return nil, errors.New("update stats request is required")
	}

	switch req.Action {
	case "add_like":
		return s.AddLike(ctx, userID, req.Data)
	case "remove_like":
		return s.RemoveLike(ctx, userID, req.Data)
	case "check_date":
		return s.CheckDate(ctx, userID, req.Data)
	default:
		return nil, fmt.Errorf("invalid action: %s", req.Action)
	}
}

// AddLike adds a like and updates chick stats
func (s *chickService) AddLike(ctx context.Context, userID string, articleID string) (*ChickStatsResponse, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}
	if articleID == "" {
		return nil, errors.New("article ID is required")
	}

	// Get current stats
	stats, err := s.chickRepo.GetStats(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get current stats: %w", err)
	}

	oldLevel := stats.Level

	// Check if article is already liked
	isLiked, err := s.chickRepo.IsArticleLiked(ctx, userID, articleID)
	if err != nil {
		return nil, fmt.Errorf("failed to check like status: %w", err)
	}

	if isLiked {
		return nil, errors.New("article is already liked")
	}

	// Add the like
	likedArticle := model.NewLikedArticle(userID, articleID)
	err = s.chickRepo.AddLikedArticle(ctx, likedArticle)
	if err != nil {
		return nil, fmt.Errorf("failed to add liked article: %w", err)
	}

	// Update stats
	leveledUp := stats.AddLike()
	err = s.chickRepo.UpdateStats(ctx, stats)
	if err != nil {
		return nil, fmt.Errorf("failed to update stats: %w", err)
	}

	response := &ChickStatsResponse{
		Stats:     stats,
		LeveledUp: leveledUp,
	}

	if leveledUp {
		response.OldLevel = oldLevel
		response.NewLevel = stats.Level
	}

	return response, nil
}

// RemoveLike removes a like and updates chick stats
func (s *chickService) RemoveLike(ctx context.Context, userID string, articleID string) (*ChickStatsResponse, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}
	if articleID == "" {
		return nil, errors.New("article ID is required")
	}

	// Get current stats
	stats, err := s.chickRepo.GetStats(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get current stats: %w", err)
	}

	// Check if article is liked
	isLiked, err := s.chickRepo.IsArticleLiked(ctx, userID, articleID)
	if err != nil {
		return nil, fmt.Errorf("failed to check like status: %w", err)
	}

	if !isLiked {
		return nil, errors.New("article is not liked")
	}

	// Remove the like
	err = s.chickRepo.RemoveLikedArticle(ctx, userID, articleID)
	if err != nil {
		return nil, fmt.Errorf("failed to remove liked article: %w", err)
	}

	// Update stats
	stats.RemoveLike()
	err = s.chickRepo.UpdateStats(ctx, stats)
	if err != nil {
		return nil, fmt.Errorf("failed to update stats: %w", err)
	}

	return &ChickStatsResponse{
		Stats:     stats,
		LeveledUp: false,
	}, nil
}

// CheckDate checks a date and updates chick stats if it's a new date
func (s *chickService) CheckDate(ctx context.Context, userID string, date string) (*ChickStatsResponse, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}
	if date == "" {
		return nil, errors.New("date is required")
	}

	// Validate date format (YYYY-MM-DD)
	_, err := time.Parse("2006-01-02", date)
	if err != nil {
		return nil, fmt.Errorf("invalid date format, expected YYYY-MM-DD: %w", err)
	}

	// Get current stats
	stats, err := s.chickRepo.GetStats(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get current stats: %w", err)
	}

	oldLevel := stats.Level

	// Add checked date (returns true if it's a new date)
	leveledUp := stats.AddCheckedDate(date)

	// Update stats
	err = s.chickRepo.UpdateStats(ctx, stats)
	if err != nil {
		return nil, fmt.Errorf("failed to update stats: %w", err)
	}

	response := &ChickStatsResponse{
		Stats:     stats,
		LeveledUp: leveledUp,
	}

	if leveledUp {
		response.OldLevel = oldLevel
		response.NewLevel = stats.Level
	}

	return response, nil
}

// GetLikedArticles retrieves liked articles with full article details
func (s *chickService) GetLikedArticles(ctx context.Context, userID string, limit int32, lastKey map[string]types.AttributeValue) (*LikedArticlesResponse, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}

	if limit <= 0 {
		limit = 50
	}

	// Get liked articles
	likedArticles, nextKey, err := s.chickRepo.GetLikedArticles(ctx, userID, limit, lastKey)
	if err != nil {
		return nil, fmt.Errorf("failed to get liked articles: %w", err)
	}

	if len(likedArticles) == 0 {
		return &LikedArticlesResponse{
			Articles: []EnrichedLikedArticle{},
			Total:    0,
			HasMore:  false,
		}, nil
	}

	// Enrich with article details
	enrichedArticles := make([]EnrichedLikedArticle, 0, len(likedArticles))

	for _, likedArticle := range likedArticles {
		// Get article details
		article, err := s.articleRepo.GetByID(ctx, likedArticle.ArticleID)
		if err != nil {
			// Skip if article not found (might have been deleted)
			continue
		}

		// Get bower name through feed
		feed, err := s.feedRepo.GetByID(ctx, article.FeedID)
		if err != nil {
			// Skip if feed not found
			continue
		}

		bower, err := s.bowerRepo.GetByID(ctx, feed.BowerID)
		if err != nil {
			// Skip if bower not found
			continue
		}

		// Check if user still has access to this article
		if bower.UserID != userID && !bower.IsPublic {
			// Skip if no access
			continue
		}

		enriched := EnrichedLikedArticle{
			LikedArticle: *likedArticle,
			Title:        article.Title,
			URL:          article.URL,
			Bower:        &bower.Name,
		}

		if article.ImageURL != nil {
			enriched.ImageURL = article.ImageURL
		}

		enrichedArticles = append(enrichedArticles, enriched)
	}

	return &LikedArticlesResponse{
		Articles: enrichedArticles,
		Total:    len(enrichedArticles),
		HasMore:  nextKey != nil,
		LastKey:  nextKey,
	}, nil
}

// ResetStats resets chick stats for a user (for debugging)
func (s *chickService) ResetStats(ctx context.Context, userID string) error {
	if userID == "" {
		return errors.New("user ID is required")
	}

	// Create new default stats
	newStats := model.NewChickStats(userID)

	// Update stats
	err := s.chickRepo.UpdateStats(ctx, newStats)
	if err != nil {
		return fmt.Errorf("failed to reset stats: %w", err)
	}

	// Remove all liked articles
	likedArticles, _, err := s.chickRepo.GetLikedArticles(ctx, userID, 1000, nil)
	if err != nil {
		return fmt.Errorf("failed to get liked articles for reset: %w", err)
	}

	for _, likedArticle := range likedArticles {
		err = s.chickRepo.RemoveLikedArticle(ctx, userID, likedArticle.ArticleID)
		if err != nil {
			// Continue with other articles even if one fails
			continue
		}
	}

	return nil
}

// GetTodayDate returns today's date in YYYY-MM-DD format
func GetTodayDate() string {
	return time.Now().Format("2006-01-02")
}

// IsValidDateFormat checks if a date string is in valid YYYY-MM-DD format
func IsValidDateFormat(date string) bool {
	_, err := time.Parse("2006-01-02", date)
	return err == nil
}