package model

import (
	"testing"
)

func TestNewBower(t *testing.T) {
	userID := "user-123"
	name := "Tech News"
	keywords := []string{"AI", "Programming"}
	color := "#14b8a6"
	isPublic := false

	bower := NewBower(userID, name, keywords, []string{}, color, isPublic)

	if bower.UserID != userID {
		t.Errorf("Expected UserID %s, got %s", userID, bower.UserID)
	}
	if bower.Name != name {
		t.Errorf("Expected Name %s, got %s", name, bower.Name)
	}
	if len(bower.Keywords) != len(keywords) {
		t.Errorf("Expected %d keywords, got %d", len(keywords), len(bower.Keywords))
	}
	if bower.Color != color {
		t.Errorf("Expected Color %s, got %s", color, bower.Color)
	}
	if bower.IsPublic != isPublic {
		t.Errorf("Expected IsPublic %v, got %v", isPublic, bower.IsPublic)
	}
	if bower.CreatedAt == 0 {
		t.Error("CreatedAt should be set")
	}
	if bower.UpdatedAt == 0 {
		t.Error("UpdatedAt should be set")
	}
	if bower.Feeds == nil {
		t.Error("Feeds should be initialized")
	}
}

func TestBower_AddKeyword(t *testing.T) {
	bower := NewBower("user-123", "Test", []string{"AI"}, []string{}, "#14b8a6", false)

	// Test adding new keyword
	result := bower.AddKeyword("Programming")
	if !result {
		t.Error("Should be able to add new keyword")
	}
	if len(bower.Keywords) != 2 {
		t.Errorf("Expected 2 keywords, got %d", len(bower.Keywords))
	}

	// Test adding duplicate keyword
	result = bower.AddKeyword("AI")
	if result {
		t.Error("Should not be able to add duplicate keyword")
	}
	if len(bower.Keywords) != 2 {
		t.Errorf("Expected 2 keywords after duplicate attempt, got %d", len(bower.Keywords))
	}

	// Test adding keywords up to limit (max 5 total, already have 2)
	for i := 0; i < 3; i++ {
		bower.AddKeyword("Keyword" + string(rune('A'+i)))
	}

	// Test exceeding limit
	result = bower.AddKeyword("TooMany")
	if result {
		t.Error("Should not be able to add keyword beyond limit")
	}
	if len(bower.Keywords) != 5 {
		t.Errorf("Expected 5 keywords at limit, got %d", len(bower.Keywords))
	}
}

func TestBower_RemoveKeyword(t *testing.T) {
	bower := NewBower("user-123", "Test", []string{"AI", "Programming", "ML"}, []string{}, "#14b8a6", false)

	// Test removing existing keyword
	result := bower.RemoveKeyword("Programming")
	if !result {
		t.Error("Should be able to remove existing keyword")
	}
	if len(bower.Keywords) != 2 {
		t.Errorf("Expected 2 keywords after removal, got %d", len(bower.Keywords))
	}

	// Test removing non-existent keyword
	result = bower.RemoveKeyword("NonExistent")
	if result {
		t.Error("Should not be able to remove non-existent keyword")
	}
	if len(bower.Keywords) != 2 {
		t.Errorf("Expected 2 keywords after failed removal, got %d", len(bower.Keywords))
	}
}

func TestBower_HasKeyword(t *testing.T) {
	bower := NewBower("user-123", "Test", []string{"AI", "Programming"}, []string{}, "#14b8a6", false)

	if !bower.HasKeyword("AI") {
		t.Error("Should have keyword 'AI'")
	}
	if !bower.HasKeyword("Programming") {
		t.Error("Should have keyword 'Programming'")
	}
	if bower.HasKeyword("NonExistent") {
		t.Error("Should not have keyword 'NonExistent'")
	}
}
