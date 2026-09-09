package config

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
)

var DB *sql.DB

// InitDB initializes the database connection and creates schema
func InitDB() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		// Default to in-memory SQLite-style fallback using PostgreSQL local
		dbURL = "postgres://postgres:password@localhost:5432/media_sequencer?sslmode=disable"
	}

	var err error
	for i := 0; i < 10; i++ {
		DB, err = sql.Open("postgres", dbURL)
		if err == nil {
			err = DB.Ping()
		}
		if err == nil {
			break
		}
		log.Printf("DB connection attempt %d failed: %v. Retrying in 2s...", i+1, err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatalf("Failed to connect to database after retries: %v", err)
	}

	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(5)
	DB.SetConnMaxLifetime(5 * time.Minute)

	log.Println("Database connected successfully")
	runMigrations()
	seedData()
}

func runMigrations() {
	schema := `
	CREATE TABLE IF NOT EXISTS windows (
		id SERIAL PRIMARY KEY,
		name TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS media_items (
		id SERIAL PRIMARY KEY,
		window_id INTEGER REFERENCES windows(id) ON DELETE CASCADE,
		type TEXT NOT NULL CHECK (type IN ('image', 'video', 'blank')),
		url TEXT DEFAULT '',
		title TEXT DEFAULT '',
		duration INTEGER NOT NULL DEFAULT 10,
		order_index INTEGER NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS sync_state (
		id INTEGER PRIMARY KEY DEFAULT 1,
		media_item_id INTEGER REFERENCES media_items(id) ON DELETE SET NULL,
		duration INTEGER NOT NULL DEFAULT 0,
		started_at TIMESTAMPTZ,
		expires_at TIMESTAMPTZ,
		active BOOLEAN NOT NULL DEFAULT FALSE,
		CONSTRAINT singleton CHECK (id = 1)
	);
	`
	if _, err := DB.Exec(schema); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}
	log.Println("Schema migrations applied")
}

func seedData() {
	// Check if already seeded
	var count int
	DB.QueryRow("SELECT COUNT(*) FROM windows").Scan(&count)
	if count > 0 {
		log.Println("Database already seeded, skipping")
		return
	}

	// Insert seed windows
	windows := []string{"Display Window 1", "Display Window 2", "Display Window 3"}
	windowIDs := make([]int, 3)
	for i, name := range windows {
		err := DB.QueryRow("INSERT INTO windows (name) VALUES ($1) RETURNING id", name).Scan(&windowIDs[i])
		if err != nil {
			log.Printf("Failed to seed window %s: %v", name, err)
		}
	}

	// Seed media items per window
	type seedMedia struct {
		mtype    string
		url      string
		title    string
		duration int
	}

	seedItems := [][]seedMedia{
		// Window 1
		{
			{mtype: "image", url: "https://picsum.photos/seed/w1a/1280/720", title: "Nature Landscape", duration: 15},
			{mtype: "video", url: "https://www.w3schools.com/html/mov_bbb.mp4", title: "Big Buck Bunny Clip", duration: 20},
			{mtype: "blank", url: "", title: "Blank Pause", duration: 5},
			{mtype: "image", url: "https://picsum.photos/seed/w1b/1280/720", title: "City Skyline", duration: 10},
		},
		// Window 2
		{
			{mtype: "video", url: "https://www.w3schools.com/html/movie.mp4", title: "Sample Video", duration: 25},
			{mtype: "image", url: "https://picsum.photos/seed/w2a/1280/720", title: "Mountain View", duration: 12},
			{mtype: "image", url: "https://picsum.photos/seed/w2b/1280/720", title: "Ocean Waves", duration: 18},
		},
		// Window 3
		{
			{mtype: "image", url: "https://picsum.photos/seed/w3a/1280/720", title: "Forest Path", duration: 10},
			{mtype: "blank", url: "", title: "Transition", duration: 3},
			{mtype: "image", url: "https://picsum.photos/seed/w3b/1280/720", title: "Desert Dunes", duration: 20},
			{mtype: "video", url: "https://www.w3schools.com/html/mov_bbb.mp4", title: "Wildlife Clip", duration: 15},
			{mtype: "image", url: "https://picsum.photos/seed/w3c/1280/720", title: "Snowy Peaks", duration: 8},
		},
	}

	for i, wID := range windowIDs {
		for j, item := range seedItems[i] {
			_, err := DB.Exec(
				"INSERT INTO media_items (window_id, type, url, title, duration, order_index) VALUES ($1,$2,$3,$4,$5,$6)",
				wID, item.mtype, item.url, item.title, item.duration, j,
			)
			if err != nil {
				log.Printf("Failed to seed media item: %v", err)
			}
		}
	}

	// Initialize sync_state singleton row
	_, err := DB.Exec(`INSERT INTO sync_state (id, active) VALUES (1, FALSE) ON CONFLICT (id) DO NOTHING`)
	if err != nil {
		log.Printf("Failed to init sync_state: %v", err)
	}

	log.Printf("Seeded %d windows with media items", len(windows))
	fmt.Println("Database seeded successfully!")
}

// ResetSeed drops all data and reseeds
func ResetSeed() {
	DB.Exec("DELETE FROM sync_state")
	DB.Exec("DELETE FROM media_items")
	DB.Exec("DELETE FROM windows")
	DB.Exec("ALTER SEQUENCE windows_id_seq RESTART WITH 1")
	DB.Exec("ALTER SEQUENCE media_items_id_seq RESTART WITH 1")
	log.Println("Data cleared, reseeding...")
	seedData()
}
