package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"feed-bower-api/internal/model"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

// Mock repositories for testing
type mockFeedRepoForScheduler struct {
	feeds []*model.Feed
	err   error
}

func (m *mockFeedRepoForScheduler) Create(ctx context.Context, feed *model.Feed) error {
	return nil
}

func (m *mockFeedRepoForScheduler) GetByID(ctx context.Context, feedID string) (*model.Feed, error) {
	return nil, nil
}

func (m *mockFeedRepoForScheduler) GetByBowerID(ctx context.Context, bowerID string) ([]*model.Feed, error) {
	return nil, nil
}

func (m *mockFeedRepoForScheduler) GetByURL(ctx context.Context, url string) (*model.Feed, error) {
	return nil, nil
}

func (m *mockFeedRepoForScheduler) Update(ctx context.Context, feed *model.Feed) error {
	return nil
}

func (m *mockFeedRepoForScheduler) Delete(ctx context.Context, feedID string) error {
	return nil
}

func (m *mockFeedRepoForScheduler) List(ctx context.Context, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Feed, map[string]types.AttributeValue, error) {
	if m.err != nil {
		return nil, nil, m.err
	}
	return m.feeds, nil, nil
}

func (m *mockFeedRepoForScheduler) GetStaleFeeds(ctx context.Context, maxAgeSeconds int64, limit int32) ([]*model.Feed, error) {
	return nil, nil
}

type mockArticleRepoForScheduler struct {
	articles map[string]*model.Article
	err      error
}

func (m *mockArticleRepoForScheduler) Create(ctx context.Context, article *model.Article) error {
	return nil
}

func (m *mockArticleRepoForScheduler) GetByID(ctx context.Context, articleID string) (*model.Article, error) {
	return nil, nil
}

func (m *mockArticleRepoForScheduler) GetByFeedID(ctx context.Context, feedID string, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Article, map[string]types.AttributeValue, error) {
	return nil, nil, nil
}

func (m *mockArticleRepoForScheduler) GetByFeedIDs(ctx context.Context, feedIDs []string, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Article, map[string]types.AttributeValue, error) {
	return nil, nil, nil
}

func (m *mockArticleRepoForScheduler) GetByURL(ctx context.Context, url string) (*model.Article, error) {
	if m.err != nil {
		return nil, m.err
	}
	if article, exists := m.articles[url]; exists {
		return article, nil
	}
	return nil, errors.New("article not found")
}

func (m *mockArticleRepoForScheduler) Update(ctx context.Context, article *model.Article) error {
	return nil
}

func (m *mockArticleRepoForScheduler) Delete(ctx context.Context, articleID string) error {
	return nil
}

func (m *mockArticleRepoForScheduler) List(ctx context.Context, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Article, map[string]types.AttributeValue, error) {
	return nil, nil, nil
}

func (m *mockArticleRepoForScheduler) Search(ctx context.Context, query string, feedIDs []string, limit int32) ([]*model.Article, error) {
	return nil, nil
}

func (m *mockArticleRepoForScheduler) BatchCreate(ctx context.Context, articles []*model.Article) error {
	if m.err != nil {
		return m.err
	}
	// Store articles in map for duplicate checking
	for _, article := range articles {
		m.articles[article.URL] = article
	}
	return nil
}

type mockRSSServiceForScheduler struct {
	feedData *FeedData
	err      error
}

func (m *mockRSSServiceForScheduler) FetchFeed(ctx context.Context, feedURL string) (*FeedData, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.feedData, nil
}

func (m *mockRSSServiceForScheduler) FetchFeedInfo(ctx context.Context, feedURL string) (*FeedInfo, error) {
	return nil, nil
}

func (m *mockRSSServiceForScheduler) ParseRSSFeed(data []byte) (*FeedData, error) {
	return nil, nil
}

func (m *mockRSSServiceForScheduler) ParseAtomFeed(data []byte) (*FeedData, error) {
	return nil, nil
}

func (m *mockRSSServiceForScheduler) ExtractImageURL(content string) string {
	return ""
}

func (m *mockRSSServiceForScheduler) CleanContent(content string) string {
	return content
}

func TestSchedulerService_FetchAllFeeds_NoFeeds(t *testing.T) {
	feedRepo := &mockFeedRepoForScheduler{
		feeds: []*model.Feed{},
	}
	articleRepo := &mockArticleRepoForScheduler{
		articles: make(map[string]*model.Article),
	}
	rssService := &mockRSSServiceForScheduler{}

	service := NewSchedulerService(feedRepo, articleRepo, rssService)

	err := service.FetchAllFeeds(context.Background())
	if err != nil {
		t.Errorf("Expected no error for empty feed list, got: %v", err)
	}
}

