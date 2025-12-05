# API pro ukládání dat Věcné správnosti a Dokončení objednávky

## 📋 Přehled

Implementace pro **Fázi 7 (Věcná správnost)** a **Fázi 8 (Dokončení objednávky)** včetně automatického workflow managementu.

---

## 🗄️ Databázové sloupce

### FÁZE 7 - Věcná správnost

| Sloupec | Typ | Null | Default | Popis |
|---------|-----|------|---------|-------|
| `vecna_spravnost_umisteni_majetku` | TEXT | YES | NULL | Umístění majetku (volný text) |
| `vecna_spravnost_poznamka` | TEXT | YES | NULL | Poznámka k věcné správnosti |
| `potvrzeni_vecne_spravnosti` | TINYINT(1) | NO | 0 | Checkbox potvrzení (0=NE, 1=ANO) |
| `potvrdil_vecnou_spravnost_id` | INT(10) | YES | NULL | ID uživatele, který potvrdil (auto) |
| `dt_potvrzeni_vecne_spravnosti` | DATETIME | YES | NULL | Datum a čas potvrzení (auto) |

### FÁZE 8 - Dokončení objednávky

| Sloupec | Typ | Null | Default | Popis |
|---------|-----|------|---------|-------|
| `potvrzeni_dokonceni_objednavky` | TINYINT(1) | NO | 0 | Checkbox finálního potvrzení (0=NE, 1=ANO) |
| `dokonceni_poznamka` | TEXT | YES | NULL | Poznámka ke kontrole a dokončení |
| `dokoncil_id` | INT(10) | YES | NULL | ID uživatele, který dokončil (auto) |
| `dt_dokonceni` | DATETIME | YES | NULL | Datum a čas dokončení (auto) |

---

## ⚙️ Frontend implementace

### 1. Inicializace v `initialFormData` (řádek 3780-3790)

```javascript
// Věcná správnost - FÁZE 7
vecna_spravnost_umisteni_majetku: '', // Volné textové pole
vecna_spravnost_poznamka: '', // Poznámka k věcné správnosti
potvrzeni_vecne_spravnosti: 0, // ANO/NE checkbox (0/1)

// Dokončení objednávky - FÁZE 8
potvrzeni_dokonceni_objednavky: 0, // ANO/NE checkbox (0/1) - finální potvrzení
```

### 2. Načítání z DB (řádek 9400-9410)

```javascript
potvrzeni_vecne_spravnosti: dbOrder.potvrzeni_vecne_spravnosti || 0,
vecna_spravnost_umisteni_majetku: dbOrder.vecna_spravnost_umisteni_majetku || '',
vecna_spravnost_poznamka: dbOrder.vecna_spravnost_poznamka || '',
potvrdil_vecnou_spravnost_id: dbOrder.potvrdil_vecnou_spravnost_id || null,
dt_potvrzeni_vecne_spravnosti: dbOrder.dt_potvrzeni_vecne_spravnosti || '',
dokoncil_id: dbOrder.dokoncil_id || null,
dt_dokonceni: dbOrder.dt_dokonceni || '',
dokonceni_poznamka: dbOrder.dokonceni_poznamka || '',
potvrzeni_dokonceni_objednavky: dbOrder.potvrzeni_dokonceni_objednavky || 0,
```

### 3. Ukládání do DB (řádek 6663-6665)

```javascript
// Věcná správnost - FÁZE 7
if (formData.vecna_spravnost_umisteni_majetku) 
  orderData.vecna_spravnost_umisteni_majetku = formData.vecna_spravnost_umisteni_majetku;
if (formData.vecna_spravnost_poznamka) 
  orderData.vecna_spravnost_poznamka = formData.vecna_spravnost_poznamka;
if (formData.potvrzeni_vecne_spravnosti !== undefined) 
  orderData.potvrzeni_vecne_spravnosti = formData.potvrzeni_vecne_spravnosti;
```

### 4. Automatické workflow řízení (řádek 6830-6870)

#### FÁZE 7 - Kontrola věcné správnosti

```javascript
// Pokud je checkbox zaškrtnutý
if (formData.potvrzeni_vecne_spravnosti === 1) {
  // Odebrat KONTROLA - už není potřeba, kontrola je hotová
  workflowStates = workflowStates.filter(s => s !== 'KONTROLA');
  
  // 🆕 Automaticky nastavit ID a datum při prvním potvrzení
  if (!formData.potvrdil_vecnou_spravnost_id) {
    orderData.potvrdil_vecnou_spravnost_id = user_id;
    orderData.dt_potvrzeni_vecne_spravnosti = new Date().toISOString();
  }
} else {
  // Pokud checkbox NENÍ zaškrtnutý, přidat KONTROLA
  if (!workflowStates.includes('KONTROLA')) {
    workflowStates.push('KONTROLA');
  }
}
```

#### FÁZE 8 - Dokončení objednávky

```javascript
// Pokud jsou splněny všechny podmínky
if (formData.potvrzeni_dokonceni_objednavky === 1 && 
    formData.potvrzeni_vecne_spravnosti === 1 && 
    formData.faktury && formData.faktury.length > 0) {
  
  if (!workflowStates.includes('DOKONCENA')) {
    workflowStates.push('DOKONCENA');
  }
  
  // 🆕 Automaticky nastavit ID a datum při prvním potvrzení
  if (!formData.dokoncil_id) {
    orderData.dokoncil_id = user_id;
    orderData.dt_dokonceni = new Date().toISOString();
  }
}
```

---

## 🎨 UI Komponenty (řádek 19400-19900)

### FÁZE 7 - Věcná správnost

