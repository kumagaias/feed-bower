package service

import (
	"context"
	"errors"
	"fmt"
	"sort"

	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"

	"feed-bower-api/internal/model"
	"feed-bower-api/internal/repository"
)

// ArticleService defines the interface for article operations
type ArticleService interface {
	// Article retrieval
	GetArticles(ctx context.Context, userID string, req *GetArticlesRequest) (*ArticleListResponse, error)
	GetArticleByID(ctx context.Context, articleID string, userID string) (*model.Article, error)

	// Like management
	LikeArticle(ctx context.Context, userID string, articleID string) error
	UnlikeArticle(ctx context.Context, userID string, articleID string) error

	// Read management
	MarkArticleAsRead(ctx context.Context, userID string, articleID string) error

	// Search
	SearchArticles(ctx context.Context, userID string, req *SearchArticlesRequest) ([]*model.Article, error)

	// Batch operations for RSS updates
	CreateArticles(ctx context.Context, articles []*model.Article) error
}

// GetArticlesRequest represents the request to get articles
type GetArticlesRequest struct {
	BowerID   *string                         `json:"bower_id,omitempty"`
	Tab       string                          `json:"tab" validate:"oneof=all important liked"`
	Limit     int32                           `json:"limit" validate:"min=1,max=100"`
	LastKey   map[string]types.AttributeValue `json:"last_key,omitempty"`
	SortBy    string                          `json:"sort_by" validate:"oneof=published_at created_at"`
	SortOrder string                          `json:"sort_order" validate:"oneof=asc desc"`
}

// SearchArticlesRequest represents the request to search articles
type SearchArticlesRequest struct {
	Query   string  `json:"query" validate:"required,min=1"`
	BowerID *string `json:"bower_id,omitempty"`
	Limit   int32   `json:"limit" validate:"min=1,max=100"`
}

// ArticleListResponse represents the response for article list
type ArticleListResponse struct {
	Articles []model.Article                 `json:"articles"`
	Total    int                             `json:"total"`
	HasMore  bool                            `json:"has_more"`
	LastKey  map[string]types.AttributeValue `json:"last_key,omitempty"`
}

// articleService implements ArticleService interface
type articleService struct {
	articleRepo repository.ArticleRepository
	feedRepo    repository.FeedRepository
	bowerRepo   repository.BowerRepository
	chickRepo   repository.ChickRepository
}

// NewArticleService creates a new article service
func NewArticleService(
	articleRepo repository.ArticleRepository,
	feedRepo repository.FeedRepository,
	bowerRepo repository.BowerRepository,
	chickRepo repository.ChickRepository,
) ArticleService {
	return &articleService{
		articleRepo: articleRepo,
		feedRepo:    feedRepo,
		bowerRepo:   bowerRepo,
		chickRepo:   chickRepo,
	}
}

// GetArticles retrieves articles based on the request parameters
func (s *articleService) GetArticles(ctx context.Context, userID string, req *GetArticlesRequest) (*ArticleListResponse, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}
	if req == nil {
		return nil, errors.New("get articles request is required")
	}

	// Set defaults
	if req.Limit <= 0 {
		req.Limit = 50
	}
	if req.SortBy == "" {
		req.SortBy = "published_at"
	}
	if req.SortOrder == "" {
		req.SortOrder = "desc"
	}
	if req.Tab == "" {
		req.Tab = "all"
	}

	var articles []*model.Article
	var nextKey map[string]types.AttributeValue
	var err error

	switch req.Tab {
	case "liked":
		articles, err = s.getLikedArticles(ctx, userID, req)
	case "important":
		// For now, important articles are the same as all articles
		// This can be enhanced later with ML-based importance scoring
		articles, nextKey, err = s.getAllArticles(ctx, userID, req)
	default: // "all"
		articles, nextKey, err = s.getAllArticles(ctx, userID, req)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get articles: %w", err)
	}

	// Enrich articles with like status and bower information
	enrichedArticles, err := s.enrichArticles(ctx, userID, articles)
	if err != nil {
		return nil, fmt.Errorf("failed to enrich articles: %w", err)
	}

	// Convert to response format
	articleList := make([]model.Article, len(enrichedArticles))
	for i, article := range enrichedArticles {
		articleList[i] = *article
	}

	return &ArticleListResponse{
		Articles: articleList,
		Total:    len(articleList),
		HasMore:  nextKey != nil,
		LastKey:  nextKey,
	}, nil
}