func TestSchedulerService_FetchAllFeeds_Success(t *testing.T) {
	// Create mock feed
	feed := model.NewFeed("bower-1", "https://example.com/feed.xml", "Test Feed", "Test Description", "Technology")

	feedRepo := &mockFeedRepoForScheduler{
		feeds: []*model.Feed{feed},
	}

	articleRepo := &mockArticleRepoForScheduler{
		articles: make(map[string]*model.Article),
	}

	// Create mock RSS data
	rssService := &mockRSSServiceForScheduler{
		feedData: &FeedData{
			Title:       "Test Feed",
			Description: "Test Description",
			URL:         "https://example.com",
			Articles: []ArticleData{
				{
					Title:       "Test Article 1",
					Content:     "Test content 1",
					URL:         "https://example.com/article1",
					PublishedAt: time.Now(),
				},
				{
					Title:       "Test Article 2",
					Content:     "Test content 2",
					URL:         "https://example.com/article2",
					PublishedAt: time.Now(),
				},
			},
		},
	}

	service := NewSchedulerService(feedRepo, articleRepo, rssService)

	err := service.FetchAllFeeds(context.Background())
	if err != nil {
		t.Errorf("Expected no error, got: %v", err)
	}

	// Verify articles were saved
	if len(articleRepo.articles) != 2 {
		t.Errorf("Expected 2 articles to be saved, got: %d", len(articleRepo.articles))
	}
}

func TestSchedulerService_FetchAllFeeds_DuplicateDetection(t *testing.T) {
	// Create mock feed
	feed := model.NewFeed("bower-1", "https://example.com/feed.xml", "Test Feed", "Test Description", "Technology")

	feedRepo := &mockFeedRepoForScheduler{
		feeds: []*model.Feed{feed},
	}

	// Pre-populate with one article
	existingArticle := model.NewArticle(
		feed.FeedID,
		"Existing Article",
		"Existing content",
		"https://example.com/article1",
		time.Now(),
	)

	articleRepo := &mockArticleRepoForScheduler{
		articles: map[string]*model.Article{
			existingArticle.URL: existingArticle,
		},
	}

	// Create mock RSS data with one duplicate and one new article
	rssService := &mockRSSServiceForScheduler{
		feedData: &FeedData{
			Title:       "Test Feed",
			Description: "Test Description",
			URL:         "https://example.com",
			Articles: []ArticleData{
				{
					Title:       "Existing Article",
					Content:     "Existing content",
					URL:         "https://example.com/article1", // Duplicate
					PublishedAt: time.Now(),
				},
				{
					Title:       "New Article",
					Content:     "New content",
					URL:         "https://example.com/article2", // New
					PublishedAt: time.Now(),
				},
			},
		},
	}

	service := NewSchedulerService(feedRepo, articleRepo, rssService)

	err := service.FetchAllFeeds(context.Background())
	if err != nil {
		t.Errorf("Expected no error, got: %v", err)
	}

	// Verify only the new article was added (total should be 2)
	if len(articleRepo.articles) != 2 {
		t.Errorf("Expected 2 articles total (1 existing + 1 new), got: %d", len(articleRepo.articles))
	}
}

func TestSchedulerService_FetchAllFeeds_FeedError(t *testing.T) {
	// Create mock feed
	feed := model.NewFeed("bower-1", "https://example.com/feed.xml", "Test Feed", "Test Description", "Technology")

	feedRepo := &mockFeedRepoForScheduler{
		feeds: []*model.Feed{feed},
	}

	articleRepo := &mockArticleRepoForScheduler{
		articles: make(map[string]*model.Article),
	}

	// RSS service returns error
	rssService := &mockRSSServiceForScheduler{
		err: errors.New("feed fetch error"),
	}

	service := NewSchedulerService(feedRepo, articleRepo, rssService)

	// Should not return error, just log it and continue
	err := service.FetchAllFeeds(context.Background())
	if err != nil {
		t.Errorf("Expected no error (errors should be logged), got: %v", err)
	}

	// No articles should be saved
	if len(articleRepo.articles) != 0 {
		t.Errorf("Expected 0 articles to be saved, got: %d", len(articleRepo.articles))
	}
}

func TestSchedulerService_FetchAllFeeds_ListError(t *testing.T) {
	feedRepo := &mockFeedRepoForScheduler{
		err: errors.New("database error"),
	}

	articleRepo := &mockArticleRepoForScheduler{
		articles: make(map[string]*model.Article),
	}

	rssService := &mockRSSServiceForScheduler{}

	service := NewSchedulerService(feedRepo, articleRepo, rssService)

	err := service.FetchAllFeeds(context.Background())
	if err == nil {
		t.Error("Expected error when feed list fails, got nil")
	}
}
