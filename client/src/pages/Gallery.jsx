import { useState, useEffect, useRef } from 'react'
import { apiFetch, getAccessToken } from '../lib/api'
import { useUpload } from '../contexts/UploadContext'
import { useLocalPref } from '../hooks/useLocalPref'
import { formatDisplayName } from '../utils/filename'
import FilePreviewModal from '../components/FilePreviewModal'

function PhotoCard({ photo, onClick, displayName }) {
  const token = getAccessToken()
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
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-150 flex flex-col justify-end opacity-0 group-hover:opacity-100">
        <div className="px-2 pb-2">
          <p className="text-[11px] font-medium text-white truncate">{displayName}</p>
          <p className="text-[10px] text-white/60">{photo.formatted_size}</p>
        </div>
      </div>
    </div>
  )
}

function MosaicCard({ photo, onClick, displayName }) {
  const token = getAccessToken()
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
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-150 flex flex-col justify-end opacity-0 group-hover:opacity-100">
        <div className="px-2 pb-2">
          <p className="text-[11px] font-medium text-white truncate">{displayName}</p>
          <p className="text-[10px] text-white/60">{photo.formatted_size}</p>
        </div>
      </div>
    </div>
  )
}

const VIEW_MODES = [
  { id: 'small',  icon: 'apps',               label: 'Petites' },
  { id: 'medium', icon: 'grid_view',           label: 'Moyennes' },
  { id: 'large',  icon: 'view_module',         label: 'Grandes' },
  { id: 'mosaic', icon: 'auto_awesome_mosaic', label: 'Mosaïque' },
]

const gridSizes = {
  small:  'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10',
  medium: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8',
  large:  'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
}

export default function Gallery() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useLocalPref('cloudspace_gallery_view', 'medium')
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const fileInputRef = useRef(null)
  const { uploadFiles, queue } = useUpload()
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

  const selectedIndex = selectedPhoto ? photos.findIndex(p => p.id === selectedPhoto.id) : -1

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
    <div className="flex-1 overflow-y-auto p-6 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Galerie</h2>
          {loading
            ? <div className="h-3 w-16 mt-1.5 animate-pulse bg-slate-200 dark:bg-slate-700 rounded" />
            : <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
          }
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-surface-dark rounded-lg p-1">
            {VIEW_MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                title={mode.label}
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                  viewMode === mode.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[18px] leading-none">{mode.icon}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 bg-primary hover:bg-blue-600 text-white text-sm font-semibold px-3.5 py-2 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">add_photo_alternate</span>
            Upload
          </button>
          <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} />
        </div>
      </div>

      {loading ? (
        viewMode === 'mosaic' ? (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-2">
            {[150, 200, 120, 180, 100, 160, 140, 110, 190, 130].map((h, i) => (
              <div key={i} className="break-inside-avoid mb-2 rounded-lg animate-pulse bg-slate-200 dark:bg-slate-700" style={{ height: h }} />
            ))}
          </div>
        ) : (
          <div className={`grid ${gridSizes[viewMode]} gap-2`}>
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
      ) : viewMode === 'mosaic' ? (
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-2">
          {photos.map(photo => (
            <MosaicCard key={photo.id} photo={photo} onClick={setSelectedPhoto} displayName={formatDisplayName(photo.name, showExt)} />
          ))}
        </div>
      ) : (
        <div className={`grid ${gridSizes[viewMode]} gap-2`}>
          {photos.map(photo => (
            <PhotoCard key={photo.id} photo={photo} onClick={setSelectedPhoto} displayName={formatDisplayName(photo.name, showExt)} />
          ))}
        </div>
      )}

      <FilePreviewModal file={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
    </div>
  )
}
