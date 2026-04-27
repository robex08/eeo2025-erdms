// TypeScript typy pro API response struktury
// Podle dokumentace z /var/www/erdms-dev/apps/eeo-v2/mobilni_app_doc/

export interface User {
  id: number;
  username: string;
  jmeno: string;
  prijmeni: string;
  email: string;
  telefon?: string;
  aktivni: 0 | 1;
  organizace_id: number;
  nazev_organizace?: string;
  usek_id?: number;
  usek_zkr?: string;
  pozice?: string;
  lokalita?: string;
  dt_posledni_prihlaseni?: string;
  dt_posledni_aktivita?: string;
}

export interface LoginResponse {
  id: number;
  username: string;
  jmeno: string;
  prijmeni: string;
  email: string;
  token: string;
  auth_method: 'local' | 'entra';
  aktivni: 1;
  organizace_id: number;
  dt_posledni_prihlaseni: string;
  dt_posledni_aktivita: string;
  pozice?: string;
  lokalita?: string;
  telefon?: string;
}

export interface OrderStats {
  // Základní statistiky
  total: number;
  totalAmount: number;
  total_amount: number;
  filteredTotalAmount: number;
  rozpracovaneAmount: number;
  dokoncenaAmount: number;
  
  // Stavy workflow (počty objednávek)
  nove: number;
  ke_schvaleni: number;
  schvalena: number;
  zamitnuta: number;
  rozpracovana: number;
  odeslana: number;
  potvrzena: number;
  k_uverejneni_do_registru: number;
  uverejnena: number;
  fakturace: number;
  vecna_spravnost: number;
  fakturace_prodleni: number;
  zkontrolovana: number;
  dokoncena: number;
  zrusena: number;
  smazana: number;
  
  // Další statistiky
  withInvoices: number;
  withAttachments: number;
  withoutObjAttachments: number;
  mimoradneUdalosti: number;
  mojeObjednavky: number;
  withComments: number;
  withMyComments: number;
}

export interface OrderListItem {
  id: number;
  cislo_objednavky: string;
  dt_vytvoreno: string;
  stav_workflow_kod: string;
  stav_workflow_nazev: string;
  dodavatel_nazev?: string;
  celkova_castka: number;
  objednatel_jmeno?: string;
  objednatel_prijmeni?: string;
  garant_jmeno?: string;
  garant_prijmeni?: string;
  druh_objednavky_nazev?: string;
  pocet_polozek: number;
  pocet_faktur: number;
  priorita?: 'normal' | 'urgent';
  financovani?: string;
}

export interface OrderDetail {
  id: number;
  cislo_objednavky: string;
  dt_vytvoreno: string;
  dt_aktualizace?: string;
  stav_workflow_kod: string;
  stav_workflow_nazev: string;
  
  // Dodavatel
  dodavatel_id?: number;
  dodavatel_nazev?: string;
  dodavatel_ico?: string;
  
  // Osoby
  objednatel_id: number;
  objednatel_jmeno?: string;
  objednatel_prijmeni?: string;
  garant_uzivatel_id?: number;
  garant_jmeno?: string;
  garant_prijmeni?: string;
  schvalovatel_id?: number;
  schvalovatel_jmeno?: string;
  schvalovatel_prijmeni?: string;
  prikazce_id?: number;
  prikazce_jmeno?: string;
  prikazce_prijmeni?: string;
  
  // Financování
  financovani?: string;
  lp_kody?: string; // "LP-XXX|Název;;LP-YYY|Název2"
  
  // Částky
  celkova_castka: number;
  celkova_castka_s_dph?: number;
  
  // Metadata
  druh_objednavky_kod?: string;
  druh_objednavky_nazev?: string;
  poznamka?: string;
  priorita?: 'normal' | 'urgent';
  
  // Počty
  pocet_polozek: number;
  pocet_faktur: number;
  pocet_priloh?: number;
}

export interface OrderItem {
  id: number;
  objednavka_id: number;
  nazev: string;
  popis?: string;
  mnozstvi: number;
  jednotka?: string;
  cena_za_jednotku: number;
  celkova_cena: number;
  lp_kod?: string;
  lp_nazev?: string;
  poradi?: number;
}

export interface Invoice {
  id: number;
  objednavka_id: number;
  cislo_faktury: string;
  variabilni_symbol?: string;
  castka: number;
  castka_s_dph?: number;
  dt_vystaveni?: string;
  dt_splatnosti?: string;
  stav?: string;
  lp_kody?: string;
  poznamka?: string;
}

export interface ApiResponse<T = any> {
  status: 'ok' | 'error';
  data?: T;
  message?: string;
  error?: string;
}

export type OrderStatus =
  | 'NOVA'
  | 'KE_SCHVALENI'
  | 'ODESLANA_KE_SCHVALENI'
  | 'SCHVALENA'
  | 'ZAMITNUTA'
  | 'ROZPRACOVANA'
  | 'ODESLANA'
  | 'POTVRZENA'
  | 'DOKONCENA'
  | 'ZRUSENA';

export interface OrderFilter {
  status?: OrderStatus | 'all';
  period?: 'all' | 'current-year' | 'current-month' | 'last-month' | 'last-quarter';
  search?: string;
  page?: number;
  page_size?: number;
}
