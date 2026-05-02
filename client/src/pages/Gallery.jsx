import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../lib/api'

function PhotoCard({ photo, gridSize, onClick }) {
  const imgUrl = `/api/files/${photo.id}/download?inline=true`

  return (
    <div
      onClick={() => onClick(photo)}
      className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer border border-slate-200/50 dark:border-border-dark/50 hover:border-primary/40 transition-all"
    >
      <img
        src={imgUrl}
        alt={photo.name}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
        onError={e => { e.target.style.display = 'none' }}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-150 flex flex-col justify-between opacity-0 group-hover:opacity-100">
        <div className="flex justify-end p-1.5">
          <button
            onClick={e => e.stopPropagation()}
            className="w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors"
          >
            <span className="material-symbols-outlined text-white text-[16px]">download</span>
          </button>
        </div>
        <div className="px-2 pb-2">
          <p className="text-[11px] font-medium text-white truncate">{photo.name}</p>
          <p className="text-[10px] text-white/60">{photo.formatted_size}</p>
        </div>
      </div>
    </div>
  )
}

function Lightbox({ photo, onClose, onPrev, onNext }) {
  if (!photo) return null
  const imgUrl = `/api/files/${photo.id}/download?inline=true`

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
      <button
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        onClick={onClose}
      >
        <span className="material-symbols-outlined text-white">close</span>
      </button>

      <button
        className="absolute left-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        onClick={e => { e.stopPropagation(); onPrev() }}
      >
        <span className="material-symbols-outlined text-white text-xl">chevron_left</span>
      </button>

      <div
        className="w-[70vw] max-w-[700px] aspect-square rounded-2xl overflow-hidden bg-black/40 flex items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        <img src={imgUrl} alt={photo.name} className="max-w-full max-h-full object-contain" />
      </div>

      <button
        className="absolute right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        onClick={e => { e.stopPropagation(); onNext() }}
      >
        <span className="material-symbols-outlined text-white text-xl">chevron_right</span>
      </button>

      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md rounded-xl px-5 py-2.5 flex items-center gap-5"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-sm font-medium text-white">{photo.name}</p>
        <p className="text-xs text-white/60">{photo.formatted_size}</p>
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

function MosaicCard({ photo, onClick }) {
  const imgUrl = `/api/files/${photo.id}/download?inline=true`
  return (
    <div
      onClick={() => onClick(photo)}
      className="group relative break-inside-avoid mb-2 rounded-lg overflow-hidden cursor-pointer border border-slate-200/50 dark:border-border-dark/50 hover:border-primary/40 transition-all"
    >
      <img
        src={imgUrl}
        alt={photo.name}
        className="w-full h-auto block"
        loading="lazy"
        onError={e => { e.target.style.display = 'none' }}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-150 flex flex-col justify-between opacity-0 group-hover:opacity-100">
        <div className="flex justify-end p-1.5">
          <button
            onClick={e => e.stopPropagation()}
            className="w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors"
          >
            <span className="material-symbols-outlined text-white text-[16px]">download</span>
          </button>
        </div>
        <div className="px-2 pb-2">
          <p className="text-[11px] font-medium text-white truncate">{photo.name}</p>
          <p className="text-[10px] text-white/60">{photo.formatted_size}</p>
        </div>
      </div>
    </div>
  )
}

export default function Gallery() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('medium')
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    apiFetch('/api/files/gallery')
      .then(r => r.json())
      .then(data => setPhotos(data.images || []))
      .finally(() => setLoading(false))
  }, [])

  const selectedIndex = selectedPhoto ? photos.findIndex(p => p.id === selectedPhoto.id) : -1
  const handlePrev = () => { if (selectedIndex > 0) setSelectedPhoto(photos[selectedIndex - 1]) }
  const handleNext = () => { if (selectedIndex < photos.length - 1) setSelectedPhoto(photos[selectedIndex + 1]) }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Galerie</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {photos.length} photo{photos.length !== 1 ? 's' : ''}
          </p>
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
          <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" />
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500">
          <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
          Chargement...
        </div>
      )}

      {!loading && photos.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">photo_library</span>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Aucune image</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            Uploadez des images depuis Mon Drive pour les voir ici.
          </p>
        </div>
      )}

      {!loading && photos.length > 0 && (
        viewMode === 'mosaic' ? (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-2">
            {photos.map(photo => (
              <MosaicCard key={photo.id} photo={photo} onClick={setSelectedPhoto} />
            ))}
          </div>
        ) : (
          <div className={`grid ${gridSizes[viewMode]} gap-2`}>
            {photos.map(photo => (
              <PhotoCard key={photo.id} photo={photo} onClick={setSelectedPhoto} />
            ))}
          </div>
        )
      )}

      <Lightbox
        photo={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    </div>
  )
}
