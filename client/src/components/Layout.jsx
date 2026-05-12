import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import FloatingActions from './FloatingActions'
import BottomNav from './BottomNav'
import UploadToaster from './UploadToaster'
import { useLocalPref } from '../hooks/useLocalPref'
import { useAndroidBackButton } from '../hooks/useAndroidBackButton'
import { apiFetch } from '../lib/api'

function useSyncAppearancePrefs() {
  useEffect(() => {
    apiFetch('/api/settings/appearance')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        const prefs = {
          cloudspace_sidebar_position: data.sidebar_position,
          cloudspace_sidebar_hover: data.sidebar_hover,
        }
        Object.entries(prefs).forEach(([key, value]) => {
          if (value === undefined || value === null) return
          localStorage.setItem(key, JSON.stringify(value))
          window.dispatchEvent(new CustomEvent('localPrefChange', { detail: { key, value } }))
        })
      })
      .catch(() => {})
  }, [])
}

export default function Layout() {
  useSyncAppearancePrefs()
  useAndroidBackButton()
  const [sidebarPos] = useLocalPref('cloudspace_sidebar_position', 'left')
  const sidebarRight = sidebarPos === 'right'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const sidebar = (
    <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
  )

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {!sidebarRight && sidebar}
      <main className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark relative">
        <FloatingActions onMenuClick={() => setMobileMenuOpen(true)} />
        <Outlet />
        <BottomNav />
      </main>
      {sidebarRight && sidebar}
      <UploadToaster />
    </div>
  )
}
