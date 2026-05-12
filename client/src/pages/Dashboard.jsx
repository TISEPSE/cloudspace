import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiFetch, downloadFile } from '../lib/api'
import { apiUrl } from '../lib/backendUrl'
import FileContextMenu from '../components/FileContextMenu'
import FilePreviewModal from '../components/FilePreviewModal'
import ItemDetailsModal from '../components/ItemDetailsModal'
import MoveItemModal from '../components/MoveItemModal'
import ShareModal from '../components/ShareModal'

const Sk = ({ className = '', style }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`} style={style} />
)

function StatCard({ stat }) {
  return (
    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
          <span className={`material-symbols-outlined ${stat.iconColor}`}>{stat.icon}</span>
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
        <p className={`text-[11px] font-medium ${stat.changeColor}`}>{stat.change}</p>
      </div>
    </div>
  )
}

function ActivityItem({ item, isLast }) {
  const fileHref = item.target_id
    ? (item.target_parent_id ? `/drive/folder/${item.target_parent_id}` : '/drive')
    : null

  return (
    <div className={`flex items-center gap-3 py-3 ${!isLast ? 'border-b border-slate-100 dark:border-border-dark' : ''}`}>
      <div className={`w-8 h-8 rounded-full ${item.color} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
        {item.avatar_url
          ? <img src={apiUrl(item.avatar_url)} alt="" className="w-full h-full object-cover" />
          : <span className="text-[10px] font-bold text-white">{item.initials}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 dark:text-slate-300 truncate">
          <span className="font-medium text-slate-900 dark:text-white">{item.user}</span>
          {' '}{item.action}{' '}
          {fileHref
            ? <Link to={fileHref} state={{ openFileId: item.target_id }} className="font-medium text-primary hover:underline">{item.target}</Link>
            : <span className="font-medium text-primary">{item.target}</span>}
        </p>
      </div>
      <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">{item.time}</span>
    </div>
  )
}

