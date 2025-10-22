package service

import (
	"context"
	"errors"
	"sync"
	"testing"

	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"

	"feed-bower-api/internal/model"
)

// MockRepositories for integration testing
type MockRepositories struct {
	UserRepo    *MockUserRepository
	BowerRepo   *MockBowerRepository
	FeedRepo    *MockFeedRepository
	ArticleRepo *MockArticleRepository
	ChickRepo   *MockChickRepository
}

func NewMockRepositories() *MockRepositories {
	return &MockRepositories{
		UserRepo:    NewMockUserRepository(),
		BowerRepo:   NewMockBowerRepository(),
		FeedRepo:    NewMockFeedRepository(),
		ArticleRepo: NewMockArticleRepository(),
		ChickRepo:   NewMockChickRepository(),
	}
}

// MockBowerRepository
type MockBowerRepository struct {
	mu     sync.Mutex
	bowers map[string]*model.Bower
}

func NewMockBowerRepository() *MockBowerRepository {
	return &MockBowerRepository{
		bowers: make(map[string]*model.Bower),
	}
}

func (m *MockBowerRepository) Create(ctx context.Context, bower *model.Bower) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if bower.BowerID == "" {
		bower.BowerID = "test-bower-id"
	}
	m.bowers[bower.BowerID] = bower
	return nil
}

func (m *MockBowerRepository) GetByID(ctx context.Context, bowerID string) (*model.Bower, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if bower, exists := m.bowers[bowerID]; exists {
		return bower, nil
	}
	return nil, errors.New("bower not found")
}

func (m *MockBowerRepository) GetByUserID(ctx context.Context, userID string, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Bower, map[string]types.AttributeValue, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	bowers := make([]*model.Bower, 0)
	for _, bower := range m.bowers {
		if bower.UserID == userID {
			bowers = append(bowers, bower)
		}
	}
	return bowers, nil, nil
}

func (m *MockBowerRepository) Update(ctx context.Context, bower *model.Bower) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.bowers[bower.BowerID] = bower
	return nil
}

func (m *MockBowerRepository) Delete(ctx context.Context, bowerID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	delete(m.bowers, bowerID)
	return nil
}

func (m *MockBowerRepository) ListPublic(ctx context.Context, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Bower, map[string]types.AttributeValue, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	bowers := make([]*model.Bower, 0)
	for _, bower := range m.bowers {
		if bower.IsPublic {
			bowers = append(bowers, bower)
		}
	}
	return bowers, nil, nil
}

func (m *MockBowerRepository) Search(ctx context.Context, userID string, query string, limit int32) ([]*model.Bower, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	return []*model.Bower{}, nil
}

// MockFeedRepository
type MockFeedRepository struct {
	mu    sync.Mutex
	feeds map[string]*model.Feed
}

func NewMockFeedRepository() *MockFeedRepository {
	return &MockFeedRepository{
		feeds: make(map[string]*model.Feed),
	}
}

func (m *MockFeedRepository) Create(ctx context.Context, feed *model.Feed) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if feed.FeedID == "" {
		feed.FeedID = "test-feed-id"
	}
	m.feeds[feed.FeedID] = feed
	return nil
}

func (m *MockFeedRepository) GetByID(ctx context.Context, feedID string) (*model.Feed, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if feed, exists := m.feeds[feedID]; exists {
		return feed, nil
	}
	return nil, nil
}

func (m *MockFeedRepository) GetByBowerID(ctx context.Context, bowerID string) ([]*model.Feed, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	feeds := make([]*model.Feed, 0)
	for _, feed := range m.feeds {
		if feed.BowerID == bowerID {
			feeds = append(feeds, feed)
		}
	}
	return feeds, nil
}

func (m *MockFeedRepository) GetByURL(ctx context.Context, url string) (*model.Feed, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	return nil, nil
}

func (m *MockFeedRepository) Update(ctx context.Context, feed *model.Feed) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.feeds[feed.FeedID] = feed
	return nil
}

func (m *MockFeedRepository) Delete(ctx context.Context, feedID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	delete(m.feeds, feedID)
	return nil
}

func (m *MockFeedRepository) List(ctx context.Context, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Feed, map[string]types.AttributeValue, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	feeds := make([]*model.Feed, 0, len(m.feeds))
	for _, feed := range m.feeds {
		feeds = append(feeds, feed)
	}
	return feeds, nil, nil
}

