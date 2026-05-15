import { useEffect, useState, useCallback, useRef } from 'react'
import { isNative } from '../lib/backendUrl'
import { isBiometricEnabled, unlockRefreshToken, disableBiometric } from '../lib/biometric'

/**
 * BiometricGate : si l'utilisateur a activé le déverrouillage biométrique
 * dans les paramètres, on l'oblige à valider son empreinte avant d'afficher
 * l'application. Sur web (ou si désactivé), on rend directement les enfants.
 *
 * UX : auto-prompt immédiat à l'ouverture. En cas d'échec/annulation,
 * l'utilisateur peut retaper sur la grande icône fingerprint pour relancer.
 * Issue de secours : « Utiliser un mot de passe à la place ».
 */
export default function BiometricGate({ children }) {
  const [state, setState] = useState(() => {
    if (!isNative() || !isBiometricEnabled()) return 'unlocked'
    return 'locked'
  })
  const [error, setError] = useState(null)
  const inFlight = useRef(false)

  const tryUnlock = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setError(null)
    try {
      await unlockRefreshToken()
      setState('unlocked')
    } catch (e) {
      const msg = (e?.message || '').toLowerCase()
      const cancelled = msg.includes('cancel') || e?.code === 'userCancel'
      setError(cancelled ? null : (e?.message || 'Échec de l\'authentification'))
      setState('locked')
    } finally {
      inFlight.current = false
    }
  }, [])

  // Auto-prompt à l'ouverture, avec un léger delay pour que la WebView soit prête.
  useEffect(() => {
    if (state !== 'locked') return
    const t = setTimeout(() => { tryUnlock() }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (state === 'unlocked') return children

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="flex items-center gap-2 text-primary mb-10">
          <span className="material-symbols-outlined text-[40px]">cloud_circle</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">CloudSpace</span>
        </div>

        {/* Grande icône tappable — relance le prompt biométrique */}
        <button
          onClick={tryUnlock}
          aria-label="Déverrouiller avec votre empreinte"
          className="w-32 h-32 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mb-8 active:bg-primary/20 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-primary text-[80px]" style={{ fontVariationSettings: "'FILL' 1" }}>fingerprint</span>
        </button>

        <h1 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Application verrouillée</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center">
          Touchez l'icône ci-dessus pour vous identifier.
        </p>

        {error && (
          <p className="text-xs text-red-500 mb-4 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">error</span>
            <span>{error}</span>
          </p>
        )}

        <button
          onClick={() => {
            if (!confirm('Désactiver le déverrouillage biométrique ? Vous devrez vous reconnecter avec votre mot de passe.')) return
            disableBiometric()
            setState('unlocked')
          }}
          className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline-offset-2 underline mt-4"
        >
          Utiliser un mot de passe à la place
        </button>
      </div>
    </div>
  )
}
