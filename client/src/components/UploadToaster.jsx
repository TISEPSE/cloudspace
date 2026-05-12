import { useState, useEffect, useRef } from 'react'
import { useUpload } from '../contexts/UploadContext'

const fileTypeIcons = {
  'image/': { icon: 'image', color: 'text-indigo-400' },
  'video/': { icon: 'movie', color: 'text-purple-400' },
  'audio/': { icon: 'music_note', color: 'text-pink-400' },
  'application/pdf': { icon: 'picture_as_pdf', color: 'text-red-400' },
  'application/zip': { icon: 'folder_zip', color: 'text-gray-400' },
  'text/plain': { icon: 'article', color: 'text-slate-400' },
  'text/': { icon: 'data_object', color: 'text-yellow-400' },
}

function getFileIcon(type) {
  if (!type) return { icon: 'draft', color: 'text-slate-400' }
  for (const [key, value] of Object.entries(fileTypeIcons)) {
    if (type.startsWith(key)) return value
  }
  return { icon: 'draft', color: 'text-slate-400' }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

function StatusIcon({ allDone, errorCount }) {
  if (allDone && errorCount === 0) {
    return (
      <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center">
        <span className="material-symbols-outlined text-sm text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
      </div>
    )
  }
  if (allDone && errorCount > 0) {
    return (
      <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center">
        <span className="material-symbols-outlined text-sm text-amber-400" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
      </div>
    )
  }
  return (
    <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center">
      <svg className="w-3.5 h-3.5 text-primary animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  )
}

function getStatusMessage({ allDone, errorCount, doneCount, total }) {
  if (allDone && errorCount > 0) return `${doneCount} uploaded, ${errorCount} failed`
  if (allDone) return `${doneCount} upload${doneCount > 1 ? 's' : ''} complete`
  return `Uploading ${doneCount}/${total}...`
}

export default function UploadToaster() {
  const { queue, visible, clearDone, dismiss } = useUpload()
  const [mounted, setMounted] = useState(false)
  const [animateIn, setAnimateIn] = useState(false)
  const timeoutRef = useRef(null)

  const shouldShow = visible && queue.length > 0

  useEffect(() => {
    clearTimeout(timeoutRef.current)

    if (shouldShow && !mounted) {
      // Mount first, then animate in on next frame
      setMounted(true)
    } else if (!shouldShow && mounted) {
      // Animate out, then unmount after transition
      setAnimateIn(false)
      timeoutRef.current = setTimeout(() => setMounted(false), 300)
    }

    return () => clearTimeout(timeoutRef.current)
  }, [shouldShow, mounted])

  // Trigger animate-in after mount
  useEffect(() => {
    if (mounted && shouldShow) {
      // Need a frame delay so the browser paints the initial (hidden) state first
      const raf = requestAnimationFrame(() => setAnimateIn(true))
      return () => cancelAnimationFrame(raf)
    }
  }, [mounted, shouldShow])

  if (!mounted) return null

  const doneCount = queue.filter(f => f.status === 'done').length
  const errorCount = queue.filter(f => f.status === 'error').length
  const total = queue.length
  const allDone = total > 0 && doneCount + errorCount === total
  const overallProgress = total > 0 ? Math.round(queue.reduce((sum, f) => sum + f.progress, 0) / total) : 0

  return (
    <div
      className={`fixed z-50 transition-all duration-300 ease-out
        bottom-[calc(64px+env(safe-area-inset-bottom)+12px)] left-3 right-3 w-auto
        sm:bottom-5 sm:right-5 sm:left-auto sm:w-[360px] ${
        animateIn
          ? 'translate-y-0 opacity-100 scale-100'
          : 'translate-y-6 opacity-0 scale-95'
      }`}
    >
      <div className="bg-white dark:bg-[#1a2633] border border-slate-200 dark:border-[#283039] rounded-xl shadow-2xl shadow-black/15 dark:shadow-black/40 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <StatusIcon allDone={allDone} errorCount={errorCount} />
            <span className="text-[13px] font-semibold text-slate-900 dark:text-white">
              {getStatusMessage({ allDone, errorCount, doneCount, total })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {doneCount > 0 && !allDone && (
              <button onClick={clearDone} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors" title="Clear completed">
                <span className="material-symbols-outlined">playlist_remove</span>
              </button>
            )}
            <button onClick={dismiss} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Overall progress */}
        {!allDone && (
          <div className="h-[2px] bg-slate-100 dark:bg-[#283039]">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        )}

        {/* File list */}
        <div className="max-h-[220px] overflow-y-auto">
          {queue.map(file => {
            const typeInfo = getFileIcon(file.type)
            return (
              <div key={file.id} className="flex items-center gap-3 px-4 py-2.5 border-t border-slate-100 dark:border-[#283039]/60">
                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-[#151e26] flex items-center justify-center flex-shrink-0">
                  <span className={`material-symbols-outlined text-lg ${typeInfo.color}`}>{typeInfo.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{file.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {file.status === 'uploading' && (
                      <>
                        <div className="flex-1 h-1 bg-slate-100 dark:bg-[#283039] rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-200 ease-out" style={{ width: `${file.progress}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400 tabular-nums w-8 text-right">{file.progress}%</span>
                      </>
                    )}
                    {file.status === 'pending' && (
                      <span className="text-[10px] text-slate-400">Waiting...</span>
                    )}
                    {file.status === 'done' && (
                      <span className="text-[10px] text-slate-400">{formatSize(file.size)}</span>
                    )}
                    {file.status === 'error' && (
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-red-400" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                        <span className="text-[10px] text-red-400">Failed</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
