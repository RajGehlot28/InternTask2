# 🖥️ Multi-Window Media Sequencer

A full-stack **multi-window display system** where multiple screens continuously play media in their own configured sequences within a **5-hour cycle**. Supports synchronized global playback across all windows, dynamic playlist management, and multiple media types (image, video, blank).

---

## ✨ Features

- **3 independent display windows**, each with its own playlist and seamless looping
- **5-hour cycle** — sequences repeat continuously, calculated by server time position
- **Global Sync** — instantly broadcast one media item to all windows simultaneously, with live countdown
- **Live cycle clock** with speed multiplier (1×, 2×, 5×, 10×) for easy testing
- **Add / Remove media** from any window's playlist in real-time
- **Blank media** support — explicit pauses in the sequence
- **Dark glassmorphism UI** with smooth animations

---

## 🏗️ Architecture

```
Frontend (React + Vite, Port 5173)
    └── REST API → Backend (Golang, Port 8080)
                        └── PostgreSQL Database
```

### Sync Mechanism

1. User selects a media item and duration and clicks "Sync All Windows"
2. Backend records sync state: `media_item_id`, `started_at`, `expires_at`, `active=true`
3. Frontend polls `/api/sync/status` every 2 seconds
4. All windows detect active sync and switch to the sync media with live countdown
5. When `expires_at` is reached, backend sets `active=false`, windows resume their own sequences

---

## 🚀 Quick Start

### Prerequisites

- **Go 1.21+** — [install](https://golang.org/dl/)
- **Node.js 18+** — [install](https://nodejs.org/)
- **PostgreSQL** — running locally or via Docker

### 1. Database Setup

```bash
createdb media_sequencer
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL
go mod tidy
go run .
```

Backend starts on `http://localhost:8080`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend starts on `http://localhost:5173` and proxies API to `:8080`.

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/windows` | List all windows with playlists |
| `GET` | `/api/windows/:id` | Get single window |
| `POST` | `/api/windows/:id/media` | Add media item to window |
| `DELETE` | `/api/media/:id` | Remove media item |
| `POST` | `/api/windows/:id/reorder` | Reorder playlist items |
| `POST` | `/api/sync` | Trigger global sync |
| `GET` | `/api/sync/status` | Get current sync state |
| `POST` | `/api/sync/cancel` | Cancel active sync |
| `POST` | `/api/seed/reset` | Reset to seed data |

### Add Media Request Body

```json
{
  "type": "image",       // "image" | "video" | "blank"
  "url": "https://...", // empty for blank
  "title": "My Image",
  "duration": 15         // seconds
}
```

### Trigger Sync Request Body

```json
{
  "mediaItemId": 3,
  "duration": 30
}
```

---

## 🐳 Docker

```bash
docker build -t media-sequencer .
docker run -p 8080:8080 -e DATABASE_URL="..." media-sequencer
```

---

## 🛠️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP server port |
| `DATABASE_URL` | `postgres://...` | PostgreSQL connection string |

---

## 📁 Project Structure

```
InternTask_2/
├── backend/
│   ├── config/db.go          # DB init, migrations, seed
│   ├── middleware/cors.go     # CORS + logger middleware
│   ├── models/models.go       # Go data structs
│   ├── routes/
│   │   ├── health.go          # /health endpoint
│   │   ├── windows.go         # Window endpoints
│   │   ├── media.go           # Media CRUD endpoints
│   │   └── sync.go            # Sync control endpoints
│   ├── main.go                # Server setup & routing
│   ├── go.mod
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DisplayWindow.jsx  # Live window display
│   │   │   ├── SyncModal.jsx      # Sync trigger modal
│   │   │   ├── AddMediaModal.jsx  # Add media form
│   │   │   └── PlaylistDrawer.jsx # Playlist sidebar
│   │   ├── App.jsx               # Main app + state
│   │   └── index.css             # Design system
│   ├── index.html
│   └── vite.config.js
├── Dockerfile
├── vercel.json
└── README.md
```
