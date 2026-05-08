import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import FileContextMenu from '../components/FileContextMenu'
import FilePreviewModal from '../components/FilePreviewModal'
import ItemDetailsModal from '../components/ItemDetailsModal'
import MoveItemModal from '../components/MoveItemModal'
import ShareModal from '../components/ShareModal'
import { useUpload } from '../contexts/UploadContext'
import { apiFetch, getAccessToken, downloadFile } from '../lib/api'
import { getMediaToken } from '../lib/mediaToken'
import { useLocalPref } from '../hooks/useLocalPref'
import { formatDisplayName, splitNameExt } from '../utils/filename'

function VideoThumbnail({ src, className }) {
  const ref = useRef(null)
  return (
    <video
      ref={ref}
      src={src}
      preload="metadata"
      muted
      playsInline
      onLoadedMetadata={() => { if (ref.current) ref.current.currentTime = 0.1 }}
      className={className}
    />
  )
}

function JsonHighlight({ text }) {
  let formatted
  try {
    formatted = JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap break-words leading-relaxed">{text}</pre>
  }

  const e = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const parts = []
  let lastIndex = 0
  // Groups: 1=key-string 2=colon  3=string-value  4=bool  5=null  6=number
  const re = /("(?:[^"\\]|\\.)*")(\s*:)|("(?:[^"\\]|\\.)*")|\b(true|false)\b|\b(null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g
  let m

  while ((m = re.exec(formatted)) !== null) {
    if (m.index > lastIndex) parts.push(e(formatted.slice(lastIndex, m.index)))
    const [, key, colon, str, bool, nil, num] = m
    if (key !== undefined)       parts.push(`<span style="color:#9cdcfe">${e(key)}</span>${colon}`)
    else if (str !== undefined)  parts.push(`<span style="color:#ce9178">${e(str)}</span>`)
    else if (bool !== undefined) parts.push(`<span style="color:#569cd6">${bool}</span>`)
    else if (nil !== undefined)  parts.push(`<span style="color:#569cd6">${nil}</span>`)
    else if (num !== undefined)  parts.push(`<span style="color:#b5cea8">${num}</span>`)
    lastIndex = re.lastIndex
  }
  if (lastIndex < formatted.length) parts.push(e(formatted.slice(lastIndex)))

  return (
    <pre
      className="text-sm font-mono whitespace-pre-wrap break-words leading-relaxed"
      style={{ color: '#d4d4d4' }}
      dangerouslySetInnerHTML={{ __html: parts.join('') }}
    />
  )
}


function CreateFolderModal({ open, onClose, onConfirm }) {
  const [name, setName] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setName('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  if (!open) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (name.trim()) {
      onConfirm(name.trim())
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-border-dark shadow-2xl shadow-black/20 w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-border-dark">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg text-primary">create_new_folder</span>
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">New Folder</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-border-dark transition-colors">
            <span className="material-symbols-outlined text-[20px] text-slate-400 leading-none">close</span>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Folder name</label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Untitled Folder"
            className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-border-dark rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ConfirmTrashModal({ file, onClose, onConfirm }) {
  if (!file) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-border-dark shadow-2xl shadow-black/20 w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-xl text-red-500">delete</span>
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Move to Trash?</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">{file.name}</span> will be moved to the trash. You can restore it within 30 days.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-border-dark rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
          >
            Move to Trash
          </button>
        </div>
      </div>
    </div>
  )
}

function RenameModal({ file, onClose, onConfirm }) {
  const [name, setName] = useState('')
  const inputRef = useRef(null)
  const isFolder = file?.is_folder
  const { ext } = file && !isFolder ? splitNameExt(file.name) : { ext: '' }

  useEffect(() => {
    if (file) {
      const initial = isFolder ? file.name : splitNameExt(file.name).base
      setName(initial)
      setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 50)
    }
  }, [file, isFolder])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!file) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const fullName = isFolder ? trimmed : trimmed + ext
    if (fullName !== file.name) onConfirm(fullName)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-border-dark shadow-2xl shadow-black/20 w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-border-dark">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg text-primary">edit</span>
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Rename</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-border-dark transition-colors">
            <span className="material-symbols-outlined text-[20px] text-slate-400 leading-none">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nom</label>
          <div className="relative flex items-center bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-xl focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-transparent rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />
            {ext && (
              <span className="pr-4 text-sm text-slate-400 dark:text-slate-500 font-mono select-none">{ext}</span>
            )}
          </div>
          {ext && (
            <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">L'extension {ext} est conservée automatiquement.</p>
          )}
          <div className="flex items-center justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-border-dark rounded-xl transition-colors">
              Annuler
            </button>
            <button
              type="submit"
              disabled={!name.trim() || (isFolder ? name.trim() === file.name : name.trim() === splitNameExt(file.name).base)}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Renommer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LockFolderModal({ target, onClose, onConfirm, error }) {
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (target) { setPassword(''); setShowPwd(false); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [target])

  if (!target) return null
  const { folder, mode } = target
  const isLocking = mode === 'lock'

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!password.trim() || (isLocking && password.length < 6)) return
    onConfirm(password)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-border-dark shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-border-dark">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isLocking ? 'bg-amber-500/10' : 'bg-blue-500/10'}`}>
              <span className={`material-symbols-outlined text-lg ${isLocking ? 'text-amber-500' : 'text-blue-400'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                {isLocking ? 'lock' : 'lock_open'}
              </span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {isLocking ? 'Lock folder' : mode === 'open' ? 'Protected folder' : 'Unlock folder'}
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-[220px]">{folder.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-border-dark transition-colors">
            <span className="material-symbols-outlined text-[20px] text-slate-400 leading-none">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            {isLocking ? 'Set a password' : 'Enter password'}
          </label>
          {isLocking && (
            <p className="text-xs text-slate-500 mb-3">This folder will require a password to open.</p>
          )}
          <div className="relative">
            <input
              ref={inputRef}
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isLocking ? 'Minimum 6 characters' : '••••••••'}
              className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 pr-11 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
            <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <span className="material-symbols-outlined text-[20px]">{showPwd ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
          {error && (
            <p className="mt-2.5 text-sm text-red-500 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">error</span>{error}
            </p>
          )}
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-border-dark rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!password.trim() || (isLocking && password.length < 4)}
              className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isLocking ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary hover:bg-blue-600'}`}
            >
              {isLocking ? 'Lock' : mode === 'open' ? 'Open' : 'Unlock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


function DriveContentSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="w-16 h-3 bg-slate-200 dark:bg-border-dark rounded mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center p-3 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-lg">
              <div className="w-7 h-7 bg-slate-200 dark:bg-border-dark rounded mr-3 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="w-28 h-3.5 bg-slate-200 dark:bg-border-dark rounded" />
                <div className="w-14 h-2.5 bg-slate-100 dark:bg-border-dark/60 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="w-12 h-3 bg-slate-200 dark:bg-border-dark rounded mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-lg p-2">
              <div className="aspect-[4/3] bg-slate-100 dark:bg-border-dark/50 rounded-md mb-2" />
              <div className="space-y-1.5">
                <div className="w-3/4 h-3 bg-slate-200 dark:bg-border-dark rounded" />
                <div className="w-1/2 h-2.5 bg-slate-100 dark:bg-border-dark/60 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DropZoneOverlay({ isDragging, dragFileCount }) {
  if (!isDragging) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-[#101922]/80 backdrop-blur-sm" />
      <div className="relative z-10">
        <div className="relative">
          <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-primary via-blue-400 to-cyan-400 opacity-80 animate-pulse" />
          <div className="relative bg-[#1A2633] rounded-2xl p-12 min-w-[420px] border border-primary/20">
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <div className="absolute top-6 left-8 w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0s', animationDuration: '2s' }} />
              <div className="absolute top-12 right-12 w-1.5 h-1.5 rounded-full bg-cyan-400/40 animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '2.2s' }} />
              <div className="absolute bottom-10 left-16 w-1 h-1 rounded-full bg-blue-300/40 animate-bounce" style={{ animationDelay: '0.6s', animationDuration: '1.8s' }} />
              <div className="absolute bottom-16 right-8 w-2 h-2 rounded-full bg-primary/30 animate-bounce" style={{ animationDelay: '0.9s', animationDuration: '2.4s' }} />
            </div>
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="relative mb-5">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-150" />
                <div className="relative w-20 h-20 rounded-full bg-primary/10 border-2 border-dashed border-primary/50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-primary animate-bounce" style={{ animationDuration: '1.5s' }}>cloud_upload</span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-1.5">Drop to upload</h3>
              <p className="text-sm text-slate-400 mb-3">
                Files will be added to <span className="text-primary font-medium">My Drive</span>
              </p>
              {dragFileCount > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                  <span className="material-symbols-outlined text-sm text-primary">draft</span>
                  <span className="text-xs font-medium text-primary">
                    {dragFileCount} {dragFileCount === 1 ? 'file' : 'files'} selected
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FolderCard({ folder, onOpen, onAction, onHover, onItemDragStart, onItemDragEnd, isGhost, draggedItem, onDropOnFolder }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const canDrop = draggedItem && draggedItem.id !== folder.id

  return (
    <div
      draggable="true"
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-cloudspace-item', folder.id)
        e.dataTransfer.effectAllowed = 'move'
        setTimeout(() => onItemDragStart({ ...folder, is_folder: true }), 0)
      }}
      onDragEnd={() => { onItemDragEnd(); setIsDragOver(false) }}
      onDragOver={(e) => { if (canDrop) { e.preventDefault(); e.stopPropagation() } }}
      onDragEnter={(e) => { if (!canDrop) return; e.preventDefault(); e.stopPropagation(); setIsDragOver(true) }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false) }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); if (canDrop) onDropOnFolder(folder.id) }}
      onClick={() => onOpen(folder)}
      onMouseEnter={() => onHover({ ...folder, is_folder: true })}
      onMouseLeave={() => onHover(null)}
      className={`flex items-center py-3 px-3 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-lg hover:bg-slate-50 dark:hover:bg-[#1f2d3d] cursor-grab transition-all shadow-sm group
        ${isGhost ? 'opacity-40' : ''}
        ${isDragOver ? 'ring-2 ring-primary bg-primary/5 dark:bg-primary/10 scale-[1.02]' : ''}
      `}
    >
      <div className="relative flex items-center justify-center mr-2 flex-shrink-0">
        <span className={`material-symbols-outlined text-2xl ${folder.icon_color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{folder.icon}</span>
        {folder.is_locked && (
          <span className="absolute -bottom-0.5 -right-1 material-symbols-outlined text-[10px] text-slate-400 dark:text-slate-500" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{folder.name}</p>
      </div>
      {folder.is_starred && (
        <span className="material-symbols-outlined text-[14px] text-amber-400 mr-1 flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
      )}
      <FileContextMenu isFolder isLocked={folder.is_locked} isStarred={folder.is_starred} onAction={(id) => onAction(id, folder)} />
    </div>
  )
}

function FileCard({ file, onPreview, onAction, showExt, onHover, onItemDragStart, onItemDragEnd, isGhost }) {
  const token = getMediaToken()
  const isImage = file.has_content && file.mime_type?.startsWith('image/')
  const isVideo = file.has_content && file.mime_type?.startsWith('video/')
  const [imgLoaded, setImgLoaded] = useState(false)
  const displayName = formatDisplayName(file.name, showExt)
  return (
    <div
      draggable="true"
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-cloudspace-item', file.id)
        e.dataTransfer.effectAllowed = 'move'
        setTimeout(() => onItemDragStart({ ...file, is_folder: false }), 0)
      }}
      onDragEnd={onItemDragEnd}
      onClick={() => onPreview(file)}
      onMouseEnter={() => onHover({ ...file, is_folder: false })}
      onMouseLeave={() => onHover(null)}
      className={`group relative bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-lg p-2 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-md transition-all cursor-grab ${isGhost ? 'opacity-40' : ''}`}
    >
      <div className={`aspect-[4/3] ${file.icon_bg} rounded-md mb-2 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-border-dark relative`}>
        {isVideo ? (
          <>
            <VideoThumbnail
              src={`/api/files/${file.id}/download?inline=true&token=${token}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/15 transition-colors">
              <div className="w-8 h-8 rounded-full bg-black/55 flex items-center justify-center backdrop-blur-sm">
                <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
              </div>
            </div>
          </>
        ) : (
          <span className={`material-symbols-outlined text-2xl ${file.icon_color} opacity-80 group-hover:scale-110 transition-transform duration-300`}>{file.icon}</span>
        )}
        {isImage && (
          <img
            src={`/api/files/${file.id}/download?inline=true&token=${token}`}
            alt={file.name}
            onLoad={() => setImgLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
        {file.is_starred && (
          <div className="absolute top-1.5 right-1.5 z-10">
            <span className="material-symbols-outlined text-[14px] text-amber-400 drop-shadow" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
          </div>
        )}
      </div>
      <div className="flex items-center">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate" title={file.name}>{displayName}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{file.formatted_size} &bull; {file.formatted_date}</p>
        </div>
        <FileContextMenu isStarred={file.is_starred} onAction={(id) => onAction(id, file)} />
      </div>
    </div>
  )
}

function DriveToolbar({ breadcrumbs, view, onViewChange, onNewFolder, fileInputRef, onFileSelect, draggedItem, onDropOnFolder }) {
  const [dragOverCrumbId, setDragOverCrumbId] = useState(null)

  return (
    <div className={`flex items-center mb-6 ${breadcrumbs.length > 1 ? 'justify-between' : 'gap-2'}`}>
      {breadcrumbs.length > 1 && (
        <nav aria-label="Breadcrumb" className="flex">
          <ol className="inline-flex items-center space-x-0.5">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1
              const crumbKey = crumb.id ?? '__root__'
              const isDragOver = !isLast && dragOverCrumbId === crumbKey
              const isAppDrag = (e) => [...e.dataTransfer.types].includes('application/x-cloudspace-item')
              const dragHandlers = !isLast ? {
                onDragOver: (e) => { if (!isAppDrag(e)) return; e.preventDefault(); e.stopPropagation() },
                onDragEnter: (e) => { if (!isAppDrag(e)) return; e.preventDefault(); e.stopPropagation(); setDragOverCrumbId(crumbKey) },
                onDragLeave: (e) => { if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget)) setDragOverCrumbId(null) },
                onDrop: (e) => { e.preventDefault(); e.stopPropagation(); setDragOverCrumbId(null); onDropOnFolder(crumb.id) },
              } : {}

              if (crumb.id === null) {
                return (
                  <li key="root" className="inline-flex items-center" {...dragHandlers}>
                    <Link to="/drive" className={`inline-flex items-center text-sm font-medium transition-colors px-1.5 py-0.5 rounded-md ${isDragOver ? 'text-primary bg-primary/10 ring-2 ring-primary/40' : 'text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-white'}`}>
                      Mon Drive
                    </Link>
                  </li>
                )
              }
              return (
                <li key={crumb.id} className="inline-flex items-center" {...dragHandlers}>
                  <span className="material-symbols-outlined text-slate-400 text-[16px] mx-0.5">chevron_right</span>
                  {isLast ? (
                    <span className="text-base font-semibold text-slate-900 dark:text-white">{crumb.name}</span>
                  ) : (
                    <Link to={`/drive/folder/${crumb.id}`} className={`text-sm font-medium transition-colors px-1.5 py-0.5 rounded-md ${isDragOver ? 'text-primary bg-primary/10 ring-2 ring-primary/40' : 'text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-white'}`}>{crumb.name}</Link>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
      )}

      <div className="flex items-center gap-2">
        <button onClick={onNewFolder} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-border-dark rounded-lg hover:bg-slate-50 dark:hover:bg-border-dark hover:text-primary transition-colors">
          <span className="material-symbols-outlined">create_new_folder</span>
          Nouveau dossier
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-border-dark rounded-lg hover:bg-slate-50 dark:hover:bg-border-dark hover:text-primary transition-colors">
          <span className="material-symbols-outlined">upload</span>
          Importer
        </button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onFileSelect} />

        <div className="flex items-center rounded-lg border border-slate-200 dark:border-border-dark overflow-hidden">
          {['grid', 'list'].map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${view === v ? 'text-primary bg-primary/5 dark:bg-primary/10' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <span className="material-symbols-outlined">{v === 'grid' ? 'grid_view' : 'view_list'}</span>
              {v === 'grid' ? 'Grid' : 'List'}
            </button>
          ))}
        </div>

        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-border-dark rounded-lg hover:bg-slate-50 dark:hover:bg-border-dark transition-colors">
          <span className="material-symbols-outlined">filter_list</span>
          Filter
        </button>
      </div>
    </div>
  )
}

