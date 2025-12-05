// Central field naming alignment map
// ------------------------------------------------------------
// Purpose:
//  - Define single source of truth for FE <-> DB / API naming.
//  - Support migration phase: old frontend names -> unified canonical names
//  - Later: DB column names can match canonical names directly.
//
// Conventions:
//  - Canonical (target) naming style: camelCase for in-app JS, snake_case for DB if needed (provide dbColumn hint)
//  - Use dot notation for nested paths (e.g. 'supplier.name')
//  - Use wildcard [] for array item scopes (e.g. 'items[].description')
//
// Phases:
//  1. CURRENT (identity) – we start with existing FE names.
//  2. ALIGN – once you fill dbColumn / apiField exactly as they will be.
//  3. CLEAN – remove legacyName once migration is complete.
//
// Fill in apiField / dbColumn when you finalize backend schema. For now many are placeholders.

export const FIELD_MAP = [
  // ================= CORE KEYS =================
  { legacyName: 'id',                canonical: 'id',                apiField: 'id',                dbColumn: 'id',                   meta: { pk: true } },
  { legacyName: 'orderNumber',       canonical: 'orderNumber',       apiField: 'orderNumber',       dbColumn: 'cislo_objednavky' },
  { legacyName: 'orderDate',         canonical: 'orderDate',         apiField: 'orderDate',         dbColumn: 'datum_objednavky' },
  { legacyName: 'subject',           canonical: 'subject',           apiField: 'subject',           dbColumn: 'predmet' },
  { legacyName: 'center',            canonical: 'center',            apiField: 'center',            dbColumn: 'strediska',            meta: { transform: 'CSV<->array' } },
  { legacyName: 'po',                canonical: 'po',                apiField: 'po',                dbColumn: 'prikazce_id' },
  { legacyName: 'maxPriceInclVat',   canonical: 'maxPriceInclVat',   apiField: 'maxPriceInclVat',   dbColumn: 'max_cena_s_dph' },
  { legacyName: 'financingSource',   canonical: 'financingSource',   apiField: 'financingSource',   dbColumn: 'zdroj_financovani' },
  { legacyName: 'orderType',         canonical: 'orderType',         apiField: 'orderType',         dbColumn: 'druh_objednavky' },

  // ================= STATE / WORKFLOW =================
  { legacyName: 'stateId',           canonical: 'stateId',           apiField: 'stateId',           dbColumn: 'stav_id',              meta: { note: 'Raw numeric state id from DB' } },
  { legacyName: 'approvalStatus',    canonical: 'approvalStatus',    apiField: 'approvalStatus',    dbColumn: 'stav_id',              meta: { derived: true, note: 'Computed enum from stateId' } },
  { legacyName: 'stateComment',      canonical: 'stateComment',      apiField: 'stateComment',      dbColumn: 'stav_komentar' },
  { legacyName: 'approvedBy',        canonical: 'approvedByUserId',  apiField: 'approvedByUserId',  dbColumn: 'schvalil_uzivatel_id' },
  { legacyName: 'approvedAt',        canonical: 'approvedAt',        apiField: 'approvedAt',        dbColumn: 'datum_schvaleni' },

  // ================= USER REFERENCES =================
  { legacyName: 'purchaser.userId',  canonical: 'purchaserUserId',   apiField: 'purchaserUserId',   dbColumn: 'objednatel_id' },
  { legacyName: 'purchaser.garant',  canonical: 'guarantUserId',     apiField: 'guarantUserId',     dbColumn: 'garant_uzivatel_id' },
  { legacyName: 'createdByUserId',   canonical: 'createdByUserId',   apiField: 'createdByUserId',   dbColumn: 'created_by_uzivatel_id' },
  { legacyName: 'updatedByUserId',   canonical: 'updatedByUserId',   apiField: 'updatedByUserId',   dbColumn: 'updated_by_uzivatel_id' },

  // ================= SUPPLIER (FLATTEN) =================
  { legacyName: 'supplier.id',                   canonical: 'supplierId',                    apiField: 'supplierId',            dbColumn: 'dodavatel_id' },
  { legacyName: 'supplier.name',                 canonical: 'supplier.name',                 apiField: 'supplierName',          dbColumn: 'dodavatel_nazev' },
  { legacyName: 'supplier.address',              canonical: 'supplier.address',              apiField: 'supplierAddress',       dbColumn: 'dodavatel_adresa' },
  { legacyName: 'supplier.ico',                  canonical: 'supplier.ico',                  apiField: 'supplierIco',           dbColumn: 'dodavatel_ico' },
  { legacyName: 'supplier.dic',                  canonical: 'supplier.dic',                  apiField: 'supplierDic',           dbColumn: 'dodavatel_dic' },
  { legacyName: 'supplier.represented',          canonical: 'supplier.represented',          apiField: 'supplierRepresented',   dbColumn: 'dodavatel_zastoupeny' },
  { legacyName: 'supplier.contactPerson.name',   canonical: 'supplier.contactPerson.name',   apiField: 'supplierContactName',   dbColumn: 'dodavatel_kontakt_jmeno' },
  { legacyName: 'supplier.contactPerson.email',  canonical: 'supplier.contactPerson.email',  apiField: 'supplierContactEmail',  dbColumn: 'dodavatel_kontakt_email' },
  { legacyName: 'supplier.contactPerson.phone',  canonical: 'supplier.contactPerson.phone',  apiField: 'supplierContactPhone',  dbColumn: 'dodavatel_kontakt_telefon' },

  // ================= DESCRIPTION / NOTES =================
  { legacyName: 'description',       canonical: 'description',       apiField: 'description',       dbColumn: null,                   meta: { persist: false, note: 'Not stored yet (no dedicated column). Consider adding later.' } },
  { legacyName: 'notes',             canonical: 'notes',             apiField: 'notes',             dbColumn: 'poznamka' },
  { legacyName: 'expectedDeliveryDate', canonical: 'expectedDeliveryDate', apiField: 'expectedDeliveryDate', dbColumn: 'predpokladany_termin_dodani' },
  { legacyName: 'deliveryLocation',  canonical: 'deliveryLocation',  apiField: 'deliveryLocation',  dbColumn: 'misto_dodani' },
  { legacyName: 'warranty',          canonical: 'warranty',          apiField: 'warranty',          dbColumn: 'zaruka' },

  // ================= SENDING / CONFIRMATION =================
  { legacyName: 'sentStatus',        canonical: 'sentStatus',        apiField: 'sentStatus',        dbColumn: 'stav_odeslano',        meta: { transform: 'tinyint↔enum', hint: '0=neodeslano,1=odeslano,2=stornovano?' } },
  { legacyName: 'sentStatusDate',    canonical: 'sentStatusDate',    apiField: 'sentStatusDate',    dbColumn: 'datum_odeslani' },
  { legacyName: 'orderConfirmed',    canonical: 'orderConfirmed',    apiField: 'orderConfirmed',    dbColumn: 'potvrzeno_dodavatelem', meta: { transform: 'tinyint↔boolean' } },
  { legacyName: 'acceptanceDate',    canonical: 'acceptanceDate',    apiField: 'acceptanceDate',    dbColumn: 'datum_akceptace' },
  // Confirmation methods (FE array confirmationMethods[] ↔ DB 4 booleans)
  { legacyName: 'confirmationMethods.email',      canonical: 'confirmation.email',      apiField: 'confirmationEmail',      dbColumn: 'potvrzeni_email',           meta: { group: 'confirmation', transform: 'boolInArray:email' } },
  { legacyName: 'confirmationMethods.phone',      canonical: 'confirmation.phone',      apiField: 'confirmationPhone',      dbColumn: 'potvrzeni_telefon',         meta: { group: 'confirmation', transform: 'boolInArray:phone' } },
  { legacyName: 'confirmationMethods.signedForm', canonical: 'confirmation.signedForm', apiField: 'confirmationSignedForm', dbColumn: 'potvrzeni_podepsany_form',  meta: { group: 'confirmation', transform: 'boolInArray:signedForm' } },
  { legacyName: 'confirmationMethods.eShop',      canonical: 'confirmation.eShop',      apiField: 'confirmationEshop',      dbColumn: 'potvrzeni_eshop',           meta: { group: 'confirmation', transform: 'boolInArray:eShop' } },

  // ================= PAYMENT (FE single string paymentMethod ↔ DB two booleans) =================
  { legacyName: 'paymentMethod.invoice', canonical: 'payment.invoice', apiField: 'paymentInvoice', dbColumn: 'platba_faktura', meta: { group: 'paymentMethod', transform: 'boolSelect:invoice' } },
  { legacyName: 'paymentMethod.cashier', canonical: 'payment.cashier', apiField: 'paymentCashier', dbColumn: 'platba_pokladna', meta: { group: 'paymentMethod', transform: 'boolSelect:cashier' } },

  // ================= REGISTRY / PUBLICATION =================
  { legacyName: 'registryContract',  canonical: 'registryContract',  apiField: 'registryContract',  dbColumn: 'zverejnit_registr_smluv', meta: { transform: 'tinyint↔boolean' } },
  { legacyName: 'publishDate',       canonical: 'publishDate',       apiField: 'publishDate',       dbColumn: 'datum_zverejneni' },
  { legacyName: 'identifier',        canonical: 'identifier',        apiField: 'identifier',        dbColumn: 'registr_smluv_id' },

  // ================= AGGREGATED PRICES (PLACEHOLDERS) =================
  { legacyName: 'priceExclVat',      canonical: 'priceExclVat',      apiField: 'priceExclVat',      dbColumn: null, meta: { persist: false, note: 'Derived (sum of items) – not in 25_objednavky' } },
  { legacyName: 'priceInclVat',      canonical: 'priceInclVat',      apiField: 'priceInclVat',      dbColumn: null, meta: { persist: false, note: 'Derived (sum of items) – not in 25_objednavky' } },
  { legacyName: 'vatRate',           canonical: 'vatRate',           apiField: 'vatRate',           dbColumn: null, meta: { persist: false, note: 'Per item / aggregated – no column' } },

  // ================= SYSTEM TIMESTAMPS =================
  { legacyName: 'createdAt',         canonical: 'createdAt',         apiField: 'createdAt',         dbColumn: 'dt_vytvoreni' },
  { legacyName: 'updatedAt',         canonical: 'updatedAt',         apiField: 'updatedAt',         dbColumn: 'dt_aktualizace' },

  // ================= ITEMS (separate table – placeholder) =================
  { legacyName: 'items[].description', canonical: 'items[].description', apiField: 'itemDescription', dbColumn: 'item_description', meta: { table: '25_objednavky_polozky?' } },
  { legacyName: 'items[].priceExclVat', canonical: 'items[].priceExclVat', apiField: 'itemPriceExclVat', dbColumn: 'item_price_excl_vat', meta: { table: '25_objednavky_polozky?' } },
  { legacyName: 'items[].vatRate',      canonical: 'items[].vatRate',      apiField: 'itemVatRate',      dbColumn: 'item_vat_rate',      meta: { table: '25_objednavky_polozky?' } },
  { legacyName: 'items[].priceInclVat', canonical: 'items[].priceInclVat', apiField: 'itemPriceInclVat', dbColumn: 'item_price_incl_vat', meta: { table: '25_objednavky_polozky?' } }
];

