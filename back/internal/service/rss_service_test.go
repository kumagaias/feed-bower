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

func TestRealFeed(t *testing.T) {
	// This test fetches real RSS/Atom feeds to verify the parser works with actual data
	// Skip in CI or if network is unavailable
	if testing.Short() {
		t.Skip("Skipping real feed test in short mode")
	}

	service := NewRSSService()
	ctx := context.Background()

	testFeeds := []struct {
		name     string
		url      string
		feedType string
	}{
		{
			name:     "GitHub Blog RSS",
			url:      "https://github.blog/feed/",
			feedType: "RSS",
		},
		{
			name:     "Hacker News RSS",
			url:      "https://news.ycombinator.com/rss",
			feedType: "RSS",
		},
	}

	for _, tf := range testFeeds {
		t.Run(tf.name, func(t *testing.T) {
			feedData, err := service.FetchFeed(ctx, tf.url)
			if err != nil {
				t.Logf("Warning: Failed to fetch %s: %v", tf.name, err)
				t.Skip("Skipping due to network error or feed unavailability")
				return
			}

			// Verify basic feed structure
			if feedData.Title == "" {
				t.Errorf("%s: Feed title is empty", tf.name)
			}

			if len(feedData.Articles) == 0 {
				t.Errorf("%s: No articles found in feed", tf.name)
			}

			// Verify first article has required fields
			if len(feedData.Articles) > 0 {
				article := feedData.Articles[0]
				if article.Title == "" {
					t.Errorf("%s: First article has no title", tf.name)
				}
				if article.URL == "" {
					t.Errorf("%s: First article has no URL", tf.name)
				}
				if article.PublishedAt.IsZero() {
					t.Logf("%s: Warning - First article has zero published date", tf.name)
				}
			}

			t.Logf("%s: Successfully parsed feed with %d articles", tf.name, len(feedData.Articles))
		})
	}
}

func TestRSSService_ParseInvalidFeed(t *testing.T) {
	service := NewRSSService()

	testCases := []struct {
		name string
		data []byte
	}{
		{
			name: "Empty data",
			data: []byte(""),
		},
		{
			name: "Invalid XML",
			data: []byte("not xml at all"),
		},
		{
			name: "Malformed RSS",
			data: []byte(`<?xml version="1.0"?><rss><channel>`),
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := service.ParseRSSFeed(tc.data)
			if err == nil {
				t.Errorf("Expected error for %s, but got none", tc.name)
			}
		})
	}
}

func TestRSSService_ParseRSSWithContentEncoded(t *testing.T) {
	service := NewRSSService()

	rssData := []byte(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Test Feed</title>
    <description>A test RSS feed</description>
    <link>http://example.com</link>
    <item>
      <title>Test Article</title>
      <description>Short description</description>
      <content:encoded><![CDATA[<p>Full HTML content with <img src="http://example.com/image.jpg" /></p>]]></content:encoded>
      <link>http://example.com/article1</link>
      <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`)

	feedData, err := service.ParseRSSFeed(rssData)
	if err != nil {
		t.Fatalf("Failed to parse RSS feed: %v", err)
	}

	if len(feedData.Articles) != 1 {
		t.Fatalf("Expected 1 article, got %d", len(feedData.Articles))
	}

	article := feedData.Articles[0]

	// Should prefer content:encoded over description
	if article.Content == "Short description" {
		t.Error("Expected content:encoded to be used, but got description instead")
	}

	// Should extract image URL from content
	if article.ImageURL == nil {
		t.Error("Expected image URL to be extracted from content")
	} else if *article.ImageURL != "http://example.com/image.jpg" {
		t.Errorf("Expected image URL 'http://example.com/image.jpg', got '%s'", *article.ImageURL)
	}
}

func TestRSSService_ParseAtomWithMultipleLinks(t *testing.T) {
	service := NewRSSService()

	atomData := []byte(`<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test Atom Feed</title>
  <subtitle>A test Atom feed</subtitle>
  <link href="http://example.com" rel="alternate"/>
  <link href="http://example.com/feed" rel="self"/>
  <entry>
    <title>Test Atom Article</title>
    <summary>Test atom article content</summary>
    <link href="http://example.com/article1" rel="alternate"/>
    <link href="http://example.com/article1/comments" rel="replies"/>
    <published>2024-01-01T00:00:00Z</published>
  </entry>
</feed>`)

	feedData, err := service.ParseAtomFeed(atomData)
	if err != nil {
		t.Fatalf("Failed to parse Atom feed: %v", err)
	}

	if feedData.URL != "http://example.com" {
		t.Errorf("Expected feed URL 'http://example.com', got '%s'", feedData.URL)
	}

	if len(feedData.Articles) != 1 {
		t.Fatalf("Expected 1 article, got %d", len(feedData.Articles))
	}

	article := feedData.Articles[0]
	if article.URL != "http://example.com/article1" {
		t.Errorf("Expected article URL 'http://example.com/article1', got '%s'", article.URL)
	}
}

func TestRSSService_CleanContentWithHTMLEntities(t *testing.T) {
	service := NewRSSService()

	testCases := []struct {
		input    string
		expected string
	}{
		{
			"AT&amp;T is a company",
			"AT&T is a company",
		},
		{
			"Price: &lt;$100&gt;",
			"Price: <$100>",
		},
		{
			"He said &quot;Hello&quot;",
			"He said \"Hello\"",
		},
		{
			"It&#39;s working",
			"It's working",
		},
		{
			"Multiple&nbsp;&nbsp;&nbsp;spaces",
			"Multiple spaces",
		},
	}

	for _, tc := range testCases {
		result := service.CleanContent(tc.input)
		if result != tc.expected {
			t.Errorf("For input '%s', expected '%s', got '%s'", tc.input, tc.expected, result)
		}
	}
}
