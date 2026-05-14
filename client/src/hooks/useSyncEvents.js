import { useEffect, useRef } from 'react'
import { apiUrl } from '../lib/backendUrl'
import { getAccessToken } from '../lib/api'

/**
 * Ouvre une connexion SSE vers /api/sync/events tant que l'utilisateur
 * est connecté. Émet les évènements reçus sur `window` via un CustomEvent
 * `cloudspace:sync` dont `detail = { type, data }`.
 *
 * À monter au plus haut niveau possible (Layout / AuthProvider).
 */
export function useSyncEvents(userId) {
  const sourceRef = useRef(null)
  const retryRef = useRef(0)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    let timeoutId = null

    const open = () => {
      if (cancelled) return
      const token = getAccessToken()
      if (!token) {
        // Pas encore de token, on retentera quand il sera dispo
        timeoutId = setTimeout(open, 1000)
        return
      }
      const url = apiUrl(`/api/sync/events?token=${encodeURIComponent(token)}`)
      let es
      try {
        es = new EventSource(url)
      } catch {
        timeoutId = setTimeout(open, 2000)
        return
      }
      sourceRef.current = es

      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data)
          window.dispatchEvent(new CustomEvent('cloudspace:sync', { detail: payload }))
        } catch {
          // ignore
        }
      }

      es.onerror = () => {
        es.close()
        sourceRef.current = null
        if (cancelled) return
        // Exponential backoff capped at 30s
        retryRef.current = Math.min(retryRef.current + 1, 5)
        const delay = Math.min(1000 * 2 ** retryRef.current, 30000)
        timeoutId = setTimeout(open, delay)
      }

      es.addEventListener('ready', () => {
        retryRef.current = 0
      })
    }

    open()

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
      if (sourceRef.current) {
        sourceRef.current.close()
        sourceRef.current = null
      }
    }
  }, [userId])
}

/**
 * Hook utilitaire pour s'abonner à un type d'évènement précis dans un composant.
 */
export function useSyncEvent(eventType, callback) {
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.type === eventType) callback(e.detail.data)
    }
    window.addEventListener('cloudspace:sync', handler)
    return () => window.removeEventListener('cloudspace:sync', handler)
  }, [eventType, callback])
}
