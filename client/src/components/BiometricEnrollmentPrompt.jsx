import { useEffect, useState } from 'react'
import { isNative } from '../lib/backendUrl'
import { isBiometricAvailable, isBiometricEnabled, enrollRefreshToken } from '../lib/biometric'
import { getRefreshToken } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

const DISMISSED_KEY = 'cloudspace_biometric_prompt_dismissed'

/**
 * Affiche une modale après login pour proposer d'activer l'auth biométrique.
 * Conditions : appli native, biométrie dispo OS, pas encore activée, pas encore
 * dismiss par l'utilisateur (mémorisé en localStorage pour ne pas spammer).
 */
export default function BiometricEnrollmentPrompt() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [shouldShow, setShouldShow] = useState(false)
  const [diag, setDiag] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isNative()) return
    if (!user?.id) return
    if (isBiometricEnabled()) return
    if (localStorage.getItem(DISMISSED_KEY) === '1') return

    let cancelled = false
    ;(async () => {
      try {
        const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
        const info = await BiometricAuth.checkBiometry()
        if (cancelled) return
        setDiag(info)
        if (info?.isAvailable) {
          setShouldShow(true)
        }
      } catch (e) {
        if (!cancelled) setDiag({ error: e?.message || 'plugin indisponible' })
      }
    })()

    return () => { cancelled = true }
  }, [user?.id])

  const handleEnable = async () => {
    setBusy(true)
    try {
      const refresh = getRefreshToken()
      if (!refresh) {
        showToast('Reconnectez-vous pour activer la biométrie', 'error')
        return
      }
      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
      await BiometricAuth.authenticate({
        reason: 'Activer le verrouillage biométrique',
        cancelTitle: 'Annuler',
        androidTitle: 'CloudSpace',
        androidSubtitle: 'Confirmez votre identité',
      })
      enrollRefreshToken(refresh)
      showToast('Empreinte activée ✓', 'success')
      setShouldShow(false)
    } catch (e) {
      showToast(e?.message || 'Activation annulée', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setShouldShow(false)
  }

  if (!shouldShow) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-surface-dark rounded-2xl shadow-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-primary text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>fingerprint</span>
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Activer la connexion par empreinte ?</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            CloudSpace demandera votre empreinte digitale (ou Face ID) au démarrage pour protéger l'accès à vos fichiers.
          </p>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleEnable}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-blue-600 active:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">fingerprint</span>
            {busy ? 'Activation…' : 'Activer'}
          </button>
          <button
            onClick={handleDismiss}
            className="w-full px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  )
}
