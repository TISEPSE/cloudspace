import { Capacitor } from '@capacitor/core'

const BACKEND_URL_KEY = 'cloudspace_backend_url'

export function isNative() {
  return Capacitor.isNativePlatform()
}

/**
 * Returns the backend URL.
 * - On web: returns '' (relative URLs resolve to current origin)
 * - On native (APK): returns the URL configured by the user, or null if not set yet
 */
export function getBackendUrl() {
  if (!isNative()) return ''
  return localStorage.getItem(BACKEND_URL_KEY) || null
}

export function setBackendUrl(url) {
  const cleaned = (url || '').trim().replace(/\/+$/, '')
  if (cleaned) localStorage.setItem(BACKEND_URL_KEY, cleaned)
  else localStorage.removeItem(BACKEND_URL_KEY)
}

export function clearBackendUrl() {
  localStorage.removeItem(BACKEND_URL_KEY)
}

/**
 * Prefixes a relative API path with the configured backend URL.
 * Absolute URLs (http://, https://) are returned unchanged.
 */
export function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path
  const base = getBackendUrl()
  if (!base) return path
  return base + (path.startsWith('/') ? path : '/' + path)
}

/**
 * Pings the backend's /api/health endpoint.
 * Returns { ok: boolean, status?: object, error?: string }
 */
export async function pingBackend(url) {
  const base = (url ?? getBackendUrl() ?? '').replace(/\/+$/, '')
  try {
    const res = await fetch(base + '/api/health', { method: 'GET' })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    const data = await res.json().catch(() => ({}))
    return { ok: true, status: data }
  } catch (e) {
    return { ok: false, error: e.message || 'Network error' }
  }
}
