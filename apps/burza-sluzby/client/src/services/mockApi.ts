import type { AdminUser, AdminUserUpdatePayload, AppSettings, Availability, AvailabilityDaySummary, CatalogItem, ShiftAssignment, ShiftStatus, User } from '../types'

type ApiEnvelope<T> = {
  status: 'ok' | 'error'
  data?: T
  message?: string
  code?: string
  auth_source?: 'entra' | 'local'
  auth_user?: Record<string, unknown>
  local_user?: Record<string, unknown>
  effective_role?: string
}

const API_BASE = (import.meta.env.VITE_BURZA_API_BASE as string | undefined)?.trim() || '/dev/api.burza-sluzby'

function normalizeBaseUrl(baseUrl: string): string {
  if (!baseUrl || baseUrl === '/') {
    return ''
  }

  const normalized = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

function getAppAbsoluteUrl(): string {
  const basePath = normalizeBaseUrl(import.meta.env.BASE_URL)
  return `${window.location.origin}${basePath || '/'}`
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>

  if (!response.ok || payload.status === 'error') {
    const message = payload.message || `HTTP ${response.status}`
    const error = new Error(message)
    ;(error as Error & { code?: string; status?: number }).code = payload.code
    ;(error as Error & { code?: string; status?: number }).status = response.status
    throw error
  }

  if (payload.data === undefined) {
    throw new Error('Neplatná odpověď API.')
  }

  return payload.data
}

function normalizeRole(value: unknown): User['local_role'] {
  const role = String(value ?? '').toLowerCase()
  if (role === 'approver' || role === 'admin' || role === 'doctor' || role === 'head_doctor' || role === 'paramedic') {
    return role
  }
  return 'employee'
}

function parseJsonField<T>(value: unknown): T | undefined {
  if (value == null) {
    return undefined
  }
  if (typeof value === 'object') {
    return value as T
  }
  if (typeof value === 'string' && value.trim() !== '') {
    try {
      return JSON.parse(value) as T
    } catch {
      return undefined
    }
  }
  return undefined
}

function toIsoFromApiDateTime(value: unknown): string {
  const normalized = String(value ?? '').trim()
  if (normalized === '') {
    return new Date('').toISOString()
  }

  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (match) {
    const [, year, month, day, hour, minute, second = '00'] = match
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      0,
    )
    return date.toISOString()
  }

  return new Date(normalized).toISOString()
}

