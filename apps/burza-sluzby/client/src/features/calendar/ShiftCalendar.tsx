import { ChevronLeft, ChevronRight, LayoutGrid, CalendarRange, CircleSlash2, X } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { SmartTooltip } from '../../components/common/SmartTooltip'
import type { CalendarItem, CalendarMode } from './calendarUtils'
import { addDays, formatDayLabel, formatMonthLabel, formatWeekday, getModeDays, isSameDay, isSameMonth, startOfDay, toDateKey } from './calendarUtils'

type Props = {
  title: string
  subtitle: string
  currentDate: Date
  mode: CalendarMode
  onModeChange: (mode: CalendarMode) => void
  onNavigate: (direction: -1 | 1) => void
  onToday: () => void
  onDayClick: (date: Date) => void
  onDayBodyClick?: (date: Date) => void
  statusFilter?: Partial<Record<'pending' | 'approved' | 'rejected', boolean>>
  onToggleStatusFilter?: (status: 'pending' | 'approved' | 'rejected') => void
  itemsByDate: Record<string, CalendarItem[]>
  dayHighlightByDate?: Record<string, boolean>
  dayStatusByDate?: Record<string, { pending: number; approved: number; rejected: number }>
  dayBadgeByDate?: Record<string, { count: number; tooltip?: ReactNode }>
  useItemCountAsBadgeFallback?: boolean
  dayActionLabel: string
  emptyMessage: string
  sidebar?: ReactNode
}

const statusStyles: Record<CalendarItem['status'], string> = {
  pending: 'bg-amber-100 text-amber-950 ring-amber-200 hover:bg-amber-200',
  approved: 'bg-emerald-100 text-emerald-950 ring-emerald-200 hover:bg-emerald-200',
  rejected: 'bg-rose-100 text-rose-950 ring-rose-200 hover:bg-rose-200',
  cancelled: 'bg-slate-200 text-slate-900 ring-slate-300 hover:bg-slate-300',
}

const statusLegend: Array<{ label: string; tone: CalendarItem['status'] }> = [
  { label: 'Čeká na schválení', tone: 'pending' },
  { label: 'Schváleno', tone: 'approved' },
  { label: 'Zamítnuto', tone: 'rejected' },
]

