import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { CheckCircle, XCircle } from 'lucide-react'
import type { RedemptionRequest } from '../../types'

export function RedemptionApprovals() {
  const [pending, setPending] = useState<RedemptionRequest[]>([])
  const [history, setHistory] = useState<RedemptionRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchAll()

    const channel = supabase
      .channel('redemptions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'redemption_requests' }, fetchAll)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase
      .from('redemption_requests')
      .select('*')
      .order('submitted_at', { ascending: false })
    const all = (data ?? []) as RedemptionRequest[]
    setPending(all.filter(r => r.status === 'pending'))
    setHistory(all.filter(r => r.status !== 'pending'))
    setLoading(false)
  }

  async function approve(r: RedemptionRequest) {
    setProcessing(r.id)

    const { error: updateErr } = await supabase
      .from('redemption_requests')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', r.id)

    if (!updateErr) {
      await supabase.from('point_transactions').insert({
        kid_username: r.kid_username,
        amount: r.points_amount,
        type: 'redeemed',
        description: `Redeemed: ${r.prize_description}`,
        related_redemption_id: r.id,
      })
    }

    await fetchAll()
    setProcessing(null)
  }

  async function reject(r: RedemptionRequest) {
    setProcessing(r.id)
    const reason = rejectReason[r.id] ?? ''
    await supabase
      .from('redemption_requests')
      .update({ status: 'rejected', rejection_reason: reason || null })
      .eq('id', r.id)
    setRejectReason(prev => { const n = { ...prev }; delete n[r.id]; return n })
    await fetchAll()
    setProcessing(null)
  }

  const kidColor = (username: string) => username === 'camden' ? 'text-game-camden' : 'text-game-ethan'
  const kidEmoji = (username: string) => username === 'camden' ? '⚔️' : '⚡'

  if (loading) {
    return <Layout title="Redemptions"><div className="flex items-center justify-center h-64"><span className="text-4xl animate-bounce">🎁</span></div></Layout>
  }

  return (
    <Layout title="Redemptions">
      <div className="px-4 py-4 flex flex-col gap-5">
        {/* Pending */}
        <div>
          <h2 className="section-title mb-3">Pending ({pending.length})</h2>
          {pending.length === 0 ? (
            <p className="text-game-muted text-center py-8 card">No pending redemptions 🎉</p>
          ) : (
            <div className="flex flex-col gap-3">
              {pending.map(r => (
                <div key={r.id} className="card p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`font-game text-lg ${kidColor(r.kid_username)}`}>
                        {kidEmoji(r.kid_username)} {r.kid_username === 'camden' ? 'Camden' : 'Ethan'}
                      </span>
                      <p className="font-bold text-game-text mt-1">{r.prize_description}</p>
                      <p className="text-game-text-dim text-xs">{format(new Date(r.submitted_at), 'MMM d, h:mm a')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-game text-2xl text-game-gold">{r.points_amount}</p>
                      <p className="text-game-text-dim text-xs">pts</p>
                    </div>
                  </div>

                  <input
                    className="input text-sm py-2"
                    placeholder="Rejection reason (optional)"
                    value={rejectReason[r.id] ?? ''}
                    onChange={e => setRejectReason(prev => ({ ...prev, [r.id]: e.target.value }))}
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={() => approve(r)}
                      disabled={processing === r.id}
                      className="btn-success flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle size={16} /> Approve
                    </button>
                    <button
                      onClick={() => reject(r)}
                      disabled={processing === r.id}
                      className="btn-danger flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div>
            <h2 className="section-title mb-3">History</h2>
            <div className="flex flex-col gap-2">
              {history.map(r => (
                <div key={r.id} className="card p-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${kidColor(r.kid_username)}`}>{kidEmoji(r.kid_username)} {r.kid_username}</span>
                      <span className={r.status === 'approved' ? 'badge-approved' : 'badge-rejected'}>
                        {r.status}
                      </span>
                    </div>
                    <p className="font-bold text-sm text-game-text truncate">{r.prize_description}</p>
                  </div>
                  <span className="font-game text-game-gold">{r.points_amount}⭐</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