function toApiLocalDateTime(value: string): string {
  const date = new Date(value)
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function mapUser(raw: Record<string, unknown>): User {
  return {
    id: Number(raw.id ?? 0),
    user_principal_name: String(raw.user_principal_name ?? raw.email ?? ''),
    email: raw.email ? String(raw.email) : undefined,
    phone: raw.phone ? String(raw.phone) : undefined,
    display_name: String(raw.display_name ?? raw.username ?? 'Uživatel'),
    title_before: raw.title_before ? String(raw.title_before) : undefined,
    title_after: raw.title_after ? String(raw.title_after) : undefined,
    department: String(raw.department ?? ''),
    local_role: normalizeRole(raw.local_role ?? raw.role),
    auth_source: raw.auth_source === 'local' ? 'local' : 'entra',
    entra_data: parseJsonField(raw.entra_data),
    local_settings: parseJsonField(raw.local_settings),
  }
}

function mapAdminUser(raw: Record<string, unknown>): AdminUser {
  return {
    id: Number(raw.id ?? 0),
    entra_id: String(raw.entra_id ?? ''),
    username: String(raw.username ?? ''),
    user_principal_name: raw.user_principal_name ? String(raw.user_principal_name) : undefined,
    email: raw.email ? String(raw.email) : undefined,
    phone: raw.phone ? String(raw.phone) : undefined,
    display_name: raw.display_name ? String(raw.display_name) : undefined,
    title_before: raw.title_before ? String(raw.title_before) : undefined,
    title_after: raw.title_after ? String(raw.title_after) : undefined,
    given_name: raw.given_name ? String(raw.given_name) : undefined,
    surname: raw.surname ? String(raw.surname) : undefined,
    department: raw.department ? String(raw.department) : undefined,
    job_title: raw.job_title ? String(raw.job_title) : undefined,
    local_role: normalizeRole(raw.local_role ?? raw.role),
    local_login_enabled: Number(raw.local_login_enabled ?? 0),
    local_login_username: raw.local_login_username ? String(raw.local_login_username) : undefined,
    role: raw.role ? String(raw.role) : undefined,
    permissions_json: parseJsonField<string[]>(raw.permissions_json) ?? (raw.permissions_json ? String(raw.permissions_json) : undefined),
    local_settings: parseJsonField<Record<string, unknown>>(raw.local_settings) ?? (raw.local_settings ? String(raw.local_settings) : undefined),
    aktivni: Number(raw.aktivni ?? 0),
    local_note: raw.local_note ? String(raw.local_note) : undefined,
    last_login_at: raw.last_login_at ? String(raw.last_login_at) : undefined,
    created_at: raw.created_at ? String(raw.created_at) : undefined,
    updated_at: raw.updated_at ? String(raw.updated_at) : undefined,
  }
}

function mapCatalogItem(raw: Record<string, unknown>): CatalogItem {
  const roleScopeRaw = String(raw.role_scope ?? '*').toLowerCase()
  const roleScope: CatalogItem['role_scope'] = roleScopeRaw === 'employee'
    || roleScopeRaw === 'doctor'
    || roleScopeRaw === 'head_doctor'
    || roleScopeRaw === 'paramedic'
    || roleScopeRaw === 'approver'
    || roleScopeRaw === 'admin'
    ? roleScopeRaw
    : '*'

  return {
    id: Number(raw.id ?? 0),
    category: String(raw.category ?? ''),
    item_key: String(raw.item_key ?? ''),
    item_value: String(raw.item_value ?? raw.item_key ?? ''),
    description: raw.description ? String(raw.description) : undefined,
    role_scope: roleScope,
    purpose: raw.purpose ? String(raw.purpose) : undefined,
    sort_order: Number(raw.sort_order ?? 100),
    is_active: Number(raw.is_active ?? 1),
    metadata: parseJsonField<Record<string, unknown>>(raw.metadata) ?? (raw.metadata ? String(raw.metadata) : undefined),
  }
}

function mapAvailability(raw: Record<string, unknown>): Availability {
  const statusRaw = String(raw.status ?? 'pending')
  const status: ShiftStatus = ['pending', 'approved', 'rejected', 'cancelled'].includes(statusRaw)
    ? (statusRaw as ShiftStatus)
    : 'pending'

  return {
    id: Number(raw.id ?? 0),
    user_id: Number(raw.user_id ?? 0),
    start_time: toIsoFromApiDateTime(raw.start_time),
    end_time: toIsoFromApiDateTime(raw.end_time),
    status,
    employee_note: raw.employee_note ? String(raw.employee_note) : undefined,
    metadata: parseJsonField(raw.metadata),
    user: raw.display_name
      ? {
          id: Number(raw.user_id ?? 0),
          user_principal_name: '',
          display_name: String(raw.display_name ?? ''),
          department: String(raw.department ?? ''),
          local_role: 'employee',
        }
      : undefined,
  }
}

function mapAssignment(raw: Record<string, unknown>): ShiftAssignment {
  return {
    id: Number(raw.id ?? 0),
    availability_id: Number(raw.availability_id ?? 0),
    user_id: Number(raw.user_id ?? 0),
    approver_id: Number(raw.approver_id ?? 0),
    assigned_department: String(raw.assigned_department ?? ''),
    assigned_start: toIsoFromApiDateTime(raw.assigned_start),
    assigned_end: toIsoFromApiDateTime(raw.assigned_end),
    metadata: parseJsonField(raw.metadata),
    user: raw.user_display_name
      ? {
          id: Number(raw.user_id ?? 0),
          user_principal_name: '',
          display_name: String(raw.user_display_name ?? ''),
          department: String(raw.user_department ?? ''),
          local_role: 'employee',
        }
      : undefined,
  }
}

export async function getCurrentUser(): Promise<User> {
  const response = await fetch(`${API_BASE}/me`, { credentials: 'include' })
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<never>

  if (!response.ok || payload.status === 'error') {
    const message = payload.message || `HTTP ${response.status}`
    const error = new Error(message)
    ;(error as Error & { code?: string; status?: number }).code = payload.code
    ;(error as Error & { code?: string; status?: number }).status = response.status
    throw error
  }

  const localUser = payload.local_user
  if (!localUser || typeof localUser !== 'object') {
    throw new Error('Chybí lokální uživatelský profil.')
  }

  return mapUser({ ...localUser, auth_source: payload.auth_source ?? 'entra' })
}

export async function getMyAvailabilities(): Promise<Availability[]> {
  const data = await apiRequest<Record<string, unknown>[]>('/availabilities/mine')
  return data.map(mapAvailability)
}

export async function getAvailabilityDaySummary(rangeStart?: string, rangeEnd?: string): Promise<AvailabilityDaySummary[]> {
  const params = new URLSearchParams()
  if (rangeStart) {
    params.set('range_start', rangeStart)
  }
  if (rangeEnd) {
    params.set('range_end', rangeEnd)
  }

  const suffix = params.toString() ? `?${params.toString()}` : ''
  const data = await apiRequest<Record<string, unknown>[]>(`/availabilities/day-summary${suffix}`)

  return data.map((raw) => ({
    day_key: String(raw.day_key ?? ''),
    candidate_count: Number(raw.candidate_count ?? 0),
    candidate_names: Array.isArray(raw.candidate_names)
      ? raw.candidate_names.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter((item) => item !== '')
      : undefined,
  }))
}

export async function getPendingAvailabilitiesForDepartment(department: string, statuses: ShiftStatus[] = ['pending']): Promise<Availability[]> {
  const params = new URLSearchParams()
  if (department.trim() !== '') {
    params.set('department', department)
  }
  const normalizedStatuses = statuses
    .map((item) => String(item).trim())
    .filter((item): item is ShiftStatus => ['pending', 'approved', 'rejected', 'cancelled'].includes(item))
  if (normalizedStatuses.length > 0) {
    params.set('status', normalizedStatuses.join(','))
  }
  const data = await apiRequest<Record<string, unknown>[]>(`/approvals/availabilities?${params.toString()}`)
  return data.map(mapAvailability)
}

export async function createAvailability(payload: Pick<Availability, 'start_time' | 'end_time' | 'employee_note' | 'metadata'>): Promise<Availability> {
  const data = await apiRequest<Record<string, unknown>>('/availabilities', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      start_time: toApiLocalDateTime(payload.start_time),
      end_time: toApiLocalDateTime(payload.end_time),
    }),
  })

  return {
    id: Number(data.id ?? 0),
    user_id: Number(data.user_id ?? 0),
    start_time: toIsoFromApiDateTime(data.start_time ?? payload.start_time),
    end_time: toIsoFromApiDateTime(data.end_time ?? payload.end_time),
    status: 'pending',
    employee_note: payload.employee_note,
    metadata: payload.metadata,
  }
}

