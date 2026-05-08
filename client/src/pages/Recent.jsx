import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'

function ActivityItem({ item, isLast }) {
  const fileHref = item.target_id
    ? (item.target_parent_id ? `/drive/folder/${item.target_parent_id}` : '/drive')
    : null

  return (
    <div className={`flex items-center gap-3 py-3 ${!isLast ? 'border-b border-slate-100 dark:border-border-dark' : ''}`}>
      <div className={`w-8 h-8 rounded-full ${item.color} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
        {item.avatar_url
          ? <img src={item.avatar_url} alt="" className="w-full h-full object-cover" />
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

function groupByDate(activities) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const groups = {}
  const order = []

  for (const item of activities) {
    const d = item.created_at ? new Date(item.created_at) : null
    let key
    if (!d) {
      key = 'Plus tôt'
    } else if (d >= today) {
      key = "Aujourd'hui"
    } else if (d >= yesterday) {
      key = 'Hier'
    } else if (d >= weekAgo) {
      key = 'Cette semaine'
    } else {
      key = 'Plus tôt'
    }
    if (!groups[key]) { groups[key] = []; order.push(key) }
    groups[key].push(item)
  }

  return order.map(k => ({ date: k, items: groups[k] }))
}

export default function Recent() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/dashboard/activity?limit=100')
      .then(r => r.json())
      .then(data => {
        const activities = (data.activities || []).map((a, i) => ({
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
          created_at: a.created_at || null,
        }))
        setGroups(groupByDate(activities))
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Récents</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Historique de vos activités récentes</p>
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
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Vos actions apparaîtront ici.</p>
        </div>
      )}

      {!loading && groups.map(group => (
        <div key={group.date} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{group.date}</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-border-dark" />
            <span className="text-xs text-slate-400">{group.items.length} action{group.items.length > 1 ? 's' : ''}</span>
          </div>
          <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark px-4">
            {group.items.map((item, i) => (
              <ActivityItem key={item.id} item={item} isLast={i === group.items.length - 1} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
