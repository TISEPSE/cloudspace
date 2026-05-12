import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiUrl } from '../lib/backendUrl'

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''

function initials(profile) {
  return `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase()
}

const AVATAR_COLORS = [
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-600',
]

function avatarColor(email) {
  let hash = 0
  for (const c of email) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function useTurnstile(onToken, enabled) {
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)

  useEffect(() => {
    if (!enabled || !TURNSTILE_SITE_KEY || !containerRef.current) return

    const render = () => {
      if (!window.turnstile || !containerRef.current || widgetIdRef.current !== null) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'dark',
        size: 'flexible',
        callback: onToken,
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      })
    }

    if (window.turnstile) {
      render()
    } else if (!document.querySelector('script[src*="turnstile"]')) {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.onload = render
      document.head.appendChild(script)
    } else {
      document.querySelector('script[src*="turnstile"]').addEventListener('load', render)
    }

    return () => {
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [enabled, onToken])

  return containerRef
}

export default function AccountSelector() {
  const { savedProfiles, removeSavedProfile, loginWithProfile } = useAuth()
  const navigate = useNavigate()
  const [loadingEmail, setLoadingEmail] = useState(null)
  const [pendingEmail, setPendingEmail] = useState(null)
  const [turnstileToken, setTurnstileToken] = useState('')

  const turnstileRef = useTurnstile(setTurnstileToken, !!pendingEmail)

  // Dès que Turnstile valide, on lance l'auto-login
  useEffect(() => {
    if (!turnstileToken || !pendingEmail) return
    const email = pendingEmail
    setLoadingEmail(email)
    setPendingEmail(null)
    loginWithProfile(email).then(ok => {
      setLoadingEmail(null)
      setTurnstileToken('')
      if (ok) navigate('/dashboard', { replace: true })
      else navigate(`/login?email=${encodeURIComponent(email)}`)
    })
  }, [turnstileToken, pendingEmail, loginWithProfile, navigate])

  const handleSelect = (email) => {
    if (loadingEmail || pendingEmail) return
    if (!TURNSTILE_SITE_KEY) {
      setLoadingEmail(email)
      loginWithProfile(email).then(ok => {
        setLoadingEmail(null)
        if (ok) navigate('/dashboard', { replace: true })
        else navigate(`/login?email=${encodeURIComponent(email)}`)
      })
    } else {
      setPendingEmail(email)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0c1520] relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md mx-4 relative z-10">
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <span className="material-symbols-outlined text-[2.4em] text-blue-400">cloud_circle</span>
          <h1 className="text-white text-[1.6em] font-bold tracking-tight">CloudSpace</h1>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Choisir un compte</h2>
          <p className="text-sm text-slate-400">
            {savedProfiles.length > 0
              ? 'Sélectionnez votre profil pour continuer'
              : 'Aucun compte enregistré sur cet appareil'}
          </p>
        </div>

        {savedProfiles.length > 0 && (
          <div className="space-y-2 mb-6">
            {savedProfiles.map((profile) => (
              <div
                key={profile.email}
                className={`group flex items-center gap-4 p-4 bg-[#141f2e] border rounded-2xl cursor-pointer transition-all duration-150 ${
                  loadingEmail === profile.email || pendingEmail === profile.email
                    ? 'border-blue-500/60 bg-[#172030]'
                    : 'border-[#1e2d3d] hover:border-blue-500/40 hover:bg-[#172030]'
                }`}
                onClick={() => !loadingEmail && !pendingEmail && handleSelect(profile.email)}
              >
                <div className="flex-shrink-0">
                  {profile.avatar_url ? (
                    <img
                      src={apiUrl(profile.avatar_url)}
                      alt={profile.first_name}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-white/10"
                    />
                  ) : (
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarColor(profile.email)} flex items-center justify-center text-white font-bold text-base ring-2 ring-white/10`}>
                      {initials(profile)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {profile.first_name} {profile.last_name}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{profile.email}</p>
                </div>

                <div className="flex items-center gap-2">
                  {loadingEmail === profile.email ? (
                    <svg className="animate-spin w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  ) : (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeSavedProfile(profile.email) }}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Retirer ce compte"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                      <span className="material-symbols-outlined text-slate-500 group-hover:text-blue-400 text-[18px] transition-colors">
                        chevron_right
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Turnstile s'affiche dès qu'un profil est sélectionné */}
        {TURNSTILE_SITE_KEY && pendingEmail && (
          <div className="mb-4 p-4 bg-[#141f2e] border border-blue-500/30 rounded-2xl">
            <p className="text-xs text-slate-400 text-center mb-3">Vérification anti-bot requise</p>
            <div ref={turnstileRef} className="flex justify-center" />
          </div>
        )}

        {!pendingEmail && (
          <>
            <button
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl border border-dashed border-[#1e2d3d] hover:border-blue-500/40 text-slate-400 hover:text-white hover:bg-[#141f2e] transition-all text-sm font-medium"
            >
              <span className="material-symbols-outlined text-[18px]">login</span>
              {savedProfiles.length > 0 ? 'Utiliser un autre compte' : 'Se connecter'}
            </button>

            <Link
              to="/register"
              className="mt-2 w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl border border-dashed border-[#1e2d3d] hover:border-blue-500/40 text-slate-400 hover:text-white hover:bg-[#141f2e] transition-all text-sm font-medium"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Créer un nouveau compte
            </Link>
          </>
        )}

        {pendingEmail && (
          <button
            onClick={() => { setPendingEmail(null); setTurnstileToken('') }}
            className="mt-2 w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl text-slate-500 hover:text-slate-300 transition-colors text-sm"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Annuler
          </button>
        )}

        <p className="mt-8 text-center text-xs text-slate-600">
          Les sessions sont mémorisées sur cet appareil pendant 7 jours.
        </p>
      </div>
    </div>
  )
}
