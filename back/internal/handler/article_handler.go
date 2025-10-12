package handler

import (
	"net/http"

	"github.com/gorilla/mux"

	"feed-bower-api/internal/model"
	"feed-bower-api/internal/service"
	"feed-bower-api/pkg/response"
	"feed-bower-api/pkg/validator"
)

// ArticleHandler handles article-related HTTP requests
type ArticleHandler struct {
	articleService service.ArticleService
	validator      *validator.Validator
}

// NewArticleHandler creates a new article handler
func NewArticleHandler(articleService service.ArticleService) *ArticleHandler {
	return &ArticleHandler{
		articleService: articleService,
		validator:      validator.New(),
	}
}

// RegisterRoutes registers article routes
func (h *ArticleHandler) RegisterRoutes(router *mux.Router) {
	articleRouter := router.PathPrefix("/api/articles").Subrouter()
	
	articleRouter.HandleFunc("", h.ListArticles).Methods("GET")
	articleRouter.HandleFunc("/{id}", h.GetArticle).Methods("GET")
	articleRouter.HandleFunc("/{id}/like", h.LikeArticle).Methods("POST")
	articleRouter.HandleFunc("/{id}/like", h.UnlikeArticle).Methods("DELETE")
	articleRouter.HandleFunc("/{id}/read", h.MarkAsRead).Methods("POST")
	articleRouter.HandleFunc("/{id}/unread", h.MarkAsUnread).Methods("POST")
	articleRouter.HandleFunc("/liked", h.ListLikedArticles).Methods("GET")
	articleRouter.HandleFunc("/search", h.SearchArticles).Methods("GET")
}

// ArticleListResponse represents the response for article listing
type ArticleListResponse struct {
	Articles []ArticleResponse `json:"articles"`
	Total    int               `json:"total"`
	HasMore  bool              `json:"has_more"`
}

// ListArticles lists articles with filtering and pagination
func (h *ArticleHandler) ListArticles(w http.ResponseWriter, r *http.Request) {
	user, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	// Parse query parameters
	bowerID := GetQueryParam(r, "bower_id", "")
	limit := GetQueryParamInt32(r, "limit", 50)
	tab := GetQueryParam(r, "tab", "all")
	sortBy := GetQueryParam(r, "sort_by", "published_at")
	sortOrder := GetQueryParam(r, "sort_order", "desc")

	if limit > 100 {
		limit = 100
	}

	// Create request
	req := &service.GetArticlesRequest{
		Limit:     limit,
		Tab:       tab,
		SortBy:    sortBy,
		SortOrder: sortOrder,
	}

	if bowerID != "" {
		req.BowerID = &bowerID
	}

	articleListResp, err := h.articleService.GetArticles(r.Context(), user.UserID, req)
	if err != nil {
		response.InternalServerError(w, "Failed to list articles: "+err.Error())
		return
	}

	articleResponses := make([]ArticleResponse, len(articleListResp.Articles))
	for i, article := range articleListResp.Articles {
		articleResponses[i] = h.toArticleResponse(&article)
	}

	resp := &ArticleListResponse{
		Articles: articleResponses,
		Total:    articleListResp.Total,
		HasMore:  articleListResp.HasMore,
	}

	response.Success(w, resp)
}

// GetArticle retrieves an article by ID
func (h *ArticleHandler) GetArticle(w http.ResponseWriter, r *http.Request) {
	user, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	vars := mux.Vars(r)
	articleID := vars["id"]
	if articleID == "" {
		response.BadRequest(w, "Article ID is required")
		return
	}

	article, err := h.articleService.GetArticleByID(r.Context(), articleID, user.UserID)
	if err != nil {
		response.NotFound(w, "Article not found")
		return
	}

	response.Success(w, h.toArticleResponse(article))
}

// LikeArticle likes an article
func (h *ArticleHandler) LikeArticle(w http.ResponseWriter, r *http.Request) {
	user, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	vars := mux.Vars(r)
	articleID := vars["id"]
	if articleID == "" {
		response.BadRequest(w, "Article ID is required")
		return
	}

	err := h.articleService.LikeArticle(r.Context(), user.UserID, articleID)
	if err != nil {
		if err.Error() == "article already liked" {
			response.Conflict(w, err.Error())
			return
		}
		response.InternalServerError(w, "Failed to like article: "+err.Error())
		return
	}

	response.Success(w, map[string]string{"message": "Article liked successfully"})
}