// --- Extended mapping for real items table (25_objednavky_polozky) ---
// Adding explicit item field mappings now that table structure is known.
// We keep previous generic placeholders above for backward compatibility during migration.
FIELD_MAP.push(
  { legacyName: 'items[].id',            canonical: 'items[].id',            apiField: 'itemId',          dbColumn: 'id',              meta: { table: '25_objednavky_polozky', pk: true } },
  { legacyName: 'items[].description',   canonical: 'items[].description',   apiField: 'itemDescription',  dbColumn: 'popis',           meta: { table: '25_objednavky_polozky', required: true } },
  { legacyName: 'items[].priceExclVat',  canonical: 'items[].priceExclVat',  apiField: 'itemPriceExclVat', dbColumn: 'cena_bez_dph',    meta: { table: '25_objednavky_polozky', type: 'decimal(15,2)' } },
  { legacyName: 'items[].vatRate',       canonical: 'items[].vatRate',       apiField: 'itemVatRate',      dbColumn: 'sazba_dph',       meta: { table: '25_objednavky_polozky', type: 'int', note: 'DPH percent' } },
  { legacyName: 'items[].priceInclVat',  canonical: 'items[].priceInclVat',  apiField: 'itemPriceInclVat', dbColumn: 'cena_s_dph',      meta: { table: '25_objednavky_polozky', type: 'decimal(15,2)' } },
  { legacyName: 'items[].createdAt',     canonical: 'items[].createdAt',     apiField: 'itemCreatedAt',    dbColumn: 'dt_vytvoreni',    meta: { table: '25_objednavky_polozky', system: true } },
  { legacyName: 'items[].updatedAt',     canonical: 'items[].updatedAt',     apiField: 'itemUpdatedAt',    dbColumn: 'dt_aktualizace',  meta: { table: '25_objednavky_polozky', system: true } }
);

