import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { UserRound, X } from 'lucide-react'
import { approveAvailability, getDepartmentAssignments, getPendingAvailabilitiesForDepartment, rejectAvailability } from '../../services/mockApi'
import type { Availability, ShiftAssignment, User } from '../../types'
import { ShiftCalendar } from '../calendar/ShiftCalendar'
import { addDays, addMonths, cloneDate, formatMonthLabel, startOfDay, toDateKey } from '../calendar/calendarUtils'

type Props = {
  user: User
}

const dtf = new Intl.DateTimeFormat('cs-SK', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const dayLabelFormatter = new Intl.DateTimeFormat('cs-SK', {
  dateStyle: 'full',
})

const weekdayFormatter = new Intl.DateTimeFormat('cs-SK', {
  weekday: 'long',
})

const dayDateFormatter = new Intl.DateTimeFormat('cs-SK', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
})

function getTodayLocalKey(): string {
  const date = new Date()
  const pad = (v: number) => String(v).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function parseShiftType(item: Availability): string {
  const custom = item.metadata?.preferred_station
  if (custom && custom.trim() !== '') {
    return custom
  }

  return 'standard'
}

function mapShiftTypeLabel(raw: string): string | null {
  const value = raw.trim().toLowerCase()
  if (value === '') {
    return null
  }
  if (value === 'day' || value === 'day12') {
    return 'Denní 12h'
  }
  if (value === 'night' || value === 'night12') {
    return 'Noční 12h'
  }
  if (value === 'day24' || value === '24h' || value === '24') {
    return '24h služba'
  }
  if (value === 'standard') {
    return null
  }
  return null
}

function inferShiftLabel(startIso: string, endIso: string, rawType?: string): string {
  const mapped = mapShiftTypeLabel(rawType ?? '')
  if (mapped) {
    return mapped
  }

  const start = new Date(startIso)
  const end = new Date(endIso)
  const durationHours = Math.round((end.getTime() - start.getTime()) / (60 * 60 * 1000))
  const startHour = start.getHours()
  const endHour = end.getHours()

  if (durationHours >= 23 && durationHours <= 25) {
    return '24h služba'
  }
  if (durationHours === 12 && startHour === 7 && endHour === 19) {
    return 'Denní 12h'
  }
  if (durationHours === 12 && startHour === 19 && endHour === 7) {
    return 'Noční 12h'
  }

  return `${Math.max(durationHours, 0)}h služba`
}

function formatWeekday(startIso: string): string {
  return weekdayFormatter.format(new Date(startIso))
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function formatCompactMeta(startIso: string, endIso: string, statusLabel: string): string {
  return `${formatWeekday(startIso)} ${dayDateFormatter.format(new Date(startIso))} · ${formatTime(startIso)}-${formatTime(endIso)} · ${statusLabel}`
}

function compactCandidateName(name: string): string {
  const raw = name.trim()
  if (raw === '') {
    return 'Uživatel'
  }

  const [short] = raw.split('|')
  return (short ?? raw).trim()
}

function overlapsDay(startIso: string, endIso: string, day: Date): boolean {
  const dayStart = day.getTime()
  const dayEnd = addDays(day, 1).getTime()
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  return start < dayEnd && end > dayStart
}

function forEachOverlappedDay(startIso: string, endIso: string, callback: (dayKey: string) => void): void {
  const start = new Date(startIso)
  const end = new Date(endIso)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    return
  }

  let cursor = startOfDay(start)
  while (cursor.getTime() < end.getTime()) {
    callback(toDateKey(cursor))
    cursor = addDays(cursor, 1)
  }
}

export function ApproverDashboard({ user }: Props) {
  const [pending, setPending] = useState<Availability[]>([])
  const [rejected, setRejected] = useState<Availability[]>([])
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [calendarDate, setCalendarDate] = useState(() => startOfDay(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()))
  const [dayPanelOpen, setDayPanelOpen] = useState(false)
  const [mode, setMode] = useState<'month' | 'week'>('month')
  const [calendarFilters, setCalendarFilters] = useState<{ pending: boolean; approved: boolean; rejected: boolean }>({
    pending: true,
    approved: true,
    rejected: true,
  })

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [pendingData, rejectedData, assignmentData] = await Promise.all([
        getPendingAvailabilitiesForDepartment('', ['pending']),
        getPendingAvailabilitiesForDepartment('', ['rejected']),
        getDepartmentAssignments(''),
      ])
      setPending(pendingData)
      setRejected(rejectedData)
      setAssignments(assignmentData)
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Neznámá chyba'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [user.department])

  const handleApproveDecision = async (params: {
    availabilityId: number
    assignedDepartment: string
    assignedStart: string
    assignedEnd: string
    shiftType: string
  }) => {
    setBusyId(params.availabilityId)
    setError(null)
    try {
      await approveAvailability({
        availabilityId: params.availabilityId,
        assigned_department: params.assignedDepartment,
        assigned_start: params.assignedStart,
        assigned_end: params.assignedEnd,
        metadata: {
          is_overtime: false,
          shift_type: params.shiftType,
        },
      })
      await loadData()
    } catch (approveError) {
      const message = approveError instanceof Error ? approveError.message : 'Neznámá chyba'
      setError(message)
    } finally {
      setBusyId(null)
    }
  }

  const handleApproveAvailability = async (availability: Availability) => {
    const assignedDepartment = (availability.user?.department ?? '').trim() || user.department
    await handleApproveDecision({
      availabilityId: availability.id,
      assignedDepartment,
      assignedStart: availability.start_time,
      assignedEnd: availability.end_time,
      shiftType: parseShiftType(availability),
    })
  }

  const handleApproveAssignment = async (assignment: ShiftAssignment) => {
    const assignedDepartment = assignment.assigned_department.trim() || (assignment.user?.department ?? '').trim() || user.department
    await handleApproveDecision({
      availabilityId: assignment.availability_id,
      assignedDepartment,
      assignedStart: assignment.assigned_start,
      assignedEnd: assignment.assigned_end,
      shiftType: assignment.metadata?.shift_type ?? 'standard',
    })
  }

  const handleReject = async (availabilityId: number) => {
    setBusyId(availabilityId)
    setError(null)
    try {
      await rejectAvailability(availabilityId)
      await loadData()
    } catch (rejectError) {
      const message = rejectError instanceof Error ? rejectError.message : 'Neznámá chyba'
      setError(message)
    } finally {
      setBusyId(null)
    }
  }

  const queueCount = pending.length
  const rejectedCount = rejected.length
  const approvedCount = assignments.length
  const totalRequestsCount = queueCount + approvedCount + rejectedCount
  const assignedToday = useMemo(
    () => assignments.filter((item) => item.assigned_start.slice(0, 10) === getTodayLocalKey()).length,
    [assignments],
  )
  const selectedDayLabel = useMemo(() => dayLabelFormatter.format(selectedDate), [selectedDate])

  const dayStatusByDate = useMemo(() => {
    const counters: Record<string, { pending: number; approved: number; rejected: number }> = {}

    const ensure = (dayKey: string) => {
      if (!counters[dayKey]) {
        counters[dayKey] = { pending: 0, approved: 0, rejected: 0 }
      }
      return counters[dayKey]
    }

    if (calendarFilters.pending) {
      pending.forEach((item) => {
        forEachOverlappedDay(item.start_time, item.end_time, (dayKey) => {
          ensure(dayKey).pending += 1
        })
      })
    }

    if (calendarFilters.approved) {
      assignments.forEach((item) => {
        forEachOverlappedDay(item.assigned_start, item.assigned_end, (dayKey) => {
          ensure(dayKey).approved += 1
        })
      })
    }

    if (calendarFilters.rejected) {
      rejected.forEach((item) => {
        forEachOverlappedDay(item.start_time, item.end_time, (dayKey) => {
          ensure(dayKey).rejected += 1
        })
      })
    }

    return counters
  }, [assignments, calendarFilters, pending, rejected])

  const dayBadgeByDate = useMemo(() => {
    const namesByDay: Record<string, { pending: string[]; approved: string[]; rejected: string[] }> = {}

    const ensureNames = (dayKey: string) => {
      if (!namesByDay[dayKey]) {
        namesByDay[dayKey] = { pending: [], approved: [], rejected: [] }
      }
      return namesByDay[dayKey]
    }

    if (calendarFilters.pending) {
      pending.forEach((item) => {
        forEachOverlappedDay(item.start_time, item.end_time, (dayKey) => {
          ensureNames(dayKey).pending.push(compactCandidateName(item.user?.display_name ?? `#${item.user_id}`))
        })
      })
    }

    if (calendarFilters.approved) {
      assignments.forEach((item) => {
        forEachOverlappedDay(item.assigned_start, item.assigned_end, (dayKey) => {
          ensureNames(dayKey).approved.push(compactCandidateName(item.user?.display_name ?? `#${item.user_id}`))
        })
      })
    }

    if (calendarFilters.rejected) {
      rejected.forEach((item) => {
        forEachOverlappedDay(item.start_time, item.end_time, (dayKey) => {
          ensureNames(dayKey).rejected.push(compactCandidateName(item.user?.display_name ?? `#${item.user_id}`))
        })
      })
    }

    return Object.entries(dayStatusByDate).reduce<Record<string, { count: number; tooltip?: ReactNode }>>((acc, [dayKey, value]) => {
      const total = value.pending + value.approved + value.rejected
      const names = namesByDay[dayKey] ?? { pending: [], approved: [], rejected: [] }
      acc[dayKey] = {
        count: total,
        tooltip: (
          <div className="space-y-2 text-xs">
            <div className="font-semibold text-slate-100">Souhrn dne</div>
            <div>
              <div className="font-semibold text-amber-200">Čeká: {value.pending}</div>
              {names.pending.length > 0 ? names.pending.map((name, index) => (
                <div key={`${dayKey}-p-${name}-${index}`} className="text-amber-100/90">• {name}</div>
              )) : <div className="text-slate-300">-</div>}
            </div>
            <div>
              <div className="font-semibold text-emerald-200">Schváleno: {value.approved}</div>
              {names.approved.length > 0 ? names.approved.map((name, index) => (
                <div key={`${dayKey}-a-${name}-${index}`} className="text-emerald-100/90">• {name}</div>
              )) : <div className="text-slate-300">-</div>}
            </div>
            <div>
              <div className="font-semibold text-rose-200">Zamítnuto: {value.rejected}</div>
              {names.rejected.length > 0 ? names.rejected.map((name, index) => (
                <div key={`${dayKey}-r-${name}-${index}`} className="text-rose-100/90">• {name}</div>
              )) : <div className="text-slate-300">-</div>}
            </div>
          </div>
        ),
      }
      return acc
    }, {})
  }, [assignments, calendarFilters, dayStatusByDate, pending, rejected])

  const dayHighlightByDate = useMemo(() => {
    const highlighted: Record<string, boolean> = {}
    if (calendarFilters.approved) {
      assignments.forEach((item) => {
        forEachOverlappedDay(item.assigned_start, item.assigned_end, (dayKey) => {
          highlighted[dayKey] = true
        })
      })
    }
    return highlighted
  }, [assignments, calendarFilters.approved])

  const selectedPending = useMemo(
    () => pending.filter((item) => overlapsDay(item.start_time, item.end_time, selectedDate)),
    [pending, selectedDate],
  )
  const selectedRejected = useMemo(
    () => rejected.filter((item) => overlapsDay(item.start_time, item.end_time, selectedDate)),
    [rejected, selectedDate],
  )
  const selectedApproved = useMemo(
    () => assignments.filter((item) => overlapsDay(item.assigned_start, item.assigned_end, selectedDate)),
    [assignments, selectedDate],
  )
  const visiblePending = calendarFilters.pending ? selectedPending : []
  const visibleApproved = calendarFilters.approved ? selectedApproved : []
  const visibleRejected = calendarFilters.rejected ? selectedRejected : []
  const visibleSelectedTotal = visiblePending.length + visibleApproved.length + visibleRejected.length

  const openDayPanel = (day: Date) => {
    setSelectedDate(startOfDay(day))
    setDayPanelOpen(true)
  }

  const closeDayPanel = () => {
    setDayPanelOpen(false)
  }

  const sidebar = (
    <div className="space-y-4">
      <div className="rounded-3xl border border-rose-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Schvalovací panel</p>
        <div className="mt-4 grid gap-3">
          <div className="rounded-2xl bg-rose-50 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-rose-700">Čeká ve frontě</p>
            <p className="mt-1 text-2xl font-black text-rose-900">{queueCount}</p>
          </div>
          <div className="rounded-2xl bg-cyan-50 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-700">Přiřazeno dnes</p>
            <p className="mt-1 text-2xl font-black text-cyan-900">{assignedToday}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-700">Celkem schváleno</p>
            <p className="mt-1 text-2xl font-black text-emerald-900">{approvedCount}</p>
          </div>
          <div className="rounded-2xl bg-rose-50 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-rose-700">Celkem zamítnuto</p>
            <p className="mt-1 text-2xl font-black text-rose-900">{rejectedCount}</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Denní přehled</p>
          <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-600">{visibleSelectedTotal} položek</span>
        </div>
        <p className="mt-2 text-sm font-semibold text-slate-800">{selectedDayLabel}</p>

        <div className="mt-3 rounded-2xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800">
          Klik na hlavičku dne jen přepíná přehled. Klik do spodního bloku dne v kalendáři otevře slide panel.
        </div>

        <div className="mt-3 space-y-3">
          {calendarFilters.pending && (
          <div className="rounded-2xl border border-amber-100 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Čeká na schválení</p>
              <span className="text-xs font-black text-amber-800">{visiblePending.length}</span>
            </div>
            {visiblePending.length === 0 ? (
              <p className="text-xs text-slate-500">Bez čekajících žádostí.</p>
            ) : (
              <div className="space-y-2">
                {visiblePending.map((item) => (
                  <div key={`pending-sidebar-${item.id}`} className="rounded-xl border border-amber-100 bg-amber-50/40 p-2.5">
                    <p className="text-sm font-bold text-slate-900">{compactCandidateName(item.user?.display_name ?? `#${item.user_id}`)}</p>
                    <p className="text-xs text-slate-600">{dtf.format(new Date(item.start_time))} – {dtf.format(new Date(item.end_time))}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {calendarFilters.approved && (
          <div className="rounded-2xl border border-emerald-100 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Schválené</p>
              <span className="text-xs font-black text-emerald-800">{visibleApproved.length}</span>
            </div>
            {visibleApproved.length === 0 ? (
              <p className="text-xs text-slate-500">Bez schválených směn.</p>
            ) : (
              <div className="space-y-2">
                {visibleApproved.map((item) => (
                  <div key={`approved-sidebar-${item.id}`} className="rounded-xl border border-emerald-100 bg-emerald-50/35 p-2.5">
                    <p className="text-sm font-bold text-slate-900">{compactCandidateName(item.user?.display_name ?? `#${item.user_id}`)}</p>
                    <p className="text-xs text-slate-600">{dtf.format(new Date(item.assigned_start))} – {dtf.format(new Date(item.assigned_end))}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {calendarFilters.rejected && (
          <div className="rounded-2xl border border-rose-100 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">Zamítnuté</p>
              <span className="text-xs font-black text-rose-800">{visibleRejected.length}</span>
            </div>
            {visibleRejected.length === 0 ? (
              <p className="text-xs text-slate-500">Bez zamítnutých žádostí.</p>
            ) : (
              <div className="space-y-2">
                {visibleRejected.map((item) => (
                  <div key={`rejected-sidebar-${item.id}`} className="rounded-xl border border-rose-100 bg-rose-50/35 p-2.5">
                    <p className="text-sm font-bold text-slate-900">{compactCandidateName(item.user?.display_name ?? `#${item.user_id}`)}</p>
                    <p className="text-xs text-slate-600">{dtf.format(new Date(item.start_time))} – {dtf.format(new Date(item.end_time))}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[24px] border border-rose-100 bg-[linear-gradient(135deg,#fff1f2_0%,#ffffff_100%)] p-5 shadow-sm shadow-rose-100/40">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-700">Žádostí celkem</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{totalRequestsCount}</p>
          <p className="mt-2 text-sm text-slate-600">Součet čekajících, schválených i zamítnutých.</p>
        </article>
        <article className="rounded-[24px] border border-cyan-100 bg-[linear-gradient(135deg,#ecf9ff_0%,#ffffff_100%)] p-5 shadow-sm shadow-cyan-100/30">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">Dnes přiřazeno</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{assignedToday}</p>
          <p className="mt-2 text-sm text-slate-600">Aktivní zásahy v oddělení.</p>
        </article>
        <article className="rounded-[24px] border border-emerald-100 bg-[linear-gradient(135deg,#ecfff5_0%,#ffffff_100%)] p-5 shadow-sm shadow-emerald-100/30">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Schválené směny</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{approvedCount}</p>
          <p className="mt-2 text-sm text-slate-600">Celkový objem přiřazení.</p>
        </article>
      </section>

      {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</p>}

      <ShiftCalendar
        title="Hlavní schvalovací kalendář"
        subtitle=""
        currentDate={calendarDate}
        mode={mode}
        onModeChange={setMode}
        onNavigate={(direction) => setCalendarDate((value) => addMonths(cloneDate(value), direction))}
        onToday={() => setCalendarDate(startOfDay(new Date()))}
        onDayClick={(day) => setSelectedDate(startOfDay(day))}
        onDayBodyClick={openDayPanel}
        statusFilter={calendarFilters}
        onToggleStatusFilter={(status) => setCalendarFilters((prev) => ({ ...prev, [status]: !prev[status] }))}
        itemsByDate={{}}
        dayHighlightByDate={dayHighlightByDate}
        dayStatusByDate={dayStatusByDate}
        dayBadgeByDate={dayBadgeByDate}
        useItemCountAsBadgeFallback={false}
        dayActionLabel="žádost"
        emptyMessage={loading ? 'Načítám...' : 'Bez žádostí'}
        sidebar={sidebar}
      />

      {dayPanelOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed left-0 top-0 z-[1000] m-0 h-dvh w-screen bg-slate-950/35 backdrop-blur-sm" style={{ inset: 0 }}>
          <div className="ml-auto flex h-dvh w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Denní přehled schvalování</p>
                <h4 className="mt-1 text-2xl font-black text-slate-900">{selectedDayLabel}</h4>
                <p className="mt-2 text-sm text-slate-600">Položky dne: {visibleSelectedTotal}</p>
              </div>
              <button type="button" onClick={closeDayPanel} className="rounded-2xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {calendarFilters.pending && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Čeká na schválení</p>
                  <span className="text-xs font-black text-amber-800">{visiblePending.length}</span>
                </div>
                {visiblePending.length === 0 ? (
                  <p className="text-xs text-slate-600">Bez čekajících žádostí.</p>
                ) : (
                  <div className="space-y-2">
                    {visiblePending.map((item) => (
                      <div
                        key={`pending-slide-${item.id}`}
                        className="w-full rounded-xl border border-amber-100 bg-white p-3 text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{compactCandidateName(item.user?.display_name ?? `#${item.user_id}`)}</p>
                          </div>
                          <UserRound className="h-4 w-4 text-amber-700" />
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{formatCompactMeta(item.start_time, item.end_time, 'čeká na schválení')} · {inferShiftLabel(item.start_time, item.end_time, parseShiftType(item))}</p>
                        {item.employee_note?.trim() ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">Poznámka: {item.employee_note}</p> : null}
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleApproveAvailability(item)}
                            disabled={busyId === item.id}
                            className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            Schválit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleReject(item.id)}
                            disabled={busyId === item.id}
                            className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                          >
                            Zamítnout
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}

              {calendarFilters.approved && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/35 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Schválené</p>
                  <span className="text-xs font-black text-emerald-800">{visibleApproved.length}</span>
                </div>
                {visibleApproved.length === 0 ? (
                  <p className="text-xs text-slate-600">Bez schválených směn.</p>
                ) : (
                  <div className="space-y-2">
                    {visibleApproved.map((item) => (
                      <div key={`approved-slide-${item.id}`} className="rounded-xl border border-emerald-100 bg-white p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900">{compactCandidateName(item.user?.display_name ?? `#${item.user_id}`)}</p>
                          <UserRound className="h-4 w-4 text-emerald-700" />
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{formatCompactMeta(item.assigned_start, item.assigned_end, 'schválená')} · {inferShiftLabel(item.assigned_start, item.assigned_end, item.metadata?.shift_type)}</p>
                        {item.metadata?.note?.trim() ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">Poznámka: {item.metadata.note}</p> : null}
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleApproveAssignment(item)}
                            disabled
                            className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white opacity-50"
                          >
                            Schválit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleReject(item.availability_id)}
                            disabled={busyId === item.availability_id}
                            className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                          >
                            Zamítnout
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}

              {calendarFilters.rejected && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50/35 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">Zamítnuté</p>
                  <span className="text-xs font-black text-rose-800">{visibleRejected.length}</span>
                </div>
                {visibleRejected.length === 0 ? (
                  <p className="text-xs text-slate-600">Bez zamítnutých žádostí.</p>
                ) : (
                  <div className="space-y-2">
                    {visibleRejected.map((item) => (
                      <div key={`rejected-slide-${item.id}`} className="rounded-xl border border-rose-100 bg-white p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900">{compactCandidateName(item.user?.display_name ?? `#${item.user_id}`)}</p>
                          <UserRound className="h-4 w-4 text-rose-700" />
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{formatCompactMeta(item.start_time, item.end_time, 'zamítnutá')} · {inferShiftLabel(item.start_time, item.end_time, parseShiftType(item))}</p>
                        {item.employee_note?.trim() ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">Poznámka: {item.employee_note}</p> : null}
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleApproveAvailability(item)}
                            disabled={busyId === item.id}
                            className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            Schválit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleReject(item.id)}
                            disabled
                            className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white opacity-50"
                          >
                            Zamítnout
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}

    </div>
  )
}