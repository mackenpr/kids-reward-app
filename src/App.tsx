import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Home } from './pages/Home'
import { Setup } from './pages/Setup'
import { KidDashboard } from './pages/KidDashboard'
import { PointBank } from './pages/PointBank'
import { RedeemPoints } from './pages/RedeemPoints'
import { MasterDashboard } from './pages/master/MasterDashboard'
import { TaskApprovals } from './pages/master/TaskApprovals'
import { TaskEditor } from './pages/master/TaskEditor'
import { PrizeManager } from './pages/master/PrizeManager'
import { RedemptionApprovals } from './pages/master/RedemptionApprovals'
import { Reports } from './pages/master/Reports'

function RequireAuth({ children, role }: { children: JSX.Element; role?: 'master' | 'kid' }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-dvh flex items-center justify-center"><span className="text-5xl animate-bounce">⭐</span></div>
  if (!user) return <Navigate to="/" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) return <div className="min-h-dvh flex items-center justify-center bg-game-bg"><span className="text-5xl animate-bounce">⭐</span></div>

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={user.role === 'master' ? '/master' : `/kid/${user.username}`} replace /> : <Home />} />
      <Route path="/setup" element={<Setup />} />

      {/* Kid routes */}
      <Route path="/kid/:username" element={<RequireAuth role="kid"><KidDashboard /></RequireAuth>} />
      <Route path="/kid/:username/points" element={<RequireAuth role="kid"><PointBank /></RequireAuth>} />
      <Route path="/kid/:username/redeem" element={<RequireAuth role="kid"><RedeemPoints /></RequireAuth>} />

      {/* Master routes */}
      <Route path="/master" element={<RequireAuth role="master"><MasterDashboard /></RequireAuth>} />
      <Route path="/master/approvals" element={<RequireAuth role="master"><TaskApprovals /></RequireAuth>} />
      <Route path="/master/tasks" element={<RequireAuth role="master"><TaskEditor /></RequireAuth>} />
      <Route path="/master/prizes" element={<RequireAuth role="master"><PrizeManager /></RequireAuth>} />
      <Route path="/master/redemptions" element={<RequireAuth role="master"><RedemptionApprovals /></RequireAuth>} />
      <Route path="/master/reports" element={<RequireAuth role="master"><Reports /></RequireAuth>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