// --- Attachments (25_objednavky_prilohy) mapping ---
FIELD_MAP.push(
  { legacyName: 'attachments[].id',                canonical: 'attachments[].id',               apiField: 'attachmentId',          dbColumn: 'id',                         meta: { table: '25_objednavky_prilohy', pk: true } },
  { legacyName: 'attachments[].guid',              canonical: 'attachments[].guid',             apiField: 'attachmentGuid',        dbColumn: 'guid',                       meta: { table: '25_objednavky_prilohy' } },
  { legacyName: 'attachments[].type',              canonical: 'attachments[].type',             apiField: 'attachmentType',        dbColumn: 'typ_prilohy',                meta: { table: '25_objednavky_prilohy', note: 'logical type/category' } },
  { legacyName: 'attachments[].originalFileName',  canonical: 'attachments[].originalFileName', apiField: 'attachmentOriginal',    dbColumn: 'originalni_nazev_souboru',   meta: { table: '25_objednavky_prilohy', required: true } },
  { legacyName: 'attachments[].storagePath',       canonical: 'attachments[].storagePath',      apiField: 'attachmentStoragePath', dbColumn: 'systemova_cesta',            meta: { table: '25_objednavky_prilohy', note: 'server path or key' } },
  { legacyName: 'attachments[].sizeBytes',         canonical: 'attachments[].sizeBytes',        apiField: 'attachmentSizeBytes',   dbColumn: 'velikost_souboru_b',         meta: { table: '25_objednavky_prilohy', type: 'int' } },
  { legacyName: 'attachments[].uploadedByUserId',  canonical: 'attachments[].uploadedByUserId', apiField: 'attachmentUploadedBy',  dbColumn: 'nahrano_uzivatel_id',        meta: { table: '25_objednavky_prilohy' } },
  { legacyName: 'attachments[].createdAt',         canonical: 'attachments[].createdAt',        apiField: 'attachmentCreatedAt',   dbColumn: 'dt_vytvoreni',               meta: { table: '25_objednavky_prilohy', system: true } },
  { legacyName: 'attachments[].updatedAt',         canonical: 'attachments[].updatedAt',        apiField: 'attachmentUpdatedAt',   dbColumn: 'dt_aktualizace',             meta: { table: '25_objednavky_prilohy', system: true } }
);

