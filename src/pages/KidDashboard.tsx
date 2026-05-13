import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Layout } from '../components/Layout'
import { TaskCard } from '../components/TaskCard'
import { DateNavigator } from '../components/DateNavigator'
import { calcBalances, toDollars } from '../lib/points'
import type { Task, TaskCompletion, PointTransaction, TaskCategory } from '../types'
import { Bell, CheckSquare, Square, Send } from 'lucide-react'

const CATEGORY_ORDER: TaskCategory[] = ['daily', 'weekly', 'adhoc']
const CATEGORY_LABELS: Record<TaskCategory, string> = {
  daily:  '📅 Daily Tasks',
  weekly: '📆 Weekly Tasks',
  adhoc:  '⚡ Special Tasks',
}

export function KidDashboard() {
  const { username } = useParams<{ username: string }>()
  const { user } = useAuth()
  const isOwn = user?.username === username

  const [tasks, setTasks] = useState<Task[]>([])
  const [completions, setCompletions] = useState<TaskCompletion[]>([])
  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [newApprovals, setNewApprovals] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'own' | 'sibling'>('own')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const viewUsername = activeTab === 'own' ? username! : (username === 'camden' ? 'ethan' : 'camden')
  const accentColor  = username === 'camden' ? 'game-camden' : 'game-ethan'
  const siblingName  = username === 'camden' ? 'Ethan' : 'Camden'

  useEffect(() => {
    fetchAll()
    const channel = supabase
      .channel('kid-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_completions' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'point_transactions' }, fetchTransactions)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [username])

  useEffect(() => { setSelectedTaskIds([]) }, [selectedDate])

  async function fetchAll() {
    setLoading(true)
    try {
      await Promise.all([fetchTasks(), fetchCompletions(), fetchTransactions()])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function fetchTasks() {
    const { data } = await supabase.from('tasks').select('*').eq('is_active', true).order('category')
    setTasks(data ?? [])
  }

  async function fetchCompletions() {
    const { data } = await supabase.from('task_completions').select('*').eq('kid_username', username)
    setCompletions(data ?? [])
  }

  async function fetchTransactions() {
    const { data } = await supabase.from('point_transactions').select('*').eq('kid_username', username)
    if (data) {
      setTransactions(data as PointTransaction[])
      const lastSeen = localStorage.getItem(`lastSeen_${username}`) ?? '1970-01-01'
      setNewApprovals(data.filter((t: PointTransaction) => t.type === 'earned' && t.created_at > lastSeen).length)
    }
  }

  function clearNotifications() {
    localStorage.setItem(`lastSeen_${username}`, new Date().toISOString())
    setNewApprovals(0)
  }

  const balances = calcBalances(transactions)

  function getCompletion(taskId: string, kidUser: string): TaskCompletion | undefined {
    const dateStr   = format(selectedDate, 'yyyy-MM-dd')
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }).toISOString()
    const weekEnd   = endOfWeek(selectedDate,   { weekStartsOn: 1 }).toISOString()
    const task      = tasks.find(t => t.id === taskId)
    if (!task) return undefined

    return completions
      .filter(c => c.task_id === taskId && c.kid_username === kidUser && c.status !== 'rejected')
      .find(c => {
        const compDate = c.completion_date
        if (task.category === 'daily')  return compDate ? compDate === dateStr : c.submitted_at.startsWith(dateStr)
        if (task.category === 'weekly') {
          const ref = compDate ? new Date(compDate).toISOString() : c.submitted_at
          return ref >= weekStart && ref <= weekEnd
        }
        return true
      })
  }

  const completionDates = [...new Set(
    completions.filter(c => c.status !== 'rejected')
      .map(c => c.completion_date ?? c.submitted_at.slice(0, 10))
  )]

  const visibleTasks = tasks.filter(t => t.assigned_to === viewUsername || t.assigned_to === 'both')
  const tasksByCategory = CATEGORY_ORDER
    .map(cat => ({ cat, tasks: visibleTasks.filter(t => t.category === cat) }))
    .filter(g => g.tasks.length > 0)

  function isAvailable(taskId: string): boolean {
    return isOwn && activeTab === 'own' && !getCompletion(taskId, username!)
  }

  function toggleSelect(taskId: string) {
    if (!isAvailable(taskId)) return
    setSelectedTaskIds(ids => ids.includes(taskId) ? ids.filter(id => id !== taskId) : [...ids, taskId])
  }

  function selectAll() {
    setSelectedTaskIds(visibleTasks.filter(t => isAvailable(t.id)).map(t => t.id))
  }

  async function submitSelected() {
    if (selectedTaskIds.length === 0) return
    setSubmitting(true)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    await supabase.from('task_completions').insert(
      selectedTaskIds.map(taskId => ({ task_id: taskId, kid_username: username, status: 'pending', completion_date: dateStr }))
    )
    setSelectedTaskIds([])
    setSubmitSuccess(true)
    setTimeout(() => setSubmitSuccess(false), 3000)
    await fetchCompletions()
    setSubmitting(false)
  }

  const availableCount = visibleTasks.filter(t => isAvailable(t.id)).length

  return (
    <Layout title={`${user?.display_name}'s Quest`}>
      {/* Dual balance header */}
      <div className="px-4 pt-4 pb-2 grid grid-cols-2 gap-3">
        <div className={`card p-3 border-game-gold/30 bg-game-gold/5`}>
          <p className="text-game-text-dim text-xs font-bold">💰 Dollar Bank</p>
          <p className={`font-num text-3xl text-${accentColor}`}>{toDollars(balances.dollarBalance)}</p>
        </div>
        <div className="card p-3 border-game-master/30 bg-game-master/5 relative">
          <p className="text-game-text-dim text-xs font-bold">⭐ Activity Bank</p>
          <p className={`font-num text-3xl text-${accentColor}`}>{balances.qualityBalance}<span className="text-base"> pts</span></p>
          {newApprovals > 0 && (
            <button onClick={clearNotifications} className="absolute top-2 right-2">
              <Bell size={16} className={`text-${accentColor}`} />
              <span className="absolute -top-1 -right-1 bg-game-danger text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {newApprovals}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2 flex gap-2">
        <button onClick={() => { setActiveTab('own'); setSelectedTaskIds([]) }}
          className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'own' ? `bg-${accentColor}/20 text-${accentColor} border border-${accentColor}/30` : 'text-game-muted bg-game-border'}`}>
          My Tasks
        </button>
        <button onClick={() => { setActiveTab('sibling'); setSelectedTaskIds([]) }}
          className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'sibling' ? 'bg-game-master/20 text-game-master border border-game-master/30' : 'text-game-muted bg-game-border'}`}>
          {siblingName}'s Tasks
        </button>
      </div>

      {/* Date navigator */}
      <div className="px-4 py-2">
        <DateNavigator selectedDate={selectedDate} onChange={setSelectedDate} completionDates={completionDates} accentColor={accentColor} />
      </div>

      {/* Batch controls */}
      {isOwn && activeTab === 'own' && availableCount > 0 && (
        <div className="px-4 py-1 flex items-center justify-between">
          <button onClick={selectAll} className="flex items-center gap-1.5 text-xs font-bold text-game-text-dim hover:text-game-text transition-colors">
            <CheckSquare size={14} /> Select All ({availableCount})
          </button>
          {selectedTaskIds.length > 0 && (
            <button onClick={() => setSelectedTaskIds([])} className="flex items-center gap-1.5 text-xs font-bold text-game-muted hover:text-game-text transition-colors">
              <Square size={14} /> Clear
            </button>
          )}
        </div>
      )}

      {submitSuccess && (
        <div className="mx-4 my-1 bg-game-success/10 border border-game-success/30 rounded-xl p-3 text-center">
          <p className="text-game-success font-bold text-sm">🎉 Tasks submitted for approval!</p>
        </div>
      )}

      {/* Task list */}
      <div className="px-4 pb-32 flex flex-col gap-6 mt-2">
        {tasksByCategory.length === 0 && (
          <div className="text-center py-16 text-game-muted">
            <p className="text-4xl mb-3">🎉</p>
            <p className="font-bold">No tasks yet!</p>
          </div>
        )}
        {tasksByCategory.map(({ cat, tasks: catTasks }) => (
          <div key={cat}>
            <h2 className="section-title mb-3">{CATEGORY_LABELS[cat]}</h2>
            <div className="flex flex-col gap-3">
              {catTasks.map(task => {
                const completion = getCompletion(task.id, viewUsername)
                const available  = isAvailable(task.id)
                const selected   = selectedTaskIds.includes(task.id)
                return (
                  <div key={task.id} onClick={() => available && toggleSelect(task.id)} className={available ? 'cursor-pointer' : ''}>
                    {isOwn && activeTab === 'own' && available && (
                      <div className={`card mb-[-8px] pb-4 pt-3 px-4 flex items-center gap-3 border-b-0 rounded-b-none transition-all ${selected ? `border-${accentColor}/60 bg-${accentColor}/10` : ''}`}>
                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${selected ? `bg-${accentColor} border-${accentColor}` : 'border-game-muted'}`}>
                          {selected && <span className="text-white text-xs font-bold">✓</span>}
                        </div>
                        <span className="text-xs font-bold text-game-text-dim">{selected ? 'Selected' : 'Tap to select'}</span>
                      </div>
                    )}
                    <TaskCard task={task} completion={completion} canComplete={false} viewOnly={activeTab === 'sibling' || !isOwn} selected={selected} accentColor={accentColor} />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Floating submit */}
      {selectedTaskIds.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-20 animate-pop">
          <button onClick={submitSelected} disabled={submitting} className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-3 shadow-glow-gold">
            <Send size={20} />
            {submitting ? 'Submitting…' : `Submit ${selectedTaskIds.length} Task${selectedTaskIds.length !== 1 ? 's' : ''} for Approval`}
          </button>
        </div>
      )}
    </Layout>
  )
}
