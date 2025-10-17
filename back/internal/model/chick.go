package model

import (
	"time"
)

// ChickStats represents the chick (mascot) statistics for a user
type ChickStats struct {
	UserID       string   `json:"user_id" dynamodbav:"user_id" validate:"required"`
	TotalLikes   int      `json:"total_likes" dynamodbav:"total_likes" validate:"min=0"`
	Level        int      `json:"level" dynamodbav:"level" validate:"min=1"`
	Experience   int      `json:"experience" dynamodbav:"experience" validate:"min=0"`
	CheckedDays  int      `json:"checked_days" dynamodbav:"checked_days" validate:"min=0"`
	CheckedDates []string `json:"checked_dates" dynamodbav:"checked_dates"`
	UpdatedAt    int64    `json:"updated_at" dynamodbav:"updated_at"`

	// Computed field not stored in DB
	NextLevelExp int `json:"next_level_exp" dynamodbav:"-"`
}

// LikedArticle represents a liked article entry
type LikedArticle struct {
	UserID    string `json:"user_id" dynamodbav:"user_id" validate:"required"`
	ArticleID string `json:"article_id" dynamodbav:"article_id" validate:"required"`
	LikedAt   int64  `json:"liked_at" dynamodbav:"liked_at"`

	// These fields are joined from Articles table
	Title string  `json:"title,omitempty" dynamodbav:"-"`
	URL   string  `json:"url,omitempty" dynamodbav:"-"`
	Bower *string `json:"bower,omitempty" dynamodbav:"-"`
}

// NewChickStats creates a new ChickStats instance for a user
func NewChickStats(userID string) *ChickStats {
	stats := &ChickStats{
		UserID:       userID,
		TotalLikes:   0,
		Level:        1,
		Experience:   0,
		CheckedDays:  0,
		CheckedDates: make([]string, 0),
		UpdatedAt:    time.Now().Unix(),
	}
	stats.calculateNextLevelExp()
	return stats
}

// NewLikedArticle creates a new LikedArticle instance
func NewLikedArticle(userID, articleID string) *LikedArticle {
	return &LikedArticle{
		UserID:    userID,
		ArticleID: articleID,
		LikedAt:   time.Now().Unix(),
	}
}

// AddLike increments the total likes and experience
func (cs *ChickStats) AddLike() bool {
	cs.TotalLikes++
	oldLevel := cs.Level
	cs.addExperience(1)
	cs.UpdatedAt = time.Now().Unix()

	// Return true if level up occurred
	return cs.Level > oldLevel
}

// RemoveLike decrements the total likes and experience (if possible)
func (cs *ChickStats) RemoveLike() {
	if cs.TotalLikes > 0 {
		cs.TotalLikes--
		if cs.Experience > 0 {
			cs.Experience--
			cs.recalculateLevel()
		}
		cs.UpdatedAt = time.Now().Unix()
	}
}

// AddCheckedDate adds a new checked date if it doesn't exist
func (cs *ChickStats) AddCheckedDate(date string) bool {
	// Check if date already exists
	for _, d := range cs.CheckedDates {
		if d == date {
			return false // Already checked
		}
	}

	cs.CheckedDates = append(cs.CheckedDates, date)
	cs.CheckedDays = len(cs.CheckedDates)
	oldLevel := cs.Level
	cs.addExperience(1)
	cs.UpdatedAt = time.Now().Unix()

	// Return true if level up occurred
	return cs.Level > oldLevel
}

// IsDateChecked checks if a specific date has been checked
func (cs *ChickStats) IsDateChecked(date string) bool {
	for _, d := range cs.CheckedDates {
		if d == date {
			return true
		}
	}
	return false
}

// GetChickEmoji returns the appropriate chick emoji based on level
func (cs *ChickStats) GetChickEmoji() string {
	switch {
	case cs.Level >= 20:
		return "🐦" // Adult bird
	case cs.Level >= 10:
		return "🐥" // Young bird
	case cs.Level >= 5:
		return "🐤" // Growing chick
	default:
		return "🐣" // Baby chick
	}
}

// addExperience adds experience points and handles level up
func (cs *ChickStats) addExperience(points int) {
	cs.Experience += points

	// Check for level up (every 10 experience points)
	newLevel := (cs.Experience / 10) + 1
	if newLevel > cs.Level {
		cs.Level = newLevel
	}

	cs.calculateNextLevelExp()
}

// recalculateLevel recalculates level based on current experience
func (cs *ChickStats) recalculateLevel() {
	cs.Level = (cs.Experience / 10) + 1
	if cs.Level < 1 {
		cs.Level = 1
	}
	cs.calculateNextLevelExp()
}

// calculateNextLevelExp calculates experience needed for next level
func (cs *ChickStats) calculateNextLevelExp() {
	cs.NextLevelExp = (cs.Level * 10) - cs.Experience
	if cs.NextLevelExp < 0 {
		cs.NextLevelExp = 0
	}
}

// GetLikedAtTime returns the LikedAt timestamp as time.Time
func (la *LikedArticle) GetLikedAtTime() time.Time {
	return time.Unix(la.LikedAt, 0)
}

// SetArticleInfo sets the article information from joined data
func (la *LikedArticle) SetArticleInfo(title, url string, bower *string) {
	la.Title = title
	la.URL = url
	la.Bower = bower
}
