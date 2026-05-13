import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, kidEmail, kidPassword } from '../lib/supabase'

export function Setup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [masterEmail, setMasterEmail] = useState('')
  const [masterPassword, setMasterPassword] = useState('')
  const [camdenPin, setCamdenPin] = useState('')
  const [ethanPin, setEthanPin] = useState('')

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    if (camdenPin.length !== 4 || ethanPin.length !== 4) {
      setError('PINs must be exactly 4 digits.')
      return
    }
    if (masterPassword.length < 6) {
      setError('Master password must be at least 6 characters.')
      return
    }

    setLoading(true)
    setError('')

    try {
      // 1. Sign up master
      const { data: masterData, error: masterErr } = await supabase.auth.signUp({
        email: masterEmail,
        password: masterPassword,
      })
      if (masterErr || !masterData.user) throw new Error(masterErr?.message ?? 'Failed to create master account')

      // Insert master profile
      const { error: masterProfileErr } = await supabase.from('profiles').insert({
        id: masterData.user.id,
        username: 'master',
        display_name: 'Master',
        role: 'master',
        avatar: 'crown',
      })
      if (masterProfileErr) throw new Error(masterProfileErr.message)

      // 2. Sign up Camden (auto-logs us in as Camden)
      const { data: camdenData, error: camdenErr } = await supabase.auth.signUp({
        email: kidEmail('camden'),
        password: kidPassword(camdenPin),
      })
      if (camdenErr || !camdenData.user) throw new Error(camdenErr?.message ?? 'Failed to create Camden account')

      const { error: camdenProfileErr } = await supabase.from('profiles').insert({
        id: camdenData.user.id,
        username: 'camden',
        display_name: 'Camden',
        role: 'kid',
        avatar: 'sword',
      })
      if (camdenProfileErr) throw new Error(camdenProfileErr.message)

      // 3. Sign up Ethan
      const { data: ethanData, error: ethanErr } = await supabase.auth.signUp({
        email: kidEmail('ethan'),
        password: kidPassword(ethanPin),
      })
      if (ethanErr || !ethanData.user) throw new Error(ethanErr?.message ?? 'Failed to create Ethan account')

      const { error: ethanProfileErr } = await supabase.from('profiles').insert({
        id: ethanData.user.id,
        username: 'ethan',
        display_name: 'Ethan',
        role: 'kid',
        avatar: 'lightning',
      })
      if (ethanProfileErr) throw new Error(ethanProfileErr.message)

      // 4. Sign in as master
      await supabase.auth.signInWithPassword({ email: masterEmail, password: masterPassword })

      navigate('/master')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Setup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh stars-bg flex flex-col items-center justify-center px-6 py-10">
      <div className="card p-8 w-full max-w-md">
        <h1 className="font-game text-4xl text-game-gold text-center mb-2">SETUP</h1>
        <p className="text-game-text-dim text-center text-sm font-bold mb-8">
          First-time app setup — run once only
        </p>

        <form onSubmit={handleSetup} className="flex flex-col gap-5">
          {/* Master account */}
          <div>
            <h2 className="font-game text-xl text-game-master mb-3">👑 Master Account</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-game-text-dim text-xs font-bold uppercase tracking-wider mb-1 block">
                  Your Email
                </label>
                <input
                  type="email"
                  value={masterEmail}
                  onChange={e => setMasterEmail(e.target.value)}
                  className="input"
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div>
                <label className="text-game-text-dim text-xs font-bold uppercase tracking-wider mb-1 block">
                  Your Password (min 6 chars)
                </label>
                <input
                  type="password"
                  value={masterPassword}
                  onChange={e => setMasterPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>
          </div>

          {/* Camden */}
          <div>
            <h2 className="font-game text-xl text-game-camden mb-3">⚔️ Camden's PIN</h2>
            <input
              type="number"
              value={camdenPin}
              onChange={e => setCamdenPin(e.target.value.slice(0, 4))}
              className="input"
              placeholder="4-digit PIN (e.g. 1234)"
              maxLength={4}
              required
            />
          </div>

          {/* Ethan */}
          <div>
            <h2 className="font-game text-xl text-game-ethan mb-3">🐿️ Ethan's PIN</h2>
            <input
              type="number"
              value={ethanPin}
              onChange={e => setEthanPin(e.target.value.slice(0, 4))}
              className="input"
              placeholder="4-digit PIN (e.g. 5678)"
              maxLength={4}
              required
            />
          </div>

          {error && (
            <div className="bg-game-danger/10 border border-game-danger/30 rounded-xl p-3">
              <p className="text-game-danger text-sm font-bold">{error}</p>
            </div>
          )}

          <div className="bg-game-gold/10 border border-game-gold/30 rounded-xl p-3">
            <p className="text-game-gold text-xs font-bold">
              ⚠️ Make sure you disabled "Confirm email" in Supabase Auth settings before running setup.
            </p>
          </div>

          <button type="submit" disabled={loading} className="btn-primary text-lg py-4">
            {loading ? 'Setting up…' : '🚀 Create Accounts'}
          </button>
        </form>

        <button
          onClick={() => navigate('/')}
          className="mt-4 w-full text-game-muted text-sm font-bold hover:text-game-text-dim transition-colors"
        >
          ← Back to login
        </button>
      </div>
    </div>
  )
}
