import { useState } from 'react'
import { Link } from 'react-router-dom'
import FileContextMenu from '../components/FileContextMenu'

const breadcrumbs = [
  { label: 'Accueil', to: '/' },
  { label: 'Projets', to: '/drive' },
  { label: 'Marketing Q4', to: null },
]

const tableFiles = [
  {
    id: 1,
    name: 'Marketing Assets',
    type: 'folder',
    icon: 'folder',
    iconColor: 'text-yellow-500',
    iconBg: null,
    owners: [
      { initials: 'SM', color: 'bg-pink-500' },
      { badge: 'Moi' },
    ],
    modified: '24 oct. 2023',
    size: '-',
    selected: false,
  },
  {
    id: 2,
    name: 'Logo_V2.fig',
    type: 'file',
    icon: 'image',
    iconColor: 'text-indigo-500',
    iconBg: 'bg-indigo-50 dark:bg-indigo-500/10',
    owners: [
      { initials: 'SM', color: 'bg-pink-500' },
      { initials: 'JD', color: 'bg-blue-500' },
    ],
    modified: 'il y a 2 min',
    size: '14 Mo',
    selected: true,
  },
  {
    id: 3,
    name: 'Q3_Report.pdf',
    type: 'file',
    icon: 'picture_as_pdf',
    iconColor: 'text-red-500',
    iconBg: 'bg-red-50 dark:bg-red-500/10',
    owners: [{ badge: 'Moi' }],
    modified: 'Hier',
    size: '2,4 Mo',
    selected: false,
  },
  {
    id: 4,
    name: 'Budget_2024.xlsx',
    type: 'file',
    icon: 'table_chart',
    iconColor: 'text-green-500',
    iconBg: 'bg-green-50 dark:bg-green-500/10',
    owners: [{ initials: 'MR', color: 'bg-teal-500' }],
    modified: '20 oct. 2023',
    size: '850 Ko',
    selected: false,
  },
]

const activityItems = [
  {
    id: 1,
    user: 'Sarah M.',
    initials: 'SM',
    color: 'bg-pink-500',
    time: 'il y a 10 min',
    action: 'A téléversé une nouvelle version',
    quote: 'v2.1 - Ajustement des espacements de la barre de navigation.',
  },
  {
    id: 2,
    user: 'John D.',
    initials: 'JD',
    color: 'bg-blue-500',
    time: 'il y a 5 min',
    action: 'A commenté le fichier',
    quote: 'Le bleu pourrait-il être plus prononcé ? Il paraît un peu terne sur les écrans en mode sombre.',
  },
  {
    id: 3,
    user: 'Système',
    initials: 'S',
    color: 'bg-indigo-500',
    time: 'il y a 2 h',
    action: 'Fichier créé',
    quote: null,
    isSystem: true,
  },
]

