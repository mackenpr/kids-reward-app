import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { CheckSquare, Gift, ClipboardList, Trophy, BarChart2, RefreshCw } from 'lucide-react'
import { calcBalances, toDollars } from '../../lib/points'
import type { PointTransaction } from '../../types'

interface KidStats {
  transactions: PointTransaction[]
  pendingTasks: number
}

const emptyStats: KidStats = { transactions: [], pendingTasks: 0 }

export function MasterDashboard() {
  const navigate = useNavigate()
  const [pendingTasks, setPendingTasks] = useState(0)
  const [pendingRedemptions, setPendingRedemptions] = useState(0)
  const [camden, setCamden] = useState<KidStats>(emptyStats)
  const [ethan, setEthan]   = useState<KidStats>(emptyStats)
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
    try {
      const { count: tc } = await supabase
        .from('task_completions').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      if (mounted.current) setPendingTasks(tc ?? 0)

      const { count: rc } = await supabase
        .from('redemption_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      if (mounted.current) setPendingRedemptions(rc ?? 0)

      // Camden
      const { data: camdenTxns } = await supabase
        .from('point_transactions').select('*').eq('kid_username', 'camden')
      const { count: camdenPending } = await supabase
        .from('task_completions').select('*', { count: 'exact', head: true })
        .eq('kid_username', 'camden').eq('status', 'pending')
      if (mounted.current) setCamden({ transactions: (camdenTxns as PointTransaction[]) ?? [], pendingTasks: camdenPending ?? 0 })

      // Ethan
      const { data: ethanTxns } = await supabase
        .from('point_transactions').select('*').eq('kid_username', 'ethan')
      const { count: ethanPending } = await supabase
        .from('task_completions').select('*', { count: 'exact', head: true })
        .eq('kid_username', 'ethan').eq('status', 'pending')
      if (mounted.current) setEthan({ transactions: (ethanTxns as PointTransaction[]) ?? [], pendingTasks: ethanPending ?? 0 })

    } catch (e) {
      console.error('Dashboard fetch error:', e)
    } finally {
      if (mounted.current) setRefreshing(false)
    }
  }

  const totalPending = pendingTasks + pendingRedemptions
  const camdenBal = calcBalances(camden.transactions)
  const ethanBal  = calcBalances(ethan.transactions)

  const kids = [
    { name: 'Camden', emoji: '⚔️', color: 'game-camden', bal: camdenBal, pending: camden.pendingTasks },
    { name: 'Ethan',  emoji: '🐿️', color: 'game-ethan',  bal: ethanBal,  pending: ethan.pendingTasks  },
  ]

  const quickActions = [
    { label: 'Task Approvals',  icon: CheckSquare,   path: '/master/approvals',    badge: pendingTasks,       color: 'text-game-camden' },
    { label: 'Task Editor',     icon: ClipboardList, path: '/master/tasks',        badge: 0,                  color: 'text-game-ethan'  },
    { label: 'Redemptions',     icon: Gift,          path: '/master/redemptions',  badge: pendingRedemptions, color: 'text-game-gold'   },
    { label: 'Prizes',          icon: Trophy,        path: '/master/prizes',       badge: 0,                  color: 'text-game-master' },
    { label: 'Reports',         icon: BarChart2,     path: '/master/reports',      badge: 0,                  color: 'text-game-pending'},
  ]

  return (
    <Layout title="Master HQ">
      <div className="px-4 py-4 flex flex-col gap-5">

        {/* Refresh */}
        <button onClick={fetchAll} disabled={refreshing}
          className="self-end flex items-center gap-2 text-xs font-bold text-game-muted hover:text-game-text transition-colors disabled:opacity-40">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Loading…' : 'Refresh'}
        </button>

        {/* Alert banner */}
        {totalPending > 0 && (
          <div onClick={() => navigate('/master/approvals')}
            className="card p-4 border-game-pending/40 bg-game-pending/10 flex items-center justify-between cursor-pointer hover:brightness-110 transition-all">
            <div>
              <p className="font-bold text-game-pending">⚠️ Action needed!</p>
              <p className="text-game-text-dim text-sm">
                {pendingTasks} task{pendingTasks !== 1 ? 's' : ''} + {pendingRedemptions} redemption{pendingRedemptions !== 1 ? 's' : ''} waiting
              </p>
            </div>
            <span className="font-game text-3xl text-game-pending">{totalPending}</span>
          </div>
        )}

        {/* Kids overview — full breakdown */}
        <div>
          <h2 className="section-title mb-3">Kids Overview</h2>
          <div className="flex flex-col gap-3">
            {kids.map(k => (
              <div key={k.name} className={`card p-4 border-${k.color}/30`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{k.emoji}</span>
                    <span className={`font-game text-2xl text-${k.color}`}>{k.name}</span>
                  </div>
                  {k.pending > 0 && (
                    <span className="text-game-pending text-xs font-bold bg-game-pending/10 px-2 py-1 rounded-full">
                      {k.pending} pending ⏳
                    </span>
                  )}
                </div>

                {/* Two balance boxes */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Dollar */}
                  <div className="bg-game-gold/10 border border-game-gold/20 rounded-xl p-3">
                    <p className="text-game-gold text-xs font-bold mb-1">💰 Dollar Bank</p>
                    <p className={`font-game text-2xl text-${k.color}`}>{toDollars(k.bal.dollarBalance)}</p>
                    <p className="text-game-text-dim text-xs mt-1">{k.bal.dollarBalance} pts</p>
                    <div className="flex justify-between text-xs text-game-text-dim mt-2 pt-2 border-t border-game-border">
                      <span>+{toDollars(k.bal.dollarEarned)} earned</span>
                      <span>-{toDollars(k.bal.dollarRedeemed)} spent</span>
                    </div>
                  </div>

                  {/* Quality time */}
                  <div className="bg-game-master/10 border border-game-master/20 rounded-xl p-3">
                    <p className="text-game-master text-xs font-bold mb-1">⭐ Activity Bank</p>
                    <p className={`font-game text-2xl text-${k.color}`}>{k.bal.qualityBalance} pts</p>
                    <p className="text-game-text-dim text-xs mt-1">
                      {Math.floor(k.bal.qualityBalance / 240)} full {Math.floor(k.bal.qualityBalance / 240) === 1 ? 'activity' : 'activities'}
                    </p>
                    <div className="mt-2 pt-2 border-t border-game-border">
                      <div className="w-full bg-game-border rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full bg-game-master transition-all`}
                          style={{ width: `${Math.min(100, (k.bal.qualityBalance % 240) / 240 * 100)}%` }} />
                      </div>
                      <p className="text-game-text-dim text-xs mt-1">{k.bal.qualityBalance % 240}/240 to next</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="section-title mb-3">Quick Actions</h2>
          <div className="flex flex-col gap-2">
            {quickActions.map(({ label, icon: Icon, path, badge, color }) => (
              <button key={path} onClick={() => navigate(path)}
                className="card p-4 flex items-center justify-between hover:brightness-110 transition-all active:scale-[0.99]">
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
