package service

import (
	"context"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"feed-bower-api/internal/model"
	"feed-bower-api/pkg/httpclient"
)

// RSSService defines the interface for RSS feed operations
type RSSService interface {
	// Feed fetching
	FetchFeed(ctx context.Context, feedURL string) (*FeedData, error)
	FetchFeedInfo(ctx context.Context, feedURL string) (*FeedInfo, error)
	
	// Article parsing
	ParseRSSFeed(data []byte) (*FeedData, error)
	ParseAtomFeed(data []byte) (*FeedData, error)
	
	// Utility functions
	ExtractImageURL(content string) string
	CleanContent(content string) string
}

// FeedData represents parsed feed data with articles
type FeedData struct {
	Title       string    `json:"title"`
	Description string    `json:"description"`
	URL         string    `json:"url"`
	Category    string    `json:"category"`
	Articles    []ArticleData `json:"articles"`
}

// FeedInfo represents basic feed information without articles
type FeedInfo struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
}

// ArticleData represents parsed article data
type ArticleData struct {
	Title       string     `json:"title"`
	Content     string     `json:"content"`
	URL         string     `json:"url"`
	PublishedAt time.Time  `json:"published_at"`
	ImageURL    *string    `json:"image_url,omitempty"`
}

// RSS 2.0 structures
type RSS struct {
	XMLName xml.Name `xml:"rss"`
	Channel Channel  `xml:"channel"`
}

type Channel struct {
	Title       string `xml:"title"`
	Description string `xml:"description"`
	Link        string `xml:"link"`
	Category    string `xml:"category"`
	Items       []Item `xml:"item"`
}

type Item struct {
	Title       string `xml:"title"`
	Description string `xml:"description"`
	Link        string `xml:"link"`
	PubDate     string `xml:"pubDate"`
	GUID        string `xml:"guid"`
	Category    string `xml:"category"`
	Content     string `xml:"content"`
	Encoded     string `xml:"encoded"` // For content:encoded
}

// Atom structures
type AtomFeed struct {
	XMLName xml.Name    `xml:"feed"`
	Title   string      `xml:"title"`
	Subtitle string     `xml:"subtitle"`
	Link    []AtomLink  `xml:"link"`
	Entries []AtomEntry `xml:"entry"`
}

type AtomLink struct {
	Href string `xml:"href,attr"`
	Rel  string `xml:"rel,attr"`
	Type string `xml:"type,attr"`
}

type AtomEntry struct {
	Title     string     `xml:"title"`
	Summary   string     `xml:"summary"`
	Content   AtomContent `xml:"content"`
	Link      []AtomLink `xml:"link"`
	Published string     `xml:"published"`
	Updated   string     `xml:"updated"`
	ID        string     `xml:"id"`
}

type AtomContent struct {
	Type string `xml:"type,attr"`
	Text string `xml:",chardata"`
}

// rssService implements RSSService interface
type rssService struct {
	secureClient *httpclient.SecureHTTPClient
}

// NewRSSService creates a new RSS service
func NewRSSService() RSSService {
	config := httpclient.DefaultSecureHTTPConfig()
	config.UserAgent = "Feed-Bower/1.0 (RSS Reader)"
	
	secureClient, err := httpclient.NewSecureHTTPClient(config)
	if err != nil {
		// Fallback to default config if there's an error
		secureClient, _ = httpclient.NewSecureHTTPClient(nil)
	}

	return &rssService{
		secureClient: secureClient,
	}
}

// FetchFeed fetches and parses a complete RSS/Atom feed
func (s *rssService) FetchFeed(ctx context.Context, feedURL string) (*FeedData, error) {
	if feedURL == "" {
		return nil, errors.New("feed URL is required")
	}

	// Validate URL before making request
	config := httpclient.DefaultSecureHTTPConfig()
	if err := httpclient.ValidateURL(feedURL, config); err != nil {
		return nil, fmt.Errorf("invalid feed URL: %w", err)
	}

	// Set headers for RSS/Atom feeds
	headers := map[string]string{
		"Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml",
	}

	// Make secure request
	resp, err := s.secureClient.Do(ctx, "GET", feedURL, headers)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch feed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP error: %d %s", resp.StatusCode, resp.Status)
	}

	// Read response body with size limit
	const maxFeedSize = 10 * 1024 * 1024 // 10MB limit
	limitedReader := io.LimitReader(resp.Body, maxFeedSize)
	body, err := io.ReadAll(limitedReader)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Check if we hit the size limit
	if len(body) == maxFeedSize {
		return nil, errors.New("feed size exceeds maximum allowed size (10MB)")
	}

	// Determine feed type and parse
	feedData, err := s.parseFeed(body, feedURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse feed: %w", err)
	}

	return feedData, nil
}

