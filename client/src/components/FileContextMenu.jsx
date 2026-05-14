import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { createPortal } from 'react-dom'
import { Capacitor } from '@capacitor/core'

const IS_NATIVE = Capacitor.isNativePlatform()

function useDropdownPosition(anchorRect, menuRef) {
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!anchorRect || !menuRef.current) return

    const menu = menuRef.current
    const menuRect = menu.getBoundingClientRect()
    const viewportH = window.innerHeight
    const viewportW = window.innerWidth

    let left = anchorRect.right - menuRect.width
    if (left < 12) left = 12
    if (left + menuRect.width > viewportW - 12) {
      left = viewportW - menuRect.width - 12
    }

    const spaceBelow = viewportH - anchorRect.bottom - 12
    const spaceAbove = anchorRect.top - 12
    const openAbove = menuRect.height > spaceBelow && spaceAbove > spaceBelow

    let top, maxHeight
    if (openAbove) {
      maxHeight = Math.min(menuRect.height, spaceAbove)
      top = anchorRect.top - maxHeight - 4
      if (top < 12) top = 12
    } else {
      maxHeight = Math.min(menuRect.height, spaceBelow)
      top = anchorRect.bottom + 4
    }

    setPosition({ top, left, openAbove, maxHeight })
  }, [anchorRect, menuRef])

  return position
}

function useClickOutside(ref, onClose) {
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose()
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [ref, onClose])
}

function getActions(isFolder, isLocked, isStarred, isImage) {
  return [
    isFolder
      ? { id: 'open', label: 'Ouvrir', icon: 'folder_open' }
      : { id: 'preview', label: 'Aperçu', icon: 'visibility', shortcut: 'Space' },
    { id: 'rename', label: 'Renommer', icon: 'edit', shortcut: 'F2' },
    { id: 'star', label: isStarred ? 'Retirer des favoris' : 'Ajouter aux favoris', icon: isStarred ? 'star_border' : 'star' },
    { id: 'details', label: 'Détails', icon: 'info' },
    { type: 'divider' },
    ...(isFolder ? [{ id: 'lock', label: isLocked ? 'Déverrouiller' : 'Verrouiller', icon: isLocked ? 'lock_open' : 'lock' }] : []),
    { id: 'move', label: 'Déplacer vers', icon: 'drive_file_move' },
    { id: 'share', label: 'Partager (CloudSpace)', icon: 'share' },
    ...(IS_NATIVE ? [{ id: 'share_native', label: 'Partager via…', icon: 'ios_share' }] : []),
    ...(isImage ? [{ id: 'copy_image', label: 'Copier l\'image', icon: 'content_copy' }] : []),
    { id: 'download', label: isFolder ? 'Télécharger en ZIP' : 'Télécharger', icon: isFolder ? 'folder_zip' : 'download', ...(!isFolder ? { shortcut: 'Ctrl+D' } : {}) },
    { type: 'divider' },
    { id: 'trash', label: 'Supprimer', icon: 'delete', danger: true, shortcut: 'Suppr' },
  ]
}

