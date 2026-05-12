import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'

/**
 * Capture le bouton retour Android et le branche sur react-router.
 * - Sur les routes "racine" (drive, dashboard, gallery…), demande à minimiser l'app.
 * - Sinon, fait un history.back().
 */
const ROOT_PATHS = ['/drive', '/dashboard', '/gallery', '/starred', '/shared', '/settings', '/history', '/trash']

export function useAndroidBackButton() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let listener
    App.addListener('backButton', ({ canGoBack }) => {
      const isRoot = ROOT_PATHS.includes(location.pathname)
      if (isRoot || !canGoBack) {
        App.exitApp()
      } else {
        navigate(-1)
      }
    }).then(l => { listener = l })

    return () => { listener?.remove?.() }
  }, [navigate, location.pathname])
}
