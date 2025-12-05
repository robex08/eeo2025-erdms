// Centralized workflow constants and helpers used across the order form

export const STATE_ID = {
  draft: 1,
  pending: 2,
  approved: 3,
  rejected: 4,
  supplierPending: 10,
  supplierConfirmed: 7,
  finished: 8,
  canceled: 9
};

export const statusFromStateId = (stateId) => {
  if (stateId == null) return 'draft';
  const rev = {
    [STATE_ID.draft]: 'draft',
    [STATE_ID.pending]: 'pending',
    [STATE_ID.approved]: 'approved',
    [STATE_ID.rejected]: 'rejected',
    [STATE_ID.supplierPending]: 'supplierPending',
    [STATE_ID.supplierConfirmed]: 'supplierConfirmed',
    [STATE_ID.finished]: 'finished',
    [STATE_ID.canceled]: 'canceled'
  };
  return rev[stateId] || 'unknown';
};

export const WORKFLOW_STATES = [
  { docType: 'OBJEDNAVKA', code: 'NOVA',   short: 'Nová',            description: 'Objednávka je v přípravě, viditelná pouze pro autora.' },
  { docType: 'OBJEDNAVKA', code: 'CEKA_SCHVALENI', short: 'Žádost ke schválení',      description: 'Objednávka byla odeslána a čeká na akci schvalovatele.' },
  { docType: 'OBJEDNAVKA', code: 'SCHVALENA',      short: 'Schválená',                description: 'Objednávka byla schválena příslušným manažerem.' },
  { docType: 'OBJEDNAVKA', code: 'ZAMITNUTA',      short: 'Zamítnuta',                description: 'Objednávka byla schvalovatelem zamítnuta.' },
  { docType: 'OBJEDNAVKA', code: 'CEKA_POTVRZENI', short: 'Čeká na potvrzení',        description: 'Objednávka byla odeslána, čeká na potvrzení dodavatele.' },
  { docType: 'OBJEDNAVKA', code: 'ODESLANA',       short: 'Odeslaná (legacy)',        description: 'Původní stav – zachován kvůli historii, nově se používá Čeká na potvrzení.' },
  { docType: 'OBJEDNAVKA', code: 'POTVRZENA',      short: 'Potvrzená dodavatelem',    description: 'Dodavatel potvrdil přijetí a akceptaci objednávky.' },
  { docType: 'OBJEDNAVKA', code: 'DOKONCENA',      short: 'Dokončená',                description: 'Zboží/služba bylo dodáno, proces je uzavřen.' },
  { docType: 'OBJEDNAVKA', code: 'ZRUSENA',        short: 'Zrušena',                  description: 'Objednávka byla stornována před dokončením.' },
];
