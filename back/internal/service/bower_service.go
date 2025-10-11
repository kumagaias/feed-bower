package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"

	"feed-bower-api/internal/model"
	"feed-bower-api/internal/repository"
)

// BowerService defines the interface for bower operations
type BowerService interface {
	// Bower CRUD operations
	CreateBower(ctx context.Context, userID string, req *CreateBowerRequest) (*model.Bower, error)
	GetBowerByID(ctx context.Context, bowerID string, userID string) (*model.Bower, error)
	GetBowersByUserID(ctx context.Context, userID string, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Bower, map[string]types.AttributeValue, error)
	UpdateBower(ctx context.Context, userID string, bowerID string, req *UpdateBowerRequest) (*model.Bower, error)
	DeleteBower(ctx context.Context, userID string, bowerID string) error
	
	// Public bowers
	GetPublicBowers(ctx context.Context, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Bower, map[string]types.AttributeValue, error)
	
	// Search
	SearchBowers(ctx context.Context, userID string, query string, limit int32) ([]*model.Bower, error)
	
	// Bower name generation
	GenerateBowerName(keywords []string) string
}

// CreateBowerRequest represents the request to create a bower
type CreateBowerRequest struct {
	Name     string   `json:"name" validate:"required,min=1,max=50"`
	Keywords []string `json:"keywords" validate:"required,min=1,max=8,dive,min=1,max=20"`
	Color    string   `json:"color" validate:"omitempty,hexcolor"`
	IsPublic bool     `json:"is_public"`
}

// UpdateBowerRequest represents the request to update a bower
type UpdateBowerRequest struct {
	Name     *string   `json:"name,omitempty" validate:"omitempty,min=1,max=50"`
	Keywords *[]string `json:"keywords,omitempty" validate:"omitempty,min=1,max=8,dive,min=1,max=20"`
	Color    *string   `json:"color,omitempty" validate:"omitempty,hexcolor"`
	IsPublic *bool     `json:"is_public,omitempty"`
}

// bowerService implements BowerService interface
type bowerService struct {
	bowerRepo repository.BowerRepository
	feedRepo  repository.FeedRepository
}

// NewBowerService creates a new bower service
func NewBowerService(bowerRepo repository.BowerRepository, feedRepo repository.FeedRepository) BowerService {
	return &bowerService{
		bowerRepo: bowerRepo,
		feedRepo:  feedRepo,
	}
}

// Default colors for bowers
var defaultColors = []string{
	"#14b8a6", // Teal
	"#f59e0b", // Amber
	"#8b5cf6", // Violet
	"#ef4444", // Red
	"#10b981", // Emerald
	"#3b82f6", // Blue
	"#f97316", // Orange
	"#ec4899", // Pink
}

// CreateBower creates a new bower for a user
func (s *bowerService) CreateBower(ctx context.Context, userID string, req *CreateBowerRequest) (*model.Bower, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}
	if req == nil {
		return nil, errors.New("create bower request is required")
	}

	// Validate request
	if err := s.validateCreateBowerRequest(req); err != nil {
		return nil, fmt.Errorf("invalid request: %w", err)
	}

	// Generate bower name if not provided
	name := req.Name
	if name == "" {
		name = s.GenerateBowerName(req.Keywords)
	}

	// Set default color if not provided
	color := req.Color
	if color == "" {
		// Use a hash of the user ID to consistently pick a color
		colorIndex := len(userID) % len(defaultColors)
		color = defaultColors[colorIndex]
	}

	// Create bower
	bower := model.NewBower(userID, name, req.Keywords, color, req.IsPublic)

	err := s.bowerRepo.Create(ctx, bower)
	if err != nil {
		return nil, fmt.Errorf("failed to create bower: %w", err)
	}

	return bower, nil
}

