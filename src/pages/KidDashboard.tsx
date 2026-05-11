import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Layout } from '../components/Layout'
import { TaskCard } from '../components/TaskCard'
import { DateNavigator } from '../components/DateNavigator'
import type { Task, TaskCompletion, TaskCategory } from '../types'
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
  const [points, setPoints] = useState(0)
  const [newApprovals, setNewApprovals] = useState(0)
  const [loading, setLoading] = useState(true)
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'point_transactions' }, fetchPoints)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [username])

  // Clear selection when date changes
  useEffect(() => { setSelectedTaskIds([]) }, [selectedDate])

  async function fetchAll() {
    setLoading(true)
    await Promise.all([fetchTasks(), fetchCompletions(), fetchPoints()])
    setLoading(false)
  }

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_active', true)
      .order('category')
    setTasks(data ?? [])
  }

  async function fetchCompletions() {
    const { data } = await supabase
      .from('task_completions')
      .select('*')
      .eq('kid_username', username)
    setCompletions(data ?? [])
  }

  async function fetchPoints() {
    const { data } = await supabase
      .from('point_transactions')
      .select('amount, type, created_at')
      .eq('kid_username', username)
    if (data) {
      const lastSeen = localStorage.getItem(`lastSeen_${username}`) ?? '1970-01-01'
      setNewApprovals(data.filter(t => t.type === 'earned' && t.created_at > lastSeen).length)
      const total = data.reduce((s, t) => s + (t.type === 'redeemed' ? -t.amount : t.amount), 0)
      setPoints(Math.max(0, total))
    }
  }

  function clearNotifications() {
    localStorage.setItem(`lastSeen_${username}`, new Date().toISOString())
    setNewApprovals(0)
  }

  // Get completion for a task on the selected date
  function getCompletion(taskId: string, kidUser: string): TaskCompletion | undefined {
    const dateStr  = format(selectedDate, 'yyyy-MM-dd')
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }).toISOString()
    const weekEnd   = endOfWeek(selectedDate,   { weekStartsOn: 1 }).toISOString()
    const task      = tasks.find(t => t.id === taskId)
    if (!task) return undefined

    return completions
      .filter(c => c.task_id === taskId && c.kid_username === kidUser && c.status !== 'rejected')
      .find(c => {
        const compDate = (c as any).completion_date as string | undefined
        if (task.category === 'daily') {
          return compDate ? compDate === dateStr : c.submitted_at.startsWith(dateStr)
        }
        if (task.category === 'weekly') {
          const ref = compDate ? new Date(compDate).toISOString() : c.submitted_at
          return ref >= weekStart && ref <= weekEnd
        }
        return true // adhoc: any completion counts
      })
  }

  // Completion dates for calendar dots
  const completionDates = [...new Set(
    completions
      .filter(c => c.status !== 'rejected')
      .map(c => (c as any).completion_date as string | undefined ?? c.submitted_at.slice(0, 10))
  )]

  // Tasks visible in current tab
  const visibleTasks = tasks.filter(t =>
    t.assigned_to === viewUsername || t.assigned_to === 'both'
  )

  const tasksByCategory = CATEGORY_ORDER.map(cat => ({
    cat,
    tasks: visibleTasks.filter(t => t.category === cat),
  })).filter(g => g.tasks.length > 0)

  // Available tasks for own tab (no existing completion, can be selected)
  function isAvailable(taskId: string): boolean {
    return isOwn && activeTab === 'own' && !getCompletion(taskId, username!)
  }

  function toggleSelect(taskId: string) {
    if (!isAvailable(taskId)) return
    setSelectedTaskIds(ids =>
      ids.includes(taskId) ? ids.filter(id => id !== taskId) : [...ids, taskId]
    )
  }

  function selectAll() {
    const available = visibleTasks.filter(t => isAvailable(t.id)).map(t => t.id)
    setSelectedTaskIds(available)
  }

  async function submitSelected() {
    if (selectedTaskIds.length === 0) return
    setSubmitting(true)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const rows = selectedTaskIds.map(taskId => ({
      task_id: taskId,
      kid_username: username,
      status: 'pending',
      completion_date: dateStr,
    }))
    await supabase.from('task_completions').insert(rows)
    setSelectedTaskIds([])
    setSubmitSuccess(true)
    setTimeout(() => setSubmitSuccess(false), 3000)
    await fetchCompletions()
    setSubmitting(false)
  }

  const availableCount = visibleTasks.filter(t => isAvailable(t.id)).length

  if (loading) {
    return (
      <Layout title="Family Quest">
        <div className="flex items-center justify-center h-64">
          <span className="text-4xl animate-bounce">⭐</span>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={`${user?.display_name}'s Quest`}>
      {/* Points header */}
      <div className="px-4 pt-4 pb-2">
        <div className={`card p-4 flex items-center justify-between bg-gradient-to-r from-${accentColor}/10 to-transparent border-${accentColor}/30`}>
          <div>
            <p className="text-game-text-dim text-xs font-bold uppercase tracking-widest">Point Bank</p>
            <p className={`font-game text-5xl text-${accentColor}`}>
              {points.toLocaleString()} <span className="text-game-gold text-3xl">⭐</span>
            </p>
          </div>
          <button onClick={clearNotifications} className="relative p-3 rounded-xl bg-game-border hover:brightness-125 transition-all">
            <Bell size={22} className={`text-${accentColor}`} />
            {newApprovals > 0 && (
              <span className="absolute -top-1 -right-1 bg-game-danger text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {newApprovals}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2 flex gap-2">
        <button onClick={() => { setActiveTab('own'); setSelectedTaskIds([]) }}
          className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'own'
              ? `bg-${accentColor}/20 text-${accentColor} border border-${accentColor}/30`
              : 'text-game-muted bg-game-border'
          }`}>
          My Tasks
        </button>
        <button onClick={() => { setActiveTab('sibling'); setSelectedTaskIds([]) }}
          className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'sibling'
              ? 'bg-game-master/20 text-game-master border border-game-master/30'
              : 'text-game-muted bg-game-border'
          }`}>
          {siblingName}'s Tasks
        </button>
      </div>

      {/* Date navigator */}
      <div className="px-4 py-2">
        <DateNavigator
          selectedDate={selectedDate}
          onChange={setSelectedDate}
          completionDates={completionDates}
          accentColor={accentColor}
        />
      </div>

      {/* Batch controls — own tab only */}
      {isOwn && activeTab === 'own' && availableCount > 0 && (
        <div className="px-4 py-1 flex items-center justify-between">
          <button
            onClick={selectAll}
            className="flex items-center gap-1.5 text-xs font-bold text-game-text-dim hover:text-game-text transition-colors"
          >
            <CheckSquare size={14} />
            Select All ({availableCount})
          </button>
          {selectedTaskIds.length > 0 && (
            <button
              onClick={() => setSelectedTaskIds([])}
              className="flex items-center gap-1.5 text-xs font-bold text-game-muted hover:text-game-text transition-colors"
            >
              <Square size={14} />
              Clear
            </button>
          )}
        </div>
      )}

      {/* Success message */}
      {submitSuccess && (
        <div className="mx-4 my-1 bg-game-success/10 border border-game-success/30 rounded-xl p-3 text-center">
          <p className="text-game-success font-bold text-sm">
            🎉 Tasks submitted for approval!
          </p>
        </div>
      )}

      {/* Task list */}
      <div className="px-4 pb-32 flex flex-col gap-6 mt-2">
        {tasksByCategory.length === 0 && (
          <div className="text-center py-16 text-game-muted">
            <p className="text-4xl mb-3">🎉</p>
            <p className="font-bold">No tasks yet!</p>
            <p className="text-sm">Master will add tasks soon.</p>
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
                  <div
                    key={task.id}
                    onClick={() => available && toggleSelect(task.id)}
                    className={`transition-all ${available ? 'cursor-pointer' : ''}`}
                  >
                    {/* Selection indicator */}
                    {isOwn && activeTab === 'own' && available && (
                      <div className={`card mb-[-8px] pb-4 pt-3 px-4 flex items-center gap-3 border-b-0 rounded-b-none
                                        transition-all ${selected ? `border-${accentColor}/60 bg-${accentColor}/10` : ''}`}>
                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all
                                          ${selected
                                            ? `bg-${accentColor} border-${accentColor}`
                                            : 'border-game-muted'}`}>
                          {selected && <span className="text-white text-xs font-bold">✓</span>}
                        </div>
                        <span className="text-xs font-bold text-game-text-dim">
                          {selected ? 'Selected' : 'Tap to select'}
                        </span>
                      </div>
                    )}

                    <TaskCard
                      task={task}
                      completion={completion}
                      canComplete={false}
                      viewOnly={activeTab === 'sibling' || !isOwn}
                      selected={selected}
                      accentColor={accentColor}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Floating submit button */}
      {selectedTaskIds.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-20 animate-pop">
          <button
            onClick={submitSelected}
            disabled={submitting}
            className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-3 shadow-glow-gold"
          >
            <Send size={20} />
            {submitting
              ? 'Submitting…'
              : `Submit ${selectedTaskIds.length} Task${selectedTaskIds.length !== 1 ? 's' : ''} for Approval`
            }
          </button>
        </div>
      )}
    </Layout>
  )
}
