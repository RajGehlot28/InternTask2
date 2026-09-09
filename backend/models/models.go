package models

import "time"

// Window represents a display window / screen
type Window struct {
	ID         int         `json:"id"`
	Name       string      `json:"name"`
	MediaItems []MediaItem `json:"mediaItems"`
}

// MediaItem represents a single item in a window's playlist
type MediaItem struct {
	ID         int    `json:"id"`
	WindowID   int    `json:"windowId"`
	Type       string `json:"type"`     // "image" | "video" | "blank"
	URL        string `json:"url"`      // empty for blank
	Title      string `json:"title"`
	Duration   int    `json:"duration"` // seconds
	OrderIndex int    `json:"orderIndex"`
}

// SyncState represents the global sync playback state
type SyncState struct {
	ID          int       `json:"id"`
	MediaItemID int       `json:"mediaItemId"`
	MediaItem   MediaItem `json:"mediaItem"`
	Duration    int       `json:"duration"`  // seconds
	StartedAt   time.Time `json:"startedAt"`
	ExpiresAt   time.Time `json:"expiresAt"`
	Active      bool      `json:"active"`
}

// SyncStatus is the API response for sync status
type SyncStatus struct {
	Active      bool      `json:"active"`
	MediaItem   *MediaItem `json:"mediaItem,omitempty"`
	Duration    int       `json:"duration"`
	StartedAt   *time.Time `json:"startedAt,omitempty"`
	ExpiresAt   *time.Time `json:"expiresAt,omitempty"`
	Remaining   float64   `json:"remaining"` // seconds remaining
}

// CreateMediaRequest is the request body for adding media
type CreateMediaRequest struct {
	Type     string `json:"type"`
	URL      string `json:"url"`
	Title    string `json:"title"`
	Duration int    `json:"duration"`
}

// TriggerSyncRequest is the request body for triggering sync
type TriggerSyncRequest struct {
	MediaItemID int `json:"mediaItemId"`
	Duration    int `json:"duration"`
}

// ReorderRequest is the request body for reordering playlist
type ReorderRequest struct {
	Order []int `json:"order"` // ordered list of media item IDs
}
