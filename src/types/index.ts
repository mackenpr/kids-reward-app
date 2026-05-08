export type Role = 'master' | 'kid'
export type KidUsername = 'camden' | 'ethan'
export type TaskCategory = 'daily' | 'weekly' | 'adhoc'
export type CompletionStatus = 'pending' | 'approved' | 'rejected'
export type PrizeType = 'activity' | 'dollar' | 'custom'
export type TransactionType = 'earned' | 'redeemed' | 'bonus'

export interface Profile {
  id: string
  username: string
  display_name: string
  role: Role
  avatar: string
  created_at: string
}

export interface Task {
  id: string
  title: string
  description?: string
  category: TaskCategory
  points: number
  assigned_to: KidUsername | 'both'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TaskCompletion {
  id: string
  task_id: string
  kid_username: KidUsername
  status: CompletionStatus
  submitted_at: string
  approved_at?: string
  rejection_reason?: string
  task?: Task
}

export interface PointTransaction {
  id: string
  kid_username: KidUsername
  amount: number
  type: TransactionType
  description: string
  related_completion_id?: string
  related_redemption_id?: string
  created_at: string
}

export interface RedemptionRequest {
  id: string
  kid_username: KidUsername
  points_amount: number
  prize_description: string
  status: CompletionStatus
  submitted_at: string
  approved_at?: string
  rejection_reason?: string
}

export interface Prize {
  id: string
  name: string
  description?: string
  points_cost?: number
  prize_type: PrizeType
  dollar_value?: number
  is_active: boolean
  created_at: string
}

export interface AppSettings {
  id: number
  points_per_dollar?: number
  weekly_bonus_multiplier: number
  updated_at: string
}

export interface AppUser {
  id: string
  username: string
  display_name: string
  role: Role
  email: string
}
