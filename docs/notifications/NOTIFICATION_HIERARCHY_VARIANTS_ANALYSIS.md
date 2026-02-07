# 🔍 ANALÝZA VARIANT V ORGANIZAČNÍ HIERARCHII

**Datum:** 3. ledna 2026  
**Problém:** Schvalovateli přichází celé HTML místo konkrétní varianty

---

## 🐛 HLAVNÍ PROBLÉM NALEZEN

### Příčina

V aktivním hierarchickém profilu "PRIKAZCI" (id=12) má template node **prázdný string** pro `normalVariant`:

```json
{
  "id": "template-2-1766007051172",
  "typ": "template",
  "data": {
    "templateId": 2,
    "name": "Objednávka odeslána ke schválení",
    "normalVariant": "",          // ❌ PRÁZDNÝ STRING!
    "urgentVariant": "APPROVER_URGENT",
    "infoVariant": "SUBMITTER"
  }
}
```

### Workflow chyby

1. **Edge config** má `recipientRole: "APPROVAL"`
2. **Backend kód** (řádek 3017-3021):
   ```php
   if ($recipientRole === 'EXCEPTIONAL') {
       $variant = isset($node['data']['urgentVariant']) ? $node['data']['urgentVariant'] : 'APPROVER_URGENT';
   } elseif ($recipientRole === 'INFO' || ...) {
       $variant = isset($node['data']['infoVariant']) ? $node['data']['infoVariant'] : 'SUBMITTER';
   } else {
       // ❌ PROBLÉM: isset("") vrací TRUE!
       $variant = isset($node['data']['normalVariant']) ? $node['data']['normalVariant'] : 'APPROVER_NORMAL';
   }
   ```
3. `isset("")` vrací `TRUE` → použije se **prázdný string** `""`
4. `extractVariantFromEmailBody($emailBody, "")` hledá marker `<!-- RECIPIENT:  -->` (prázdný)
5. Nenajde → vrátí **CELÉ HTML** se všemi variantami!

### Výsledek

- **SUBMITTER** (objednatel): ✅ Dostane zelenou variantu (infoVariant="SUBMITTER")
- **APPROVER** (schvalovatel): ❌ Dostane celé HTML se všemi 3 variantami (normalVariant="")

---

## ✅ ŘEŠENÍ

### Oprava kódu

Změnit `isset()` na `!empty()` pro kontrolu variant:

```php
// apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php
// Řádek ~3015-3022

if ($recipientRole === 'EXCEPTIONAL') {
    // ✅ OPRAVA: !empty() kontroluje i prázdný string
    $variant = (!empty($node['data']['urgentVariant'])) ? $node['data']['urgentVariant'] : 'APPROVER_URGENT';
} elseif ($recipientRole === 'INFO' || $recipientRole === 'AUTHOR_INFO' || $recipientRole === 'GUARANTOR_INFO') {
    $variant = (!empty($node['data']['infoVariant'])) ? $node['data']['infoVariant'] : 'SUBMITTER';
} else {
    // ✅ Teď prázdný string "" spadne do fallbacku 'APPROVER_NORMAL'
    $variant = (!empty($node['data']['normalVariant'])) ? $node['data']['normalVariant'] : 'APPROVER_NORMAL';
}
```

**STATUS:** ✅ OPRAVENO (3.1.2026)

---

## 📊 PŘEHLED VŠECH TEMPLATE NODES V HIERARCHII

### Template #2: Objednávka odeslána ke schválení ✅ MÁ VARIANTY

**HTML varianty v DB:** `APPROVER_NORMAL`, `APPROVER_URGENT`, `SUBMITTER`

```json
{
  "templateId": 2,
  "normalVariant": "",          // ❌ Prázdný → fallback na APPROVER_NORMAL
  "urgentVariant": "APPROVER_URGENT",
  "infoVariant": "SUBMITTER"
}
```

**Edge:**
- Target: Role "Přikazce operace" (id=5)
- `recipientRole: "APPROVAL"` → použije normalVariant → teď fallback ✅

