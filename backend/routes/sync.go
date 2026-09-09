package routes

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"media-sequencer/config"
	"media-sequencer/models"
)

// TriggerSync handles POST /api/sync
func TriggerSync(w http.ResponseWriter, r *http.Request) {
	var req models.TriggerSyncRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
		return
	}

	if req.MediaItemID <= 0 {
		http.Error(w, `{"error":"mediaItemId required"}`, http.StatusBadRequest)
		return
	}
	if req.Duration <= 0 {
		req.Duration = 30
	}

	// Verify the media item exists
	var item models.MediaItem
	err := config.DB.QueryRow(
		"SELECT id, window_id, type, url, title, duration, order_index FROM media_items WHERE id = $1",
		req.MediaItemID,
	).Scan(&item.ID, &item.WindowID, &item.Type, &item.URL, &item.Title, &item.Duration, &item.OrderIndex)
	if err != nil {
		http.Error(w, `{"error":"media item not found"}`, http.StatusNotFound)
		return
	}

	now := time.Now().UTC()
	expiresAt := now.Add(time.Duration(req.Duration) * time.Second)

	// Upsert sync state
	_, err = config.DB.Exec(`
		INSERT INTO sync_state (id, media_item_id, duration, started_at, expires_at, active)
		VALUES (1, $1, $2, $3, $4, TRUE)
		ON CONFLICT (id) DO UPDATE SET
			media_item_id = EXCLUDED.media_item_id,
			duration = EXCLUDED.duration,
			started_at = EXCLUDED.started_at,
			expires_at = EXCLUDED.expires_at,
			active = TRUE
	`, req.MediaItemID, req.Duration, now, expiresAt)

	if err != nil {
		log.Printf("TriggerSync DB error: %v", err)
		http.Error(w, `{"error":"db error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":     "sync_triggered",
		"mediaItem":  item,
		"duration":   req.Duration,
		"startedAt":  now,
		"expiresAt":  expiresAt,
	})
}

// GetSyncStatus handles GET /api/sync/status
func GetSyncStatus(w http.ResponseWriter, r *http.Request) {
	var state struct {
		MediaItemID *int
		Duration    int
		StartedAt   *time.Time
		ExpiresAt   *time.Time
		Active      bool
	}

	err := config.DB.QueryRow(`
		SELECT media_item_id, duration, started_at, expires_at, active
		FROM sync_state WHERE id = 1
	`).Scan(&state.MediaItemID, &state.Duration, &state.StartedAt, &state.ExpiresAt, &state.Active)

	status := models.SyncStatus{}

	if err != nil {
		// No sync state row yet
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(status)
		return
	}

	// Auto-expire if time has passed
	if state.Active && state.ExpiresAt != nil && time.Now().UTC().After(*state.ExpiresAt) {
		config.DB.Exec("UPDATE sync_state SET active = FALSE WHERE id = 1")
		state.Active = false
	}

	status.Active = state.Active
	status.Duration = state.Duration
	status.StartedAt = state.StartedAt
	status.ExpiresAt = state.ExpiresAt

	if state.Active && state.ExpiresAt != nil {
		remaining := time.Until(*state.ExpiresAt).Seconds()
		if remaining < 0 {
			remaining = 0
		}
		status.Remaining = remaining
	}

	if state.Active && state.MediaItemID != nil {
		var item models.MediaItem
		err := config.DB.QueryRow(
			"SELECT id, window_id, type, url, title, duration, order_index FROM media_items WHERE id = $1",
			*state.MediaItemID,
		).Scan(&item.ID, &item.WindowID, &item.Type, &item.URL, &item.Title, &item.Duration, &item.OrderIndex)
		if err == nil {
			status.MediaItem = &item
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

// CancelSync handles POST /api/sync/cancel
func CancelSync(w http.ResponseWriter, r *http.Request) {
	config.DB.Exec("UPDATE sync_state SET active = FALSE WHERE id = 1")
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "cancelled"})
}

// ResetSeed handles POST /api/seed/reset
func ResetSeed(w http.ResponseWriter, r *http.Request) {
	config.ResetSeed()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "reset_complete"})
}
