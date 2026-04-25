# 📱 MOBILNÍ API - RYCHLÉ SCHVALOVÁNÍ OBJEDNÁVEK

> **Verze:** 1.0  
> **Poslední aktualizace:** 25. 04. 2026  
> **Autor:** Backend Development Team  
> **Pro:** Mobilarum - iOS/Android Development Team

---

## 📋 OBSAH

1. [Přehled](#-přehled)
2. [Workflow schvalování](#-workflow-schvalování)
3. [API Endpointy](#-api-endpointy)
4. [Progress čerpání LP kódů](#-progress-čerpání-lp-kódů)
5. [UI Komponenty](#-ui-komponenty)
6. [Politika schvalování](#-politika-schvalování)
7. [Příklady implementace](#-příklady-implementace)
8. [FAQ](#-faq)

---

## 🎯 PŘEHLED

### **Co je rychlé schvalování?**

Rychlé schvalování umožňuje **schvalovatelům** schválit nebo zamítnout objednávku **jedním kliknutím** přímo ze seznamu objednávek nebo z detailu, **bez nutnosti otevírat celý formulář**.

### **Klíčové vlastnosti:**

✅ **Jedno kliknutí** - Schválení/zamítnutí přímo ze seznamu  
✅ **Progress bar čerpání** - Viditelný přehled čerpání LP kódů před schválením  
✅ **Validace limitů** - Kontrola překročení schváleného limitu  
✅ **Komentáře** - Volitelný komentář ke schválení/zamítnutí  
✅ **Oprávnění** - Automatická kontrola práv schvalovatele  
✅ **Notifikace** - Okamžité notifikace o změně stavu

---

## 🔄 WORKFLOW SCHVALOVÁNÍ

### **Stavy objednávky:**

```
┌─────────────────────────────────────────────────────────────┐
│                  LIFECYCLE OBJEDNÁVKY                        │
└─────────────────────────────────────────────────────────────┘

1. NOVA
   └─> Objednatel vytvoří objednávku
       └─> Odeslání ke schválení (přidá LP kódy, vyplní položky)
           ↓
2. ODESLANA_KE_SCHVALENI (KE_SCHVALENI)
   └─> Čeká na schválení schvalovatelem
       ├─> ✅ SCHVÁLENÍ → 3. SCHVALENA
       └─> ❌ ZAMÍTNUTÍ → 4. ZAMITNUTA

3. SCHVALENA
   └─> Objednávka schválena → pokračuje workflow
       ├─> ROZPRACOVANA (přidávání položek)
       ├─> ODESLANA (odeslána dodavateli)
       ├─> POTVRZENA (potvrzena dodavatelem)
       └─> DOKONCENA (dokončena)

4. ZAMITNUTA
   └─> Objednávka zamítnuta → konec workflow
       └─> Lze pouze prohlížet, nelze editovat
```

---

### **📱 MOBILNÍ WORKFLOW:**

**1️⃣ SEZNAM OBJEDNÁVEK**
```
📋 Ke schválení (5)
┌─────────────────────────────────────┐
│ O-2026-0415 | Dell notebook         │
│ 25 000 Kč | Jan Novák              │
│ 📊 LP-2026-001: 45% (12k/25k)      │ ← Progress čerpání
│                                     │
│ [✅ Schválit] [❌ Zamítnout]        │ ← Rychlé akce
└─────────────────────────────────────┘
```

**2️⃣ DETAIL OBJEDNÁVKY**
```
┌─────────────────────────────────────┐
│ 📄 Objednávka O-2026-0415           │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Dodavatel: Dell Czech Republic     │
│ Částka: 25 000 Kč                   │
│                                     │
│ 💰 ČERPÁNÍ LP KÓDŮ                  │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ LP-2026-001: Provozní náklady       │
│ ████████████░░░░░░░░ 62% (12k/25k) │ ← Kompletní progress
│ • Schváleno: 10 000 Kč              │
│ • Plánováno: 2 000 Kč               │
│ • TATO obj.: 25 000 Kč              │
│                                     │
│ ⚠️ PŘEKROČENÍ O 12 000 Kč!          │ ← Varování
│                                     │
│ [✅ Schválit i přesto]              │
│ [❌ Zamítnout]                      │
│ [💬 Přidat komentář]                │
└─────────────────────────────────────┘
```

---

## 📡 API ENDPOINTY

### **1️⃣ NAČTENÍ DETAILU OBJEDNÁVKY S ČERPÁNÍM**

**Endpoint:** `POST /api.eeo/orders-v3/detail`

**Request:**
```json
{
  "token": "dXNlckBkb21haW4uY3p8MTc0MjkwMzk4MA==",
  "username": "user@domain.cz",
  "order_id": 415
}
```

**Response (zaměření na LP čerpání):**
```json
{
  "status": "success",
  "data": {
    "order": {
      "id": 415,
      "cislo_objednavky": "O-2026-0415",
      "predmet": "Notebook Dell Latitude",
      "max_cena_s_dph": 25000.00,
      "stav": "KE_SCHVALENI",
      "stav_workflow_kod": "[\"NOVA\",\"ODESLANA_KE_SCHVALENI\"]",
      "schvalovatel_id": 15,
      "schvalovatel_jmeno": "Marie",
      "schvalovatel_prijmeni": "Svobodová",
      
      // 💡 KLÍČOVÉ PRO ČERPÁNÍ:
      "financovani": {
        "typ": "LP",
        "lp_kody": [134, 145],
        "cislo_smlouvy": null,
        "pojistna_udalost_cislo": null
      },
      
      // 💰 ČERPÁNÍ LP - OBOHACENÉ INFO
      "lp_info_enriched": [
        {
          "id": 134,
          "cislo_lp": "LP-2026-001",
          "nazev_uctu": "Provozní náklady",
          "vyse_financniho_kryti": 50000.00,          // Limit
          
          // TŘI TYPY ČERPÁNÍ:
          "skutecne_cerpano": 10000.00,               // ✅ Potvrzené faktury
          "predpokladane_cerpani": 2000.00,           // 📊 Objednávky s položkami
          "rezervovano": 25000.00,                    // ⏳ Tato objednávka
          
          // PROCENTA:
          "procento_skutecne": 20.0,                  // 10k/50k
          "procento_planovane": 24.0,                 // (10k+2k)/50k
          "procento_rezervovano": 74.0,               // (10k+2k+25k)/50k ⚠️
          
          // ⚠️ PŘEKROČENÍ:
          "prekroceni": 12000.00,                     // 37k - 50k limit
          "prekroceni_procent": 24.0,                 // Překročení o 24%
          
          // DETAILY OBJEDNÁVEK:
          "objednavky_detail": [
            {
              "cislo_objednavky": "O-2026-0380",
              "stav": "POTVRZENA",
              "skutecne_podil": 8000.00
            },
            {
              "cislo_objednavky": "O-2026-0395",
              "stav": "ROZPRACOVANA",
              "planovane_podil": 2000.00
            }
          ]
        }
      ]
    }
  }
}
```

---

### **2️⃣ SCHVÁLENÍ OBJEDNÁVKY**

**Endpoint:** `POST /api.eeo/order-v2/update`

⚠️ **DŮLEŽITÉ:** Schvalování se provádí **změnou workflow stavu** a **vyplněním schvalovacích polí**.

**Request:**
```json
{
  "token": "dXNlckBkb21haW4uY3p8MTc0MjkwMzk4MA==",
  "username": "user@domain.cz",
  "id": 415,
  "stav_workflow_kod": "[\"NOVA\",\"SCHVALENA\"]",
  "stav_objednavky": "Schválena",
  "schvalovatel_id": 15,
  "dt_schvaleni": "2026-04-25 23:15:00",
  "schvaleni_komentar": ""
}
```

**Workflow transformace:**
```javascript
// ❌ PŘED schválením:
stav_workflow_kod: ["NOVA", "ODESLANA_KE_SCHVALENI"]

// ✅ PO schválení:
stav_workflow_kod: ["NOVA", "SCHVALENA"]
```

**Response:**
```json
{
  "status": "success",
  "message": "Objednávka byla úspěšně aktualizována",
  "data": {
    "order_id": 415,
    "updated_at": "2026-04-25 23:15:00"
  }
}
```

---

### **3️⃣ ZAMÍTNUTÍ OBJEDNÁVKY**

**Endpoint:** `POST /api.eeo/order-v2/update`

**Request:**
```json
{
  "token": "...",
  "username": "user@domain.cz",
  "id": 415,
  "stav_workflow_kod": "[\"NOVA\",\"ZAMITNUTA\"]",
  "stav_objednavky": "Zamítnuta",
  "schvalovatel_id": 15,
  "dt_schvaleni": "2026-04-25 23:15:00",
  "schvaleni_komentar": "Nedostatečný rozpočet na Q2 2026"
}
```

**Workflow transformace:**
```javascript
// ❌ PŘED zamítnutím:
stav_workflow_kod: ["NOVA", "ODESLANA_KE_SCHVALENI"]

// ✅ PO zamítnutí:
stav_workflow_kod: ["NOVA", "ZAMITNUTA"]
```

---

## 📊 PROGRESS ČERPÁNÍ LP KÓDŮ

### **Co zobrazovat:**

Progress bar ukazuje **3 typy čerpání**:

1. **Skutečně čerpáno** (✅ zelená) - Potvrzené faktury s věcnou správností
2. **Plánováno** (📊 oranžová) - Objednávky s položkami podle LP (bez faktury)
3. **Požadováno** (⏳ šedá) - Objednávky ve schvalování (tato objednávka)

---

### **Výpočet procent:**

```javascript
// DATA z API:
const lp = {
  vyse_financniho_kryti: 50000,      // Limit
  skutecne_cerpano: 10000,           // ✅ Schváleno
  predpokladane_cerpani: 2000,       // 📊 Plánováno
  rezervovano: 25000                 // ⏳ Tato objednávka
};

// VÝPOČET:
const skutecnePercent = (lp.skutecne_cerpano / lp.vyse_financniho_kryti) * 100;
// 10000/50000 = 20%

const planovanePercent = ((lp.skutecne_cerpano + lp.predpokladane_cerpani) / lp.vyse_financniho_kryti) * 100;
// (10000+2000)/50000 = 24%

const celkemPercent = ((lp.skutecne_cerpano + lp.predpokladane_cerpani + lp.rezervovano) / lp.vyse_financniho_kryti) * 100;
// (10000+2000+25000)/50000 = 74%

// PŘEKROČENÍ:
const prekroceni = (lp.skutecne_cerpano + lp.predpokladane_cerpani + lp.rezervovano) - lp.vyse_financniho_kryti;
// 37000 - 50000 = -13000 (OK, není překročení)
// NEBO
// 62000 - 50000 = 12000 (PŘEKROČENÍ o 12k!)
```

---

### **UI Komponenta - Progress Bar:**

```javascript
function LPProgressBar({ lp }) {
  const skutecnePercent = (lp.skutecne_cerpano / lp.vyse_financniho_kryti) * 100;
  const planovanePercent = ((lp.skutecne_cerpano + lp.predpokladane_cerpani) / lp.vyse_financniho_kryti) * 100;
  const celkemPercent = ((lp.skutecne_cerpano + lp.predpokladane_cerpani + lp.rezervovano) / lp.vyse_financniho_kryti) * 100;
  
  const isPrekroceno = celkemPercent > 100;
  const barColor = isPrekroceno ? '#ef4444' : celkemPercent > 80 ? '#f59e0b' : '#10b981';
  
  return (
    <View style={styles.lpProgressContainer}>
      {/* Header */}
      <View style={styles.lpHeader}>
        <Text style={styles.lpCode}>{lp.cislo_lp}</Text>
        <Text style={styles.lpPercent}>
          {celkemPercent.toFixed(0)}%
        </Text>
      </View>
      
      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View 
          style={[
            styles.progressBarFill,
            { 
              width: `${Math.min(celkemPercent, 100)}%`,
              backgroundColor: barColor
            }
          ]}
        />
        
        {/* Overflow indicator */}
        {isPrekroceno && (
          <View style={styles.overflowIndicator}>
            <Text>+{(celkemPercent - 100).toFixed(0)}%</Text>
          </View>
        )}
      </View>
      
      {/* Detail */}
      <View style={styles.lpDetail}>
        <Text>✅ Schváleno: {formatCurrency(lp.skutecne_cerpano)}</Text>
        <Text>📊 Plánováno: {formatCurrency(lp.predpokladane_cerpani)}</Text>
        <Text>⏳ Tato obj.: {formatCurrency(lp.rezervovano)}</Text>
        <Text style={styles.lpLimit}>
          Limit: {formatCurrency(lp.vyse_financniho_kryti)}
        </Text>
      </View>
      
      {/* Varování překročení */}
      {isPrekroceno && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ PŘEKROČENÍ O {formatCurrency(lp.prekroceni)}!
          </Text>
        </View>
      )}
    </View>
  );
}
```

---

### **Barevná logika:**

```javascript
function getLPColor(celkemPercent) {
  if (celkemPercent > 100) {
    return {
      color: '#ef4444',      // Červená - překročení
      label: 'PŘEKROČENO'
    };
  } else if (celkemPercent >= 80) {
    return {
      color: '#f59e0b',      // Oranžová - varování
      label: 'VYSOKÉ ČERPÁNÍ'
    };
  } else if (celkemPercent >= 50) {
    return {
      color: '#3b82f6',      // Modrá - střední
      label: 'NORMÁLNÍ'
    };
  } else {
    return {
      color: '#10b981',      // Zelená - nízké
      label: 'V POŘÁDKU'
    };
  }
}
```

---

## 🎨 UI KOMPONENTY

### **1️⃣ Rychlé akční tlačítka (Seznam)**

```javascript
function QuickApprovalButtons({ order, onApprove, onReject }) {
  return (
    <View style={styles.quickActions}>
      <TouchableOpacity 
        style={[styles.actionButton, styles.approveButton]}
        onPress={() => onApprove(order)}
      >
        <Icon name="check" size={20} color="#fff" />
        <Text style={styles.buttonText}>Schválit</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.actionButton, styles.rejectButton]}
        onPress={() => onReject(order)}
      >
        <Icon name="close" size={20} color="#fff" />
        <Text style={styles.buttonText}>Zamítnout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6
  },
  approveButton: {
    backgroundColor: '#10b981'
  },
  rejectButton: {
    backgroundColor: '#ef4444'
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  }
});
```

---

### **2️⃣ Dialog s komentářem**

```javascript
function ApprovalDialog({ visible, order, onConfirm, onCancel, type }) {
  const [comment, setComment] = useState('');
  const isApproval = type === 'approve';
  
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {isApproval ? '✅ Schválit objednávku?' : '❌ Zamítnout objednávku?'}
          </Text>
          
          <View style={styles.orderSummary}>
            <Text style={styles.orderNumber}>{order.cislo_objednavky}</Text>
            <Text style={styles.orderSubject}>{order.predmet}</Text>
            <Text style={styles.orderAmount}>
              {formatCurrency(order.max_cena_s_dph)}
            </Text>
          </View>
          
          {/* LP Progress - pouze při schvalování */}
          {isApproval && order.lp_info_enriched && order.lp_info_enriched.map(lp => (
            <LPProgressBar key={lp.id} lp={lp} />
          ))}
          
          {/* Komentář */}
          <TextInput
            style={styles.commentInput}
            placeholder={isApproval ? "Volitelný komentář ke schválení" : "Důvod zamítnutí (povinné)"}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
          />
          
          {/* Tlačítka */}
          <View style={styles.modalButtons}>
            <Button title="Zrušit" onPress={onCancel} color="#6b7280" />
            <Button 
              title={isApproval ? "Schválit" : "Zamítnout"}
              onPress={() => onConfirm(comment)}
              color={isApproval ? '#10b981' : '#ef4444'}
              disabled={!isApproval && !comment}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

---

## 🔐 POLITIKA SCHVALOVÁNÍ

### **Kdo může schvalovat?**

1. **Přímý schvalovatel** (`schvalovatel_id`)
   - Uživatel přiřazený jako schvalovatel objednávky

2. **Zastupování**
   - Pokud je schvalovatel na dovolené/nemocný
   - Zastupuje ho uživatel s oprávněním `substitute_approve`

3. **Admin/Super admin**
   - Může schválit jakoukoli objednávku
   - Pro emergency situace

---

### **Kontrola oprávnění (Backend):**

Backend automaticky kontroluje:
- ✅ Je uživatel schvalovatel této objednávky?
- ✅ Má uživatel oprávnění `ORDER_APPROVE`?
- ✅ Je objednávka ve stavu `ODESLANA_KE_SCHVALENI`?
- ✅ Není objednávka již schválena/zamítnuta?

**Frontend by měl:**
- Zobrazit tlačítka pouze pro schvalovatelé
- Předvyplnit `schvalovatel_id` z userDetail
- Validovat stav před odesláním

---

### **Validace překročení limitu:**

```javascript
async function validateApproval(order) {
  // Načíst LP čerpání
  const detail = await getOrderDetailV3(order.id);
  
  // Kontrola překročení
  const hasOverflow = detail.order.lp_info_enriched?.some(lp => 
    lp.procento_rezervovano > 100
  );
  
  if (hasOverflow) {
    // Zobrazit warning dialog
    const confirmed = await showWarningDialog({
      title: '⚠️ Překročení limitu!',
      message: 'Tato objednávka překročí schválený limit LP kódu. Opravdu chcete schválit?',
      confirmText: 'Schválit i přesto',
      cancelText: 'Zrušit'
    });
    
    if (!confirmed) {
      return false;
    }
  }
  
  return true;
}
```

---

## 💻 PŘÍKLADY IMPLEMENTACE

### **Kompletní flow schvalování:**

```javascript
import { getOrderDetailV3 } from './api/ordersV3';
import { updateOrderV2 } from './api/orderV2';

// 1. Načtení objednávky s čerpáním
async function loadOrderForApproval(orderId) {
  try {
    const response = await getOrderDetailV3(orderId, token, username);
    
    if (response.status === 'success') {
      const order = response.data.order;
      
      // Kontrola stavu
      if (!isApprovalPending(order)) {
        showError('Objednávka již není ke schválení');
        return null;
      }
      
      // Kontrola oprávnění
      if (!canApprove(order, currentUser)) {
        showError('Nemáte oprávnění schvalovat tuto objednávku');
        return null;
      }
      
      return order;
    }
  } catch (error) {
    showError('Chyba při načítání objednávky');
    return null;
  }
}

// 2. Schválení objednávky
async function approveOrder(order, comment = '') {
  try {
    // Validace překročení
    const hasOverflow = order.lp_info_enriched?.some(lp => 
      lp.procento_rezervovano > 100
    );
    
    if (hasOverflow) {
      const confirmed = await confirmOverflowApproval();
      if (!confirmed) return;
    }
    
    // Příprava workflow stavů
    let workflowStates = parseWorkflowStates(order.stav_workflow_kod);
    
    // Odstranění stavů schvalování
    workflowStates = workflowStates.filter(s => 
      !['ODESLANA_KE_SCHVALENI', 'CEKA_SE', 'ZAMITNUTA'].includes(s)
    );
    
    // Přidání SCHVALENA
    if (!workflowStates.includes('SCHVALENA')) {
      workflowStates.push('SCHVALENA');
    }
    
    // Update objednávky
    const updateData = {
      stav_workflow_kod: JSON.stringify(workflowStates),
      stav_objednavky: 'Schválena',
      schvalovatel_id: currentUser.id,
      dt_schvaleni: formatDateTimeForMySQL(new Date()),
      schvaleni_komentar: comment
    };
    
    const response = await updateOrderV2(order.id, updateData, token, username);
    
    if (response.status === 'success') {
      showSuccess('✅ Objednávka byla schválena');
      
      // Refresh seznamu
      await refreshOrdersList();
      
      // Log activity
      logActivity('ORDER_APPROVED', order.id, order.cislo_objednavky);
    }
  } catch (error) {
    showError('Chyba při schvalování: ' + error.message);
  }
}

// 3. Zamítnutí objednávky
async function rejectOrder(order, reason) {
  if (!reason || reason.trim() === '') {
    showError('Důvod zamítnutí je povinný');
    return;
  }
  
  try {
    // Příprava workflow stavů
    let workflowStates = parseWorkflowStates(order.stav_workflow_kod);
    
    // Odstranění stavů schvalování
    workflowStates = workflowStates.filter(s => 
      !['ODESLANA_KE_SCHVALENI', 'CEKA_SE'].includes(s)
    );
    
    // Přidání ZAMITNUTA
    if (!workflowStates.includes('ZAMITNUTA')) {
      workflowStates.push('ZAMITNUTA');
    }
    
    // Update objednávky
    const updateData = {
      stav_workflow_kod: JSON.stringify(workflowStates),
      stav_objednavky: 'Zamítnuta',
      schvalovatel_id: currentUser.id,
      dt_schvaleni: formatDateTimeForMySQL(new Date()),
      schvaleni_komentar: reason
    };
    
    const response = await updateOrderV2(order.id, updateData, token, username);
    
    if (response.status === 'success') {
      showSuccess('❌ Objednávka byla zamítnuta');
      
      // Refresh seznamu
      await refreshOrdersList();
      
      // Log activity
      logActivity('ORDER_REJECTED', order.id, order.cislo_objednavky, reason);
    }
  } catch (error) {
    showError('Chyba při zamítání: ' + error.message);
  }
}

// Helper funkce
function isApprovalPending(order) {
  const workflowStates = parseWorkflowStates(order.stav_workflow_kod);
  return workflowStates.includes('ODESLANA_KE_SCHVALENI') || 
         order.stav === 'KE_SCHVALENI';
}

function canApprove(order, user) {
  // Je schvalovatel?
  if (order.schvalovatel_id === user.id) return true;
  
  // Je admin?
  if (user.is_admin || user.is_super_admin) return true;
  
  // Má oprávnění ORDER_APPROVE?
  if (user.permissions?.includes('ORDER_APPROVE')) return true;
  
  return false;
}

function parseWorkflowStates(stav_workflow_kod) {
  try {
    return Array.isArray(stav_workflow_kod) 
      ? stav_workflow_kod 
      : JSON.parse(stav_workflow_kod || '[]');
  } catch {
    return [];
  }
}
```

---

## ❓ FAQ

### **❓ Co když uživatel není schvalovatel?**

**Odpověď:** Tlačítka schválení/zamítnutí **se nezobrazí**. Zobrazí se pouze button "Zobrazit detail".

```javascript
function OrderListItem({ order, currentUser }) {
  const canApproveThis = canApprove(order, currentUser);
  
  return (
    <View style={styles.orderCard}>
      {/* ... order info ... */}
      
      {canApproveThis ? (
        <QuickApprovalButtons 
          order={order}
          onApprove={() => approveOrder(order)}
          onReject={() => rejectOrder(order)}
        />
      ) : (
        <Button title="Zobrazit detail" onPress={() => openDetail(order)} />
      )}
    </View>
  );
}
```

---

### **❓ Co když LP kód přesáhne limit?**

**Odpověď:** 
1. Progress bar zobrazí **červenou barvu**
2. Zobrazí se **varování**: "⚠️ PŘEKROČENÍ O X Kč!"
3. Schvalovatel musí **potvrdit**, že chce schválit i přesto
4. Komentář se automaticky doplní: "Schváleno i přes překročení LP-2026-001 o 12 000 Kč"

```javascript
async function confirmOverflowApproval() {
  return await showDialog({
    title: '⚠️ Překročení limitu!',
    message: 'Tato objednávka překročí schválený limit LP kódu. Opravdu chcete schválit?',
    buttons: [
      { text: 'Zrušit', style: 'cancel', value: false },
      { text: 'Schválit i přesto', style: 'destructive', value: true }
    ]
  });
}
```

---

### **❓ Jak funguje zastupování při schvalování?**

**Odpověď:** Backend automaticky kontroluje, zda uživatel má **aktivní zastupování** za schvalovatele.

**API kontroluje:**
1. Je uživatel přímý schvalovatel? (`schvalovatel_id == user.id`)
2. Má uživatel aktivní zastupování? (tabulka `25_zastupovani`)
3. Je zastupování platné? (`platne_od <= NOW() <= platne_do`)
4. Má zastupování oprávnění `approve`?

**Frontend nemusí řešit** - stačí odeslat request s aktuálním `user.id`.

---

### **❓ Lze schválit objednávku, která nemá LP kódy?**

**Odpověď:** **ANO!** Ne všechny objednávky mají LP kódy.

Pokud `order.lp_info_enriched` je `null` nebo prázdné pole:
- **Nezobrazuj** progress bar čerpání
- **Zobrazuj** pouze základní info (částka, dodavatel)
- Schválení funguje **stejně** (změna workflow stavu)

```javascript
function ApprovalDetail({ order }) {
  const hasLPCodes = order.lp_info_enriched && order.lp_info_enriched.length > 0;
  
  return (
    <View>
      <OrderInfo order={order} />
      
      {hasLPCodes && (
        <View>
          <Text style={styles.sectionTitle}>💰 ČERPÁNÍ LP KÓDŮ</Text>
          {order.lp_info_enriched.map(lp => (
            <LPProgressBar key={lp.id} lp={lp} />
          ))}
        </View>
      )}
      
      <QuickApprovalButtons order={order} />
    </View>
  );
}
```

---

### **❓ Co když objednávka má více LP kódů?**

**Odpověď:** Zobraz **všechny LP kódy** s jejich progress bary.

```javascript
function LPCodesList({ lpCodes }) {
  return (
    <View style={styles.lpList}>
      {lpCodes.map((lp, index) => (
        <View key={lp.id} style={styles.lpItem}>
          <Text style={styles.lpIndex}>LP {index + 1}/{lpCodes.length}</Text>
          <LPProgressBar lp={lp} />
          
          {/* Varování jen pro překročené */}
          {lp.procento_rezervovano > 100 && (
            <Text style={styles.warning}>
              ⚠️ Tento LP kód bude překročen o {formatCurrency(lp.prekroceni)}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
```

---

### **❓ Musím načítat celý detail pro rychlé schválení?**

**Odpověď:** **NE!** Pro schvalování ze seznamu stačí volat update endpoint **bez načítání detailu**.

**Pro rychlé schválení (ze seznamu):**
```javascript
// ✅ RYCHLÉ - bez načítání detailu
async function quickApprove(order) {
  const updateData = {
    stav_workflow_kod: JSON.stringify(['NOVA', 'SCHVALENA']),
    stav_objednavky: 'Schválena',
    schvalovatel_id: currentUser.id,
    dt_schvaleni: formatDateTimeForMySQL(new Date())
  };
  
  await updateOrderV2(order.id, updateData, token, username);
}
```

**Pro schválení s progress barem (z detailu):**
```javascript
// 📊 S DETAILEM - zobrazit progress
async function approveWithProgress(orderId) {
  // 1. Načíst detail s čerpáním
  const detail = await getOrderDetailV3(orderId);
  
  // 2. Zobrazit dialog s progress bary
  showApprovalDialog(detail.order);
  
  // 3. Po potvrzení - update
  await updateOrderV2(orderId, updateData);
}
```

---

## 🎯 BEST PRACTICES

### **1. Performance:**
- ✅ Cache seznam objednávek ke schválení
- ✅ Optimistické UI update (schválit → okamžitě skrýt z seznamu)
- ✅ Lazy loading progress barů (pouze při otevření detailu)

### **2. UX:**
- ✅ Haptic feedback při schválení/zamítnutí
- ✅ Pull-to-refresh pro aktualizaci seznamu
- ✅ Animace success/error (checkmark/cross)
- ✅ Toast notifikace místo modals (rychlejší)

### **3. Bezpečnost:**
- ✅ Validace oprávnění na frontendu i backendu
- ✅ Timeout pro staré tokeny
- ✅ Re-auth po X minutách neaktivity

---

## 📊 STATISTIKA

- **API Endpointy:** 2 (detail + update)
- **Workflow stavy:** 4 (NOVA, ODESLANA_KE_SCHVALENI, SCHVALENA, ZAMITNUTA)
- **Typy čerpání:** 3 (skutečné, plánované, požadované)
- **Oprávnění:** 3 úrovně (schvalovatel, zastupování, admin)

---

**✅ DOKUMENTACE KOMPLETNÍ!**

Pro další dotazy kontaktuj Backend Development Team.
