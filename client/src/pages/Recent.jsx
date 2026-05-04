import { useState, useEffect } from 'react'
import FileContextMenu from '../components/FileContextMenu'
import { apiFetch } from '../lib/api'

function FileRow({ file }) {
  return (
    <tr className="group hover:bg-slate-50 dark:hover:bg-[#1f2d3d] transition-colors cursor-pointer">
      <td className="px-5 py-3 w-[45%]">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center ${file.icon_bg} rounded-lg`}>
            <span className={`material-symbols-outlined text-[16px] ${file.icon_color}`}>{file.icon}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{file.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 md:hidden">{file.activity}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3 w-[25%] hidden md:table-cell">
        <span className="text-sm text-slate-500 dark:text-slate-400">{file.activity}</span>
      </td>
      <td className="px-5 py-3 w-[20%] hidden sm:table-cell">
        <span className="text-sm text-slate-500 dark:text-slate-400">{file.formatted_size || '--'}</span>
      </td>
      <td className="px-5 py-3 w-[10%] text-right">
        <FileContextMenu />
      </td>
    </tr>
  )
}

function DateGroup({ group }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{group.date}</span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-border-dark" />
        <span className="text-xs text-slate-400">{group.files.length} fichier{group.files.length > 1 ? 's' : ''}</span>
      </div>
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-[#151e26] border-b border-slate-200 dark:border-border-dark">
            <tr>
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[45%]">Nom</th>
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[25%] hidden md:table-cell">Activité</th>
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[20%] hidden sm:table-cell">Taille</th>
              <th className="px-5 py-2.5 w-[10%]" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-border-dark">
            {group.files.map(f => <FileRow key={f.id} file={f} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Recent() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/files/recent')
      .then(r => r.json())
      .then(data => setGroups(data.groups || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Récents</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Fichiers consultés et modifiés récemment</p>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500">
          <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
          Chargement...
        </div>
      )}

      {!loading && groups.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">history</span>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Aucune activité récente</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Vos fichiers récemment consultés apparaîtront ici.</p>
        </div>
      )}

      {!loading && groups.map(group => <DateGroup key={group.date} group={group} />)}
    </div>
  )
}
