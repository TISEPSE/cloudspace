import { useRef, useCallback } from 'react'

/**
 * Long-press handler for touch devices.
 * Renvoie des props à étaler sur l'élément cible.
 *
 * - Démarre un timer sur touchstart
 * - Annule sur touchmove (drag/scroll) ou touchend précoce
 * - Au déclenchement : appelle onLongPress et marque la frappe pour
 *   supprimer le `click` qui suit (sinon ouverture fichier + menu en même temps)
 */
export function useLongPress(onLongPress, { ms = 450, moveThreshold = 10 } = {}) {
  const timer = useRef(null)
  const triggered = useRef(false)
  const start = useRef({ x: 0, y: 0 })

  const cancel = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const onTouchStart = useCallback((e) => {
    triggered.current = false
    const t = e.touches?.[0]
    if (t) start.current = { x: t.clientX, y: t.clientY }
    cancel()
    timer.current = setTimeout(() => {
      triggered.current = true
      onLongPress?.(e)
    }, ms)
  }, [onLongPress, ms, cancel])

  const onTouchMove = useCallback((e) => {
    const t = e.touches?.[0]
    if (!t) return
    const dx = Math.abs(t.clientX - start.current.x)
    const dy = Math.abs(t.clientY - start.current.y)
    if (dx > moveThreshold || dy > moveThreshold) cancel()
  }, [cancel, moveThreshold])

  const onTouchEnd = useCallback(() => cancel(), [cancel])
  const onTouchCancel = useCallback(() => cancel(), [cancel])

  const onClickCapture = useCallback((e) => {
    if (triggered.current) {
      e.preventDefault()
      e.stopPropagation()
      triggered.current = false
    }
  }, [])

  const onContextMenu = useCallback((e) => {
    // Désactive le menu natif (sélection texte) sur long-press tactile
    if (triggered.current) e.preventDefault()
  }, [])

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
    onClickCapture,
    onContextMenu,
  }
}
