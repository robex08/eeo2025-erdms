import type { Role } from '../../../types'

export type DraftState = {
  id: number
  email: string
  phone: string
  display_name: string
  title_before: string
  title_after: string
  department: string
  job_title: string
  local_role: Role
  permissions: string[]
  local_note: string
  aktivni: boolean
  local_login_enabled: boolean
  local_login_username: string
  local_login_password: string
  clear_local_login_password: boolean
  theme: '' | 'light' | 'dark'
  notifications_enabled: boolean
}

export const roleLabels: Record<Role, string> = {
  employee: 'Zaměstnanec',
  doctor: 'Lékař',
  head_doctor: 'Vedoucí lékař',
  paramedic: 'Záchranář',
  approver: 'Schvalovatel (legacy)',
  admin: 'Administrátor',
}
