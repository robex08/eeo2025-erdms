import type { ShiftStatus } from '../../types'

type Props = {
  status: ShiftStatus
}

const labels: Record<ShiftStatus, string> = {
  pending: 'Čeká na schválení',
  approved: 'Schváleno',
  rejected: 'Zamítnuto',
  cancelled: 'Zrušeno',
}

const colors: Record<ShiftStatus, string> = {
  pending: 'bg-amber-100 text-amber-900 ring-amber-300',
  approved: 'bg-emerald-100 text-emerald-900 ring-emerald-300',
  rejected: 'bg-rose-100 text-rose-900 ring-rose-300',
  cancelled: 'bg-slate-200 text-slate-800 ring-slate-300',
}

export function StatusBadge({ status }: Props) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${colors[status]}`}>
      {labels[status]}
    </span>
  )
}
