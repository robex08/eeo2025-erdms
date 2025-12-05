// Static order templates (snake_case) prepared for future API replacement.
// Shape:
// templateKey: {
//   poApproval: { predmet, prikazce_id, strediska[], max_cena_s_dph },
//   orderDetails: { dodavatel_nazev, dodavatel_adresa, dodavatel_ico, dodavatel_dic, dodavatel_zastoupeny,
//                   druh_objednavky, poznamka, zdroj_financovani, predpokladany_termin_dodani,
//                   misto_dodani, zaruka, max_cena_s_dph, platba_zpusob },
//   polozky?: [ { popis, cena_bez_dph, sazba_dph, cena_s_dph }... ]
// }

export function getStaticOrderTemplates() {
  return {
    defibrilatory: {
      poApproval: { predmet: 'Nákup defibrilátorů pro sanitní vozy', prikazce_id: 'IT', strediska: ['Kladno', 'Kolín'], max_cena_s_dph: '1500000' },
      orderDetails: {
        dodavatel_nazev: 'Medica Trade s.r.o.', dodavatel_adresa: 'Dlouhá 1, Praha', dodavatel_ico: '12345678', dodavatel_dic: 'CZ12345678', dodavatel_zastoupeny: 'Jan Novák',
        druh_objednavky: 'Dodávka zboží', poznamka: 'Dodávka a instalace 50 ks defibrilátorů a příslušenství do sanitních vozů.',
        zdroj_financovani: 'Smlouva', predpokladany_termin_dodani: '2025-03-15', misto_dodani: 'Sklad ZZS Kladno', zaruka: '2 roky',
        max_cena_s_dph: '1500000', platba_zpusob: 'invoice'
      },
      polozky: [
        { popis: 'Defibrilátor LIFEPAK CR2', cena_bez_dph: '30000', sazba_dph: 21, cena_s_dph: '36300' },
        { popis: 'Náhradní elektrody (balení 10 ks)', cena_bez_dph: '18000', sazba_dph: 21, cena_s_dph: '21780' }
      ]
    },
    vybaveniSanity: {
      poApproval: { predmet: 'Vybavení sanitního vozu', prikazce_id: 'EN', strediska: ['Beroun'], max_cena_s_dph: '500000' },
      orderDetails: {
        dodavatel_nazev: 'Emergency Supplies a.s.', dodavatel_adresa: 'Náměstí 10, Brno', dodavatel_ico: '98765432', dodavatel_dic: 'CZ98765432', dodavatel_zastoupeny: 'Eva Veselá',
        druh_objednavky: 'Dodávka zboží', poznamka: 'Kompletní vybavení pro nový sanitní vůz (nosiče, lékárna, fixační pomůcky).',
        zdroj_financovani: 'Pokladna', predpokladany_termin_dodani: '2025-02-28', misto_dodani: 'Sklad ZZS Praha', zaruka: '1 rok',
        max_cena_s_dph: '500000', platba_zpusob: 'cashier'
      },
      polozky: [
        { popis: 'Transportní nosítka', cena_bez_dph: '12000', sazba_dph: 21, cena_s_dph: '14520' },
        { popis: 'Sada fixačních dlah', cena_bez_dph: '8000', sazba_dph: 21, cena_s_dph: '9680' },
        { popis: 'Lékárnička vybavená', cena_bez_dph: '6000', sazba_dph: 21, cena_s_dph: '7260' }
      ]
    },
    itNakup: {
      poApproval: { predmet: 'Nákup IT hardwaru a softwaru', prikazce_id: 'IT', strediska: ['Kolín', 'Kutná Hora'], max_cena_s_dph: '850000' },
      orderDetails: {
        dodavatel_nazev: 'IT Solutions, a.s.', dodavatel_adresa: 'Technologická 10, Praha', dodavatel_ico: '55667788', dodavatel_dic: 'CZ55667788', dodavatel_zastoupeny: 'Tomáš Dvořák',
        druh_objednavky: 'Dodávka zboží', poznamka: 'Nákup 20 ks notebooků a 20 ks licencí na software pro interní účely.',
        zdroj_financovani: 'Smlouva', predpokladany_termin_dodani: '2025-03-30', misto_dodani: 'Sklad centrála', zaruka: '3 roky',
        max_cena_s_dph: '850000', platba_zpusob: 'invoice'
      },
      polozky: [
        { popis: 'Notebook 15" i5/16GB/512SSD', cena_bez_dph: '25000', sazba_dph: 21, cena_s_dph: '30250' },
        { popis: 'Licence kancelářského balíku (1Y)', cena_bez_dph: '3500', sazba_dph: 21, cena_s_dph: '4235' }
      ]
    },
    toneryTiskarny: {
      poApproval: { predmet: 'Objednávka tonerů a údržba tiskáren', prikazce_id: 'IT', strediska: ['Kolín', 'Příbram'], max_cena_s_dph: '15000' },
      orderDetails: {
        dodavatel_nazev: 'Print Service s.r.o.', dodavatel_adresa: 'Tovární 5, Brno', dodavatel_ico: '87654321', dodavatel_dic: 'CZ87654321', dodavatel_zastoupeny: 'Petr Janda',
        druh_objednavky: 'Služba', poznamka: 'Pravidelná výměna tonerů a údržba tiskáren na dvou stanovištích.',
        zdroj_financovani: 'Smlouva', predpokladany_termin_dodani: '2025-02-20', misto_dodani: 'Dle harmonogramu', zaruka: 'dle smlouvy',
        max_cena_s_dph: '15000', platba_zpusob: 'invoice'
      },
      polozky: [
        { popis: 'Toner černý HP 410X', cena_bez_dph: '2500', sazba_dph: 21, cena_s_dph: '3025' },
        { popis: 'Servisní zásah - čištění tiskárny', cena_bez_dph: '1800', sazba_dph: 21, cena_s_dph: '2178' }
      ]
    },
    administrativni: {
      poApproval: { predmet: 'Nákup administrativních potřeb', prikazce_id: 'PN', strediska: ['Kutná Hora'], max_cena_s_dph: '25000' },
      orderDetails: {
        dodavatel_nazev: 'Office Depot, s.r.o.', dodavatel_adresa: 'Budějovická 20, Praha', dodavatel_ico: '11223344', dodavatel_dic: 'CZ11223344', dodavatel_zastoupeny: 'Eva Benešová',
        druh_objednavky: 'Drobné nákupy', poznamka: 'Běžné administrativní potřeby, tonery, papír, atd.',
        zdroj_financovani: 'Pokladna', predpokladany_termin_dodani: '2025-01-30', misto_dodani: 'Sklad centrála', zaruka: '6 měsíců',
        max_cena_s_dph: '25000', platba_zpusob: 'cashier'
      }
    }
  };
}

// Placeholder for future API call – currently returns static set.
export async function fetchOrderTemplatesFromApi(token) {
  // In future: const res = await fetch('/api/order-templates', { headers:{ Authorization:`Bearer ${token}` }});
  // return await res.json();
  return getStaticOrderTemplates();
}