// --- Invoice Attachments (25a_faktury_prilohy) mapping ---
FIELD_MAP.push(
  { legacyName: 'invoiceAttachments[].id',                canonical: 'invoiceAttachments[].id',               apiField: 'invoiceAttachmentId',          dbColumn: 'id',                         meta: { table: '25a_faktury_prilohy', pk: true } },
  { legacyName: 'invoiceAttachments[].guid',              canonical: 'invoiceAttachments[].guid',             apiField: 'invoiceAttachmentGuid',        dbColumn: 'guid',                       meta: { table: '25a_faktury_prilohy' } },
  { legacyName: 'invoiceAttachments[].fakturaId',         canonical: 'invoiceAttachments[].fakturaId',        apiField: 'invoiceAttachmentFakturaId',   dbColumn: 'faktura_id',                 meta: { table: '25a_faktury_prilohy', fk: '25a_faktury_objednavek' } },
  { legacyName: 'invoiceAttachments[].objednavkaId',      canonical: 'invoiceAttachments[].objednavkaId',     apiField: 'invoiceAttachmentObjednavkaId', dbColumn: 'objednavka_id',             meta: { table: '25a_faktury_prilohy', fk: '25a_objednavky' } },
  { legacyName: 'invoiceAttachments[].type',              canonical: 'invoiceAttachments[].type',             apiField: 'invoiceAttachmentType',        dbColumn: 'typ_prilohy',                meta: { table: '25a_faktury_prilohy', values: ['FAKTURA', 'ISDOC', 'DOPLNEK_FA'] } },
  { legacyName: 'invoiceAttachments[].originalFileName',  canonical: 'invoiceAttachments[].originalFileName', apiField: 'invoiceAttachmentOriginal',    dbColumn: 'originalni_nazev_souboru',   meta: { table: '25a_faktury_prilohy', required: true } },
  { legacyName: 'invoiceAttachments[].storagePath',       canonical: 'invoiceAttachments[].storagePath',      apiField: 'invoiceAttachmentStoragePath', dbColumn: 'systemova_cesta',            meta: { table: '25a_faktury_prilohy', note: 'full physical path' } },
  { legacyName: 'invoiceAttachments[].sizeBytes',         canonical: 'invoiceAttachments[].sizeBytes',        apiField: 'invoiceAttachmentSizeBytes',   dbColumn: 'velikost_souboru_b',         meta: { table: '25a_faktury_prilohy', type: 'int' } },
  { legacyName: 'invoiceAttachments[].isISDOC',           canonical: 'invoiceAttachments[].isISDOC',          apiField: 'invoiceAttachmentIsISDOC',     dbColumn: 'je_isdoc',                   meta: { table: '25a_faktury_prilohy', type: 'boolean' } },
  { legacyName: 'invoiceAttachments[].isdocParsed',       canonical: 'invoiceAttachments[].isdocParsed',      apiField: 'invoiceAttachmentISDOCParsed', dbColumn: 'isdoc_parsed',               meta: { table: '25a_faktury_prilohy', type: 'boolean' } },
  { legacyName: 'invoiceAttachments[].isdocDataJson',     canonical: 'invoiceAttachments[].isdocDataJson',    apiField: 'invoiceAttachmentISDOCData',   dbColumn: 'isdoc_data_json',            meta: { table: '25a_faktury_prilohy', type: 'json' } },
  { legacyName: 'invoiceAttachments[].uploadedByUserId',  canonical: 'invoiceAttachments[].uploadedByUserId', apiField: 'invoiceAttachmentUploadedBy',  dbColumn: 'nahrano_uzivatel_id',        meta: { table: '25a_faktury_prilohy' } },
  { legacyName: 'invoiceAttachments[].createdAt',         canonical: 'invoiceAttachments[].createdAt',        apiField: 'invoiceAttachmentCreatedAt',   dbColumn: 'dt_vytvoreni',               meta: { table: '25a_faktury_prilohy', system: true } },
  { legacyName: 'invoiceAttachments[].updatedAt',         canonical: 'invoiceAttachments[].updatedAt',        apiField: 'invoiceAttachmentUpdatedAt',   dbColumn: 'dt_aktualizace',             meta: { table: '25a_faktury_prilohy', system: true } }
);