func (m *MockFeedRepository) GetStaleFeeds(ctx context.Context, maxAgeSeconds int64, limit int32) ([]*model.Feed, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	return []*model.Feed{}, nil
}

// MockArticleRepository
type MockArticleRepository struct {
	articles map[string]*model.Article
}

func NewMockArticleRepository() *MockArticleRepository {
	return &MockArticleRepository{
		articles: make(map[string]*model.Article),
	}
}

func (m *MockArticleRepository) Create(ctx context.Context, article *model.Article) error {
	if article.ArticleID == "" {
		article.ArticleID = "test-article-id"
	}
	m.articles[article.ArticleID] = article
	return nil
}

func (m *MockArticleRepository) GetByID(ctx context.Context, articleID string) (*model.Article, error) {
	if article, exists := m.articles[articleID]; exists {
		return article, nil
	}
	return nil, nil
}

func (m *MockArticleRepository) GetByFeedID(ctx context.Context, feedID string, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Article, map[string]types.AttributeValue, error) {
	return []*model.Article{}, nil, nil
}

func (m *MockArticleRepository) GetByFeedIDs(ctx context.Context, feedIDs []string, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Article, map[string]types.AttributeValue, error) {
	return []*model.Article{}, nil, nil
}

func (m *MockArticleRepository) GetByURL(ctx context.Context, url string) (*model.Article, error) {
	return nil, nil
}

func (m *MockArticleRepository) Update(ctx context.Context, article *model.Article) error {
	m.articles[article.ArticleID] = article
	return nil
}

func (m *MockArticleRepository) Delete(ctx context.Context, articleID string) error {
	delete(m.articles, articleID)
	return nil
}

func (m *MockArticleRepository) List(ctx context.Context, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Article, map[string]types.AttributeValue, error) {
	return []*model.Article{}, nil, nil
}

func (m *MockArticleRepository) Search(ctx context.Context, query string, feedIDs []string, limit int32) ([]*model.Article, error) {
	return []*model.Article{}, nil
}

func (m *MockArticleRepository) BatchCreate(ctx context.Context, articles []*model.Article) error {
	for _, article := range articles {
		if article.ArticleID == "" {
			article.ArticleID = "test-article-id"
		}
		m.articles[article.ArticleID] = article
	}
	return nil
}

// MockChickRepository
type MockChickRepository struct {
	stats         map[string]*model.ChickStats
	likedArticles map[string]map[string]*model.LikedArticle // userID -> articleID -> LikedArticle
}

func NewMockChickRepository() *MockChickRepository {
	return &MockChickRepository{
		stats:         make(map[string]*model.ChickStats),
		likedArticles: make(map[string]map[string]*model.LikedArticle),
	}
}

func (m *MockChickRepository) CreateStats(ctx context.Context, stats *model.ChickStats) error {
	m.stats[stats.UserID] = stats
	return nil
}

func (m *MockChickRepository) GetStats(ctx context.Context, userID string) (*model.ChickStats, error) {
	if stats, exists := m.stats[userID]; exists {
		return stats, nil
	}
	return model.NewChickStats(userID), nil
}

func (m *MockChickRepository) UpdateStats(ctx context.Context, stats *model.ChickStats) error {
	m.stats[stats.UserID] = stats
	return nil
}

func (m *MockChickRepository) DeleteStats(ctx context.Context, userID string) error {
	delete(m.stats, userID)
	return nil
}

func (m *MockChickRepository) AddLikedArticle(ctx context.Context, likedArticle *model.LikedArticle) error {
	if m.likedArticles[likedArticle.UserID] == nil {
		m.likedArticles[likedArticle.UserID] = make(map[string]*model.LikedArticle)
	}
	m.likedArticles[likedArticle.UserID][likedArticle.ArticleID] = likedArticle
	return nil
}

func (m *MockChickRepository) RemoveLikedArticle(ctx context.Context, userID, articleID string) error {
	if userLikes, exists := m.likedArticles[userID]; exists {
		delete(userLikes, articleID)
	}
	return nil
}

