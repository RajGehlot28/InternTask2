package routes

import (
	"encoding/json"
	"net/http"
)

// HealthHandler handles GET /health and GET /api/health
func HealthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "ok",
		"service": "media-sequencer",
	})
}
