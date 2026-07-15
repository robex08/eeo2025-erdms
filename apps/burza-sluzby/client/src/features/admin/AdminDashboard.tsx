import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { deleteAdminUser, getAdminCatalog, getAdminSettings, getAdminUsers, updateAdminSettings, updateAdminUser } from '../../services/mockApi'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import type { AdminUser, AdminUserUpdatePayload, AppSettings, CatalogItem, Role } from '../../types'
import { AdminOverviewCards } from './components/AdminOverviewCards'
import { AdminSettingsPanel } from './components/AdminSettingsPanel'
import { AdminUsersTablePanel } from './components/AdminUsersTablePanel'
import { AdminUserEditDrawer } from './components/AdminUserEditDrawer'
import { type DraftState } from './components/adminTypes'

const dtf = new Intl.DateTimeFormat('cs-CZ', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function parsePermissions(value: AdminUser['permissions_json']): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter((item) => item !== '')
  }
  if (typeof value === 'string' && value.trim() !== '') {
    try {
      const decoded = JSON.parse(value) as unknown
      if (Array.isArray(decoded)) {
        return decoded.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter((item) => item !== '')
      }
    } catch {
      return []
    }
  }
  return []
}

function toDraft(user: AdminUser): DraftState {
  const settings = typeof user.local_settings === 'object' && user.local_settings !== null ? user.local_settings : {}

  return {
    id: user.id,
    email: user.email ?? '',
    phone: user.phone ?? '',
    display_name: user.display_name ?? '',
    title_before: user.title_before ?? '',
    title_after: user.title_after ?? '',
    department: user.department ?? '',
    job_title: user.job_title ?? '',
    local_role: user.local_role,
    permissions: parsePermissions(user.permissions_json),
    local_note: user.local_note ?? '',
    aktivni: Number(user.aktivni ?? 0) === 1,
    local_login_enabled: Number(user.local_login_enabled ?? 0) === 1,
    local_login_username: user.local_login_username ?? '',
    local_login_password: '',
    clear_local_login_password: false,
    theme: (settings.theme === 'light' || settings.theme === 'dark') ? settings.theme : '',
    notifications_enabled: settings.notifications_enabled === true,
  }
}

function buildPayload(draft: DraftState): AdminUserUpdatePayload {
  const local_settings: Record<string, unknown> = {}
  if (draft.theme !== '') {
    local_settings.theme = draft.theme
  }
  local_settings.notifications_enabled = draft.notifications_enabled

  return {
    email: draft.email,
    phone: draft.phone,
    display_name: draft.display_name,
    title_before: draft.title_before,
    title_after: draft.title_after,
    department: draft.department,
    job_title: draft.job_title,
    local_role: draft.local_role,
    permissions: draft.permissions,
    local_note: draft.local_note,
    aktivni: draft.aktivni,
    local_login_enabled: draft.local_login_enabled,
    local_login_username: draft.local_login_username,
    ...(draft.local_login_password.trim() !== '' ? { local_login_password: draft.local_login_password } : {}),
    ...(draft.clear_local_login_password ? { clear_local_login_password: true } : {}),
    local_settings,
  }
}

function formatFullName(person: { display_name?: string; title_before?: string; title_after?: string; username?: string }): string {
  const baseName = (person.display_name ?? person.username ?? '').trim()
  const before = (person.title_before ?? '').trim()
  const after = (person.title_after ?? '').trim()
  return [before, baseName, after].filter((part) => part !== '').join(' ').trim() || (person.username ?? 'Uživatel')
}

function roleScopePriority(scope: CatalogItem['role_scope'], role: Role): number {
  if (scope === role) {
    return 0
  }

  if (scope === '*') {
    return 2
  }

  return 1
}

