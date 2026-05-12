import { useState, useEffect, useRef, useCallback } from 'react'
import { apiFetch, downloadFile } from '../lib/api'
import { useToast } from '../contexts/ToastContext'
import { copyImageToClipboard } from '../lib/copyImage'
import { getMediaToken } from '../lib/mediaToken'
import { useUpload } from '../contexts/UploadContext'
import { useLocalPref } from '../hooks/useLocalPref'
import { formatDisplayName } from '../utils/filename'
import { isNative } from '../lib/backendUrl'
import { takePhoto } from '../lib/camera'
import { shareItemNative } from '../lib/share'
import FilePreviewModal from '../components/FilePreviewModal'
import FileContextMenu from '../components/FileContextMenu'


function PhotoCard({ photo, onClick, onAction, displayName }) {
  const token = getMediaToken()
  const imgUrl = `/api/files/${photo.id}/download?inline=true&token=${token}`
  const [loaded, setLoaded] = useState(false)

  return (
    <div
      onClick={() => onClick(photo)}
      className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer border border-slate-200/50 dark:border-border-dark/50 hover:border-primary/40 transition-all"
    >
      {!loaded && <div className="absolute inset-0 animate-pulse bg-slate-200 dark:bg-slate-700" />}
      <img
        src={imgUrl}
        alt={photo.name}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={e => { e.target.style.display = 'none' }}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-150 flex flex-col justify-between opacity-0 group-hover:opacity-100">
        <div className="flex justify-end p-1" onClick={e => e.stopPropagation()}>
          <FileContextMenu
            isImage
            isStarred={photo.is_starred}
            onAction={onAction}
            className="w-7 h-7 flex items-center justify-center rounded-md text-white hover:bg-white/20 transition-colors"
            hideUntilHover={false}
          />
        </div>
        <div className="px-2 pb-2">
          <p className="text-[11px] font-medium text-white truncate">{displayName}</p>
          <p className="text-[10px] text-white/60">{photo.formatted_size}</p>
        </div>
      </div>
    </div>
  )
}