// FetchFeedInfo fetches basic feed information without articles
func (s *rssService) FetchFeedInfo(ctx context.Context, feedURL string) (*FeedInfo, error) {
	feedData, err := s.FetchFeed(ctx, feedURL)
	if err != nil {
		return nil, err
	}

	return &FeedInfo{
		Title:       feedData.Title,
		Description: feedData.Description,
		Category:    feedData.Category,
	}, nil
}

// parseFeed determines feed type and parses accordingly
func (s *rssService) parseFeed(data []byte, feedURL string) (*FeedData, error) {
	// Try to determine feed type by looking at the XML
	dataStr := string(data)
	
	if strings.Contains(dataStr, "<rss") || strings.Contains(dataStr, "<RSS") {
		return s.ParseRSSFeed(data)
	} else if strings.Contains(dataStr, "<feed") && (strings.Contains(dataStr, "atom") || strings.Contains(dataStr, "Atom")) {
		return s.ParseAtomFeed(data)
	} else if strings.Contains(dataStr, "<rdf:RDF") {
		// RSS 1.0 / RDF - treat as RSS for now
		return s.ParseRSSFeed(data)
	}

	// Default to RSS if we can't determine
	return s.ParseRSSFeed(data)
}

// ParseRSSFeed parses RSS 2.0 feed data
func (s *rssService) ParseRSSFeed(data []byte) (*FeedData, error) {
	var rss RSS
	err := xml.Unmarshal(data, &rss)
	if err != nil {
		return nil, fmt.Errorf("failed to parse RSS XML: %w", err)
	}

	feedData := &FeedData{
		Title:       s.CleanContent(rss.Channel.Title),
		Description: s.CleanContent(rss.Channel.Description),
		URL:         rss.Channel.Link,
		Category:    s.CleanContent(rss.Channel.Category),
		Articles:    make([]ArticleData, 0, len(rss.Channel.Items)),
	}

	// Parse articles
	for _, item := range rss.Channel.Items {
		article, err := s.parseRSSItem(item)
		if err != nil {
			// Skip invalid articles but continue processing
			continue
		}
		feedData.Articles = append(feedData.Articles, *article)
	}

	return feedData, nil
}

// ParseAtomFeed parses Atom feed data
func (s *rssService) ParseAtomFeed(data []byte) (*FeedData, error) {
	var atom AtomFeed
	err := xml.Unmarshal(data, &atom)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Atom XML: %w", err)
	}

	// Find the main link
	var feedURL string
	for _, link := range atom.Link {
		if link.Rel == "alternate" || link.Rel == "" {
			feedURL = link.Href
			break
		}
	}

	feedData := &FeedData{
		Title:       s.CleanContent(atom.Title),
		Description: s.CleanContent(atom.Subtitle),
		URL:         feedURL,
		Articles:    make([]ArticleData, 0, len(atom.Entries)),
	}

	// Parse articles
	for _, entry := range atom.Entries {
		article, err := s.parseAtomEntry(entry)
		if err != nil {
			// Skip invalid articles but continue processing
			continue
		}
		feedData.Articles = append(feedData.Articles, *article)
	}

	return feedData, nil
}

// parseRSSItem parses a single RSS item
func (s *rssService) parseRSSItem(item Item) (*ArticleData, error) {
	if item.Title == "" && item.Description == "" {
		return nil, errors.New("item has no title or description")
	}

	// Parse published date
	publishedAt := time.Now()
	if item.PubDate != "" {
		if parsed, err := s.parseDate(item.PubDate); err == nil {
			publishedAt = parsed
		}
	}

	// Get content (prefer content:encoded over description)
	content := item.Description
	if item.Encoded != "" {
		content = item.Encoded
	} else if item.Content != "" {
		content = item.Content
	}

	article := &ArticleData{
		Title:       s.CleanContent(item.Title),
		Content:     s.CleanContent(content),
		URL:         item.Link,
		PublishedAt: publishedAt,
	}

	// Extract image URL from content
	if imageURL := s.ExtractImageURL(content); imageURL != "" {
		article.ImageURL = &imageURL
	}

	return article, nil
}

