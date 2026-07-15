import type { ComponentType, ReactNode } from 'react'
import { Bell, BriefcaseMedical, CalendarDays, ClipboardList, LogOut, ShieldCheck, UserCog, UserRound } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import type { Role, User } from '../../types'

type LayoutProps = {
  user: User
  authSource?: 'entra' | 'local'
  onLogout: () => void
  logoutLoading: boolean
  children: ReactNode
}

type NavItem = {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  visibleFor: Role[]
}

const navItems: NavItem[] = [
  { to: '/employee', label: 'Můj kalendář', icon: CalendarDays, visibleFor: ['employee', 'doctor', 'paramedic', 'head_doctor', 'approver', 'admin'] },
  { to: '/approver', label: 'Schvalovací rozpis', icon: ClipboardList, visibleFor: ['head_doctor', 'approver', 'admin'] },
  { to: '/admin', label: 'Administrace', icon: UserCog, visibleFor: ['admin'] },
]

const roleLabels: Record<Role, string> = {
  employee: 'Zaměstnanec',
  doctor: 'Lékař',
  head_doctor: 'Vedoucí lékař',
  paramedic: 'Záchranář',
  approver: 'Schvalovatel (legacy)',
  admin: 'Administrátor',
}

function formatFullName(user: User): string {
  const before = (user.title_before ?? '').trim()
  const base = (user.display_name ?? '').trim()
  const after = (user.title_after ?? '').trim()
  return [before, base, after].filter((part) => part !== '').join(' ').trim() || 'Uživatel'
}

export function AppLayout({ user, authSource = 'entra', onLogout, logoutLoading, children }: LayoutProps) {
  const authLabel = authSource === 'local' ? 'Lokální relace aktivní' : 'Entra ID relace aktivní'

  return (
    <div className="min-h-screen bg-[linear-gradient(145deg,#e6f8f6_0%,#e0ecff_55%,#eef4ff_100%)] text-slate-900">
      <div className="flex min-h-screen w-full gap-6 px-4 py-6 lg:px-8">
        <aside className="hidden w-80 flex-col rounded-3xl border border-cyan-200/70 bg-white/75 p-6 shadow-xl shadow-cyan-200/40 backdrop-blur lg:flex">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-cyan-600 to-emerald-600 p-2 text-white">
              <BriefcaseMedical className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold tracking-[0.2em] text-cyan-700">ZZS SK, p.o.</p>
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">v1.01</span>
              </div>
              <h1 className="text-xl font-bold">Burza služeb</h1>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-2">
            {navItems
              .filter((item) => item.visibleFor.includes(user.local_role))
              .map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        'group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition',
                        isActive
                          ? 'bg-gradient-to-r from-cyan-600 to-emerald-600 text-white shadow-lg shadow-cyan-200'
                          : 'text-slate-700 hover:bg-white hover:text-slate-900',
                      ].join(' ')
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
          </nav>

          <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-700">Přihlášení</p>
            <p className="mt-2 text-sm text-slate-700">
              Role i práva se načítají z Entra ID + lokálního profilu Burza služby.
            </p>
          </div>
        </aside>

        <div className="flex min-h-full flex-1 flex-col gap-4">
          <header className="rounded-3xl border border-white/80 bg-white/75 p-5 shadow-md shadow-slate-200/60 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">Přehled</p>
                <h2 className="mt-1 text-2xl font-bold">{formatFullName(user)}</h2>
                <p className="text-sm text-slate-600">
                  {user.department} | {roleLabels[user.local_role]}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-2xl bg-cyan-50 px-3 py-2 text-sm text-cyan-800 sm:flex">
                  <ShieldCheck className="h-4 w-4" />
                  {authLabel}
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  <Bell className="h-4 w-4" />
                  Upozornění
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  disabled={logoutLoading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
                >
                  <LogOut className="h-4 w-4" />
                  {logoutLoading ? 'Odhlašuji…' : 'Odhlásit'}
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 rounded-3xl border border-white/80 bg-white/88 p-4 shadow-lg shadow-slate-200/60 sm:p-6">
            <div className="mb-4 flex items-center justify-between lg:hidden">
              <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700">
                <UserRound className="h-4 w-4" />
                Burza služeb
              </Link>
            </div>

            <nav className="mb-4 flex flex-wrap gap-2 lg:hidden">
              {navItems
                .filter((item) => item.visibleFor.includes(user.local_role))
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        'rounded-xl border px-3 py-1.5 text-xs font-semibold transition',
                        isActive
                          ? 'border-cyan-500 bg-cyan-600 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-cyan-400',
                      ].join(' ')
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
            </nav>
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
