const ACCESS_TOKEN_KEY = 'cloudspace_access_token'
const REFRESH_TOKEN_KEY = 'cloudspace_refresh_token'
const SESSION_USER_KEY = 'cloudspace_session_user'

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setTokens(accessToken, refreshToken) {
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  sessionStorage.removeItem(SESSION_USER_KEY)
}

export function getSessionUser() {
  try {
    const s = sessionStorage.getItem(SESSION_USER_KEY)
    return s ? JSON.parse(s) : null
  } catch {
    return null
  }
}

export function setSessionUser(user) {
  sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user))
}

export function apiFetch(url, options = {}) {
  const token = getAccessToken()
  const headers = { ...(options.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  return fetch(url, { ...options, headers })
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
