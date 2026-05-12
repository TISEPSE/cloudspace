import { NavLink, useLocation } from 'react-router-dom'

const items = [
  { path: '/drive',    icon: 'folder',        label: 'Drive', match: (p) => p === '/drive' || p.startsWith('/drive/') },
  { path: '/gallery',  icon: 'photo_library', label: 'Galerie' },
  { path: '/starred',  icon: 'star',          label: 'Favoris' },
  { path: '/shared',   icon: 'group',         label: 'Partagés' },
  { path: '/settings', icon: 'settings',      label: 'Réglages' },
]

export default function BottomNav() {
  const location = useLocation()

  return (
    <nav
      className="md:hidden flex-shrink-0 border-t border-slate-200 dark:border-border-dark bg-white dark:bg-surface-dark pb-[env(safe-area-inset-bottom)]"
      aria-label="Navigation principale"
    >
      <div className="flex items-stretch justify-around h-14">
        {items.map(item => {
          const isActive = item.match ? item.match(location.pathname) : location.pathname === item.path
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors select-none active:bg-slate-100 dark:active:bg-border-dark/70 ${
                isActive
                  ? 'text-primary'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px] leading-none"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
