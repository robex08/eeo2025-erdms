# 🔧 Backend TODO: Vypočítané proměnné pro DOCX

## 📍 Endpoint k úpravě
```
POST /api.eeo/sablona_docx/order-data
```

## 🎯 Co je třeba udělat

Přidat do response nový objekt `vypocitane` s 8 poli.

**DŮLEŽITÉ**: Request musí obsahovat:
- `vybrany_uzivatel_id` - ID uživatele vybraného před generováním
- `vybrany_uzivatel_typ` - Typ/role uživatele (`"garant"`, `"prikazce"`, `"schvalovatel"`, atd.)

Backend podle typu pozná, odkud má uživatele načíst!

## 📦 Stávající response (zjednodušeně)
```json
{
  "status": "ok",
  "data": {
    "cislo_objednavky": "O-1741/...",
    "nazev_objednavky": "...",
    "objednatel": { ... },
    "dodavatel": { ... },
    "polozky": [
      {
        "nazev": "Notebook Dell",
        "mnozstvi": 5,
        "jednotkova_cena": 25000.00,
        "celkova_cena_bez_dph": 125000.00,
        "celkova_cena_s_dph": 151250.00,
        ...
      }
    ],
    "prilohy": [ ... ]
  }
}
```

## ✅ Nová response (přidat)
```json
{
  "status": "ok",
  "data": {
    "cislo_objednavky": "O-1741/...",
    "nazev_objednavky": "...",
    "objednatel": { ... },
    "dodavatel": { ... },
    "polozky": [ ... ],
    "prilohy": [ ... ],
    
    "vypocitane": {
      "celkova_cena_bez_dph": "125 000.00 Kč",
      "celkova_cena_s_dph": "151 250.00 Kč",
      "vypoctene_dph": "26 250.00 Kč",
      "pocet_polozek": 5,
      "pocet_priloh": 3,
      "datum_generovani": "05.11.2025",
      "cas_generovani": "14:23",
      "datum_cas_generovani": "05.11.2025 14:23",
      "vybrany_uzivatel_cele_jmeno": "Ing. Jan Novák, Ph.D."
    }
  }
}
```

## 🧮 Výpočty (pseudokód)

```python
# 1. Součet cen z položek
celkova_cena_bez_dph = sum(polozka.celkova_cena_bez_dph for polozka in polozky)
celkova_cena_s_dph = sum(polozka.celkova_cena_s_dph for polozka in polozky)

# 2. Vypočítané DPH
vypoctene_dph = celkova_cena_s_dph - celkova_cena_bez_dph

# 3. Formátování měny (mezera jako tisícový oddělovač, 2 des. místa, s jednotkou Kč)
def format_currency(value):
    return f"{value:,.2f}".replace(",", " ") + " Kč"

# 4. Načtení celého jména vybraného uživatele (přijde v requestu)
vybrany_uzivatel_id = request.data.get('vybrany_uzivatel_id')  # ID libovolného uživatele
uzivatel = User.objects.get(id=vybrany_uzivatel_id)
vybrany_uzivatel_cele_jmeno = f"{uzivatel.titul_pred} {uzivatel.jmeno} {uzivatel.prijmeni}{', ' + uzivatel.titul_za if uzivatel.titul_za else ''}"

vypocitane = {
    # Měna (všechno s jednotkou Kč)
    "celkova_cena_bez_dph": format_currency(celkova_cena_bez_dph),
    "celkova_cena_s_dph": format_currency(celkova_cena_s_dph),
    "vypoctene_dph": format_currency(vypoctene_dph),
    
    # Statistiky
    "pocet_polozek": len(polozky),
    "pocet_priloh": len(prilohy),
    
    # Datum a čas (aktuální při generování)
    "datum_generovani": datetime.now().strftime("%d.%m.%Y"),
    "cas_generovani": datetime.now().strftime("%H:%M"),
    "datum_cas_generovani": datetime.now().strftime("%d.%m.%Y %H:%M"),
    
    # Vybraný uživatel (celé jméno včetně titulů) - může být garant, přikazce, schvalovatel, atd.
    "vybrany_uzivatel_cele_jmeno": vybrany_uzivatel_cele_jmeno
}
```

## 📋 Specifikace polí

