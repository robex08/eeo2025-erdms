// Helper to build snake_case DB payload slices. Extracted from OrderFormComponent, behavior preserved.

export function buildDbShape(fd) {
  if (!fd) return {};
  const isPokladna = fd.zdroj_financovani === 'Pokladna' || fd.paymentMethod === 'cashier';
  const centersArray = Array.isArray(fd.strediska) ? fd.strediska : [];
  const conf = Array.isArray(fd.confirmationMethods) ? fd.confirmationMethods : [];
  const potvrzeno_zpusob = {
    email: conf.includes('email'),
    telefon: conf.includes('phone'),
    podepsany_form: conf.includes('signedForm'),
    eshop: conf.includes('eShop')
  };
  const items = (() => {
    const strip = (v) => v != null ? String(v).replace(/\s+/g,'') : '';
    if (isPokladna) {
      const arr = Array.isArray(fd.polozky) ? fd.polozky : (Array.isArray(fd.items) ? fd.items : []);
      return arr.map(it => ({
        id: it.id || undefined,
        popis: it.popis || it.description || '',
        cena_bez_dph: strip(it.cena_bez_dph),
        sazba_dph: it.sazba_dph != null ? it.sazba_dph : 21,
        cena_s_dph: strip(it.cena_s_dph)
      }));
    }
    // Non-Pokladna: always send a single synthetic item from aggregate details
    const desc = fd.description || fd.popis || '';
    const cenaBez = strip(fd.cena_bez_dph || fd.priceExclVat);
    const sazba = fd.sazba_dph != null ? fd.sazba_dph : (fd.vatRate != null ? fd.vatRate : 21);
    const cenaSDph = strip(fd.cena_s_dph || fd.priceInclVat);
    return [{ popis: desc, cena_bez_dph: cenaBez, sazba_dph: sazba, cena_s_dph: cenaSDph }];
  })();
  // Attachments - mapování podle DB struktury 25_objednavky_prilohy
  const attachments = (fd.prilohy || fd.attachments || []).map(a => ({
    id: a.id || undefined,
    guid: a.guid || '',
    typ_prilohy: a.type || a.typ_prilohy || '',
    originalni_nazev_souboru: a.originalName || a.originalni_nazev_souboru || '',
    systemova_cesta: a.generatedName || a.systemova_cesta || '',
    velikost_souboru_b: (a.file && a.file.size) || a.velikost_souboru_b || null,
    nahrano_uzivatel_id: a.createdBy || a.nahrano_uzivatel_id || null,
    dt_vytvoreni: a.createdAt || a.dt_vytvoreni || null
  }));
  const shape = {
    id: fd.id || undefined,
    cislo_objednavky: fd.cislo_objednavky || fd.navrhovane_cislo_objednavky || '',
    navrhovane_cislo_objednavky: fd.navrhovane_cislo_objednavky || '',
    datum_objednavky: fd.datum_objednavky || null,
    predmet: fd.predmet || '',
    strediska: centersArray.join(','),
    prikazce_id: fd.prikazce_id || fd.po_kod || fd.po || '', // primary canonical key for DB
    max_cena_s_dph: fd.max_cena_s_dph != null ? String(fd.max_cena_s_dph).replace(/\s+/g,'') : '',
    zdroj_financovani: fd.zdroj_financovani || '',
    druh_objednavky: fd.druh_objednavky || '',
    stav_id: fd.stav_id != null ? fd.stav_id : null,
    stav_komentar: fd.stav_komentar || '',
    schvalil_uzivatel_id: fd.schvalil_uzivatel_id || null,
    datum_schvaleni: fd.datum_schvaleni || null,
    objednatel_id: fd.objednatel_id || '',
    garant_uzivatel_id: fd.garant_uzivatel_id || '',
  dodavatel_id: isPokladna ? null : (fd.dodavatel_id || null),
  dodavatel_nazev: isPokladna ? '' : (fd.dodavatel_nazev || ''),
  dodavatel_adresa: isPokladna ? '' : (fd.dodavatel_adresa || ''),
  dodavatel_ico: isPokladna ? '' : (fd.dodavatel_ico || ''),
  dodavatel_dic: isPokladna ? '' : (fd.dodavatel_dic || ''),
  dodavatel_zastoupeny: isPokladna ? '' : (fd.dodavatel_zastoupeny || ''),
  dodavatel_kontakt_jmeno: isPokladna ? '' : (fd.dodavatel_kontakt_jmeno || ''),
  dodavatel_kontakt_email: isPokladna ? '' : (fd.dodavatel_kontakt_email || ''),
  dodavatel_kontakt_telefon: isPokladna ? '' : (fd.dodavatel_kontakt_telefon || ''),
  predpokladany_termin_dodani: isPokladna ? null : (fd.predpokladany_termin_dodani || null),
  misto_dodani: isPokladna ? '' : (fd.misto_dodani || ''),
  zaruka: isPokladna ? '' : (fd.zaruka || ''),
    stav_odeslano: (() => {
      // Mapování sentStatus na číselné hodnoty pro DB
      if (fd.sentStatus === 'odeslano') return 1;
      if (fd.sentStatus === 'stornovano') return 0;
      // Fallback na existující hodnotu nebo default 0
      return fd.stav_odeslano != null ? fd.stav_odeslano : 0;
    })(),
    datum_odeslani: fd.sentStatusDate || fd.datum_odeslani || null,
    potvrzeno_dodavatelem: (fd.orderConfirmed === true || fd.potvrzeno_dodavatelem === 1) ? 1 : 0,
    potvrzeno_zpusob,
    datum_akceptace: fd.acceptanceDate || fd.datum_akceptace || null,
    zpusob_platby: (() => {
      const method = fd.platba_zpusob || fd.paymentMethod || '';
      return {
        faktura: method === 'invoice',
        pokladna: method === 'cashier',
        typ: method === 'invoice' ? 'faktura' : (method === 'cashier' ? 'pokladna' : '')
      };
    })(),
    zverejnit_registr_smluv: fd.registryContract ? 1 : (fd.zverejnit_registr_smluv ? 1 : 0),
    datum_zverejneni: fd.publishDate || fd.datum_zverejneni || null,
    registr_smluv_id: fd.identifier || fd.registr_smluv_id || null,
    financovani_dodatek: (() => {
      const type = fd.zdroj_financovani;
      try {
        let obj = null;
        if (type === 'Smlouva') {
          obj = {
            cislo_smlouvy: fd.cislo_smlouvy || fd.contractNumber || '',
            poznamka: fd.smlouva_poznamka || fd.contractNote || ''
          };
        } else if (type === 'Individuální schválení') {
          obj = {
            individualni_schvaleni: fd.individualni_schvaleni || fd.individualApproval || '',
            poznamka: fd.individualni_poznamka || ''
          };
        } else if (type === 'Pojistná událost') {
          obj = {
            pojistna_udalost_cislo: fd.pojistna_udalost_cislo || fd.insuranceEventNumber || '',
            poznamka: fd.pojistna_udalost_poznamka || fd.insuranceNote || ''
          };
        } else if (type === 'LP' || type === 'Limitovaný příslib') {
          const lpValue = Array.isArray(fd.lp_kod) ? fd.lp_kod.join(',') : (fd.lp_kod || fd.lpCode || '');
          obj = { lp_kod: lpValue };
        }
        if (obj) {
          const pruned = Object.fromEntries(Object.entries(obj).filter(([_,v]) => v != null && String(v).trim() !== ''));
          if (Object.keys(pruned).length === 0) return null;
          return pruned;
        }
      } catch (_) {}
      return null;
    })(),
    poznamka: fd.poznamka || '',
    objednatel_kontakt: (() => {
      const name = fd.purchaserContactName || (fd.purchaser && fd.purchaser.contactPerson && fd.purchaser.contactPerson.name) || '';
      const email = fd.purchaserContactEmail || (fd.purchaser && fd.purchaser.contactPerson && fd.purchaser.contactPerson.email) || '';
      const phone = fd.purchaserContactPhone || (fd.purchaser && fd.purchaser.contactPerson && fd.purchaser.contactPerson.phone) || '';
      if (!name && !email && !phone) return null;
      return { jmeno: name, email, telefon: phone };
    })(),
    dt_vytvoreni: fd.dt_vytvoreni || null,
    dt_aktualizace: fd.dt_aktualizace || null,
    __items: items,
    __attachments: attachments
  };
  if (shape.potvrzeno_zpusob && !Object.values(shape.potvrzeno_zpusob).some(Boolean)) {
    delete shape.potvrzeno_zpusob;
  }
  delete shape.platba_faktura;
  delete shape.platba_pokladna;
  delete shape.potvrzeni_email;
  delete shape.potvrzeni_telefon;
  delete shape.potvrzeni_podepsany_form;
  delete shape.potvrzeni_eshop;
  delete shape.purchaser;
  delete shape.purchaserUserId;
  return shape;
}
