import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { CheckSquare, Gift, ClipboardList, Trophy, BarChart2, Star, RefreshCw } from 'lucide-react'

interface KidStats {
  balance: number
  pendingTasks: number
}

export function MasterDashboard() {
  const navigate = useNavigate()
  const [pendingTasks, setPendingTasks] = useState(0)
  const [pendingRedemptions, setPendingRedemptions] = useState(0)
  const [camden, setCamden] = useState<KidStats>({ balance: 0, pendingTasks: 0 })
  const [ethan, setEthan] = useState<KidStats>({ balance: 0, pendingTasks: 0 })
  const [refreshing, setRefreshing] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    fetchAll()
    return () => { mounted.current = false }
  }, [])

  async function fetchAll() {
    if (!mounted.current) return
    setRefreshing(true)

    // Run queries sequentially to avoid hammering connections
    try {
      // Pending task completions count
      const { count: tc } = await supabase
        .from('task_completions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
      if (mounted.current) setPendingTasks(tc ?? 0)

      // Pending redemptions count
      const { count: rc } = await supabase
        .from('redemption_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
      if (mounted.current) setPendingRedemptions(rc ?? 0)

      // Camden stats
      const { data: camdenTxns } = await supabase
        .from('point_transactions')
        .select('amount, type')
        .eq('kid_username', 'camden')
      const { count: camdenPending } = await supabase
        .from('task_completions')
        .select('*', { count: 'exact', head: true })
        .eq('kid_username', 'camden')
        .eq('status', 'pending')
      if (mounted.current) {
        const balance = Math.max(0, (camdenTxns ?? []).reduce((s, t) => s + (t.type === 'redeemed' ? -t.amount : t.amount), 0))
        setCamden({ balance, pendingTasks: camdenPending ?? 0 })
      }

      // Ethan stats
      const { data: ethanTxns } = await supabase
        .from('point_transactions')
        .select('amount, type')
        .eq('kid_username', 'ethan')
      const { count: ethanPending } = await supabase
        .from('task_completions')
        .select('*', { count: 'exact', head: true })
        .eq('kid_username', 'ethan')
        .eq('status', 'pending')
      if (mounted.current) {
        const balance = Math.max(0, (ethanTxns ?? []).reduce((s, t) => s + (t.type === 'redeemed' ? -t.amount : t.amount), 0))
        setEthan({ balance, pendingTasks: ethanPending ?? 0 })
      }
    } catch (e) {
      console.error('Dashboard fetch error:', e)
    } finally {
      if (mounted.current) setRefreshing(false)
    }
  }

  const totalPending = pendingTasks + pendingRedemptions

  const quickActions = [
    { label: 'Task Approvals',  icon: CheckSquare,   path: '/master/approvals',    badge: pendingTasks,       color: 'text-game-camden' },
    { label: 'Task Editor',     icon: ClipboardList, path: '/master/tasks',        badge: 0,                  color: 'text-game-ethan' },
    { label: 'Redemptions',     icon: Gift,          path: '/master/redemptions',  badge: pendingRedemptions, color: 'text-game-gold' },
    { label: 'Prizes',          icon: Trophy,        path: '/master/prizes',       badge: 0,                  color: 'text-game-master' },
    { label: 'Reports',         icon: BarChart2,     path: '/master/reports',      badge: 0,                  color: 'text-game-pending' },
  ]

  return (
    <Layout title="Master HQ">
      <div className="px-4 py-4 flex flex-col gap-5">

        {/* Refresh button */}
        <button
          onClick={fetchAll}
          disabled={refreshing}
          className="self-end flex items-center gap-2 text-xs font-bold text-game-muted hover:text-game-text transition-colors disabled:opacity-40"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Loading…' : 'Refresh'}
        </button>

        {/* Alert banner */}
        {totalPending > 0 && (
          <div
            onClick={() => navigate('/master/approvals')}
            className="card p-4 border-game-pending/40 bg-game-pending/10 flex items-center justify-between cursor-pointer hover:brightness-110 transition-all"
          >
            <div>
              <p className="font-bold text-game-pending">⚠️ Action needed!</p>
              <p className="text-game-text-dim text-sm">
                {pendingTasks} task{pendingTasks !== 1 ? 's' : ''} + {pendingRedemptions} redemption{pendingRedemptions !== 1 ? 's' : ''} waiting
              </p>
            </div>
            <span className="font-game text-3xl text-game-pending">{totalPending}</span>
          </div>
        )}

        {/* Kids overview */}
        <div>
          <h2 className="section-title mb-3">Kids Overview</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'Camden', stats: camden, emoji: '⚔️', color: 'game-camden' },
              { name: 'Ethan',  stats: ethan,  emoji: '🐿️', color: 'game-ethan' },
            ].map(k => (
              <div key={k.name} className={`card p-4 border-${k.color}/30 bg-${k.color}/5`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{k.emoji}</span>
                  <p className={`font-game text-xl text-${k.color}`}>{k.name}</p>
                </div>
                <div className="flex items-center gap-1 mb-1">
                  <Star size={14} className="text-game-gold" fill="currentColor" />
                  <span className={`font-game text-2xl text-${k.color}`}>{k.stats.balance.toLocaleString()}</span>
                </div>
                <p className="text-game-text-dim text-xs">pts balance</p>
                {k.stats.pendingTasks > 0 && (
                  <p className="text-game-pending text-xs font-bold mt-2">{k.stats.pendingTasks} pending ⏳</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="section-title mb-3">Quick Actions</h2>
          <div className="flex flex-col gap-2">
            {quickActions.map(({ label, icon: Icon, path, badge, color }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="card p-4 flex items-center justify-between hover:brightness-110 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} className={color} />
                  <span className="font-bold text-game-text">{label}</span>
                </div>
                {badge > 0 && (
                  <span className="bg-game-danger text-white text-xs font-bold px-2 py-1 rounded-full">{badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
