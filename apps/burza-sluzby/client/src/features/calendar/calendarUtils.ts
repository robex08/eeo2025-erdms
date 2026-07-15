export type CalendarMode = 'month' | 'week'

export type CalendarItem = {
  id: string
  chainId?: string
  title: string
  subtitle?: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  segmentKind?: 'single' | 'start' | 'continuation'
  isLastSegment?: boolean
  onClick?: () => void
  onDelete?: () => void
}

const dayNamesShort = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']
const monthNames = [
  'leden',
  'únor',
  'březen',
  'duben',
  'květen',
  'červen',
  'červenec',
  'srpen',
  'září',
  'říjen',
  'listopad',
  'prosinec',
]

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function cloneDate(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), value.getHours(), value.getMinutes(), value.getSeconds(), value.getMilliseconds())
}

export function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

export function addDays(value: Date, days: number): Date {
  const result = startOfDay(value)
  result.setDate(result.getDate() + days)
  return result
}

export function addMonths(value: Date, months: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + months, 1)
}

export function startOfWeek(value: Date): Date {
  const result = startOfDay(value)
  const day = result.getDay() === 0 ? 7 : result.getDay()
  result.setDate(result.getDate() - day + 1)
  return result
}

export function startOfMonthGrid(value: Date): Date {
  const firstDay = new Date(value.getFullYear(), value.getMonth(), 1)
  return startOfWeek(firstDay)
}

export function isSameDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate()
}

export function isSameMonth(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth()
}

export function toDateKey(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

export function fromDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

export function formatDayLabel(value: Date): string {
  return `${value.getDate()}. ${monthNames[value.getMonth()]}`
}

export function formatWeekday(value: Date): string {
  return dayNamesShort[value.getDay() === 0 ? 6 : value.getDay() - 1]
}

export function formatMonthLabel(value: Date): string {
  return `${monthNames[value.getMonth()]} ${value.getFullYear()}`
}

export function formatTimeRange(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)

  const startLabel = `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`
  const endLabel = `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`

  if (isSameDay(startDate, endDate)) {
    return `${startLabel}–${endLabel}`
  }

  const dayDiff = Math.round((startOfDay(endDate).getTime() - startOfDay(startDate).getTime()) / (24 * 60 * 60 * 1000))
  if (dayDiff === 1) {
    return `${startLabel}–${endLabel} (+1 den)`
  }

  return `${startLabel}–${endLabel} (+${dayDiff} dny)`
}

export function getModeDays(anchor: Date, mode: CalendarMode): Date[] {
  if (mode === 'week') {
    return Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(anchor), index))
  }

  const gridStart = startOfMonthGrid(anchor)
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
}