func (m *MockChickRepository) GetLikedArticles(ctx context.Context, userID string, limit int32, lastKey map[string]types.AttributeValue) ([]*model.LikedArticle, map[string]types.AttributeValue, error) {
	articles := make([]*model.LikedArticle, 0)
	if userLikes, exists := m.likedArticles[userID]; exists {
		for _, article := range userLikes {
			articles = append(articles, article)
		}
	}
	return articles, nil, nil
}

func (m *MockChickRepository) IsArticleLiked(ctx context.Context, userID, articleID string) (bool, error) {
	if userLikes, exists := m.likedArticles[userID]; exists {
		_, liked := userLikes[articleID]
		return liked, nil
	}
	return false, nil
}

func (m *MockChickRepository) GetLikedArticleCount(ctx context.Context, userID string) (int, error) {
	if userLikes, exists := m.likedArticles[userID]; exists {
		return len(userLikes), nil
	}
	return 0, nil
}

// MockRSSService
type MockRSSService struct{}

func NewMockRSSService() *MockRSSService {
	return &MockRSSService{}
}

func (m *MockRSSService) FetchFeed(ctx context.Context, feedURL string) (*FeedData, error) {
	return &FeedData{
		Title:       "Test Feed",
		Description: "Test Description",
		URL:         feedURL,
		Category:    "Test",
		Articles:    []ArticleData{},
	}, nil
}

func (m *MockRSSService) FetchFeedInfo(ctx context.Context, feedURL string) (*FeedInfo, error) {
	return &FeedInfo{
		Title:       "Test Feed",
		Description: "Test Description",
		Category:    "Test",
	}, nil
}

func (m *MockRSSService) ParseRSSFeed(data []byte) (*FeedData, error) {
	return &FeedData{}, nil
}

func (m *MockRSSService) ParseAtomFeed(data []byte) (*FeedData, error) {
	return &FeedData{}, nil
}

func (m *MockRSSService) ExtractImageURL(content string) string {
	return ""
}

func (m *MockRSSService) CleanContent(content string) string {
	return content
}

// Integration test
func TestServiceIntegration(t *testing.T) {
	ctx := context.Background()
	repos := NewMockRepositories()

	// Create services
	authService := NewAuthService(repos.UserRepo, "test-secret")
	bowerService := NewBowerService(repos.BowerRepo, repos.FeedRepo)
	rssService := NewMockRSSService()
	_ = NewFeedService(repos.FeedRepo, repos.BowerRepo, repos.ArticleRepo, rssService, nil) // feedService for future use (no Bedrock in tests)
	chickService := NewChickService(repos.ChickRepo, repos.ArticleRepo, repos.FeedRepo, repos.BowerRepo)

	// Test flow: Create user -> Create bower -> Add feed -> Check chick stats

	// 1. Create a guest user
	user, token, err := authService.CreateGuestUser(ctx, "ja")
	if err != nil {
		t.Fatalf("Failed to create guest user: %v", err)
	}

	// 2. Validate token
	validatedUser, err := authService.ValidateToken(ctx, token)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}

	if validatedUser.UserID != user.UserID {
		t.Errorf("Token validation returned wrong user")
	}

	// 3. Create a bower
	createBowerReq := &CreateBowerRequest{
		Name:     "Test Bower",
		Keywords: []string{"test", "golang"},
		IsPublic: false,
	}

	result, err := bowerService.CreateBower(ctx, user.UserID, createBowerReq)
	if err != nil {
		t.Fatalf("Failed to create bower: %v", err)
	}

	if result.Bower.Name != "Test Bower" {
		t.Errorf("Expected bower name 'Test Bower', got %s", result.Bower.Name)
	}

	bower := result.Bower

	// 4. Get chick stats
	stats, err := chickService.GetStats(ctx, user.UserID)
	if err != nil {
		t.Fatalf("Failed to get chick stats: %v", err)
	}

	if stats.Level != 1 {
		t.Errorf("Expected initial level 1, got %d", stats.Level)
	}

	if stats.TotalLikes != 0 {
		t.Errorf("Expected initial likes 0, got %d", stats.TotalLikes)
	}

	t.Logf("Integration test completed successfully")
	t.Logf("User ID: %s", user.UserID)
	t.Logf("Bower ID: %s", bower.BowerID)
	t.Logf("Chick Level: %d", stats.Level)
}
