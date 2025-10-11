package model

import (
	"testing"
	"time"
)

func TestNewChickStats(t *testing.T) {
	userID := "user-123"
	stats := NewChickStats(userID)

	if stats.UserID != userID {
		t.Errorf("Expected UserID %s, got %s", userID, stats.UserID)
	}
	if stats.TotalLikes != 0 {
		t.Errorf("Expected TotalLikes 0, got %d", stats.TotalLikes)
	}
	if stats.Level != 1 {
		t.Errorf("Expected Level 1, got %d", stats.Level)
	}
	if stats.Experience != 0 {
		t.Errorf("Expected Experience 0, got %d", stats.Experience)
	}
	if stats.CheckedDays != 0 {
		t.Errorf("Expected CheckedDays 0, got %d", stats.CheckedDays)
	}
	if stats.NextLevelExp != 10 {
		t.Errorf("Expected NextLevelExp 10, got %d", stats.NextLevelExp)
	}
	if stats.CheckedDates == nil {
		t.Error("CheckedDates should be initialized")
	}
}

func TestChickStats_AddLike(t *testing.T) {
	stats := NewChickStats("user-123")

	// Test adding likes without level up
	for i := 1; i <= 9; i++ {
		levelUp := stats.AddLike()
		if levelUp {
			t.Errorf("Should not level up at like %d", i)
		}
		if stats.TotalLikes != i {
			t.Errorf("Expected TotalLikes %d, got %d", i, stats.TotalLikes)
		}
		if stats.Experience != i {
			t.Errorf("Expected Experience %d, got %d", i, stats.Experience)
		}
		if stats.Level != 1 {
			t.Errorf("Expected Level 1, got %d", stats.Level)
		}
	}

	// Test level up at 10th like
	levelUp := stats.AddLike()
	if !levelUp {
		t.Error("Should level up at 10th like")
	}
	if stats.Level != 2 {
		t.Errorf("Expected Level 2, got %d", stats.Level)
	}
	if stats.NextLevelExp != 10 {
		t.Errorf("Expected NextLevelExp 10, got %d", stats.NextLevelExp)
	}
}

func TestChickStats_RemoveLike(t *testing.T) {
	stats := NewChickStats("user-123")
	
	// Add some likes first
	for i := 0; i < 5; i++ {
		stats.AddLike()
	}

	originalLikes := stats.TotalLikes
	originalExp := stats.Experience

	stats.RemoveLike()

	if stats.TotalLikes != originalLikes-1 {
		t.Errorf("Expected TotalLikes %d, got %d", originalLikes-1, stats.TotalLikes)
	}
	if stats.Experience != originalExp-1 {
		t.Errorf("Expected Experience %d, got %d", originalExp-1, stats.Experience)
	}

	// Test removing when already at 0
	stats.TotalLikes = 0
	stats.Experience = 0
	stats.RemoveLike()

	if stats.TotalLikes != 0 {
		t.Error("TotalLikes should not go below 0")
	}
	if stats.Experience != 0 {
		t.Error("Experience should not go below 0")
	}
}

func TestChickStats_AddCheckedDate(t *testing.T) {
	stats := NewChickStats("user-123")
	date := "2024-10-09"

	// Test adding new date
	levelUp := stats.AddCheckedDate(date)
	if levelUp {
		t.Error("Should not level up on first check")
	}
	if stats.CheckedDays != 1 {
		t.Errorf("Expected CheckedDays 1, got %d", stats.CheckedDays)
	}
	if !stats.IsDateChecked(date) {
		t.Error("Date should be marked as checked")
	}

	// Test adding duplicate date
	levelUp = stats.AddCheckedDate(date)
	if levelUp {
		t.Error("Should not level up on duplicate date")
	}
	if stats.CheckedDays != 1 {
		t.Errorf("Expected CheckedDays to remain 1, got %d", stats.CheckedDays)
	}

	// Test adding enough dates to level up (need 9 more since we already have 1 experience)
	for i := 1; i <= 8; i++ {
		date := "2024-10-" + string(rune('0'+i))
		stats.AddCheckedDate(date)
	}

	// This should be the 10th experience point, causing level up
	levelUp = stats.AddCheckedDate("2024-10-19")
	if !levelUp {
		t.Error("Should level up after 10 total experience points")
	}
}

func TestChickStats_GetChickEmoji(t *testing.T) {
	tests := []struct {
		level    int
		expected string
	}{
		{1, "🐣"},
		{4, "🐣"},
		{5, "🐤"},
		{9, "🐤"},
		{10, "🐥"},
		{19, "🐥"},
		{20, "🐦"},
		{100, "🐦"},
	}

	for _, test := range tests {
		stats := &ChickStats{Level: test.level}
		result := stats.GetChickEmoji()
		if result != test.expected {
			t.Errorf("For level %d, expected %s, got %s", test.level, test.expected, result)
		}
	}
}

func TestNewLikedArticle(t *testing.T) {
	userID := "user-123"
	articleID := "article-456"

	liked := NewLikedArticle(userID, articleID)

	if liked.UserID != userID {
		t.Errorf("Expected UserID %s, got %s", userID, liked.UserID)
	}
	if liked.ArticleID != articleID {
		t.Errorf("Expected ArticleID %s, got %s", articleID, liked.ArticleID)
	}
	if liked.LikedAt == 0 {
		t.Error("LikedAt should be set")
	}
}

func TestLikedArticle_GetLikedAtTime(t *testing.T) {
	liked := NewLikedArticle("user-123", "article-456")
	likedTime := liked.GetLikedAtTime()

	// Should be close to current time
	if time.Since(likedTime) > time.Second {
		t.Error("LikedAt time should be close to current time")
	}
}