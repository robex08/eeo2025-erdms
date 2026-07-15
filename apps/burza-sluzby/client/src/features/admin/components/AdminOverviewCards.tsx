type Props = {
  activeCount: number
  adminCount: number
}

export function AdminOverviewCards({ activeCount, adminCount }: Props) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-[24px] border border-cyan-100 bg-[linear-gradient(135deg,#effcfb_0%,#ffffff_100%)] p-5 shadow-sm shadow-cyan-100/40">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">Administrace</p>
        <p className="mt-2 text-3xl font-black text-slate-900">Uživatelé</p>
        <p className="mt-2 text-sm text-slate-600">Správa rolí, práv a lokálních poznámek.</p>
      </article>
      <article className="rounded-[24px] border border-emerald-100 bg-[linear-gradient(135deg,#ecfff5_0%,#ffffff_100%)] p-5 shadow-sm shadow-emerald-100/30">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Aktivní účty</p>
        <p className="mt-2 text-3xl font-black text-slate-900">{activeCount}</p>
        <p className="mt-2 text-sm text-slate-600">Počet aktivních uživatelů v burze.</p>
      </article>
      <article className="rounded-[24px] border border-violet-100 bg-[linear-gradient(135deg,#f5f3ff_0%,#ffffff_100%)] p-5 shadow-sm shadow-violet-100/30">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">Admin účty</p>
        <p className="mt-2 text-3xl font-black text-slate-900">{adminCount}</p>
        <p className="mt-2 text-sm text-slate-600">Počet uživatelů s administrátorskou rolí.</p>
      </article>
    </section>
  )
}