export async function updateAvailability(availabilityId: number, payload: Pick<Availability, 'start_time' | 'end_time' | 'employee_note' | 'metadata'>): Promise<Availability> {
  const data = await apiRequest<Record<string, unknown>>(`/availabilities/${availabilityId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...payload,
      start_time: toApiLocalDateTime(payload.start_time),
      end_time: toApiLocalDateTime(payload.end_time),
    }),
  })

  return mapAvailability(data)
}

export async function deleteAvailability(availabilityId: number): Promise<void> {
  await apiRequest<Record<string, unknown>>(`/availabilities/${availabilityId}`, {
    method: 'DELETE',
  })
}

export async function approveAvailability(params: {
  availabilityId: number
  assigned_department: string
  assigned_start: string
  assigned_end: string
  note?: string
  metadata?: Record<string, unknown>
}): Promise<ShiftAssignment> {
  const data = await apiRequest<Record<string, unknown>>(`/approvals/availabilities/${params.availabilityId}/assign`, {
    method: 'POST',
    body: JSON.stringify({
      assigned_department: params.assigned_department,
      assigned_start: toApiLocalDateTime(params.assigned_start),
      assigned_end: toApiLocalDateTime(params.assigned_end),
      metadata: {
        ...(params.metadata ?? {}),
        ...(params.note ? { note: params.note } : {}),
      },
    }),
  })

  return {
    id: Number(data.assignment_id ?? 0),
    availability_id: params.availabilityId,
    user_id: 0,
    approver_id: 0,
    assigned_department: params.assigned_department,
    assigned_start: params.assigned_start,
    assigned_end: params.assigned_end,
    metadata: {
      ...(params.metadata ?? {}),
      ...(params.note ? { note: params.note } : {}),
    },
  }
}

export async function rejectAvailability(availabilityId: number, note?: string): Promise<Availability> {
  await apiRequest<Record<string, unknown>>(`/approvals/availabilities/${availabilityId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason: note ?? undefined }),
  })

  return {
    id: availabilityId,
    user_id: 0,
    start_time: new Date().toISOString(),
    end_time: new Date().toISOString(),
    status: 'rejected',
  }
}

