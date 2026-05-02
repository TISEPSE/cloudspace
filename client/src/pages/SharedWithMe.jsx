import { useState, useEffect } from 'react'
import FileContextMenu from '../components/FileContextMenu'
import { apiFetch } from '../lib/api'

function AvatarFallback({ name }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'
  return (
    <div className="w-7 h-7 rounded-full bg-slate-400 flex items-center justify-center flex-shrink-0">
      <span className="text-[10px] font-bold text-white">{initials}</span>
    </div>
  )
}

export default function SharedWithMe() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/sharing/shared-with-me')
      .then(r => r.json())
      .then(data => setItems(data.shared_files || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Partagés avec moi</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Fichiers et dossiers partagés par d'autres membres
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500">
          <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
          Chargement...
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">group</span>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Aucun partage reçu</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            Quand quelqu'un partage un fichier avec vous, il apparaît ici.
          </p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="w-[38%] text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nom</th>
                <th className="hidden sm:table-cell w-[25%] text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Partagé par</th>
                <th className="hidden md:table-cell w-[15%] text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                <th className="hidden lg:table-cell w-[10%] text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Taille</th>
                <th className="hidden lg:table-cell w-[10%] text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Permission</th>
                <th className="w-[5%] text-right px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <div className={`w-7 h-7 rounded-lg ${item.icon_bg} flex items-center justify-center`}>
                          <span
                            className={`material-symbols-outlined text-[14px] leading-none ${item.icon_color}`}
                            style={item.is_folder ? { fontVariationSettings: "'FILL' 1" } : undefined}
                          >
                            {item.is_folder ? 'folder' : item.icon}
                          </span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-slate-400 dark:text-slate-300 text-[9px]">group</span>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.mime_type || 'Dossier'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      {item.shared_by.avatar_url ? (
                        <img src={item.shared_by.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <AvatarFallback name={item.shared_by.name} />
                      )}
                      <span className="text-sm text-slate-700 dark:text-slate-300">{item.shared_by.name}</span>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-5 py-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{item.relative_time || '--'}</span>
                  </td>
                  <td className="hidden lg:table-cell px-5 py-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{item.formatted_size || '--'}</span>
                  </td>
                  <td className="hidden lg:table-cell px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      item.permission === 'editor'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                    }`}>
                      {item.permission === 'editor' ? 'Éditeur' : 'Lecteur'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <FileContextMenu className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      <span className="material-symbols-outlined">more_vert</span>
                    </FileContextMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