// Utility: build quick lookup maps
function buildIndex(list, key) {
  return list.reduce((acc, row) => { if (row[key]) acc[row[key]] = row; return acc; }, {});
}
export const byLegacy = buildIndex(FIELD_MAP, 'legacyName');
export const byCanonical = buildIndex(FIELD_MAP, 'canonical');

// Resolve a value at dot path; supports arrays with wildcard '[]' only for mapping templates (not direct resolution)
function get(obj, path) {
  if (!obj) return undefined;
  if (path.includes('[]')) return undefined; // caller must expand manually for arrays
  return path.split('.').reduce((o,k)=> (o==null?undefined:o[k]), obj);
}
function set(obj, path, value) {
  const segs = path.split('.');
  let cur = obj;
  for (let i=0;i<segs.length;i++) {
    const k = segs[i];
    if (i===segs.length-1) cur[k] = value; else { if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {}; cur = cur[k]; }
  }
  return obj;
}

// Migrate object with legacy names to canonical (non-destructive clone)
export function migrateToCanonical(source) {
  if (!source || typeof source !== 'object') return source;
  const clone = JSON.parse(JSON.stringify(source));
  const out = {}; // build new object from scratch to avoid leftovers

  FIELD_MAP.forEach(row => {
    const { legacyName, canonical } = row;
    if (legacyName.includes('[]')) {
      // Array pattern
      const [prefix, rest] = legacyName.split('[]'); // e.g. items.  description
      const base = prefix.replace(/\.$/, ''); // items
      const arr = clone[base];
      if (Array.isArray(arr)) {
        const itemPath = canonical; // canonical has same structure here
        // We'll rebuild array progressively
        const targetBase = base; // keep same base for now
        if (!Array.isArray(out[targetBase])) out[targetBase] = new Array(arr.length).fill(null);
        arr.forEach((item, idx) => {
          if (item && typeof item === 'object') {
            const field = rest.replace(/^\./,''); // description
            const val = item[field];
            if (val !== undefined) {
              if (!out[targetBase][idx]) out[targetBase][idx] = {};
              out[targetBase][idx][field] = val;
            }
          }
        });
      }
    } else {
      const val = get(clone, legacyName);
      if (val !== undefined) set(out, canonical, val);
    }
  });

  return out;
}

