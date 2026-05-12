import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getAccessToken, getRefreshToken, setTokens, clearTokens, getSessionUser, setSessionUser, apiFetch } from '../lib/api'
import { apiUrl } from '../lib/backendUrl'
import { initMediaToken, clearMediaToken } from '../lib/mediaToken'

const AuthContext = createContext(null)
const PROFILES_KEY = 'cloudspace_saved_profiles'
const SESSION_STARTED_KEY = 'cloudspace_session_started'
const DEVICE_ID_KEY = 'cloudspace_device_id'
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000 // 24 heures

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

export function useAuth() {
  return useContext(AuthContext)
}

function parseJwtPayload(token) {
  try {
    const base64 = token.split('.')[1]
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

function loadSavedProfiles() {
  try {
    const s = localStorage.getItem(PROFILES_KEY)
    return s ? JSON.parse(s) : []
  } catch {
    return []
  }
}

function persistProfiles(profiles) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savedProfiles, setSavedProfiles] = useState(loadSavedProfiles)

  const saveProfile = useCallback((userData, refreshToken = null) => {
    setSavedProfiles(prev => {
      const existing = prev.find(p => p.email === userData.email)
      const filtered = prev.filter(p => p.email !== userData.email)
      const profile = {
        id: userData.id,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        avatar_url: userData.avatar_url || null,
        refresh_token: refreshToken ?? existing?.refresh_token ?? null,
        device_id: existing?.device_id ?? getDeviceId(),
      }
      const next = [profile, ...filtered]
      persistProfiles(next)
      return next
    })
  }, [])

  const fetchAndSetProfile = useCallback(async (fallbackUser) => {
    try {
      const res = await apiFetch('/api/user/profile')
      if (res.ok) {
        const profile = await res.json()
        const merged = { ...fallbackUser, ...profile }
        setUser(merged)
        setSessionUser(merged)
        saveProfile(merged)
        return
      }
    } catch { /* ignore, fall back to cached */ }
    if (fallbackUser) setUser(fallbackUser)
  }, [saveProfile])

  useEffect(() => {
    const token = getAccessToken()
    const refresh = getRefreshToken()

    if (token) {
      const payload = parseJwtPayload(token)
      if (payload && payload.exp * 1000 > Date.now()) {
        const sessionUser = getSessionUser()
        fetchAndSetProfile(sessionUser).finally(() => setLoading(false))
        return
      }
    }

    if (refresh) {
      fetch(apiUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh, device_id: getDeviceId() }),
      })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => {
          setTokens(data.access_token, data.refresh_token)
          initMediaToken()
          const sessionUser = getSessionUser()
          // Mettre à jour le refresh token dans le profil sauvegardé
          if (sessionUser?.email && data.refresh_token) {
            setSavedProfiles(prev => {
              const next = prev.map(p => p.email === sessionUser.email
                ? { ...p, refresh_token: data.refresh_token }
                : p)
              persistProfiles(next)
              return next
            })
          }
          return fetchAndSetProfile(sessionUser)
        })
        .catch(() => clearTokens())
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [fetchAndSetProfile])

  const removeSavedProfile = useCallback((email) => {
    setSavedProfiles(prev => {
      const profile = prev.find(p => p.email === email)
      if (profile?.refresh_token) {
        fetch(apiUrl('/api/auth/logout'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: profile.refresh_token }),
        }).catch(() => {})
      }
      const next = prev.filter(p => p.email !== email)
      persistProfiles(next)
      return next
    })
  }, [])

  const login = useCallback(async (email, password, turnstileToken = '') => {
    const res = await fetch(apiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, cf_turnstile_response: turnstileToken }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')

    setTokens(data.access_token, data.refresh_token)
    initMediaToken()
    setSessionUser(data.user)
    saveProfile(data.user, data.refresh_token)
    localStorage.setItem(SESSION_STARTED_KEY, Date.now().toString())
    setUser(data.user)
    return data.user
  }, [saveProfile])

  const register = useCallback(async (firstName, lastName, email, password, turnstileToken = '') => {
    const res = await fetch(apiUrl('/api/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: firstName, last_name: lastName, email, password, cf_turnstile_response: turnstileToken }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Registration failed')

    setTokens(data.access_token, data.refresh_token)
    initMediaToken()
    setSessionUser(data.user)
    saveProfile(data.user, data.refresh_token)
    localStorage.setItem(SESSION_STARTED_KEY, Date.now().toString())
    setUser(data.user)
    return data.user
  }, [saveProfile])

  const loginWithProfile = useCallback(async (email) => {
    const profile = loadSavedProfiles().find(p => p.email === email)
    if (!profile?.refresh_token) return false
    if (profile.device_id && profile.device_id !== getDeviceId()) return false
    try {
      const res = await fetch(apiUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: profile.refresh_token, device_id: getDeviceId() }),
      })
      if (!res.ok) return false
      const data = await res.json()
      // Rotation : sauvegarder le nouveau refresh token
      setTokens(data.access_token, data.refresh_token)
      initMediaToken()
      localStorage.setItem(SESSION_STARTED_KEY, Date.now().toString())
      setSavedProfiles(prev => {
        const next = prev.map(p => p.email === email
          ? { ...p, refresh_token: data.refresh_token }
          : p)
        persistProfiles(next)
        return next
      })
      await fetchAndSetProfile(profile)
      return true
    } catch {
      return false
    }
  }, [fetchAndSetProfile])

  const logout = useCallback(() => {
    const refresh = getRefreshToken()
    if (refresh && user) saveProfile(user, refresh)
    localStorage.removeItem(SESSION_STARTED_KEY)
    clearTokens()
    clearMediaToken()
    setUser(null)
  }, [user, saveProfile])

  const logoutEverywhere = useCallback(async () => {
    const refresh = getRefreshToken()
    if (refresh) {
      try {
        await fetch(apiUrl('/api/auth/logout'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refresh }),
        })
      } catch { /* ignore */ }
      if (user) removeSavedProfile(user.email)
    }
    localStorage.removeItem(SESSION_STARTED_KEY)
    clearTokens()
    setUser(null)
  }, [user, removeSavedProfile])

  // Auto-déconnexion après 24h
  useEffect(() => {
    if (!user) return

    const check = () => {
      const started = localStorage.getItem(SESSION_STARTED_KEY)
      if (started && Date.now() - parseInt(started, 10) > SESSION_DURATION_MS) {
        const refresh = getRefreshToken()
        if (refresh && user) {
          setSavedProfiles(prev => {
            const existing = prev.find(p => p.email === user.email)
            const filtered = prev.filter(p => p.email !== user.email)
            const profile = { ...user, refresh_token: refresh, avatar_url: user.avatar_url || null, ...(existing || {}) }
            const next = [profile, ...filtered]
            persistProfiles(next)
            return next
          })
        }
        localStorage.removeItem(SESSION_STARTED_KEY)
        clearTokens()
        setUser(null)
      }
    }

    check()
    const interval = setInterval(check, 60 * 1000)
    window.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(interval)
      window.removeEventListener('visibilitychange', check)
    }
  }, [user])

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const next = { ...prev, ...updates }
      setSessionUser(next)
      saveProfile(next)
      return next
    })
  }, [saveProfile])

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, logout, logoutEverywhere, updateUser, loginWithProfile,
      isAuthenticated: !!user,
      savedProfiles, removeSavedProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
