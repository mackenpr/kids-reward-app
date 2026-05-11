import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Layout } from '../components/Layout'
import type { Prize, RedemptionRequest } from '../types'
import { Gift, Clock, CheckCircle, XCircle } from 'lucide-react'

export function RedeemPoints() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()

  const [prizes, setPrizes] = useState<Prize[]>([])
  const [redemptions, setRedemptions] = useState<RedemptionRequest[]>([])
  const [balance, setBalance] = useState(0)
  const [customDesc, setCustomDesc] = useState('')
  const [customPoints, setCustomPoints] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [username])

  async function fetchAll() {
    setLoading(true)
    try {
      await Promise.all([fetchPrizes(), fetchRedemptions(), fetchBalance()])
    } catch (e) {
      console.error('fetchAll error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchPrizes() {
    const { data } = await supabase.from('prizes').select('*').eq('is_active', true).order('points_cost')
    setPrizes(data ?? [])
  }

  async function fetchRedemptions() {
    const { data } = await supabase
      .from('redemption_requests')
      .select('*')
      .eq('kid_username', username)
      .order('submitted_at', { ascending: false })
    setRedemptions(data ?? [])
  }

  async function fetchBalance() {
    const { data } = await supabase.from('point_transactions').select('amount, type').eq('kid_username', username)
    if (data) {
      const b = data.reduce((s, t) => s + (t.type === 'redeemed' ? -t.amount : t.amount), 0)
      setBalance(Math.max(0, b))
    }
  }

  async function submitRedemption(desc: string, pts: number) {
    if (pts > balance) {
      setError('Not enough points!')
      return
    }
    setSubmitting(true)
    setError('')
    const { error: err } = await supabase.from('redemption_requests').insert({
      kid_username: username,
      points_amount: pts,
      prize_description: desc,
      status: 'pending',
    })
    if (err) {
      setError(err.message)
    } else {
      setSuccess('Request sent! Waiting for Master to approve. 🎉')
      setCustomDesc('')
      setCustomPoints('')
      fetchRedemptions()
    }
    setSubmitting(false)
  }

  async function submitCustom(e: React.FormEvent) {
    e.preventDefault()
    const pts = parseInt(customPoints)
    if (!customDesc || isNaN(pts) || pts <= 0) { setError('Enter a description and valid points amount.'); return }
    await submitRedemption(customDesc, pts)
  }

  if (loading) {
    return <Layout title="Redeem Points"><div className="flex items-center justify-center h-64"><span className="text-4xl animate-bounce">🎁</span></div></Layout>
  }

  return (
    <Layout title="Redeem Points">
      <div className="px-4 py-4 flex flex-col gap-6">
        {/* Balance */}
        <div className="card p-4 text-center border-game-gold/30 bg-game-gold/5">
          <p className="text-game-text-dim text-xs font-bold uppercase tracking-widest">Available</p>
          <p className="font-game text-5xl text-game-gold">{balance.toLocaleString()} ⭐</p>
        </div>

        {success && (
          <div className="bg-game-success/10 border border-game-success/30 rounded-xl p-4">
            <p className="text-game-success font-bold text-center">{success}</p>
          </div>
        )}

        {/* Pre-set prizes */}
        {prizes.length > 0 && (
          <div>
            <h2 className="section-title mb-3 flex items-center gap-2"><Gift size={18} /> Prizes</h2>
            <div className="flex flex-col gap-3">
              {prizes.map(prize => {
                const cost = prize.prize_type === 'dollar' && prize.dollar_value
                  ? Math.round(prize.dollar_value * (balance > 0 ? 1 : 0))
                  : prize.points_cost ?? 0
                const canAfford = cost <= balance
                return (
                  <div key={prize.id} className={`card p-4 flex items-center justify-between gap-3 ${!canAfford ? 'opacity-50' : ''}`}>
                    <div className="flex-1">
                      <p className="font-bold text-game-text">{prize.name}</p>
                      {prize.description && <p className="text-game-text-dim text-sm">{prize.description}</p>}
                      {prize.prize_type === 'dollar' && prize.dollar_value && (
                        <p className="text-game-gold text-xs font-bold">${prize.dollar_value.toFixed(2)}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <span className="font-game text-xl text-game-gold">{cost} ⭐</span>
                      <button
                        disabled={!canAfford || submitting}
                        onClick={() => submitRedemption(prize.name, cost)}
                        className="btn-primary text-sm py-1.5 px-3 disabled:opacity-40"
                      >
                        Redeem
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Custom request */}
        <div>
          <h2 className="section-title mb-3">✏️ Custom Request</h2>
          <form onSubmit={submitCustom} className="card p-4 flex flex-col gap-3">
            <input
              className="input"
              placeholder="What do you want? (e.g. Movie night)"
              value={customDesc}
              onChange={e => setCustomDesc(e.target.value)}
            />
            <input
              className="input"
              type="number"
              placeholder="How many points?"
              value={customPoints}
              onChange={e => setCustomPoints(e.target.value)}
              min="1"
            />
            {error && <p className="text-game-danger text-sm font-bold">{error}</p>}
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Sending…' : 'Send Request 🚀'}
            </button>
          </form>
        </div>

        {/* Redemption history */}
        {redemptions.length > 0 && (
          <div>
            <h2 className="section-title mb-3">My Requests</h2>
            <div className="flex flex-col gap-2">
              {redemptions.map(r => (
                <div key={r.id} className="card p-3 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-bold text-sm text-game-text">{r.prize_description}</p>
                    <p className="text-game-gold text-xs font-bold">{r.points_amount} pts</p>
                  </div>
                  {r.status === 'pending'  && <div className="flex items-center gap-1 text-game-pending text-xs font-bold"><Clock size={14} />Pending</div>}
                  {r.status === 'approved' && <div className="flex items-center gap-1 text-game-success text-xs font-bold"><CheckCircle size={14} />Approved!</div>}
                  {r.status === 'rejected' && <div className="flex items-center gap-1 text-game-danger text-xs font-bold"><XCircle size={14} />Rejected</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