export default function FileExplorerDetail() {
  const [view, setView] = useState('list')

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-border-dark bg-white dark:bg-surface-dark shrink-0">
        <nav className="flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.label} className="flex items-center gap-1.5">
              {index > 0 && (
                <span className="material-symbols-outlined text-[16px] text-slate-400 dark:text-slate-500">chevron_right</span>
              )}
              {crumb.to ? (
                <Link to={crumb.to} className="text-slate-500 dark:text-slate-400 hover:text-primary transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-semibold text-slate-900 dark:text-white">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-surface-dark rounded-lg p-1">
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 rounded transition-all ${view === 'grid' ? 'bg-white dark:bg-border-dark text-primary shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
            >
              <span className="material-symbols-outlined">grid_view</span>
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded transition-all ${view === 'list' ? 'bg-white dark:bg-border-dark text-primary shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
            >
              <span className="material-symbols-outlined">view_list</span>
            </button>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-border-dark hover:bg-slate-50 dark:hover:bg-[#1f2d3d] transition-colors">
            <span className="material-symbols-outlined">filter_list</span>
            Filtrer
          </button>
        </div>
      </div>

      {/* Split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* File table (left) */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-background-dark">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#151e26] sticky top-0 z-10">
                <th className="w-[40%] text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nom</th>
                <th className="w-[20%] text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Propriétaire</th>
                <th className="w-[20%] text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Modifié le</th>
                <th className="w-[10%] text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Taille</th>
                <th className="w-[10%] text-right px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {tableFiles.map((file) => (
                <tr
                  key={file.id}
                  className={`group border-b border-slate-100 dark:border-border-dark transition-colors cursor-pointer ${
                    file.selected
                      ? 'bg-blue-50/50 dark:bg-primary/10 border-l-2 border-l-primary'
                      : 'hover:bg-slate-50 dark:hover:bg-[#151e26]'
                  }`}
                >
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      {file.type === 'folder' ? (
                        <span className={`material-symbols-outlined text-3xl ${file.iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>{file.icon}</span>
                      ) : (
                        <div className={`w-9 h-9 rounded-lg ${file.iconBg} flex items-center justify-center flex-shrink-0`}>
                          <span className={`material-symbols-outlined text-xl ${file.iconColor}`}>{file.icon}</span>
                        </div>
                      )}
                      <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{file.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {file.owners.map((owner) =>
                        owner.badge ? (
                          <span key={owner.badge} className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{owner.badge}</span>
                        ) : (
                          <div key={owner.initials} className={`w-7 h-7 rounded-full ${owner.color} flex items-center justify-center text-[10px] font-semibold text-white -ml-1 first:ml-0 ring-2 ring-white dark:ring-background-dark`}>
                            {owner.initials}
                          </div>
                        )
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{file.modified}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{file.size}</span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <FileContextMenu forceVisible={file.selected} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right sidebar - Detail panel */}
        <aside className="w-80 flex-shrink-0 bg-white dark:bg-[#131b24] border-l border-slate-200 dark:border-border-dark flex flex-col">
          {/* Preview */}
          <div className="p-4">
            <div className="aspect-video bg-gradient-to-br from-indigo-500/20 to-purple-500/20 dark:from-indigo-500/10 dark:to-purple-500/10 rounded-lg flex items-center justify-center relative border border-slate-200 dark:border-border-dark">
              <span className="material-symbols-outlined text-5xl text-indigo-400/60">image</span>
              <button className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white bg-black/20 rounded-md transition-colors">
                <span className="material-symbols-outlined text-lg">open_in_full</span>
              </button>
            </div>
          </div>

          {/* File info */}
          <div className="px-4 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Logo_V2.fig</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Fichier Design Figma</p>
              </div>
              <button className="p-1 text-primary hover:bg-primary/10 rounded transition-colors">
                <span className="material-symbols-outlined text-lg">edit</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-border-dark px-4">
            <button className="px-4 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
              Détails
            </button>
            <button className="px-4 py-2.5 text-sm font-medium text-primary border-b-2 border-primary bg-slate-50/50 dark:bg-surface-dark/50">
              Activité
            </button>
          </div>

          {/* Activity feed */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-0">
              {activityItems.map((item, index) => (
                <div key={item.id} className={`flex gap-3 ${item.isSystem ? 'opacity-60' : ''}`}>
                  {/* Timeline */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full ${item.color} flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0`}>
                      {item.initials}
                    </div>
                    {index < activityItems.length - 1 && (
                      <div className="w-[1px] flex-1 bg-slate-200 dark:bg-border-dark my-1"></div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{item.user}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{item.time}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.action}</p>
                    {item.quote && (
                      <div className="mt-2 pl-3 border-l-2 border-slate-200 dark:border-border-dark">
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{item.quote}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comment input */}
          <div className="p-4 border-t border-slate-200 dark:border-border-dark">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Écrire un commentaire..."
                className="flex-1 bg-slate-100 dark:bg-surface-dark border-none rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-primary"
              />
              <button className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
