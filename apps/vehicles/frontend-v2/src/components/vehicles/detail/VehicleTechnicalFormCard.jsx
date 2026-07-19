export default function VehicleTechnicalFormCard({ form, onChange, onSubmit, saving, saveMessage }) {
  return (
    <article className="info-card" id="karta">
      <h3>Technická karta</h3>
      <form className="detail-form" onSubmit={onSubmit}>
        <label htmlFor="zzs_typ">ZZS typ</label>
        <input
          id="zzs_typ"
          name="zzs_typ"
          value={form.zzs_typ}
          onChange={onChange}
          placeholder="Např. RLP, RV, SAN"
        />

        <label htmlFor="w_popis">Volací znak</label>
        <input
          id="w_popis"
          name="w_popis"
          value={form.w_popis}
          onChange={onChange}
          placeholder="Např. ZKL 123"
        />

        <label htmlFor="insurance_policy">Pojistka</label>
        <input
          id="insurance_policy"
          name="insurance_policy"
          value={form.insurance_policy}
          onChange={onChange}
          placeholder="Číslo pojistné smlouvy"
        />

        <label htmlFor="stk_valid_to">STK do</label>
        <input
          id="stk_valid_to"
          name="stk_valid_to"
          type="date"
          value={form.stk_valid_to || ''}
          onChange={onChange}
        />

        <label htmlFor="emission_valid_to">Emise do</label>
        <input
          id="emission_valid_to"
          name="emission_valid_to"
          type="date"
          value={form.emission_valid_to || ''}
          onChange={onChange}
        />

        <label htmlFor="service_notes">Servisní poznámky</label>
        <textarea
          id="service_notes"
          name="service_notes"
          value={form.service_notes}
          onChange={onChange}
          rows={3}
        />

        <label htmlFor="technical_notes">Technické poznámky</label>
        <textarea
          id="technical_notes"
          name="technical_notes"
          value={form.technical_notes}
          onChange={onChange}
          rows={3}
        />

        <label htmlFor="equipment_json">Výbava (JSON)</label>
        <textarea
          id="equipment_json"
          name="equipment_json"
          value={form.equipment_json}
          onChange={onChange}
          rows={4}
          placeholder='{"gps": true, "sirena": "nová"}'
        />

        {saveMessage ? <div className="status-box">{saveMessage}</div> : null}

        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Ukládám...' : 'Uložit detail'}
        </button>
      </form>
    </article>
  );
}
