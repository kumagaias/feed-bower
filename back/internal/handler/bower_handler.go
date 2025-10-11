package handler

import (
	"net/http"

	"github.com/gorilla/mux"

	"feed-bower-api/internal/model"
	"feed-bower-api/internal/service"
	"feed-bower-api/pkg/response"
	"feed-bower-api/pkg/validator"
)

// BowerHandler handles bower-related HTTP requests
type BowerHandler struct {
	bowerService service.BowerService
	validator    *validator.Validator
}

// NewBowerHandler creates a new bower handler
func NewBowerHandler(bowerService service.BowerService) *BowerHandler {
	return &BowerHandler{
		bowerService: bowerService,
		validator:    validator.New(),
	}
}

// RegisterRoutes registers bower routes
func (h *BowerHandler) RegisterRoutes(router *mux.Router) {
	bowerRouter := router.PathPrefix("/api/bowers").Subrouter()
	
	bowerRouter.HandleFunc("", h.ListBowers).Methods("GET")
	bowerRouter.HandleFunc("", h.CreateBower).Methods("POST")
	bowerRouter.HandleFunc("/{id}", h.GetBower).Methods("GET")
	bowerRouter.HandleFunc("/{id}", h.UpdateBower).Methods("PUT")
	bowerRouter.HandleFunc("/{id}", h.DeleteBower).Methods("DELETE")
	bowerRouter.HandleFunc("/public", h.ListPublicBowers).Methods("GET")
	bowerRouter.HandleFunc("/search", h.SearchBowers).Methods("GET")
}

// CreateBowerRequest represents the request to create a bower
type CreateBowerRequest struct {
	Name     string   `json:"name" validate:"omitempty,min=1,max=50"`
	Keywords []string `json:"keywords" validate:"required,min=1,max=8,dive,min=1,max=20"`
	Color    string   `json:"color" validate:"omitempty,hexcolor"`
	IsPublic bool     `json:"is_public"`
}

// UpdateBowerRequest represents the request to update a bower
type UpdateBowerRequest struct {
	Name     *string   `json:"name,omitempty" validate:"omitempty,min=1,max=50"`
	Keywords *[]string `json:"keywords,omitempty" validate:"omitempty,min=1,max=8,dive,min=1,max=20"`
	Color    *string   `json:"color,omitempty" validate:"omitempty,hexcolor"`
	IsPublic *bool     `json:"is_public,omitempty"`
}

// BowerResponse represents a bower in API responses
type BowerResponse struct {
	BowerID   string         `json:"bower_id"`
	UserID    string         `json:"user_id"`
	Name      string         `json:"name"`
	Keywords  []string       `json:"keywords"`
	Color     string         `json:"color"`
	IsPublic  bool           `json:"is_public"`
	CreatedAt int64          `json:"created_at"`
	UpdatedAt int64          `json:"updated_at"`
	Feeds     []FeedResponse `json:"feeds"`
}

