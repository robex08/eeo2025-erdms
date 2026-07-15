import type { FormEvent } from 'react'
import { Save, ShieldCheck, Trash2, UserCog, Users2, X } from 'lucide-react'
import type { AdminUser, CatalogItem } from '../../../types'
import type { DraftState } from './adminTypes'

type Props = {
  selectedUser: AdminUser
  draft: DraftState
  groupedPermissions: Record<string, CatalogItem[]>
  saving: boolean
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onOpenDeleteDialog: () => void
  onTogglePermission: (code: string) => void
  onDraftChange: (next: DraftState) => void
  formatFullName: (user: AdminUser) => string
}

export function AdminUserEditDrawer({
  selectedUser,
  draft,
  groupedPermissions,
  saving,
  onClose,
  onSubmit,
  onOpenDeleteDialog,
  onTogglePermission,
  onDraftChange,
  formatFullName,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm">
      <div className="ml-auto flex h-full w-full max-w-3xl flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Administrace uživatele</p>
            <h4 className="mt-1 text-2xl font-black text-slate-900">{formatFullName(selectedUser)}</h4>
            <p className="mt-2 text-sm text-slate-600">{selectedUser.username} · {selectedUser.user_principal_name || '-'}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="flex flex-1 flex-col gap-5 overflow-y-auto p-5" onSubmit={onSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">E-mail</span>
              <input
                type="email"
                value={draft.email}
                onChange={(event) => onDraftChange({ ...draft, email: event.target.value })}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Zobrazované jméno</span>
              <input
                value={draft.display_name}
                onChange={(event) => onDraftChange({ ...draft, display_name: event.target.value })}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Titul před jménem</span>
              <input
                value={draft.title_before}
                onChange={(event) => onDraftChange({ ...draft, title_before: event.target.value })}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                placeholder="napr. MUDr."
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Telefon</span>
              <input
                type="text"
                value={draft.phone}
                onChange={(event) => onDraftChange({ ...draft, phone: event.target.value })}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                placeholder="Volitelné pole aplikace"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Titul za jménem</span>
              <input
                value={draft.title_after}
                onChange={(event) => onDraftChange({ ...draft, title_after: event.target.value })}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                placeholder="napr. Ph.D."
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Oddělení</span>
              <input
                value={draft.department}
                onChange={(event) => onDraftChange({ ...draft, department: event.target.value })}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Pracovní pozice</span>
              <input
                value={draft.job_title}
                onChange={(event) => onDraftChange({ ...draft, job_title: event.target.value })}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Role</span>
              <select
                value={draft.local_role}
                onChange={(event) => onDraftChange({ ...draft, local_role: event.target.value as DraftState['local_role'] })}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
              >
                <option value="employee">Zaměstnanec</option>
                <option value="doctor">Lékař</option>
                <option value="head_doctor">Vedoucí lékař</option>
                <option value="paramedic">Záchranář</option>
                <option value="approver">Schvalovatel (legacy)</option>
                <option value="admin">Administrátor</option>
              </select>
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Práva (z číselníku dle role)</span>
            <div className="space-y-3 rounded-2xl border border-slate-300 bg-slate-50/50 p-4">
              {Object.keys(groupedPermissions).length === 0 ? (
                <p className="text-sm text-slate-500">Pro roli nejsou v číselníku aktivní položky.</p>
              ) : (
                Object.entries(groupedPermissions).map(([purpose, values]) => (
                  <div key={purpose} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{purpose}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {values.map((item) => (
                        <label key={item.id} className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                          <input
                            type="checkbox"
                            checked={draft.permissions.includes(item.item_key)}
                            onChange={() => onTogglePermission(item.item_key)}
                            className="mt-0.5 h-4 w-4"
                          />
                          <span>
                            <span className="block text-sm font-semibold text-slate-800">{item.item_value}</span>
                            {item.description ? <span className="block text-xs text-slate-500">{item.description}</span> : null}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Lokální poznámka</span>
            <textarea
              value={draft.local_note}
              onChange={(event) => onDraftChange({ ...draft, local_note: event.target.value })}
              className="min-h-24 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
            />
          </label>

          <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Přihlášení do systému</p>
            <p className="text-xs text-slate-500">Přepínač Aktivní určuje, zda se uživatel může přihlásit jakkoliv (Entra i lokálně).</p>

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={draft.local_login_enabled}
                onChange={(event) => onDraftChange({ ...draft, local_login_enabled: event.target.checked })}
                className="h-4 w-4"
              />
              Povolit lokální přihlášení (username + heslo)
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Lokální username</span>
                <input
                  value={draft.local_login_username}
                  onChange={(event) => onDraftChange({ ...draft, local_login_username: event.target.value })}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                  placeholder="napr. tbezouskova"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Nové lokální heslo</span>
                <input
                  type="password"
                  value={draft.local_login_password}
                  onChange={(event) => onDraftChange({ ...draft, local_login_password: event.target.value })}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                  placeholder="Ponech prázdné pro beze změny"
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.clear_local_login_password}
                onChange={(event) => onDraftChange({ ...draft, clear_local_login_password: event.target.checked })}
                className="h-4 w-4"
              />
              Smazat existující lokální heslo
            </label>
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Motiv</span>
              <select
                value={draft.theme}
                onChange={(event) => onDraftChange({ ...draft, theme: event.target.value as DraftState['theme'] })}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
              >
                <option value="">Bez preference</option>
                <option value="light">Světlý</option>
                <option value="dark">Tmavý</option>
              </select>
            </label>

            <div className="flex items-end gap-3">
              <button
                type="button"
                onClick={() => onDraftChange({ ...draft, notifications_enabled: !draft.notifications_enabled })}
                className={`inline-flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${draft.notifications_enabled ? 'border-cyan-300 bg-cyan-50 text-cyan-900' : 'border-slate-300 bg-white text-slate-700'}`}
              >
                <span>Upozornění</span>
                <ShieldCheck className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onDraftChange({ ...draft, aktivni: !draft.aktivni })}
                className={`inline-flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${draft.aktivni ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-rose-300 bg-rose-50 text-rose-900'}`}
              >
                <span>{draft.aktivni ? 'Aktivní' : 'Neaktivní'}</span>
                <UserCog className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="inline-flex items-center gap-2 text-xs text-slate-500">
              <Users2 className="h-4 w-4" />
              Ukládá se do lokální tabulky burzy.
            </div>
            <div className="flex flex-nowrap gap-2">
              <button
                type="button"
                onClick={onOpenDeleteDialog}
                disabled={saving}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Smazat uživatele
              </button>
              <button type="button" onClick={onClose} className="whitespace-nowrap rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">
                Zavřít
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Ukládám…' : 'Uložit změny'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
