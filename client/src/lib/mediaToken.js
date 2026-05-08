import { apiFetch, getAccessToken } from './api'

const _state = { token: null, expiresAt: 0, timer: null, fetching: false }

async function _refresh() {
  if (_state.fetching) return
  _state.fetching = true
  try {
    const r = await apiFetch('/api/auth/media-token')
    if (!r.ok) return
    const data = await r.json()
    _state.token = data.media_token
    _state.expiresAt = Date.now() + data.expires_in * 1000
    clearTimeout(_state.timer)
    _state.timer = setTimeout(_refresh, (data.expires_in - 30) * 1000)
  } catch { /* ignore */ } finally {
    _state.fetching = false
  }
}

export function initMediaToken() {
  _refresh()
}

export function getMediaToken() {
  return _state.token || getAccessToken()
}

export function clearMediaToken() {
  clearTimeout(_state.timer)
  _state.token = null
  _state.expiresAt = 0
  _state.fetching = false
}
