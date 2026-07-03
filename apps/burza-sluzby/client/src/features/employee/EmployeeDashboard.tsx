import type { FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock3, MapPin, SendHorizontal, Trash2, X } from 'lucide-react'
import { createAvailability, deleteAvailability, getAvailabilityDaySummary, getMyAvailabilities, updateAvailability } from '../../services/mockApi'
import type { Availability, AvailabilityDaySummary, User } from '../../types'
import { ShiftCalendar } from '../calendar/ShiftCalendar'
import { addDays, addMonths, cloneDate, formatMonthLabel, startOfDay, toDateKey } from '../calendar/calendarUtils'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'

type DraftAvailability = {
  start_time: string
  end_time: string
  employee_note: string
  preferred_station: string
}

type ShiftPreset = 'day12' | 'night12' | 'day24'

type ShiftPresetOption = {
  id: ShiftPreset
  label: string
  value: string
  icon: typeof CalendarDays
}

const defaultDraft = (): DraftAvailability => ({
  start_time: '',
  end_time: '',
  employee_note: '',
  preferred_station: '',
})

function toInputValue(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  const hours = String(value.getHours()).padStart(2, '0')
  const minutes = String(value.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function parseLocalDateTime(value: string): number {
  const [datePart, timePart] = value.split('T')
  if (!datePart || !timePart) {
    return Number.NaN
  }

  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0, 0, 0).getTime()
}

function presetMaxDurationHours(preset: ShiftPreset): number {
  if (preset === 'day24') {
    return 24
  }
  return 12
}

function splitDraftIntoSegments(draft: DraftAvailability, preset: ShiftPreset): Array<Pick<Availability, 'start_time' | 'end_time' | 'employee_note' | 'metadata'>> {
  const startTs = parseLocalDateTime(draft.start_time)
  const endTs = parseLocalDateTime(draft.end_time)
  if (!Number.isFinite(startTs) || !Number.isFinite(endTs) || startTs >= endTs) {
    return []
  }

  const maxSegmentMs = presetMaxDurationHours(preset) * 60 * 60 * 1000
  const metadata = draft.preferred_station ? { preferred_station: draft.preferred_station } : undefined
  const segments: Array<Pick<Availability, 'start_time' | 'end_time' | 'employee_note' | 'metadata'>> = []

  let cursor = startTs
  while (cursor < endTs) {
    const segmentEnd = Math.min(cursor + maxSegmentMs, endTs)
    segments.push({
      start_time: toInputValue(new Date(cursor)),
      end_time: toInputValue(new Date(segmentEnd)),
      employee_note: draft.employee_note || undefined,
      metadata,
    })
    cursor = segmentEnd
  }

  return segments
}

function createDateTime(baseDate: Date, hours: number, minutes = 0): Date {
  return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes, 0, 0)
}

function presetDraft(selectedDate: Date, preset: ShiftPreset): DraftAvailability {
  const normalized = startOfDay(selectedDate)

  if (preset === 'night12') {
    return {
      ...defaultDraft(),
      start_time: toInputValue(createDateTime(normalized, 19)),
      end_time: toInputValue(new Date(createDateTime(normalized, 7).getTime() + 24 * 60 * 60 * 1000)),
    }
  }

  if (preset === 'day24') {
    return {
      ...defaultDraft(),
      start_time: toInputValue(createDateTime(normalized, 7)),
      end_time: toInputValue(new Date(createDateTime(normalized, 7).getTime() + 24 * 60 * 60 * 1000)),
    }
  }

  return {
    ...defaultDraft(),
    start_time: toInputValue(createDateTime(normalized, 7)),
    end_time: toInputValue(createDateTime(normalized, 19)),
  }
}

