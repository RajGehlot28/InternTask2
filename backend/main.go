package main

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"media-sequencer/config"
	"media-sequencer/middleware"
	"media-sequencer/routes"
)

func main() {
	// Load environment
	config.InitDB()

	mux := http.NewServeMux()

	// Health
	mux.HandleFunc("/health", routes.HealthHandler)
	mux.HandleFunc("/api/health", routes.HealthHandler)

	// Windows
	mux.HandleFunc("/api/windows", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			routes.GetWindows(w, r)
		} else {
			http.NotFound(w, r)
		}
	})

	mux.HandleFunc("/api/windows/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		// /api/windows/{id}/media
		if r.Method == http.MethodPost && strings.HasSuffix(path, "/media") {
			routes.AddMedia(w, r)
			return
		}
		// /api/windows/{id}/reorder
		if r.Method == http.MethodPost && strings.HasSuffix(path, "/reorder") {
			routes.ReorderMedia(w, r)
			return
		}
		// /api/windows/{id}
		if r.Method == http.MethodGet {
			routes.GetWindow(w, r)
			return
		}
		http.NotFound(w, r)
	})

	// Media
	mux.HandleFunc("/api/media/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			routes.DeleteMedia(w, r)
		} else {
			http.NotFound(w, r)
		}
	})

	// Sync
	mux.HandleFunc("/api/sync/status", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			routes.GetSyncStatus(w, r)
		} else {
			http.NotFound(w, r)
		}
	})

	mux.HandleFunc("/api/sync/cancel", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			routes.CancelSync(w, r)
		} else {
			http.NotFound(w, r)
		}
	})

	mux.HandleFunc("/api/sync", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			routes.TriggerSync(w, r)
		} else {
			http.NotFound(w, r)
		}
	})

	// Seed reset
	mux.HandleFunc("/api/seed/reset", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			routes.ResetSeed(w, r)
		} else {
			http.NotFound(w, r)
		}
	})

	// Background worker: auto-expire sync state every 5 seconds
	go func() {
		ticker := time.NewTicker(5 * time.Second)
		for range ticker.C {
			config.DB.Exec("UPDATE sync_state SET active = FALSE WHERE id = 1 AND active = TRUE AND expires_at < NOW()")
		}
	}()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	handler := middleware.Chain(mux, middleware.Logger, middleware.CORS)
	log.Printf("🚀 Media Sequencer API running on :%s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