| Pole | Typ | Formát | Příklad |
|------|-----|--------|---------|
| `celkova_cena_bez_dph` | string | "1 234.56 Kč" | "125 000.00 Kč" |
| `celkova_cena_s_dph` | string | "1 234.56 Kč" | "151 250.00 Kč" |
| `vypoctene_dph` | string | "1 234.56 Kč" | "26 250.00 Kč" |
| `pocet_polozek` | number | 123 | 5 |
| `pocet_priloh` | number | 123 | 3 |
| `datum_generovani` | string | "DD.MM.YYYY" | "05.11.2025" |
| `cas_generovani` | string | "HH:MM" | "14:23" |
| `datum_cas_generovani` | string | "DD.MM.YYYY HH:MM" | "05.11.2025 14:23" |
| `vybrany_uzivatel_cele_jmeno` | string | "Titul Jméno Příjmení, Titul" | "Ing. Jan Novák, Ph.D." |

## ⚠️ Důležité poznámky

### Formát měny
```python
# ✅ SPRÁVNĚ
"125 000.00 Kč"    # Mezera jako tisícový oddělovač, s jednotkou
"1 234 567.89 Kč"  # Tečka jako des. oddělovač, s jednotkou

# ❌ ŠPATNĚ
"125,000.00 Kč"    # Čárka místo mezery
"125000.00 Kč"     # Bez tisícového oddělovače
"125 000,00 Kč"    # Čárka jako des. oddělovač
"125 000.00"       # Bez jednotky Kč
```

### Formát data
```python
# ✅ SPRÁVNĚ
"05.11.2025"    # DD.MM.YYYY (bez mezer)

# ❌ ŠPATNĚ
"5.11.2025"     # Chybí nula
"05. 11. 2025"  # Mezery za tečkou
"2025-11-05"    # ISO formát
```

### Formát času
```python
# ✅ SPRÁVNĚ
"14:23"         # HH:MM (24h formát)
"09:05"         # S nulou na začátku

# ❌ ŠPATNĚ
"2:23 PM"       # AM/PM formát
"14:23:45"      # Se sekundami
```

### Formát jména vybraného uživatele
```python
# ✅ SPRÁVNĚ
"Ing. Jan Novák, Ph.D."     # S tituly před i za
"Jan Novák"                  # Bez titulů
"MUDr. Petra Svobodová"     # Pouze titul před

# ❌ ŠPATNĚ
"Novák Jan"                  # Obrácené pořadí
"Jan"                        # Pouze jméno
"ing. jan novak"            # Malá písmena
```

**POZNÁMKA**: Uživatel si před generováním šablony vybere, koho chce dosadit:
- Může to být garant
- Může to být přikazce
- Může to být schvalovatel
- Může to být kdokoliv jiný z DB
- Frontend pošle pouze ID, backend doplní celé jméno

## 🧪 Testovací data

### Vstup (položky objednávky + vybraný uživatel)
```json
{
  "vybrany_uzivatel_id": 42,
  "polozky": [
    {
      "celkova_cena_bez_dph": 25000.00,
      "celkova_cena_s_dph": 30250.00
    },
    {
      "celkova_cena_bez_dph": 100000.00,
      "celkova_cena_s_dph": 121000.00
    }
  ],
  "prilohy": [{}, {}, {}]
}
```

**Poznámka k `vybrany_uzivatel_id`**:
- Uživatel si před generováním vybere z listboxu, koho chce dosadit
- Může vybrat garanta, přikazce, schvalovatele, nebo kohokoli jiného
- Frontend pošle pouze ID, backend doplní celé jméno s tituly

### Očekávaný výstup
```json
{
  "vypocitane": {
    "celkova_cena_bez_dph": "125 000.00 Kč",
    "celkova_cena_s_dph": "151 250.00 Kč",
    "vypoctene_dph": "26 250.00 Kč",
    "pocet_polozek": 2,
    "pocet_priloh": 3,
    "datum_generovani": "05.11.2025",
    "cas_generovani": "14:23",
    "datum_cas_generovani": "05.11.2025 14:23",
    "vybrany_uzivatel_cele_jmeno": "Ing. Jan Novák, Ph.D."
  }
}
```

## 🎯 Proč to potřebujeme

1. **DOCX šablony**: Uživatel si v Word šabloně napíše `{{vypocitane.celkova_cena_s_dph}}` a při generování se tam doplní "151 250.00 Kč"

2. **Vybraný uživatel**: Před generováním si uživatel vybere libovolného uživatele z listboxu (garant, přikazce, schvalovatel, atd.) → jeho celé jméno (včetně titulů) se dosadí do šablony jako `{{vypocitane.vybrany_uzivatel_cele_jmeno}}`

3. **Flexibilita**: Není předem dané, že to bude garant nebo přikazce - uživatel si dynamicky vybírá před každým generováním

