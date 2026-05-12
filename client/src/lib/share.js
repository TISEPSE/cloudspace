import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'
import { getBackendUrl } from './backendUrl'

/**
 * Ouvre la feuille de partage native Android/iOS pour un item CloudSpace.
 * Partage : nom du fichier + lien vers l'instance CloudSpace.
 * Retourne true si l'OS a affiché la sheet, false sinon.
 */
export async function shareItemNative(item) {
  if (!Capacitor.isNativePlatform()) return false

  const canShare = await Share.canShare().catch(() => ({ value: false }))
  if (!canShare.value) return false

  const base = getBackendUrl() || ''
  const targetPath = item.is_folder
    ? `/drive/folder/${item.id}`
    : `/drive#file=${item.id}`
  const url = base ? `${base}${targetPath}` : targetPath

  try {
    await Share.share({
      title: 'CloudSpace',
      text: item.name,
      url,
      dialogTitle: 'Partager via…',
    })
    return true
  } catch (e) {
    // Annulé par l'utilisateur → pas une vraie erreur
    if ((e?.message || '').toLowerCase().includes('cancel')) return false
    throw e
  }
}