function MosaicCard({ photo, onClick, onAction, displayName }) {
  const token = getMediaToken()
  const imgUrl = `/api/files/${photo.id}/download?inline=true&token=${token}`
  const [loaded, setLoaded] = useState(false)
  return (
    <div
      onClick={() => onClick(photo)}
      className={`group relative break-inside-avoid mb-2 rounded-lg overflow-hidden cursor-pointer border border-slate-200/50 dark:border-border-dark/50 hover:border-primary/40 transition-all${!loaded ? ' min-h-[120px]' : ''}`}
    >
      {!loaded && <div className="absolute inset-0 animate-pulse bg-slate-200 dark:bg-slate-700" />}
      <img
        src={imgUrl}
        alt={photo.name}
        className={`w-full h-auto block transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={e => { e.target.style.display = 'none' }}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-150 flex flex-col justify-between opacity-0 group-hover:opacity-100">
        <div className="flex justify-end p-1" onClick={e => e.stopPropagation()}>
          <FileContextMenu
            isImage
            isStarred={photo.is_starred}
            onAction={onAction}
            className="w-7 h-7 flex items-center justify-center rounded-md text-white hover:bg-white/20 transition-colors"
            hideUntilHover={false}
          />
        </div>
        <div className="px-2 pb-2">
          <p className="text-[11px] font-medium text-white truncate">{displayName}</p>
          <p className="text-[10px] text-white/60">{photo.formatted_size}</p>
        </div>
      </div>
    </div>
  )
}

const gridSteps = [
  'grid-cols-4 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9',
  'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7',
  'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
  'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3',
]
// index = 4 - sizeStep → slider gauche (0) = gridSteps[4] = grandes tuiles

export default function Gallery() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [sizeStep, setSizeStep] = useLocalPref('cloudspace_gallery_size', 2)
  const [mosaic, setMosaic] = useLocalPref('cloudspace_gallery_mosaic', false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const fileInputRef = useRef(null)
  const { uploadFiles, queue } = useUpload()
  const { showToast } = useToast()
  const [showExt] = useLocalPref('cloudspace_show_extensions', true)
  const activeUploadCount = queue.filter(u => u.status === 'uploading' || u.status === 'pending').length

  const fetchPhotos = () => {
    apiFetch('/api/files/gallery')
      .then(r => r.json())
      .then(data => setPhotos(data.images || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchPhotos() }, [])

  // Refresh la galerie quand tous les uploads sont terminés
  useEffect(() => {
    if (activeUploadCount === 0 && queue.some(u => u.status === 'done')) {
      fetchPhotos()
    }
  }, [activeUploadCount, queue])

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) uploadFiles(files)
    e.target.value = ''
  }

  const handleTakePhoto = async () => {
    try {
      const file = await takePhoto({ source: 'camera' })
      if (file) uploadFiles([file])
    } catch (err) {
      if (err?.message?.toLowerCase?.().includes('cancel')) return
      showToast("Impossible d'accéder à l'appareil photo", 'error')
    }
  }

  const closePhoto = useCallback(() => setSelectedPhoto(null), [])
  const selectedIndex = selectedPhoto ? photos.findIndex(p => p.id === selectedPhoto.id) : -1

  const makeAction = (photo) => (actionId) => {
    switch (actionId) {
      case 'preview': setSelectedPhoto(photo); break
      case 'download': downloadFile(photo.id, photo.name).catch(() => {}); break
      case 'copy_image':
        copyImageToClipboard(photo.id)
          .then(() => showToast('Image copiée dans le presse-papiers', 'success'))
          .catch(() => showToast('Impossible de copier l\'image', 'error'))
        break
      case 'trash':
        apiFetch(`/api/files/${photo.id}/trash`, { method: 'POST' })
          .then(() => fetchPhotos())
          .catch(() => {})
        break
      case 'share_native':
        shareItemNative({ ...photo, is_folder: false })
          .catch(() => showToast('Partage indisponible', 'error'))
        break
      default: break
    }
  }

  // Navigation prev/next dans le viewer (flèches clavier)
  useEffect(() => {
    if (!selectedPhoto) return
    const handler = (e) => {
      if (e.key === 'ArrowLeft' && selectedIndex > 0) setSelectedPhoto(photos[selectedIndex - 1])
      else if (e.key === 'ArrowRight' && selectedIndex < photos.length - 1) setSelectedPhoto(photos[selectedIndex + 1])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedPhoto, selectedIndex, photos])

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        {loading
          ? <div className="h-3 w-16 animate-pulse bg-slate-200 dark:bg-slate-700 rounded" />
          : <p className="text-sm text-slate-500 dark:text-slate-400">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
        }
        <div className="flex items-center gap-2 flex-wrap">
          {/* Slider de taille (masqué sur très petit écran) */}
          <div className={`hidden sm:flex items-center gap-1.5 transition-opacity ${mosaic ? 'opacity-30 pointer-events-none' : ''}`}>
            <span className="material-symbols-outlined text-[15px] text-slate-400 leading-none select-none">apps</span>
            <input
              type="range"
              min={0}
              max={4}
              step={1}
              value={sizeStep}
              onChange={e => setSizeStep(Number(e.target.value))}
              className="w-28 accent-primary cursor-pointer"
              title="Taille des tuiles"
            />
            <span className="material-symbols-outlined text-[20px] text-slate-400 leading-none select-none">view_module</span>
          </div>
          {/* Bouton mosaïque */}
          <button
            onClick={() => setMosaic(!mosaic)}
            title="Mosaïque"
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
              mosaic
                ? 'bg-primary text-white'
                : 'bg-slate-100 dark:bg-surface-dark text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-[18px] leading-none">auto_awesome_mosaic</span>
          </button>
          {isNative() && (
            <button
              onClick={handleTakePhoto}
              title="Prendre une photo"
              className="flex items-center gap-1.5 bg-slate-100 dark:bg-surface-dark border border-slate-200 dark:border-border-dark text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-border-dark text-sm font-semibold px-3.5 py-2 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">photo_camera</span>
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 bg-primary hover:bg-blue-600 text-white text-sm font-semibold px-3.5 py-2 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">add_photo_alternate</span>
            <span className="hidden sm:inline">Upload</span>
          </button>
          <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} />
        </div>
      </div>

      {loading ? (
        mosaic ? (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-2">
            {[150, 200, 120, 180, 100, 160, 140, 110, 190, 130].map((h, i) => (
              <div key={i} className="break-inside-avoid mb-2 rounded-lg animate-pulse bg-slate-200 dark:bg-slate-700" style={{ height: h }} />
            ))}
          </div>
        ) : (
          <div className={`grid ${gridSteps[sizeStep]} gap-2`}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg animate-pulse bg-slate-200 dark:bg-slate-700" />
            ))}
          </div>
        )
      ) : photos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">photo_library</span>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Aucune image</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            Uploadez des images depuis Mon Drive pour les voir ici.
          </p>
        </div>
      ) : mosaic ? (
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-2">
          {photos.map(photo => (
            <MosaicCard key={photo.id} photo={photo} onClick={setSelectedPhoto} onAction={makeAction(photo)} displayName={formatDisplayName(photo.name, showExt)} />
          ))}
        </div>
      ) : (
        <div className={`grid ${gridSteps[sizeStep]} gap-2`}>
          {photos.map(photo => (
            <PhotoCard key={photo.id} photo={photo} onClick={setSelectedPhoto} onAction={makeAction(photo)} displayName={formatDisplayName(photo.name, showExt)} />
          ))}
        </div>
      )}

      <FilePreviewModal file={selectedPhoto} onClose={closePhoto} />
    </div>
  )
}