// GetBowerByID retrieves a bower by ID, ensuring user has access
func (s *bowerService) GetBowerByID(ctx context.Context, bowerID string, userID string) (*model.Bower, error) {
	if bowerID == "" {
		return nil, errors.New("bower ID is required")
	}
	if userID == "" {
		return nil, errors.New("user ID is required")
	}

	bower, err := s.bowerRepo.GetByID(ctx, bowerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get bower: %w", err)
	}

	// Check if user has access (owner or public bower)
	if bower.UserID != userID && !bower.IsPublic {
		return nil, errors.New("access denied: bower is private")
	}

	// Load associated feeds
	feeds, err := s.feedRepo.GetByBowerID(ctx, bowerID)
	if err != nil {
		return nil, fmt.Errorf("failed to load bower feeds: %w", err)
	}

	// Convert to model.Feed slice
	bower.Feeds = make([]model.Feed, len(feeds))
	for i, feed := range feeds {
		bower.Feeds[i] = *feed
	}

	return bower, nil
}

// GetBowersByUserID retrieves bowers for a specific user
func (s *bowerService) GetBowersByUserID(ctx context.Context, userID string, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Bower, map[string]types.AttributeValue, error) {
	if userID == "" {
		return nil, nil, errors.New("user ID is required")
	}

	bowers, nextKey, err := s.bowerRepo.GetByUserID(ctx, userID, limit, lastKey)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get user bowers: %w", err)
	}

	// Load feeds for each bower
	for _, bower := range bowers {
		feeds, err := s.feedRepo.GetByBowerID(ctx, bower.BowerID)
		if err != nil {
			// Log error but don't fail the entire request
			continue
		}

		// Convert to model.Feed slice
		bower.Feeds = make([]model.Feed, len(feeds))
		for i, feed := range feeds {
			bower.Feeds[i] = *feed
		}
	}

	return bowers, nextKey, nil
}

// UpdateBower updates an existing bower
func (s *bowerService) UpdateBower(ctx context.Context, userID string, bowerID string, req *UpdateBowerRequest) (*model.Bower, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}
	if bowerID == "" {
		return nil, errors.New("bower ID is required")
	}
	if req == nil {
		return nil, errors.New("update bower request is required")
	}

	// Get existing bower
	bower, err := s.bowerRepo.GetByID(ctx, bowerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get bower: %w", err)
	}

	// Check ownership
	if bower.UserID != userID {
		return nil, errors.New("access denied: not bower owner")
	}

	// Apply updates
	if req.Name != nil {
		if *req.Name == "" {
			return nil, errors.New("bower name cannot be empty")
		}
		bower.Name = *req.Name
	}

	if req.Keywords != nil {
		if len(*req.Keywords) == 0 {
			return nil, errors.New("bower must have at least one keyword")
		}
		if len(*req.Keywords) > 8 {
			return nil, errors.New("bower cannot have more than 8 keywords")
		}
		bower.Keywords = *req.Keywords
	}

	if req.Color != nil {
		bower.Color = *req.Color
	}

	if req.IsPublic != nil {
		bower.IsPublic = *req.IsPublic
	}

	// Update bower
	err = s.bowerRepo.Update(ctx, bower)
	if err != nil {
		return nil, fmt.Errorf("failed to update bower: %w", err)
	}

	// Load associated feeds
	feeds, err := s.feedRepo.GetByBowerID(ctx, bowerID)
	if err != nil {
		return nil, fmt.Errorf("failed to load bower feeds: %w", err)
	}

	// Convert to model.Feed slice
	bower.Feeds = make([]model.Feed, len(feeds))
	for i, feed := range feeds {
		bower.Feeds[i] = *feed
	}

	return bower, nil
}

// DeleteBower deletes a bower and all its associated feeds
func (s *bowerService) DeleteBower(ctx context.Context, userID string, bowerID string) error {
	if userID == "" {
		return errors.New("user ID is required")
	}
	if bowerID == "" {
		return errors.New("bower ID is required")
	}

	// Get existing bower
	bower, err := s.bowerRepo.GetByID(ctx, bowerID)
	if err != nil {
		return fmt.Errorf("failed to get bower: %w", err)
	}

	// Check ownership
	if bower.UserID != userID {
		return errors.New("access denied: not bower owner")
	}

	// Delete associated feeds first
	feeds, err := s.feedRepo.GetByBowerID(ctx, bowerID)
	if err != nil {
		return fmt.Errorf("failed to get bower feeds: %w", err)
	}

	for _, feed := range feeds {
		err = s.feedRepo.Delete(ctx, feed.FeedID)
		if err != nil {
			// Log error but continue with deletion
			continue
		}
	}

	// Delete bower
	err = s.bowerRepo.Delete(ctx, bowerID)
	if err != nil {
		return fmt.Errorf("failed to delete bower: %w", err)
	}

	return nil
}

