import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

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

    let top
    if (openAbove) {
      top = anchorRect.top - menuRect.height - 4
      if (top < 12) top = 12
    } else {
      top = anchorRect.bottom + 4
    }

    setPosition({ top, left, openAbove })
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

function getActions(isFolder, isLocked) {
  return [
    isFolder
      ? { id: 'open', label: 'Ouvrir', icon: 'folder_open' }
      : { id: 'preview', label: 'Aperçu', icon: 'visibility', shortcut: 'Space' },
    { id: 'rename', label: 'Renommer', icon: 'edit', shortcut: 'F2' },
    { id: 'star', label: 'Ajouter aux favoris', icon: 'star' },
    { id: 'details', label: 'Détails', icon: 'info' },
    { type: 'divider' },
    ...(isFolder ? [{ id: 'lock', label: isLocked ? 'Déverrouiller' : 'Verrouiller', icon: isLocked ? 'lock_open' : 'lock' }] : []),
    { id: 'move', label: 'Déplacer vers', icon: 'drive_file_move' },
    { id: 'share', label: 'Partager', icon: 'share' },
    { id: 'download', label: isFolder ? 'Télécharger en ZIP' : 'Télécharger', icon: isFolder ? 'folder_zip' : 'download', ...(!isFolder ? { shortcut: 'Ctrl+D' } : {}) },
    { type: 'divider' },
    { id: 'trash', label: 'Supprimer', icon: 'delete', danger: true, shortcut: 'Suppr' },
  ]
}

function MenuDropdown({ anchorRect, onClose, onAction, isFolder, isLocked }) {
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
          w-56 rounded-xl py-1.5
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
      >
        {getActions(isFolder, isLocked).map((action, index) => {
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

export default function FileContextMenu({ children, className, onAction, isFolder, isLocked, hideUntilHover = true, forceVisible = false }) {
  const [open, setOpen] = useState(false)
  const [anchorRect, setAnchorRect] = useState(null)
  const btnRef = useRef(null)

  const handleToggle = useCallback((e) => {
    e.stopPropagation()
    if (open) {
      setOpen(false)
    } else {
      const rect = btnRef.current.getBoundingClientRect()
      setAnchorRect(rect)
      setOpen(true)
    }
  }, [open])

  const opacityClass = forceVisible ? 'opacity-100' : hideUntilHover ? 'opacity-0 group-hover:opacity-100' : ''
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
        <MenuDropdown
          anchorRect={anchorRect}
          onClose={() => setOpen(false)}
          onAction={onAction}
          isFolder={isFolder}
          isLocked={isLocked}
        />
      )}
    </>
  )
}
