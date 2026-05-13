import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase, kidEmail, kidPassword } from '../lib/supabase'
import type { AppUser } from '../types'

interface AuthContextType {
  user: AppUser | null
  loading: boolean
  loginKid: (username: string, pin: string) => Promise<string | null>
  loginMaster: (email: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

// Race a promise against a timeout
function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Connection timed out. Please try again.')), ms)
  )
  return Promise.race([promise, timeout])
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Never hang on the initial session check for more than 5 seconds
    const timeout = setTimeout(() => setLoading(false), 5000)

    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        try {
          if (session?.user) {
            await withTimeout(loadProfile(session.user.id, session.user.email ?? ''))
          }
        } catch (e) {
          console.error('loadProfile error:', e)
        } finally {
          clearTimeout(timeout)
          setLoading(false)
        }
      })
      .catch(e => {
        console.error('getSession error:', e)
        clearTimeout(timeout)
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          await withTimeout(loadProfile(session.user.id, session.user.email ?? ''))
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
        }
      } catch (e) {
        console.error('onAuthStateChange error:', e)
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  async function loadProfile(userId: string, email: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) {
      setUser({ id: userId, email, username: data.username, display_name: data.display_name, role: data.role })
    }
  }

  async function loginKid(username: string, pin: string): Promise<string | null> {
    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email: kidEmail(username), password: kidPassword(pin) })
      )
      return error ? error.message : null
    } catch (e) {
      return e instanceof Error ? e.message : 'Connection timed out. Please try again.'
    }
  }

  async function loginMaster(email: string, password: string): Promise<string | null> {
    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password })
      )
      return error ? error.message : null
    } catch (e) {
      return e instanceof Error ? e.message : 'Connection timed out. Please try again.'
    }
  }

  async function logout() {
    try {
      await withTimeout(supabase.auth.signOut())
    } catch (e) {
      console.error('logout error:', e)
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginKid, loginMaster, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
