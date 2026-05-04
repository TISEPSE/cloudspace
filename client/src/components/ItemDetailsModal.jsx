import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'

function getMimeTypeLabel(mime) {
  if (!mime) return '—'
  const map = {
    'image/jpeg': 'JPEG Image', 'image/png': 'PNG Image', 'image/gif': 'GIF Image',
    'image/webp': 'WebP Image', 'image/bmp': 'BMP Image', 'image/svg+xml': 'SVG Image',
    'video/mp4': 'MP4 Video', 'video/quicktime': 'QuickTime Video', 'video/x-msvideo': 'AVI Video',
    'video/x-matroska': 'MKV Video', 'video/webm': 'WebM Video',
    'audio/mpeg': 'MP3 Audio', 'audio/wav': 'WAV Audio', 'audio/ogg': 'OGG Audio',
    'audio/flac': 'FLAC Audio', 'audio/aac': 'AAC Audio',
    'application/pdf': 'PDF Document', 'application/json': 'JSON File',
    'application/zip': 'ZIP Archive', 'application/x-rar-compressed': 'RAR Archive',
    'application/x-7z-compressed': '7-Zip Archive',
    'text/plain': 'Text File', 'text/csv': 'CSV Spreadsheet', 'text/markdown': 'Markdown Document',
    'application/msword': 'Word Document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
    'application/vnd.ms-excel': 'Excel Spreadsheet',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
    'application/vnd.ms-powerpoint': 'PowerPoint Presentation',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint Presentation',
  }
  if (map[mime]) return map[mime]
  const [type, sub] = mime.split('/')
  if (type === 'image') return `${sub.toUpperCase()} Image`
  if (type === 'video') return `${sub.toUpperCase()} Video`
  if (type === 'audio') return `${sub.toUpperCase()} Audio`
  if (type === 'text') return `${sub} Text`
  return mime
}

export default function ItemDetailsModal({ itemId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (!itemId) return
    setLoading(true); setData(null); setShowAdvanced(false)
    apiFetch(`/api/files/${itemId}`)
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [itemId])

  if (!itemId) return null

  const fmt = (iso) => iso
    ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-border-dark shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-border-dark flex-shrink-0">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">File information</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-border-dark transition-colors">
            <span className="material-symbols-outlined text-[20px] text-slate-400">close</span>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="px-6 pt-5 pb-4 animate-pulse">
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-border-dark mb-2">
                <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/5 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-3 w-1/4 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              </div>
              {[80, 60, 72, 55, 65, 50].map((w, i) => (
                <div key={i} className="flex items-start gap-4 py-2.5 border-b border-slate-100 dark:border-border-dark last:border-0">
                  <div className="w-24 h-3 bg-slate-200 dark:bg-slate-700 rounded flex-shrink-0" />
                  <div className={`h-3 bg-slate-200 dark:bg-slate-700 rounded`} style={{ width: `${w}%` }} />
                </div>
              ))}
            </div>
          ) : data ? (
            <>

              <div className="px-6 pt-5 pb-4 flex items-center gap-4 border-b border-slate-100 dark:border-border-dark">
                <div className={`w-12 h-12 rounded-xl ${data.icon_bg} flex items-center justify-center flex-shrink-0`}>
                  <span className={`material-symbols-outlined text-2xl ${data.icon_color}`} style={data.is_folder ? { fontVariationSettings: "'FILL' 1" } : {}}>{data.icon}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white truncate">{data.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{data.is_folder ? `${data.items_count} items` : data.formatted_size}</p>
                </div>
              </div>

              <div className="px-6 py-2">
                {[
                  { label: 'Name', value: data.name },
                  { label: 'Location', value: data.path },
                  { label: 'Owner', value: data.owner_email || '—' },
                  { label: 'Created', value: fmt(data.created_at) },
                  { label: 'Modified', value: fmt(data.updated_at) },
                  ...(!data.is_folder && data.mime_type ? [
                    { label: 'Type', value: getMimeTypeLabel(data.mime_type) },
                    { label: 'Media type', value: data.mime_type, mono: true },
                    { label: 'Size', value: data.formatted_size },
                  ] : []),
                  { label: 'Shared', value: 'No' },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex items-start py-2.5 gap-4 border-b border-slate-100 dark:border-border-dark last:border-0">
                    <span className="w-24 text-xs font-medium text-slate-500 dark:text-slate-400 flex-shrink-0 pt-px">{label}</span>
                    <span className={`flex-1 break-all ${mono ? 'text-xs font-mono text-slate-600 dark:text-slate-300' : 'text-sm text-slate-800 dark:text-slate-200'}`}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="px-6 pb-4">
                <button onClick={() => setShowAdvanced(v => !v)} className="flex items-center gap-1 text-sm font-semibold text-primary py-2 hover:opacity-80 transition-opacity">
                  <span className="material-symbols-outlined">{showAdvanced ? 'expand_less' : 'expand_more'}</span>
                  Advanced details
                </button>
                {showAdvanced && (
                  <div>
                    {[
                      !data.is_folder && { label: 'Size (bytes)', value: data.size?.toLocaleString() },
                      data.sha1 && { label: 'SHA1', value: data.sha1 },
                      { label: 'File ID', value: data.id },
                    ].filter(Boolean).map(({ label, value }) => (
                      <div key={label} className="flex items-start py-2.5 gap-4 border-b border-slate-100 dark:border-border-dark last:border-0">
                        <span className="w-24 text-xs font-medium text-slate-500 dark:text-slate-400 flex-shrink-0 pt-px">{label}</span>
                        <span className="flex-1 text-xs font-mono text-slate-600 dark:text-slate-300 break-all">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="py-16 text-center text-slate-400 text-sm">Failed to load file information.</p>
          )}
        </div>

      </div>
    </div>
  )
}
