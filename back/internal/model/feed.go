package model

import (
	"time"
)

// Feed represents an RSS/Atom feed
type Feed struct {
	FeedID      string `json:"feed_id" dynamodbav:"feed_id" validate:"required"`
	BowerID     string `json:"bower_id" dynamodbav:"bower_id" validate:"required"`
	URL         string `json:"url" dynamodbav:"url" validate:"required,url"`
	Title       string `json:"title" dynamodbav:"title" validate:"required,min=1,max=200"`
	Description string `json:"description" dynamodbav:"description" validate:"max=1000"`
	Category    string `json:"category" dynamodbav:"category" validate:"max=50"`
	LastUpdated int64  `json:"last_updated" dynamodbav:"last_updated"`
	CreatedAt   int64  `json:"created_at" dynamodbav:"created_at"`
}

// NewFeed creates a new Feed instance with current timestamps
func NewFeed(bowerID, url, title, description, category string) *Feed {
	now := time.Now().Unix()
	return &Feed{
		BowerID:     bowerID,
		URL:         url,
		Title:       title,
		Description: description,
		Category:    category,
		LastUpdated: now,
		CreatedAt:   now,
	}
}

// UpdateLastUpdated updates the LastUpdated field to current time
func (f *Feed) UpdateLastUpdated() {
	f.LastUpdated = time.Now().Unix()
}

// IsStale checks if the feed hasn't been updated for more than the specified duration
func (f *Feed) IsStale(maxAge time.Duration) bool {
	lastUpdate := time.Unix(f.LastUpdated, 0)
	return time.Since(lastUpdate) > maxAge
}

// GetLastUpdatedTime returns the LastUpdated timestamp as time.Time
func (f *Feed) GetLastUpdatedTime() time.Time {
	return time.Unix(f.LastUpdated, 0)
}

// GetCreatedAtTime returns the CreatedAt timestamp as time.Time
func (f *Feed) GetCreatedAtTime() time.Time {
	return time.Unix(f.CreatedAt, 0)
}
