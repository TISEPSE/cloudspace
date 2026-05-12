import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Pull-to-refresh tactile.
 *
 * Usage :
 *   const { pullDistance, isRefreshing } = usePullToRefresh(scrollRef, onRefresh)
 *
 * Le hook s'attache aux events touch du scrollRef. Il déclenche `onRefresh`
 * quand l'utilisateur tire vers le bas au-delà du seuil depuis scrollTop=0.
 *
 * `pullDistance` (0 → ~maxPull) : à utiliser pour animer un indicateur ou
 * translater le contenu pendant le pull.
 */
export function usePullToRefresh(scrollRef, onRefresh, { threshold = 70, maxPull = 110, resistance = 2 } = {}) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(null)
  const isActive = useRef(false)

  const handleTouchStart = useCallback((e) => {
    if (isRefreshing) return
    const el = scrollRef.current
    if (!el || el.scrollTop > 0) return
    const t = e.touches[0]
    startY.current = t.clientY
    isActive.current = true
  }, [scrollRef, isRefreshing])

  const handleTouchMove = useCallback((e) => {
    if (!isActive.current || startY.current === null) return
    const t = e.touches[0]
    const dy = t.clientY - startY.current
    if (dy <= 0) {
      setPullDistance(0)
      return
    }
    // Résistance : plus on tire, plus c'est lent (effet caoutchouc)
    const adjusted = Math.min(maxPull, dy / resistance)
    setPullDistance(adjusted)
  }, [maxPull, resistance])

  const handleTouchEnd = useCallback(async () => {
    if (!isActive.current) return
    isActive.current = false
    startY.current = null
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(threshold)
      try {
        await Promise.resolve(onRefresh?.())
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: true })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
      el.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [scrollRef, handleTouchStart, handleTouchMove, handleTouchEnd])

  return { pullDistance, isRefreshing, threshold }
}
