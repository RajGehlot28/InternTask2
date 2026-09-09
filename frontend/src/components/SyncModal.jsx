import { useState } from 'react'
import { X, Zap, Clock } from 'lucide-react'

export default function SyncModal({ windows, onSync, onClose }) {
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [duration, setDuration] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Flatten all media items from all windows for selection
  const allItems = windows.flatMap((w) =>
    (w.mediaItems || []).map((m) => ({ ...m, windowName: w.name }))
  ).filter(m => m.type !== 'blank') // blank sync doesn't make sense usually

  const selectedItem = allItems.find((m) => m.id === selectedItemId)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedItemId) { setError('Please select a media item'); return }
    if (duration < 1 || duration > 3600) { setError('Duration must be 1–3600 seconds'); return }

    setLoading(true)
    setError('')
    try {
      await onSync({ mediaItemId: selectedItemId, duration: Number(duration) })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to trigger sync')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <div className="icon-wrap">
              <Zap size={18} color="white" />
            </div>
            Trigger Global Sync
          </div>
          <button id="btn-close-sync-modal" className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Select a media item to broadcast simultaneously across all display windows. All windows will switch instantly.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Media Picker */}
          <div className="form-group">
            <label className="form-label">Select Media Item</label>
            <div className="media-picker-grid">
              {allItems.length === 0 ? (
                <div className="empty-state">
                  <p>No media items available. Add some first.</p>
                </div>
              ) : (
                allItems.map((item) => (
                  <div
                    key={item.id}
                    id={`picker-item-${item.id}`}
                    className={`media-picker-item${selectedItemId === item.id ? ' selected' : ''}`}
                    onClick={() => setSelectedItemId(item.id)}
                  >
                    <div className="picker-thumb">
                      {item.type === 'image' ? (
                        <img src={item.url} alt={item.title} />
                      ) : (
                        <div style={{
                          width: '100%', height: '100%',
                          background: 'linear-gradient(135deg, #1a1040, #0d1420)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <span style={{ fontSize: '16px' }}>🎬</span>
                        </div>
                      )}
                    </div>
                    <div className="picker-info">
                      <div className="picker-title">{item.title}</div>
                      <div className="picker-meta">
                        <span className={`media-badge ${item.type}`} style={{ fontSize: '0.6rem', padding: '2px 5px' }}>
                          {item.type}
                        </span>
                        <span>{item.duration}s</span>
                        <span style={{ color: 'var(--text-muted)' }}>{item.windowName}</span>
                      </div>
                    </div>
                    {selectedItemId === item.id && (
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'var(--accent-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                          <polyline points="20 6 9 17 4 12" stroke="white" strokeWidth="3" fill="none" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Duration */}
          <div className="form-group">
            <label className="form-label" htmlFor="sync-duration">
              <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
              Sync Duration (seconds)
            </label>
            <input
              id="sync-duration"
              type="number"
              className="form-input"
              min="1"
              max="3600"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
              All windows will return to their regular sequences after this duration.
            </div>
          </div>

          {error && (
            <div style={{
              fontSize: '0.8rem', color: 'var(--accent-red)',
              background: 'rgba(239,68,68,0.08)', padding: '8px 12px',
              borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.2)',
              marginBottom: 12
            }}>
              {error}
            </div>
          )}

          <div className="form-actions">
            <button type="button" id="btn-cancel-sync" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              id="btn-submit-sync"
              className="btn btn-sync"
              disabled={loading || !selectedItemId}
            >
              <Zap size={14} />
              {loading ? 'Triggering...' : 'Trigger Sync'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