// GetPublicBowers retrieves public bowers
func (s *bowerService) GetPublicBowers(ctx context.Context, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Bower, map[string]types.AttributeValue, error) {
	bowers, nextKey, err := s.bowerRepo.ListPublic(ctx, limit, lastKey)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get public bowers: %w", err)
	}

	// Load feeds for each bower
	for _, bower := range bowers {
		feeds, err := s.feedRepo.GetByBowerID(ctx, bower.BowerID)
		if err != nil {
			// Log error but don't fail the entire request
			continue
		}

		// Convert to model.Feed slice
		bower.Feeds = make([]model.Feed, len(feeds))
		for i, feed := range feeds {
			bower.Feeds[i] = *feed
		}
	}

	return bowers, nextKey, nil
}

// SearchBowers searches for bowers by name or keywords
func (s *bowerService) SearchBowers(ctx context.Context, userID string, query string, limit int32) ([]*model.Bower, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}
	if query == "" {
		return nil, errors.New("search query is required")
	}

	bowers, err := s.bowerRepo.Search(ctx, userID, query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to search bowers: %w", err)
	}

	// Load feeds for each bower
	for _, bower := range bowers {
		feeds, err := s.feedRepo.GetByBowerID(ctx, bower.BowerID)
		if err != nil {
			// Log error but don't fail the entire request
			continue
		}

		// Convert to model.Feed slice
		bower.Feeds = make([]model.Feed, len(feeds))
		for i, feed := range feeds {
			bower.Feeds[i] = *feed
		}
	}

	return bowers, nil
}

// GenerateBowerName generates a bower name from keywords
func (s *bowerService) GenerateBowerName(keywords []string) string {
	if len(keywords) == 0 {
		return "New Bower"
	}

	// Take first 2-3 keywords and join them
	maxKeywords := 3
	if len(keywords) < maxKeywords {
		maxKeywords = len(keywords)
	}

	selectedKeywords := keywords[:maxKeywords]
	
	// Join with appropriate separator based on language detection
	// Simple heuristic: if any keyword contains Japanese characters, use Japanese separator
	hasJapanese := false
	for _, keyword := range selectedKeywords {
		for _, r := range keyword {
			if r >= 0x3040 && r <= 0x309F || // Hiragana
				r >= 0x30A0 && r <= 0x30FF || // Katakana
				r >= 0x4E00 && r <= 0x9FAF {   // CJK Unified Ideographs
				hasJapanese = true
				break
			}
		}
		if hasJapanese {
			break
		}
	}

	if hasJapanese {
		return strings.Join(selectedKeywords, "・")
	} else {
		return strings.Join(selectedKeywords, " & ")
	}
}

// validateCreateBowerRequest validates the create bower request
func (s *bowerService) validateCreateBowerRequest(req *CreateBowerRequest) error {
	if len(req.Keywords) == 0 {
		return errors.New("at least one keyword is required")
	}
	if len(req.Keywords) > 8 {
		return errors.New("maximum 8 keywords allowed")
	}

	// Validate each keyword
	for i, keyword := range req.Keywords {
		if keyword == "" {
			return fmt.Errorf("keyword %d cannot be empty", i+1)
		}
		if len(keyword) > 20 {
			return fmt.Errorf("keyword %d is too long (max 20 characters)", i+1)
		}
	}

	// Check for duplicate keywords
	keywordMap := make(map[string]bool)
	for _, keyword := range req.Keywords {
		if keywordMap[keyword] {
			return fmt.Errorf("duplicate keyword: %s", keyword)
		}
		keywordMap[keyword] = true
	}

	return nil
}