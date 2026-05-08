import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'

export default function MoveItemModal({ item, initialFolderId, onClose, onMoved }) {
  const [browseId, setBrowseId] = useState(initialFolderId ?? null)
  const [currentName, setCurrentName] = useState(null)
  const [folders, setFolders] = useState([])
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [moving, setMoving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!item) return
    setBrowseId(initialFolderId ?? null)
    setCurrentName(null)
  }, [item, initialFolderId])

  useEffect(() => {
    if (!item) return
    setLoading(true)
    setShowSkeleton(false)
    setError(null)
    const skeletonTimer = setTimeout(() => setShowSkeleton(true), 150)
    const url = browseId ? `/api/drive/contents?parent_id=${browseId}` : '/api/drive/contents'
    apiFetch(url)
      .then(r => r.json())
      .then(data => {
        setFolders((data.folders || []).filter(f => f.id !== item.id))
        setFiles(data.files || [])
        const crumbs = data.breadcrumbs || []
        const cur = crumbs[crumbs.length - 1]
        setCurrentName(cur?.id === null ? null : (cur?.name ?? null))
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => { clearTimeout(skeletonTimer); setLoading(false); setShowSkeleton(false) })
  }, [browseId, item])

  const handleMove = async () => {
    setMoving(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/files/${item.id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination_id: browseId }),
      })
      if (res.ok) { onMoved() }
      else { const d = await res.json(); setError(d.error || 'Déplacement échoué') }
    } catch { setError('Une erreur est survenue') }
    setMoving(false)
  }

  if (!item) return null
  const alreadyHere = (item.parent_id ?? null) === (browseId ?? null)
  const isEmpty = !loading && folders.length === 0 && files.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-border-dark shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-border-dark">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg text-primary">drive_file_move</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Déplacer vers</h3>
              <p className="text-xs text-slate-500 truncate max-w-[160px]">{item.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-border-dark transition-colors">
            <span className="material-symbols-outlined text-[20px] text-slate-400 leading-none">close</span>
          </button>
        </div>

        {/* Liste */}
        <div className="h-56 overflow-y-auto">
          <div className="p-2 flex flex-col gap-0.5">

            {/* "/" — retour à la racine, visible seulement dans un sous-dossier */}
            {browseId !== null && (
              <button
                onClick={() => setBrowseId(null)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-border-dark text-left transition-colors"
              >
                <span className="text-sm font-mono font-semibold text-slate-400 dark:text-slate-500">/</span>
              </button>
            )}

            {loading ? (showSkeleton ? (
              [1,2,3].map(i => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2.5">
                  <div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 animate-pulse flex-shrink-0" />
                  <div className="h-3 rounded bg-slate-200 dark:bg-slate-700 animate-pulse flex-1" style={{ width: `${50 + i * 15}%` }} />
                </div>
              ))
            ) : null) : isEmpty ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-1.5">
                <span className="material-symbols-outlined text-2xl">folder_open</span>
                <p className="text-xs">Dossier vide</p>
              </div>
            ) : (
              <>
                {folders.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setBrowseId(f.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-border-dark text-left transition-colors group"
                  >
                    <span className={`material-symbols-outlined text-xl ${f.icon_color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
                    <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{f.name}</span>
                    {f.is_locked && <span className="material-symbols-outlined text-[14px] text-slate-400">lock</span>}
                    <span className="material-symbols-outlined text-[16px] text-slate-400 opacity-0 group-hover:opacity-100">chevron_right</span>
                  </button>
                ))}
                {files.map(f => (
                  <div
                    key={f.id}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg opacity-50 cursor-default"
                  >
                    <span className={`material-symbols-outlined text-xl ${f.icon_color}`}>{f.icon}</span>
                    <span className="flex-1 text-sm text-slate-500 dark:text-slate-400 truncate">{f.name}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-border-dark">
          {error && <p className="text-xs text-red-500 mb-3 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">error</span>{error}</p>}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500 truncate">
              Vers : <span className="font-medium text-slate-700 dark:text-slate-300">
                {browseId === null ? 'racine' : currentName ?? '…'}
              </span>
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={onClose} className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-border-dark rounded-xl transition-colors">Annuler</button>
              <button onClick={handleMove} disabled={alreadyHere || moving} className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {moving ? 'Déplacement…' : 'Déplacer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