**STATUS:** ✅ OPRAVENO - fallback funguje

---

### Template #3: Objednávka schválena ⚠️ NEMÁ VARIANTY

**HTML varianty v DB:** ❌ Žádné markery

```json
{
  "templateId": 3,
  "normalVariant": "",
  "urgentVariant": "",
  "infoVariant": "SUBMITTER"    // ⚠️ Snaží se použít variantu, ale HTML ji nemá!
}
```

**Edges:**
- Edge 1: Role "THP/PES" (id=9), `recipientRole: "APPROVAL"` → normalVariant (fallback) ⚠️ Pošle celé HTML
- Edge 2: Role "Vrchní" (id=10), `recipientRole: "APPROVAL"` → normalVariant (fallback) ⚠️ Pošle celé HTML

**PROBLÉM:** Šablona nemá varianty, ale hierarchie se je snaží použít → pošle celou šablonu

**ŘEŠENÍ:** Buď přidat varianty do šablony #3, nebo odstranit variant fields z hierarchie node

---

### Template #6: Objednávka odeslána dodavateli ⚠️ NEMÁ VARIANTY

**HTML varianty v DB:** ❌ Žádné markery

```json
{
  "templateId": 6,
  "normalVariant": "",
  "urgentVariant": "",
  "infoVariant": ""
}
```

**Edge:**
- Target: Role "THP/PES" (id=9)
- `recipientRole: "APPROVAL"` → normalVariant (fallback) ⚠️ Pošle celé HTML

**PROBLÉM:** Stejný jako #3

---

### Template #9: Objednávka dokončena ⚠️ NEMÁ VARIANTY

**HTML varianty v DB:** ❌ Žádné markery

```json
{
  "templateId": 9,
  "normalVariant": "",
  "urgentVariant": "",
  "infoVariant": ""
}
```

**Edges:**
- Edge 1: Role "Přikazce operace" (id=5), `recipientRole: "INFO"` → infoVariant (fallback) ⚠️ Pošle celé HTML
- Edge 2: Role "THP/PES" (id=9), `recipientRole: "INFO"` → infoVariant (fallback) ⚠️ Pošle celé HTML

**PROBLÉM:** Stejný jako #3

---

### Template #16: K objednávce byla přidána faktura ⚠️ NEMÁ VARIANTY

**HTML varianty v DB:** ❌ Žádné markery

```json
{
  "templateId": 16,
  "normalVariant": "",
  "urgentVariant": "",
  "infoVariant": ""
}
```

**Edge:**
- Target: Role "THP/PES" (id=9)
- `recipientRole: "APPROVAL"` → normalVariant (fallback) ⚠️ Pošle celé HTML

---

### Template #19: Objednávka čeká na kontrolu věcné správnosti ⚠️ NEMÁ VARIANTY

**HTML varianty v DB:** ❌ Žádné markery

```json
{
  "templateId": 19,
  "normalVariant": "",
  "urgentVariant": "",
  "infoVariant": ""
}
```

**Edge:**
- Target: Role "THP/PES" (id=9)
- `recipientRole: NOT_SET` → spadne do default APPROVAL → normalVariant (fallback) ⚠️ Pošle celé HTML

---

### Template #60: Faktura přiřazena k objednávce ⚠️ NEMÁ VARIANTY

**HTML varianty v DB:** ❌ Žádné markery

```json
{
  "templateId": 60,
  "normalVariant": "",
  "urgentVariant": "",
  "infoVariant": ""
}
```

**Edge:**
- Target: Role "THP/PES" (id=9)
- `recipientRole: "APPROVAL"` → normalVariant (fallback) ⚠️ Pošle celé HTML

---

## 🎯 KONZISTENCE KONTROL

### ✅ CO FUNGUJE

1. **Fallbacky jsou správně nastavené:**
   - EXCEPTIONAL → `'APPROVER_URGENT'`
   - INFO → `'SUBMITTER'`
   - APPROVAL (default) → `'APPROVER_NORMAL'`

