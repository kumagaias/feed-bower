package handler

import (
	"net/http"

	"github.com/gorilla/mux"

	"feed-bower-api/internal/model"
	"feed-bower-api/internal/service"
	"feed-bower-api/pkg/response"
	"feed-bower-api/pkg/validator"
)

// FeedHandler handles feed-related HTTP requests
type FeedHandler struct {
	feedService service.FeedService
	validator   *validator.Validator
}

// NewFeedHandler creates a new feed handler
func NewFeedHandler(feedService service.FeedService) *FeedHandler {
	return &FeedHandler{
		feedService: feedService,
		validator:   validator.New(),
	}
}

// RegisterRoutes registers feed routes
func (h *FeedHandler) RegisterRoutes(router *mux.Router) {
	feedRouter := router.PathPrefix("/api/feeds").Subrouter()
	
	feedRouter.HandleFunc("", h.ListFeeds).Methods("GET")
	feedRouter.HandleFunc("", h.AddFeed).Methods("POST")
	feedRouter.HandleFunc("/{id}", h.GetFeed).Methods("GET")
	feedRouter.HandleFunc("/{id}", h.DeleteFeed).Methods("DELETE")
	feedRouter.HandleFunc("/{id}/preview", h.PreviewFeed).Methods("GET")
	feedRouter.HandleFunc("/validate", h.ValidateFeedURL).Methods("POST")
}

// AddFeedRequest represents the request to add a feed
type AddFeedRequest struct {
	BowerID string `json:"bower_id" validate:"required"`
	URL     string `json:"url" validate:"required,url"`
}

// ValidateFeedURLRequest represents the request to validate a feed URL
type ValidateFeedURLRequest struct {
	URL string `json:"url" validate:"required,url"`
}

// FeedPreviewResponse represents a feed preview
type FeedPreviewResponse struct {
	Feed     *FeedResponse     `json:"feed"`
	Articles []ArticleResponse `json:"articles"`
}

// ArticleResponse represents an article in API responses
type ArticleResponse struct {
	ArticleID   string `json:"article_id"`
	FeedID      string `json:"feed_id"`
	Title       string `json:"title"`
	Content     string `json:"content"`
	URL         string `json:"url"`
	ImageURL    string `json:"image_url,omitempty"`
	PublishedAt int64  `json:"published_at"`
	CreatedAt   int64  `json:"created_at"`
	Bower       string `json:"bower,omitempty"`
	Liked       bool   `json:"liked"`
	Read        bool   `json:"read"`
}

// AddFeed adds a new feed to a bower
func (h *FeedHandler) AddFeed(w http.ResponseWriter, r *http.Request) {
	user, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	var req AddFeedRequest
	if !ParseJSONBody(w, r, &req) {
		return
	}

	if err := h.validator.Validate(&req); err != nil {
		response.ValidationError(w, err.Error())
		return
	}

	// Convert to service request
	serviceReq := &service.AddFeedRequest{
		BowerID: req.BowerID,
		URL:     req.URL,
	}

	feed, err := h.feedService.AddFeed(r.Context(), user.UserID, serviceReq)
	if err != nil {
		if err.Error() == "access denied: not bower owner" {
			response.Forbidden(w, err.Error())
			return
		}
		if err.Error() == "feed URL already exists in this bower" {
			response.Conflict(w, err.Error())
			return
		}
		response.InternalServerError(w, "Failed to add feed: "+err.Error())
		return
	}

	response.Created(w, h.toFeedResponse(feed))
}

// GetFeed retrieves a feed by ID
func (h *FeedHandler) GetFeed(w http.ResponseWriter, r *http.Request) {
	user, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	vars := mux.Vars(r)
	feedID := vars["id"]
	if feedID == "" {
		response.BadRequest(w, "Feed ID is required")
		return
	}

	feed, err := h.feedService.GetFeedByID(r.Context(), feedID, user.UserID)
	if err != nil {
		if err.Error() == "access denied: not bower owner" {
			response.Forbidden(w, err.Error())
			return
		}
		response.NotFound(w, "Feed not found")
		return
	}

	response.Success(w, h.toFeedResponse(feed))
}

