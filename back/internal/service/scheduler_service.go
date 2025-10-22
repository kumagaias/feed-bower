package service

import (
	"context"
	"fmt"
	"log"
	"time"

	"feed-bower-api/internal/model"
	"feed-bower-api/internal/repository"
)

// SchedulerService defines the interface for scheduled operations
type SchedulerService interface {
	FetchAllFeeds(ctx context.Context) error
	CleanupOrphanedArticles(ctx context.Context) error
}

// schedulerService implements SchedulerService interface
type schedulerService struct {
	feedRepo    repository.FeedRepository
	articleRepo repository.ArticleRepository
	rssService  RSSService
}

// NewSchedulerService creates a new scheduler service
func NewSchedulerService(
	feedRepo repository.FeedRepository,
	articleRepo repository.ArticleRepository,
	rssService RSSService,
) SchedulerService {
	return &schedulerService{
		feedRepo:    feedRepo,
		articleRepo: articleRepo,
		rssService:  rssService,
	}
}

// FetchAllFeeds fetches articles from all feeds and saves them to DynamoDB
func (s *schedulerService) FetchAllFeeds(ctx context.Context) error {
	log.Println("🔄 Starting scheduled feed fetch...")

	// Get all feeds
	feeds, _, err := s.feedRepo.List(ctx, 1000, nil)
	if err != nil {
		return fmt.Errorf("failed to list feeds: %w", err)
	}

	if len(feeds) == 0 {
		log.Println("⚠️  No feeds found to fetch")
		return nil
	}

	log.Printf("📡 Found %d feeds to fetch", len(feeds))

	totalArticles := 0
	totalNew := 0
	totalErrors := 0

	// Process each feed
	for i, feed := range feeds {
		log.Printf("📥 [%d/%d] Fetching feed: %s (%s)", i+1, len(feeds), feed.Title, feed.URL)

		// Fetch feed data
		feedData, err := s.rssService.FetchFeed(ctx, feed.URL)
		if err != nil {
			log.Printf("❌ Error fetching feed %s: %v", feed.URL, err)
			totalErrors++
			continue
		}

		log.Printf("✅ Fetched %d articles from %s", len(feedData.Articles), feed.Title)
		totalArticles += len(feedData.Articles)

		// Convert to model articles
		articles := ConvertToArticles(feed.FeedID, feedData.Articles)

		// Filter out duplicates by checking existing articles
		newArticles := make([]*model.Article, 0)
		for _, article := range articles {
			// Check if article already exists by URL
			existing, err := s.articleRepo.GetByURL(ctx, article.URL)
			if err != nil || existing == nil {
				// Article doesn't exist, add it
				newArticles = append(newArticles, article)
			}
		}

		if len(newArticles) == 0 {
			log.Printf("ℹ️  No new articles for feed: %s", feed.Title)
			continue
		}

		log.Printf("💾 Saving %d new articles for feed: %s", len(newArticles), feed.Title)

		// Batch create new articles
		if err := s.articleRepo.BatchCreate(ctx, newArticles); err != nil {
			log.Printf("❌ Error saving articles for feed %s: %v", feed.URL, err)
			totalErrors++
			continue
		}

		totalNew += len(newArticles)

		// Update feed's last_updated timestamp
		feed.UpdateLastUpdated()
		if err := s.feedRepo.Update(ctx, feed); err != nil {
			log.Printf("⚠️  Warning: Failed to update feed timestamp for %s: %v", feed.URL, err)
		}

		// Add a small delay to avoid overwhelming external servers
		time.Sleep(500 * time.Millisecond)
	}

	log.Printf("✨ Feed fetch completed!")
	log.Printf("📊 Summary:")
	log.Printf("   - Total feeds processed: %d", len(feeds))
	log.Printf("   - Total articles fetched: %d", totalArticles)
	log.Printf("   - New articles saved: %d", totalNew)
	log.Printf("   - Errors: %d", totalErrors)

	return nil
}

// CleanupOrphanedArticles removes articles whose feeds no longer exist
func (s *schedulerService) CleanupOrphanedArticles(ctx context.Context) error {
	log.Println("🧹 Starting orphaned articles cleanup...")

	// Get all articles
	articles, _, err := s.articleRepo.List(ctx, 1000, nil)
	if err != nil {
		return fmt.Errorf("failed to list articles: %w", err)
	}

	if len(articles) == 0 {
		log.Println("ℹ️  No articles found")
		return nil
	}

	log.Printf("📊 Checking %d articles for orphaned entries", len(articles))

	deletedCount := 0
	errorCount := 0

	// Check each article's feed
	for _, article := range articles {
		// Check if feed exists
		_, err := s.feedRepo.GetByID(ctx, article.FeedID)
		if err != nil {
			// Feed doesn't exist, delete the article
			log.Printf("🗑️  Deleting orphaned article: %s (feed_id: %s)", article.ArticleID, article.FeedID)

			if err := s.articleRepo.Delete(ctx, article.ArticleID); err != nil {
				log.Printf("❌ Failed to delete article %s: %v", article.ArticleID, err)
				errorCount++
				continue
			}

			deletedCount++
		}
	}

	log.Printf("✨ Cleanup completed!")
	log.Printf("📊 Summary:")
	log.Printf("   - Total articles checked: %d", len(articles))
	log.Printf("   - Orphaned articles deleted: %d", deletedCount)
	log.Printf("   - Errors: %d", errorCount)

	return nil
}
