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
  const [scanning, setScanning] = useState(false)
  const [err, setErr] = useState(null)
  const [showHelp, setShowHelp] = useState(false)

  const handleScan = async () => {
    setErr(null)
    setScanning(true)
    try {
      const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning')
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
      if (parsed.v !== 1 || !parsed.url) {
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
      const ping = await pingBackend(cleanedUrl)
      if (!ping.ok) {
        setErr(`Impossible de joindre ${cleanedUrl}`)
        setScanning(false)
        return
      }
      // On sauve juste l'URL serveur. Le login email/mot de passe se fait
      // ensuite via le flow normal de l'app (AuthProvider redirige sur /accounts).
      setBackendUrl(cleanedUrl)
      onSaved()
    } catch (e) {
      setErr(e.message || 'Erreur durant le scan')
      setScanning(false)
    }
  }

  return (
    <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-border-dark shadow-lg p-6">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Connecter votre CloudSpace</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Scannez le QR code depuis votre Drive (Paramètres → Appareils) pour connecter cette application au serveur.
      </p>

      <button
        onClick={handleScan}
        disabled={scanning}
        className="w-full px-4 py-4 bg-primary text-white text-base font-semibold rounded-xl hover:bg-blue-600 active:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-[22px]">qr_code_scanner</span>
        {scanning ? 'Scan en cours…' : 'Scanner un QR code'}
      </button>

      {err && (
        <p className="mt-3 text-xs text-red-500 flex items-start gap-1.5">
          <span className="material-symbols-outlined text-[14px] flex-shrink-0 mt-px">error</span>
          <span>{err}</span>
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowHelp(v => !v)}
        className="mt-5 w-full flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-primary transition-colors"
      >
        <span className="material-symbols-outlined text-[14px]">help</span>
        {showHelp ? 'Masquer l\'aide' : 'Comment trouver mon QR code ?'}
      </button>

      {showHelp && (
        <div className="mt-3 rounded-xl bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark p-4 space-y-3">
          <Step n={1}>
            Sur votre <strong>ordinateur</strong>, ouvrez CloudSpace et connectez-vous.
          </Step>
          <Step n={2}>
            Cliquez sur <strong>Paramètres</strong> dans le menu latéral.
          </Step>
          <Step n={3}>
            Choisissez l'onglet <strong>« Appareils »</strong>. Un QR code s'affiche.
          </Step>
          <Step n={4}>
            Revenez ici, appuyez sur <strong>« Scanner un QR code »</strong> et pointez la caméra vers l'écran.
          </Step>
        </div>
      )}

      <p className="mt-5 text-[11px] text-slate-400 text-center leading-relaxed">
        Après la connexion au serveur, vous pourrez vous identifier avec votre email et mot de passe.
      </p>
    </div>
  )
}

function Step({ n, children }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-primary">
        {n}
      </div>
      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{children}</p>
    </div>
  )
}
