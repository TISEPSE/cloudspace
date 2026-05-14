import { useEffect, useState, useCallback } from 'react'
import { isNative, getBackendUrl, setBackendUrl, clearBackendUrl, pingBackend } from '../lib/backendUrl'
import { setTokens, setSessionUser } from '../lib/api'

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
  const [scanning, setScanning] = useState(false)

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

  const handleScan = async () => {
    setErr(null)
    setScanning(true)
    try {
      const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning')
      // Vérifier la permission caméra
      const { camera } = await BarcodeScanner.checkPermissions()
      if (camera !== 'granted') {
        const req = await BarcodeScanner.requestPermissions()
        if (req.camera !== 'granted') {
          setErr("Permission caméra refusée.")
          setScanning(false)
          return
        }
      }
      const result = await BarcodeScanner.scan()
      const raw = result.barcodes?.[0]?.rawValue
      if (!raw) {
        setErr('Aucun code détecté.')
        setScanning(false)
        return
      }
      let parsed
      try { parsed = JSON.parse(raw) } catch {
        setErr('QR code invalide.')
        setScanning(false)
        return
      }
      if (parsed.v !== 1 || !parsed.url || !parsed.token) {
        setErr('QR code non reconnu.')
        setScanning(false)
        return
      }
      if (!/^https?:\/\/.+/i.test(parsed.url)) {
        setErr("L'URL du QR est invalide.")
        setScanning(false)
        return
      }
      const cleanedUrl = parsed.url.replace(/\/+$/, '')
      // Ping serveur
      const ping = await pingBackend(cleanedUrl)
      if (!ping.ok) {
        setErr(`Impossible de joindre ${cleanedUrl}`)
        setScanning(false)
        return
      }
      // Consommer le token
      const deviceId = localStorage.getItem('cloudspace_device_id') || (() => {
        const id = crypto.randomUUID()
        localStorage.setItem('cloudspace_device_id', id)
        return id
      })()
      const res = await fetch(cleanedUrl + '/api/auth/device-pair/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: parsed.token,
          device_id: deviceId,
          device_label: 'Mobile CloudSpace',
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErr(data.error || `Pairing échoué (${res.status})`)
        setScanning(false)
        return
      }
      const data = await res.json()
      setBackendUrl(cleanedUrl)
      setTokens(data.access_token, data.refresh_token)
      if (data.user) setSessionUser(data.user)
      localStorage.setItem('cloudspace_session_started', Date.now().toString())
      onSaved()
    } catch (e) {
      setErr(e.message || 'Erreur durant le scan')
      setScanning(false)
    }
  }

  return (
    <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-border-dark shadow-lg p-6">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Connecter votre CloudSpace</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        Scannez un QR code depuis Paramètres → Appareils, ou saisissez l'adresse du serveur manuellement.
      </p>

      <button
        onClick={handleScan}
        disabled={scanning}
        className="w-full mb-5 px-4 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-blue-600 active:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
        {scanning ? 'Scan en cours…' : 'Scanner un QR code'}
      </button>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-slate-200 dark:bg-border-dark" />
        <span className="text-[11px] uppercase tracking-wider text-slate-400">ou</span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-border-dark" />
      </div>

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
          className="w-full mt-5 px-4 py-3 bg-slate-100 dark:bg-border-dark text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-border-dark/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {testing ? (
            <>
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-slate-400 border-t-transparent" />
              Connexion…
            </>
          ) : 'Se connecter manuellement'}
        </button>
      </form>

      <p className="mt-4 text-[11px] text-slate-400 text-center leading-relaxed">
        Vous pourrez changer cette adresse à tout moment dans les paramètres.
      </p>
    </div>
  )
}