function BottomSheetMenu({ onClose, onAction, isFolder, isLocked, isStarred, isImage }) {
  const sheetRef = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const handleCloseStable = useCallback(() => {
    setVisible(false)
    // Bloque le prochain clic au niveau document pour eviter que le tap sur
    // le backdrop n'ouvre le fichier sous-jacent (click-through).
    const swallow = (e) => {
      e.preventDefault()
      e.stopPropagation()
    }
    document.addEventListener('click', swallow, { capture: true, once: true })
    // Filet de securite : retire le listener apres 400ms s'il n'a pas servi.
    setTimeout(() => document.removeEventListener('click', swallow, { capture: true }), 400)
    setTimeout(onClose, 200)
  }, [onClose])

  useEffect(() => {
    function handleKeyDown(e) { if (e.key === 'Escape') handleCloseStable() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleCloseStable])

  function handleAction(actionId, e) {
    e.stopPropagation()
    onAction?.(actionId)
    handleCloseStable()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end"
      onClick={handleCloseStable}
    >
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        ref={sheetRef}
        onClick={e => e.stopPropagation()}
        className={`
          relative w-full bg-white dark:bg-[#1e2a36]
          rounded-t-2xl border-t border-slate-200 dark:border-[#2d3b47]
          shadow-2xl pb-[env(safe-area-inset-bottom)] max-h-[80vh] overflow-y-auto
          transition-transform duration-200 ease-out
          ${visible ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>
        <div className="py-1.5">
          {getActions(isFolder, isLocked, isStarred, isImage).map((action, index) => {
            if (action.type === 'divider') {
              return (
                <div
                  key={`div-${index}`}
                  className="my-1 mx-3 h-px bg-slate-100 dark:bg-[#2d3b47]"
                />
              )
            }
            return (
              <button
                key={action.id}
                onClick={(e) => handleAction(action.id, e)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-left
                  active:bg-slate-100 dark:active:bg-white/10 transition-colors
                  ${action.danger
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-slate-700 dark:text-slate-200'
                  }
                `}
              >
                <span
                  className={`
                    material-symbols-outlined text-[20px] flex-shrink-0
                    ${action.danger ? 'text-red-400' : 'text-slate-400'}
                  `}
                >
                  {action.icon}
                </span>
                <span className="flex-1 text-sm font-medium">{action.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}

function MenuDropdown({ anchorRect, onClose, onAction, isFolder, isLocked, isStarred, isImage }) {
  const menuRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const position = useDropdownPosition(anchorRect, menuRef)

  useEffect(() => {
    if (position.top !== 0 || position.left !== 0) {
      requestAnimationFrame(() => setVisible(true))
    }
  }, [position])

  const handleCloseStable = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 150)
  }, [onClose])

  useClickOutside(menuRef, handleCloseStable)

  function handleAction(actionId, e) {
    e.stopPropagation()
    onAction?.(actionId)
    handleCloseStable()
  }

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999]"
      style={{ top: position.top, left: position.left }}
    >
      <div
        className={`
          w-56 rounded-xl py-1.5 overflow-y-auto
          bg-white dark:bg-[#1e2a36]
          border border-slate-200 dark:border-[#2d3b47]
          shadow-xl shadow-black/15 dark:shadow-black/40
          transition-all duration-150 ease-out
          ${position.openAbove ? 'origin-bottom-right' : 'origin-top-right'}
          ${visible
            ? 'opacity-100 scale-100 translate-y-0'
            : `opacity-0 scale-95 ${position.openAbove ? 'translate-y-1' : '-translate-y-1'}`
          }
        `}
        style={position.maxHeight ? { maxHeight: position.maxHeight } : {}}
      >
        {getActions(isFolder, isLocked, isStarred, isImage).map((action, index) => {
          if (action.type === 'divider') {
            return (
              <div
                key={`div-${index}`}
                className="my-1 mx-2.5 h-px bg-slate-100 dark:bg-[#2d3b47]"
              />
            )
          }

          return (
            <button
              key={action.id}
              onClick={(e) => handleAction(action.id, e)}
              className={`
                w-[calc(100%-8px)] mx-1 flex items-center gap-3 px-2.5 py-[7px] text-left
                rounded-lg transition-colors duration-75 group/item
                ${action.danger
                  ? 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5'
                }
              `}
            >
              <span
                className={`
                  material-symbols-outlined flex-shrink-0
                  ${action.danger
                    ? 'text-red-400 dark:text-red-400'
                    : 'text-slate-400 dark:text-slate-400 group-hover/item:text-slate-600 dark:group-hover/item:text-slate-200'
                  }
                `}
              >
                {action.icon}
              </span>
              <span className="flex-1 text-[13px] font-medium">{action.label}</span>
              {action.shortcut && (
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono tracking-tight">
                  {action.shortcut}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>,
    document.body
  )
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

const FileContextMenu = forwardRef(function FileContextMenu({ children, className, onAction, isFolder, isLocked, isStarred = false, isImage = false, hideUntilHover = true, forceVisible = false }, ref) {
  const [open, setOpen] = useState(false)
  const [anchorRect, setAnchorRect] = useState(null)
  const btnRef = useRef(null)
  const isMobile = useIsMobile()

  const handleToggle = useCallback((e) => {
    e?.stopPropagation?.()
    if (open) {
      setOpen(false)
    } else {
      const rect = btnRef.current?.getBoundingClientRect()
      setAnchorRect(rect)
      setOpen(true)
    }
  }, [open])

  useImperativeHandle(ref, () => ({
    open: () => {
      if (!open) {
        const rect = btnRef.current?.getBoundingClientRect()
        setAnchorRect(rect)
        setOpen(true)
      }
    },
    close: () => setOpen(false),
  }), [open])

  // Sur mobile : pas de hover, le menu est toujours visible
  const opacityClass = forceVisible || isMobile
    ? 'opacity-100'
    : hideUntilHover ? 'opacity-0 group-hover:opacity-100' : ''
  const defaultClass = [
    'w-7 h-7 flex items-center justify-center rounded-md flex-shrink-0',
    'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200',
    'hover:bg-slate-100 dark:hover:bg-border-dark transition-all',
    opacityClass,
  ].filter(Boolean).join(' ')

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        className={className || defaultClass}
      >
        {children || (
          <span className="material-symbols-outlined text-[16px] leading-none">more_vert</span>
        )}
      </button>

      {open && (
        isMobile ? (
          <BottomSheetMenu
            onClose={() => setOpen(false)}
            onAction={onAction}
            isFolder={isFolder}
            isLocked={isLocked}
            isStarred={isStarred}
            isImage={isImage}
          />
        ) : (
          <MenuDropdown
            anchorRect={anchorRect}
            onClose={() => setOpen(false)}
            onAction={onAction}
            isFolder={isFolder}
            isLocked={isLocked}
            isStarred={isStarred}
            isImage={isImage}
          />
        )
      )}
    </>
  )
})

export default FileContextMenu
