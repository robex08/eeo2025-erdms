# 🎨 Oprava barev menu baru a auto-rozbalení sekcí při editaci

## ✅ **Implementované opravy**

### **1. 🎨 Oprava barev menu baru**

#### **Nové barevné schéma:**
- 🟢 **"Nová objednávka"** - zelená (stávající)
- 🔴 **"Rozpracovaná objednávka"** - červená (NOVÁ) 
- 🟠 **"Editace objednávky"** - tmavě oranžová (NOVÁ)

#### **Technické změny:**

**Layout.js - rozšíření data-status logiky:**
```javascript
// PŘED - pouze 2 stavy
data-status={location.pathname === '/orders-new' ? 'inactive' : (hasDraftOrder ? 'draft' : 'new')}

// PO - 3 stavy s rozlišením edit režimu  
data-status={location.pathname === '/orders-new' 
  ? 'inactive' 
  : (hasDraftOrder 
      ? (isOrderEditMode ? 'edit' : 'draft') 
      : 'new')}
```

**CSS styly v NewOrderBadge:**
```css
/* Nová objednávka (zelená) - default */
background: linear-gradient(180deg, badgeGreenStart, badgeGreenEnd);

/* Rozpracovaná objednávka (červená) */  
&[data-status='draft'] {
  background: #dc2626; /* červená pro rozpracovanou */
  box-shadow: 0 3px 10px -2px rgba(220,38,38,0.55), 0 0 0 1px #b91c1c inset;
}

/* Editace objednávky (tmavě oranžová) */
&[data-status='edit'] {
  background: #c2410c; /* tmavě oranžová pro editaci */  
  box-shadow: 0 3px 10px -2px rgba(194,65,12,0.55), 0 0 0 1px #9a3412 inset;
}
```

### **2. 🔧 Auto-rozbalení sekcí při editaci**

#### **Problém:**
- Při otevření editace existující objednávky zůstávaly všechny sekce **sbalené**
- Uživatel musel ručně rozbalit každou sekci pro přístup k datům

#### **Řešení - inteligentní auto-expand:**
```javascript
// V loadOrder() při mode === 'edit'
const autoExpandedSections = {
  supplier: !!(mappedFormData.dodavatel_nazev || mappedFormData.dodavatel_ico || mappedFormData.druh_objednavky),
  orderDetails: !!(mappedFormData.polozky?.length > 0 || mappedFormData.maxPriceInclVat),
  delivery: !!(mappedFormData.delivery_date || mappedFormData.delivery_address || mappedFormData.delivery_note),
  docs: !!(mappedFormData.attachments?.length > 0),
  financing: !!(mappedFormData.zdroj_financovani || mappedFormData.financingSource),
  confirmation: !!(mappedFormData.sentStatus === 'odeslano' || mappedFormData.orderConfirmed),
  registry: !!(mappedFormData.stav_id || mappedFormData.approvedByUserId || mappedFormData.schvalil_uzivatel_id),
  sentConfirmation: !!(mappedFormData.stateId === 3 || mappedFormData.sentStatus === 'odeslano'),
};
setSectionStates(prev => ({ ...prev, ...autoExpandedSections }));
```

#### **Logika auto-rozbalení:**
- **Supplier** → rozbal pokud má `dodavatel_nazev`, `ico`, nebo `druh_objednavky`
- **Order Details** → rozbal pokud má `položky` nebo `maxPriceInclVat`  
- **Delivery** → rozbal pokud má `delivery_date`, `address`, nebo `note`
- **Docs** → rozbal pokud má `přílohy`
- **Financing** → rozbal pokud má `zdroj_financování`
- **Confirmation** → rozbal pokud je `odeslána` nebo `potvrzená`
- **Registry** → rozbal pokud má `stav_id` nebo `schvalovací` údaje

### **3. 🔄 Zachování kompatibility**

#### **Persistence zůstává:**
- Pokud už existují **uložené sectionStates** → použijí se ty
- Pokud **neexistují** a jde o editaci → **auto-expand podle obsahu**
- Při **nové objednávce** → výchozí chování (postupné rozbalování)