// Apply reverse mapping (canonical -> legacy) if needed for old API layer
export function projectToLegacy(canonicalObj) {
  if (!canonicalObj || typeof canonicalObj !== 'object') return canonicalObj;
  const out = {};
  FIELD_MAP.forEach(row => {
    const { legacyName, canonical } = row;
    if (legacyName.includes('[]')) return; // skip arrays for reverse unless needed later
    const val = get(canonicalObj, canonical);
    if (val !== undefined) set(out, legacyName, val);
  });
  return out;
}

// Placeholder validator – later can enforce required canonical fields.
export function validateCanonical(obj) {
  const errors = [];
  if (!obj.subject) errors.push('subject missing');
  if (!obj.orderType) errors.push('orderType missing');
  return { ok: errors.length === 0, errors };
}

// ================= Additional helpers for DB ↔ canonical transformations =================

// Convert DB CSV string of centers to FE array and back
export function centersFromDb(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw; // already array
  return String(raw).split(',').map(s => s.trim()).filter(Boolean);
}
export function centersToDb(arr) {
  if (!Array.isArray(arr)) return '';
  return arr.map(s => (s==null?'':String(s).trim())).filter(Boolean).join(',');
}

// Normalize numeric decimals (input may be number|string|null)
export function toDecimalOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const num = typeof v === 'number' ? v : parseFloat(String(v).replace(/\s+/g,''));
  return isNaN(num) ? null : Number(num.toFixed(2));
}

