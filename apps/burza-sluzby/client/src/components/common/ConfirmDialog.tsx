type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Potvrdit',
  cancelText = 'Zrušit',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm">
      <div className="grid min-h-full place-items-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <p className="mt-3 text-sm text-slate-600">{message}</p>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${danger ? 'bg-rose-700 hover:bg-rose-800' : 'bg-cyan-700 hover:bg-cyan-800'}`}
            >
              {loading ? 'Probíhá…' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