function getShiftPresetOptions(role: User['local_role']): ShiftPresetOption[] {
  const base: ShiftPresetOption[] = [
    { id: 'day12', label: '12h denní směna', value: '07:00-19:00', icon: CalendarDays },
    { id: 'night12', label: '12h noční směna', value: '19:00-07:00', icon: Clock3 },
  ]

  if (role === 'doctor' || role === 'head_doctor' || role === 'admin') {
    return [
      ...base,
      { id: 'day24', label: '24h směna', value: '07:00-07:00', icon: CalendarDays },
    ]
  }

  return base
}

function statusLabel(status: Availability['status']): string {
  if (status === 'approved') {
    return 'Schváleno'
  }
  if (status === 'rejected') {
    return 'Zamítnuto'
  }
  if (status === 'cancelled') {
    return 'Zrušeno'
  }
  return 'Čeká na schválení'
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatHourMinute(value: Date): string {
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`
}

function detectShiftType(item: Availability): 'day12' | 'night12' | 'day24' | 'other' {
  const start = new Date(item.start_time)
  const end = new Date(item.end_time)
  const durationHours = Math.round((end.getTime() - start.getTime()) / (60 * 60 * 1000))
  const startHour = start.getHours()
  const endHour = end.getHours()

  if (durationHours >= 23 && durationHours <= 25) {
    return 'day24'
  }

  if (durationHours === 12 && startHour === 7 && endHour === 19) {
    return 'day12'
  }

  if (durationHours === 12 && startHour === 19 && endHour === 7) {
    return 'night12'
  }

  return 'other'
}

function formatSegmentTimeRange(segmentStart: Date, segmentEnd: Date, day: Date): string {
  const nextDay = addDays(day, 1)
  const startLabel = segmentStart.getTime() === day.getTime() ? '00:00' : formatHourMinute(segmentStart)
  const endLabel = segmentEnd.getTime() === nextDay.getTime() ? '24:00' : formatHourMinute(segmentEnd)
  return `${startLabel}–${endLabel}`
}

function buildAvailabilitySubtitle(item: Availability, day: Date, segmentStart: Date, segmentEnd: Date): string {
  const shiftType = detectShiftType(item)

  if (shiftType === 'day12') {
    return `12h denní · ${formatSegmentTimeRange(segmentStart, segmentEnd, day)}`
  }

  if (shiftType === 'night12') {
    return `12h noční · ${formatSegmentTimeRange(segmentStart, segmentEnd, day)}`
  }

  if (shiftType === 'day24') {
    return `24h směna · ${formatSegmentTimeRange(segmentStart, segmentEnd, day)}`
  }

  return formatSegmentTimeRange(segmentStart, segmentEnd, day)
}

function inferPresetFromAvailability(item: Availability): ShiftPreset {
  const shiftType = detectShiftType(item)
  if (shiftType === 'night12') {
    return 'night12'
  }
  if (shiftType === 'day24') {
    return 'day24'
  }
  return 'day12'
}

function draftFromAvailability(item: Availability): DraftAvailability {
  return {
    start_time: toInputValue(new Date(item.start_time)),
    end_time: toInputValue(new Date(item.end_time)),
    employee_note: item.employee_note ?? '',
    preferred_station: item.metadata?.preferred_station ?? '',
  }
}

export function EmployeeDashboard({ user }: { user: User }) {
  const [items, setItems] = useState<Availability[]>([])
  const [daySummary, setDaySummary] = useState<AvailabilityDaySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [calendarDate, setCalendarDate] = useState(() => startOfDay(new Date()))
  const [mode, setMode] = useState<'month' | 'week'>('month')
  const [draft, setDraft] = useState<DraftAvailability>(defaultDraft)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingAvailabilityId, setEditingAvailabilityId] = useState<number | null>(null)
  const [deleteAvailabilityId, setDeleteAvailabilityId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()))
  const presetOptions = useMemo(() => getShiftPresetOptions(user.local_role), [user.local_role])
  const [preset, setPreset] = useState<ShiftPreset>(presetOptions[0]?.id ?? 'day12')

  const loadMine = async () => {
    setLoading(true)
    setError(null)
    try {
      const rangeStart = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1, 0, 0, 0)
      const rangeEnd = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 2, 0, 23, 59, 59)
      const [data, summary] = await Promise.all([
        getMyAvailabilities(),
        getAvailabilityDaySummary(rangeStart.toISOString(), rangeEnd.toISOString()),
      ])
      setItems(data)
      setDaySummary(summary)
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Neznámá chyba'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadMine()
  }, [calendarDate])

  useEffect(() => {
    if (drawerOpen && editingAvailabilityId === null) {
      setDraft(presetDraft(selectedDate, preset))
    }
  }, [drawerOpen, selectedDate, preset, editingAvailabilityId])

  useEffect(() => {
    const firstPreset = presetOptions[0]?.id ?? 'day12'
    const exists = presetOptions.some((item) => item.id === preset)
    if (!exists) {
      setPreset(firstPreset)
      if (drawerOpen) {
        setDraft(presetDraft(selectedDate, firstPreset))
      }
    }
  }, [preset, presetOptions, drawerOpen, selectedDate])

  const itemsByDate = useMemo(() => {
    return items.reduce<Record<string, Array<{ id: string; chainId?: string; title: string; subtitle?: string; status: Availability['status']; segmentKind?: 'single' | 'start' | 'continuation'; isLastSegment?: boolean; onClick?: () => void; onDelete?: () => void }>>>((accumulator, item) => {
      const start = new Date(item.start_time)
      const end = new Date(item.end_time)
      let currentDay = startOfDay(start)
      const endDay = startOfDay(end)

      const totalSegments = Math.round((endDay.getTime() - currentDay.getTime()) / (24 * 60 * 60 * 1000)) + 1
      let segmentIndex = 0

      while (currentDay.getTime() <= endDay.getTime()) {
        const nextDay = addDays(currentDay, 1)
        const segmentStart = new Date(Math.max(start.getTime(), currentDay.getTime()))
        const segmentEnd = new Date(Math.min(end.getTime(), nextDay.getTime()))

        if (segmentStart.getTime() < segmentEnd.getTime()) {
          const key = toDateKey(currentDay)
          if (!accumulator[key]) {
            accumulator[key] = []
          }

          const segmentKind = totalSegments === 1 ? 'single' : (segmentIndex === 0 ? 'start' : 'continuation')
          const isLastSegment = segmentIndex === totalSegments - 1
          let subtitle = buildAvailabilitySubtitle(item, currentDay, segmentStart, segmentEnd)
          
          if (segmentKind === 'start') {
            // Nahradit konec časového rozsahu šipkou: "19:00–24:00" -> "19:00 →"
            subtitle = subtitle.replace(/–\d{2}:\d{2}$/, ' →')
          } else if (segmentKind === 'continuation') {
            // Nahradit začátek časového rozsahu šipkou: "00:00–07:00" -> "← 07:00"
            subtitle = subtitle.replace(/\d{2}:\d{2}–/, '← ')
          }

          accumulator[key].push({
            id: `${item.id}-${key}`,
            chainId: String(item.id),
            title: statusLabel(item.status),
            subtitle,
            status: item.status,
            segmentKind,
            isLastSegment,
            onClick: () => openEditDrawer(item),
            onDelete: () => setDeleteAvailabilityId(item.id),
          })
        }

        segmentIndex += 1
        currentDay = nextDay
      }

      return accumulator
    }, {})
  }, [items])

  const dayBadgeByDate = useMemo(() => {
    return daySummary.reduce<Record<string, { count: number; tooltip?: ReactNode }>>((acc, item) => {
      if (!item.day_key) {
        return acc
      }

      const names = item.candidate_names ?? []
      const tooltip = (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">Zájemci v daný den</span>
            <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-[11px] font-bold text-cyan-100">
              {item.candidate_count}
            </span>
          </div>
          {names.length > 0 ? (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">Seznam</div>
              <div className="space-y-1">
                {names.map((name) => (
                  <div key={`${item.day_key}-${name}`} className="rounded-xl bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-100">
                    {name}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-200">Zobrazen pouze anonymní počet zájemců.</div>
          )}
        </div>
      )

      acc[item.day_key] = {
        count: item.candidate_count,
        tooltip,
      }

      return acc
    }, {})
  }, [daySummary])

  const pendingCount = useMemo(() => items.filter((item) => item.status === 'pending').length, [items])
  const approvedCount = useMemo(() => items.filter((item) => item.status === 'approved').length, [items])
  const upcomingAvailabilities = useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime()
    return [...items]
      .filter((entry) => new Date(entry.end_time).getTime() >= todayStart)
      .filter((entry) => entry.status === 'approved')
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }, [items])
  const rejectedAvailabilities = useMemo(() => {
    return [...items]
      .filter((entry) => entry.status === 'rejected')
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
  }, [items])

  const closeDrawer = () => {
    setDrawerOpen(false)
    setEditingAvailabilityId(null)
  }

  const openDrawer = (date: Date) => {
    setSelectedDate(startOfDay(date))
    setEditingAvailabilityId(null)
    const firstPreset = presetOptions[0]?.id ?? 'day12'
    setPreset(firstPreset)
    setDrawerOpen(true)
    setDraft(presetDraft(date, firstPreset))
  }

  const openEditDrawer = (item: Availability) => {
    setSelectedDate(startOfDay(new Date(item.start_time)))
    setEditingAvailabilityId(item.id)
    setPreset(inferPresetFromAvailability(item))
    setDrawerOpen(true)
    setDraft(draftFromAvailability(item))
  }

  const handleDeleteAvailability = async () => {
    if (deleteAvailabilityId === null) {
      return
    }
    const targetId = deleteAvailabilityId
    setDeleting(true)
    setError(null)
    try {
      await deleteAvailability(targetId)
      if (editingAvailabilityId === targetId) {
        closeDrawer()
      }
      setDeleteAvailabilityId(null)
      await loadMine()
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Neznámá chyba'
      setError(message)
    } finally {
      setDeleting(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!draft.start_time || !draft.end_time) {
      setError('Vyplňte začátek i konec zájemce.')
      return
    }

    const startTime = parseLocalDateTime(draft.start_time)
    const endTime = parseLocalDateTime(draft.end_time)
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
      setError('Začátek nebo konec nejsou ve správném formátu.')
      return
    }
    if (startTime >= endTime) {
      setError('Konec musí být po začátku.')
      return
    }

    setSaving(true)
    try {
      if (editingAvailabilityId !== null) {
        await updateAvailability(editingAvailabilityId, {
          start_time: draft.start_time,
          end_time: draft.end_time,
          employee_note: draft.employee_note || undefined,
          metadata: draft.preferred_station ? { preferred_station: draft.preferred_station } : undefined,
        })
      } else {
        const segments = splitDraftIntoSegments(draft, preset)
        if (segments.length === 0) {
          setError('Nepodařilo se připravit intervaly směny.')
          setSaving(false)
          return
        }

        for (const segment of segments) {
          // Segmenty ukládáme po max délce směny dle zvoleného typu (12h/24h).
          await createAvailability(segment)
        }
      }
      setDraft(defaultDraft())
      setDrawerOpen(false)
      setEditingAvailabilityId(null)
      await loadMine()
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Neznámá chyba'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const sidebar = (
    <div className="space-y-4">
      <div className="rounded-3xl border border-cyan-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Rychlý přehled</p>
        <div className="mt-4 grid gap-3">
          <div className="rounded-2xl bg-cyan-50 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-700">Celkem záznamů</p>
            <p className="mt-1 text-2xl font-black text-cyan-900">{items.length}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-amber-700">Čeká na schválení</p>
            <p className="mt-1 text-2xl font-black text-amber-900">{pendingCount}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-700">Schválené směny</p>
            <p className="mt-1 text-2xl font-black text-emerald-900">{approvedCount}</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Moje schválené dostupnosti</p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">{upcomingAvailabilities.length}</span>
        </div>
        {upcomingAvailabilities.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
            Zatím žádné budoucí dostupnosti.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {upcomingAvailabilities.slice(0, 6).map((entry) => {
              const start = new Date(entry.start_time)
              const end = new Date(entry.end_time)
              const rangeLabel = `${formatMonthLabel(start)} · ${start.getDate()}.`
              const timeLabel = `${formatHourMinute(start)} → ${formatHourMinute(end)}`
              return (
                <li key={entry.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                  <button
                    type="button"
                    onClick={() => openEditDrawer(entry)}
                    className="w-full text-left"
                  >
                    <p className="text-sm font-bold text-slate-900">{rangeLabel}</p>
                    <p className="text-xs font-semibold text-slate-500">{timeLabel} · {statusLabel(entry.status)}</p>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="rounded-3xl border border-rose-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Moje zamítnuté žádosti</p>
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">{rejectedAvailabilities.length}</span>
        </div>
        {rejectedAvailabilities.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-rose-200 bg-rose-50/50 px-3 py-4 text-center text-xs text-rose-600">
            Žádná zamítnutá žádost.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {rejectedAvailabilities.slice(0, 6).map((entry) => {
              const start = new Date(entry.start_time)
              const end = new Date(entry.end_time)
              const rangeLabel = `${formatMonthLabel(start)} · ${start.getDate()}.`
              const timeLabel = `${formatHourMinute(start)} → ${formatHourMinute(end)}`
              return (
                <li key={entry.id} className="rounded-2xl border border-rose-100 bg-rose-50/40 p-3">
                  <button
                    type="button"
                    onClick={() => openEditDrawer(entry)}
                    className="w-full text-left"
                  >
                    <p className="text-sm font-bold text-slate-900">{rangeLabel}</p>
                    <p className="text-xs font-semibold text-rose-700">{timeLabel} · {statusLabel(entry.status)}</p>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Jak to funguje</p>
        <div className="mt-3 space-y-3 text-sm text-slate-600">
          <div className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm">
            <CalendarDays className="mt-0.5 h-4 w-4 text-cyan-700" />
            <span>Klikni na den v kalendáři a otevře se předvyplněný formulář.</span>
          </div>
          <div className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm">
            <Clock3 className="mt-0.5 h-4 w-4 text-cyan-700" />
            <span>Vyber typ směny a čas případně uprav ručně.</span>
          </div>
          <div className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm">
            <MapPin className="mt-0.5 h-4 w-4 text-cyan-700" />
            <span>Přidej stanici nebo poznámku přímo bez přepisování tabulky.</span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[24px] border border-cyan-100 bg-[linear-gradient(135deg,#effcfb_0%,#ffffff_100%)] p-5 shadow-sm shadow-cyan-100/40">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">Kalendářový režim</p>
          <p className="mt-2 text-3xl font-black text-slate-900">Můj kalendář</p>
          <p className="mt-2 text-sm text-slate-600">Klikání do dnů místo dlouhých inputů.</p>
        </article>
        <article className="rounded-[24px] border border-amber-100 bg-[linear-gradient(135deg,#fff8e8_0%,#ffffff_100%)] p-5 shadow-sm shadow-amber-100/30">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">Právě čeká</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{pendingCount}</p>
          <p className="mt-2 text-sm text-slate-600">Zájemci čekají na reakci schvalovatele.</p>
        </article>
        <article className="rounded-[24px] border border-emerald-100 bg-[linear-gradient(135deg,#ecfff5_0%,#ffffff_100%)] p-5 shadow-sm shadow-emerald-100/30">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Schváleno</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{approvedCount}</p>
          <p className="mt-2 text-sm text-slate-600">Aktivní směny v měsíčním přehledu.</p>
        </article>
      </section>

      {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</p>}

      <ShiftCalendar
        title="Kalendář zaměstnance"
        subtitle={`Zobrazení zájemců pro ${formatMonthLabel(calendarDate)}. Klikni na den a vytvoř nového zájemce.`}
        currentDate={calendarDate}
        mode={mode}
        onModeChange={setMode}
        onNavigate={(direction) => setCalendarDate((value) => (mode === 'month' ? addMonths(cloneDate(value), direction) : addMonths(cloneDate(value), direction)))}
        onToday={() => setCalendarDate(startOfDay(new Date()))}
        onDayClick={openDrawer}
        itemsByDate={itemsByDate}
        dayBadgeByDate={dayBadgeByDate}
        useItemCountAsBadgeFallback={false}
        dayActionLabel="zájemce"
        emptyMessage="Bez mé žádosti"
        sidebar={sidebar}
      />

      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm">
          <div className="ml-auto flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">{editingAvailabilityId !== null ? 'Úprava zájemce' : 'Nový zájemce'}</p>
                <h3 className="mt-1 text-2xl font-black text-slate-900">{formatMonthLabel(selectedDate)} · {selectedDate.getDate()}.</h3>
                <p className="mt-2 text-sm text-slate-600">{editingAvailabilityId !== null ? 'Edituješ celý původní interval zájemce.' : 'Vyber typ směny. Delší rozsah se při uložení rozdělí po max délce zvoleného typu směny (12h/24h).'}</p>
              </div>
              <button type="button" onClick={closeDrawer} className="rounded-2xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="flex flex-1 flex-col gap-5 overflow-y-auto p-5" onSubmit={handleSubmit}>
              <div className="grid gap-3 sm:grid-cols-3">
                {presetOptions.map((item) => {
                  const Icon = item.icon
                  const active = preset === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setPreset(item.id)
                        setDraft(presetDraft(selectedDate, item.id))
                      }}
                      className={`rounded-3xl border p-4 text-left transition ${active ? 'border-cyan-400 bg-cyan-50 shadow-md shadow-cyan-100' : 'border-slate-200 bg-white hover:border-cyan-200 hover:bg-cyan-50/60'}`}
                    >
                      <Icon className={`h-5 w-5 ${active ? 'text-cyan-700' : 'text-slate-500'}`} />
                      <p className="mt-3 text-sm font-bold text-slate-900">{item.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.value}</p>
                    </button>
                  )
                })}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Začátek</span>
                  <input
                    type="datetime-local"
                    value={draft.start_time}
                    onChange={(event) => setDraft((prev) => ({ ...prev, start_time: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-cyan-500"
                    required
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Konec</span>
                  <input
                    type="datetime-local"
                    value={draft.end_time}
                    onChange={(event) => setDraft((prev) => ({ ...prev, end_time: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-cyan-500"
                    required
                  />
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Poznámka</span>
                <textarea
                  value={draft.employee_note}
                  onChange={(event) => setDraft((prev) => ({ ...prev, employee_note: event.target.value }))}
                  className="min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-cyan-500"
                  placeholder="Doplnění pro schvalovatele"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Preferovaná výjezdová základna (lokalita)</span>
                <input
                  type="text"
                  value={draft.preferred_station}
                  onChange={(event) => setDraft((prev) => ({ ...prev, preferred_station: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-cyan-500"
                  placeholder="Například Růžinov"
                />
              </label>

              <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2">
                  {editingAvailabilityId !== null && (
                    <button
                      type="button"
                      onClick={() => setDeleteAvailabilityId(editingAvailabilityId)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Smazat zájemce
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={closeDrawer} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                    Zrušit
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60"
                  >
                    <SendHorizontal className="h-4 w-4" />
                    {saving ? 'Ukládám…' : editingAvailabilityId !== null ? 'Uložit změny' : 'Vložit do kalendáře'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteAvailabilityId !== null}
        title="Smazání zájemce"
        message="Opravdu chceš tohoto zájemce odstranit? Akci nelze vrátit zpět."
        confirmText="Smazat"
        cancelText="Zrušit"
        danger
        loading={deleting}
        onCancel={() => setDeleteAvailabilityId(null)}
        onConfirm={() => void handleDeleteAvailability()}
      />
    </div>
  )
}