// Map raw DB master row + items rows to canonical object. Assumes items come as separate array.
export function dbRowsToCanonical({ master, items }) {
  if (!master) return null;
  const c = {};
  // Master simple fields (manual mapping for clarity & performance):
  c.id = master.id;
  c.orderNumber = master.cislo_objednavky || '';
  c.orderDate = master.datum_objednavky || '';
  c.subject = master.predmet || '';
  c.center = centersFromDb(master.strediska);
  c.po = master.prikazce_id || master.po_kod || '';
  c.maxPriceInclVat = master.max_cena_s_dph != null ? String(master.max_cena_s_dph) : '';
  c.financingSource = master.zdroj_financovani || '';
  c.orderType = master.druh_objednavky || '';
  c.stateId = master.stav_id;
  c.stateComment = master.stav_komentar || '';
  c.approvalStatus = null; // derived later from stateId mapping (external)
  c.approvedByUserId = master.schvalil_uzivatel_id || '';
  c.approvedAt = master.datum_schvaleni || '';
  c.purchaserUserId = master.objednatel_id || '';
  c.guarantUserId = master.garant_uzivatel_id || '';
  c.createdByUserId = master.created_by_uzivatel_id || '';
  c.updatedByUserId = master.updated_by_uzivatel_id || '';
  c.registryContract = !!master.zverejnit_registr_smluv;
  c.publishDate = master.datum_zverejneni || '';
  c.identifier = master.registr_smluv_id || '';
  c.expectedDeliveryDate = master.predpokladany_termin_dodani || '';
  c.deliveryLocation = master.misto_dodani || '';
  c.warranty = master.zaruka || '';
  c.sentStatus = master.stav_odeslano ?? 0;
  c.sentStatusDate = master.datum_odeslani || '';
  c.orderConfirmed = !!master.potvrzeno_dodavatelem;
  c.acceptanceDate = master.datum_akceptace || '';
  // Confirmation booleans -> array (legacy FE) & object variant
  const confirmation = [];
  if (master.potvrzeni_email) confirmation.push('email');
  if (master.potvrzeni_telefon) confirmation.push('phone');
  if (master.potvrzeni_podepsany_form) confirmation.push('signedForm');
  if (master.potvrzeni_eshop) confirmation.push('eShop');
  c.confirmationMethods = confirmation;
  c.paymentMethod = master.platba_faktura ? 'invoice' : (master.platba_pokladna ? 'cashier' : '');
  // Supplier nested
  c.supplierId = master.dodavatel_id || '';
  c.supplier = {
    name: master.dodavatel_nazev || '',
    address: master.dodavatel_adresa || '',
    ico: master.dodavatel_ico || '',
    dic: master.dodavatel_dic || '',
    represented: master.dodavatel_zastoupeny || '',
    contactPerson: {
      name: master.dodavatel_kontakt_jmeno || '',
      email: master.dodavatel_kontakt_email || '',
      phone: master.dodavatel_kontakt_telefon || ''
    }
  };
  // Notes mapping (description not persisted yet)
  c.notes = master.poznamka || '';
  // Items
  c.items = Array.isArray(items) ? items.map(it => ({
    id: it.id,
    description: it.popis || '',
    priceExclVat: it.cena_bez_dph != null ? String(it.cena_bez_dph) : '',
    vatRate: it.sazba_dph != null ? it.sazba_dph : 21,
    priceInclVat: it.cena_s_dph != null ? String(it.cena_s_dph) : ''
  })) : [{ description: '', priceExclVat: '', vatRate: 21, priceInclVat: '' }];
  // Derived aggregates (optional)
  try {
    const sumEx = c.items.reduce((a,b)=> a + (parseFloat(b.priceExclVat)||0), 0);
    const sumInc = c.items.reduce((a,b)=> a + (parseFloat(b.priceInclVat)||0), 0);
    c.priceExclVat = sumEx ? String(sumEx.toFixed(2)) : '';
    c.priceInclVat = sumInc ? String(sumInc.toFixed(2)) : '';
  } catch {}
  c.createdAt = master.dt_vytvoreni || '';
  c.updatedAt = master.dt_aktualizace || '';
  return c;
}

// Convert attachment DB rows to canonical attachment objects
export function dbAttachmentsToCanonical(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(r => ({
    id: r.id,
    guid: r.guid || '',
    type: r.typ_prilohy || '',
    originalFileName: r.originalni_nazev_souboru || '',
    storagePath: r.systemova_cesta || '',
    sizeBytes: r.velikost_souboru_b != null ? Number(r.velikost_souboru_b) : null,
    uploadedByUserId: r.nahrano_uzivatel_id || '',
    createdAt: r.dt_vytvoreni || '',
    updatedAt: r.dt_aktualizace || ''
  }));
}

