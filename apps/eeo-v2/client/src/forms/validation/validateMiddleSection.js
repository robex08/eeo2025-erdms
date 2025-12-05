import { isNonEmpty } from '../../utils/validators';

// Middle-section validation (Phase 2) unified on snake_case fields.
export function validateMiddleSection(fd, { isPokladna }) {
  const errs = {};
  const req = (cond, key) => { if (!cond) errs[key] = true; };
  // Financing
  req(!!fd.zdroj_financovani, 'zdroj_financovani');
  if (fd.zdroj_financovani === 'LP') req(!!fd.lp_kod, 'lp_kod');
  // Order type always required (Pokladna auto-filled, but still enforce presence)
  req(!!fd.druh_objednavky || (isPokladna && fd.druh_objednavky === 'Drobné nákupy'), 'druh_objednavky');
  // Description / Obsah objednávky required (store error key as 'description' to match textarea id)
  // Pro POKLADNA objednávky není description povinné - používají se jednotlivé položky
  if (!isPokladna) {
    const hasDescription = !!(fd.description && String(fd.description).trim()) || !!(fd.popis && String(fd.popis).trim());
    req(hasDescription, 'description');
  }
  if (!isPokladna) {
    // Supplier core
    req(!!fd.dodavatel_nazev, 'dodavatel_nazev');
    req(!!fd.dodavatel_adresa, 'dodavatel_adresa');
    req(!!fd.dodavatel_ico, 'dodavatel_ico');
    // Order aggregate pricing
    req(!!fd.cena_bez_dph, 'cena_bez_dph');
    req(!!fd.cena_s_dph, 'cena_s_dph');
  } else {
    // Pokladna – itemized
    if (!Array.isArray(fd.polozky) || fd.polozky.length === 0) {
      errs['polozky[0].popis'] = true;
    } else {
      fd.polozky.forEach((it, i) => {
        req(!!it.popis, `polozky[${i}].popis`);
        req(!!it.cena_s_dph, `polozky[${i}].cena_s_dph`);
      });
    }
  }
  // Delivery: v režimu Pokladna nevyžaduj vůbec (irelevantní)
  if (!isPokladna) {
    // optional, ale když je něco z trojice vyplněno, vyžaduj vše
    const anyDelivery = fd.predpokladany_termin_dodani || fd.misto_dodani || fd.zaruka;
    if (anyDelivery) {
      req(!!fd.predpokladany_termin_dodani, 'predpokladany_termin_dodani');
      req(!!fd.misto_dodani, 'misto_dodani');
    }
  }
  return errs;
}
