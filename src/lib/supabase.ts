import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const KID_EMAIL_DOMAIN = 'kidsapp.internal'

export function kidEmail(username: string) {
  return `${username}@${KID_EMAIL_DOMAIN}`
}

export function kidPassword(pin: string) {
  return `pin_${pin}`
}
