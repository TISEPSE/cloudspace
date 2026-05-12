import { useEffect, useState, useCallback } from 'react'
import { isNative, getBackendUrl, setBackendUrl, clearBackendUrl, pingBackend } from '../lib/backendUrl'

// État : 'checking' | 'setup' | 'down' | 'ok'
export default function BackendGate({ children }) {
  const [state, setState] = useState(isNative() ? 'checking' : 'ok')
  const [error, setError] = useState(null)

  const check = useCallback(async () => {
    if (!isNative()) { setState('ok'); return }
    const url = getBackendUrl()
    if (!url) { setState('setup'); return }
    setState('checking')
    const res = await pingBackend(url)
    if (res.ok) setState('ok')
    else { setError(res.error); setState('down') }
  }, [])

  useEffect(() => { check() }, [check])

  if (state === 'ok') return children

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 text-primary mb-8">
          <span className="material-symbols-outlined text-[40px]">cloud_circle</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">CloudSpace</span>
        </div>

        {state === 'checking' && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mb-4" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Connexion au serveur…</p>
          </div>
        )}

        {state === 'setup' && (
          <SetupForm onSaved={check} />
        )}

        {state === 'down' && (
          <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-border-dark shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-red-500">cloud_off</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Serveur indisponible</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{getBackendUrl()}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              CloudSpace n'arrive pas à joindre votre serveur. Vérifiez votre connexion ou réessayez plus tard.
            </p>
            {error && <p className="text-xs font-mono text-slate-400 mb-4 break-all">{error}</p>}
            <div className="flex flex-col gap-2">
              <button
                onClick={check}
                className="w-full px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors"
              >
                Réessayer
              </button>
              <button
                onClick={() => { clearBackendUrl(); setState('setup') }}
                className="w-full px-4 py-2.5 bg-slate-100 dark:bg-border-dark text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-border-dark/70 transition-colors"
              >
                Changer l'adresse du serveur
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SetupForm({ onSaved }) {
  const [url, setUrl] = useState('https://')
  const [testing, setTesting] = useState(false)
  const [err, setErr] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErr(null)
    const cleaned = url.trim().replace(/\/+$/, '')
    if (!/^https?:\/\/.+/i.test(cleaned)) {
      setErr("L'URL doit commencer par http:// ou https://")
      return
    }
    setTesting(true)
    const res = await pingBackend(cleaned)
    setTesting(false)
    if (!res.ok) {
      setErr(`Impossible de joindre ${cleaned} (${res.error})`)
      return
    }
    setBackendUrl(cleaned)
    onSaved()
  }

  return (
    <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-border-dark shadow-lg p-6">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Connecter votre CloudSpace</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        Entrez l'adresse du serveur CloudSpace sur lequel vous êtes hébergé.
      </p>

      <form onSubmit={handleSubmit}>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">
          Adresse du serveur
        </label>
        <input
          type="url"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://cloudspace.exemple.com"
          className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
        />
        {err && <p className="mt-2 text-xs text-red-500 flex items-start gap-1.5"><span className="material-symbols-outlined text-[14px] flex-shrink-0 mt-px">error</span><span>{err}</span></p>}

        <button
          type="submit"
          disabled={testing}
          className="w-full mt-5 px-4 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-blue-600 active:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {testing ? (
            <>
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Connexion…
            </>
          ) : 'Se connecter'}
        </button>
      </form>

      <p className="mt-4 text-[11px] text-slate-400 text-center leading-relaxed">
        Vous pourrez changer cette adresse à tout moment dans les paramètres.
      </p>
    </div>
  )
}
