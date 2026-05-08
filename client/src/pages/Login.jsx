import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''

function useTurnstile(onToken) {
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !containerRef.current) return

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
  }, [onToken])

  return containerRef
}

export default function Login() {
  const [searchParams] = useSearchParams()
  const prefillEmail = searchParams.get('email') || ''

  const [email, setEmail] = useState(prefillEmail)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const turnstileRef = useTurnstile(setTurnstileToken)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError('Veuillez compléter la vérification anti-bot.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await login(email, password, turnstileToken)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
      if (TURNSTILE_SITE_KEY && window.turnstile) {
        window.turnstile.reset()
        setTurnstileToken('')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0c1520] relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[400px] mx-4 relative z-10">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <span className="material-symbols-outlined text-[2.4em] text-blue-400">cloud_circle</span>
          <h1 className="text-white text-[1.6em] font-bold tracking-tight">CloudSpace</h1>
        </div>

        <div className="mb-4 flex items-center">
          <Link
            to="/accounts"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            Choisir un autre compte
          </Link>
        </div>

        <div className="bg-[#141f2e] rounded-2xl border border-[#1e2d3d] p-7 shadow-2xl shadow-black/40">
          <h2 className="text-lg font-semibold text-white mb-1">Bon retour</h2>
          <p className="text-sm text-slate-400 mb-6">Connectez-vous à votre espace</p>

          {error && (
            <div className="mb-4 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <span className="material-symbols-outlined text-sm text-red-400" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <input
              type="email"
              placeholder="Adresse e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full bg-[#0c1520] border border-[#1e2d3d] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
            />

            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              minLength={6}
              autoFocus={!!prefillEmail}
              className="w-full bg-[#0c1520] border border-[#1e2d3d] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
            />

            {TURNSTILE_SITE_KEY && (
              <div ref={turnstileRef} className="flex justify-center" />
            )}

            <button
              type="submit"
              disabled={loading || (TURNSTILE_SITE_KEY && !turnstileToken)}
              className="w-full py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50 shadow-lg shadow-blue-600/20 mt-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connexion...
                </span>
              ) : 'Se connecter'}
            </button>
          </form>

          <p className="mt-3 text-center">
            <Link
              to="/forgot-password"
              className="text-xs text-slate-500 hover:text-blue-400 hover:underline transition-colors"
            >
              Mot de passe oublié ?
            </Link>
          </p>

          <p className="mt-4 text-center text-sm text-slate-400">
            Pas encore de compte ?
            <Link to="/register" className="ml-1.5 text-blue-400 hover:text-blue-300 font-medium transition-colors">
              S'inscrire
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-slate-600">
          Demo: <span className="text-slate-500">alex.davidson@cloudspace.com</span> / <span className="text-slate-500">password123</span>
        </p>
      </div>
    </div>
  )
}
