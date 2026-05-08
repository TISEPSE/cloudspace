import { useState, useEffect } from 'react'
import FileContextMenu from '../components/FileContextMenu'
import { apiFetch } from '../lib/api'
import { useLocalPref } from '../hooks/useLocalPref'
import { formatDisplayName } from '../utils/filename'

function FolderRow({ folder }) {
  return (
    <div className="flex items-center p-3 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-lg hover:bg-slate-50 dark:hover:bg-[#1f2d3d] cursor-pointer transition-colors shadow-sm group">
      <div className="relative mr-3 flex-shrink-0">
        <span
          className={`material-symbols-outlined text-xl ${folder.icon_color}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {folder.is_locked ? 'folder_shared' : 'folder'}
        </span>
        {folder.is_locked && (
          <span
            className="absolute -bottom-0.5 -right-1 material-symbols-outlined text-[10px] text-slate-400 dark:text-slate-500"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            lock
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{folder.name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {folder.items_count != null ? `${folder.items_count} éléments` : '--'}
        </p>
      </div>
      <FileContextMenu />
    </div>
  )
}

function FileCard({ file, showExt }) {
  const displayName = formatDisplayName(file.name, showExt)
  return (
    <div className="group relative bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-lg p-2 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
      <div className={`aspect-[4/3] ${file.icon_bg} rounded-md mb-2 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-border-dark`}>
        <span className={`material-symbols-outlined text-2xl ${file.icon_color} opacity-80`}>{file.icon}</span>
      </div>
      <div className="flex items-center">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate" title={file.name}>{displayName}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {file.formatted_size} · {file.relative_time}
          </p>
        </div>
        <FileContextMenu />
      </div>
    </div>
  )
}

function FileRowList({ file, showExt }) {
  const displayName = formatDisplayName(file.name, showExt)
  return (
    <tr className="group hover:bg-slate-50 dark:hover:bg-[#1f2d3d] transition-colors cursor-pointer">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${file.icon_bg} flex items-center justify-center flex-shrink-0`}>
            <span
              className={`material-symbols-outlined text-xl ${file.icon_color}`}
              style={file.is_folder ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {file.is_folder ? 'folder' : file.icon}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{displayName}</p>
            {file.is_folder && file.items_count != null && (
              <p className="text-xs text-slate-500">{file.items_count} éléments</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-5 py-3 hidden md:table-cell">
        <span className="text-sm text-slate-500 dark:text-slate-400">{file.relative_time || '--'}</span>
      </td>
      <td className="px-5 py-3 hidden sm:table-cell">
        <span className="text-sm text-slate-500 dark:text-slate-400">{file.formatted_size || '--'}</span>
      </td>
      <td className="px-5 py-3 text-right">
        <FileContextMenu />
      </td>
    </tr>
  )
}

export default function Starred() {
  const [view, setView] = useState('grid')
  const [folders, setFolders] = useState([])
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showExt] = useLocalPref('cloudspace_show_extensions', true)

  useEffect(() => {
    apiFetch('/api/files/starred')
      .then(r => r.json())
      .then(data => {
        setFolders(data.folders || [])
        setFiles(data.files || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const isEmpty = !loading && folders.length === 0 && files.length === 0

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Favoris</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-border-dark overflow-hidden">
            <button
              onClick={() => setView('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${view === 'grid' ? 'text-primary bg-primary/5 dark:bg-primary/10' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <span className="material-symbols-outlined">grid_view</span>
              Grille
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${view === 'list' ? 'text-primary bg-primary/5 dark:bg-primary/10' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <span className="material-symbols-outlined">view_list</span>
              Liste
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500">
          <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
          Chargement...
        </div>
      )}

      {isEmpty && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">star</span>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Aucun favori</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Marquez des fichiers avec ★ pour les retrouver ici.</p>
        </div>
      )}

      {!loading && !isEmpty && view === 'grid' && (
        <>
          {folders.length > 0 && (
            <section className="mb-8">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Dossiers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {folders.map(f => <FolderRow key={f.id} folder={f} />)}
              </div>
            </section>
          )}
          {files.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Fichiers</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {files.map(f => <FileCard key={f.id} file={f} showExt={showExt} />)}
              </div>
            </section>
          )}
        </>
      )}

      {!loading && !isEmpty && view === 'list' && (
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-[#151e26] border-b border-slate-200 dark:border-border-dark">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[50%]">Nom</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[25%] hidden md:table-cell">Modifié</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[20%] hidden sm:table-cell">Taille</th>
                <th className="px-5 py-3 w-[5%]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-border-dark">
              {[...folders, ...files].map(f => <FileRowList key={f.id} file={f} showExt={showExt} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
