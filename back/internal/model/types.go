package model

// Language constants
const (
	LanguageJapanese = "ja"
	LanguageEnglish  = "en"
)

// Validation constants
const (
	MaxKeywords        = 8
	MaxKeywordLength   = 20
	MinKeywordLength   = 1
	MaxBowerNameLength = 50
	MinBowerNameLength = 1
	MaxUserNameLength  = 100
	MinUserNameLength  = 1
	MaxFeedTitleLength = 200
	MaxFeedDescLength  = 1000
	MaxCategoryLength  = 50
	MaxArticleTitleLen = 500
	MaxArticleContent  = 10000
	ExperiencePerLevel = 10
)

// Default colors for bowers
var DefaultBowerColors = []string{
	"#14b8a6", // Primary teal
	"#0f766e", // Dark teal
	"#f59e0b", // Amber
	"#ef4444", // Red
	"#8b5cf6", // Purple
	"#06b6d4", // Cyan
	"#84cc16", // Lime
	"#f97316", // Orange
}

// IsValidLanguage checks if the given language code is valid
func IsValidLanguage(lang string) bool {
	return lang == LanguageJapanese || lang == LanguageEnglish
}

// GetDefaultBowerColor returns a default color based on index
func GetDefaultBowerColor(index int) string {
	if index < 0 || index >= len(DefaultBowerColors) {
		return DefaultBowerColors[0] // Return primary color as default
	}
	return DefaultBowerColors[index]
}