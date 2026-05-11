import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Layout } from '../components/Layout'
import { calcBalances, toDollars } from '../lib/points'
import type { Prize, RedemptionRequest, PointTransaction, Currency } from '../types'
import { Clock, CheckCircle, XCircle } from 'lucide-react'

export function RedeemPoints() {
  const { username } = useParams<{ username: string }>()
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'quality' ? 'quality_time' : 'dollar'

  const [tab, setTab] = useState<Currency>(initialTab as Currency)
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [redemptions, setRedemptions] = useState<RedemptionRequest[]>([])
  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [customDesc, setCustomDesc] = useState('')
  const [customPoints, setCustomPoints] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchAll() }, [username])

  async function fetchAll() {
    setLoading(true)
    try {
      await Promise.all([fetchPrizes(), fetchRedemptions(), fetchTransactions()])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function fetchPrizes() {
    const { data } = await supabase.from('prizes').select('*').eq('is_active', true).order('points_cost')
    setPrizes((data as Prize[]) ?? [])
  }

  async function fetchRedemptions() {
    const { data } = await supabase
      .from('redemption_requests').select('*')
      .eq('kid_username', username).order('submitted_at', { ascending: false })
    setRedemptions((data as RedemptionRequest[]) ?? [])
  }

  async function fetchTransactions() {
    const { data } = await supabase.from('point_transactions').select('amount, type, currency').eq('kid_username', username)
    setTransactions((data as PointTransaction[]) ?? [])
  }

  const balances = calcBalances(transactions)
  const currentBalance = tab === 'dollar' ? balances.dollarBalance : balances.qualityBalance

  async function submitRedemption(desc: string, pts: number) {
    if (pts > currentBalance) { setError('Not enough points!'); return }
    setSubmitting(true)
    setError('')
    const { error: err } = await supabase.from('redemption_requests').insert({
      kid_username: username,
      points_amount: pts,
      prize_description: desc,
      currency: tab,
      status: 'pending',
    })
    if (err) { setError(err.message) } else {
      setSuccess(tab === 'dollar'
        ? `💰 Request for ${toDollars(pts)} sent to Master!`
        : `⭐ Request for "${desc}" sent to Master!`)
      setCustomDesc('')
      setCustomPoints('')
      fetchRedemptions()
    }
    setSubmitting(false)
  }

  async function submitCustom(e: React.FormEvent) {
    e.preventDefault()
    const pts = parseInt(customPoints)
    if (!customDesc || isNaN(pts) || pts <= 0) { setError('Enter a description and valid amount.'); return }
    await submitRedemption(customDesc, pts)
  }

  const tabPrizes = prizes.filter(p => (p.currency ?? 'dollar') === tab)
  const tabRedemptions = redemptions.filter(r => (r.currency ?? 'dollar') === tab)

  const accentClass = tab === 'dollar' ? 'text-game-gold' : 'text-game-master'
  const borderClass = tab === 'dollar' ? 'border-game-gold/40 bg-game-gold/5' : 'border-game-master/40 bg-game-master/5'
  const btnClass    = tab === 'dollar'
    ? 'btn-primary'
    : 'py-3 px-6 rounded-xl font-bold bg-game-master/20 text-game-master border border-game-master/30 hover:brightness-110 transition-all active:scale-95'

  return (
    <Layout title="Redeem Points">
      <div className="px-4 py-4 flex flex-col gap-5">

        {/* Tab switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => { setTab('dollar'); setError(''); setSuccess('') }}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              tab === 'dollar' ? 'bg-game-gold/20 text-game-gold border border-game-gold/40' : 'bg-game-border text-game-muted'
            }`}
          >
            💰 Dollar ({toDollars(balances.dollarBalance)})
          </button>
          <button
            onClick={() => { setTab('quality_time'); setError(''); setSuccess('') }}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              tab === 'quality_time' ? 'bg-game-master/20 text-game-master border border-game-master/40' : 'bg-game-border text-game-muted'
            }`}
          >
            ⭐ Activity ({balances.qualityBalance} pts)
          </button>
        </div>

        {/* Balance */}
        <div className={`card p-4 text-center ${borderClass}`}>
          <p className="text-game-text-dim text-xs font-bold uppercase tracking-widest">
            {tab === 'dollar' ? 'Dollar Balance' : 'Activity Points'}
          </p>
          <p className={`font-game text-5xl ${accentClass} mt-1`}>
            {tab === 'dollar' ? toDollars(currentBalance) : `${currentBalance} pts`}
          </p>
        </div>

        {success && (
          <div className="bg-game-success/10 border border-game-success/30 rounded-xl p-4">
            <p className="text-game-success font-bold text-center">{success}</p>
          </div>
        )}

        {/* Prizes for this tab */}
        {tabPrizes.length > 0 && (
          <div>
            <h2 className={`section-title mb-3 ${accentClass}`}>
              {tab === 'dollar' ? '💰 Cash Prizes' : '⭐ Activities'}
            </h2>
            <div className="flex flex-col gap-3">
              {tabPrizes.map(prize => {
                const cost = prize.points_cost ?? 0
                const canAfford = cost <= currentBalance
                return (
                  <div key={prize.id} className={`card p-4 flex items-center justify-between gap-3 ${!canAfford ? 'opacity-50' : ''}`}>
                    <div className="flex-1">
                      <p className="font-bold text-game-text">{prize.name}</p>
                      {prize.description && <p className="text-game-text-dim text-sm">{prize.description}</p>}
                      {tab === 'dollar' && prize.points_cost && (
                        <p className="text-game-gold text-xs font-bold mt-1">{toDollars(prize.points_cost)}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <span className={`font-game text-xl ${accentClass}`}>{cost} pts</span>
                      <button
                        disabled={!canAfford || submitting}
                        onClick={() => submitRedemption(prize.name, cost)}
                        className={`${btnClass} text-sm py-1.5 px-3 disabled:opacity-40`}
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
          <h2 className={`section-title mb-3 ${accentClass}`}>✏️ Custom Request</h2>
          <form onSubmit={submitCustom} className="card p-4 flex flex-col gap-3">
            <input className="input" placeholder={tab === 'dollar' ? 'What would you like? (e.g. Save $5)' : 'What activity? (e.g. Baking with Mum)'} value={customDesc} onChange={e => setCustomDesc(e.target.value)} />
            <input className="input" type="number" placeholder="How many points?" value={customPoints} onChange={e => setCustomPoints(e.target.value)} min="1" />
            {error && <p className="text-game-danger text-sm font-bold">{error}</p>}
            <button type="submit" disabled={submitting} className={btnClass}>
              {submitting ? 'Sending…' : 'Send Request 🚀'}
            </button>
          </form>
        </div>

        {/* Request history for this tab */}
        {tabRedemptions.length > 0 && (
          <div>
            <h2 className="section-title mb-3">My Requests</h2>
            <div className="flex flex-col gap-2">
              {tabRedemptions.map(r => (
                <div key={r.id} className="card p-3 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-bold text-sm text-game-text">{r.prize_description}</p>
                    <p className={`text-xs font-bold ${accentClass}`}>{r.points_amount} pts</p>
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
