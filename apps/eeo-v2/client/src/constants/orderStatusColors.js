/**
 * Konstanty pro barvy stavů objednávek
 *
 * Každý stav má dvě varianty barev:
 * - dark: Použití pro 3D dlaždice, dashboardy, zvýrazněné elementy
 * - light: Použití pro tabulky, backgrounds, jemnější UI elementy
 */

export const STATUS_COLORS = {
  // Tmavé barvy pro 3D dlaždice + korespondující světlé odstíny pro tabulku
  NOVA: {
    dark: '#475569', // tmavě šedá - nová objednávka
    light: '#e2e8f0' // světle šedá - koresponduje
  },
  KE_SCHVALENI: {
    dark: '#dc2626', // ČERVENÁ/RUDÁ - ke schválení (jak požadováno)
    light: '#fecaca' // světle červená - koresponduje s rudou
  },
  SCHVALENA: {
    dark: '#ea580c', // ORANŽOVÁ - schválená (jak požadováno)
    light: '#fed7aa' // světle oranžová - koresponduje
  },
  ZAMITNUTA: {
    dark: '#7c2d12', // tmavě hnědá - zamítnutá
    light: '#fed7aa' // světle hnědá - koresponduje
  },
  ROZPRACOVANA: {
    dark: '#ca8a04', // ŽLUTÁ - rozpracovaná (jak požadováno)
    light: '#fef08a' // světle žlutá - koresponduje
  },
  ODESLANA: {
    dark: '#1d4ed8', // MODRÁ - odeslaná dodavateli (jak požadováno)
    light: '#dbeafe' // světle modrá - koresponduje
  },
  POTVRZENA: {
    dark: '#0891b2', // CYAN - faktura/potvrzená (jak požadováno)
    light: '#a5f3fc' // světle cyan - koresponduje
  },
  K_UVEREJNENI_DO_REGISTRU: {
    dark: '#8b5cf6', // fialová - má být zveřejněna v registru smluv
    light: '#ede9fe' // světle fialová - koresponduje
  },
  UVEREJNENA: {
    dark: '#7c2d12', // hnědá - zveřejněná v registru smluv
    light: '#fed7aa' // světle oranžová - koresponduje
  },
  CEKA_POTVRZENI: {
    dark: '#7c3aed', // fialová - čeká na potvrzení (unikátní)
    light: '#e9d5ff' // světle fialová - koresponduje
  },
  CEKA_SE: {
    dark: '#92400e', // tmavě zlatohnědá - čeká se (unikátní, odlišná od oranžové)
    light: '#fef3c7' // světle zlatá - koresponduje
  },
  VECNA_SPRAVNOST: {
    dark: '#10b981', // zelená - věcná správnost/kontrola
    light: '#d1fae5' // světle zelená - koresponduje
  },
  DOKONCENA: {
    dark: '#16a34a', // ZELENÁ - dokončená (jak požadováno)
    light: '#bbf7d0' // světle zelená - koresponduje
  },
  ZRUSENA: {
    dark: '#be185d', // růžová - zrušená (unikátní)
    light: '#fce7f3' // světle růžová - koresponduje
  },
  SMAZANA: {
    dark: '#374151', // tmavě šedá - smazaná
    light: '#d1d5db' // světle šedá - koresponduje
  },
  ARCHIVOVANO: {
    dark: '#78350f', // tmavě hnědá - archivovaná/import
    light: '#fef3c7' // světle žlutá - koresponduje
  },
  // Speciální barvy pro dashboard
  TOTAL: {
    dark: '#14532d', // tmavě zelená pro celkovou hodnotu
    light: '#dcfce7'  // světle zelená - koresponduje
  },
  COUNT: {
    dark: '#1e3a8a', // tmavě modrá pro počty
    light: '#dbeafe'  // světle modrá - koresponduje
  },
  WITH_INVOICES: {
    dark: '#0891b2', // cyan - objednávky s fakturami
    light: '#cffafe'  // světle cyan - koresponduje
  },
  WITH_ATTACHMENTS: {
    dark: '#7c3aed', // fialová - objednávky s přílohami
    light: '#e9d5ff'  // světle fialová - koresponduje
  }
};

/**
 * Získá barvu podle stavu objednávky
 * @param {string|object} stav - Stav objednávky (string nebo objekt s kódem)
 * @returns {object} Objekt s dark a light barvami
 */
export const getStatusColor = (stav) => {
  if (!stav) return STATUS_COLORS.NOVA;

  // Pokud je to string klíč, použij ho přímo
  if (typeof stav === 'string' && STATUS_COLORS[stav]) {
    return STATUS_COLORS[stav];
  }

  // Pokud je to objekt s kódem
  const statusCode = stav?.kod || stav?.status_kod || stav;

  if (!statusCode) return STATUS_COLORS.NOVA;

  return STATUS_COLORS[statusCode] || STATUS_COLORS.NOVA;
};
