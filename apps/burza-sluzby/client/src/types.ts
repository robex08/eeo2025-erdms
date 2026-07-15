export type Role = 'employee' | 'doctor' | 'head_doctor' | 'paramedic' | 'approver' | 'admin'
export type ShiftStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface EntraData {
  memberOf?: string[]
  manager?: { mail: string; displayName: string }
  officeLocation?: string
}

export interface User {
  id: number
  user_principal_name: string
  email?: string
  phone?: string
  display_name: string
  title_before?: string
  title_after?: string
  department: string
  local_role: Role
  auth_source?: 'entra' | 'local'
  entra_data?: EntraData
  local_settings?: { theme?: 'light' | 'dark'; notifications_enabled?: boolean }
}

export interface Availability {
  id: number
  user_id: number
  start_time: string
  end_time: string
  status: ShiftStatus
  employee_note?: string
  metadata?: { preferred_station?: string }
  user?: User
}

export interface ShiftAssignment {
  id: number
  availability_id: number
  user_id: number
  approver_id: number
  assigned_department: string
  assigned_start: string
  assigned_end: string
  metadata?: { note?: string; is_overtime?: boolean; shift_type?: string }
  availability?: Availability
  user?: User
}

export interface AdminUser {
  id: number
  entra_id: string
  username: string
  user_principal_name?: string
  email?: string
  phone?: string
  display_name?: string
  title_before?: string
  title_after?: string
  given_name?: string
  surname?: string
  department?: string
  job_title?: string
  local_role: Role
  local_login_enabled?: number
  local_login_username?: string
  role?: string
  permissions_json?: string | string[]
  local_settings?: Record<string, unknown> | string
  aktivni: number
  local_note?: string
  last_login_at?: string
  created_at?: string
  updated_at?: string
}

export interface AdminUserUpdatePayload {
  email?: string
  phone?: string
  display_name?: string
  title_before?: string
  title_after?: string
  department?: string
  job_title?: string
  local_role?: Role
  permissions?: string[]
  local_settings?: Record<string, unknown>
  aktivni?: boolean
  local_note?: string
  local_login_enabled?: boolean
  local_login_username?: string
  local_login_password?: string
  clear_local_login_password?: boolean
}

export interface CatalogItem {
  id: number
  category: string
  item_key: string
  item_value: string
  description?: string
  role_scope: Role | '*'
  purpose?: string
  sort_order: number
  is_active: number
  metadata?: Record<string, unknown> | string
}

export interface AppSettings {
  max_candidates_per_day: number
}

export interface AvailabilityDaySummary {
  day_key: string
  candidate_count: number
  candidate_names?: string[]
}
