import type { FormEvent } from 'react'
import { Save } from 'lucide-react'
import type { AppSettings } from '../../../types'

type Props = {
  settings: AppSettings
  settingsSaving: boolean
  onSettingsChange: (next: AppSettings) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function AdminSettingsPanel({ settings, settingsSaving, onSettingsChange, onSubmit }: Props) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,118,110,0.10)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">Nastavení aplikace</p>
          <h3 className="mt-2 text-2xl font-black text-slate-900">Limity kalendáře</h3>
          <p className="mt-2 text-sm text-slate-600">První parametr určuje maximální počet zájemců, kteří se mohou nahlásit na jeden den.</p>
        </div>
      </div>

      <form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={onSubmit}>
        <label className="min-w-[220px] flex-1 space-y-2">
          <span className="text-sm font-semibold text-slate-700">Max počet zájemců na den</span>
          <input
            type="number"
            min={1}
            max={50}
            value={settings.max_candidates_per_day}
            onChange={(event) => onSettingsChange({ ...settings, max_candidates_per_day: Number(event.target.value || 1) })}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
          />
        </label>

        <button
          type="submit"
          disabled={settingsSaving}
          className="inline-flex items-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {settingsSaving ? 'Ukládám…' : 'Uložit nastavení'}
        </button>
      </form>
    </section>
  )
}
