import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useUpload } from '../contexts/UploadContext'
import { apiFetch } from '../lib/api'
import { useLocalPref } from '../hooks/useLocalPref'

const navItems = [
  { path: '/dashboard', icon: 'dashboard',     label: 'Tableau de bord' },
  { path: '/gallery',   icon: 'photo_library', label: 'Galerie' },
  { path: '/shared',    icon: 'group',          label: 'Partagés avec moi' },
  { path: '/recent',    icon: 'schedule',       label: 'Récents' },
  { path: '/starred',   icon: 'star',           label: 'Favoris' },
  { path: '/history',   icon: 'history',        label: 'Historique' },
  { path: '/trash',     icon: 'delete',         label: 'Corbeille' },
]


export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const { uploadFiles } = useUpload()
  const [storage, setStorage] = useState({ percentage: 0, formatted_used: '0 B', formatted_limit: '20 GB' })
  const [hoverExpand] = useLocalPref('cloudspace_sidebar_hover', true)
  const [isHovered, setIsHovered] = useState(false)

  const collapsed = hoverExpand && !isHovered

  useEffect(() => {
    apiFetch('/api/user/storage').then(r => r.json()).then(data => setStorage({
      percentage: data.percentage,
      formatted_used: data.formatted_used,
      formatted_limit: data.formatted_limit,
    })).catch(() => {})
  }, [])

  const handleFileSelected = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) uploadFiles(files)
    e.target.value = ''
  }

  const isDriveActive = location.pathname === '/drive' || location.pathname.startsWith('/drive/')

  return (
    <>
      <aside
        onMouseEnter={() => hoverExpand && setIsHovered(true)}
        onMouseLeave={() => hoverExpand && setIsHovered(false)}
        className={[
          'bg-white dark:bg-background-dark border-r border-slate-200 dark:border-border-dark',
          'flex flex-col overflow-hidden flex-shrink-0',
          'transition-[width] duration-200 ease-in-out z-20',
          collapsed ? 'w-[56px]' : 'w-60',
          hoverExpand && isHovered ? 'shadow-xl shadow-black/10 dark:shadow-black/30' : '',
        ].join(' ')}
      >
        {/* Logo — icône dans w-10 fixe, texte toujours dans le DOM, clippé par overflow-hidden */}
        <div className="h-16 flex items-center px-[10px] flex-shrink-0">
          <div className="flex items-center text-primary min-w-0">
            <span className="w-10 h-10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[2.2em]">cloud_circle</span>
            </span>
            <h1 className={`text-slate-900 dark:text-white text-[1.4em] font-bold tracking-tight whitespace-nowrap transition-opacity duration-150 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
              CloudSpace
            </h1>
          </div>
        </div>

        {/* Navigation — px-[10px] fixe, icône dans w-9 fixe, texte toujours présent */}
        <nav className="flex-1 overflow-y-auto py-4 px-[10px] flex flex-col gap-0.5">

          {/* Bouton Importer */}
          <div className="mb-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Importer"
              className="w-full h-12 flex items-center justify-center rounded-lg bg-primary hover:bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20 transition-all text-[1.1em]"
            >
              <div className="flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[1.3em] leading-none">add</span>
                <span className={`whitespace-nowrap transition-all duration-150 ${collapsed ? 'hidden' : 'block'}`}>
                  Importer
                </span>
              </div>
            </button>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelected} />
          </div>

          <div className="flex flex-col gap-0.5">
            {(() => {
              const renderNavItem = (item) => {
                const isActive = location.pathname === item.path
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={item.label}
                    className={[
                      'flex items-center rounded-lg text-[13px] font-medium transition-colors',
                      isActive
                        ? 'bg-slate-100 dark:bg-surface-dark text-primary dark:text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-border-dark',
                    ].join(' ')}
                  >
                    <span className="w-9 h-9 flex items-center justify-center flex-shrink-0">
                      <span className={[
                        'material-symbols-outlined',
                        isActive ? 'fill-current' : '',
                        item.path === '/starred' && isActive ? 'text-amber-500' : '',
                      ].join(' ')}>{item.icon}</span>
                    </span>
                    <span className={`whitespace-nowrap transition-opacity duration-150 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>{item.label}</span>
                  </NavLink>
                )
              }
              return (
                <>
                  {/* Tableau de bord (solo) */}
                  {renderNavItem(navItems[0])}

                  {/* Séparateur */}
                  <div className="my-1 border-t border-slate-100 dark:border-border-dark" />

                  {/* Mon Drive */}
                  <div
                    onClick={() => navigate('/drive')}
                    title="Mon Drive"
                    className={[
                      'flex items-center rounded-lg text-[13px] font-medium transition-colors cursor-pointer',
                      isDriveActive
                        ? 'bg-slate-100 dark:bg-surface-dark text-primary dark:text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-border-dark',
                    ].join(' ')}
                  >
                    <span className="w-9 h-9 flex items-center justify-center flex-shrink-0">
                      <span className={`material-symbols-outlined ${isDriveActive ? 'fill-current' : ''}`}>folder</span>
                    </span>
                    <span className={`whitespace-nowrap transition-opacity duration-150 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>Mon Drive</span>
                  </div>

                  {/* Reste des items */}
                  {navItems.slice(1).map(renderNavItem)}
                </>
              )
            })()}
          </div>
        </nav>

        {/* Barre de stockage */}
        <div className="border-t border-slate-200 dark:border-border-dark flex-shrink-0">
          {collapsed ? (
            <div className="flex items-center justify-center h-14">
              <span
                className="material-symbols-outlined text-[20px] text-slate-400"
                title={`${storage.formatted_used} / ${storage.formatted_limit}`}
              >cloud</span>
            </div>
          ) : (
            <div className="p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Stockage</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{storage.percentage}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-border-dark rounded-full h-1.5 mb-1.5">
                <div className="bg-primary h-1.5 rounded-full" style={{ width: `${storage.percentage}%` }} />
              </div>
              <p className="text-[10px] text-slate-500">{storage.formatted_used} sur {storage.formatted_limit}</p>
              <button className="mt-2.5 w-full py-1.5 text-[11px] font-medium text-primary border border-primary/30 rounded hover:bg-primary/5 transition-colors">
                Améliorer le plan
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
