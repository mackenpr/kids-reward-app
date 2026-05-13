import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight } from 'lucide-react'
import type { Task, TaskCategory } from '../../types'

const CATEGORIES: TaskCategory[] = ['daily', 'weekly', 'adhoc']
const CATEGORY_LABELS: Record<TaskCategory, string> = { daily: '📅 Daily', weekly: '📆 Weekly', adhoc: '⚡ Special' }
const ASSIGNED_OPTIONS = [
  { value: 'both',    label: 'Both Kids' },
  { value: 'camden',  label: 'Camden only' },
  { value: 'ethan',   label: 'Ethan only' },
]

interface EditingTask {
  id?: string
  title: string
  description: string
  category: TaskCategory
  dollar_points: number
  quality_points: number
  assigned_to: string
}

const blank: EditingTask = { title: '', description: '', category: 'daily', dollar_points: 6, quality_points: 6, assigned_to: 'both' }

export function TaskEditor() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [editing, setEditing] = useState<EditingTask | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterCat, setFilterCat] = useState<TaskCategory | 'all'>('all')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => { fetchTasks() }, [])

  async function fetchTasks() {
    setLoading(true)
    try {
      const { data } = await supabase.from('tasks').select('*').order('category').order('title')
      setTasks(data ?? [])
    } catch (e) {
      console.error('fetchTasks error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function saveTask() {
    if (!editing) return
    if (!editing.title.trim()) { setError('Title is required.'); return }
    if (editing.dollar_points < 0 || editing.quality_points < 0) { setError('Points cannot be negative.'); return }

    setSaving(true)
    setError('')

    const payload = {
      title: editing.title.trim(),
      description: editing.description.trim() || null,
      category: editing.category,
      dollar_points: editing.dollar_points,
      quality_points: editing.quality_points,
      points: editing.dollar_points + editing.quality_points,
      assigned_to: editing.assigned_to,
    }

    if (editing.id) {
      await supabase.from('tasks').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id)
    } else {
      await supabase.from('tasks').insert({
        title: editing.title.trim(),
        ...payload,
      })
    }

    await fetchTasks()
    setEditing(null)
    setSaving(false)
  }

  async function toggleActive(task: Task) {
    await supabase.from('tasks').update({ is_active: !task.is_active }).eq('id', task.id)
    await fetchTasks()
  }

  async function deleteTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id)
    setConfirmDelete(null)
    await fetchTasks()
  }

  const filtered = filterCat === 'all' ? tasks : tasks.filter(t => t.category === filterCat)

  if (loading) {
    return <Layout title="Task Editor"><div className="flex items-center justify-center h-64"><span className="text-4xl animate-bounce">📋</span></div></Layout>
  }

  return (
    <Layout title="Task Editor">
      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Add button */}
        <button
          onClick={() => setEditing({ ...blank })}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Add Task
        </button>

        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', ...CATEGORIES] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-1.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                filterCat === cat ? 'bg-game-gold text-black' : 'bg-game-border text-game-muted hover:brightness-125'
              }`}
            >
              {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Edit form */}
        {editing && (
          <div className="card p-4 border-game-gold/40 bg-game-gold/5 flex flex-col gap-3 animate-pop">
            <h3 className="font-game text-xl text-game-gold">{editing.id ? 'Edit Task' : 'New Task'}</h3>
            <input
              className="input"
              placeholder="Task title"
              value={editing.title}
              onChange={e => setEditing(t => t && ({ ...t, title: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Description (optional)"
              value={editing.description}
              onChange={e => setEditing(t => t && ({ ...t, description: e.target.value }))}
            />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-game-text-dim text-xs font-bold uppercase tracking-wider mb-1 block">Category</label>
                <select className="input" value={editing.category} onChange={e => setEditing(t => t && ({ ...t, category: e.target.value as TaskCategory }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-game-text-dim text-xs font-bold uppercase tracking-wider mb-1 block">💰 Dollar pts</label>
                <input className="input" type="number" min="0" value={editing.dollar_points}
                  onChange={e => setEditing(t => t && ({ ...t, dollar_points: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="text-game-text-dim text-xs font-bold uppercase tracking-wider mb-1 block">⭐ Activity pts</label>
                <input className="input" type="number" min="0" value={editing.quality_points}
                  onChange={e => setEditing(t => t && ({ ...t, quality_points: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div>
              <label className="text-game-text-dim text-xs font-bold uppercase tracking-wider mb-1 block">Assigned To</label>
              <select
                className="input"
                value={editing.assigned_to}
                onChange={e => setEditing(t => t && ({ ...t, assigned_to: e.target.value }))}
              >
                {ASSIGNED_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {error && <p className="text-game-danger text-sm font-bold">{error}</p>}
            <div className="flex gap-3">
              <button onClick={saveTask} disabled={saving} className="btn-success flex-1 flex items-center justify-center gap-2">
                <Check size={16} /> {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setEditing(null); setError('') }} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                <X size={16} /> Cancel
              </button>
            </div>
          </div>
        )}

        {/* Task list */}
        {filtered.length === 0 ? (
          <p className="text-game-muted text-center py-10">No tasks yet. Add one above!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(task => (
              <div key={task.id} className={`card p-3 flex items-center gap-3 ${!task.is_active ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-game-gold font-num text-xs">💰{task.dollar_points ?? 0}</span>
                    <span className="text-game-master font-num text-xs">⭐{task.quality_points ?? 0}</span>
                    <span className="text-game-text-dim text-xs capitalize">{task.category}</span>
                    <span className="text-game-text-dim text-xs">· {task.assigned_to === 'both' ? 'Both' : task.assigned_to}</span>
                  </div>
                  <p className="font-bold text-game-text truncate">{task.title}</p>
                  {task.description && <p className="text-game-text-dim text-xs truncate">{task.description}</p>}
                </div>

                <div className="flex items-center gap-1">
                  <button onClick={() => toggleActive(task)} className="p-2 hover:brightness-125 transition-all" title={task.is_active ? 'Deactivate' : 'Activate'}>
                    {task.is_active
                      ? <ToggleRight size={20} className="text-game-success" />
                      : <ToggleLeft size={20} className="text-game-muted" />}
                  </button>
                  <button onClick={() => setEditing({ id: task.id, title: task.title, description: task.description ?? '', category: task.category, dollar_points: task.dollar_points ?? 0, quality_points: task.quality_points ?? 0, assigned_to: task.assigned_to })}
                    className="p-2 hover:brightness-125 transition-all">
                    <Pencil size={16} className="text-game-camden" />
                  </button>
                  {confirmDelete === task.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => deleteTask(task.id)} className="p-1.5 bg-game-danger rounded-lg"><Check size={14} className="text-white" /></button>
                      <button onClick={() => setConfirmDelete(null)} className="p-1.5 bg-game-border rounded-lg"><X size={14} className="text-game-muted" /></button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(task.id)} className="p-2 hover:brightness-125 transition-all">
                      <Trash2 size={16} className="text-game-danger" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
