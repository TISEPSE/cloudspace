import { apiUrl } from './backendUrl'
import { Capacitor } from '@capacitor/core'

const ACCESS_TOKEN_KEY = 'cloudspace_access_token'
const REFRESH_TOKEN_KEY = 'cloudspace_refresh_token'
const SESSION_USER_KEY = 'cloudspace_session_user'

// Sur native (APK), on utilise @capacitor/preferences (chiffré sur Android,
// survit aux désinstallations partielles). Sur web, on reste sur localStorage.
// L'API publique reste synchrone : on charge dans un cache mémoire au boot,
// et on écrit en async (fire-and-forget) pour rester compatible avec les
// appels existants.
const IS_NATIVE = Capacitor.isNativePlatform()

let _prefs = null
async function getPrefs() {
  if (!IS_NATIVE) return null
  if (!_prefs) {
    const m = await import('@capacitor/preferences')
    _prefs = m.Preferences
  }
  return _prefs
}

// Cache mémoire (source de vérité pour la lecture sync). Sur web, on
// initialise immédiatement depuis localStorage pour ne JAMAIS bloquer le
// boot React. Sur native, on charge depuis Preferences en async.
const cache = {
  access: null,
  refresh: null,
  user: null,
  ready: false,
}

if (!IS_NATIVE) {
  try {
    cache.access = localStorage.getItem(ACCESS_TOKEN_KEY)
    cache.refresh = localStorage.getItem(REFRESH_TOKEN_KEY)
    const u = sessionStorage.getItem(SESSION_USER_KEY)
    cache.user = u ? JSON.parse(u) : null
  } catch { /* ignore */ }
  cache.ready = true
}

/**
 * À appeler une fois au démarrage de l'app sur native (no-op sur web).
 * Charge les tokens depuis @capacitor/preferences vers le cache mémoire.
 */
export async function initAuthStorage() {
  if (cache.ready) return
  try {
    const prefs = await getPrefs()
    if (!prefs) { cache.ready = true; return }
    cache.access = (await prefs.get({ key: ACCESS_TOKEN_KEY })).value || null
    cache.refresh = (await prefs.get({ key: REFRESH_TOKEN_KEY })).value || null
    const userStr = (await prefs.get({ key: SESSION_USER_KEY })).value
    try { cache.user = userStr ? JSON.parse(userStr) : null } catch { cache.user = null }
  } catch (e) {
    console.error('initAuthStorage:', e)
  } finally {
    cache.ready = true
  }
}

function persist(key, value) {
  if (IS_NATIVE) {
    getPrefs().then(p => {
      if (value == null) p.remove({ key }).catch(() => {})
      else p.set({ key, value }).catch(() => {})
    })
  } else {
    if (key === SESSION_USER_KEY) {
      if (value == null) sessionStorage.removeItem(key)
      else sessionStorage.setItem(key, value)
    } else {
      if (value == null) localStorage.removeItem(key)
      else localStorage.setItem(key, value)
    }
  }
}

export function getAccessToken() {
  return cache.access
}

export function getRefreshToken() {
  return cache.refresh
}

export function setTokens(accessToken, refreshToken) {
  if (accessToken) {
    cache.access = accessToken
    persist(ACCESS_TOKEN_KEY, accessToken)
  }
  if (refreshToken) {
    cache.refresh = refreshToken
    persist(REFRESH_TOKEN_KEY, refreshToken)
  }
}

export function clearTokens() {
  cache.access = null
  cache.refresh = null
  cache.user = null
  persist(ACCESS_TOKEN_KEY, null)
  persist(REFRESH_TOKEN_KEY, null)
  persist(SESSION_USER_KEY, null)
}

export function getSessionUser() {
  return cache.user
}

export function setSessionUser(user) {
  cache.user = user
  persist(SESSION_USER_KEY, user ? JSON.stringify(user) : null)
}

export function apiFetch(url, options = {}) {
  const token = getAccessToken()
  const headers = { ...(options.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  return fetch(apiUrl(url), { ...options, headers })
}

export async function downloadFile(fileId, filename, isFolder = false) {
  const endpoint = isFolder
    ? `/api/files/${fileId}/download-zip`
    : `/api/files/${fileId}/download`
  const res = await apiFetch(endpoint)
  if (!res.ok) throw new Error('Download failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
