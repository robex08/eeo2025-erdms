const EVENT_LABELS = {
  field_changed: 'Úprava údaje karty',
  service_record_created: 'Přidán servisní záznam',
  service_record_updated: 'Upraven servisní záznam',
  service_record_deleted: 'Smazán servisní záznam',
  equipment_created: 'Přidána výbava',
  equipment_updated: 'Upravena výbava',
  equipment_deleted: 'Smazána výbava',
  insurance_policy_created: 'Přidáno pojištění',
  insurance_policy_updated: 'Upraveno pojištění',
  insurance_policy_deleted: 'Smazáno pojištění',
  claim_created: 'Přidána škodní událost',
  claim_updated: 'Upravena škodní událost',
  claim_deleted: 'Smazána škodní událost',
  tires_created: 'Přidány pneumatiky',
  tires_updated: 'Upraveny pneumatiky',
  tires_deleted: 'Smazány pneumatiky',
  funding_created: 'Přidána dotace/financování',
  funding_updated: 'Upravena dotace/financování',
  funding_deleted: 'Smazána dotace/financování',
  attachment_uploaded: 'Nahrána příloha',
  attachment_deleted: 'Smazána příloha',
};

const MODULE_LABELS = {
  v2_detail: 'Karta vozidla',
  v2_service: 'Servisy a opravy',
  v2_equipment: 'Výbava a zařízení',
  v2_insurance: 'Pojištění',
  v2_claims: 'Škodní události',
  v2_tires: 'Pneumatiky',
  v2_funding: 'Dotace a financování',
  v2_attachment: 'Přílohy a dokumenty',
};

// Human labels for every field_name value used across saveVehicleDetailById() and the module CRUD audit events.
const FIELD_LABELS = {
  zzs_typ: 'ZZS typ',
  w_popis: 'Volací znak',
  service_notes: 'Poznámka k servisu',
  equipment_json: 'Výbava vozidla',
  technical_notes: 'Technická poznámka',
  insurance_policy: 'Číslo pojistky',
  stk_valid_to: 'Platnost STK',
  emission_valid_to: 'Platnost emisí',
  evidencni_cislo_zzs: 'Evidenční číslo ZZS',
  vin: 'VIN',
  acquisition_year: 'Rok pořízení',
  acquisition_supplier: 'Dodavatel',
  warranty_valid_to: 'Platnost záruky',
  acquisition_price: 'Pořizovací cena',
  technical_condition_code: 'Technický stav',
  service_interval_km: 'Servisní interval (km)',
  service_interval_months: 'Servisní interval (měsíce)',
  battery_condition_code: 'Stav baterie',
  vehicle_lifetime_percent: 'Životnost vozidla (%)',
  manual_location_state: 'Ruční stav umístění',
  manual_location_updated_at: 'Aktualizace ručního stavu',
  service_context_json: 'Kontext servisu',
  service_record: 'Servisní záznam',
  equipment: 'Výbava',
  claim: 'Škodní událost',
  tires: 'Pneumatiky',
  funding: 'Dotace/financování',
  attachment: 'Příloha',
};

const JSON_FIELD_NAMES = new Set(['equipment_json', 'service_context_json']);
const DATE_FIELD_NAMES = new Set(['stk_valid_to', 'emission_valid_to', 'warranty_valid_to', 'manual_location_updated_at']);
const PRICE_FIELD_NAMES = new Set(['acquisition_price']);

// Groups saveVehicleDetailById() fields into the karta section the user actually edited, so the "Akce"
// column shows e.g. "Úprava: Poloha vozidla" instead of a generic "Úprava údaje karty" for every field.
const FIELD_SECTION_LABELS = {
  zzs_typ: 'Základní údaje',
  w_popis: 'Základní údaje',
  evidencni_cislo_zzs: 'Základní údaje',
  vin: 'Základní údaje',
  service_notes: 'Servis a technický stav',
  service_interval_km: 'Servis a technický stav',
  service_interval_months: 'Servis a technický stav',
  service_context_json: 'Servis a technický stav',
  technical_notes: 'Servis a technický stav',
  technical_condition_code: 'Servis a technický stav',
  battery_condition_code: 'Servis a technický stav',
  vehicle_lifetime_percent: 'Servis a technický stav',
  equipment_json: 'Výbava a zařízení',
  insurance_policy: 'Pojištění',
  stk_valid_to: 'STK a emise',
  emission_valid_to: 'STK a emise',
  acquisition_year: 'Pořízení a záruka',
  acquisition_supplier: 'Pořízení a záruka',
  acquisition_price: 'Pořízení a záruka',
  warranty_valid_to: 'Pořízení a záruka',
  manual_location_state: 'Poloha vozidla',
  manual_location_updated_at: 'Poloha vozidla',
};