// GetArticleByID retrieves a single article by ID
func (s *articleService) GetArticleByID(ctx context.Context, articleID string, userID string) (*model.Article, error) {
	if articleID == "" {
		return nil, errors.New("article ID is required")
	}
	if userID == "" {
		return nil, errors.New("user ID is required")
	}

	article, err := s.articleRepo.GetByID(ctx, articleID)
	if err != nil {
		return nil, fmt.Errorf("failed to get article: %w", err)
	}

	// Check if user has access through bower ownership
	feed, err := s.feedRepo.GetByID(ctx, article.FeedID)
	if err != nil {
		return nil, fmt.Errorf("failed to get feed: %w", err)
	}

	bower, err := s.bowerRepo.GetByID(ctx, feed.BowerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get bower: %w", err)
	}

	if bower.UserID != userID && !bower.IsPublic {
		return nil, errors.New("access denied: bower is private")
	}

	// Enrich article with like status and bower information
	enrichedArticles, err := s.enrichArticles(ctx, userID, []*model.Article{article})
	if err != nil {
		return nil, fmt.Errorf("failed to enrich article: %w", err)
	}

	return enrichedArticles[0], nil
}

// LikeArticle adds a like to an article
func (s *articleService) LikeArticle(ctx context.Context, userID string, articleID string) error {
	if userID == "" {
		return errors.New("user ID is required")
	}
	if articleID == "" {
		return errors.New("article ID is required")
	}

	// Check if article exists and user has access
	_, err := s.GetArticleByID(ctx, articleID, userID)
	if err != nil {
		return fmt.Errorf("article access check failed: %w", err)
	}

	// Check if already liked
	isLiked, err := s.chickRepo.IsArticleLiked(ctx, userID, articleID)
	if err != nil {
		return fmt.Errorf("failed to check like status: %w", err)
	}

	if isLiked {
		return errors.New("article is already liked")
	}

	// Add liked article
	likedArticle := model.NewLikedArticle(userID, articleID)
	err = s.chickRepo.AddLikedArticle(ctx, likedArticle)
	if err != nil {
		return fmt.Errorf("failed to add liked article: %w", err)
	}

	return nil
}

// UnlikeArticle removes a like from an article
func (s *articleService) UnlikeArticle(ctx context.Context, userID string, articleID string) error {
	if userID == "" {
		return errors.New("user ID is required")
	}
	if articleID == "" {
		return errors.New("article ID is required")
	}

	// Check if article exists and user has access
	_, err := s.GetArticleByID(ctx, articleID, userID)
	if err != nil {
		return fmt.Errorf("article access check failed: %w", err)
	}

	// Remove liked article
	err = s.chickRepo.RemoveLikedArticle(ctx, userID, articleID)
	if err != nil {
		return fmt.Errorf("failed to remove liked article: %w", err)
	}

	return nil
}

// MarkArticleAsRead marks an article as read (this is typically handled client-side)
func (s *articleService) MarkArticleAsRead(ctx context.Context, userID string, articleID string) error {
	if userID == "" {
		return errors.New("user ID is required")
	}
	if articleID == "" {
		return errors.New("article ID is required")
	}

	// Check if article exists and user has access
	_, err := s.GetArticleByID(ctx, articleID, userID)
	if err != nil {
		return fmt.Errorf("article access check failed: %w", err)
	}

	// In the current design, read status is managed client-side in localStorage
	// This method exists for future server-side read tracking if needed
	return nil
}

// SearchArticles searches for articles by title or content
func (s *articleService) SearchArticles(ctx context.Context, userID string, req *SearchArticlesRequest) ([]*model.Article, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}
	if req == nil {
		return nil, errors.New("search request is required")
	}
	if req.Query == "" {
		return nil, errors.New("search query is required")
	}

	if req.Limit <= 0 {
		req.Limit = 50
	}

	var feedIDs []string
	var err error

	if req.BowerID != nil {
		// Search within a specific bower
		bower, err := s.bowerRepo.GetByID(ctx, *req.BowerID)
		if err != nil {
			return nil, fmt.Errorf("bower not found: %w", err)
		}

		if bower.UserID != userID && !bower.IsPublic {
			return nil, errors.New("access denied: bower is private")
		}

		feeds, err := s.feedRepo.GetByBowerID(ctx, *req.BowerID)
		if err != nil {
			return nil, fmt.Errorf("failed to get bower feeds: %w", err)
		}

		feedIDs = make([]string, len(feeds))
		for i, feed := range feeds {
			feedIDs[i] = feed.FeedID
		}
	} else {
		// Search across all user's bowers
		bowers, _, err := s.bowerRepo.GetByUserID(ctx, userID, 100, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to get user bowers: %w", err)
		}

		for _, bower := range bowers {
			feeds, err := s.feedRepo.GetByBowerID(ctx, bower.BowerID)
			if err != nil {
				continue // Skip this bower if we can't get feeds
			}

			for _, feed := range feeds {
				feedIDs = append(feedIDs, feed.FeedID)
			}
		}
	}

	if len(feedIDs) == 0 {
		return []*model.Article{}, nil
	}

	articles, err := s.articleRepo.Search(ctx, req.Query, feedIDs, req.Limit)
	if err != nil {
		return nil, fmt.Errorf("failed to search articles: %w", err)
	}

	// Enrich articles with like status and bower information
	enrichedArticles, err := s.enrichArticles(ctx, userID, articles)
	if err != nil {
		return nil, fmt.Errorf("failed to enrich articles: %w", err)
	}

	return enrichedArticles, nil
}