#### **Uživatelská volba zůstává:**
- Uživatel může **ručně sbalit/rozbalit** libovolnou sekci
- Jeho volba se **uloží do localStorage** a zachová při návratu  
- Auto-expand se spustí **pouze při prvním otevření** editace

## 🎯 **Scénáře nyní fungují správně**

### ✅ **Menu bar barvy:**
1. **Nová objednávka** → 🟢 **Zelená** 
2. **Rozpracovaná objednávka** → 🔴 **Červená**
3. **Editace objednávky** → 🟠 **Tmavě oranžová**
4. **F5 refresh** → barvy se **zachovávají správně** ✨

### ✅ **Auto-rozbalení při editaci:**
1. **Otevři editaci** schválené objednávky ze seznamu
2. **Všechny relevantní sekce** se automaticky rozbalí ✨
3. **Supplier, Details, Financing** atd. jsou **okamžitě přístupné**
4. **Registry, Confirmation** se rozbalí pokud obsahují data ✨

### ✅ **Zachované funkčnosti:**
- **Nové objednávky** → progresivní rozbalování dle vyplňování ✅
- **Uživatelské volby** → ruční sbalení/rozbalení se ukládá ✅  
- **Persistence** → stav sekcí se zachovává při navigaci ✅

## 📊 **Před vs Po opravě**

### **PŘED:**
❌ **Menu bar** - pouze 2 barvy (zelená/oranžová), chaos mezi stavy  
❌ **Editace** - všechny sekce sbalené, nutnost ručního rozbalování  
❌ **UX** - pomalý přístup k datům při editaci  

### **PO:**  
✅ **Menu bar** - 3 jasně odlišené barvy pro každý stav  
✅ **Editace** - inteligentní auto-rozbalení podle obsahu  
✅ **UX** - okamžitý přístup ke všem relevantním sekcím  
✅ **Persistence** - zachovává uživatelské preference  

## 🔧 **Klíčové mechanismy**

### **Barevná logika:**
```javascript
// Detekce stavu pro barvu
const menuStatus = inactive ? 'inactive' 
  : hasDraft ? (isEditMode ? 'edit' : 'draft') 
  : 'new';

// CSS mapování
'new' → zelená (nová)
'draft' → červená (rozpracovaná) 
'edit' → tmavě oranžová (editace)
'inactive' → šedá (neaktivní)
```

### **Auto-expand logika:**
```javascript
// Spustí se pouze při mode === 'edit' a žádné uložené sectionStates
if (!existingSectionStates && mode === 'edit') {
  expandBasedOnContent(mappedFormData);
}
```

## 📋 **Upravené soubory**

### **Layout.js:**
- ✅ **Rozšířený data-status** - rozlišuje edit vs draft  
- ✅ **Nové CSS** - červená pro draft, oranžová pro edit
- ✅ **Zachována kompatibilita** - s existujícími tématy

### **OrderFormComponent.js:**
- ✅ **Auto-expand logika** - v loadOrder() při editaci
- ✅ **Inteligentní detekce** - rozbalí sekce s daty  
- ✅ **Podmíněné spuštění** - pouze při prvním otevření

**Menu bar barvy + Auto-rozbalení sekcí = SOLVED! 🎉**

## 🧪 **Test scénáře**

### **Test 1: Menu bar barvy**
```
1. Vytvoř novou → Menu: 🟢 Zelená
2. Vyplň data → Menu: 🔴 Červená  
3. Otevři editaci → Menu: 🟠 Tmavě oranžová
4. F5 refresh → Menu: 🟠 Tmavě oranžová (zachováno)
```

### **Test 2: Auto-rozbalení**
```
1. Vytvoř a schval objednávku s dodavatelem + položkami
2. Otevři ze seznamu pro editaci  
3. ✅ Očekávání: Supplier + Details sekce automaticky rozbalené
```

### **Test 3: Persistence voleb**
```
1. Editace → auto-rozbal → ručně sbal Supplier  
2. Naviguj jinam → vrať se  
3. ✅ Očekávání: Supplier zůstane sbalená (uživatelská volba)
```

**Všechny problémy s barvami a rozbalením sekcí jsou vyřešeny!** 🚀