const MANUAL_LOCATION_STATE_LABELS = {
  doma: 'Doma',
  v_akci: 'V akci',
  v_servisu: 'V servisu',
  nezname: 'Neznámé',
};

export function getFieldLabel(fieldName) {
  return FIELD_LABELS[fieldName] || fieldName || 'pole';
}

export function formatAuditDate(value) {
  if (!value) return '-';
  const normalized = String(value).replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFieldValue(fieldName, rawValue) {
  if (rawValue === null || rawValue === undefined || String(rawValue).trim() === '') {
    return 'prázdné';
  }

  if (fieldName === 'manual_location_state') {
    return MANUAL_LOCATION_STATE_LABELS[rawValue] || String(rawValue);
  }

  if (DATE_FIELD_NAMES.has(fieldName)) {
    const normalized = String(rawValue).replace(' ', 'T');
    const date = new Date(normalized);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('cs-CZ');
    }
    return String(rawValue);
  }

  if (PRICE_FIELD_NAMES.has(fieldName)) {
    const numeric = Number(rawValue);
    if (Number.isFinite(numeric)) {
      return `${numeric.toLocaleString('cs-CZ')} Kč`;
    }
    return String(rawValue);
  }

  return String(rawValue);
}

export function getAuditActorLabel(entry) {
  const name = String(entry?.actor_name || '').trim();
  if (name !== '') {
    return name;
  }
  if (entry?.actor_type === 'system') {
    return 'Systém (sync)';
  }
  if (entry?.actor_user_id) {
    return `Uživatel #${entry.actor_user_id}`;
  }
  return '-';
}

export function getAuditModuleLabel(entry) {
  return MODULE_LABELS[entry?.source] || entry?.source || '-';
}

export function getAuditActionLabel(entry) {
  if (entry?.event_type === 'field_changed') {
    const section = FIELD_SECTION_LABELS[entry.field_name] || getFieldLabel(entry.field_name);
    return `Úprava: ${section}`;
  }
  return EVENT_LABELS[entry?.event_type] || entry?.event_type || '-';
}

function tryParseJson(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

// Builds a compact human summary and a formatted JSON payload usable for a details/expand block.
export function getAuditChangeSummary(entry) {
  const oldJson = tryParseJson(entry?.old_value_json);
  const newJson = tryParseJson(entry?.new_value_json);
  const metadata = tryParseJson(entry?.metadata_json);

  if (entry?.event_type === 'field_changed') {
    const fieldLabel = getFieldLabel(entry.field_name);

    if (JSON_FIELD_NAMES.has(entry.field_name)) {
      const oldParsed = tryParseJson(entry.old_value);
      const newParsed = tryParseJson(entry.new_value);
      const json = JSON.stringify({ před: oldParsed ?? entry.old_value ?? null, po: newParsed ?? entry.new_value ?? null }, null, 2);
      return { summary: `${fieldLabel}: upraveno`, json };
    }

    const oldLabel = formatFieldValue(entry.field_name, entry.old_value);
    const newLabel = formatFieldValue(entry.field_name, entry.new_value);
    return { summary: `${fieldLabel}: „${oldLabel}“ → „${newLabel}“`, json: null };
  }

  const payload = {};
  if (oldJson !== null) payload.old = oldJson;
  if (newJson !== null) payload.new = newJson;
  if (metadata !== null) payload.metadata = metadata;
  if (Object.keys(payload).length === 0 && (entry?.old_value || entry?.new_value)) {
    payload.old = entry.old_value ?? null;
    payload.new = entry.new_value ?? null;
  }

  const json = Object.keys(payload).length > 0 ? JSON.stringify(payload, null, 2) : null;
  const summary = entry?.field_name ? `Záznam: ${getFieldLabel(entry.field_name)}` : null;

  return { summary, json };
}

