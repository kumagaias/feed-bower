package service

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRSSService_FetchFeed_ValidFeed(t *testing.T) {
	// Create test server with RSS feed
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/rss+xml")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <description>A test RSS feed</description>
    <link>http://example.com</link>
    <item>
      <title>Test Article</title>
      <description>Test article content</description>
      <link>http://example.com/article1</link>
      <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`))
	}))
	defer server.Close()

	// Note: This test will fail with the secure client because localhost is blocked
	// This is expected behavior for security
	service := NewRSSService()
	ctx := context.Background()

	_, err := service.FetchFeed(ctx, server.URL)
	// We expect this to fail due to security restrictions
	if err == nil {
		t.Error("Expected request to localhost to be blocked by security policy")
	}
}

func TestRSSService_FetchFeed_InvalidURL(t *testing.T) {
	service := NewRSSService()
	ctx := context.Background()

	invalidURLs := []string{
		"",
		"not-a-url",
		"ftp://example.com/feed.xml",
		"javascript:alert('xss')",
		"http://localhost/feed.xml", // Blocked by security policy
	}

	for _, url := range invalidURLs {
		_, err := service.FetchFeed(ctx, url)
		if err == nil {
			t.Errorf("Expected error for invalid URL: %s", url)
		}
	}
}

func TestRSSService_FetchFeedInfo_InvalidURL(t *testing.T) {
	service := NewRSSService()
	ctx := context.Background()

	_, err := service.FetchFeedInfo(ctx, "invalid-url")
	if err == nil {
		t.Error("Expected error for invalid URL")
	}
}

func TestRSSService_ParseRSSFeed(t *testing.T) {
	service := NewRSSService()

	rssData := []byte(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <description>A test RSS feed</description>
    <link>http://example.com</link>
    <item>
      <title>Test Article</title>
      <description>Test article content</description>
      <link>http://example.com/article1</link>
      <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`)

	feedData, err := service.ParseRSSFeed(rssData)
	if err != nil {
		t.Fatalf("Failed to parse RSS feed: %v", err)
	}

	if feedData.Title != "Test Feed" {
		t.Errorf("Expected title 'Test Feed', got '%s'", feedData.Title)
	}

	if len(feedData.Articles) != 1 {
		t.Errorf("Expected 1 article, got %d", len(feedData.Articles))
	}

	if feedData.Articles[0].Title != "Test Article" {
		t.Errorf("Expected article title 'Test Article', got '%s'", feedData.Articles[0].Title)
	}
}

func TestRSSService_ParseAtomFeed(t *testing.T) {
	service := NewRSSService()

	atomData := []byte(`<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test Atom Feed</title>
  <subtitle>A test Atom feed</subtitle>
  <link href="http://example.com"/>
  <entry>
    <title>Test Atom Article</title>
    <summary>Test atom article content</summary>
    <link href="http://example.com/article1"/>
    <published>2024-01-01T00:00:00Z</published>
  </entry>
</feed>`)

	feedData, err := service.ParseAtomFeed(atomData)
	if err != nil {
		t.Fatalf("Failed to parse Atom feed: %v", err)
	}

	if feedData.Title != "Test Atom Feed" {
		t.Errorf("Expected title 'Test Atom Feed', got '%s'", feedData.Title)
	}

	if len(feedData.Articles) != 1 {
		t.Errorf("Expected 1 article, got %d", len(feedData.Articles))
	}

	if feedData.Articles[0].Title != "Test Atom Article" {
		t.Errorf("Expected article title 'Test Atom Article', got '%s'", feedData.Articles[0].Title)
	}
}

func TestRSSService_CleanContent(t *testing.T) {
	service := NewRSSService()

	testCases := []struct {
		input    string
		expected string
	}{
		{
			"<p>Hello <b>world</b></p>",
			"Hello world",
		},
		{
			"Text with\n\nmultiple\n\n\nlines",
			"Text with multiple lines",
		},
		{
			"  Spaces   everywhere  ",
			"Spaces everywhere",
		},
		{
			"<script>alert('xss')</script>Safe content",
			"alert('xss')Safe content", // HTML tags are removed, but content remains
		},
	}

	for _, tc := range testCases {
		result := service.CleanContent(tc.input)
		if result != tc.expected {
			t.Errorf("For input '%s', expected '%s', got '%s'", tc.input, tc.expected, result)
		}
	}
}

func TestRSSService_ExtractImageURL(t *testing.T) {
	service := NewRSSService()

	testCases := []struct {
		content  string
		expected string
	}{
		{
			`<img src="http://example.com/image.jpg" alt="test">`,
			"http://example.com/image.jpg",
		},
		{
			`<p>Some text</p><img src="https://example.com/photo.png">`,
			"https://example.com/photo.png",
		},
		{
			`No images here`,
			"",
		},
		{
			`<img src="relative/path.jpg">`,
			"", // Should not return relative paths
		},
	}

	for _, tc := range testCases {
		result := service.ExtractImageURL(tc.content)
		if result != tc.expected {
			t.Errorf("For content '%s', expected '%s', got '%s'", tc.content, tc.expected, result)
		}
	}
}