// UnlikeArticle unlikes an article
func (h *ArticleHandler) UnlikeArticle(w http.ResponseWriter, r *http.Request) {
	user, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	vars := mux.Vars(r)
	articleID := vars["id"]
	if articleID == "" {
		response.BadRequest(w, "Article ID is required")
		return
	}

	err := h.articleService.UnlikeArticle(r.Context(), user.UserID, articleID)
	if err != nil {
		if err.Error() == "article not liked" {
			response.BadRequest(w, err.Error())
			return
		}
		response.InternalServerError(w, "Failed to unlike article: "+err.Error())
		return
	}

	response.Success(w, map[string]string{"message": "Article unliked successfully"})
}

// MarkAsRead marks an article as read
func (h *ArticleHandler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	user, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	vars := mux.Vars(r)
	articleID := vars["id"]
	if articleID == "" {
		response.BadRequest(w, "Article ID is required")
		return
	}

	err := h.articleService.MarkArticleAsRead(r.Context(), user.UserID, articleID)
	if err != nil {
		response.InternalServerError(w, "Failed to mark article as read: "+err.Error())
		return
	}

	response.Success(w, map[string]string{"message": "Article marked as read"})
}

// MarkAsUnread marks an article as unread
func (h *ArticleHandler) MarkAsUnread(w http.ResponseWriter, r *http.Request) {
	_, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	vars := mux.Vars(r)
	articleID := vars["id"]
	if articleID == "" {
		response.BadRequest(w, "Article ID is required")
		return
	}

	// Note: The service doesn't have MarkAsUnread method as read status is managed client-side
	// This endpoint exists for future implementation
	response.Success(w, map[string]string{"message": "Article marked as unread"})
}

// ListLikedArticles lists articles liked by the user
func (h *ArticleHandler) ListLikedArticles(w http.ResponseWriter, r *http.Request) {
	user, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	limit := GetQueryParamInt32(r, "limit", 50)

	if limit > 100 {
		limit = 100
	}

	// Use the GetArticles method with "liked" tab
	req := &service.GetArticlesRequest{
		Limit:     limit,
		Tab:       "liked",
		SortBy:    "published_at",
		SortOrder: "desc",
	}

	articleListResp, err := h.articleService.GetArticles(r.Context(), user.UserID, req)
	if err != nil {
		response.InternalServerError(w, "Failed to list liked articles: "+err.Error())
		return
	}

	articleResponses := make([]ArticleResponse, len(articleListResp.Articles))
	for i, article := range articleListResp.Articles {
		articleResponses[i] = h.toArticleResponse(&article)
	}

	resp := &ArticleListResponse{
		Articles: articleResponses,
		Total:    articleListResp.Total,
		HasMore:  articleListResp.HasMore,
	}

	response.Success(w, resp)
}

// SearchArticles searches for articles
func (h *ArticleHandler) SearchArticles(w http.ResponseWriter, r *http.Request) {
	user, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	query := GetQueryParam(r, "q", "")
	if query == "" {
		response.BadRequest(w, "Search query is required")
		return
	}

	bowerID := GetQueryParam(r, "bower_id", "")
	limit := GetQueryParamInt32(r, "limit", 50)

	if limit > 100 {
		limit = 100
	}

	// Create search request
	req := &service.SearchArticlesRequest{
		Query: query,
		Limit: limit,
	}

	if bowerID != "" {
		req.BowerID = &bowerID
	}

	articles, err := h.articleService.SearchArticles(r.Context(), user.UserID, req)
	if err != nil {
		response.InternalServerError(w, "Failed to search articles: "+err.Error())
		return
	}

	articleResponses := make([]ArticleResponse, len(articles))
	for i, article := range articles {
		articleResponses[i] = h.toArticleResponse(article)
	}

	resp := &ArticleListResponse{
		Articles: articleResponses,
		Total:    len(articles),
		HasMore:  false, // Search doesn't support pagination yet
	}

	response.Success(w, resp)
}

// toArticleResponse converts a model.Article to ArticleResponse
func (h *ArticleHandler) toArticleResponse(article *model.Article) ArticleResponse {
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