```jsx
{/* Grid layout - dva sloupce */}
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
  
  {/* LEVÝ SLOUPEC - OBJEDNÁVKA */}
  <div style={{ border: '2px solid #3b82f6', background: '#eff6ff' }}>
    <h3>📄 OBJEDNÁVKA</h3>
    <div>Max. cena s DPH</div>
    <div>Střediska</div>
    <div>Položky objednávky</div>
  </div>
  
  {/* PRAVÝ SLOUPEC - FAKTURA */}
  <div style={{ border: '2px solid #8b5cf6', background: '#f5f3ff' }}>
    <h3>🧾 FAKTURA</h3>
    <div>Celková cena faktury</div>
    <div>Střediska</div>
    <div>Položky faktury (z ISDOC)</div>
  </div>
</div>

{/* UMÍSTĚNÍ MAJETKU */}
<TextArea
  value={formData.vecna_spravnost_umisteni_majetku || ''}
  onChange={(e) => handleInputChange('vecna_spravnost_umisteni_majetku', e.target.value)}
  placeholder="Volný text o umístění majetku..."
/>

{/* POZNÁMKA */}
<TextArea
  value={formData.vecna_spravnost_poznamka || ''}
  onChange={(e) => handleInputChange('vecna_spravnost_poznamka', e.target.value)}
  placeholder="Volitelná poznámka..."
/>

{/* CHECKBOX POTVRZENÍ */}
<input
  type="checkbox"
  checked={formData.potvrzeni_vecne_spravnosti === 1}
  onChange={(e) => handleInputChange('potvrzeni_vecne_spravnosti', e.target.checked ? 1 : 0)}
/>
✅ Potvrzuji věcnou správnost objednávky
```

---

## 🔄 Workflow diagram

```
FÁZE 6: FAKTURACE
└─> Faktura přidána
    └─> automaticky → stav_workflow_kod: ["...", "FAKTURACE"]
        
FÁZE 7: KONTROLA (Věcná správnost)
└─> Po přidání faktury automaticky
    └─> stav_workflow_kod: ["...", "FAKTURACE", "KONTROLA"]
    └─> Uživatel vyplní:
        ├─> vecna_spravnost_umisteni_majetku (volitelné)
        ├─> vecna_spravnost_poznamka (volitelné)
        └─> potvrzeni_vecne_spravnosti = 1 (POVINNÉ)
            └─> Automaticky nastaví:
                ├─> potvrdil_vecnou_spravnost_id = current_user_id
                ├─> dt_potvrzeni_vecne_spravnosti = NOW()
                └─> odebere "KONTROLA" z workflow
                    
FÁZE 8: DOKONČENÍ
└─> Pokud potvrzeni_vecne_spravnosti === 1
    └─> Uživatel zaškrtne:
        └─> potvrzeni_dokonceni_objednavky = 1
            └─> Automaticky nastaví:
                ├─> dokoncil_id = current_user_id
                ├─> dt_dokonceni = NOW()
                └─> přidá "DOKONCENA" do workflow
                    └─> stav_workflow_kod: ["...", "FAKTURACE", "DOKONCENA"]
```

---

## ✅ Checklist implementace

### Frontend ✅
- [x] Inicializace polí v `initialFormData`
- [x] Načítání z DB v `loadOrder`
- [x] Ukládání do DB v `handleSaveOrder`
- [x] Automatické workflow řízení
- [x] UI komponenty pro FÁZI 7
- [x] Grid layout pro srovnání Objednávka vs Faktura
- [x] Zobrazení položek z ISDOC
- [x] Textarea pro umístění majetku
- [x] Textarea pro poznámku
- [x] Checkbox pro potvrzení
- [x] Automatické nastavení ID a data při potvrzení

### Backend (TODO)
- [ ] Přidat sloupce do tabulky `25a_objednavky` (SQL příkaz připraven)
- [ ] Ověřit, že API přijímá nová pole
- [ ] Ověřit, že API vrací nová pole při načítání
- [ ] Otestovat ukládání a načítání

---

## 🚀 Návod k použití

### 1. Přidání sloupců do DB

Spusťte SQL příkaz v souboru `add_vecna_spravnost_fields.sql`:

```sql
ALTER TABLE `25a_objednavky` 
  ADD COLUMN `vecna_spravnost_umisteni_majetku` TEXT NULL,
  ADD COLUMN `vecna_spravnost_poznamka` TEXT NULL,
  ADD COLUMN `potvrzeni_vecne_spravnosti` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN `potvrzeni_dokonceni_objednavky` TINYINT(1) NOT NULL DEFAULT 0;
```

### 2. Restart aplikace

```bash
npm start
```

### 3. Testování

1. Vytvořte objednávku a přejděte do FÁZE 6 (přidejte fakturu)
2. Automaticky se zobrazí FÁZE 7 (Věcná správnost)
3. Vyplňte:
   - Umístění majetku (volitelné)
   - Poznámku (volitelné)
   - Zaškrtněte checkbox "Potvrzuji věcnou správnost" ✅
4. Uložte objednávku
5. Zobrazí se FÁZE 8 (Dokončení)
6. Zaškrtněte checkbox "Potvrzuji dokončení objednávky" ✅
7. Uložte objednávku → stav workflow se změní na DOKONCENA

---

## 📝 Poznámky

- Všechna textová pole používají `handleInputChange` pro autosave
- Checkboxy ukládají hodnoty 0/1 (TINYINT)
- ID a datum se nastavují **automaticky** při prvním zaškrtnutí checkboxu
- Workflow stavy se aktualizují **automaticky** při ukládání
- Frontend je **plně připraven**, čeká jen na přidání sloupců v DB
