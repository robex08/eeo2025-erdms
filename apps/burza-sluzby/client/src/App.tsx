import type { ReactNode } from 'react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { AppLayout } from './components/layout/AppLayout'
import { AdminDashboard } from './features/admin/AdminDashboard'
import { ApproverDashboard } from './features/approver/ApproverDashboard'
import { EmployeeDashboard } from './features/employee/EmployeeDashboard'
import { getCurrentUser, logoutViaEntra, logoutViaLocalSession, startEntraLogin, startLocalLogin } from './services/mockApi'
import type { Role, User } from './types'

function UnauthorizedScreen() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
      <h3 className="text-xl font-bold">Tato sekce není dostupná pro aktuální roli.</h3>
      <p className="mt-2 text-sm">Pokračujte do sekce, ke které máte oprávnění.</p>
    </div>
  )
}

function withRoleAccess(user: User, allowed: Role[], element: ReactNode) {
  return allowed.includes(user.local_role) ? element : <UnauthorizedScreen />
}

function AppRoutes({ user }: { user: User }) {
  const defaultRoute = useMemo(() => {
    if (user.local_role === 'admin') {
      return '/admin'
    }
    if (user.local_role === 'head_doctor' || user.local_role === 'approver') {
      return '/approver'
    }
    return '/employee'
  }, [user.local_role])

  return (
    <Routes>
      <Route path="/" element={<Navigate to={defaultRoute} replace />} />
      <Route path="/employee" element={withRoleAccess(user, ['employee', 'doctor', 'paramedic', 'head_doctor', 'approver', 'admin'], <EmployeeDashboard user={user} />)} />
      <Route path="/approver" element={withRoleAccess(user, ['head_doctor', 'approver', 'admin'], <ApproverDashboard user={user} />)} />
      <Route path="/admin" element={withRoleAccess(user, ['admin'], <AdminDashboard />)} />
      <Route path="*" element={<Navigate to={defaultRoute} replace />} />
    </Routes>
  )
}

const localLoginEnabled = String(import.meta.env.VITE_BURZA_LOCAL_LOGIN_ENABLED ?? '').trim() === '1'

function LoginScreen({
  error,
  onLogin,
  onLocalLogin,
}: {
  error: string | null
  onLogin: () => Promise<void>
  onLocalLogin: (username: string, password: string) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const [localLoading, setLocalLoading] = useState(false)
  const [localUsername, setLocalUsername] = useState('')
  const [localPassword, setLocalPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [showLocalPassword, setShowLocalPassword] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    try {
      await onLogin()
    } catch {
      setLoading(false)
    }
  }

  const handleLocalLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLocalLoading(true)
    setLocalError(null)

    try {
      await onLocalLogin(localUsername, localPassword)
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : 'Neznámá chyba'
      setLocalError(message)
    } finally {
      setLocalLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(125deg,#0b1020_0%,#13233d_36%,#0f766e_100%)] p-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/30 bg-white/95 p-8 shadow-2xl backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">ZZS SK • Burza služeb</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Přihlášení přes Entra ID</h1>
        <p className="mt-3 text-sm text-slate-600">
          Aplikace používá centrální ERDMS autentizaci. Přihlaste se účtem Microsoft 365.
        </p>
        {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
        <button
          type="button"
          onClick={() => void handleLogin()}
          disabled={loading}
          className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60"
        >
          {loading ? 'Přesměrovávám na přihlášení…' : 'Přihlásit přes Microsoft 365'}
        </button>

        {localLoginEnabled && (
          <form className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4" onSubmit={(event) => void handleLocalLogin(event)}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">DEV admin přístup</p>
            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={localUsername}
                onChange={(event) => setLocalUsername(event.target.value)}
                placeholder="Username"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500"
                autoComplete="username"
              />
              <div className="relative">
                <input
                  type={showLocalPassword ? 'text' : 'password'}
                  value={localPassword}
                  onChange={(event) => setLocalPassword(event.target.value)}
                  placeholder="Heslo"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 pr-11 text-sm outline-none focus:border-cyan-500"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowLocalPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 transition hover:text-slate-800"
                  aria-label={showLocalPassword ? 'Skrýt heslo' : 'Zobrazit heslo'}
                >
                  {showLocalPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {localError && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{localError}</p>}
            <button
              type="submit"
              disabled={localLoading}
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
            >
              {localLoading ? 'Přihlašuji…' : 'Přihlásit lokální admin účet'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authSource, setAuthSource] = useState<'entra' | 'local'>('entra')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [logoutLoading, setLogoutLoading] = useState(false)

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const current = await getCurrentUser()
        setUser(current)
        setAuthSource(current.auth_source ?? 'entra')
      } catch (bootstrapError) {
        const status = (bootstrapError as Error & { status?: number }).status
        const code = (bootstrapError as Error & { code?: string }).code
        const fallbackMessage = bootstrapError instanceof Error ? bootstrapError.message : 'Neznámá chyba'
        const message = code === 'access_pending_approval'
          ? 'Váš účet byl založen a čeká na schválení administrátorem.'
          : code === 'access_rejected'
            ? 'Váš přístup do systému byl administrátorem zamítnut.'
            : fallbackMessage
        if (status === 401) {
          setUser(null)
          setError(null)
        } else {
          setError(message)
        }
      } finally {
        setLoading(false)
      }
    }

    void bootstrap()
  }, [])

  const handleLogout = async () => {
    setLogoutLoading(true)
    try {
      if (authSource === 'local') {
        await logoutViaLocalSession()
      } else {
        await logoutViaEntra()
      }

      // Ihned přepnout UI do odhlášeného stavu bez nutnosti reloadu.
      setUser(null)
      setAuthSource('entra')
      setError(null)
    } catch (logoutError) {
      const message = logoutError instanceof Error ? logoutError.message : 'Neznámá chyba'
      setError(message)
    } finally {
      setLogoutLoading(false)
    }
  }

  const handleLogin = async () => {
    setError(null)
    try {
      await startEntraLogin()
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : 'Neznámá chyba'
      setError(message)
    }
  }

  const handleLocalLogin = async (username: string, password: string) => {
    setError(null)
    const current = await startLocalLogin(username, password)
    setUser(current)
    setAuthSource(current.auth_source ?? 'local')
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100">
        <div className="rounded-2xl bg-white p-6 text-slate-700 shadow-lg">Načítám aplikaci Burza služeb…</div>
      </main>
    )
  }

  if (!user) {
    return <LoginScreen error={error} onLogin={handleLogin} onLocalLogin={handleLocalLogin} />
  }

  return (
    <AppLayout user={user} authSource={authSource} onLogout={handleLogout} logoutLoading={logoutLoading}>
      <AppRoutes user={user} />
      {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
    </AppLayout>
  )
}
