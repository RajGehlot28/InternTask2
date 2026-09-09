import { X, Trash2, GripVertical, ListVideo } from 'lucide-react'

export default function PlaylistDrawer({ window: win, onDelete, onClose }) {
  const items = (win?.mediaItems || []).slice().sort((a, b) => a.orderIndex - b.orderIndex)

  const totalDur = items.reduce((s, m) => s + m.duration, 0)
  const formatDur = (s) => {
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60)
    const r = s % 60
    return r ? `${m}m ${r}s` : `${m}m`
  }

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <div>
            <div className="drawer-title">
              <ListVideo size={16} style={{ display: 'inline', marginRight: 6, color: 'var(--accent-primary)' }} />
              {win?.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {items.length} items · Total {formatDur(totalDur)}
            </div>
          </div>
          <button id={`btn-close-drawer-${win?.id}`} className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="empty-state">
              <ListVideo size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              <p>No media items in this playlist.</p>
              <p style={{ marginTop: 4, fontSize: '0.75rem' }}>Click + to add media.</p>
            </div>
          ) : (
            items.map((item, idx) => (
              <div key={item.id} className="playlist-item">
                {/* Drag handle (visual only) */}
                <GripVertical size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />

                {/* Order index */}
                <div style={{
                  width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                  background: 'var(--bg-surface)', fontSize: '0.68rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-muted)', fontFamily: 'var(--font-mono)'
                }}>
                  {idx + 1}
                </div>

                {/* Thumbnail */}
                <div className="playlist-item-thumb">
                  {item.type === 'image' && (
                    <img src={item.url} alt={item.title} />
                  )}
                  {item.type === 'video' && (
                    <div style={{
                      width: '100%', height: '100%',
                      background: 'linear-gradient(135deg, #1a1040, #0d1420)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px'
                    }}>🎬</div>
                  )}
                  {item.type === 'blank' && (
                    <div className="thumb-blank">
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>⬛</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="playlist-item-info">
                  <div className="playlist-item-title">{item.title}</div>
                  <div className="playlist-item-meta">
                    <span className={`media-badge ${item.type}`} style={{ fontSize: '0.6rem', padding: '2px 5px' }}>
                      {item.type}
                    </span>
                    <span className="playlist-item-dur">{formatDur(item.duration)}</span>
                  </div>
                </div>

                {/* Delete */}
                <button
                  id={`btn-delete-media-${item.id}`}
                  className="btn-icon"
                  style={{ flexShrink: 0 }}
                  title="Remove from playlist"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 size={13} style={{ color: 'var(--accent-red)' }} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer summary */}
        {items.length > 0 && (
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border-glass)',
            background: 'var(--bg-elevated)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span>Loop duration: <strong style={{ color: 'var(--text-primary)' }}>{formatDur(totalDur)}</strong></span>
            <span>Repeats in 5h cycle: <strong style={{ color: 'var(--accent-primary)' }}>{(18000 / (totalDur || 1)).toFixed(1)}×</strong></span>
          </div>
        )}
      </div>
    </>
  )
}
