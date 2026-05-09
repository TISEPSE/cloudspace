import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import SearchModal from './SearchModal'
import FilePreviewModal from './FilePreviewModal'

const SESSION_STARTED_KEY = 'cloudspace_session_started'
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000

const PAGE_TITLES = {
  '/dashboard': 'Accueil',
  '/drive':     'Mon Drive',
  '/shared':    'Partagés avec moi',
  '/starred':   'Favoris',
  '/trash':     'Corbeille',
  '/gallery':   'Galerie',
  '/history':   'Historique',
  '/settings':  'Paramètres',
}

export default function FloatingActions() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const openSearch = useCallback(() => setSearchOpen(true), [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const closePreview = useCallback(() => setPreviewFile(null), [])
  const menuRef = useRef(null)
  const [sessionMinLeft, setSessionMinLeft] = useState(null)
  const [anchorRect, setAnchorRect] = useState(null)
  const [visible, setVisible] = useState(false)
  const dropdownRef = useRef(null)

  const basePath = '/' + location.pathname.split('/')[1]
  const title = PAGE_TITLES[basePath] ?? ''
  const initials = user ? (user.first_name[0] + user.last_name[0]).toUpperCase() : '?'
  const displayName = user ? `${user.first_name} ${user.last_name[0]}.` : ''

  const handleToggle = () => {
    if (menuOpen) {
      setVisible(false)
      setTimeout(() => setMenuOpen(false), 150)
    } else {
      const rect = menuRef.current.getBoundingClientRect()
      setAnchorRect(rect)
      setMenuOpen(true)
    }
  }

  useEffect(() => {
    if (!menuOpen || !anchorRect || !dropdownRef.current) return
    requestAnimationFrame(() => setVisible(true))
  }, [menuOpen, anchorRect])

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e) {
      if (menuRef.current?.contains(e.target)) return
      if (dropdownRef.current?.contains(e.target)) return
      setVisible(false)
      setTimeout(() => setMenuOpen(false), 150)
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setVisible(false)
        setTimeout(() => setMenuOpen(false), 150)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  useEffect(() => {
    const check = () => {
      const started = localStorage.getItem(SESSION_STARTED_KEY)
      if (!started) { setSessionMinLeft(null); return }
      const remaining = SESSION_DURATION_MS - (Date.now() - parseInt(started, 10))
      const minutes = Math.floor(remaining / 60000)
      setSessionMinLeft(minutes < 60 ? Math.max(0, minutes) : null)
    }
    check()
    const id = setInterval(check, 60000)
    return () => clearInterval(id)
  }, [])

  const handleLogout = async () => {
    setVisible(false)
    setTimeout(async () => {
      setMenuOpen(false)
      await logout()
      navigate('/accounts', { replace: true })
    }, 150)
  }

  return (
    <div className="flex-shrink-0 h-14 flex items-center justify-between px-6 border-b border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>

      <div className="flex items-center gap-2">
        {sessionMinLeft !== null && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <span className="material-symbols-outlined text-[16px] leading-none">timer</span>
            <span className="text-xs font-medium">{sessionMinLeft} min</span>
          </div>
        )}

        <button
          onClick={openSearch}
          title="Rechercher (⌘K)"
          className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-surface-dark active:scale-95 transition-all duration-150"
        >
          <span className="material-symbols-outlined text-[20px] leading-none">search</span>
        </button>

        <button className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-surface-dark active:scale-95 transition-all duration-150">
          <span className="material-symbols-outlined text-[20px] leading-none">notifications</span>
        </button>

        <div className="h-7 w-[1px] bg-slate-200 dark:bg-border-dark mx-0.5" />

        <div ref={menuRef}>
          <button
            onClick={handleToggle}
            className="flex items-center gap-2.5 pl-2 pr-3.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-surface-dark active:scale-95 transition-all duration-150"
          >
            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                : initials}
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-white hidden sm:block">{displayName}</span>
            <span className={`material-symbols-outlined text-slate-400 text-lg leading-none transition-transform duration-200 ${menuOpen ? 'rotate-180' : 'rotate-0'}`}>
              expand_more
            </span>
          </button>
        </div>
      </div>

      {menuOpen && anchorRect && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999]"
          style={{ top: anchorRect.bottom + 4, left: anchorRect.right - 208 }}
        >
          <div className={`
            w-52 rounded-xl py-1.5
            bg-white dark:bg-[#1e2a36]
            border border-slate-200 dark:border-[#2d3b47]
            shadow-xl shadow-black/15 dark:shadow-black/40
            transition-all duration-150 ease-out origin-top-right
            ${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-1'}
          `}>
            <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-[#2d3b47] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                {user?.avatar_url
                  ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  : initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => { setVisible(false); setTimeout(() => { setMenuOpen(false); navigate('/settings') }, 150) }}
              className="w-[calc(100%-8px)] mx-1 mt-1.5 flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <span className="material-symbols-outlined text-slate-400">settings</span>
              <span className="text-[13px] font-medium">Paramètres</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-[calc(100%-8px)] mx-1 flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <span className="material-symbols-outlined">logout</span>
              <span className="text-[13px] font-medium">Se déconnecter</span>
            </button>
          </div>
        </div>,
        document.body
      )}

      {searchOpen && <SearchModal onClose={closeSearch} onOpenFile={setPreviewFile} />}
      <FilePreviewModal file={previewFile} onClose={closePreview} />
    </div>
  )
}
