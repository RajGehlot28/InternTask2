import { useState } from 'react'
import { X, Plus, Image, Film, Square } from 'lucide-react'

const TYPE_OPTIONS = [
  { value: 'image', label: 'Image', icon: '🖼️', desc: 'Static image from URL' },
  { value: 'video', label: 'Video', icon: '🎬', desc: 'Video file from URL' },
  { value: 'blank', label: 'Blank', icon: '⬛', desc: 'Empty screen / pause' },
]

export default function AddMediaModal({ window: win, onAdd, onClose }) {
  const [type, setType] = useState('image')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (type !== 'blank' && !url.trim()) { setError('URL is required for image/video'); return }
    if (duration < 1 || duration > 3600) { setError('Duration must be 1–3600 seconds'); return }

    setLoading(true)
    setError('')
    try {
      await onAdd(win.id, { type, url: url.trim(), title: title.trim() || 'Untitled', duration: Number(duration) })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to add media')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <div className="icon-wrap">
              <Plus size={18} color="white" />
            </div>
            Add Media — {win.name}
          </div>
          <button id={`btn-close-add-modal-${win.id}`} className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Type Selector */}
          <div className="form-group">
            <label className="form-label">Media Type</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {TYPE_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  id={`type-btn-${opt.value}`}
                  onClick={() => setType(opt.value)}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${type === opt.value ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    background: type === opt.value ? 'rgba(79,156,249,0.1)' : 'var(--bg-elevated)',
                    color: type === opt.value ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'var(--transition)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    fontFamily: 'var(--font-main)',
                  }}
                >
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{opt.icon}</div>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* URL (hidden for blank) */}
          {type !== 'blank' && (
            <div className="form-group">
              <label className="form-label" htmlFor="media-url">
                {type === 'image' ? 'Image URL' : 'Video URL'}
              </label>
              <input
                id="media-url"
                type="url"
                className="form-input"
                placeholder={type === 'image' ? 'https://picsum.photos/1280/720' : 'https://example.com/video.mp4'}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          )}

          {/* Title */}
          <div className="form-group">
            <label className="form-label" htmlFor="media-title">Title</label>
            <input
              id="media-title"
              type="text"
              className="form-input"
              placeholder="Give this item a name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Duration */}
          <div className="form-group">
            <label className="form-label" htmlFor="media-duration">Duration (seconds)</label>
            <input
              id="media-duration"
              type="number"
              className="form-input"
              min="1"
              max="3600"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
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
            <button type="button" id={`btn-cancel-add-${win.id}`} className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" id={`btn-submit-add-${win.id}`} className="btn btn-primary" disabled={loading}>
              <Plus size={14} />
              {loading ? 'Adding...' : 'Add to Playlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
