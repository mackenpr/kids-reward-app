import { Star, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import type { Task, TaskCompletion } from '../types'

interface TaskCardProps {
  task: Task
  completion?: TaskCompletion
  canComplete: boolean
  onComplete?: () => void
  loading?: boolean
  viewOnly?: boolean
}

const categoryColors: Record<string, string> = {
  daily:  'text-game-camden border-game-camden/30 bg-game-camden/10',
  weekly: 'text-game-master border-game-master/30 bg-game-master/10',
  adhoc:  'text-game-gold   border-game-gold/30   bg-game-gold/10',
}

const categoryLabels: Record<string, string> = {
  daily:  '📅 Daily',
  weekly: '📆 Weekly',
  adhoc:  '⚡ Special',
}

export function TaskCard({ task, completion, canComplete, onComplete, loading, viewOnly }: TaskCardProps) {
  const status = completion?.status

  return (
    <div className={`card p-4 flex flex-col gap-3 transition-all ${
      status === 'approved' ? 'opacity-60' : ''
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${categoryColors[task.category]}`}>
              {categoryLabels[task.category]}
            </span>
          </div>
          <h3 className="font-bold text-game-text text-base leading-tight">{task.title}</h3>
          {task.description && (
            <p className="text-game-text-dim text-sm mt-1">{task.description}</p>
          )}
        </div>

        {/* Points badge */}
        <div className="flex flex-col items-center justify-center bg-game-gold/10 border border-game-gold/30 rounded-xl px-3 py-2 min-w-[60px]">
          <Star size={14} className="text-game-gold" fill="currentColor" />
          <span className="font-game text-game-gold text-lg leading-tight">{task.points}</span>
          <span className="text-game-gold text-xs">pts</span>
        </div>
      </div>

      {/* Status / action */}
      {!viewOnly && (
        <div>
          {status === 'approved' && (
            <div className="flex items-center gap-2 text-game-success text-sm font-bold">
              <CheckCircle size={16} /> Done & Approved!
            </div>
          )}
          {status === 'pending' && (
            <div className="flex items-center gap-2 text-game-pending text-sm font-bold">
              <Clock size={16} /> Waiting for approval…
            </div>
          )}
          {status === 'rejected' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-game-danger text-sm font-bold">
                <XCircle size={16} /> Rejected
              </div>
              {completion?.rejection_reason && (
                <p className="text-xs text-game-text-dim">{completion.rejection_reason}</p>
              )}
              {canComplete && (
                <button
                  onClick={onComplete}
                  disabled={loading}
                  className="btn-primary text-sm py-2"
                >
                  Try Again
                </button>
              )}
            </div>
          )}
          {!status && canComplete && (
            <button
              onClick={onComplete}
              disabled={loading}
              className="w-full btn-primary text-sm py-2 disabled:opacity-50"
            >
              {loading ? 'Submitting…' : '✅ Mark Complete'}
            </button>
          )}
          {!status && !canComplete && (
            <div className="flex items-center gap-2 text-game-muted text-sm">
              <AlertCircle size={14} /> Not your task
            </div>
          )}
        </div>
      )}
    </div>
  )
}