function QuickAccessItem({ file, isLast, onAction }) {
  return (
    <div className={`group relative flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-lg transition-colors hover:bg-slate-50 dark:hover:bg-[#1f2d3d] cursor-pointer ${!isLast ? 'border-b border-slate-100 dark:border-border-dark' : ''}`} onClick={() => onAction('preview', file)}>
      <div className={`w-9 h-9 rounded-lg ${file.icon_bg} flex items-center justify-center flex-shrink-0`}>
        <span className={`material-symbols-outlined text-lg ${file.icon_color}`}>{file.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{file.name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{file.subtitle}</p>
      </div>
      {file.badge && (
        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{file.badge}</span>
      )}
      <FileContextMenu onAction={(action) => onAction(action, file)} />
    </div>
  )
}

function TeamMemberRow({ member, isLast }) {
  return (
    <div className={`flex items-center gap-3 py-2.5 ${!isLast ? 'border-b border-slate-100 dark:border-border-dark' : ''}`}>
      <div className="relative flex-shrink-0">
        <div className={`w-9 h-9 rounded-full ${member.color} flex items-center justify-center`}>
          <span className="text-[11px] font-bold text-white">{member.initials}</span>
        </div>
        {member.online && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-surface-dark"></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white">{member.name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{member.role}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-slate-900 dark:text-white tabular-nums">{member.files}</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500">fichiers</p>
      </div>
    </div>
  )
}

function RenameModal({ file, onClose, onRenamed }) {
  const [value, setValue] = useState(file?.name || '')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!value.trim() || value === file.name) { onClose(); return }
    setLoading(true)
    apiFetch(`/api/files/${file.id}/rename`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: value.trim() }),
    })
      .then(r => r.json())
      .then(() => { onRenamed(file.id, value.trim()); onClose() })
      .catch(() => setLoading(false))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-border-dark shadow-2xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 dark:border-border-dark">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Renommer</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <input
            autoFocus
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-border-dark rounded-xl transition-colors">Annuler</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50">Renommer</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ConfirmTrashModal({ file, onClose, onTrashed }) {
  const [loading, setLoading] = useState(false)

  function handleConfirm() {
    setLoading(true)
    apiFetch(`/api/files/${file.id}`, { method: 'DELETE' })
      .then(() => { onTrashed(file.id); onClose() })
      .catch(() => setLoading(false))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-border-dark shadow-2xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-red-500">delete</span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Supprimer</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">« {file?.name} » sera déplacé dans la corbeille.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-border-dark rounded-xl transition-colors">Annuler</button>
            <button onClick={handleConfirm} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50">Supprimer</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState([
    { label: 'Fichiers totaux', value: '-', change: '', icon: 'description', iconColor: 'text-blue-500', iconBg: 'bg-blue-500/10', changeColor: 'text-green-500' },
    { label: 'Stockage utilisé', value: '-', change: '', icon: 'cloud', iconColor: 'text-primary', iconBg: 'bg-primary/10', changeColor: 'text-slate-500' },
    { label: 'Fichiers partagés', value: '-', change: '', icon: 'group', iconColor: 'text-indigo-500', iconBg: 'bg-indigo-500/10', changeColor: 'text-green-500' },
    { label: 'Corbeille', value: '-', change: '', icon: 'delete', iconColor: 'text-red-400', iconBg: 'bg-red-400/10', changeColor: 'text-slate-500' },
  ])
  const [storageByType, setStorageByType] = useState([])
  const [storageTotal, setStorageTotal] = useState({ used: '0 GB', limit: '20 GB' })
  const [activityFeed, setActivityFeed] = useState([])
  const [quickAccessFiles, setQuickAccessFiles] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [onlineCount, setOnlineCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Modal state
  const [previewFile, setPreviewFile] = useState(null)
  const [detailsItemId, setDetailsItemId] = useState(null)
  const [renameTarget, setRenameTarget] = useState(null)
  const [trashTarget, setTrashTarget] = useState(null)
  const [moveTarget, setMoveTarget] = useState(null)
  const [shareTarget, setShareTarget] = useState(null)

  useEffect(() => {
    Promise.allSettled([
      apiFetch('/api/dashboard/stats').then(r => r.json()),
      apiFetch('/api/user/storage').then(r => r.json()),
      apiFetch('/api/dashboard/activity?limit=6').then(r => r.json()),
      apiFetch('/api/dashboard/quick-access?limit=4').then(r => r.json()),
      apiFetch('/api/dashboard/team').then(r => r.json()),
    ]).then(([statsResult, storageResult, activityResult, quickResult, teamResult]) => {
      if (statsResult.status === 'fulfilled') {
        const statsData = statsResult.value
        const storageLimit = storageResult.status === 'fulfilled' ? storageResult.value.formatted_limit : '20 GB'
        setStats([
          { label: 'Fichiers totaux', value: statsData.total_files.toLocaleString(), change: statsData.total_files_change, icon: 'description', iconColor: 'text-blue-500', iconBg: 'bg-blue-500/10', changeColor: 'text-green-500' },
          { label: 'Stockage utilisé', value: statsData.storage_used, change: `${statsData.storage_percentage}% sur ${storageLimit}`, icon: 'cloud', iconColor: 'text-primary', iconBg: 'bg-primary/10', changeColor: 'text-slate-500' },
          { label: 'Fichiers partagés', value: statsData.shared_files.toString(), change: statsData.shared_files_change, icon: 'group', iconColor: 'text-indigo-500', iconBg: 'bg-indigo-500/10', changeColor: 'text-green-500' },
          { label: 'Corbeille', value: statsData.trash_items.toString(), change: `Suppression auto dans ${statsData.trash_auto_delete}`, icon: 'delete', iconColor: 'text-red-400', iconBg: 'bg-red-400/10', changeColor: 'text-slate-500' },
        ])
      }

      if (storageResult.status === 'fulfilled') {
        const storageData = storageResult.value
        const colorMap = {
          'Images': 'bg-indigo-500',
          'Videos': 'bg-purple-500',
          'Documents': 'bg-blue-500',
          'Spreadsheets': 'bg-green-500',
          'Other': 'bg-slate-400',
        }
        setStorageByType(storageData.breakdown.map(item => ({
          type: item.type,
          size: item.formatted,
          percent: item.percent,
          color: colorMap[item.type] || 'bg-slate-400',
          icon: item.icon,
        })))
        setStorageTotal({ used: storageData.formatted_used, limit: storageData.formatted_limit })
      }

      if (activityResult.status === 'fulfilled') {
        setActivityFeed(activityResult.value.activities.map((a, i) => ({
          id: `${i}-${a.target}`,
          user: a.user.name,
          initials: a.user.initials,
          color: a.user.color,
          avatar_url: a.user.avatar_url || null,
          action: a.action,
          target: a.target,
          target_id: a.target_id || null,
          target_parent_id: a.target_parent_id || null,
          time: a.time,
        })))
      }

      if (quickResult.status === 'fulfilled') {
        setQuickAccessFiles(quickResult.value.files.map(f => ({
          id: f.id,
          name: f.name,
          icon: f.icon,
          icon_color: f.icon_color,
          icon_bg: f.icon_bg,
          subtitle: f.subtitle,
          badge: f.is_owner ? null : 'Partagé',
          parent_id: f.parent_id || null,
          mime_type: f.mime_type || '',
          has_content: f.has_content || false,
          formatted_size: f.formatted_size || '',
          size: f.size || 0,
          is_starred: f.is_starred || false,
        })))
      }

      if (teamResult.status === 'fulfilled') {
        setTeamMembers(teamResult.value.members.map(m => ({
          name: m.name,
          initials: m.initials,
          color: m.color,
          role: m.role,
          files: m.files_count,
          online: m.is_online,
        })))
        setOnlineCount(teamResult.value.online_count)
      }
    }).finally(() => setLoading(false))
  }, [])

  function handleQuickAction(action, file) {
    if (action === 'preview') {
      setPreviewFile(file)
    } else if (action === 'download') {
      downloadFile(file.id, file.name).catch(() => {})
    } else if (action === 'star') {
      apiFetch(`/api/files/${file.id}/star`, { method: 'PUT' })
        .then(() => setQuickAccessFiles(prev => prev.map(f => f.id === file.id ? { ...f, is_starred: !f.is_starred } : f)))
        .catch(() => {})
    } else if (action === 'rename') {
      setRenameTarget(file)
    } else if (action === 'details') {
      setDetailsItemId(file.id)
    } else if (action === 'move') {
      setMoveTarget(file)
    } else if (action === 'share') {
      setShareTarget(file)
    } else if (action === 'trash') {
      setTrashTarget(file)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-background-light dark:bg-background-dark">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <button className="self-start flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-lg hover:bg-slate-50 dark:hover:bg-[#1f2d3d] transition-colors">
          <span className="material-symbols-outlined">calendar_today</span>
          7 derniers jours
        </button>
        <p className="text-sm text-slate-500 dark:text-slate-400">Bonjour, <span className="font-medium text-slate-700 dark:text-slate-300">{user?.first_name || ''}</span></p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl p-4">
            <Sk className="w-10 h-10 rounded-lg mb-3" />
            <Sk className="h-7 w-14 mb-2" />
            <Sk className="h-3 w-28" />
          </div>
        )) : stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      {/* Main Grid: Storage + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Storage Breakdown */}
        <div className="lg:col-span-1 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Répartition du stockage</h3>
            <Link to="/settings" className="text-xs text-primary hover:text-blue-600 font-medium transition-colors">Gérer</Link>
          </div>

          {loading ? (
            <div className="animate-pulse flex flex-col flex-1">
              <Sk className="h-3 w-full rounded-full mb-5" />
              <div className="space-y-3 pb-3 flex-1">
                {[55, 40, 65, 45, 30].map((w, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Sk className="w-2.5 h-2.5 rounded-full" />
                      <Sk className={`h-3.5`} style={{ width: `${w}px` }} />
                    </div>
                    <Sk className="h-3 w-10" />
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-4 border-t border-slate-200 dark:border-border-dark flex items-center justify-between">
                <Sk className="h-3 w-20" />
                <Sk className="h-3 w-24" />
              </div>
            </div>
          ) : (
            <>
              {/* Usage bar */}
              <div className="flex rounded-full h-3 overflow-hidden mb-5">
                {storageByType.map((item) => (
                  <div
                    key={item.type}
                    className={`${item.color} transition-all`}
                    style={{ width: `${item.percent}%` }}
                    title={`${item.type}: ${item.size}`}
                  />
                ))}
              </div>

              {/* Legend */}
              <div className="space-y-3 pb-3">
                {storageByType.map((item) => (
                  <div key={item.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${item.color}`}></div>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{item.type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-900 dark:text-white tabular-nums">{item.size}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 w-8 text-right tabular-nums">{item.percent}%</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="mt-auto pt-4 border-t border-slate-200 dark:border-border-dark flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total utilisé</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{storageTotal.used} / {storageTotal.limit}</span>
              </div>
            </>
          )}
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Activité récente</h3>
            <Link to="/history" className="text-xs text-primary hover:text-blue-600 font-medium transition-colors">Tout voir</Link>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3 border-b border-slate-100 dark:border-border-dark last:border-0">
                  <Sk className="w-8 h-8 rounded-full flex-shrink-0" />
                  <Sk className="flex-1 h-3.5 max-w-xs" />
                  <Sk className="h-3 w-10 flex-shrink-0" />
                </div>
              ))}
            </div>
          ) : activityFeed.length > 0 ? (
            <div className="space-y-0">
              {activityFeed.map((item, index) => (
                <ActivityItem key={item.id} item={item} isLast={index === activityFeed.length - 1} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">history</span>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Aucune activité récente</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Vos actions sur les fichiers apparaîtront ici.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Quick Access + Team */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Access */}
        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl p-5 flex flex-col min-h-[220px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Accès rapide</h3>
            <Link to="/drive" className="text-xs text-primary hover:text-blue-400 hover:underline font-medium transition-colors">Mon Drive</Link>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-0">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-border-dark last:border-0">
                  <Sk className="w-9 h-9 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Sk className="h-3.5 w-2/3" />
                    <Sk className="h-2.5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : quickAccessFiles.length > 0 ? (
            <div className="space-y-0">
              {quickAccessFiles.map((file, index) => (
                <QuickAccessItem
                  key={file.id}
                  file={file}
                  isLast={index === quickAccessFiles.length - 1}
                  onAction={handleQuickAction}
                />
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">folder_open</span>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Aucun fichier récent</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Les fichiers que vous ouvrez apparaîtront ici.</p>
            </div>
          )}
        </div>

        {/* Team Members */}
        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl p-5 flex flex-col min-h-[220px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Membres de l'équipe</h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">{onlineCount > 0 ? `${onlineCount} en ligne` : ''}</span>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-0">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-border-dark last:border-0">
                  <Sk className="w-9 h-9 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Sk className="h-3.5 w-1/2" />
                    <Sk className="h-2.5 w-1/3" />
                  </div>
                  <div className="space-y-1 text-right">
                    <Sk className="h-3.5 w-8 ml-auto" />
                    <Sk className="h-2.5 w-10 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : teamMembers.length > 0 ? (
            <div className="space-y-0">
              {teamMembers.map((member, index) => (
                <TeamMemberRow key={member.name} member={member} isLast={index === teamMembers.length - 1} />
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">group</span>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Aucun membre d'équipe</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Les personnes avec qui vous partagez des fichiers apparaîtront ici.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {previewFile && (
        <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
      {detailsItemId && (
        <ItemDetailsModal itemId={detailsItemId} onClose={() => setDetailsItemId(null)} />
      )}
      {renameTarget && (
        <RenameModal
          file={renameTarget}
          onClose={() => setRenameTarget(null)}
          onRenamed={(id, newName) => setQuickAccessFiles(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f))}
        />
      )}
      {trashTarget && (
        <ConfirmTrashModal
          file={trashTarget}
          onClose={() => setTrashTarget(null)}
          onTrashed={(id) => setQuickAccessFiles(prev => prev.filter(f => f.id !== id))}
        />
      )}
      {moveTarget && (
        <MoveItemModal
          item={moveTarget}
          onClose={() => setMoveTarget(null)}
          onMoved={() => {
            setQuickAccessFiles(prev => prev.filter(f => f.id !== moveTarget.id))
            setMoveTarget(null)
          }}
        />
      )}
      {shareTarget && (
        <ShareModal
          item={shareTarget}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  )
}
