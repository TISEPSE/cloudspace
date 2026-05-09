import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import FloatingActions from './FloatingActions'
import UploadToaster from './UploadToaster'
import { useLocalPref } from '../hooks/useLocalPref'

export default function Layout() {
  const [sidebarPos] = useLocalPref('cloudspace_sidebar_position', 'left')
  const sidebarRight = sidebarPos === 'right'

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {!sidebarRight && <Sidebar />}
      <main className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark relative">
        <FloatingActions />
        <Outlet />
      </main>
      {sidebarRight && <Sidebar />}
      <UploadToaster />
    </div>
  )
}
