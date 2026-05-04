import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiFetch } from '../lib/api'

const ACTION_LABELS = {
  file_uploaded:   'a importé',
  file_edited:     'a modifié',
  file_viewed:     'a consulté',
  file_renamed:    'a renommé',
  file_starred:    'a mis en favori',
  file_downloaded: 'a téléchargé',
  file_shared:     'a partagé',
  file_moved:      'a déplacé',
  file_restored:   'a restauré',
  file_copied:     'a copié',
}

function FileRow({ file, currentUser, isLast }) {
  const fileHref = file.parent_id ? `/drive/folder/${file.parent_id}` : '/drive'
  const initials = currentUser
    ? (currentUser.first_name?.[0] || '') + (currentUser.last_name?.[0] || '')
    : '?'
  const actionLabel = ACTION_LABELS[file.action] || 'a accédé à'

  return (
    <div className={`flex items-center gap-3 py-3 ${!isLast ? 'border-b border-slate-100 dark:border-border-dark' : ''}`}>
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
        {currentUser?.avatar_url
          ? <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" />
          : <span className="text-[10px] font-bold text-white">{initials}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 dark:text-slate-300 truncate">
          <span className="font-medium text-slate-900 dark:text-white">Vous</span>
          {' '}{actionLabel}{' '}
          <Link
            to={fileHref}
            state={{ openFileId: file.id }}
            className="font-medium text-primary hover:underline"
          >
            {file.name}
          </Link>
        </p>
      </div>
      {file.time && (
        <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">{file.time}</span>
      )}
    </div>
  )
}

function DateGroup({ group, currentUser }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{group.date}</span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-border-dark" />
        <span className="text-xs text-slate-400">{group.files.length} fichier{group.files.length > 1 ? 's' : ''}</span>
      </div>
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark px-4">
        {group.files.map((f, i) => (
          <FileRow key={f.id} file={f} currentUser={currentUser} isLast={i === group.files.length - 1} />
        ))}
      </div>
    </div>
  )
}

export default function Recent() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

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

      {!loading && groups.map(group => (
        <DateGroup key={group.date} group={group} currentUser={user} />
      ))}
    </div>
  )
}
