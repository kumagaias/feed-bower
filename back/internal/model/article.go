package model

import (
	"time"
)

// Article represents a single article from an RSS/Atom feed
type Article struct {
	ArticleID   string  `json:"article_id" dynamodbav:"article_id" validate:"required"`
	FeedID      string  `json:"feed_id" dynamodbav:"feed_id" validate:"required"`
	Title       string  `json:"title" dynamodbav:"title" validate:"required,min=1,max=500"`
	Content     string  `json:"content" dynamodbav:"content" validate:"max=10000"`
	URL         string  `json:"url" dynamodbav:"url" validate:"required,url"`
	ImageURL    *string `json:"image_url,omitempty" dynamodbav:"image_url,omitempty" validate:"omitempty,url"`
	PublishedAt int64   `json:"published_at" dynamodbav:"published_at" validate:"required"`
	CreatedAt   int64   `json:"created_at" dynamodbav:"created_at"`

	// These fields are computed/joined from other tables and not stored in Articles table
	Liked bool   `json:"liked" dynamodbav:"-"`
	Bower string `json:"bower" dynamodbav:"-"`
	Read  bool   `json:"read" dynamodbav:"-"`
}

// NewArticle creates a new Article instance with current timestamps
func NewArticle(feedID, title, content, url string, publishedAt time.Time) *Article {
	now := time.Now().Unix()
	return &Article{
		FeedID:      feedID,
		Title:       title,
		Content:     content,
		URL:         url,
		PublishedAt: publishedAt.Unix(),
		CreatedAt:   now,
		Liked:       false,
		Read:        false,
	}
}

// SetImageURL sets the image URL for the article
func (a *Article) SetImageURL(imageURL string) {
	if imageURL != "" {
		a.ImageURL = &imageURL
	}
}

// GetPublishedAtTime returns the PublishedAt timestamp as time.Time
func (a *Article) GetPublishedAtTime() time.Time {
	return time.Unix(a.PublishedAt, 0)
}

// GetCreatedAtTime returns the CreatedAt timestamp as time.Time
func (a *Article) GetCreatedAtTime() time.Time {
	return time.Unix(a.CreatedAt, 0)
}

// IsRecent checks if the article was published within the specified duration
func (a *Article) IsRecent(duration time.Duration) bool {
	publishedTime := time.Unix(a.PublishedAt, 0)
	return time.Since(publishedTime) <= duration
}

// GetImageURLValue returns the image URL value or empty string if nil
func (a *Article) GetImageURLValue() string {
	if a.ImageURL != nil {
		return *a.ImageURL
	}
	return ""
}

// HasImage checks if the article has an image URL
func (a *Article) HasImage() bool {
	return a.ImageURL != nil && *a.ImageURL != ""
}