// parseAtomEntry parses a single Atom entry
func (s *rssService) parseAtomEntry(entry AtomEntry) (*ArticleData, error) {
	if entry.Title == "" && entry.Summary == "" {
		return nil, errors.New("entry has no title or summary")
	}

	// Find the main link
	var articleURL string
	for _, link := range entry.Link {
		if link.Rel == "alternate" || link.Rel == "" {
			articleURL = link.Href
			break
		}
	}

	// Parse published date
	publishedAt := time.Now()
	dateStr := entry.Published
	if dateStr == "" {
		dateStr = entry.Updated
	}
	if dateStr != "" {
		if parsed, err := s.parseDate(dateStr); err == nil {
			publishedAt = parsed
		}
	}

	// Get content (prefer content over summary)
	content := entry.Summary
	if entry.Content.Text != "" {
		content = entry.Content.Text
	}

	article := &ArticleData{
		Title:       s.CleanContent(entry.Title),
		Content:     s.CleanContent(content),
		URL:         articleURL,
		PublishedAt: publishedAt,
	}

	// Extract image URL from content
	if imageURL := s.ExtractImageURL(content); imageURL != "" {
		article.ImageURL = &imageURL
	}

	return article, nil
}

// parseDate parses various date formats commonly used in RSS/Atom feeds
func (s *rssService) parseDate(dateStr string) (time.Time, error) {
	// Common date formats in RSS/Atom feeds
	formats := []string{
		time.RFC1123,     // RSS 2.0: "Mon, 02 Jan 2006 15:04:05 MST"
		time.RFC1123Z,    // RSS 2.0 with numeric timezone: "Mon, 02 Jan 2006 15:04:05 -0700"
		time.RFC3339,     // Atom: "2006-01-02T15:04:05Z07:00"
		time.RFC3339Nano, // Atom with nanoseconds
		"2006-01-02T15:04:05Z",
		"2006-01-02T15:04:05",
		"2006-01-02 15:04:05",
		"Mon, 2 Jan 2006 15:04:05 MST",
		"Mon, 2 Jan 2006 15:04:05 -0700",
		"2 Jan 2006 15:04:05 MST",
		"2 Jan 2006 15:04:05 -0700",
	}

	for _, format := range formats {
		if t, err := time.Parse(format, dateStr); err == nil {
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("unable to parse date: %s", dateStr)
}

// ExtractImageURL extracts the first image URL from HTML content
func (s *rssService) ExtractImageURL(content string) string {
	if content == "" {
		return ""
	}

	// Regular expression to find img tags with src attribute
	imgRegex := regexp.MustCompile(`<img[^>]+src=["']([^"']+)["'][^>]*>`)
	matches := imgRegex.FindStringSubmatch(content)
	
	if len(matches) > 1 {
		imageURL := matches[1]
		// Basic validation - check if it looks like a valid image URL
		if strings.HasPrefix(imageURL, "http") && 
		   (strings.Contains(imageURL, ".jpg") || 
		    strings.Contains(imageURL, ".jpeg") || 
		    strings.Contains(imageURL, ".png") || 
		    strings.Contains(imageURL, ".gif") || 
		    strings.Contains(imageURL, ".webp")) {
			return imageURL
		}
	}

	return ""
}

// CleanContent removes HTML tags and cleans up text content
func (s *rssService) CleanContent(content string) string {
	if content == "" {
		return ""
	}

	// Remove HTML tags
	htmlRegex := regexp.MustCompile(`<[^>]*>`)
	cleaned := htmlRegex.ReplaceAllString(content, "")

	// Decode common HTML entities
	cleaned = strings.ReplaceAll(cleaned, "&amp;", "&")
	cleaned = strings.ReplaceAll(cleaned, "&lt;", "<")
	cleaned = strings.ReplaceAll(cleaned, "&gt;", ">")
	cleaned = strings.ReplaceAll(cleaned, "&quot;", "\"")
	cleaned = strings.ReplaceAll(cleaned, "&#39;", "'")
	cleaned = strings.ReplaceAll(cleaned, "&apos;", "'")
	cleaned = strings.ReplaceAll(cleaned, "&nbsp;", " ")

	// Clean up whitespace
	cleaned = regexp.MustCompile(`\s+`).ReplaceAllString(cleaned, " ")
	cleaned = strings.TrimSpace(cleaned)

	return cleaned
}

// ConvertToArticles converts ArticleData slice to model.Article slice
func ConvertToArticles(feedID string, articles []ArticleData) []*model.Article {
	result := make([]*model.Article, 0, len(articles))

	for _, articleData := range articles {
		article := model.NewArticle(
			feedID,
			articleData.Title,
			articleData.Content,
			articleData.URL,
			articleData.PublishedAt,
		)

		if articleData.ImageURL != nil {
			article.SetImageURL(*articleData.ImageURL)
		}

		result = append(result, article)
	}

	return result
}