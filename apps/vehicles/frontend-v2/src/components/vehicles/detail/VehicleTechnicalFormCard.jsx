import { useMemo, useState } from 'react';

function formatValue(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return '-';
  }
  return String(value);
}

export default function VehicleTechnicalFormCard({ item, serviceStations, form, onChange, onSubmit, saving, saveMessage }) {
  const [activeTab, setActiveTab] = useState('basic');
  const [serviceStateUi, setServiceStateUi] = useState('unknown');
  const [selectedServiceUi, setSelectedServiceUi] = useState('');
  const [attachmentsUi, setAttachmentsUi] = useState([{ id: 1, fileName: '', classKey: '', note: '' }]);

  const attachmentClassificationOptions = [
    { value: 'tech_prukaz', label: 'Technický průkaz' },
    { value: 'pojistna_smlouva', label: 'Pojistná smlouva' },
    { value: 'servisni_smlouva', label: 'Servisní smlouva' },
    { value: 'stk_a_emise', label: 'STK / Emise' },
    { value: 'vybava_a_revize', label: 'Výbava / Revize' },
    { value: 'foto_dokumentace', label: 'Foto dokumentace' },
    { value: 'ostatni', label: 'Ostatní' },
  ];

  const serviceOptions = useMemo(() => {
    if (!Array.isArray(serviceStations)) {
      return [];
    }

    return serviceStations.map((station) => {
      const name = station?.nazev_stanoviste || station?.mesto || 'Neznámé stanoviště';
      const street = station?.ulice ? `, ${station.ulice}` : '';
      return {
        value: String(station?.id || ''),
        label: `${name}${street}`,
      };
    });
  }, [serviceStations]);

  return (
    <article className="info-card vehicle-edit-card" id="karta">
      <h3>Editační karta vozidla</h3>

      <div className="vehicle-edit-tabs" role="tablist" aria-label="Sekce editační karty vozidla">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'basic'}
          className={`vehicle-edit-tab-btn${activeTab === 'basic' ? ' active' : ''}`}
          onClick={() => setActiveTab('basic')}
        >
          Základní parametry
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'tech'}
          className={`vehicle-edit-tab-btn${activeTab === 'tech' ? ' active' : ''}`}
          onClick={() => setActiveTab('tech')}
        >
          Technika a doklady
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'service'}
          className={`vehicle-edit-tab-btn${activeTab === 'service' ? ' active' : ''}`}
          onClick={() => setActiveTab('service')}
        >
          Servisy
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'attachments'}
          className={`vehicle-edit-tab-btn${activeTab === 'attachments' ? ' active' : ''}`}
          onClick={() => setActiveTab('attachments')}
        >
          Přílohy
        </button>
      </div>

      <form className="detail-form" onSubmit={onSubmit}>
        {activeTab === 'basic' ? (
          <div className="vehicle-edit-panel" role="tabpanel">
            <p className="vehicle-edit-panel-note">Zdroj většiny položek je synchronizace z Webdispečinku. Ruční úpravy dělej jen tam, kde to dává provozně smysl.</p>

            <div className="vehicle-read-grid">
              <p><strong>SPZ:</strong> {formatValue(item?.spz)}</p>
              <p><strong>Status:</strong> {formatValue(item?.status)}</p>
              <p><strong>Výrobce:</strong> {formatValue(item?.w_tovarni_znacka)}</p>
              <p><strong>Model:</strong> {formatValue(item?.w_model_vozu)}</p>
              <p><strong>Palivo:</strong> {formatValue(item?.w_typ_phm)}</p>
              <p><strong>Stanoviště:</strong> {formatValue(item?.w_stanoviste)}</p>
            </div>

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
          </div>
        ) : null}

        {activeTab === 'tech' ? (
          <div className="vehicle-edit-panel" role="tabpanel">
            <label htmlFor="insurance_policy">Pojistka</label>
            <input
              id="insurance_policy"
              name="insurance_policy"
              value={form.insurance_policy}
              onChange={onChange}
              placeholder="Číslo pojistné smlouvy"
            />

            <div className="vehicle-two-col-grid">
              <label htmlFor="stk_valid_to">
                STK do
                <input
                  id="stk_valid_to"
                  name="stk_valid_to"
                  type="date"
                  value={form.stk_valid_to || ''}
                  onChange={onChange}
                />
              </label>

              <label htmlFor="emission_valid_to">
                Emise do
                <input
                  id="emission_valid_to"
                  name="emission_valid_to"
                  type="date"
                  value={form.emission_valid_to || ''}
                  onChange={onChange}
                />
              </label>
            </div>

            <label htmlFor="technical_notes">Technické poznámky</label>
            <textarea
              id="technical_notes"
              name="technical_notes"
              value={form.technical_notes}
              onChange={onChange}
              rows={4}
            />

            <label htmlFor="equipment_json">Výbava (JSON)</label>
            <textarea
              id="equipment_json"
              name="equipment_json"
              value={form.equipment_json}
              onChange={onChange}
              rows={5}
              placeholder='{"gps": true, "sirena": "nová"}'
            />
          </div>
        ) : null}

        {activeTab === 'service' ? (
          <div className="vehicle-edit-panel" role="tabpanel">
            <div className="status-box status-box-warning">
              Dočasný UI režim: stav servisu a historie jsou zatím připravené pouze v rozhraní. Datový model a automatizace doplníme v další fázi.
            </div>

            <label htmlFor="service_state_ui">Stav vozu z pohledu servisu</label>
            <select
              id="service_state_ui"
              value={serviceStateUi}
              onChange={(event) => setServiceStateUi(event.target.value)}
            >
              <option value="unknown">Neurčeno</option>
              <option value="in_service">V servisu</option>
              <option value="out_service">Mimo servis</option>
            </select>

            <label htmlFor="service_station_ui">Servisní stanoviště</label>
            <select
              id="service_station_ui"
              value={selectedServiceUi}
              onChange={(event) => setSelectedServiceUi(event.target.value)}
            >
              <option value="">Vyber servisní stanoviště</option>
              {serviceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label htmlFor="service_notes">Servisní poznámky</label>
            <textarea
              id="service_notes"
              name="service_notes"
              value={form.service_notes}
              onChange={onChange}
              rows={4}
              placeholder="Volitelná poznámka k servisu, převzetí vozu, plánovaný termín..."
            />

            <div className="vehicle-service-history">
              <h4>Historie servisních stavů</h4>
              <p className="muted">Napojení historie z EEO2025 (mapový modul) bude doplněno v navazující etapě.</p>
              <ul>
                <li>Historie zatím není načítána z backendu.</li>
                <li>Připravíme filtrování podle období a servisního stanoviště.</li>
              </ul>
            </div>
          </div>
        ) : null}

        {activeTab === 'attachments' ? (
          <div className="vehicle-edit-panel" role="tabpanel">
            <div className="status-box status-box-warning">
              Dočasný UI režim: vyber přílohu a následně ji klasifikuj z číselníku. Upload i trvalé uložení doplníme po backend/DB napojení.
            </div>

            <div className="vehicle-attachments-list">
              {attachmentsUi.map((row) => (
                <div key={row.id} className="vehicle-attachment-row">
                  <label className="vehicle-attachment-file-label">
                    <span>Soubor (PDF)</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        setAttachmentsUi((prev) => prev.map((item) => (
                          item.id === row.id
                            ? { ...item, fileName: file ? file.name : '' }
                            : item
                        )));
                      }}
                    />
                  </label>

                  <label>
                    Klasifikace
                    <select
                      value={row.classKey}
                      onChange={(event) => {
                        const value = event.target.value;
                        setAttachmentsUi((prev) => prev.map((item) => (
                          item.id === row.id
                            ? { ...item, classKey: value }
                            : item
                        )));
                      }}
                    >
                      <option value="">Vyber klasifikaci</option>
                      {attachmentClassificationOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Poznámka
                    <input
                      type="text"
                      value={row.note}
                      onChange={(event) => {
                        const value = event.target.value;
                        setAttachmentsUi((prev) => prev.map((item) => (
                          item.id === row.id
                            ? { ...item, note: value }
                            : item
                        )));
                      }}
                      placeholder="Volitelná poznámka k souboru"
                    />
                  </label>

                  <div className="vehicle-attachment-row-footer">
                    <p className="muted vehicle-attachment-file-name">
                      {row.fileName ? `Vybraný soubor: ${row.fileName}` : 'Zatím bez vybraného souboru'}
                    </p>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        setAttachmentsUi((prev) => {
                          if (prev.length <= 1) {
                            return [{ id: 1, fileName: '', classKey: '', note: '' }];
                          }
                          return prev.filter((item) => item.id !== row.id);
                        });
                      }}
                    >
                      Odebrat
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setAttachmentsUi((prev) => {
                    const nextId = prev.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1;
                    return [...prev, { id: nextId, fileName: '', classKey: '', note: '' }];
                  });
                }}
              >
                Přidat další přílohu
              </button>
            </div>

            <label htmlFor="attachments_note_ui">Poznámka k přílohám</label>
            <textarea
              id="attachments_note_ui"
              rows={3}
              placeholder="Např. technický průkaz platný do..., smlouva č...."
              disabled={saving}
            />
          </div>
        ) : null}

        {saveMessage ? <div className="status-box">{saveMessage}</div> : null}

        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Ukládám...' : 'Uložit detail'}
        </button>
      </form>
    </article>
  );
}
