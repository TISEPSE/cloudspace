import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'

const PERMISSION_LABELS = { viewer: 'Viewer', editor: 'Editor' }

function ShareRow({ share, onRemove }) {
  const initials = share.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500']
  const color = colors[initials.charCodeAt(0) % colors.length]

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center flex-shrink-0`}>
        <span className="text-[11px] font-bold text-white">{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{share.name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{share.email}</p>
      </div>
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 px-2 py-0.5 bg-slate-100 dark:bg-border-dark rounded-full flex-shrink-0">
        {PERMISSION_LABELS[share.permission] || share.permission}
      </span>
      <button
        onClick={() => onRemove(share.id)}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex-shrink-0"
        title="Remove access"
      >
        <span className="material-symbols-outlined">person_remove</span>
      </button>
    </div>
  )
}

export default function ShareModal({ item, onClose }) {
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState('viewer')
  const [shares, setShares] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    if (!item) return
    setEmail('')
    setPermission('viewer')
    setError(null)
    setSuccess(null)
    setLoading(true)
    apiFetch(`/api/files/${item.id}/shares`)
      .then(r => r.json())
      .then(d => setShares(d.shares || []))
      .catch(() => setShares([]))
      .finally(() => setLoading(false))
  }, [item])

  const handleShare = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await apiFetch(`/api/files/${item.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), permission }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to share')
      } else {
        setSuccess(`Shared with ${data.email}`)
        setEmail('')
        // Refresh share list
        apiFetch(`/api/files/${item.id}/shares`)
          .then(r => r.json())
          .then(d => setShares(d.shares || []))
      }
    } catch {
      setError('An error occurred')
    }
    setSubmitting(false)
  }

  const handleRemove = async (shareId) => {
    try {
      const res = await apiFetch(`/api/files/${item.id}/shares/${shareId}`, { method: 'DELETE' })
      if (res.ok) {
        setShares(prev => prev.filter(s => s.id !== shareId))
      }
    } catch { /* silently fail */ }
  }

  if (!item) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-border-dark shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-border-dark flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg text-indigo-500">share</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Share</h3>
              <p className="text-xs text-slate-500 truncate max-w-[200px]">{item.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-border-dark transition-colors">
            <span className="material-symbols-outlined text-[20px] text-slate-400 leading-none">close</span>
          </button>
        </div>

        {/* Add people form */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-border-dark flex-shrink-0">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Add people</label>
          <form onSubmit={handleShare} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              className="flex-1 min-w-0 px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <select
              value={permission}
              onChange={e => setPermission(e.target.value)}
              className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 flex-shrink-0"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <button
              type="submit"
              disabled={!email.trim() || submitting}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              {submitting ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : 'Share'}
            </button>
          </form>
          {error && (
            <p className="mt-2.5 text-xs text-red-500 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">error</span>{error}
            </p>
          )}
          {success && (
            <p className="mt-2.5 text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>{success}
            </p>
          )}
        </div>

        {/* Shared with list */}
        <div className="flex-1 overflow-y-auto px-6 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-400 text-sm">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>Loading...
            </div>
          ) : shares.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
              <span className="material-symbols-outlined text-3xl">group_off</span>
              <p className="text-sm">Not shared with anyone yet</p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pt-4 pb-1">Shared with</p>
              <div className="divide-y divide-slate-100 dark:divide-border-dark">
                {shares.map(share => (
                  <ShareRow key={share.id} share={share} onRemove={handleRemove} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-border-dark flex-shrink-0">
          <button onClick={onClose} className="w-full py-2.5 text-sm font-semibold text-white bg-primary hover:bg-blue-600 rounded-xl transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