function DriveListSection({ folders, files, onFolderOpen, onFilePreview, onHover, onFileAction, onFolderAction, showExt, onItemDragStart, onItemDragEnd, draggedItem, onDropOnFolder }) {
  const [dragOverId, setDragOverId] = useState(null)
  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark overflow-hidden shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-50 dark:bg-[#151e26] border-b border-slate-200 dark:border-border-dark">
          <tr>
            <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[40%]">Name</th>
            <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[20%] hidden md:table-cell">Last Modified</th>
            <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[15%] hidden sm:table-cell">Size</th>
            <th className="px-5 py-3 w-[5%]"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-border-dark">
          {folders.map((folder) => (
            <tr
              key={folder.id}
              draggable="true"
              onDragStart={(e) => {
                e.dataTransfer.setData('application/x-cloudspace-item', folder.id)
                e.dataTransfer.effectAllowed = 'move'
                setTimeout(() => onItemDragStart({ ...folder, is_folder: true }), 0)
              }}
              onDragEnd={() => { onItemDragEnd(); setDragOverId(null) }}
              onDragOver={(e) => { if (draggedItem && draggedItem.id !== folder.id) { e.preventDefault(); e.stopPropagation() } }}
              onDragEnter={(e) => { if (!draggedItem || draggedItem.id === folder.id) return; e.preventDefault(); e.stopPropagation(); setDragOverId(folder.id) }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverId(null) }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverId(null); if (draggedItem && draggedItem.id !== folder.id) onDropOnFolder(folder.id) }}
              onClick={() => onFolderOpen(folder)}
              onMouseEnter={() => onHover({ ...folder, is_folder: true })}
              onMouseLeave={() => onHover(null)}
              className={`group hover:bg-slate-50 dark:hover:bg-[#1f2d3d] transition-colors cursor-grab
                ${dragOverId === folder.id ? 'ring-2 ring-inset ring-primary bg-primary/5 dark:bg-primary/10' : ''}
                ${draggedItem?.id === folder.id ? 'opacity-40' : ''}
              `}
            >
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <span className={`material-symbols-outlined text-2xl ${folder.icon_color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{folder.icon}</span>
                    {folder.is_locked && (
                      <span className="absolute -bottom-0.5 -right-1 material-symbols-outlined text-[10px] text-slate-400 dark:text-slate-500" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{folder.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{folder.items_count} items</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3 hidden md:table-cell"><span className="text-sm text-slate-500 dark:text-slate-400">-</span></td>
              <td className="px-5 py-3 hidden sm:table-cell"><span className="text-sm text-slate-500 dark:text-slate-400">-</span></td>
              <td className="px-5 py-3 text-right">
                <FileContextMenu isFolder isLocked={folder.is_locked} onAction={(id) => onFolderAction(id, folder)} />
              </td>
            </tr>
          ))}
          {files.map((file) => (
            <tr
              key={file.id}
              draggable="true"
              onDragStart={(e) => {
                e.dataTransfer.setData('application/x-cloudspace-item', file.id)
                e.dataTransfer.effectAllowed = 'move'
                setTimeout(() => onItemDragStart({ ...file, is_folder: false }), 0)
              }}
              onDragEnd={onItemDragEnd}
              onClick={() => onFilePreview(file)}
              onMouseEnter={() => onHover({ ...file, is_folder: false })}
              onMouseLeave={() => onHover(null)}
              className={`group hover:bg-slate-50 dark:hover:bg-[#1f2d3d] transition-colors cursor-grab ${draggedItem?.id === file.id ? 'opacity-40' : ''}`}
            >
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${file.icon_bg} flex items-center justify-center flex-shrink-0`}>
                    <span className={`material-symbols-outlined text-lg ${file.icon_color}`}>{file.icon}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate" title={file.name}>{formatDisplayName(file.name, showExt)}</p>
                </div>
              </td>
              <td className="px-5 py-3 hidden md:table-cell"><span className="text-sm text-slate-500 dark:text-slate-400">{file.formatted_date}</span></td>
              <td className="px-5 py-3 hidden sm:table-cell"><span className="text-sm text-slate-500 dark:text-slate-400">{file.formatted_size}</span></td>
              <td className="px-5 py-3 text-right">
                <FileContextMenu onAction={(id) => onFileAction(id, file)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function MyDrive() {
  const navigate = useNavigate()
  const { folderId } = useParams()
  const location = useLocation()
  const [view, setView] = useState(() => localStorage.getItem('cloudspace-view-mode') || 'grid')
  const [isDragging, setIsDragging] = useState(false)
  const [dragFileCount, setDragFileCount] = useState(0)
  const [draggedItem, setDraggedItem] = useState(null)
  const [folders, setFolders] = useState([])
  const [files, setFiles] = useState([])
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'My Drive' }])
  const [ready, setReady] = useState(false)
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const [trashTarget, setTrashTarget] = useState(null)
  const [renameTarget, setRenameTarget] = useState(null)
  const [lockTarget, setLockTarget] = useState(null)   // { folder, mode: 'lock'|'unlock'|'open' }
  const [lockError, setLockError] = useState(null)
  const [unlockedFolders] = useState(() => new Set())
  const [detailsItemId, setDetailsItemId] = useState(null)
  const [moveTarget, setMoveTarget] = useState(null)
  const [shareTarget, setShareTarget] = useState(null)
  const dragCounterRef = useRef(0)
  const dropZoneRef = useRef(null)
  const fileInputRef = useRef(null)
  const hoveredItemRef = useRef(null)
  const setHoveredItem = useCallback((item) => { hoveredItemRef.current = item }, [])
  const { uploadFiles, queue, setCurrentFolderId } = useUpload()
  const [showExt] = useLocalPref('cloudspace_show_extensions', true)

  // Synchronise le dossier actif côté UploadContext (sidebar/galerie pourront uploader ici)
  useEffect(() => {
    setCurrentFolderId(folderId || null)
    return () => setCurrentFolderId(null)
  }, [folderId, setCurrentFolderId])

  const fetchContents = useCallback(async () => {
    try {
      const url = folderId ? `/api/drive/contents?parent_id=${folderId}` : '/api/drive/contents'
      const res = await apiFetch(url)
      const data = await res.json()
      setFolders(data.folders || [])
      setFiles(data.files || [])
      setBreadcrumbs(data.breadcrumbs || [{ id: null, name: 'My Drive' }])
    } catch (err) {
      console.error('Failed to fetch drive contents:', err)
    } finally {
      setReady(true)
    }
  }, [folderId])

  // Show skeleton only if loading takes more than 150ms (avoids flash)
  useEffect(() => {
    if (ready) return
    const timer = setTimeout(() => setShowSkeleton(true), 150)
    return () => clearTimeout(timer)
  }, [ready])

  useEffect(() => {
    setReady(false)
    setShowSkeleton(false)
    fetchContents()
  }, [fetchContents])

  useEffect(() => {
    if (!ready) return
    const openFileId = location.state?.openFileId
    if (!openFileId) return
    const file = files.find(f => f.id === openFileId)
    if (file) {
      setPreviewFile(file)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh drive when uploads complete
  const prevDoneCount = useRef(0)
  useEffect(() => {
    const doneCount = queue.filter(f => f.status === 'done').length
    if (doneCount > prevDoneCount.current && doneCount > 0) {
      fetchContents()
    }
    prevDoneCount.current = doneCount
  }, [queue, fetchContents])

  const handleDragEnter = useCallback((e) => {
    e.stopPropagation()
    const isOSDrag = [...e.dataTransfer.types].some(t => t.toLowerCase() === 'files')
    if (!isOSDrag) return
    dragCounterRef.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
      setDragFileCount(e.dataTransfer.items.length)
    }
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const isOSDrag = [...e.dataTransfer.types].some(t => t.toLowerCase() === 'files')
    if (!isOSDrag) return
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
      setDragFileCount(0)
    }
  }, [])

  const handleItemDragStart = useCallback((item) => {
    setDraggedItem(item)
  }, [])

  const handleItemDragEnd = useCallback(() => {
    setDraggedItem(null)
  }, [])

  const handleDropOnFolder = useCallback(async (targetFolderId) => {
    if (!draggedItem) return
    if (draggedItem.id === targetFolderId) return
    const prev = draggedItem
    setDraggedItem(null)
    try {
      const res = await apiFetch(`/api/files/${prev.id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination_id: targetFolderId }),
      })
      if (res.ok) fetchContents()
    } catch {}
  }, [draggedItem, fetchContents])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setDragFileCount(0)
    dragCounterRef.current = 0

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length === 0) { setDraggedItem(null); return }
    uploadFiles(droppedFiles)
  }, [uploadFiles])

  const handleCreateFolder = async (name) => {
    setShowCreateFolder(false)
    try {
      const res = await apiFetch('/api/drive/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parent_id: folderId || null }),
      })
      if (res.ok) {
        fetchContents()
      }
    } catch {
      // silently fail
    }
  }

  const handleFolderClick = useCallback((folder) => {
    if (folder.is_locked && !unlockedFolders.has(folder.id)) {
      setLockError(null)
      setLockTarget({ folder, mode: 'open' })
    } else {
      navigate(`/drive/folder/${folder.id}`)
    }
  }, [navigate, unlockedFolders])

  const handleFileInputChange = useCallback((e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) uploadFiles(files)
    e.target.value = ''
  }, [uploadFiles])

  const toggleStar = useCallback(async (item) => {
    try {
      const res = await apiFetch(`/api/files/${item.id}/star`, { method: 'PUT' })
      if (res.ok) fetchContents()
    } catch { /* silently fail */ }
  }, [fetchContents])

  const confirmRename = useCallback(async (newName) => {
    if (!renameTarget) return
    try {
      const res = await apiFetch(`/api/files/${renameTarget.id}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      if (res.ok) fetchContents()
    } catch { /* silently fail */ }
    setRenameTarget(null)
  }, [renameTarget, fetchContents])

  const handleFileAction = useCallback((actionId, file) => {
    switch (actionId) {
      case 'preview': setPreviewFile(file); break
      case 'rename': setRenameTarget(file); break
      case 'star': toggleStar(file); break
      case 'details': setDetailsItemId(file.id); break
      case 'move': setMoveTarget(file); break
      case 'share': setShareTarget(file); break
      case 'trash': setTrashTarget(file); break
      case 'download':
        downloadFile(file.id, file.name).catch(() => {})
        break
    }
  }, [toggleStar])

  const handleFolderAction = useCallback((actionId, folder) => {
    switch (actionId) {
      case 'open':
        if (folder.is_locked && !unlockedFolders.has(folder.id)) {
          setLockError(null); setLockTarget({ folder, mode: 'open' })
        } else { navigate(`/drive/folder/${folder.id}`) }
        break
      case 'rename': setRenameTarget(folder); break
      case 'star': toggleStar(folder); break
      case 'lock':
        setLockError(null)
        setLockTarget({ folder, mode: folder.is_locked ? 'unlock' : 'lock' })
        break
      case 'details': setDetailsItemId(folder.id); break
      case 'move': setMoveTarget(folder); break
      case 'share': setShareTarget(folder); break
      case 'download':
        downloadFile(folder.id, folder.name + '.zip', true).catch(() => {})
        break
      case 'trash': setTrashTarget(folder); break
    }
  }, [navigate, toggleStar, unlockedFolders])

  const handleLockConfirm = useCallback(async (password) => {
    if (!lockTarget) return
    const { folder, mode } = lockTarget
    try {
      if (mode === 'open') {
        const res = await apiFetch(`/api/files/${folder.id}/verify-lock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        })
        if (res.ok) {
          unlockedFolders.add(folder.id)
          setLockTarget(null); setLockError(null)
          navigate(`/drive/folder/${folder.id}`)
        } else {
          const d = await res.json()
          setLockError(d.error || 'Incorrect password')
        }
      } else {
        const res = await apiFetch(`/api/files/${folder.id}/lock`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        })
        if (res.ok) {
          if (mode === 'unlock') unlockedFolders.delete(folder.id)
          setLockTarget(null); setLockError(null)
          fetchContents()
        } else {
          const d = await res.json()
          setLockError(d.error || 'Incorrect password')
        }
      }
    } catch { setLockError('An error occurred') }
  }, [lockTarget, navigate, fetchContents, unlockedFolders])

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const item = hoveredItemRef.current
      if (!item) return
      if (e.key === ' ') {
        e.preventDefault()
        if (!item.is_folder) setPreviewFile(item)
      } else if (e.key === 'Delete') {
        e.preventDefault()
        setTrashTarget(item)
      } else if (e.key === 'F2') {
        e.preventDefault()
        setRenameTarget(item)
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        toggleStar(item)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [toggleStar])

  const confirmTrash = useCallback(async () => {
    if (!trashTarget) return
    try {
      const res = await apiFetch(`/api/files/${trashTarget.id}`, { method: 'DELETE' })
      if (res.ok) fetchContents()
    } catch { /* silently fail */ }
    setTrashTarget(null)
  }, [trashTarget, fetchContents])

  return (
    <div
      ref={dropZoneRef}
      className="flex-1 overflow-y-auto p-6 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {draggedItem && <style>{'* { cursor: grabbing !important; }'}</style>}
      {/* Drop Zone Overlay */}
      <DropZoneOverlay isDragging={isDragging} dragFileCount={dragFileCount} />

      {/* Toolbar — toujours visible : le fil d'Ariane ne clignote plus à la navigation */}
      <DriveToolbar
        breadcrumbs={breadcrumbs}
        view={view}
        onViewChange={(v) => { setView(v); localStorage.setItem('cloudspace-view-mode', v) }}
        onNewFolder={() => setShowCreateFolder(true)}
        fileInputRef={fileInputRef}
        onFileSelect={handleFileInputChange}
        draggedItem={draggedItem}
        onDropOnFolder={handleDropOnFolder}
      />

      {!ready ? (showSkeleton ? <DriveContentSkeleton /> : null) : (<>

      {/* Empty state — drive vide */}
      {folders.length === 0 && files.length === 0 && (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">cloud_upload</span>
          <p className="text-base font-semibold text-slate-600 dark:text-slate-300 mb-1">Ce dossier est vide</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-6">
            Déposez des fichiers ici ou utilisez les boutons ci-dessus pour commencer.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              Uploader des fichiers
            </button>
            <button
              onClick={() => setShowCreateFolder(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-border-dark transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">create_new_folder</span>
              Nouveau dossier
            </button>
          </div>
        </div>
      )}

      {/* Folders - only in grid view, only if there are folders */}
      {view === 'grid' && folders.length > 0 && (
        <section className="mb-8">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Dossiers</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
            {folders.map((folder) => (
              <FolderCard
                  key={folder.id}
                  folder={folder}
                  onOpen={handleFolderClick}
                  onAction={handleFolderAction}
                  onHover={setHoveredItem}
                  onItemDragStart={handleItemDragStart}
                  onItemDragEnd={handleItemDragEnd}
                  isGhost={draggedItem?.id === folder.id}
                  draggedItem={draggedItem}
                  onDropOnFolder={handleDropOnFolder}
                />
            ))}
          </div>
        </section>
      )}

      {/* Files */}
      {(folders.length > 0 || files.length > 0) && (
        <section>
          {(view === 'grid' ? files.length > 0 : true) && (
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">
              {view === 'grid' ? 'Fichiers' : 'Tous les éléments'}
            </h3>
          )}

          {view === 'grid' ? (
            files.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
                {files.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    onPreview={setPreviewFile}
                    onAction={handleFileAction}
                    showExt={showExt}
                    onHover={setHoveredItem}
                    onItemDragStart={handleItemDragStart}
                    onItemDragEnd={handleItemDragEnd}
                    isGhost={draggedItem?.id === file.id}
                  />
                ))}
              </div>
            ) : folders.length > 0 ? null : null
          ) : (
            <DriveListSection
              folders={folders}
              files={files}
              onFolderOpen={handleFolderClick}
              onFilePreview={setPreviewFile}
              onFileAction={handleFileAction}
              onFolderAction={handleFolderAction}
              onHover={setHoveredItem}
              showExt={showExt}
              onItemDragStart={handleItemDragStart}
              onItemDragEnd={handleItemDragEnd}
              draggedItem={draggedItem}
              onDropOnFolder={handleDropOnFolder}
            />
          )}
        </section>
      )}

      </>)}

      {/* Create Folder Modal */}
      <CreateFolderModal
        open={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onConfirm={handleCreateFolder}
      />

      {/* File Preview Modal */}
      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />

      {/* Confirm Trash Modal */}
      <ConfirmTrashModal
        file={trashTarget}
        onClose={() => setTrashTarget(null)}
        onConfirm={confirmTrash}
      />

      {/* Rename Modal */}
      <RenameModal
        file={renameTarget}
        onClose={() => setRenameTarget(null)}
        onConfirm={confirmRename}
      />

      {/* Lock / Unlock / Open Modal */}
      <LockFolderModal
        target={lockTarget}
        error={lockError}
        onClose={() => { setLockTarget(null); setLockError(null) }}
        onConfirm={handleLockConfirm}
      />

      {/* Item Details Modal */}
      <ItemDetailsModal
        itemId={detailsItemId}
        onClose={() => setDetailsItemId(null)}
      />

      {/* Move Modal */}
      <MoveItemModal
        item={moveTarget}
        initialFolderId={folderId || null}
        onClose={() => setMoveTarget(null)}
        onMoved={() => { setMoveTarget(null); fetchContents() }}
      />

      {/* Share Modal */}
      <ShareModal
        item={shareTarget}
        onClose={() => setShareTarget(null)}
      />
    </div>
  )
}
