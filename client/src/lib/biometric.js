import { Capacitor } from '@capacitor/core'

const BIOMETRIC_ENABLED_KEY = 'cloudspace_biometric_enabled'
const BIOMETRIC_REFRESH_TOKEN_KEY = 'cloudspace_biometric_refresh_token'

let _pluginPromise = null
async function getPlugin() {
  if (!Capacitor.isNativePlatform()) return null
  if (!_pluginPromise) {
    _pluginPromise = import('@aparajita/capacitor-biometric-auth').then(m => m.BiometricAuth)
  }
  return _pluginPromise
}

/**
 * true si l'appareil supporte la biométrie ET qu'au moins une empreinte/visage
 * est enrôlée dans l'OS.
 */
export async function isBiometricAvailable() {
  try {
    const plugin = await getPlugin()
    if (!plugin) return false
    const info = await plugin.checkBiometry()
    return Boolean(info?.isAvailable)
  } catch {
    return false
  }
}

export function isBiometricEnabled() {
  try { return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === '1' } catch { return false }
}

/**
 * Enrôle le refresh token : stocke en localStorage et active le flag.
 * À chaque déverrouillage, on prompt la biométrie via Capacitor avant
 * de retourner le token.
 *
 * NOTE : le plugin @aparajita/capacitor-biometric-auth ne chiffre pas
 * lui-même le payload, mais il bloque l'accès à l'écran tant que la
 * biométrie n'est pas validée. Pour une sécurité plus stricte, on
 * pourrait passer par le Keystore Android via un module natif dédié.
 */
export function enrollRefreshToken(refreshToken) {
  if (!refreshToken) return false
  localStorage.setItem(BIOMETRIC_REFRESH_TOKEN_KEY, refreshToken)
  localStorage.setItem(BIOMETRIC_ENABLED_KEY, '1')
  return true
}

export function disableBiometric() {
  localStorage.removeItem(BIOMETRIC_REFRESH_TOKEN_KEY)
  localStorage.removeItem(BIOMETRIC_ENABLED_KEY)
}

/**
 * Prompt biométrique. Retourne le refresh token si l'utilisateur valide,
 * lève une exception sinon.
 */
export async function unlockRefreshToken() {
  const plugin = await getPlugin()
  if (!plugin) throw new Error('Biometric uniquement disponible sur mobile')
  if (!isBiometricEnabled()) throw new Error('Biométrie non activée')
  await plugin.authenticate({
    reason: 'Déverrouillez CloudSpace',
    cancelTitle: 'Annuler',
    androidTitle: 'CloudSpace',
    androidSubtitle: 'Confirmez votre identité',
    androidConfirmationRequired: false,
    androidBiometryStrength: 'weak',
  })
  return localStorage.getItem(BIOMETRIC_REFRESH_TOKEN_KEY)
}
