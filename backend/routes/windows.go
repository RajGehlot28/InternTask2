package routes

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"media-sequencer/config"
	"media-sequencer/models"
)

// GetWindows handles GET /api/windows
func GetWindows(w http.ResponseWriter, r *http.Request) {
	rows, err := config.DB.Query("SELECT id, name FROM windows ORDER BY id")
	if err != nil {
		http.Error(w, `{"error":"db error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var windows []models.Window
	for rows.Next() {
		var win models.Window
		rows.Scan(&win.ID, &win.Name)
		win.MediaItems = getMediaForWindow(win.ID)
		windows = append(windows, win)
	}
	if windows == nil {
		windows = []models.Window{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(windows)
}

// GetWindow handles GET /api/windows/{id}
func GetWindow(w http.ResponseWriter, r *http.Request) {
	id, err := extractID(r.URL.Path, "/api/windows/")
	if err != nil {
		http.Error(w, `{"error":"invalid id"}`, http.StatusBadRequest)
		return
	}

	var win models.Window
	err = config.DB.QueryRow("SELECT id, name FROM windows WHERE id = $1", id).Scan(&win.ID, &win.Name)
	if err != nil {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}
	win.MediaItems = getMediaForWindow(win.ID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(win)
}

func getMediaForWindow(windowID int) []models.MediaItem {
	rows, err := config.DB.Query(
		"SELECT id, window_id, type, url, title, duration, order_index FROM media_items WHERE window_id = $1 ORDER BY order_index ASC",
		windowID,
	)
	if err != nil {
		return []models.MediaItem{}
	}
	defer rows.Close()

	var items []models.MediaItem
	for rows.Next() {
		var item models.MediaItem
		rows.Scan(&item.ID, &item.WindowID, &item.Type, &item.URL, &item.Title, &item.Duration, &item.OrderIndex)
		items = append(items, item)
	}
	if items == nil {
		items = []models.MediaItem{}
	}
	return items
}

func extractID(path, prefix string) (int, error) {
	// Strip prefix and get next segment
	trimmed := strings.TrimPrefix(path, prefix)
	parts := strings.Split(trimmed, "/")
	return strconv.Atoi(parts[0])
}
