import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { formatDisplayName } from '../utils/filename'
import { useLocalPref } from '../hooks/useLocalPref'

export default function SearchModal({ onClose, onOpenFile }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const [showExt] = useLocalPref('cloudspace_show_extensions', true)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (query.length < 2) { setResults([]); setLoading(false); return }
    setLoading(true)
    const timer = setTimeout(() => {
      apiFetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(data => { setResults(data.results || []); setActiveIndex(0) })
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = useCallback((item) => {
    if (item.is_folder) {
      navigate(`/drive/folder/${item.id}`)
    } else {
      navigate(item.parent_id ? `/drive/folder/${item.parent_id}` : '/drive')
      onOpenFile(item)
    }
    onClose()
  }, [navigate, onClose, onOpenFile])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { setActiveIndex(i => Math.min(i + 1, results.length - 1)); e.preventDefault() }
      if (e.key === 'ArrowUp') { setActiveIndex(i => Math.max(i - 1, 0)); e.preventDefault() }
      if (e.key === 'Enter' && results[activeIndex]) { handleSelect(results[activeIndex]) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [results, activeIndex, onClose, handleSelect])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg mx-4 bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-border-dark shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-border-dark">
          <span className="material-symbols-outlined text-slate-400 flex-shrink-0">search</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher des fichiers et dossiers…"
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none"
          />
          {loading
            ? <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin flex-shrink-0" />
            : <kbd className="hidden sm:block text-[10px] text-slate-400 bg-slate-100 dark:bg-background-dark px-1.5 py-0.5 rounded font-mono flex-shrink-0">ESC</kbd>
          }
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <div className="max-h-80 overflow-y-auto py-1.5">
            {results.map((item, i) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === activeIndex ? 'bg-slate-50 dark:bg-border-dark' : 'hover:bg-slate-50 dark:hover:bg-border-dark'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-xl flex-shrink-0 ${item.icon_color}`}
                  style={item.is_folder ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                    {formatDisplayName(item.name, showExt)}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {item.is_folder ? 'Dossier' : item.formatted_size} · {item.relative_time}
                  </p>
                </div>
                <span className="material-symbols-outlined text-[16px] text-slate-300 dark:text-slate-600 flex-shrink-0">
                  {item.is_folder ? 'chevron_right' : 'open_in_new'}
                </span>
              </button>
            ))}
          </div>
        ) : query.length >= 2 && !loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
            <span className="material-symbols-outlined text-3xl">search_off</span>
            <p className="text-sm">Aucun résultat pour « {query} »</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
