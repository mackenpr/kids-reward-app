import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { CheckCircle, XCircle, CheckSquare, Square } from 'lucide-react'
import type { TaskCompletion, Task } from '../../types'

interface CompletionWithTask extends TaskCompletion {
  task: Task
}

export function TaskApprovals() {
  const [pending, setPending] = useState<CompletionWithTask[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({})
  const [batchRejectReason, setBatchRejectReason] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    fetchPending()
    const channel = supabase
      .channel('approvals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_completions' }, fetchPending)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchPending() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('task_completions')
        .select('*, task:tasks(*)')
        .eq('status', 'pending')
        .order('kid_username')
        .order('submitted_at', { ascending: true })
      setPending((data as CompletionWithTask[]) ?? [])
      setSelectedIds([])
    } catch (e) {
      console.error('fetchPending error:', e)
    } finally {
      setLoading(false)
    }
  }

  // --- Single approve ---
  async function approveSingle(completion: CompletionWithTask) {
    await supabase.from('task_completions')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', completion.id)
    await supabase.from('point_transactions').insert({
      kid_username: completion.kid_username,
      amount: completion.task.points,
      type: 'earned',
      description: `Completed: ${completion.task.title}`,
      related_completion_id: completion.id,
    })
  }

  // --- Single reject ---
  async function rejectSingle(completion: CompletionWithTask, reason?: string) {
    await supabase.from('task_completions')
      .update({ status: 'rejected', rejection_reason: reason || null })
      .eq('id', completion.id)
  }

  // --- Batch approve ---
  async function approveSelected() {
    if (selectedIds.length === 0) return
    setProcessing(true)
    const toApprove = pending.filter(c => selectedIds.includes(c.id))
    await Promise.all(toApprove.map(c => approveSingle(c)))
    setSuccessMsg(`✅ Approved ${toApprove.length} task${toApprove.length !== 1 ? 's' : ''}!`)
    setTimeout(() => setSuccessMsg(''), 3000)
    await fetchPending()
    setProcessing(false)
  }

  // --- Batch reject ---
  async function rejectSelected() {
    if (selectedIds.length === 0) return
    setProcessing(true)
    const toReject = pending.filter(c => selectedIds.includes(c.id))
    await Promise.all(toReject.map(c => rejectSingle(c, batchRejectReason)))
    setBatchRejectReason('')
    await fetchPending()
    setProcessing(false)
  }

  // --- Approve all ---
  async function approveAll() {
    setProcessing(true)
    await Promise.all(pending.map(c => approveSingle(c)))
    setSuccessMsg(`✅ Approved all ${pending.length} tasks!`)
    setTimeout(() => setSuccessMsg(''), 3000)
    await fetchPending()
    setProcessing(false)
  }

  function toggleSelect(id: string) {
    setSelectedIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id])
  }
  function selectAll() { setSelectedIds(pending.map(c => c.id)) }
  function selectNone() { setSelectedIds([]) }

  const allSelected = selectedIds.length === pending.length && pending.length > 0
  const kidColor = (u: string) => u === 'camden' ? 'text-game-camden' : 'text-game-ethan'
  const kidEmoji = (u: string) => u === 'camden' ? '⚔️' : '⚡'

  if (loading) {
    return (
      <Layout title="Task Approvals">
        <div className="flex items-center justify-center h-64"><span className="text-4xl animate-bounce">⏳</span></div>
      </Layout>
    )
  }

  return (
    <Layout title="Task Approvals">
      <div className="px-4 py-4 flex flex-col gap-4">
        {pending.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🎉</p>
            <p className="font-bold text-game-text text-lg">All caught up!</p>
            <p className="text-game-text-dim">No pending task approvals.</p>
          </div>
        ) : (
          <>
            {/* Success message */}
            {successMsg && (
              <div className="bg-game-success/10 border border-game-success/30 rounded-xl p-3 text-center">
                <p className="text-game-success font-bold">{successMsg}</p>
              </div>
            )}

            {/* Batch controls */}
            <div className="card p-4 flex flex-col gap-3 border-game-gold/30 bg-game-gold/5">
              <div className="flex items-center justify-between">
                <span className="text-game-text-dim text-sm font-bold">
                  {pending.length} pending · {selectedIds.length} selected
                </span>
                <button
                  onClick={allSelected ? selectNone : selectAll}
                  className="flex items-center gap-1.5 text-sm font-bold text-game-gold hover:brightness-125 transition-all"
                >
                  {allSelected
                    ? <><Square size={16} /> Deselect All</>
                    : <><CheckSquare size={16} /> Select All</>
                  }
                </button>
              </div>

              {/* Batch reject reason */}
              {selectedIds.length > 0 && (
                <input
                  className="input text-sm py-2"
                  placeholder="Rejection reason for selected (optional)"
                  value={batchRejectReason}
                  onChange={e => setBatchRejectReason(e.target.value)}
                />
              )}

              {/* Batch action buttons */}
              <div className="flex gap-2 flex-wrap">
                {selectedIds.length > 0 && (
                  <>
                    <button
                      onClick={approveSelected}
                      disabled={processing}
                      className="btn-success flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle size={16} />
                      Approve {selectedIds.length}
                    </button>
                    <button
                      onClick={rejectSelected}
                      disabled={processing}
                      className="btn-danger flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      Reject {selectedIds.length}
                    </button>
                  </>
                )}
                {selectedIds.length === 0 && pending.length > 0 && (
                  <button
                    onClick={approveAll}
                    disabled={processing}
                    className="btn-success w-full flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle size={16} />
                    Approve All ({pending.length})
                  </button>
                )}
              </div>
            </div>

            {/* Individual completions */}
            {pending.map(c => {
              const isSelected = selectedIds.includes(c.id)
              const compDate = (c as any).completion_date as string | undefined

              return (
                <div
                  key={c.id}
                  onClick={() => toggleSelect(c.id)}
                  className={`card p-4 flex flex-col gap-3 cursor-pointer transition-all
                              ${isSelected ? 'border-game-gold/60 bg-game-gold/5' : 'hover:brightness-110'}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all
                                      ${isSelected ? 'bg-game-gold border-game-gold' : 'border-game-muted'}`}>
                      {isSelected && <span className="text-black text-xs font-bold">✓</span>}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-game text-lg ${kidColor(c.kid_username)}`}>
                          {kidEmoji(c.kid_username)} {c.kid_username === 'camden' ? 'Camden' : 'Ethan'}
                        </span>
                        <div className="text-right">
                          <p className="font-game text-2xl text-game-gold">{c.task.points}</p>
                          <p className="text-game-text-dim text-xs">pts</p>
                        </div>
                      </div>
                      <p className="font-bold text-game-text mt-0.5">{c.task.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-game-text-dim">
                        <span className="capitalize">{c.task.category}</span>
                        {compDate && <span>· For: {format(new Date(compDate + 'T00:00:00'), 'EEE d MMM')}</span>}
                        <span>· Submitted: {format(new Date(c.submitted_at), 'MMM d, h:mm a')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Individual reject reason (only shown when not batch-selecting) */}
                  {selectedIds.length === 0 && (
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <input
                        className="input text-sm py-2 flex-1"
                        placeholder="Rejection reason (optional)"
                        value={rejectReason[c.id] ?? ''}
                        onChange={e => setRejectReason(r => ({ ...r, [c.id]: e.target.value }))}
                      />
                      <button
                        onClick={async (e) => { e.stopPropagation(); setProcessing(true); await approveSingle(c); await fetchPending(); setProcessing(false) }}
                        disabled={processing}
                        className="btn-success px-3 disabled:opacity-50"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        onClick={async (e) => { e.stopPropagation(); setProcessing(true); await rejectSingle(c, rejectReason[c.id]); await fetchPending(); setProcessing(false) }}
                        disabled={processing}
                        className="btn-danger px-3 disabled:opacity-50"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
    </Layout>
  )
}