// CreateArticles creates multiple articles (used by RSS service)
func (s *articleService) CreateArticles(ctx context.Context, articles []*model.Article) error {
	if len(articles) == 0 {
		return nil
	}

	err := s.articleRepo.BatchCreate(ctx, articles)
	if err != nil {
		return fmt.Errorf("failed to create articles: %w", err)
	}

	return nil
}

// getAllArticles retrieves all articles for a user
func (s *articleService) getAllArticles(ctx context.Context, userID string, req *GetArticlesRequest) ([]*model.Article, map[string]types.AttributeValue, error) {
	var feedIDs []string
	var err error

	if req.BowerID != nil {
		// Get articles from specific bower
		bower, err := s.bowerRepo.GetByID(ctx, *req.BowerID)
		if err != nil {
			return nil, nil, fmt.Errorf("bower not found: %w", err)
		}

		if bower.UserID != userID && !bower.IsPublic {
			return nil, nil, errors.New("access denied: bower is private")
		}

		feeds, err := s.feedRepo.GetByBowerID(ctx, *req.BowerID)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to get bower feeds: %w", err)
		}

		feedIDs = make([]string, len(feeds))
		for i, feed := range feeds {
			feedIDs[i] = feed.FeedID
		}
	} else {
		// Get articles from all user's bowers
		bowers, _, err := s.bowerRepo.GetByUserID(ctx, userID, 100, nil)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to get user bowers: %w", err)
		}

		for _, bower := range bowers {
			feeds, err := s.feedRepo.GetByBowerID(ctx, bower.BowerID)
			if err != nil {
				continue // Skip this bower if we can't get feeds
			}

			for _, feed := range feeds {
				feedIDs = append(feedIDs, feed.FeedID)
			}
		}
	}

	if len(feedIDs) == 0 {
		return []*model.Article{}, nil, nil
	}

	articles, nextKey, err := s.articleRepo.GetByFeedIDs(ctx, feedIDs, req.Limit, req.LastKey)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get articles: %w", err)
	}

	// Sort articles by published date (DynamoDB scan doesn't guarantee order)
	sort.Slice(articles, func(i, j int) bool {
		if req.SortOrder == "asc" {
			return articles[i].PublishedAt < articles[j].PublishedAt
		}
		return articles[i].PublishedAt > articles[j].PublishedAt
	})

	return articles, nextKey, nil
}

// getLikedArticles retrieves liked articles for a user
func (s *articleService) getLikedArticles(ctx context.Context, userID string, req *GetArticlesRequest) ([]*model.Article, error) {
	likedArticles, _, err := s.chickRepo.GetLikedArticles(ctx, userID, req.Limit, req.LastKey)
	if err != nil {
		return nil, fmt.Errorf("failed to get liked articles: %w", err)
	}

	if len(likedArticles) == 0 {
		return []*model.Article{}, nil
	}

	// Get full article details
	articles := make([]*model.Article, 0, len(likedArticles))
	for _, likedArticle := range likedArticles {
		article, err := s.articleRepo.GetByID(ctx, likedArticle.ArticleID)
		if err != nil {
			continue // Skip if article not found
		}

		// Check if user still has access to this article
		feed, err := s.feedRepo.GetByID(ctx, article.FeedID)
		if err != nil {
			continue
		}

		bower, err := s.bowerRepo.GetByID(ctx, feed.BowerID)
		if err != nil {
			continue
		}

		if bower.UserID != userID && !bower.IsPublic {
			continue // Skip if no access
		}

		articles = append(articles, article)
	}

	// Sort by liked date (most recent first)
	sort.Slice(articles, func(i, j int) bool {
		// Find the liked dates for comparison
		var likedAtI, likedAtJ int64
		for _, la := range likedArticles {
			if la.ArticleID == articles[i].ArticleID {
				likedAtI = la.LikedAt
			}
			if la.ArticleID == articles[j].ArticleID {
				likedAtJ = la.LikedAt
			}
		}
		return likedAtI > likedAtJ
	})

	return articles, nil
}

// enrichArticles enriches articles with like status and bower information
func (s *articleService) enrichArticles(ctx context.Context, userID string, articles []*model.Article) ([]*model.Article, error) {
	if len(articles) == 0 {
		return articles, nil
	}

	// Get liked articles for this user
	likedArticles, _, err := s.chickRepo.GetLikedArticles(ctx, userID, 1000, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get liked articles: %w", err)
	}

	likedMap := make(map[string]bool)
	for _, liked := range likedArticles {
		likedMap[liked.ArticleID] = true
	}

	// Enrich each article
	for _, article := range articles {
		// Set like status
		article.Liked = likedMap[article.ArticleID]

		// Set bower name
		feed, err := s.feedRepo.GetByID(ctx, article.FeedID)
		if err != nil {
			continue
		}

		bower, err := s.bowerRepo.GetByID(ctx, feed.BowerID)
		if err != nil {
			continue
		}

		article.Bower = bower.Name
	}

	return articles, nil
}
