import { useEffect, useState } from 'react'
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { Download } from 'lucide-react'
import type { PointTransaction, TaskCompletion, Task } from '../../types'
import * as XLSX from 'xlsx'

interface CompletionWithTask extends TaskCompletion { task?: Task }

export function Reports() {
  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [completions, setCompletions] = useState<CompletionWithTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: txns }, { data: comps }] = await Promise.all([
      supabase.from('point_transactions').select('*').order('created_at', { ascending: false }),
      supabase.from('task_completions').select('*, task:tasks(*)').order('submitted_at', { ascending: false }),
    ])
    setTransactions(txns ?? [])
    setCompletions((comps as CompletionWithTask[]) ?? [])
    setLoading(false)
  }

  function exportToExcel() {
    const wb = XLSX.utils.book_new()

    // Sheet 1: Point Transactions
    const txnRows = transactions.map(t => ({
      Date: format(new Date(t.created_at), 'yyyy-MM-dd HH:mm'),
      Kid: t.kid_username,
      Type: t.type,
      Points: t.amount,
      Description: t.description,
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txnRows), 'Point Transactions')

    // Sheet 2: Task Completions
    const compRows = completions.map(c => ({
      Date: format(new Date(c.submitted_at), 'yyyy-MM-dd HH:mm'),
      Kid: c.kid_username,
      Task: c.task?.title ?? c.task_id,
      Category: c.task?.category ?? '',
      Points: c.task?.points ?? '',
      Status: c.status,
      'Approved At': c.approved_at ? format(new Date(c.approved_at), 'yyyy-MM-dd HH:mm') : '',
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(compRows), 'Task Completions')

    // Sheet 3: Summary by kid
    const kids = ['camden', 'ethan'] as const
    const summaryRows = kids.map(kid => {
      const kidTxns = transactions.filter(t => t.kid_username === kid)
      const earned   = kidTxns.filter(t => t.type !== 'redeemed').reduce((s, t) => s + t.amount, 0)
      const redeemed = kidTxns.filter(t => t.type === 'redeemed').reduce((s, t) => s + t.amount, 0)
      const kidComps = completions.filter(c => c.kid_username === kid)
      return {
        Kid: kid,
        'Total Earned': earned,
        'Total Redeemed': redeemed,
        Balance: Math.max(0, earned - redeemed),
        'Tasks Submitted': kidComps.length,
        'Tasks Approved': kidComps.filter(c => c.status === 'approved').length,
        'Tasks Rejected': kidComps.filter(c => c.status === 'rejected').length,
      }
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary')

    XLSX.writeFile(wb, `family-quest-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
  }

  // Stats helpers
  function kidEarned(kid: string) {
    return transactions.filter(t => t.kid_username === kid && t.type !== 'redeemed').reduce((s, t) => s + t.amount, 0)
  }
  function kidBalance(kid: string) {
    const earned   = transactions.filter(t => t.kid_username === kid && t.type !== 'redeemed').reduce((s, t) => s + t.amount, 0)
    const redeemed = transactions.filter(t => t.kid_username === kid && t.type === 'redeemed').reduce((s, t) => s + t.amount, 0)
    return Math.max(0, earned - redeemed)
  }

  // Last 4 weeks for chart
  const weeks = [0,1,2,3].map(i => {
    const base = subWeeks(new Date(), i)
    const start = startOfWeek(base, { weekStartsOn: 1 }).toISOString()
    const end   = endOfWeek(base, { weekStartsOn: 1 }).toISOString()
    return {
      label: `W${format(base, 'w')}`,
      camden: transactions.filter(t => t.kid_username === 'camden' && t.type !== 'redeemed' && t.created_at >= start && t.created_at <= end).reduce((s,t) => s+t.amount, 0),
      ethan:  transactions.filter(t => t.kid_username === 'ethan'  && t.type !== 'redeemed' && t.created_at >= start && t.created_at <= end).reduce((s,t) => s+t.amount, 0),
    }
  }).reverse()

  const maxWeekPts = Math.max(...weeks.flatMap(w => [w.camden, w.ethan]), 1)

  if (loading) {
    return <Layout title="Reports"><div className="flex items-center justify-center h-64"><span className="text-4xl animate-bounce">📊</span></div></Layout>
  }

  return (
    <Layout title="Reports">
      <div className="px-4 py-4 flex flex-col gap-5">
        {/* Export button */}
        <button onClick={exportToExcel} className="btn-primary flex items-center justify-center gap-2">
          <Download size={18} /> Export to Excel
        </button>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { kid: 'camden', name: 'Camden', emoji: '⚔️', color: 'game-camden' },
            { kid: 'ethan',  name: 'Ethan',  emoji: '⚡', color: 'game-ethan' },
          ].map(k => (
            <div key={k.kid} className={`card p-4 border-${k.color}/30`}>
              <div className="flex items-center gap-2 mb-2">
                <span>{k.emoji}</span>
                <span className={`font-game text-lg text-${k.color}`}>{k.name}</span>
              </div>
              <p className={`font-game text-3xl text-${k.color}`}>{kidBalance(k.kid).toLocaleString()}</p>
              <p className="text-game-text-dim text-xs">balance</p>
              <p className="text-game-success text-sm font-bold mt-1">+{kidEarned(k.kid)} earned</p>
            </div>
          ))}
        </div>

        {/* Weekly chart */}
        <div>
          <h2 className="section-title mb-3">📈 Weekly Points (last 4 weeks)</h2>
          <div className="card p-4">
            <div className="flex items-end gap-3 h-32">
              {weeks.map(w => (
                <div key={w.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-1 items-end h-24">
                    <div
                      className="flex-1 bg-game-camden/70 rounded-t transition-all"
                      style={{ height: `${(w.camden / maxWeekPts) * 96}px`, minHeight: w.camden > 0 ? '4px' : '0' }}
                      title={`Camden: ${w.camden}`}
                    />
                    <div
                      className="flex-1 bg-game-ethan/70 rounded-t transition-all"
                      style={{ height: `${(w.ethan / maxWeekPts) * 96}px`, minHeight: w.ethan > 0 ? '4px' : '0' }}
                      title={`Ethan: ${w.ethan}`}
                    />
                  </div>
                  <span className="text-game-text-dim text-xs font-bold">{w.label}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-3 justify-center">
              <span className="flex items-center gap-1 text-xs font-bold text-game-camden"><span className="w-3 h-3 rounded bg-game-camden/70 inline-block"/>Camden</span>
              <span className="flex items-center gap-1 text-xs font-bold text-game-ethan"><span className="w-3 h-3 rounded bg-game-ethan/70 inline-block"/>Ethan</span>
            </div>
          </div>
        </div>

        {/* Task completion stats */}
        <div>
          <h2 className="section-title mb-3">Task Stats</h2>
          <div className="flex flex-col gap-2">
            {['camden','ethan'].map(kid => {
              const kidComps = completions.filter(c => c.kid_username === kid)
              const approved = kidComps.filter(c => c.status === 'approved').length
              const rate = kidComps.length > 0 ? Math.round((approved / kidComps.length) * 100) : 0
              const color = kid === 'camden' ? 'bg-game-camden' : 'bg-game-ethan'
              const textColor = kid === 'camden' ? 'text-game-camden' : 'text-game-ethan'
              return (
                <div key={kid} className="card p-4">
                  <div className="flex justify-between mb-2">
                    <span className={`font-bold ${textColor} capitalize`}>{kid}</span>
                    <span className="text-game-text-dim text-sm">{approved}/{kidComps.length} approved ({rate}%)</span>
                  </div>
                  <div className="w-full bg-game-border rounded-full h-3">
                    <div className={`h-3 rounded-full ${color} transition-all`} style={{ width: `${rate}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent transactions */}
        <div>
          <h2 className="section-title mb-3">Recent Transactions</h2>
          <div className="flex flex-col gap-2">
            {transactions.slice(0, 20).map(t => (
              <div key={t.id} className="card p-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-game-text">{t.description}</p>
                  <p className="text-game-text-dim text-xs capitalize">{t.kid_username} · {format(new Date(t.created_at), 'MMM d')}</p>
                </div>
                <span className={`font-game text-lg ${t.type === 'redeemed' ? 'text-game-danger' : 'text-game-success'}`}>
                  {t.type === 'redeemed' ? '-' : '+'}{t.amount}⭐
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
