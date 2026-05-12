import { apiFetch } from './api'

function fetchAsPng(fileId) {
  return apiFetch(`/api/files/${fileId}/download?inline=true`)
    .then(r => r.blob())
    .then(blob => new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob)
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.getContext('2d').drawImage(img, 0, 0)
        URL.revokeObjectURL(url)
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
      }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load failed')) }
      img.src = url
    }))
}

// ClipboardItem reçoit la Promise directement → clipboard.write() reste dans le geste utilisateur
export function copyImageToClipboard(fileId) {
  return navigator.clipboard.write([
    new ClipboardItem({ 'image/png': fetchAsPng(fileId) })
  ])
}