function dedupeCatalogItems(items: CatalogItem[], role: Role): CatalogItem[] {
  const byKey = new Map<string, CatalogItem>()

  for (const item of items) {
    const key = item.item_key.trim()
    if (key === '') {
      continue
    }

    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, item)
      continue
    }

    const existingPriority = roleScopePriority(existing.role_scope, role)
    const nextPriority = roleScopePriority(item.role_scope, role)
    if (nextPriority < existingPriority) {
      byKey.set(key, item)
    }
  }

  return Array.from(byKey.values())
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'users' | 'settings'>('users')
  const [items, setItems] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<AppSettings>({ max_candidates_per_day: 4 })
  const [search, setSearch] = useState('')
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | Role>('all')
  const [selectedActiveFilter, setSelectedActiveFilter] = useState<'all' | '1' | '0'>('all')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [draft, setDraft] = useState<DraftState | null>(null)
  const [permissionCatalog, setPermissionCatalog] = useState<CatalogItem[]>([])

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAdminUsers({
        search: search.trim() || undefined,
        role: selectedRoleFilter === 'all' ? undefined : selectedRoleFilter,
        active: selectedActiveFilter === 'all' ? undefined : selectedActiveFilter,
      })
      setItems(data)
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Neznámá chyba'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoleFilter, selectedActiveFilter])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await getAdminSettings()
        setSettings(data)
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Neznámá chyba'
        setError(message)
      }
    }

    void loadSettings()
  }, [])

  const openEdit = (user: AdminUser) => {
    setSelectedUser(user)
    setDraft(toDraft(user))
  }

  const loadPermissionCatalog = async (role: DraftState['local_role']) => {
    try {
      const items = await getAdminCatalog('permissions', role)
      setPermissionCatalog(dedupeCatalogItems(items, role))
    } catch (catalogError) {
      const message = catalogError instanceof Error ? catalogError.message : 'Neznámá chyba'
      setError(message)
    }
  }

  useEffect(() => {
    if (!draft) {
      setPermissionCatalog([])
      return
    }

    void loadPermissionCatalog(draft.local_role)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.local_role])

  useEffect(() => {
    if (!draft || permissionCatalog.length === 0) {
      return
    }

    const allowed = new Set(permissionCatalog.map((item) => item.item_key))
    const filtered = draft.permissions.filter((perm) => allowed.has(perm))
    if (filtered.length !== draft.permissions.length) {
      setDraft((prev) => (prev ? { ...prev, permissions: filtered } : prev))
    }
  }, [permissionCatalog, draft])

  const closeEdit = () => {
    setSelectedUser(null)
    setDraft(null)
    setDeleteDialogOpen(false)
  }

  const handleSearchSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await loadUsers()
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft || !selectedUser) {
      return
    }

    setSaving(true)
    setError(null)
    try {
      const updated = await updateAdminUser(selectedUser.id, buildPayload(draft))
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setSelectedUser(updated)
      setDraft(toDraft(updated))
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Neznámá chyba'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) {
      return
    }

    setSaving(true)
    setError(null)
    try {
      await deleteAdminUser(selectedUser.id)
      setItems((prev) => prev.filter((item) => item.id !== selectedUser.id))
      closeEdit()
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Neznámá chyba'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const handleSettingsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSettingsSaving(true)
    setError(null)
    try {
      const updated = await updateAdminSettings(settings)
      setSettings(updated)
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Neznámá chyba'
      setError(message)
    } finally {
      setSettingsSaving(false)
    }
  }

  const activeCount = useMemo(() => items.filter((item) => Number(item.aktivni ?? 0) === 1).length, [items])
  const adminCount = useMemo(() => items.filter((item) => item.local_role === 'admin').length, [items])
  const groupedPermissions = useMemo(() => {
    return permissionCatalog.reduce<Record<string, CatalogItem[]>>((acc, item) => {
      const key = item.purpose && item.purpose.trim() !== '' ? item.purpose : 'ostatni'
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(item)
      return acc
    }, {})
  }, [permissionCatalog])

  const togglePermission = (code: string) => {
    setDraft((prev) => {
      if (!prev) {
        return prev
      }

      const has = prev.permissions.includes(code)
      return {
        ...prev,
        permissions: has
          ? prev.permissions.filter((item) => item !== code)
          : [...prev.permissions, code],
      }
    })
  }

  return (
    <div className="space-y-6">
      <AdminOverviewCards activeCount={activeCount} adminCount={adminCount} />

      <section className="rounded-[20px] border border-slate-200 bg-white/90 p-2 shadow-[0_8px_28px_rgba(15,118,110,0.08)]">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${activeTab === 'users' ? 'bg-cyan-700 text-white shadow-md shadow-cyan-200' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
          >
            Uživatelé
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${activeTab === 'settings' ? 'bg-cyan-700 text-white shadow-md shadow-cyan-200' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
          >
            Nastavení aplikace
          </button>
        </div>
      </section>

      {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</p>}

      {activeTab === 'settings' ? (
        <AdminSettingsPanel
          settings={settings}
          settingsSaving={settingsSaving}
          onSettingsChange={setSettings}
          onSubmit={handleSettingsSubmit}
        />
      ) : (
        <AdminUsersTablePanel
          search={search}
          selectedRoleFilter={selectedRoleFilter}
          selectedActiveFilter={selectedActiveFilter}
          loading={loading}
          items={items}
          dtf={dtf}
          onSearchChange={setSearch}
          onRoleFilterChange={setSelectedRoleFilter}
          onActiveFilterChange={setSelectedActiveFilter}
          onSearchSubmit={handleSearchSubmit}
          onOpenEdit={openEdit}
          formatFullName={formatFullName}
        />
      )}

      {selectedUser && draft && (
        <AdminUserEditDrawer
          selectedUser={selectedUser}
          draft={draft}
          groupedPermissions={groupedPermissions}
          saving={saving}
          onClose={closeEdit}
          onSubmit={handleSave}
          onOpenDeleteDialog={() => setDeleteDialogOpen(true)}
          onTogglePermission={togglePermission}
          onDraftChange={(next) => setDraft(next)}
          formatFullName={formatFullName}
        />
      )}

      <ConfirmDialog
        open={deleteDialogOpen && selectedUser !== null}
        title="Smazání uživatele"
        message={`Opravdu smazat uživatele ${selectedUser?.display_name || selectedUser?.username || ''}?`}
        confirmText="Smazat"
        cancelText="Zrušit"
        danger
        loading={saving}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={() => void handleDeleteUser()}
      />
    </div>
  )
}
