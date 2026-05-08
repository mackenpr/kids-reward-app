import { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, Home, Star, Gift, CheckSquare, ClipboardList, BarChart2, Trophy } from 'lucide-react'

interface LayoutProps {
  children: ReactNode
  title?: string
}

export function Layout({ children, title }: LayoutProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  const kidUsername = user?.username as string

  const kidNav = [
    { icon: Home,        label: 'Tasks',       path: `/kid/${kidUsername}` },
    { icon: Star,        label: 'Points',      path: `/kid/${kidUsername}/points` },
    { icon: Gift,        label: 'Redeem',      path: `/kid/${kidUsername}/redeem` },
  ]

  const masterNav = [
    { icon: Home,        label: 'Dashboard',   path: '/master' },
    { icon: CheckSquare, label: 'Approvals',   path: '/master/approvals' },
    { icon: ClipboardList,label: 'Tasks',      path: '/master/tasks' },
    { icon: Trophy,      label: 'Prizes',      path: '/master/prizes' },
    { icon: Gift,        label: 'Redeem',      path: '/master/redemptions' },
    { icon: BarChart2,   label: 'Reports',     path: '/master/reports' },
  ]

  const navItems = user?.role === 'master' ? masterNav : kidNav

  const accentColor = user?.username === 'camden'
    ? 'text-game-camden'
    : user?.username === 'ethan'
    ? 'text-game-ethan'
    : 'text-game-master'

  return (
    <div className="flex flex-col min-h-dvh bg-game-bg">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-game-border bg-game-card/80 backdrop-blur sticky top-0 z-10">
        <h1 className={`font-game text-2xl tracking-wide ${accentColor}`}>
          {title ?? 'Family Quest'}
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-game-text-dim text-sm font-bold">{user?.display_name}</span>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl hover:bg-game-border transition-colors"
            title="Log out"
          >
            <LogOut size={18} className="text-game-muted" />
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-game-border bg-game-card/95 backdrop-blur z-10">
        <div className="flex">
          {navItems.map(({ icon: Icon, label, path }) => {
            const active = location.pathname === path
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                  active ? accentColor : 'text-game-muted hover:text-game-text-dim'
                }`}
              >
                <Icon size={20} />
                <span className="text-xs font-bold">{label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