// ListFeeds lists feeds for a bower
func (h *FeedHandler) ListFeeds(w http.ResponseWriter, r *http.Request) {
	user, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	bowerID := GetQueryParam(r, "bower_id", "")
	if bowerID == "" {
		response.BadRequest(w, "bower_id query parameter is required")
		return
	}

	feeds, err := h.feedService.GetFeedsByBowerID(r.Context(), bowerID, user.UserID)
	if err != nil {
		if err.Error() == "access denied: not bower owner" {
			response.Forbidden(w, err.Error())
			return
		}
		response.InternalServerError(w, "Failed to list feeds")
		return
	}

	feedResponses := make([]*FeedResponse, len(feeds))
	for i, feed := range feeds {
		feedResponses[i] = h.toFeedResponse(feed)
	}

	response.Success(w, feedResponses)
}

// DeleteFeed deletes a feed
func (h *FeedHandler) DeleteFeed(w http.ResponseWriter, r *http.Request) {
	user, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	vars := mux.Vars(r)
	feedID := vars["id"]
	if feedID == "" {
		response.BadRequest(w, "Feed ID is required")
		return
	}

	err := h.feedService.DeleteFeed(r.Context(), user.UserID, feedID)
	if err != nil {
		if err.Error() == "access denied: not bower owner" {
			response.Forbidden(w, err.Error())
			return
		}
		if err.Error() == "cannot delete the last feed in a bower" {
			response.BadRequest(w, err.Error())
			return
		}
		response.InternalServerError(w, "Failed to delete feed: "+err.Error())
		return
	}

	response.NoContent(w)
}

// PreviewFeed previews articles from a feed
func (h *FeedHandler) PreviewFeed(w http.ResponseWriter, r *http.Request) {
	user, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	vars := mux.Vars(r)
	feedID := vars["id"]
	if feedID == "" {
		response.BadRequest(w, "Feed ID is required")
		return
	}

	limit := GetQueryParamInt32(r, "limit", 10)
	if limit > 50 {
		limit = 50
	}

	// Get feed first to check access
	feed, err := h.feedService.GetFeedByID(r.Context(), feedID, user.UserID)
	if err != nil {
		if err.Error() == "access denied: bower is private" {
			response.Forbidden(w, err.Error())
			return
		}
		response.NotFound(w, "Feed not found")
		return
	}

	// Preview the feed URL
	preview, err := h.feedService.PreviewFeed(r.Context(), user.UserID, feed.URL)
	if err != nil {
		response.InternalServerError(w, "Failed to preview feed: "+err.Error())
		return
	}

	articleResponses := make([]ArticleResponse, len(preview.Articles))
	for i, article := range preview.Articles {
		articleResponses[i] = ArticleResponse{
			Title:       article.Title,
			Content:     article.Content,
			URL:         article.URL,
			ImageURL:    article.ImageURL,
			PublishedAt: article.PublishedAt,
		}
	}

	previewResp := &FeedPreviewResponse{
		Feed:     h.toFeedResponse(feed),
		Articles: articleResponses,
	}

	response.Success(w, previewResp)
}

// ValidateFeedURL validates if a URL is a valid RSS/Atom feed
func (h *FeedHandler) ValidateFeedURL(w http.ResponseWriter, r *http.Request) {
	var req ValidateFeedURLRequest
	if !ParseJSONBody(w, r, &req) {
		return
	}

	if err := h.validator.Validate(&req); err != nil {
		response.ValidationError(w, err.Error())
		return
	}

	err := h.feedService.ValidateFeedURL(req.URL)
	isValid := err == nil

	result := map[string]interface{}{
		"valid": isValid,
	}

	if !isValid {
		result["error"] = err.Error()
	}

	response.Success(w, result)
}

// toFeedResponse converts a model.Feed to FeedResponse
func (h *FeedHandler) toFeedResponse(feed *model.Feed) *FeedResponse {
	return &FeedResponse{
		FeedID:      feed.FeedID,
		BowerID:     feed.BowerID,
		URL:         feed.URL,
		Title:       feed.Title,
		Description: feed.Description,
		Category:    feed.Category,
		LastUpdated: feed.LastUpdated,
		CreatedAt:   feed.CreatedAt,
	}
}

// toArticleResponse converts a model.Article to ArticleResponse
func (h *FeedHandler) toArticleResponse(article *model.Article) ArticleResponse {
	imageURL := ""
	if article.ImageURL != nil {
		imageURL = *article.ImageURL
	}

	return ArticleResponse{
		ArticleID:   article.ArticleID,
		FeedID:      article.FeedID,
		Title:       article.Title,
		Content:     article.Content,
		URL:         article.URL,
		ImageURL:    imageURL,
		PublishedAt: article.PublishedAt,
		CreatedAt:   article.CreatedAt,
		Bower:       article.Bower,
		Liked:       article.Liked,
		Read:        article.Read,
	}
}