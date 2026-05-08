import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { CheckCircle, XCircle } from 'lucide-react'
import type { TaskCompletion, Task } from '../../types'

interface CompletionWithTask extends TaskCompletion {
  task: Task
}

export function TaskApprovals() {
  const [pending, setPending] = useState<CompletionWithTask[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({})

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
    const { data } = await supabase
      .from('task_completions')
      .select('*, task:tasks(*)')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true })
    setPending((data as CompletionWithTask[]) ?? [])
    setLoading(false)
  }

  async function approve(completion: CompletionWithTask) {
    setProcessing(completion.id)

    const { error: updateErr } = await supabase
      .from('task_completions')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', completion.id)

    if (!updateErr) {
      await supabase.from('point_transactions').insert({
        kid_username: completion.kid_username,
        amount: completion.task.points,
        type: 'earned',
        description: `Completed: ${completion.task.title}`,
        related_completion_id: completion.id,
      })
    }

    await fetchPending()
    setProcessing(null)
  }

  async function reject(completion: CompletionWithTask) {
    setProcessing(completion.id)
    const reason = rejectReason[completion.id] ?? ''

    await supabase
      .from('task_completions')
      .update({ status: 'rejected', rejection_reason: reason || null })
      .eq('id', completion.id)

    setRejectReason(r => { const n = { ...r }; delete n[completion.id]; return n })
    await fetchPending()
    setProcessing(null)
  }

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
            <p className="text-game-text-dim text-sm font-bold">{pending.length} waiting for approval</p>
            {pending.map(c => (
              <div key={c.id} className="card p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-game text-lg ${c.kid_username === 'camden' ? 'text-game-camden' : 'text-game-ethan'}`}>
                        {c.kid_username === 'camden' ? '⚔️ Camden' : '⚡ Ethan'}
                      </span>
                    </div>
                    <p className="font-bold text-game-text">{c.task.title}</p>
                    <p className="text-game-text-dim text-sm capitalize">{c.task.category} task</p>
                    <p className="text-game-text-dim text-xs mt-1">
                      Submitted {format(new Date(c.submitted_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-game text-2xl text-game-gold">{c.task.points}</p>
                    <p className="text-game-text-dim text-xs">pts</p>
                  </div>
                </div>

                <input
                  className="input text-sm py-2"
                  placeholder="Rejection reason (optional)"
                  value={rejectReason[c.id] ?? ''}
                  onChange={e => setRejectReason(r => ({ ...r, [c.id]: e.target.value }))}
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => approve(c)}
                    disabled={processing === c.id}
                    className="btn-success flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle size={16} /> Approve
                  </button>
                  <button
                    onClick={() => reject(c)}
                    disabled={processing === c.id}
                    className="btn-danger flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </Layout>
  )
}
