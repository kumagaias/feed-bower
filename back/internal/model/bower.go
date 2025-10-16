package model

import (
	"time"
)

// Bower represents a bower (collection of feeds organized by keywords)
type Bower struct {
	BowerID   string   `json:"bower_id" dynamodbav:"bower_id" validate:"required"`
	UserID    string   `json:"user_id" dynamodbav:"user_id" validate:"required"`
	Name      string   `json:"name" dynamodbav:"name" validate:"required,min=1,max=50"`
	Keywords  []string `json:"keywords" dynamodbav:"keywords" validate:"required,min=1,max=8,dive,min=1,max=20"`
	EggColors []string `json:"egg_colors" dynamodbav:"egg_colors"`
	Color     string   `json:"color" dynamodbav:"color" validate:"required,hexcolor"`
	IsPublic  bool     `json:"is_public" dynamodbav:"is_public"`
	CreatedAt int64    `json:"created_at" dynamodbav:"created_at"`
	UpdatedAt int64    `json:"updated_at" dynamodbav:"updated_at"`
	
	// Optional fields for public bowers
	CreatorID   *string  `json:"creator_id,omitempty" dynamodbav:"creator_id,omitempty"`
	CreatorName *string  `json:"creator_name,omitempty" dynamodbav:"creator_name,omitempty"`
	Likes       *int     `json:"likes,omitempty" dynamodbav:"likes,omitempty"`
	LikedBy     []string `json:"liked_by,omitempty" dynamodbav:"liked_by,omitempty"`
	
	// Feeds are not stored in the bower table but retrieved via relationship
	Feeds []Feed `json:"feeds,omitempty" dynamodbav:"-"`
}

// NewBower creates a new Bower instance with current timestamps
func NewBower(userID, name string, keywords []string, eggColors []string, color string, isPublic bool) *Bower {
	now := time.Now().Unix()
	return &Bower{
		UserID:    userID,
		Name:      name,
		Keywords:  keywords,
		EggColors: eggColors,
		Color:     color,
		IsPublic:  isPublic,
		CreatedAt: now,
		UpdatedAt: now,
		Feeds:     make([]Feed, 0),
	}
}

// UpdateTimestamp updates the UpdatedAt field to current time
func (b *Bower) UpdateTimestamp() {
	b.UpdatedAt = time.Now().Unix()
}

// AddKeyword adds a keyword if it doesn't already exist and doesn't exceed max limit
func (b *Bower) AddKeyword(keyword string) bool {
	if len(b.Keywords) >= 8 {
		return false
	}
	
	for _, k := range b.Keywords {
		if k == keyword {
			return false // Already exists
		}
	}
	
	b.Keywords = append(b.Keywords, keyword)
	b.UpdateTimestamp()
	return true
}

// RemoveKeyword removes a keyword from the list
func (b *Bower) RemoveKeyword(keyword string) bool {
	for i, k := range b.Keywords {
		if k == keyword {
			b.Keywords = append(b.Keywords[:i], b.Keywords[i+1:]...)
			b.UpdateTimestamp()
			return true
		}
	}
	return false
}

// HasKeyword checks if the bower contains a specific keyword
func (b *Bower) HasKeyword(keyword string) bool {
	for _, k := range b.Keywords {
		if k == keyword {
			return true
		}
	}
	return false
}