4. **Mapování**: Tato pole se musí objevit v modal dialogu pro mapování, aby si je uživatel mohl namapovat

5. **Automatizace**: Nemusí počítat ručně v šabloně, všechno je připravené

## 📝 Implementace v Pythonu (Django/Flask)

```python
from datetime import datetime
from decimal import Decimal

def calculate_order_totals(order, vybrany_uzivatel_id):
    """Vypočítá součty pro objednávku a načte celé jméno vybraného uživatele"""
    
    # Načti položky
    polozky = order.polozky.all()
    
    # Součty
    celkova_bez_dph = sum(p.celkova_cena_bez_dph or Decimal('0') for p in polozky)
    celkova_s_dph = sum(p.celkova_cena_s_dph or Decimal('0') for p in polozky)
    dph = celkova_s_dph - celkova_bez_dph
    
    # Formátování
    def format_cz_currency(value):
        """Formátuje měnu s mezerou jako tisícovým oddělovačem a jednotkou Kč"""
        return f"{value:,.2f}".replace(',', ' ') + " Kč"
    
    # Načtení celého jména vybraného uživatele
    # Může to být garant, přikazce, schvalovatel, nebo kdokoliv jiný
    uzivatel = User.objects.get(id=vybrany_uzivatel_id)
    titul_pred = f"{uzivatel.titul_pred} " if uzivatel.titul_pred else ""
    titul_za = f", {uzivatel.titul_za}" if uzivatel.titul_za else ""
    cele_jmeno = f"{titul_pred}{uzivatel.jmeno} {uzivatel.prijmeni}{titul_za}"
    
    # Aktuální čas
    now = datetime.now()
    
    return {
        'celkova_cena_bez_dph': format_cz_currency(celkova_bez_dph),
        'celkova_cena_s_dph': format_cz_currency(celkova_s_dph),
        'vypoctene_dph': format_cz_currency(dph),
        'pocet_polozek': polozky.count(),
        'pocet_priloh': order.prilohy.count(),
        'datum_generovani': now.strftime('%d.%m.%Y'),
        'cas_generovani': now.strftime('%H:%M'),
        'datum_cas_generovani': now.strftime('%d.%m.%Y %H:%M'),
        'vybrany_uzivatel_cele_jmeno': cele_jmeno.strip()
    }

# Ve view
def get_order_data_for_docx(request):
    order_id = request.data.get('objednavka_id')
    vybrany_uzivatel_id = request.data.get('vybrany_uzivatel_id')  # ✅ NOVÉ: ID libovolného uživatele z frontendu
    
    if not vybrany_uzivatel_id:
        return Response({'status': 'error', 'message': 'Chybí vybrany_uzivatel_id'}, status=400)
    
    order = Objednavka.objects.get(id=order_id)
    
    # Stávající data
    data = {
        'cislo_objednavky': order.cislo_objednavky,
        'nazev_objednavky': order.nazev,
        'objednatel': { ... },
        'dodavatel': { ... },
        'polozky': [ ... ],
        'prilohy': [ ... ],
        
        # ✅ NOVÉ: Přidat vypočítané hodnoty (včetně celého jména vybraného uživatele)
        'vypocitane': calculate_order_totals(order, vybrany_uzivatel_id)
    }
    
    return Response({'status': 'ok', 'data': data})
```

## ✅ Checklist

- [ ] Přidat parametr `vybrany_uzivatel_id` do request (frontend ho musí poslat!)
- [ ] Přidat validaci: vybrany_uzivatel_id je povinný
- [ ] Přidat objekt `vypocitane` do response
- [ ] Implementovat výpočet součtů z položek
- [ ] Formátovat měnu s mezerou jako tisícovým oddělovačem **+ jednotkou Kč**
- [ ] Formátovat datum jako DD.MM.YYYY (bez mezer)
- [ ] Formátovat čas jako HH:MM (24h)
- [ ] Počítat počet položek a příloh
- [ ] Načíst celé jméno vybraného uživatele (titul_pred + jmeno + prijmeni + titul_za)
- [ ] Otestovat s reálnými daty
- [ ] Ověřit, že pole se zobrazí v DOCX mapování modalu

**POZNÁMKA**: Vybraný uživatel je dynamický - může to být garant, přikazce, schvalovatel, nebo kdokoliv jiný. Rozhoduje se až při generování šablony.

## 📞 Kontakt

V případě nejasností piš do Slacku nebo na mail.

---

**Priorita**: 🔴 Střední  
**Odhadovaný čas**: 1-2 hodiny  
**Datum**: 5. listopadu 2025
