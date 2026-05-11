import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { startOfDay, startOfWeek, startOfMonth, format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { Layout } from '../components/Layout'
import type { PointTransaction } from '../types'
import { TrendingUp, Gift } from 'lucide-react'

export function PointBank() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchTransactions()
  }, [username])

  async function fetchTransactions() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('kid_username', username)
        .order('created_at', { ascending: false })
      setTransactions(data ?? [])
    } catch (e) {
      console.error('fetchTransactions error:', e)
    } finally {
      setLoading(false)
    }
  }

  const now = new Date()
  const todayStart  = startOfDay(now).toISOString()
  const weekStart   = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
  const monthStart  = startOfMonth(now).toISOString()

  function sumInRange(after: string, types: string[]) {
    return transactions
      .filter(t => t.created_at >= after && types.includes(t.type))
      .reduce((s, t) => s + t.amount, 0)
  }

  const totalEarned   = transactions.filter(t => t.type !== 'redeemed').reduce((s, t) => s + t.amount, 0)
  const totalRedeemed = transactions.filter(t => t.type === 'redeemed').reduce((s, t) => s + t.amount, 0)
  const balance       = Math.max(0, totalEarned - totalRedeemed)

  const todayEarned  = sumInRange(todayStart,  ['earned', 'bonus'])
  const weekEarned   = sumInRange(weekStart,   ['earned', 'bonus'])
  const monthEarned  = sumInRange(monthStart,  ['earned', 'bonus'])

  const accentClass = username === 'camden' ? 'text-game-camden' : 'text-game-ethan'
  const glowClass   = username === 'camden' ? 'shadow-glow-blue' : 'shadow-glow-green'

  if (loading) {
    return (
      <Layout title="Point Bank">
        <div className="flex items-center justify-center h-64">
          <span className="text-4xl animate-bounce">⭐</span>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Point Bank">
      <div className="px-4 py-4 flex flex-col gap-5">
        {/* Balance */}
        <div className={`card p-6 text-center bg-gradient-to-b from-game-gold/10 to-transparent border-game-gold/30 ${glowClass}`}>
          <p className="text-game-text-dim text-xs font-bold uppercase tracking-widest mb-1">Current Balance</p>
          <p className={`font-game text-7xl ${accentClass} drop-shadow-lg`}>
            {balance.toLocaleString()}
          </p>
          <p className="text-game-gold text-2xl mt-1">⭐ points</p>
          <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-game-border">
            <div className="text-center">
              <p className="text-game-success font-bold">{totalEarned.toLocaleString()}</p>
              <p className="text-game-text-dim text-xs">Total Earned</p>
            </div>
            <div className="text-center">
              <p className="text-game-danger font-bold">{totalRedeemed.toLocaleString()}</p>
              <p className="text-game-text-dim text-xs">Redeemed</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div>
          <h2 className="section-title mb-3 flex items-center gap-2">
            <TrendingUp size={18} /> Earnings
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Today',  value: todayEarned },
              { label: 'Week',   value: weekEarned },
              { label: 'Month',  value: monthEarned },
            ].map(s => (
              <div key={s.label} className="card p-3 text-center">
                <p className={`font-game text-2xl ${accentClass}`}>{s.value}</p>
                <p className="text-game-text-dim text-xs font-bold">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Redeem button */}
        <button
          onClick={() => navigate(`/kid/${username}/redeem`)}
          className="btn-primary flex items-center justify-center gap-2 text-lg py-4"
        >
          <Gift size={20} /> Redeem Points
        </button>

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
                  <span className={`font-game text-xl ${
                    t.type === 'redeemed' ? 'text-game-danger' : 'text-game-success'
                  }`}>
                    {t.type === 'redeemed' ? '-' : '+'}{t.amount} ⭐
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
