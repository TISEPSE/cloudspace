import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'

/**
 * Ouvre l'appareil photo et retourne un File JS prêt à uploader.
 * Sur web non-Capacitor, retourne null (le bouton ne devrait pas être affiché).
 */
export async function takePhoto({ source = 'prompt' } = {}) {
  if (!Capacitor.isNativePlatform()) return null

  const sourceMap = {
    camera: CameraSource.Camera,
    photos: CameraSource.Photos,
    prompt: CameraSource.Prompt,
  }

  const photo = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.DataUrl,
    source: sourceMap[source] || CameraSource.Prompt,
    saveToGallery: false,
  })

  if (!photo?.dataUrl) return null

  // Convertit dataUrl (base64) → Blob → File
  const res = await fetch(photo.dataUrl)
  const blob = await res.blob()
  const ext = photo.format || 'jpg'
  const name = `photo_${Date.now()}.${ext}`
  return new File([blob], name, { type: blob.type || `image/${ext}` })
}
