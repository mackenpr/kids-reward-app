import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { startOfDay, startOfWeek, startOfMonth, format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { Layout } from '../components/Layout'
import { calcBalances, toDollars, activitiesAvailable, POINTS_PER_DOLLAR } from '../lib/points'
import type { PointTransaction } from '../types'
import { Gift } from 'lucide-react'

export function PointBank() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchTransactions() }, [username])

  async function fetchTransactions() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('kid_username', username)
        .order('created_at', { ascending: false })
      setTransactions((data as PointTransaction[]) ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const balances = calcBalances(transactions)
  const accentClass = username === 'camden' ? 'text-game-camden' : 'text-game-ethan'

  const now = new Date()
  const todayStart  = startOfDay(now).toISOString()
  const weekStart   = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
  const monthStart  = startOfMonth(now).toISOString()

  function earned(after: string, currency: 'dollar' | 'quality_time') {
    return transactions
      .filter(t => t.currency === currency && t.type !== 'redeemed' && t.created_at >= after)
      .reduce((s, t) => s + t.amount, 0)
  }

  return (
    <Layout title="Point Bank">
      <div className="px-4 py-4 flex flex-col gap-5">

        {/* Dollar Bank */}
        <div className="card p-5 border-game-gold/40 bg-game-gold/5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">💰</span>
            <h2 className="font-game text-2xl text-game-gold">Dollar Bank</h2>
          </div>
          <p className={`font-num text-6xl ${accentClass}`}>
            {toDollars(balances.dollarBalance)}
          </p>
          <p className="text-game-text-dim text-sm mt-1">
            {balances.dollarBalance} pts · {toDollars(balances.dollarRedeemed)} spent
          </p>

          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { label: 'Today',  val: earned(todayStart,  'dollar') },
              { label: 'Week',   val: earned(weekStart,   'dollar') },
              { label: 'Month',  val: earned(monthStart,  'dollar') },
            ].map(s => (
              <div key={s.label} className="bg-game-border rounded-xl p-2 text-center">
                <p className="font-num text-lg text-game-gold">{toDollars(s.val)}</p>
                <p className="text-game-text-dim text-xs">{s.label}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate(`/kid/${username}/redeem?tab=dollar`)}
            className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
          >
            <Gift size={16} /> Redeem for Cash
          </button>
        </div>

        {/* Quality Time Bank */}
        <div className="card p-5 border-game-master/40 bg-game-master/5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">⭐</span>
            <h2 className="font-game text-2xl text-game-master">Activity Bank</h2>
          </div>
          <p className={`font-num text-6xl ${accentClass}`}>
            {balances.qualityBalance}
          </p>
          <p className="text-game-text-dim text-sm mt-1">
            pts · {activitiesAvailable(balances.qualityBalance)}
          </p>

          {/* Progress bar to next activity (240 pts) */}
          <div className="mt-3">
            <div className="flex justify-between text-xs font-bold text-game-text-dim mb-1">
              <span>Next activity</span>
              <span>{Math.min(balances.qualityBalance, 240)}/240 pts</span>
            </div>
            <div className="w-full bg-game-border rounded-full h-3">
              <div
                className="h-3 rounded-full bg-game-master transition-all"
                style={{ width: `${Math.min(100, (balances.qualityBalance / 240) * 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { label: 'Today',  val: earned(todayStart,  'quality_time') },
              { label: 'Week',   val: earned(weekStart,   'quality_time') },
              { label: 'Month',  val: earned(monthStart,  'quality_time') },
            ].map(s => (
              <div key={s.label} className="bg-game-border rounded-xl p-2 text-center">
                <p className="font-num text-lg text-game-master">{s.val}</p>
                <p className="text-game-text-dim text-xs">{s.label}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate(`/kid/${username}/redeem?tab=quality`)}
            className="w-full mt-4 py-3 rounded-xl font-bold bg-game-master/20 text-game-master border border-game-master/30 hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            <Gift size={16} /> Redeem for Activity
          </button>
        </div>

        {/* Transaction history */}
        <div>
          <h2 className="section-title mb-3">History</h2>
          {transactions.length === 0 ? (
            <p className="text-game-muted text-center py-8">No transactions yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {transactions.map(t => (
                <div key={t.id} className="card p-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-game-text">{t.description}</p>
                    <p className="text-game-text-dim text-xs">
                      {format(new Date(t.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`font-num text-lg ${t.type === 'redeemed' ? 'text-game-danger' : t.currency === 'dollar' ? 'text-game-gold' : 'text-game-master'}`}>
                      {t.type === 'redeemed' ? '-' : '+'}{t.amount}
                    </span>
                    <span className="text-xs">{t.currency === 'dollar' ? '💰' : '⭐'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
