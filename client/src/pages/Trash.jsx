import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../lib/api'
import { useLocalPref } from '../hooks/useLocalPref'
import { formatDisplayName } from '../utils/filename'

function TrashItemIcon({ icon, icon_color, icon_bg, is_folder }) {
  return (
    <div className={`w-8 h-8 rounded-lg ${icon_bg} flex items-center justify-center flex-shrink-0`}>
      <span
        className={`material-symbols-outlined text-[16px] ${icon_color}`}
        style={is_folder ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        {icon}
      </span>
    </div>
  )
}

export default function Trash() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [emptyingAll, setEmptyingAll] = useState(false)
  const [showExt] = useLocalPref('cloudspace_show_extensions', true)

  const fetchTrash = useCallback(() => {
    setLoading(true)
    apiFetch('/api/trash')
      .then(r => r.json())
      .then(data => setItems(data.items))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchTrash() }, [fetchTrash])

  const handleRestore = (id) => {
    apiFetch(`/api/trash/${id}/restore`, { method: 'POST' })
      .then(r => {
        if (r.ok) setItems(prev => prev.filter(i => i.id !== id))
      })
      .catch(() => {})
  }

  const handleDeletePermanently = (id) => {
    apiFetch(`/api/trash/${id}`, { method: 'DELETE' })
      .then(r => {
        if (r.ok) setItems(prev => prev.filter(i => i.id !== id))
      })
      .catch(() => {})
  }

  const handleEmptyTrash = () => {
    if (items.length === 0) return
    setEmptyingAll(true)
    apiFetch('/api/trash', { method: 'DELETE' })
      .then(r => {
        if (r.ok) setItems([])
      })
      .catch(() => {})
      .finally(() => setEmptyingAll(false))
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <button
          onClick={handleEmptyTrash}
          disabled={items.length === 0 || emptyingAll}
          className="self-start flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">delete_forever</span>
          {emptyingAll ? 'Vidage...' : 'Vider la corbeille'}
        </button>
        <p className="text-sm text-slate-500 dark:text-slate-400">Les éléments sont supprimés définitivement après 30 jours.</p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500">
          <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
          Chargement...
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">delete_sweep</span>
          <p className="text-slate-500 dark:text-slate-400 font-medium">La corbeille est vide</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            Les éléments supprimés apparaissent ici pendant 30 jours.
          </p>
        </div>
      )}

      {/* Table card */}
      {items.length > 0 && (
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#151e26] border-b border-slate-200 dark:border-border-dark">
                <th className="w-[40%] text-left px-5 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Nom
                </th>
                <th className="hidden sm:table-cell w-[25%] text-left px-5 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Emplacement d'origine
                </th>
                <th className="hidden md:table-cell w-[15%] text-left px-5 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Date de suppression
                </th>
                <th className="hidden lg:table-cell w-[10%] text-left px-5 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Size
                </th>
                <th className="w-[10%] text-right px-5 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-border-dark">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="group hover:bg-slate-50 dark:hover:bg-[#1f2d3d] transition-colors"
                >
                  {/* Name */}
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-3">
                      <TrashItemIcon icon={item.icon} icon_color={item.icon_color} icon_bg={item.icon_bg} is_folder={item.is_folder} />
                      <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {formatDisplayName(item.name, showExt)}
                      </span>
                    </div>
                  </td>

                  {/* Original Location */}
                  <td className="hidden sm:table-cell px-5 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-slate-400 dark:text-slate-500">
                        folder
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400 truncate">
                        {item.original_location}
                      </span>
                    </div>
                  </td>

                  {/* Date Deleted */}
                  <td className="hidden md:table-cell px-5 py-2.5">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {item.trashed_relative}
                    </span>
                  </td>

                  {/* Size */}
                  <td className="hidden lg:table-cell px-5 py-2.5">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {item.formatted_size}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleRestore(item.id)}
                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-md transition-colors"
                        title="Restaurer"
                      >
                        <span className="material-symbols-outlined leading-none">restore_from_trash</span>
                      </button>
                      <button
                        onClick={() => handleDeletePermanently(item.id)}
                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"
                        title="Supprimer définitivement"
                      >
                        <span className="material-symbols-outlined leading-none">delete_forever</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Item count */}
      {items.length > 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 px-1">
          {items.length} élément{items.length > 1 ? 's' : ''} dans la corbeille
        </p>
      )}
    </div>
  );
}