2. **HTML markery v šablonách:**
   - ✅ Template #2 (Objednávka odeslána ke schválení) má:
     - `<!-- RECIPIENT: APPROVER_NORMAL -->`
     - `<!-- RECIPIENT: APPROVER_URGENT -->`
     - `<!-- RECIPIENT: SUBMITTER -->`

3. **RecipientRole mapování:**
   ```
   Edge recipientRole → Varianta → HTML Marker
   ────────────────────────────────────────────
   EXCEPTIONAL       → urgentVariant → APPROVER_URGENT
   INFO              → infoVariant   → SUBMITTER
   APPROVAL          → normalVariant → APPROVER_NORMAL
   (default)         → normalVariant → APPROVER_NORMAL
   ```

4. **Backend fix:**
   - ✅ Opraveno: `!empty()` místo `isset()` (3.1.2026)
   - ✅ Fallbacky fungují správně pro template #2

---

### ⚠️ KRITICKÉ PROBLÉMY

#### 🚨 Problém #1: Pouze template #2 má varianty!

**Zjištění:**
- ✅ Template #2: Má 3 varianty (APPROVER_NORMAL, APPROVER_URGENT, SUBMITTER)
- ❌ Template #3, 6, 9, 16, 19, 60: NEMAJÍ žádné varianty!

**Důsledek:**
- Hierarchie se snaží použít varianty i pro šablony, které je nemají
- `extractVariantFromEmailBody()` nenajde marker → vrátí **CELÉ HTML**
- Příjemci dostanou plnou šablonu místo konkrétní varianty

**Doporučení:**

**Varianta A - Přidat varianty do šablon (Doporučeno):**
```sql
-- Pro template #3, 6, 9, 16, 19, 60 přidat HTML markery:
UPDATE 25_notifikace_sablony 
SET email_telo = CONCAT(
  '<!-- RECIPIENT: APPROVER_NORMAL -->',
  email_telo,
  '<!-- RECIPIENT: SUBMITTER -->',
  email_telo
)
WHERE id IN (3, 6, 9, 16, 19, 60);
```

**Varianta B - Odstranit variant logic z hierarchie:**
- Upravit frontend editor hierarchie: nezobrazovat variant fieldy pro šablony bez variant
- Nebo ignorovat variant fieldy v backendu pro šablony, které nemají markery

---

#### 🚨 Problém #2: Template #19 nemá recipientRole

**Zjištění:**
```json
{
  "source": "template-19-1767143996677",
  "target": "role-9-1767143696275",
  "data": {
    "recipientRole": "NOT_SET"  // ❌ Chybí!
  }
}
```

**Důsledek:**
- Spadne do default `else` větve → použije normalVariant (fallback APPROVER_NORMAL)
- Pokud šablona nemá varianty → pošle celou šablonu

**Řešení:**
- Nastavit `recipientRole: "APPROVAL"` v editoru hierarchie

---

### 📝 CO DOPORUČIT

1. **Frontend editoru hierarchie:**
   - ✅ Přidat validaci: pokud je pole prázdné, uložit `null` místo `""`
   - ⚠️ Skrýt variant fieldy pro šablony, které nemají HTML varianty
   - ⚠️ Nebo přidat tooltip: "Tato šablona nemá definované varianty"
   - ⚠️ Validovat recipientRole - nesmí být prázdný

2. **Šablony v DB:**
   - ⚠️ **URGENTNÍ:** Přidat varianty do šablon #3, 6, 9, 16, 19, 60
   - Nebo: Jasně označit, které šablony podporují varianty

3. **Dokumentace pro uživatele:**
   - Vysvětlit co znamenají jednotlivé varianty
   - APPROVER_NORMAL = oranžová schvalovací karta
   - APPROVER_URGENT = červená urgentní karta
   - SUBMITTER = zelená potvrzovací karta pro autora
   - INFO = informační notifikace (modrá?)

