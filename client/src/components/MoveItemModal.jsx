import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'

export default function MoveItemModal({ item, onClose, onMoved }) {
  const [browseId, setBrowseId] = useState(null)
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'My Drive' }])
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)
  const [moving, setMoving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!item) return
    setBrowseId(null)
  }, [item])

  useEffect(() => {
    if (!item) return
    setLoading(true)
    setError(null)
    const url = browseId ? `/api/drive/contents?parent_id=${browseId}` : '/api/drive/contents'
    apiFetch(url)
      .then(r => r.json())
      .then(data => {
        setFolders((data.folders || []).filter(f => f.id !== item.id))
        setBreadcrumbs(data.breadcrumbs || [{ id: null, name: 'My Drive' }])
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
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
      else { const d = await res.json(); setError(d.error || 'Move failed') }
    } catch { setError('An error occurred') }
    setMoving(false)
  }

  if (!item) return null
  const alreadyHere = (item.parent_id ?? null) === (browseId ?? null)

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
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Move</h3>
              <p className="text-xs text-slate-500 truncate max-w-[160px]">{item.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-border-dark transition-colors">
            <span className="material-symbols-outlined text-[20px] text-slate-400 leading-none">close</span>
          </button>
        </div>

        {/* Breadcrumb nav */}
        <div className="px-4 py-2 border-b border-slate-100 dark:border-border-dark bg-slate-50 dark:bg-background-dark flex items-center gap-0.5 flex-wrap min-h-[36px]">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.id ?? 'root'} className="flex items-center">
              {i > 0 && <span className="material-symbols-outlined text-[16px] text-slate-400">chevron_right</span>}
              <button
                onClick={() => setBrowseId(crumb.id)}
                className={`text-xs px-1.5 py-0.5 rounded transition-colors hover:bg-slate-200 dark:hover:bg-border-dark ${i === breadcrumbs.length - 1 ? 'text-slate-800 dark:text-slate-200 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}
              >
                {crumb.id === null
                  ? <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[14px]">cloud</span>My Drive</span>
                  : crumb.name}
              </button>
            </span>
          ))}
        </div>

        {/* Folder list */}
        <div className="h-48 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full gap-2 text-slate-400 text-sm">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>Loading...
            </div>
          ) : folders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
              <span className="material-symbols-outlined text-3xl">folder_open</span>
              <p className="text-sm">No subfolders</p>
            </div>
          ) : (
            <div className="p-2">
              {folders.map(f => (
                <button key={f.id} onClick={() => setBrowseId(f.id)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-border-dark text-left transition-colors group">
                  <span className={`material-symbols-outlined text-xl ${f.icon_color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
                  <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{f.name}</span>
                  {f.is_locked && <span className="material-symbols-outlined text-[14px] text-slate-400">lock</span>}
                  <span className="material-symbols-outlined text-[16px] text-slate-400 opacity-0 group-hover:opacity-100">chevron_right</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-border-dark">
          {error && <p className="text-xs text-red-500 mb-3 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">error</span>{error}</p>}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500 truncate">
              To: <span className="font-medium text-slate-700 dark:text-slate-300">
                {breadcrumbs[breadcrumbs.length - 1]?.id === null ? 'My Drive' : breadcrumbs[breadcrumbs.length - 1]?.name}
              </span>
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={onClose} className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-border-dark rounded-xl transition-colors">Cancel</button>
              <button onClick={handleMove} disabled={alreadyHere || moving} className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {moving ? 'Moving…' : 'Move here'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
