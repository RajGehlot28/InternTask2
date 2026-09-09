import { useState, useEffect, useRef, useCallback } from 'react'
import './index.css'
import DisplayWindow from './components/DisplayWindow'
import SyncModal from './components/SyncModal'
import AddMediaModal from './components/AddMediaModal'
import PlaylistDrawer from './components/PlaylistDrawer'
import { Zap, RefreshCw, MonitorPlay, Activity } from 'lucide-react'

const CYCLE_DURATION = 18000 // 5-hour cycle in seconds
const SYNC_POLL_INTERVAL = 2000  // ms
const WINDOWS_POLL_INTERVAL = 5000 // ms

function useCycleClock(speedMultiplier, paused) {
  const [cyclePos, setCyclePos] = useState(0)
  const lastTickRef = useRef(Date.now())

  useEffect(() => {
    lastTickRef.current = Date.now()
    const interval = setInterval(() => {
      const now = Date.now()
      const delta = (now - lastTickRef.current) / 1000
      lastTickRef.current = now
      if (!paused) {
        setCyclePos((p) => (p + delta * speedMultiplier) % CYCLE_DURATION)
      }
    }, 200)
    return () => clearInterval(interval)
  }, [speedMultiplier, paused])

  return cyclePos
}

function formatCycleTime(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0')
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{t.type === 'success' ? '✅' : '❌'}</span>
          {t.message}
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [windows, setWindows] = useState([])
  const [syncStatus, setSyncStatus] = useState({ active: false, remaining: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [speedMultiplier, setSpeedMultiplier] = useState(1)
  const [paused, setPaused] = useState(false)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [addMediaTarget, setAddMediaTarget] = useState(null)
  const [playlistTarget, setPlaylistTarget] = useState(null)
  const [toasts, setToasts] = useState([])

  const cyclePos = useCycleClock(speedMultiplier, paused)

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
  }, [])

  // Fetch windows
  const fetchWindows = useCallback(async () => {
    try {
      const res = await fetch('/api/windows')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setWindows(data)
      setError(null)
    } catch (err) {
      setError('Cannot connect to backend. Make sure the Go server is running on port 8080.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch sync status
  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/sync/status')
      if (!res.ok) return
      const data = await res.json()
      setSyncStatus(data)
    } catch {}
  }, [])

  useEffect(() => {
    fetchWindows()
    fetchSyncStatus()
    const windowsTimer = setInterval(fetchWindows, WINDOWS_POLL_INTERVAL)
    const syncTimer = setInterval(fetchSyncStatus, SYNC_POLL_INTERVAL)
    return () => { clearInterval(windowsTimer); clearInterval(syncTimer) }
  }, [fetchWindows, fetchSyncStatus])

  // Trigger sync
  const handleSync = async (payload) => {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || 'Sync failed')
    }
    await fetchSyncStatus()
    showToast('Sync triggered! All windows are now synchronized.', 'success')
  }

  // Cancel sync
  const handleCancelSync = async () => {
    await fetch('/api/sync/cancel', { method: 'POST' })
    await fetchSyncStatus()
    showToast('Sync cancelled', 'success')
  }

  // Add media
  const handleAddMedia = async (windowId, payload) => {
    const res = await fetch(`/api/windows/${windowId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || 'Failed to add media')
    }
    await fetchWindows()
    showToast(`Added "${payload.title}" to playlist!`, 'success')
  }

  // Delete media
  const handleDeleteMedia = async (mediaId) => {
    const res = await fetch(`/api/media/${mediaId}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 204) {
      showToast('Failed to delete item', 'error')
      return
    }
    // Update local state optimistically and re-fetch
    await fetchWindows()
    // Update the drawer window too
    if (playlistTarget) {
      const updated = windows.find((w) => w.id === playlistTarget.id)
      if (updated) setPlaylistTarget({ ...updated, mediaItems: (updated.mediaItems || []).filter(m => m.id !== mediaId) })
    }
    showToast('Media item removed', 'success')
  }

  // Reset seed data
  const handleReset = async () => {
    if (!confirm('Reset all windows and media to seed data? This cannot be undone.')) return
    await fetch('/api/seed/reset', { method: 'POST' })
    await fetchWindows()
    showToast('Data reset to seed defaults', 'success')
  }

  // Update playlistTarget when windows change
  useEffect(() => {
    if (playlistTarget) {
      const updated = windows.find((w) => w.id === playlistTarget.id)
      if (updated) setPlaylistTarget(updated)
    }
  }, [windows])

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Connecting to Media Sequencer...</p>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-logo">
          <div className="logo-icon">
            <MonitorPlay size={20} color="white" />
          </div>
          <div>
            <h1>Media Sequencer</h1>
            <div className="subtitle">MULTI-WINDOW DISPLAY SYSTEM</div>
          </div>
        </div>
        <div className="header-actions">
          {error && (
            <span style={{ fontSize: '0.78rem', color: 'var(--accent-red)', background: 'rgba(239,68,68,0.1)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.2)' }}>
              ⚠ Backend offline
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <Activity size={14} style={{ color: 'var(--accent-green)' }} />
            {windows.length} Windows
          </span>
          <button id="btn-reset" className="btn btn-ghost" style={{ fontSize: '0.78rem' }} onClick={handleReset}>
            <RefreshCw size={13} /> Reset
          </button>
          <button id="btn-open-sync" className="btn btn-sync" onClick={() => setShowSyncModal(true)}>
            <Zap size={14} /> Sync All Windows
          </button>
        </div>
      </header>

      {/* Sync Banner */}
      {syncStatus.active && (
        <div className="sync-banner">
          <div className="sync-badge">
            <span className="sync-dot" />
            GLOBAL SYNC ACTIVE
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {syncStatus.mediaItem?.title || 'Syncing...'}
          </span>
          <div className="sync-countdown">
            {Math.round(syncStatus.remaining || 0)}s remaining
          </div>
          <button id="btn-cancel-sync-banner" className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={handleCancelSync}>
            Cancel
          </button>
        </div>
      )}

      {/* Controls Bar */}
      <div className="controls-bar">
        <div className="controls-left">
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>CYCLE CLOCK</span>
          <div className="cycle-clock">{formatCycleTime(cyclePos)} / 5:00:00</div>
          <div style={{ height: 16, width: 1, background: 'var(--border-subtle)' }} />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>SPEED</span>
          <div className="speed-btns">
            {[1, 2, 5, 10].map((s) => (
              <button
                key={s}
                id={`btn-speed-${s}x`}
                className={`speed-btn${speedMultiplier === s ? ' active' : ''}`}
                onClick={() => setSpeedMultiplier(s)}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
        <div className="controls-right">
          <button
            id="btn-pause"
            className={`btn ${paused ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
        </div>
      </div>

      {/* Windows Grid */}
      <main className="windows-grid">
        {windows.length === 0 && !error ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <MonitorPlay size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p>No windows found. Check the backend connection.</p>
          </div>
        ) : (
          windows.map((win) => (
            <DisplayWindow
              key={win.id}
              window={win}
              cyclePos={cyclePos}
              speedMultiplier={speedMultiplier}
              syncStatus={syncStatus}
              onAddMedia={(w) => setAddMediaTarget(w)}
              onOpenPlaylist={(w) => setPlaylistTarget(w)}
            />
          ))
        )}
      </main>

      {/* Modals & Drawers */}
      {showSyncModal && (
        <SyncModal
          windows={windows}
          onSync={handleSync}
          onClose={() => setShowSyncModal(false)}
        />
      )}

      {addMediaTarget && (
        <AddMediaModal
          window={addMediaTarget}
          onAdd={handleAddMedia}
          onClose={() => setAddMediaTarget(null)}
        />
      )}

      {playlistTarget && (
        <PlaylistDrawer
          window={playlistTarget}
          onDelete={handleDeleteMedia}
          onClose={() => setPlaylistTarget(null)}
        />
      )}

      <Toast toasts={toasts} />
    </div>
  )
}
