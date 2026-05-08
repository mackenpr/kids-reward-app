import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { startOfDay, startOfWeek } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Layout } from '../components/Layout'
import { TaskCard } from '../components/TaskCard'
import type { Task, TaskCompletion, KidUsername, TaskCategory } from '../types'
import { Bell } from 'lucide-react'

const CATEGORY_ORDER: TaskCategory[] = ['daily', 'weekly', 'adhoc']
const CATEGORY_LABELS: Record<TaskCategory, string> = {
  daily: '📅 Daily Tasks',
  weekly: '📆 Weekly Tasks',
  adhoc: '⚡ Special Tasks',
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
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'own' | 'sibling'>('own')

  const viewUsername = activeTab === 'own' ? username! : (username === 'camden' ? 'ethan' : 'camden')
  const viewDisplayName = viewUsername === 'camden' ? 'Camden' : 'Ethan'

  useEffect(() => {
    fetchAll()

    const channel = supabase
      .channel('kid-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_completions' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'point_transactions' }, fetchPoints)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [username])

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
      .or(`assigned_to.eq.${username},assigned_to.eq.both`)
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
      const newOnes = data.filter(t => t.type === 'earned' && t.created_at > lastSeen)
      setNewApprovals(newOnes.length)

      const total = data.reduce((sum, t) => {
        return sum + (t.type === 'redeemed' ? -t.amount : t.amount)
      }, 0)
      setPoints(Math.max(0, total))
    }
  }

  function clearNotifications() {
    localStorage.setItem(`lastSeen_${username}`, new Date().toISOString())
    setNewApprovals(0)
  }

  function getCompletion(taskId: string): TaskCompletion | undefined {
    const now = new Date()
    const todayStart = startOfDay(now).toISOString()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()

    return completions
      .filter(c => c.task_id === taskId)
      .find(c => {
        const task = tasks.find(t => t.id === taskId)
        if (!task) return false
        if (task.category === 'daily')  return c.submitted_at >= todayStart && c.status !== 'rejected'
        if (task.category === 'weekly') return c.submitted_at >= weekStart  && c.status !== 'rejected'
        return c.status !== 'rejected'
      })
  }

  async function markComplete(task: Task) {
    setSubmitting(task.id)
    await supabase.from('task_completions').insert({
      task_id: task.id,
      kid_username: username,
      status: 'pending',
    })
    await fetchCompletions()
    setSubmitting(null)
  }

  const accentClass = username === 'camden' ? 'text-game-camden' : 'text-game-ethan'
  const siblingName = username === 'camden' ? 'Ethan' : 'Camden'

  const visibleTasks = tasks.filter(t =>
    t.assigned_to === viewUsername || t.assigned_to === 'both'
  )

  const tasksByCategory = CATEGORY_ORDER.map(cat => ({
    cat,
    tasks: visibleTasks.filter(t => t.category === cat),
  })).filter(g => g.tasks.length > 0)

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
        <div className="card p-4 flex items-center justify-between bg-gradient-to-r from-game-gold/10 to-transparent border-game-gold/30 shadow-glow-gold">
          <div>
            <p className="text-game-text-dim text-xs font-bold uppercase tracking-widest">Point Bank</p>
            <p className={`font-game text-5xl ${accentClass}`}>
              {points.toLocaleString()} <span className="text-game-gold text-3xl">⭐</span>
            </p>
          </div>
          <button
            onClick={clearNotifications}
            className="relative p-3 rounded-xl bg-game-border hover:brightness-125 transition-all"
          >
            <Bell size={22} className={accentClass} />
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
        <button
          onClick={() => setActiveTab('own')}
          className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'own' ? `bg-${username === 'camden' ? 'game-camden' : 'game-ethan'}/20 ${accentClass} border border-current/30` : 'text-game-muted bg-game-border'
          }`}
        >
          My Tasks
        </button>
        <button
          onClick={() => setActiveTab('sibling')}
          className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'sibling' ? 'bg-game-master/20 text-game-master border border-game-master/30' : 'text-game-muted bg-game-border'
          }`}
        >
          {siblingName}'s Tasks
        </button>
      </div>

      {/* Task list */}
      <div className="px-4 pb-4 flex flex-col gap-6">
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
              {catTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  completion={getCompletion(task.id)}
                  canComplete={isOwn && activeTab === 'own'}
                  viewOnly={activeTab === 'sibling'}
                  onComplete={() => markComplete(task)}
                  loading={submitting === task.id}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
