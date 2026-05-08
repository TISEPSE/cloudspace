import { useState, useRef, useEffect } from 'react'
import { apiFetch, getAccessToken } from '../lib/api'
import { getMediaToken } from '../lib/mediaToken'
import { useLocalPref } from '../hooks/useLocalPref'
import { formatDisplayName } from '../utils/filename'

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

export default function FilePreviewModal({ file, onClose }) {
  const [textContent, setTextContent] = useState(null)
  const [textLoading, setTextLoading] = useState(false)
  const [showExt] = useLocalPref('cloudspace_show_extensions', true)

  useEffect(() => {
    if (!file) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [file, onClose])

  useEffect(() => {
    if (!file) { setTextContent(null); return }
    const mime = file.mime_type || ''
    const isText = file.has_content && (mime === 'text/plain' || mime === 'text/csv' || mime === 'text/markdown' || mime === 'application/json')
    if (!isText) { setTextContent(null); return }

    setTextLoading(true)
    apiFetch(`/api/files/${file.id}/download?inline=true`)
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(t => setTextContent(t))
      .catch(() => setTextContent(null))
      .finally(() => setTextLoading(false))
  }, [file])

  if (!file) return null

  const displayName = formatDisplayName(file.name, showExt)
  const downloadUrl = `/api/files/${file.id}/download?token=${getAccessToken()}`
  const inlineUrl = `/api/files/${file.id}/download?inline=true&token=${getMediaToken()}`
  const mime = file.mime_type || ''
  const canServe = file.has_content

  const isImage = canServe && mime.startsWith('image/')
  const isPdf = canServe && mime === 'application/pdf'
  const isVideo = canServe && mime.startsWith('video/')
  const isAudio = canServe && mime.startsWith('audio/')
  const isJson = canServe && mime === 'application/json'
  const isText = canServe && (mime === 'text/plain' || mime === 'text/csv' || mime === 'text/markdown' || isJson)
  const canPreview = isImage || isPdf || isVideo || isAudio || isText

  return (
    <div className="fixed inset-0 z-50 flex flex-col" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 h-14 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-lg ${file.icon_bg} flex items-center justify-center flex-shrink-0`}>
            <span className={`material-symbols-outlined text-lg ${file.icon_color}`}>{file.icon}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{displayName}</p>
            <p className="text-xs text-slate-400">{file.formatted_size}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {canServe && (
            <a
              href={downloadUrl}
              download
              className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Download"
            >
              <span className="material-symbols-outlined text-[20px]">download</span>
            </a>
          )}
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] leading-none">close</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-[1] flex-1 flex items-center justify-center px-5 pb-5 min-h-0">
        {isImage && (
          <img src={inlineUrl} alt={file.name} onClick={(e) => e.stopPropagation()} className="max-w-full max-h-full rounded-lg object-contain" />
        )}
        {isPdf && (
          <iframe src={inlineUrl} title={file.name} sandbox="allow-scripts allow-forms" onClick={(e) => e.stopPropagation()} className="w-[80vw] h-full rounded-lg bg-white" />
        )}
        {isVideo && (
          <video src={inlineUrl} controls onClick={(e) => e.stopPropagation()} className="max-w-full max-h-full rounded-lg" />
        )}
        {isAudio && (
          <div onClick={(e) => e.stopPropagation()} className="bg-[#1A2633] rounded-2xl p-10 flex flex-col items-center gap-5">
            <div className={`w-20 h-20 rounded-2xl ${file.icon_bg} flex items-center justify-center`}>
              <span className={`material-symbols-outlined text-4xl ${file.icon_color}`}>{file.icon}</span>
            </div>
            <p className="text-white font-medium">{displayName}</p>
            <audio src={inlineUrl} controls autoPlay className="w-80" />
          </div>
        )}
        {isText && (
          <div onClick={(e) => e.stopPropagation()} className="w-[80vw] h-[85vh] bg-[#1A2633] rounded-xl border border-[#283039] overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#283039] flex-shrink-0">
              <span className={`material-symbols-outlined text-sm ${isJson ? 'text-yellow-400' : 'text-blue-400'}`}>
                {isJson ? 'data_object' : 'article'}
              </span>
              <span className="text-xs text-slate-400 font-mono">{displayName}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {textLoading ? (
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading...
                </div>
              ) : isJson ? (
                <JsonHighlight text={textContent} />
              ) : (
                <pre className="text-sm text-slate-200 font-mono whitespace-pre-wrap break-words leading-relaxed">{textContent}</pre>
              )}
            </div>
          </div>
        )}
        {!canPreview && (
          <div className="bg-[#1A2633] rounded-2xl p-10 flex flex-col items-center gap-5 border border-slate-700">
            <div className={`w-20 h-20 rounded-2xl ${file.icon_bg} flex items-center justify-center`}>
              <span className={`material-symbols-outlined text-4xl ${file.icon_color}`}>{file.icon}</span>
            </div>
            <div className="text-center">
              <p className="text-white font-medium mb-1">{displayName}</p>
              <p className="text-sm text-slate-400">{file.formatted_size}</p>
            </div>
            {canServe ? (
              <a
                href={downloadUrl}
                download
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-blue-600 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                Télécharger
              </a>
            ) : (
              <p className="text-xs text-slate-500">Aperçu non disponible</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
