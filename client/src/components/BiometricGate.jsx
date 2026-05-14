import { useEffect, useState, useCallback } from 'react'
import { isNative } from '../lib/backendUrl'
import { isBiometricEnabled, unlockRefreshToken, disableBiometric } from '../lib/biometric'

/**
 * BiometricGate : si l'utilisateur a activé le déverrouillage biométrique
 * dans les paramètres, on l'oblige à valider son empreinte avant d'afficher
 * l'application. Sur web (ou si désactivé), on rend directement les enfants.
 */
export default function BiometricGate({ children }) {
  const [state, setState] = useState(() => {
    if (!isNative() || !isBiometricEnabled()) return 'unlocked'
    return 'locked'
  })
  const [error, setError] = useState(null)

  const tryUnlock = useCallback(async () => {
    setError(null)
    try {
      await unlockRefreshToken()
      setState('unlocked')
    } catch (e) {
      setError(e?.message || 'Échec de l\'authentification')
      setState('locked')
    }
  }, [])

  // Auto-prompt à l'ouverture.
  useEffect(() => {
    if (state === 'locked') tryUnlock()
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

        <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-primary text-[56px]" style={{ fontVariationSettings: "'FILL' 1" }}>fingerprint</span>
        </div>

        <h1 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Application verrouillée</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center">
          Confirmez votre identité pour ouvrir CloudSpace.
        </p>

        {error && (
          <p className="text-xs text-red-500 mb-4 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">error</span>
            <span>{error}</span>
          </p>
        )}

        <button
          onClick={tryUnlock}
          className="w-full max-w-xs px-4 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-blue-600 active:bg-blue-700 transition-colors flex items-center justify-center gap-2 mb-2"
        >
          <span className="material-symbols-outlined text-[18px]">lock_open</span>
          Déverrouiller
        </button>

        <button
          onClick={() => { disableBiometric(); setState('unlocked') }}
          className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline-offset-2 hover:underline mt-2"
        >
          Utiliser un mot de passe à la place
        </button>
      </div>
    </div>
  )
}
