import type { FormEvent } from 'react'
import { PencilLine, Search } from 'lucide-react'
import type { AdminUser, Role } from '../../../types'
import { roleLabels } from './adminTypes'

type Props = {
  search: string
  selectedRoleFilter: 'all' | Role
  selectedActiveFilter: 'all' | '1' | '0'
  loading: boolean
  items: AdminUser[]
  dtf: Intl.DateTimeFormat
  onSearchChange: (value: string) => void
  onRoleFilterChange: (value: 'all' | Role) => void
  onActiveFilterChange: (value: 'all' | '1' | '0') => void
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void
  onOpenEdit: (user: AdminUser) => void
  formatFullName: (user: AdminUser) => string
}

export function AdminUsersTablePanel({
  search,
  selectedRoleFilter,
  selectedActiveFilter,
  loading,
  items,
  dtf,
  onSearchChange,
  onRoleFilterChange,
  onActiveFilterChange,
  onSearchSubmit,
  onOpenEdit,
  formatFullName,
}: Props) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,118,110,0.10)]">
      <div className="flex flex-wrap items-end gap-3">
        <form onSubmit={onSearchSubmit} className="flex min-w-[260px] flex-1 items-center gap-2 rounded-2xl border border-slate-300 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full border-0 bg-transparent text-sm outline-none"
            placeholder="Hledat podle jména, username, oddělení..."
          />
          <button type="submit" className="rounded-xl bg-cyan-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-800">
            Hledat
          </button>
        </form>

        <select
          value={selectedRoleFilter}
          onChange={(event) => onRoleFilterChange(event.target.value as 'all' | Role)}
          className="rounded-2xl border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">Všechny role</option>
          <option value="employee">Zaměstnanec</option>
          <option value="doctor">Lékař</option>
          <option value="head_doctor">Vedoucí lékař</option>
          <option value="paramedic">Záchranář</option>
          <option value="approver">Schvalovatel (legacy)</option>
          <option value="admin">Administrátor</option>
        </select>

        <select
          value={selectedActiveFilter}
          onChange={(event) => onActiveFilterChange(event.target.value as 'all' | '1' | '0')}
          className="rounded-2xl border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">Aktivní + neaktivní</option>
          <option value="1">Jen aktivní</option>
          <option value="0">Jen neaktivní</option>
        </select>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2 pr-4 font-semibold">Uživatel</th>
              <th className="py-2 pr-4 font-semibold">Role</th>
              <th className="py-2 pr-4 font-semibold">Oddělení</th>
              <th className="py-2 pr-4 font-semibold">Aktivní</th>
              <th className="py-2 pr-4 font-semibold">Poslední přihlášení</th>
              <th className="py-2 pr-4 font-semibold">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500">Načítám uživatele…</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pr-4">
                    <p className="font-semibold text-slate-900">{formatFullName(item)}</p>
                    <p className="text-xs text-slate-500">{item.username} · {item.email || '-'}</p>
                  </td>
                  <td className="py-3 pr-4">{roleLabels[item.local_role]}</td>
                  <td className="py-3 pr-4">{item.department || '-'}</td>
                  <td className="py-3 pr-4">{Number(item.aktivni ?? 0) === 1 ? 'Ano' : 'Ne'}</td>
                  <td className="py-3 pr-4 text-slate-600">{item.last_login_at ? dtf.format(new Date(item.last_login_at)) : 'Nikdy'}</td>
                  <td className="py-3 pr-4">
                    <button
                      type="button"
                      onClick={() => onOpenEdit(item)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                      Upravit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