// Prepare a single API payload combining master + items (one-shot insert/update)
export function canonicalToSinglePayload(c) {
  if (!c) return null;
  const master = {
    id: c.id || undefined,
    cislo_objednavky: c.orderNumber || null,
    datum_objednavky: c.orderDate || null,
    predmet: c.subject || null,
    strediska: centersToDb(c.center),
    prikazce_id: c.po || null,
    max_cena_s_dph: toDecimalOrNull(c.maxPriceInclVat),
    zdroj_financovani: c.financingSource || null,
    druh_objednavky: c.orderType || null,
    stav_id: c.stateId || null,
    stav_komentar: c.stateComment || null,
    schvalil_uzivatel_id: c.approvedByUserId || null,
    datum_schvaleni: c.approvedAt || null,
    objednatel_id: c.purchaserUserId || null,
    garant_uzivatel_id: c.guarantUserId || null,
    created_by_uzivatel_id: c.createdByUserId || null,
    updated_by_uzivatel_id: c.updatedByUserId || null,
    dodavatel_id: c.supplierId || null,
    dodavatel_nazev: c?.supplier?.name || null,
    dodavatel_adresa: c?.supplier?.address || null,
    dodavatel_ico: c?.supplier?.ico || null,
    dodavatel_dic: c?.supplier?.dic || null,
    dodavatel_zastoupeny: c?.supplier?.represented || null,
    dodavatel_kontakt_jmeno: c?.supplier?.contactPerson?.name || null,
    dodavatel_kontakt_email: c?.supplier?.contactPerson?.email || null,
    dodavatel_kontakt_telefon: c?.supplier?.contactPerson?.phone || null,
    predpokladany_termin_dodani: c.expectedDeliveryDate || null,
    misto_dodani: c.deliveryLocation || null,
    zaruka: c.warranty || null,
    stav_odeslano: c.sentStatus ?? 0,
    datum_odeslani: c.sentStatusDate || null,
    potvrzeno_dodavatelem: c.orderConfirmed ? 1 : 0,
    datum_akceptace: c.acceptanceDate || null,
    potvrzeni_email: c.confirmationMethods?.includes('email') ? 1 : 0,
    potvrzeni_telefon: c.confirmationMethods?.includes('phone') ? 1 : 0,
    potvrzeni_podepsany_form: c.confirmationMethods?.includes('signedForm') ? 1 : 0,
    potvrzeni_eshop: c.confirmationMethods?.includes('eShop') ? 1 : 0,
    platba_faktura: c.paymentMethod === 'invoice' ? 1 : 0,
    platba_pokladna: c.paymentMethod === 'cashier' ? 1 : 0,
    zverejnit_registr_smluv: c.registryContract ? 1 : 0,
    datum_zverejneni: c.publishDate || null,
    registr_smluv_id: c.identifier || null,
    poznamka: c.notes || null
  };
  // Items mapping
  const items = (c.items || []).map(it => ({
    id: it.id || undefined,
    popis: it.description || null,
    cena_bez_dph: toDecimalOrNull(it.priceExclVat),
    sazba_dph: it.vatRate != null ? it.vatRate : null,
    cena_s_dph: toDecimalOrNull(it.priceInclVat)
  }));
  const attachments = (c.attachments || []).map(a => ({
    id: a.id || undefined,
    guid: a.guid || null,
    typ_prilohy: a.type || null,
    originalni_nazev_souboru: a.originalFileName || null,
    systemova_cesta: a.storagePath || null,
    velikost_souboru_b: a.sizeBytes != null ? a.sizeBytes : null,
    nahrano_uzivatel_id: a.uploadedByUserId || null
  }));
  return { master, items, attachments };
}

// Validate minimal payload before sending (simple check)
export function validateBeforeSend(c) {
  const errs = [];
  if (!c.subject) errs.push('subject missing');
  if (!c.orderType) errs.push('orderType missing');
  if (!c.center || !c.center.length) errs.push('center empty');
  if (!c.maxPriceInclVat) errs.push('maxPriceInclVat missing');
  if (!c.items || !c.items.length) errs.push('items missing');
  if (c.items) c.items.forEach((it, i) => { if (!it.description) errs.push(`item[${i}].description missing`); });
  return { ok: errs.length === 0, errors: errs };
}

export default FIELD_MAP;
