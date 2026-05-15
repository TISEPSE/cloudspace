/**
 * Cache mémoire global de la liste des sessions actives. Permet :
 *  - de charger une fois au boot via prefetch()
 *  - d'exposer un getter sync (cache.sessions) pour rendu instantané
 *  - de notifier les composants abonnés via subscribe()
 */
import { apiFetch } from './api'

const cache = {
  sessions: [],
  loaded: false,
  fetching: false,
}
const subscribers = new Set()

function notify() {
  subscribers.forEach(cb => { try { cb(cache.sessions) } catch { /* ignore */ } })
}

export async function refreshSessions(deviceId = '') {
  if (cache.fetching) return
  cache.fetching = true
  try {
    const qs = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : ''
    const res = await apiFetch('/api/auth/sessions' + qs)
    if (res.ok) {
      const data = await res.json()
      cache.sessions = data.sessions || []
      cache.loaded = true
      notify()
    }
  } catch {
    /* ignore */
  } finally {
    cache.fetching = false
  }
}

export function getSessions() {
  return cache.sessions
}

export function isSessionsLoaded() {
  return cache.loaded
}

export function subscribeSessions(cb) {
  subscribers.add(cb)
  return () => subscribers.delete(cb)
}

/**
 * À appeler depuis Layout (après login) pour charger la liste en arrière-plan.
 * Ne renvoie rien : les abonnés (DevicesSection) reçoivent le résultat via subscribe.
 */
export function prefetchSessions() {
  if (cache.loaded || cache.fetching) return
  const deviceId = (() => {
    try { return localStorage.getItem('cloudspace_device_id') || '' } catch { return '' }
  })()
  refreshSessions(deviceId)
}
