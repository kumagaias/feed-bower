package handler

import (
	"net/http"

	"github.com/gorilla/mux"

	"feed-bower-api/internal/model"
	"feed-bower-api/internal/service"
	"feed-bower-api/pkg/response"
	"feed-bower-api/pkg/validator"
)

// ChickHandler handles chick-related HTTP requests
type ChickHandler struct {
	chickService service.ChickService
	validator    *validator.Validator
}

// NewChickHandler creates a new chick handler
func NewChickHandler(chickService service.ChickService) *ChickHandler {
	return &ChickHandler{
		chickService: chickService,
		validator:    validator.New(),
	}
}

// RegisterRoutes registers chick routes
func (h *ChickHandler) RegisterRoutes(router *mux.Router) {
	chickRouter := router.PathPrefix("/api/chick").Subrouter()
	
	chickRouter.HandleFunc("/stats", h.GetStats).Methods("GET")
	chickRouter.HandleFunc("/stats", h.UpdateStats).Methods("PUT")
	chickRouter.HandleFunc("/liked-articles", h.GetLikedArticles).Methods("GET")
	chickRouter.HandleFunc("/check-date", h.CheckDate).Methods("POST")
	chickRouter.HandleFunc("/uncheck-date", h.UncheckDate).Methods("POST")
}

// UpdateStatsRequest represents the request to update chick stats
type UpdateStatsRequest struct {
	Action string `json:"action" validate:"required,oneof=like unlike check uncheck"`
	Date   string `json:"date,omitempty" validate:"omitempty"`
}

// CheckDateRequest represents the request to check a date
type CheckDateRequest struct {
	Date string `json:"date" validate:"required"`
}

// ChickStatsResponse represents chick stats in API responses
type ChickStatsResponse struct {
	UserID       string   `json:"user_id"`
	TotalLikes   int      `json:"total_likes"`
	Level        int      `json:"level"`
	Experience   int      `json:"experience"`
	NextLevelExp int      `json:"next_level_exp"`
	CheckedDays  int      `json:"checked_days"`
	CheckedDates []string `json:"checked_dates"`
	UpdatedAt    int64    `json:"updated_at"`
}

// LikedArticleResponse represents a liked article in API responses
type LikedArticleResponse struct {
	ArticleID string `json:"article_id"`
	Title     string `json:"title"`
	URL       string `json:"url"`
	LikedAt   int64  `json:"liked_at"`
	Bower     string `json:"bower,omitempty"`
}

// GetStats retrieves chick stats for the authenticated user
func (h *ChickHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	user, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	stats, err := h.chickService.GetStats(r.Context(), user.UserID)
	if err != nil {
		response.InternalServerError(w, "Failed to get chick stats: "+err.Error())
		return
	}

	response.Success(w, h.toChickStatsResponse(stats))
}

// UpdateStats updates chick stats based on user actions
func (h *ChickHandler) UpdateStats(w http.ResponseWriter, r *http.Request) {
	user, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	var req UpdateStatsRequest
	if !ParseJSONBody(w, r, &req) {
		return
	}

	if err := h.validator.Validate(&req); err != nil {
		response.ValidationError(w, err.Error())
		return
	}

	var stats *model.ChickStats
	var err error

	var chickResp *service.ChickStatsResponse

	switch req.Action {
	case "like":
		if req.Date == "" {
			response.BadRequest(w, "Article ID is required for like action")
			return
		}
		chickResp, err = h.chickService.AddLike(r.Context(), user.UserID, req.Date)
	case "unlike":
		if req.Date == "" {
			response.BadRequest(w, "Article ID is required for unlike action")
			return
		}
		chickResp, err = h.chickService.RemoveLike(r.Context(), user.UserID, req.Date)
	case "check":
		if req.Date == "" {
			response.BadRequest(w, "Date is required for check action")
			return
		}
		chickResp, err = h.chickService.CheckDate(r.Context(), user.UserID, req.Date)
	default:
		response.BadRequest(w, "Invalid action")
		return
	}

	if err != nil {
		response.InternalServerError(w, "Failed to update chick stats: "+err.Error())
		return
	}

	stats = chickResp.Stats

	response.Success(w, h.toChickStatsResponse(stats))
}

// CheckDate checks a specific date
func (h *ChickHandler) CheckDate(w http.ResponseWriter, r *http.Request) {
	user, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	var req CheckDateRequest
	if !ParseJSONBody(w, r, &req) {
		return
	}

	if err := h.validator.Validate(&req); err != nil {
		response.ValidationError(w, err.Error())
		return
	}

	chickResp, err := h.chickService.CheckDate(r.Context(), user.UserID, req.Date)
	if err != nil {
		if err.Error() == "date already checked" {
			response.Conflict(w, err.Error())
			return
		}
		response.InternalServerError(w, "Failed to check date: "+err.Error())
		return
	}

	response.Success(w, h.toChickStatsResponse(chickResp.Stats))
}

// UncheckDate unchecks a specific date (not implemented in service yet)
func (h *ChickHandler) UncheckDate(w http.ResponseWriter, r *http.Request) {
	_, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	var req CheckDateRequest
	if !ParseJSONBody(w, r, &req) {
		return
	}

	if err := h.validator.Validate(&req); err != nil {
		response.ValidationError(w, err.Error())
		return
	}

	// Note: UncheckDate is not implemented in the service yet
	// For now, return an error
	response.BadRequest(w, "Unchecking dates is not supported yet")
}

// GetLikedArticles retrieves liked articles for the chick stats modal
func (h *ChickHandler) GetLikedArticles(w http.ResponseWriter, r *http.Request) {
	user, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	limit := GetQueryParamInt32(r, "limit", 50)

	if limit > 100 {
		limit = 100
	}

	likedResp, err := h.chickService.GetLikedArticles(r.Context(), user.UserID, limit, nil)
	if err != nil {
		response.InternalServerError(w, "Failed to get liked articles: "+err.Error())
		return
	}

	articleResponses := make([]LikedArticleResponse, len(likedResp.Articles))
	for i, article := range likedResp.Articles {
		bower := ""
		if article.Bower != nil {
			bower = *article.Bower
		}
		
		articleResponses[i] = LikedArticleResponse{
			ArticleID: article.ArticleID,
			Title:     article.Title,
			URL:       article.URL,
			LikedAt:   article.LikedAt,
			Bower:     bower,
		}
	}

	response.Success(w, articleResponses)
}

// toChickStatsResponse converts a model.ChickStats to ChickStatsResponse
func (h *ChickHandler) toChickStatsResponse(stats *model.ChickStats) *ChickStatsResponse {
	return &ChickStatsResponse{
		UserID:       stats.UserID,
		TotalLikes:   stats.TotalLikes,
		Level:        stats.Level,
		Experience:   stats.Experience,
		NextLevelExp: stats.NextLevelExp,
		CheckedDays:  stats.CheckedDays,
		CheckedDates: stats.CheckedDates,
		UpdatedAt:    stats.UpdatedAt,
	}
}