export function ShiftCalendar({
  title,
  subtitle,
  currentDate,
  mode,
  onModeChange,
  onNavigate,
  onToday,
  onDayClick,
  onDayBodyClick,
  statusFilter,
  onToggleStatusFilter,
  itemsByDate,
  dayHighlightByDate,
  dayStatusByDate,
  dayBadgeByDate,
  useItemCountAsBadgeFallback = true,
  dayActionLabel,
  emptyMessage,
  sidebar,
}: Props) {
  const days = getModeDays(currentDate, mode)
  const monthGrid = mode === 'month'
  const headerLabel = mode === 'month' ? formatMonthLabel(currentDate) : `${formatDayLabel(days[0])} – ${formatDayLabel(days[6])}`
  const [hoveredChainId, setHoveredChainId] = useState<string | null>(null)

  return (
    <section className="overflow-hidden rounded-[28px] border border-cyan-100 bg-white/90 shadow-[0_24px_80px_rgba(15,118,110,0.12)] backdrop-blur">
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-[linear-gradient(180deg,#f8fffe_0%,#ffffff_100%)] p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">{title}</p>
          <h3 className="mt-2 text-2xl font-black text-slate-900">{headerLabel}</h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onModeChange('month')}
            className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition ${mode === 'month' ? 'bg-cyan-700 text-white shadow-lg shadow-cyan-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            <LayoutGrid className="h-4 w-4" />
            Měsíc
          </button>
          <button
            type="button"
            onClick={() => onModeChange('week')}
            className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition ${mode === 'week' ? 'bg-cyan-700 text-white shadow-lg shadow-cyan-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            <CalendarRange className="h-4 w-4" />
            Týden
          </button>
          <button
            type="button"
            onClick={onToday}
            className="rounded-2xl border border-cyan-200 bg-white px-3 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50"
          >
            Dnes
          </button>
          <div className="ml-2 flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => onNavigate(-1)}
              className="rounded-xl px-3 py-2 text-slate-700 transition hover:bg-white"
              aria-label="Předchozí období"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate(1)}
              className="rounded-xl px-3 py-2 text-slate-700 transition hover:bg-white"
              aria-label="Další období"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1fr_18rem]">
        <div className="border-b border-slate-100 lg:border-b-0 lg:border-r lg:border-slate-100">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 text-sm text-slate-600">
            <div className="flex flex-wrap items-center gap-2">
              {statusLegend.map((entry) => (
                <button
                  key={entry.label}
                  type="button"
                  onClick={() => onToggleStatusFilter?.(entry.tone)}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition ${statusStyles[entry.tone]} ${statusFilter && statusFilter[entry.tone] === false ? 'opacity-40 grayscale' : ''}`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Klikni na den pro akci</span>
          </div>

          <div className={monthGrid ? 'grid grid-cols-7' : 'grid grid-cols-7'}>
            {(monthGrid ? ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'] : ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']).map((label) => (
              <div key={label} className="border-b border-slate-100 px-3 py-2 text-center text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                {label}
              </div>
            ))}
          </div>

          <div className={`grid ${monthGrid ? 'grid-cols-7' : 'grid-cols-7'}`}>
            {days.map((day) => {
              const key = toDateKey(day)
              const items = itemsByDate[key] ?? []
              const highlightedDay = dayHighlightByDate?.[key] === true
              const statusSummary = dayStatusByDate?.[key]
              const hasStatusSummary = !!statusSummary && (statusSummary.pending + statusSummary.approved + statusSummary.rejected) > 0
              const showPending = statusFilter?.pending !== false
              const showApproved = statusFilter?.approved !== false
              const showRejected = statusFilter?.rejected !== false
              const badge = dayBadgeByDate?.[key]
              const visibleItems = monthGrid ? items.slice(0, 3) : items.slice(0, 5)
              const hiddenCount = Math.max(0, items.length - visibleItems.length)

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onDayClick(day)}
                  className={`group relative min-h-[8rem] overflow-visible border-b border-r border-slate-100 p-3 text-left transition ${monthGrid ? (isSameMonth(day, currentDate) ? 'bg-white' : 'bg-slate-50/80 text-slate-400') : 'bg-white'} ${highlightedDay ? 'bg-emerald-50/70 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100/70' : 'hover:bg-cyan-50/50'}`}
                >
                  <div className="absolute left-3 top-3 flex items-start justify-between gap-2 right-3">
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isSameDay(day, new Date()) ? 'text-cyan-700' : 'text-slate-400'}`}>
                        {formatWeekday(day)}
                      </p>
                      <h4 className={`mt-1 text-lg font-black leading-none ${isSameDay(day, new Date()) ? 'text-cyan-900' : 'text-slate-900'}`}>
                        {day.getDate()}
                      </h4>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {((badge?.count ?? (useItemCountAsBadgeFallback ? items.length : 0))) > 0 && (
                        <SmartTooltip content={badge?.tooltip} position="top" disabled={!badge?.tooltip}>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                            {badge?.count ?? (useItemCountAsBadgeFallback ? items.length : 0)} {dayActionLabel.toLowerCase()}
                          </span>
                        </SmartTooltip>
                      )}
                    </div>
                  </div>

                  <div
                    className="pt-14 space-y-2"
                    onClick={(event) => {
                      event.stopPropagation()
                      if (onDayBodyClick) {
                        onDayBodyClick(day)
                        return
                      }
                      onDayClick(day)
                    }}
                  >
                    {visibleItems.length === 0 ? (
                      hasStatusSummary ? (
                        <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2.5 text-xs">
                          {showPending ? (
                            <div className="flex items-center justify-between rounded-lg bg-amber-50 px-2 py-1 font-semibold text-amber-800">
                              <span>Čekající</span>
                              <span>{statusSummary.pending}</span>
                            </div>
                          ) : null}
                          {showApproved ? (
                            <div className={`${showPending ? 'mt-1 ' : ''}flex items-center justify-between rounded-lg bg-emerald-50 px-2 py-1 font-semibold text-emerald-800`}>
                              <span>Schválená</span>
                              <span>{statusSummary.approved}</span>
                            </div>
                          ) : null}
                          {showRejected ? (
                            <div className={`${showPending || showApproved ? 'mt-1 ' : ''}flex items-center justify-between rounded-lg bg-rose-50 px-2 py-1 font-semibold text-rose-800`}>
                              <span>Zamítnutá</span>
                              <span>{statusSummary.rejected}</span>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex min-h-[2.875rem] flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-3 py-2.5 text-center text-xs font-semibold text-slate-400">
                          {emptyMessage}
                        </div>
                      )
                    ) : (
                      visibleItems.map((item) => {
                        const isContinuation = item.segmentKind === 'continuation'
                        const isStart = item.segmentKind === 'start'
                        const isSingle = item.segmentKind === 'single'
                        const isSunday = day.getDay() === 0
                        const isMonday = day.getDay() === 1

                        // Neděle->Pondělí přechod: ostré rohy na spojích
                        const isSundayBeforeMonday = isSunday && isStart
                        const isMondayAfterSunday = isMonday && isContinuation

                        let roundingClass = 'rounded-2xl'
                        let wrapperStyle: CSSProperties | undefined

                        if (isSingle) {
                          roundingClass = 'rounded-2xl'
                        } else if (isSundayBeforeMonday) {
                          // Neděle před pondělím: oblá vlevo, ostrá vpravo
                          roundingClass = 'rounded-l-2xl'
                          wrapperStyle = undefined  // nepřetéká
                        } else if (isMondayAfterSunday) {
                          // Pondělí po neděli: ostrá vlevo
                          roundingClass = ''  // ostrá vlevo i vpravo
                          wrapperStyle = undefined
                        } else if (isStart) {
                          // Normální start: oblá vlevo, ostrá vpravo, přetéká
                          roundingClass = 'rounded-l-2xl'
                          wrapperStyle = { marginRight: 'calc(-100% - 1.5rem)' }
                        } else if (item.isLastSegment) {
                          // Poslední continuation segment: ostré hrany
                          roundingClass = ''
                        } else {
                          // Middle continuation
                          roundingClass = ''
                        }

                        const isContinuationWithoutWrap = isContinuation && !isMondayAfterSunday
                        const continuationOverlapClass = isContinuationWithoutWrap ? '-ml-px' : ''
                        const continuationClipStyle = isContinuationWithoutWrap ? { clipPath: 'inset(0 0 0 1px)' } : undefined

                        if (isContinuationWithoutWrap) {
                          wrapperStyle = { marginLeft: '-1px' }
                        }

                        const canLinkHover = !!item.chainId && ((isStart && !isSundayBeforeMonday) || isContinuationWithoutWrap)
                        const linkedHoverActive = canLinkHover && hoveredChainId === item.chainId
                        const clickableClass = item.onClick ? (canLinkHover ? 'cursor-pointer' : 'cursor-pointer hover:brightness-95') : ''

                        const badgeClasses = [
                          'relative flex w-full items-center gap-3 px-3 py-2.5 text-xs font-semibold transition',
                          statusStyles[item.status],
                          roundingClass,
                          continuationOverlapClass,
                          'ring-1 ring-inset',
                          clickableClass,
                          linkedHoverActive ? 'brightness-95' : '',
                          isStart || isContinuation ? 'z-10' : '',
                        ].join(' ')

                        const content = (
                          <>
                            <div className="flex min-w-0 flex-1 items-center gap-2 pr-6">
                              {isSingle ? (
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-current opacity-80" />
                              ) : null}
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold">{item.title}</span>
                                {item.subtitle ? <span className="block truncate text-[11px] font-medium opacity-80">{item.subtitle}</span> : null}
                              </span>
                            </div>
                            {item.onDelete && item.isLastSegment ? (
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={(event) => { event.stopPropagation(); item.onDelete?.() }}
                                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.stopPropagation(); event.preventDefault(); item.onDelete?.() } }}
                                title="Smazat zájemce"
                                aria-label="Smazat zájemce"
                                className="absolute right-1.5 top-1.5 flex h-4 w-4 cursor-pointer items-center justify-center text-rose-600 transition hover:text-rose-700 hover:scale-110"
                              >
                                <X className="h-3 w-3" />
                              </div>
                            ) : null}
                          </>
                        )

                        return (
                          <div key={item.id} style={wrapperStyle}>
                            {item.onClick ? (
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={(event) => { event.stopPropagation(); item.onClick?.() }}
                                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.stopPropagation(); event.preventDefault(); item.onClick?.() } }}
                                onMouseEnter={() => { if (canLinkHover) setHoveredChainId(item.chainId ?? null) }}
                                onMouseLeave={() => { if (canLinkHover) setHoveredChainId((value) => (value === item.chainId ? null : value)) }}
                                className={badgeClasses}
                                style={continuationClipStyle}
                              >
                                {content}
                              </div>
                            ) : (
                              <div
                                className={badgeClasses}
                                onMouseEnter={() => { if (canLinkHover) setHoveredChainId(item.chainId ?? null) }}
                                onMouseLeave={() => { if (canLinkHover) setHoveredChainId((value) => (value === item.chainId ? null : value)) }}
                                style={continuationClipStyle}
                              >
                                {content}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}

                    {hiddenCount > 0 ? (
                      <div className="rounded-2xl border border-dashed border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800">
                        +{hiddenCount} další
                      </div>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <aside className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-5">
          {sidebar ?? (
            <div className="space-y-4">
              <div className="rounded-3xl border border-cyan-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Kalendář</p>
                <p className="mt-2 text-sm text-slate-600">Vyber den v mřížce a vytvoř nebo zkontroluj směnu přímo v kontextu dat.</p>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Stavové legendy</p>
                <div className="mt-3 space-y-2">
                  {statusLegend.map((entry) => (
                    <div key={entry.label} className={`inline-flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm font-semibold ring-1 ring-inset ${statusStyles[entry.tone]}`}>
                      <span>{entry.label}</span>
                      <CircleSlash2 className="h-4 w-4 opacity-50" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}

export function buildDayBuckets(items: Array<{ start: string; end: string; status: CalendarItem['status']; id: number | string; title: string; subtitle?: string; onClick?: () => void }>): Record<string, CalendarItem[]> {
  const formatLocalSegmentRange = (segmentStart: Date, segmentEnd: Date, day: Date): string => {
    const pad = (value: number) => String(value).padStart(2, '0')
    const nextDay = addDays(day, 1)
    const startLabel = segmentStart.getTime() === day.getTime() ? '00:00' : `${pad(segmentStart.getHours())}:${pad(segmentStart.getMinutes())}`
    const endLabel = segmentEnd.getTime() === nextDay.getTime() ? '24:00' : `${pad(segmentEnd.getHours())}:${pad(segmentEnd.getMinutes())}`
    return `${startLabel}–${endLabel}`
  }

  return items.reduce<Record<string, CalendarItem[]>>((accumulator, item) => {
    const start = new Date(item.start)
    const end = new Date(item.end)
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

        const segmentKind: CalendarItem['segmentKind'] = totalSegments === 1 ? 'single' : (segmentIndex === 0 ? 'start' : 'continuation')
        const isLastSegment = segmentIndex === totalSegments - 1
        const fallbackSubtitle = formatLocalSegmentRange(segmentStart, segmentEnd, currentDay)

        const entry: CalendarItem = {
          id: `${item.id}-${key}`,
          chainId: String(item.id),
          title: item.title,
          subtitle: item.subtitle ?? fallbackSubtitle,
          status: item.status,
          segmentKind,
          isLastSegment,
          onClick: item.onClick,
        }

        accumulator[key].push(entry)
      }

      segmentIndex += 1
      currentDay = nextDay
    }

    return accumulator
  }, {})
}