export async function getDepartmentAssignments(department: string): Promise<ShiftAssignment[]> {
  const params = new URLSearchParams()
  if (department.trim() !== '') {
    params.set('department', department)
  }
  const data = await apiRequest<Record<string, unknown>[]>(`/assignments/calendar?${params.toString()}`)
  return data.map(mapAssignment)
}

export async function getAdminUsers(filters?: { search?: string; role?: string; active?: '0' | '1' }): Promise<AdminUser[]> {
  const params = new URLSearchParams()
  if (filters?.search && filters.search.trim() !== '') {
    params.set('search', filters.search.trim())
  }
  if (filters?.role && filters.role.trim() !== '') {
    params.set('role', filters.role.trim())
  }
  if (filters?.active) {
    params.set('active', filters.active)
  }

  const suffix = params.toString() ? `?${params.toString()}` : ''
  const data = await apiRequest<Record<string, unknown>[]>(`/admin/users${suffix}`)
  return data.map(mapAdminUser)
}

export async function updateAdminUser(userId: number, payload: AdminUserUpdatePayload): Promise<AdminUser> {
  const data = await apiRequest<Record<string, unknown>>(`/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

  return mapAdminUser(data)
}

export async function deleteAdminUser(userId: number): Promise<void> {
  await apiRequest<Record<string, unknown>>(`/admin/users/${userId}`, {
    method: 'DELETE',
  })
}

export async function getAdminCatalog(category: string, role?: User['local_role']): Promise<CatalogItem[]> {
  const params = new URLSearchParams()
  params.set('category', category)
  if (role) {
    params.set('role', role)
  }

  const data = await apiRequest<Record<string, unknown>[]>(`/admin/catalog?${params.toString()}`)
  return data.map(mapCatalogItem)
}

export async function getAdminSettings(): Promise<AppSettings> {
  const data = await apiRequest<Record<string, unknown>>('/admin/settings')

  return {
    max_candidates_per_day: Number(data.max_candidates_per_day ?? 4),
  }
}

export async function updateAdminSettings(payload: AppSettings): Promise<AppSettings> {
  const data = await apiRequest<Record<string, unknown>>('/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

  return {
    max_candidates_per_day: Number(data.max_candidates_per_day ?? 4),
  }
}

export async function startEntraLogin(): Promise<void> {
  const redirectUrl = getAppAbsoluteUrl()
  const response = await fetch(`/auth/login?redirect=${encodeURIComponent(redirectUrl)}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`Login HTTP ${response.status}`)
  }

  const data = (await response.json()) as { authUrl?: string }
  if (!data.authUrl) {
    throw new Error('Chybí authUrl v odpovědi /auth/login')
  }

  window.location.href = data.authUrl
}

export async function startLocalLogin(username: string, password: string): Promise<User> {
  const response = await fetch(`${API_BASE}/auth/local-login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })

  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<never>
  if (!response.ok || payload.status === 'error') {
    const message = payload.message || `HTTP ${response.status}`
    const error = new Error(message)
    ;(error as Error & { code?: string; status?: number }).code = payload.code
    ;(error as Error & { code?: string; status?: number }).status = response.status
    throw error
  }

  const data = payload.data as { local_user?: Record<string, unknown> } | undefined
  if (!data?.local_user || typeof data.local_user !== 'object') {
    throw new Error('Chybí lokální uživatelský profil.')
  }

  return mapUser({ ...data.local_user, auth_source: 'local' })
}

export async function logoutViaLocalSession(): Promise<void> {
  const response = await fetch(`${API_BASE}/auth/local-logout`, {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`Logout HTTP ${response.status}`)
  }
}

export async function logoutViaEntra(): Promise<void> {
  const origin = getAppAbsoluteUrl()
  const response = await fetch('/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ origin }),
  })

  if (!response.ok) {
    throw new Error(`Logout HTTP ${response.status}`)
  }

  const data = (await response.json()) as { logoutUrl?: string }
  if (data.logoutUrl) {
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = data.logoutUrl.split('?')[0]
    form.style.display = 'none'

    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = 'post_logout_redirect_uri'
    input.value = getAppAbsoluteUrl()
    form.appendChild(input)

    document.body.appendChild(form)
    form.submit()
    return
  }

  window.location.reload()
}
