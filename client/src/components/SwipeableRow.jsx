import { useRef, useState, useCallback } from 'react'

/**
 * Row tactile avec actions révélées au swipe (style iOS/Android).
 *
 * Props :
 * - onSwipeLeft  / leftAction  = { icon, color, label } — action révélée en tirant vers la gauche (apparaît à droite)
 * - onSwipeRight / rightAction = { icon, color, label } — action révélée en tirant vers la droite (apparaît à gauche)
 * - onClick : tap court
 * - threshold (px) : distance pour déclencher l'action (par défaut 80)
 */
export default function SwipeableRow({
  children,
  onClick,
  onSwipeLeft,
  leftAction,
  onSwipeRight,
  rightAction,
  threshold = 80,
  className = '',
}) {
  const [dx, setDx] = useState(0)
  const [committing, setCommitting] = useState(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const dragging = useRef(false)
  const moved = useRef(false)

  const handleTouchStart = useCallback((e) => {
    const t = e.touches[0]
    startX.current = t.clientX
    startY.current = t.clientY
    dragging.current = true
    moved.current = false
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!dragging.current) return
    const t = e.touches[0]
    const deltaX = t.clientX - startX.current
    const deltaY = t.clientY - startY.current
    // Si geste vertical dominant → laisser scroller, annuler le swipe
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
      dragging.current = false
      setDx(0)
      return
    }
    if (Math.abs(deltaX) > 6) moved.current = true
    // Limite l'amplitude pour effet caoutchouc
    const max = 140
    let next = deltaX
    if (Math.abs(next) > max) {
      const overflow = Math.abs(next) - max
      next = Math.sign(next) * (max + overflow * 0.2)
    }
    if (next > 0 && !onSwipeRight) next = 0
    if (next < 0 && !onSwipeLeft) next = 0
    setDx(next)
  }, [onSwipeLeft, onSwipeRight])

  const handleTouchEnd = useCallback(() => {
    if (!dragging.current && !moved.current) {
      dragging.current = false
      return
    }
    dragging.current = false
    if (dx <= -threshold && onSwipeLeft) {
      setCommitting('left')
      setTimeout(() => {
        onSwipeLeft()
        setDx(0)
        setCommitting(null)
      }, 150)
    } else if (dx >= threshold && onSwipeRight) {
      setCommitting('right')
      setTimeout(() => {
        onSwipeRight()
        setDx(0)
        setCommitting(null)
      }, 150)
    } else {
      setDx(0)
    }
  }, [dx, threshold, onSwipeLeft, onSwipeRight])

  const handleClick = useCallback((e) => {
    if (moved.current) {
      e.preventDefault()
      e.stopPropagation()
      moved.current = false
      return
    }
    onClick?.(e)
  }, [onClick])

  const showRight = dx < 0 && onSwipeLeft
  const showLeft = dx > 0 && onSwipeRight

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Action gauche (révélée au swipe vers la droite) */}
      {rightAction && (
        <div
          className={`absolute inset-y-0 left-0 flex items-center justify-start pl-4 transition-opacity ${rightAction.color || 'bg-amber-500'} ${showLeft ? 'opacity-100' : 'opacity-0'}`}
          style={{ width: Math.max(0, dx) }}
        >
          <div className="flex items-center gap-2 text-white">
            <span className="material-symbols-outlined">{rightAction.icon}</span>
            {dx > threshold && <span className="text-sm font-medium">{rightAction.label}</span>}
          </div>
        </div>
      )}
      {/* Action droite (révélée au swipe vers la gauche) */}
      {leftAction && (
        <div
          className={`absolute inset-y-0 right-0 flex items-center justify-end pr-4 transition-opacity ${leftAction.color || 'bg-red-500'} ${showRight ? 'opacity-100' : 'opacity-0'}`}
          style={{ width: Math.max(0, -dx) }}
        >
          <div className="flex items-center gap-2 text-white">
            {(-dx) > threshold && <span className="text-sm font-medium">{leftAction.label}</span>}
            <span className="material-symbols-outlined">{leftAction.icon}</span>
          </div>
        </div>
      )}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClickCapture={handleClick}
        style={{
          transform: `translateX(${committing ? (committing === 'left' ? -window.innerWidth : window.innerWidth) : dx}px)`,
          transition: dragging.current ? 'none' : 'transform 200ms ease-out',
        }}
        className="relative bg-white dark:bg-surface-dark"
      >
        {children}
      </div>
    </div>
  )
}
