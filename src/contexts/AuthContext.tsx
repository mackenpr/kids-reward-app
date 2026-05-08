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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await loadProfile(session.user.id, session.user.email ?? '')
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await loadProfile(session.user.id, session.user.email ?? '')
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
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
    const { error } = await supabase.auth.signInWithPassword({
      email: kidEmail(username),
      password: kidPassword(pin),
    })
    return error ? error.message : null
  }

  async function loginMaster(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? error.message : null
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
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
