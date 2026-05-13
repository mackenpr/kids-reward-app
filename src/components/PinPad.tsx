import { useState } from 'react'
import { Delete } from 'lucide-react'

interface PinPadProps {
  onSubmit: (pin: string) => void
  loading?: boolean
  error?: string
  label?: string
}

export function PinPad({ onSubmit, loading, error, label = 'Enter PIN' }: PinPadProps) {
  const [pin, setPin] = useState('')

  function press(digit: string) {
    if (pin.length >= 4 || loading) return
    const next = pin + digit
    setPin(next)
    if (next.length === 4) {
      setTimeout(() => onSubmit(next), 100)
    }
  }

  function del() {
    setPin(p => p.slice(0, -1))
  }

  const keys = ['1','2','3','4','5','6','7','8','9','','0','del']

  return (
    <div className="flex flex-col items-center gap-6 animate-pop">
      <p className="text-game-text-dim font-bold text-sm uppercase tracking-widest">{label}</p>

      {/* PIN dots */}
      <div className="flex gap-4">
        {[0,1,2,3].map(i => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
              i < pin.length
                ? 'bg-game-gold border-game-gold shadow-glow-gold'
                : 'border-game-muted bg-transparent'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-game-danger text-sm font-bold">{error}</p>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3">
        {keys.map((key, i) => {
          if (key === '') return <div key={i} />
          if (key === 'del') return (
            <button
              key={i}
              onClick={del}
              disabled={loading}
              className="w-16 h-16 rounded-2xl bg-game-border flex items-center justify-center
                         active:scale-95 transition-all hover:brightness-125 disabled:opacity-40"
            >
              <Delete size={20} className="text-game-text-dim" />
            </button>
          )
          return (
            <button
              key={i}
              onClick={() => press(key)}
              disabled={loading}
              className="w-16 h-16 rounded-2xl bg-game-border font-body font-extrabold text-2xl text-game-text
                         active:scale-95 active:bg-game-gold active:text-black
                         transition-all hover:brightness-125 disabled:opacity-40"
            >
              {key}
            </button>
          )
        })}
      </div>

      {loading && (
        <p className="text-game-gold text-sm font-bold animate-pulse">Logging in…</p>
      )}
    </div>
  )
}
