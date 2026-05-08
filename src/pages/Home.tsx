import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PinPad } from '../components/PinPad'

type Selection = 'camden' | 'ethan' | 'master' | null

const characters = [
  {
    id: 'camden' as const,
    name: 'Camden',
    emoji: '⚔️',
    sub: 'Age 9',
    color: 'game-camden',
    gradient: 'from-blue-900/60 to-blue-600/20',
    border: 'border-game-camden/50',
    glow: 'shadow-glow-blue',
  },
  {
    id: 'ethan' as const,
    name: 'Ethan',
    emoji: '⚡',
    sub: 'Age 7',
    color: 'game-ethan',
    gradient: 'from-emerald-900/60 to-emerald-600/20',
    border: 'border-game-ethan/50',
    glow: 'shadow-glow-green',
  },
  {
    id: 'master' as const,
    name: 'Master',
    emoji: '👑',
    sub: 'Admin',
    color: 'game-master',
    gradient: 'from-purple-900/60 to-purple-600/20',
    border: 'border-game-master/50',
    glow: 'shadow-glow-purple',
  },
]

export function Home() {
  const [selected, setSelected] = useState<Selection>(null)
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { loginKid, loginMaster } = useAuth()
  const navigate = useNavigate()

  function select(id: Selection) {
    setSelected(id)
    setError('')
    setPin('')
  }

  async function handlePinSubmit(submittedPin: string) {
    if (!selected || selected === 'master') return
    setLoading(true)
    setError('')
    const err = await loginKid(selected, submittedPin)
    setLoading(false)
    if (err) {
      setError('Wrong PIN. Try again!')
      setPin('')
    } else {
      navigate(`/kid/${selected}`)
    }
  }

  async function handleMasterLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const err = await loginMaster(email, password)
    setLoading(false)
    if (err) {
      setError('Wrong email or password.')
    } else {
      navigate('/master')
    }
  }

  const char = characters.find(c => c.id === selected)

  return (
    <div className="min-h-dvh stars-bg flex flex-col items-center justify-center px-6 py-10 gap-10">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-game text-6xl text-game-gold tracking-widest drop-shadow-lg animate-pulse-gold">
          FAMILY QUEST
        </h1>
        <p className="text-game-text-dim font-bold text-sm tracking-widest mt-2 uppercase">
          Choose Your Hero
        </p>
      </div>

      {/* Character cards */}
      {!selected && (
        <div className="flex gap-4 flex-wrap justify-center">
          {characters.map(c => (
            <button
              key={c.id}
              onClick={() => select(c.id)}
              className={`card bg-gradient-to-b ${c.gradient} border ${c.border}
                          flex flex-col items-center gap-3 p-6 w-36
                          active:scale-95 transition-all duration-200 animate-float ${c.glow}
                          hover:brightness-110`}
            >
              <span className="text-5xl">{c.emoji}</span>
              <div className="text-center">
                <p className={`font-game text-2xl text-${c.color}`}>{c.name}</p>
                <p className="text-game-text-dim text-xs font-bold">{c.sub}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Login form */}
      {selected && char && (
        <div className={`card bg-gradient-to-b ${char.gradient} border ${char.border} p-8 w-full max-w-xs`}>
          <div className="flex flex-col items-center gap-2 mb-6">
            <span className="text-5xl animate-float">{char.emoji}</span>
            <h2 className={`font-game text-3xl text-${char.color}`}>{char.name}</h2>
          </div>

          {selected !== 'master' ? (
            <PinPad
              onSubmit={handlePinSubmit}
              loading={loading}
              error={error}
            />
          ) : (
            <form onSubmit={handleMasterLogin} className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                required
              />
              {error && <p className="text-game-danger text-sm font-bold text-center">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Logging in…' : 'Enter 👑'}
              </button>
            </form>
          )}

          <button
            onClick={() => setSelected(null)}
            className="mt-6 w-full text-game-muted text-sm font-bold hover:text-game-text-dim transition-colors"
          >
            ← Back
          </button>
        </div>
      )}

      {/* First time setup link */}
      <p className="text-game-muted text-xs font-bold">
        First time?{' '}
        <a href="/setup" className="text-game-gold underline">Set up the app</a>
      </p>
    </div>
  )
}
