import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'

export default function History() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchPage = useCallback((p, append = false) => {
    const setter = append ? setLoadingMore : setLoading
    setter(true)
    apiFetch(`/api/activity/history?page=${p}`)
      .then(r => r.json())
      .then(data => {
        if (append) {
          setGroups(prev => {
            const merged = [...prev]
            for (const newGroup of (data.groups || [])) {
              const existing = merged.find(g => g.date === newGroup.date)
              if (existing) {
                existing.events = [...existing.events, ...newGroup.events]
              } else {
                merged.push(newGroup)
              }
            }
            return merged
          })
        } else {
          setGroups(data.groups || [])
        }
        setHasMore(data.has_more || false)
      })
      .finally(() => setter(false))
  }, [])

  useEffect(() => { fetchPage(1) }, [fetchPage])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    fetchPage(next, true)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col">
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Journal de toutes les actions de votre espace</p>

      {loading && (
        <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500">
          <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
          Chargement...
        </div>
      )}

      {!loading && groups.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">history</span>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Aucune activité</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Vos actions apparaîtront ici au fil du temps.</p>
        </div>
      )}

      <div className="space-y-8">
        {groups.map(group => (
          <div key={group.date}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{group.date}</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-border-dark" />
              <span className="text-xs text-slate-400 dark:text-slate-500">{group.events.length} actions</span>
            </div>
            <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark overflow-hidden">
              {group.events.map((event, idx) => (
                <div
                  key={event.id}
                  className={`flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-[#1f2d3d] transition-colors ${
                    idx < group.events.length - 1 ? 'border-b border-slate-100 dark:border-border-dark' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg ${event.icon_bg} flex items-center justify-center flex-shrink-0`}>
                    <span className={`material-symbols-outlined text-[16px] ${event.icon_color}`}>{event.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-medium text-slate-900 dark:text-white">{event.action}</span>
                      {' '}
                      {event.target_id
                        ? <Link
                            to={event.target_parent_id ? `/drive/folder/${event.target_parent_id}` : '/drive'}
                            state={{ openFileId: event.target_id }}
                            className="font-medium text-primary hover:underline"
                          >{event.target}</Link>
                        : <span className="font-medium text-primary">{event.target}</span>
                      }
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 tabular-nums">{event.time}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-8 flex justify-center pb-8">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="text-sm text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-white transition-colors font-medium disabled:opacity-50"
          >
            {loadingMore ? 'Chargement...' : "Charger plus d'historique..."}
          </button>
        </div>
      )}
    </div>
  )
}
