package routes

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"media-sequencer/config"
	"media-sequencer/models"
)

// AddMedia handles POST /api/windows/{id}/media
func AddMedia(w http.ResponseWriter, r *http.Request) {
	windowID, err := extractID(r.URL.Path, "/api/windows/")
	if err != nil {
		http.Error(w, `{"error":"invalid window id"}`, http.StatusBadRequest)
		return
	}

	var req models.CreateMediaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
		return
	}

	if req.Type != "image" && req.Type != "video" && req.Type != "blank" {
		http.Error(w, `{"error":"type must be image, video, or blank"}`, http.StatusBadRequest)
		return
	}
	if req.Duration <= 0 {
		req.Duration = 10
	}
	if req.Title == "" {
		req.Title = "Untitled"
	}

	// Get current max order_index
	var maxOrder int
	config.DB.QueryRow("SELECT COALESCE(MAX(order_index), -1) FROM media_items WHERE window_id = $1", windowID).Scan(&maxOrder)

	var newItem models.MediaItem
	err = config.DB.QueryRow(
		"INSERT INTO media_items (window_id, type, url, title, duration, order_index) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, window_id, type, url, title, duration, order_index",
		windowID, req.Type, req.URL, req.Title, req.Duration, maxOrder+1,
	).Scan(&newItem.ID, &newItem.WindowID, &newItem.Type, &newItem.URL, &newItem.Title, &newItem.Duration, &newItem.OrderIndex)

	if err != nil {
		http.Error(w, `{"error":"failed to insert"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newItem)
}

// DeleteMedia handles DELETE /api/media/{id}
func DeleteMedia(w http.ResponseWriter, r *http.Request) {
	id, err := extractID(r.URL.Path, "/api/media/")
	if err != nil {
		http.Error(w, `{"error":"invalid id"}`, http.StatusBadRequest)
		return
	}

	result, err := config.DB.Exec("DELETE FROM media_items WHERE id = $1", id)
	if err != nil {
		http.Error(w, `{"error":"db error"}`, http.StatusInternalServerError)
		return
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ReorderMedia handles POST /api/windows/{id}/reorder
func ReorderMedia(w http.ResponseWriter, r *http.Request) {
	// Parse window ID from path like /api/windows/1/reorder
	path := r.URL.Path
	path = strings.TrimPrefix(path, "/api/windows/")
	parts := strings.Split(path, "/")
	if len(parts) < 1 {
		http.Error(w, `{"error":"invalid path"}`, http.StatusBadRequest)
		return
	}
	windowID, err := strconv.Atoi(parts[0])
	if err != nil {
		http.Error(w, `{"error":"invalid window id"}`, http.StatusBadRequest)
		return
	}
	_ = windowID

	var req models.ReorderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
		return
	}

	for i, mediaID := range req.Order {
		config.DB.Exec("UPDATE media_items SET order_index = $1 WHERE id = $2", i, mediaID)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "reordered"})
}