// FeedResponse represents a feed in API responses
type FeedResponse struct {
	FeedID      string `json:"feed_id"`
	BowerID     string `json:"bower_id"`
	URL         string `json:"url"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
	LastUpdated int64  `json:"last_updated"`
	CreatedAt   int64  `json:"created_at"`
}

// CreateBower creates a new bower
func (h *BowerHandler) CreateBower(w http.ResponseWriter, r *http.Request) {
	user, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	var req CreateBowerRequest
	if !ParseJSONBody(w, r, &req) {
		return
	}

	if err := h.validator.Validate(&req); err != nil {
		response.ValidationError(w, err.Error())
		return
	}

	// Convert to service request
	serviceReq := &service.CreateBowerRequest{
		Name:     req.Name,
		Keywords: req.Keywords,
		Color:    req.Color,
		IsPublic: req.IsPublic,
	}

	bower, err := h.bowerService.CreateBower(r.Context(), user.UserID, serviceReq)
	if err != nil {
		response.InternalServerError(w, "Failed to create bower: "+err.Error())
		return
	}

	response.Created(w, h.toBowerResponse(bower))
}

// GetBower retrieves a bower by ID
func (h *BowerHandler) GetBower(w http.ResponseWriter, r *http.Request) {
	user, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	vars := mux.Vars(r)
	bowerID := vars["id"]
	if bowerID == "" {
		response.BadRequest(w, "Bower ID is required")
		return
	}

	bower, err := h.bowerService.GetBowerByID(r.Context(), bowerID, user.UserID)
	if err != nil {
		if err.Error() == "access denied: bower is private" {
			response.Forbidden(w, err.Error())
			return
		}
		response.NotFound(w, "Bower not found")
		return
	}

	response.Success(w, h.toBowerResponse(bower))
}

// ListBowers lists bowers for the authenticated user
func (h *BowerHandler) ListBowers(w http.ResponseWriter, r *http.Request) {
	user, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	limit := GetQueryParamInt32(r, "limit", 50)
	if limit > 100 {
		limit = 100
	}

	bowers, _, err := h.bowerService.GetBowersByUserID(r.Context(), user.UserID, limit, nil)
	if err != nil {
		response.InternalServerError(w, "Failed to list bowers")
		return
	}

	bowerResponses := make([]*BowerResponse, len(bowers))
	for i, bower := range bowers {
		bowerResponses[i] = h.toBowerResponse(bower)
	}

	response.Success(w, bowerResponses)
}

// UpdateBower updates an existing bower
func (h *BowerHandler) UpdateBower(w http.ResponseWriter, r *http.Request) {
	user, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	vars := mux.Vars(r)
	bowerID := vars["id"]
	if bowerID == "" {
		response.BadRequest(w, "Bower ID is required")
		return
	}

	var req UpdateBowerRequest
	if !ParseJSONBody(w, r, &req) {
		return
	}

	if err := h.validator.Validate(&req); err != nil {
		response.ValidationError(w, err.Error())
		return
	}

	// Convert to service request
	serviceReq := &service.UpdateBowerRequest{
		Name:     req.Name,
		Keywords: req.Keywords,
		Color:    req.Color,
		IsPublic: req.IsPublic,
	}

	bower, err := h.bowerService.UpdateBower(r.Context(), user.UserID, bowerID, serviceReq)
	if err != nil {
		if err.Error() == "access denied: not bower owner" {
			response.Forbidden(w, err.Error())
			return
		}
		response.InternalServerError(w, "Failed to update bower: "+err.Error())
		return
	}

	response.Success(w, h.toBowerResponse(bower))
}

// DeleteBower deletes a bower
func (h *BowerHandler) DeleteBower(w http.ResponseWriter, r *http.Request) {
	user, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	vars := mux.Vars(r)
	bowerID := vars["id"]
	if bowerID == "" {
		response.BadRequest(w, "Bower ID is required")
		return
	}

	err := h.bowerService.DeleteBower(r.Context(), user.UserID, bowerID)
	if err != nil {
		if err.Error() == "access denied: not bower owner" {
			response.Forbidden(w, err.Error())
			return
		}
		response.InternalServerError(w, "Failed to delete bower: "+err.Error())
		return
	}

	response.NoContent(w)
}

// ListPublicBowers lists public bowers
func (h *BowerHandler) ListPublicBowers(w http.ResponseWriter, r *http.Request) {
	limit := GetQueryParamInt32(r, "limit", 50)
	if limit > 100 {
		limit = 100
	}

	bowers, _, err := h.bowerService.GetPublicBowers(r.Context(), limit, nil)
	if err != nil {
		response.InternalServerError(w, "Failed to list public bowers")
		return
	}

	bowerResponses := make([]*BowerResponse, len(bowers))
	for i, bower := range bowers {
		bowerResponses[i] = h.toBowerResponse(bower)
	}

	response.Success(w, bowerResponses)
}

// SearchBowers searches for bowers
func (h *BowerHandler) SearchBowers(w http.ResponseWriter, r *http.Request) {
	user, ok := GetRequiredUserFromContext(w, r)
	if !ok {
		return
	}

	query := GetQueryParam(r, "q", "")
	if query == "" {
		response.BadRequest(w, "Search query is required")
		return
	}

	limit := GetQueryParamInt32(r, "limit", 50)
	if limit > 100 {
		limit = 100
	}

	bowers, err := h.bowerService.SearchBowers(r.Context(), user.UserID, query, limit)
	if err != nil {
		response.InternalServerError(w, "Failed to search bowers")
		return
	}

	bowerResponses := make([]*BowerResponse, len(bowers))
	for i, bower := range bowers {
		bowerResponses[i] = h.toBowerResponse(bower)
	}

	response.Success(w, bowerResponses)
}

// toBowerResponse converts a model.Bower to BowerResponse
func (h *BowerHandler) toBowerResponse(bower *model.Bower) *BowerResponse {
	feeds := make([]FeedResponse, len(bower.Feeds))
	for i, feed := range bower.Feeds {
		feeds[i] = FeedResponse{
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

	return &BowerResponse{
		BowerID:   bower.BowerID,
		UserID:    bower.UserID,
		Name:      bower.Name,
		Keywords:  bower.Keywords,
		Color:     bower.Color,
		IsPublic:  bower.IsPublic,
		CreatedAt: bower.CreatedAt,
		UpdatedAt: bower.UpdatedAt,
		Feeds:     feeds,
	}
}