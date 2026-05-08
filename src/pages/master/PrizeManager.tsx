import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight } from 'lucide-react'
import type { Prize, PrizeType } from '../../types'

const PRIZE_TYPES: { value: PrizeType; label: string; desc: string }[] = [
  { value: 'activity', label: '🎮 Activity',    desc: 'e.g. Movie night, Game session' },
  { value: 'dollar',   label: '💵 Dollar value', desc: 'e.g. $5 pocket money' },
  { value: 'custom',   label: '✏️ Custom',       desc: 'Anything else' },
]

interface EditingPrize {
  id?: string
  name: string
  description: string
  prize_type: PrizeType
  points_cost: number
  dollar_value: number
}

const blank: EditingPrize = { name: '', description: '', prize_type: 'activity', points_cost: 100, dollar_value: 5 }

export function PrizeManager() {
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [editing, setEditing] = useState<EditingPrize | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => { fetchPrizes() }, [])

  async function fetchPrizes() {
    setLoading(true)
    const { data } = await supabase.from('prizes').select('*').order('created_at', { ascending: false })
    setPrizes(data ?? [])
    setLoading(false)
  }

  async function savePrize() {
    if (!editing) return
    if (!editing.name.trim()) { setError('Name is required.'); return }

    setSaving(true)
    setError('')

    const payload = {
      name: editing.name.trim(),
      description: editing.description.trim() || null,
      prize_type: editing.prize_type,
      points_cost: editing.prize_type !== 'dollar' ? editing.points_cost : null,
      dollar_value: editing.prize_type === 'dollar' ? editing.dollar_value : null,
    }

    if (editing.id) {
      await supabase.from('prizes').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('prizes').insert({ ...payload, is_active: true })
    }

    await fetchPrizes()
    setEditing(null)
    setSaving(false)
  }

  async function toggleActive(prize: Prize) {
    await supabase.from('prizes').update({ is_active: !prize.is_active }).eq('id', prize.id)
    await fetchPrizes()
  }

  async function deletePrize(id: string) {
    await supabase.from('prizes').delete().eq('id', id)
    setConfirmDelete(null)
    await fetchPrizes()
  }

  if (loading) {
    return <Layout title="Prize Manager"><div className="flex items-center justify-center h-64"><span className="text-4xl animate-bounce">🏆</span></div></Layout>
  }

  return (
    <Layout title="Prize Manager">
      <div className="px-4 py-4 flex flex-col gap-4">
        <button onClick={() => setEditing({ ...blank })} className="btn-primary flex items-center justify-center gap-2">
          <Plus size={18} /> Add Prize
        </button>

        {/* Edit form */}
        {editing && (
          <div className="card p-4 border-game-gold/40 bg-game-gold/5 flex flex-col gap-3 animate-pop">
            <h3 className="font-game text-xl text-game-gold">{editing.id ? 'Edit Prize' : 'New Prize'}</h3>

            <input className="input" placeholder="Prize name" value={editing.name} onChange={e => setEditing(p => p && ({ ...p, name: e.target.value }))} />
            <input className="input" placeholder="Description (optional)" value={editing.description} onChange={e => setEditing(p => p && ({ ...p, description: e.target.value }))} />

            <div>
              <label className="text-game-text-dim text-xs font-bold uppercase tracking-wider mb-2 block">Prize Type</label>
              <div className="flex flex-col gap-2">
                {PRIZE_TYPES.map(pt => (
                  <button
                    key={pt.value}
                    onClick={() => setEditing(p => p && ({ ...p, prize_type: pt.value }))}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      editing.prize_type === pt.value
                        ? 'border-game-gold bg-game-gold/10 text-game-gold'
                        : 'border-game-border text-game-muted hover:brightness-125'
                    }`}
                  >
                    <p className="font-bold text-sm">{pt.label}</p>
                    <p className="text-xs opacity-70">{pt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {editing.prize_type === 'dollar' ? (
              <div>
                <label className="text-game-text-dim text-xs font-bold uppercase tracking-wider mb-1 block">Dollar Value ($)</label>
                <input className="input" type="number" min="0.01" step="0.01" value={editing.dollar_value} onChange={e => setEditing(p => p && ({ ...p, dollar_value: parseFloat(e.target.value) || 0 }))} />
                <p className="text-game-text-dim text-xs mt-1">Kids see this as a dollar amount. Points cost set by Master at approval time.</p>
              </div>
            ) : (
              <div>
                <label className="text-game-text-dim text-xs font-bold uppercase tracking-wider mb-1 block">Points Cost</label>
                <input className="input" type="number" min="1" value={editing.points_cost} onChange={e => setEditing(p => p && ({ ...p, points_cost: parseInt(e.target.value) || 0 }))} />
              </div>
            )}

            {error && <p className="text-game-danger text-sm font-bold">{error}</p>}
            <div className="flex gap-3">
              <button onClick={savePrize} disabled={saving} className="btn-success flex-1 flex items-center justify-center gap-2">
                <Check size={16} /> {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setEditing(null); setError('') }} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                <X size={16} /> Cancel
              </button>
            </div>
          </div>
        )}

        {/* Prize list */}
        {prizes.length === 0 ? (
          <p className="text-game-muted text-center py-10">No prizes yet. Add some above!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {prizes.map(prize => (
              <div key={prize.id} className={`card p-3 flex items-center gap-3 ${!prize.is_active ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-game-text truncate">{prize.name}</p>
                  <div className="flex items-center gap-2 text-xs text-game-text-dim">
                    <span className="capitalize">{prize.prize_type}</span>
                    {prize.points_cost && <span>· {prize.points_cost} pts</span>}
                    {prize.dollar_value && <span>· ${prize.dollar_value.toFixed(2)}</span>}
                  </div>
                  {prize.description && <p className="text-game-text-dim text-xs truncate">{prize.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleActive(prize)} className="p-2 hover:brightness-125 transition-all">
                    {prize.is_active ? <ToggleRight size={20} className="text-game-success" /> : <ToggleLeft size={20} className="text-game-muted" />}
                  </button>
                  <button onClick={() => setEditing({ id: prize.id, name: prize.name, description: prize.description ?? '', prize_type: prize.prize_type, points_cost: prize.points_cost ?? 100, dollar_value: prize.dollar_value ?? 5 })}
                    className="p-2 hover:brightness-125 transition-all">
                    <Pencil size={16} className="text-game-camden" />
                  </button>
                  {confirmDelete === prize.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => deletePrize(prize.id)} className="p-1.5 bg-game-danger rounded-lg"><Check size={14} className="text-white" /></button>
                      <button onClick={() => setConfirmDelete(null)} className="p-1.5 bg-game-border rounded-lg"><X size={14} className="text-game-muted" /></button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(prize.id)} className="p-2 hover:brightness-125 transition-all">
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
