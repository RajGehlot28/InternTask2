import { useRef, useEffect, useState, useCallback } from 'react'
import { MonitorPlay, Image, Film, Square } from 'lucide-react'

const CYCLE_DURATION = 18000 // 5 hours in seconds

/**
 * Calculate which item is playing and progress within it, given
 * a 5-hour cycle position (seconds since cycle start).
 */
function calcPlayState(mediaItems, cyclePos) {
  if (!mediaItems || mediaItems.length === 0) return { item: null, itemIndex: 0, elapsed: 0 }

  const totalDur = mediaItems.reduce((s, m) => s + m.duration, 0)
  if (totalDur === 0) return { item: null, itemIndex: 0, elapsed: 0 }

  const loopPos = cyclePos % totalDur
  let acc = 0
  for (let i = 0; i < mediaItems.length; i++) {
    acc += mediaItems[i].duration
    if (loopPos < acc) {
      const elapsed = loopPos - (acc - mediaItems[i].duration)
      return { item: mediaItems[i], itemIndex: i, elapsed }
    }
  }
  return { item: mediaItems[0], itemIndex: 0, elapsed: 0 }
}

function MediaBadge({ type, syncing }) {
  if (syncing) return <span className="media-badge sync">SYNC</span>
  if (type === 'image') return <span className="media-badge image">IMAGE</span>
  if (type === 'video') return <span className="media-badge video">VIDEO</span>
  return <span className="media-badge blank">BLANK</span>
}

export default function DisplayWindow({
  window: win,
  cyclePos,
  speedMultiplier,
  syncStatus,
  onAddMedia,
  onOpenPlaylist
}) {
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const videoRef = useRef(null)

  const isSyncing = syncStatus?.active
  const items = win.mediaItems || []

  // Derive current play state from cycle position
  const playState = isSyncing ? null : calcPlayState(items, cyclePos)

  // Sync mode uses sync media
  const displayItem = isSyncing ? syncStatus.mediaItem : playState?.item
  const displayIndex = isSyncing ? -1 : (playState?.itemIndex ?? 0)

  // Progress for current item
  const rawProgress = isSyncing
    ? ((syncStatus.duration - syncStatus.remaining) / syncStatus.duration) * 100
    : displayItem
      ? (playState.elapsed / displayItem.duration) * 100
      : 0

  const clampedProgress = Math.min(100, Math.max(0, rawProgress || 0))

  // Control video element playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speedMultiplier
    }
  }, [speedMultiplier])

  // Autoplay video when item changes
  const videoKey = displayItem?.id + (isSyncing ? '-sync' : '')

  const renderMedia = () => {
    if (!displayItem) {
      return (
        <div className="blank-screen">
          <Square size={48} className="blank-icon" />
        </div>
      )
    }

    if (displayItem.type === 'image') {
      return (
        <img
          src={displayItem.url}
          alt={displayItem.title}
          loading="lazy"
          onError={(e) => { e.target.style.display='none'; }}
        />
      )
    }

    if (displayItem.type === 'video') {
      return (
        <video
          key={videoKey}
          ref={videoRef}
          src={displayItem.url}
          autoPlay
          muted
          loop
          playsInline
          onError={(e) => { e.currentTarget.style.display='none'; }}
        />
      )
    }

    return (
      <div className="blank-screen">
        <Square size={48} className="blank-icon" />
      </div>
    )
  }

  // Playlist position display
  const totalItems = items.length
  const displayIdx = isSyncing ? '—' : `${displayIndex + 1}/${totalItems}`

  return (
    <div className={`display-window${isSyncing ? ' syncing' : ''}`}>
      {/* Window Header */}
      <div className="window-header">
        <div className="window-title">
          <div className="window-num">{win.id}</div>
          <MonitorPlay size={14} style={{ color: 'var(--accent-primary)' }} />
          {win.name}
        </div>
        <div className="window-actions">
          <button
            id={`btn-add-${win.id}`}
            className="btn-icon"
            title="Add media"
            onClick={() => onAddMedia(win)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <button
            id={`btn-playlist-${win.id}`}
            className="btn-icon"
            title="View playlist"
            onClick={() => onOpenPlaylist(win)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Media Viewport */}
      <div className="media-viewport">
        {renderMedia()}
        <div className="media-overlay">
          <span className="media-title">
            {displayItem ? displayItem.title : 'No media'}
          </span>
          <MediaBadge type={displayItem?.type} syncing={isSyncing} />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${clampedProgress}%` }} />
      </div>

      {/* Footer */}
      <div className="window-footer">
        <div className="playlist-info">
          <span className="status-dot online" />
          Item <span className="current-item">{displayIdx}</span>
          {totalItems > 0 && !isSyncing && ` · ${totalItems} total`}
        </div>
        {!isSyncing && displayItem && (
          <span className="cycle-position" title="Time elapsed in current item">
            {Math.round(playState.elapsed)}s / {displayItem.duration}s
          </span>
        )}
        {isSyncing && syncStatus.remaining != null && (
          <span className="cycle-position" style={{ color: 'var(--accent-primary)' }}>
            ⟳ {Math.round(syncStatus.remaining)}s left
          </span>
        )}
      </div>
    </div>
  )
}