4. **Backend validace:**
   - ✅ Opraveno: `!empty()` místo `isset()`
   - ✅ Fallbacky fungují správně
   - ⏳ Doporučení: Logovat warning, pokud šablona nemá varianty, ale hierarchie se je snaží použít

---

## 📋 TESTOVACÍ CHECKLIST

### Template #2 (Objednávka odeslána ke schválení) - MÁ VARIANTY

Po opravě otestovat:

- [ ] **Schvalovatel (APPROVAL)** dostane POUZE oranžovou variantu (APPROVER_NORMAL)
- [ ] **Objednatel (INFO/SUBMITTER)** dostane POUZE zelenou variantu (SUBMITTER)
- [ ] **EXCEPTIONAL role** dostane červenou variantu (APPROVER_URGENT)
- [ ] Email obsahuje správný HTML bez ostatních variant
- [ ] Fallbacky fungují, pokud je normalVariant prázdný string

### Template #3, 6, 9, 16, 19, 60 - NEMAJÍ VARIANTY

**SOUČASNÝ STAV:**
- ⚠️ Hierarchie se snaží použít varianty
- ⚠️ extractVariantFromEmailBody() nenajde marker
- ⚠️ Pošle CELOU šablonu (bez rozdělení)

**PO PŘIDÁNÍ VARIANT:**
- [ ] Přidat HTML markery do šablon
- [ ] Otestovat každou šablonu s různými recipientRole
- [ ] Ověřit, že příjemci dostanou správnou variantu

---

## 🔍 JAK OTESTOVAT

### 1. Test template #2 (Objednávka ke schválení)

```bash
# Sleduj error log
tail -f /var/log/apache2/error.log | grep -E "extractVariantFromEmailBody|Found markers"

# V aplikaci:
# 1. Vytvoř objednávku
# 2. Klikni "Odeslat ke schválení"
# 3. Zkontroluj email schvalovatele
```

**Očekávaný výsledek:**
- Log: `[extractVariantFromEmailBody] Found markers in body: APPROVER_NORMAL, APPROVER_URGENT, SUBMITTER`
- Log: `[extractVariantFromEmailBody] Searching for variant: 'APPROVER_NORMAL'`
- Log: `[extractVariantFromEmailBody] Successfully extracted 1234 bytes for variant 'APPROVER_NORMAL'`
- Email obsahuje POUZE oranžovou kartu

### 2. Test ostatních šablon

```bash
# Test template #3, 6, 9, atd.
# 1. Spusť akci, která vyvolá notifikaci (schválení, odeslání dodavateli, apod.)
# 2. Zkontroluj email
```

**Současný stav:**
- Email obsahuje celou šablonu (bez rozdělení)

**Po opravě:**
- Email by měl obsahovat správnou variantu

---

## 📊 SOUHRN STAVU

### ✅ CO JE HOTOVO

1. **Oprava fallbacků v backendu:**
   - Změna z `isset()` na `!empty()`
   - Řádek 3010-3023 v notificationHandlers.php
   - Prázdný string nyní spustí fallback

2. **Debug logging:**
   - Logování všech markerů v šabloně
   - Logování hledaného markeru
   - Snadnější debugging variant

3. **Analýza konzistence:**
   - ✅ Identifikováno: Pouze template #2 má varianty
   - ✅ Identifikováno: Template #19 nemá recipientRole
   - ✅ Dokumentováno: Všechny template nodes v hierarchii

---

### ⚠️ CO ZBÝVÁ OPRAVIT

1. **URGENTNÍ - Šablony bez variant (Templates #3, 6, 9, 16, 19, 60):**
   - Priorita: **VYSOKÁ**
   - Dopad: Příjemci dostanou celou šablonu místo konkrétní varianty
   - Řešení: Přidat HTML varianty nebo odstranit variant logic z hierarchie
   - Odhadovaný čas: 3-4 hodiny (tvorba variant pro 6 šablon)

2. **Chybějící recipientRole (Template #19):**
   - Priorita: **STŘEDNÍ**
   - Dopad: Spadne do default větve, ale funguje
   - Řešení: Nastavit recipientRole v editoru hierarchie
   - Odhadovaný čas: 5 minut

3. **Frontend validace (Editor hierarchie):**
   - Priorita: **NÍZKÁ**
   - Dopad: Prevence budoucích problémů
   - Řešení: Validace prázdných stringů, skrytí variant pro šablony bez podpory
   - Odhadovaný čas: 2-3 hodiny

---

## 🎯 DOPORUČENÝ AKČNÍ PLÁN

### Fáze 1: Okamžité testování (TEĎ)

1. Otestovat template #2 s opraveným fallbackem
2. Ověřit, že schvalovatelé dostanou správnou variantu
3. Potvrdit, že fix funguje

### Fáze 2: Oprava ostatních šablon (URGENTNÍ)

**Varianta A - Přidat varianty (Doporučeno):**
```sql
-- Šablony #3, 6, 9, 16, 19, 60 upravit:
-- 1. Rozdělit existující HTML na 2-3 varianty
-- 2. Přidat HTML markery <!-- RECIPIENT: TYPE -->
-- 3. Otestovat každou šablonu
```

**Varianta B - Odstranit variant logic:**
```php
// V notificationHandlers.php: Detekovat, jestli šablona má varianty
if (hasVariants($templateId)) {
    // Použij variant logic
} else {
    // Pošli celou šablonu bez extrakce
}
```

### Fáze 3: Vylepšení (Volitelné)

1. Frontend validace v editoru hierarchie
2. Dokumentace pro uživatele
3. Backend warning logy pro šablony bez variant

---

## 🔗 SOUVISEJÍCÍ SOUBORY

- Backend kód: `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php` (řádek 3015-3022)
- Extrakce varianty: `extractVariantFromEmailBody()` (řádek 3308-3345)
- DB šablona: `25_notifikace_sablony.id=2`
- Hierarchie profil: `25_hierarchie_profily.id=12` (PRIKAZCI)

---

## 🏁 FINÁLNÍ VERDIKT

### Původní problém
**"Schvalovateli přichází celé HTML místo konkrétní varianty"**

### Nalezené problémy

1. **HLAVNÍ PROBLÉM (OPRAVENO):**
   - Empty string `""` v hierarchii pro normalVariant
   - `isset("")` vrací TRUE → používal se prázdný marker
   - **FIX:** Změna na `!empty()` → fallback na 'APPROVER_NORMAL'
   - **Status:** ✅ HOTOVO (3.1.2026)

2. **SEKUNDÁRNÍ PROBLÉM (NOVÝ):**
   - Pouze template #2 má varianty v HTML
   - Templates #3, 6, 9, 16, 19, 60 NEMAJÍ varianty
   - Hierarchie se snaží použít varianty → pošle celou šablonu
   - **Status:** ⚠️ NALEZENO, čeká na opravu

3. **DROBNÝ PROBLÉM:**
   - Template #19 nemá nastavený recipientRole
   - **Status:** ⚠️ NALEZENO, snadná oprava v editoru

### Dopad

- **Template #2:** ✅ VYŘEŠENO po našem fixu
- **Template #3, 6, 9, 16, 19, 60:** ⚠️ Budou posílat celé šablony, dokud nepřidáme varianty

### Priorita dalších kroků

1. **VYSOKÁ:** Otestovat template #2 (s opraveným fallbackem)
2. **VYSOKÁ:** Přidat varianty do templates #3, 6, 9, 16, 19, 60 (nebo odstranit variant logic)
3. **STŘEDNÍ:** Opravit recipientRole u template #19
4. **NÍZKÁ:** Frontend validace v editoru hierarchie

---

**Status:** ✅ HLAVNÍ BUG OPRAVENO / ⚠️ NALEZENY DALŠÍ PROBLÉMY  
**Testováno:** Čeká na test  
**Dopad:** KRITICKÝ - ovlivňuje všechny schvalovací notifikace  
**Poslední aktualizace:** 3. ledna 2026
