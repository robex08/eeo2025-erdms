# 🏢 Organizační řád - Komplexní systém správy hierarchie a oprávnění

> **Datum:** 11. prosince 2025  
> **Status:** 📋 Návrh k diskusi  
> **Databáze:** eeo2025 @ 10.3.172.11

---

## 🎯 Hlavní koncept

Vytvoření **vizuálního interaktívního systému** pro správu organizační struktury s možností:
- 🔗 Definování vztahů nadřízený-podřízený (drag & drop)
- 📍 Přiřazování dodatečných lokalit a úseků mimo výchozí
- 🔔 Konfigurace notifikací (email + in-app zvoneček)
- 👁️ Rozšířená viditelnost objednávek, faktur a dalších objektů
- 🕸️ Vizualizace jako "organizační pavouk"

---

## 🎨 UI/UX Koncept

### **Hlavní komponenty:**

#### 1️⃣ **Vizuální editor hierarchie** (Canvas)
```
┌─────────────────────────────────────────────────────────┐
│  🎯 Organizační struktura                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│     ┌───────────────┐                                  │
│     │ Jan Novák     │ ◄─── Drag & Drop                 │
│     │ Ředitel IT    │                                  │
│     └───────┬───────┘                                  │
│             │                                           │
│      ┌──────┴──────┬──────────┐                       │
│      ↓             ↓          ↓                       │
│  ┌────────┐   ┌────────┐  ┌────────┐                 │
│  │ Petra  │   │ Karel  │  │ Marie  │                 │
│  │ Dvořák │   │ Svoboda│  │ Nová   │                 │
│  └────────┘   └────────┘  └────────┘                 │
│                                                         │
│  [+ Přidat uživatele]  [↻ Auto layout]  [💾 Uložit]   │
└─────────────────────────────────────────────────────────┘
```

**Technologie:**
- **React Flow** nebo **ReactDiagram** - knihovna pro node-based editor
- **D3.js** - pro pokročilé vizualizace
- Drag & Drop API (react-dnd)

#### 2️⃣ **Detail uzlu (Node)** - kliknutím na osobu
```
┌─────────────────────────────────────────────┐
│ 👤 Karel Svoboda (u03924)                   │
├─────────────────────────────────────────────┤
│                                             │
│ 📍 Základní údaje:                          │
│   Útvar: IT                                 │
│   Pozice: Vedoucí vývoje                    │
│   Lokalita: Praha                           │
│                                             │
│ ➕ Dodatečné přiřazení:                     │
│   ┌──────────────────────────────────┐     │
│   │ ☑ Brno (lokalita)                │     │
│   │ ☑ Ostrava (lokalita)             │     │
│   │ ☐ Hradec Králové                 │     │
│   └──────────────────────────────────┘     │
│                                             │
│   ┌──────────────────────────────────┐     │
│   │ ☑ Provoz (úsek) - viditelnost    │     │
│   │ ☑ Finance (úsek) - viditelnost   │     │
│   │ ☐ HR (úsek)                      │     │
│   └──────────────────────────────────┘     │
│                                             │
│ 🔔 Notifikační nastavení:                   │
│   Objednávky:                               │
│     ☑ Email   ☑ Zvoneček                   │
│   Faktury:                                  │
│     ☑ Email   ☐ Zvoneček                   │
│   Schvalování:                              │
│     ☑ Email   ☑ Zvoneček   🔴 Priority     │
│                                             │
│ [💾 Uložit změny]  [✖ Zrušit]              │
└─────────────────────────────────────────────┘
```

---

## 🗄️ Databázová struktura

### **Nové/upravené tabulky:**

#### ✅ `25_uzivatele_hierarchie` - již existuje (rozšířená)
```sql
CREATE TABLE 25_uzivatele_hierarchie (
  nadrizeny_id  INT UNSIGNED NOT NULL,
  podrizeny_id  INT UNSIGNED NOT NULL,
  dt_od         DATE NOT NULL DEFAULT CURDATE(),
  dt_do         DATE NULL,
  aktivni       TINYINT(1) NOT NULL DEFAULT 1,
  poznamka      TEXT NULL,
  dt_vytvoreni  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (nadrizeny_id, podrizeny_id)
);
```

#### 🆕 `25_uzivatele_rozsirene_opravneni` - nová tabulka
```sql
CREATE TABLE 25_uzivatele_rozsirene_opravneni (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uzivatel_id       INT UNSIGNED NOT NULL,
  typ_opravneni     ENUM('lokalita', 'usek', 'custom') NOT NULL,
  
  -- Pokud typ = 'lokalita'
  lokalita_id       INT UNSIGNED NULL,
  
  -- Pokud typ = 'usek'
  usek_id           INT UNSIGNED NULL,
  
  -- Co může vidět/spravovat
  viditelnost_objednavky  TINYINT(1) DEFAULT 0,
  viditelnost_faktury     TINYINT(1) DEFAULT 0,
  viditelnost_smlouvy     TINYINT(1) DEFAULT 0,
  viditelnost_pokladna    TINYINT(1) DEFAULT 0,
  viditelnost_uzivatele   TINYINT(1) DEFAULT 0,
  
  -- Metadata
  dt_od         DATE NOT NULL DEFAULT CURDATE(),
  dt_do         DATE NULL,
  aktivni       TINYINT(1) NOT NULL DEFAULT 1,
  poznamka      TEXT NULL,
  vytvoril_user_id INT UNSIGNED NULL,
  dt_vytvoreni  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (uzivatel_id) REFERENCES 25_uzivatele(id) ON DELETE CASCADE,
  FOREIGN KEY (lokalita_id) REFERENCES 25_lokality(id),
  FOREIGN KEY (usek_id) REFERENCES 25_useky(id),
  FOREIGN KEY (vytvoril_user_id) REFERENCES 25_uzivatele(id),
  
  INDEX idx_uzivatel (uzivatel_id, aktivni),
  INDEX idx_typ (typ_opravneni),
  INDEX idx_lokalita (lokalita_id),
  INDEX idx_usek (usek_id)
);
```

#### 🆕 `25_uzivatele_notifikace_nastaveni` - nová tabulka
```sql
CREATE TABLE 25_uzivatele_notifikace_nastaveni (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uzivatel_id       INT UNSIGNED NOT NULL,
  
  -- Typ události
  typ_udalosti      VARCHAR(64) NOT NULL,
  -- Např: 'order_created', 'order_approved', 'invoice_received', 
  --       'contract_expiring', 'cash_book_new'
  
  -- Kategorie (pro skupinové nastavení)
  kategorie         VARCHAR(32) NULL,
  -- Např: 'objednavky', 'faktury', 'smlouvy', 'schvalovani'
  
  -- Kanály notifikace
  email_enabled     TINYINT(1) DEFAULT 1,
  inapp_enabled     TINYINT(1) DEFAULT 1,  -- zvoneček
  sms_enabled       TINYINT(1) DEFAULT 0,  -- budoucnost
  
  -- Priorita/urgence
  priority          ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
  
  -- Filtrování
  filter_lokalita_id  INT UNSIGNED NULL,  -- pouze z této lokality
  filter_usek_id      INT UNSIGNED NULL,  -- pouze z tohoto úseku
  filter_json         TEXT NULL,  -- JSON pro komplexní filtry
  
  -- Metadata
  aktivni           TINYINT(1) NOT NULL DEFAULT 1,
  dt_vytvoreni      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dt_upraveno       TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (uzivatel_id) REFERENCES 25_uzivatele(id) ON DELETE CASCADE,
  FOREIGN KEY (filter_lokalita_id) REFERENCES 25_lokality(id),
  FOREIGN KEY (filter_usek_id) REFERENCES 25_useky(id),
  
  UNIQUE KEY uniq_uzivatel_udalost (uzivatel_id, typ_udalosti, filter_lokalita_id, filter_usek_id),
  INDEX idx_uzivatel (uzivatel_id),
  INDEX idx_typ (typ_udalosti),
  INDEX idx_kategorie (kategorie)
);
```

#### 🆕 `25_hierarchy_positions` - pozice uzlů v grafu
```sql
CREATE TABLE 25_hierarchy_positions (
  uzivatel_id   INT UNSIGNED PRIMARY KEY,
  position_x    FLOAT NOT NULL DEFAULT 0,
  position_y    FLOAT NOT NULL DEFAULT 0,
  zoom_level    FLOAT DEFAULT 1.0,
  layout_type   VARCHAR(32) DEFAULT 'hierarchical',
  -- 'hierarchical', 'force', 'circular', 'custom'
  dt_upraveno   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (uzivatel_id) REFERENCES 25_uzivatele(id) ON DELETE CASCADE
);
```

---

## 📡 API Endpointy

### **Hierarchie:**

#### ✅ Existující:
- `POST /hierarchy/subordinates` - seznam podřízených
- `POST /hierarchy/superiors` - seznam nadřízených
- `POST /hierarchy/add` - přidání vztahu
- `POST /hierarchy/remove` - odebrání vztahu

#### 🆕 Nové:
```javascript
// Získání celé struktury pro vizualizaci
POST /hierarchy/full-structure
{
  "include_inactive": false,
  "usek_id": null,  // filtr podle úseku
  "lokalita_id": null  // filtr podle lokality
}

Response:
{
  "nodes": [
    {
      "id": 123,
      "username": "u03924",
      "jmeno": "Karel",
      "prijmeni": "Svoboda",
      "pozice_nazev": "Vedoucí vývoje",
      "usek_nazev": "IT",
      "lokalita_nazev": "Praha",
      "position": { "x": 100, "y": 200 },
      "rozsirena_opravneni": [
        {"typ": "lokalita", "lokalita_id": 2, "nazev": "Brno"},
        {"typ": "usek", "usek_id": 5, "nazev": "Provoz"}
      ]
    }
  ],
  "edges": [
    {
      "nadrizeny_id": 123,
      "podrizeny_id": 456,
      "aktivni": 1,
      "dt_od": "2025-01-01",
      "dt_do": null
    }
  ]
}

// Uložení pozic uzlů (po drag & drop)
POST /hierarchy/save-positions
{
  "positions": [
    {"uzivatel_id": 123, "x": 100, "y": 200},
    {"uzivatel_id": 456, "x": 250, "y": 350}
  ]
}
```

### **Rozšířená oprávnění:**

```javascript
// Získání rozšířených oprávnění uživatele
POST /permissions/extended/get
{
  "uzivatel_id": 123
}

Response:
{
  "lokality": [
    {"id": 2, "nazev": "Brno", "viditelnost_objednavky": 1}
  ],
  "useky": [
    {"id": 5, "nazev": "Provoz", "viditelnost_faktury": 1}
  ]
}

// Uložení rozšířených oprávnění
POST /permissions/extended/save
{
  "uzivatel_id": 123,
  "opravneni": [
    {
      "typ": "lokalita",
      "lokalita_id": 2,
      "viditelnost_objednavky": 1,
      "viditelnost_faktury": 0
    }
  ]
}
```

### **Notifikační nastavení:**

```javascript
// Získání nastavení notifikací
POST /notifications/settings/get
{
  "uzivatel_id": 123
}

Response:
{
  "nastaveni": [
    {
      "typ_udalosti": "order_created",
      "kategorie": "objednavky",
      "email_enabled": 1,
      "inapp_enabled": 1,
      "priority": "high"
    }
  ]
}

// Uložení nastavení notifikací
POST /notifications/settings/save
{
  "uzivatel_id": 123,
  "nastaveni": [
    {
      "typ_udalosti": "order_approved",
      "email_enabled": 1,
      "inapp_enabled": 0,
      "priority": "normal"
    }
  ]
}
```

---

## 🎨 Frontend komponenty

### **Struktura:**

```
src/pages/OrganizationHierarchy/
├── index.js                          # Hlavní kontejner
├── HierarchyCanvas.js                # React Flow canvas
├── NodeCard.js                       # Jednotlivý uzel (osoba)
├── NodeDetailPanel.js                # Boční panel s detailem
├── PermissionsEditor.js              # Editor rozšířených oprávnění
├── NotificationSettingsEditor.js     # Editor notifikací
├── Toolbar.js                        # Nástrojová lišta
└── styles/
    └── hierarchy.styles.js           # Styled components
```

### **Hlavní komponenta:**

```jsx
import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
  MiniMap, 
  Controls, 
  Background,
  useNodesState,
  useEdgesState,
  addEdge
} from 'reactflow';
import 'reactflow/dist/style.css';

const OrganizationHierarchy = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  
  // Načtení dat z API
  useEffect(() => {
    fetchHierarchyData();
  }, []);
  
  const fetchHierarchyData = async () => {
    const response = await api.post('/hierarchy/full-structure');
    // Transform data to React Flow format
    const flowNodes = response.nodes.map(node => ({
      id: node.id.toString(),
      type: 'custom',
      position: node.position,
      data: { ...node }
    }));
    
    const flowEdges = response.edges.map((edge, idx) => ({
      id: `e${edge.nadrizeny_id}-${edge.podrizeny_id}`,
      source: edge.nadrizeny_id.toString(),
      target: edge.podrizeny_id.toString(),
      animated: edge.aktivni === 1
    }));
    
    setNodes(flowNodes);
    setEdges(flowEdges);
  };
  
  // Drag & Drop - propojení
  const onConnect = useCallback((params) => {
    // Zavolat API pro vytvoření vztahu
    api.post('/hierarchy/add', {
      nadrizeny_id: params.source,
      podrizeny_id: params.target
    });
    
    setEdges((eds) => addEdge(params, eds));
  }, []);
  
  // Kliknutí na uzel
  const onNodeClick = (event, node) => {
    setSelectedNode(node.data);
  };
  
  // Uložení pozic po drag
  const onNodeDragStop = (event, node) => {
    api.post('/hierarchy/save-positions', {
      positions: [{ 
        uzivatel_id: node.id, 
        x: node.position.x, 
        y: node.position.y 
      }]
    });
  };
  
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
      
      {/* Detail panel */}
      {selectedNode && (
        <NodeDetailPanel 
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
};
```

---

## ⚙️ Technická implementace

### **Fáze 1: Základní vizualizace** (1-2 týdny)
- ✅ Tabulka hierarchie již existuje
- 🔨 API endpoint pro full-structure
- 🔨 React Flow integrace
- 🔨 Zobrazení uzlů s základními daty
- 🔨 Drag & Drop propojování

### **Fáze 2: Rozšířená oprávnění** (1 týden)
- 🔨 Vytvoření tabulky `25_uzivatele_rozsirene_opravneni`
- 🔨 API endpointy
- 🔨 UI editor v Node Detail Panel
- 🔨 Integrace do systému viditelnosti

### **Fáze 3: Notifikační nastavení** (1 týden)
- 🔨 Vytvoření tabulky `25_uzivatele_notifikace_nastaveni`
- 🔨 API endpointy
- 🔨 UI editor notifikací
- 🔨 Integrace do notifikačního systému

### **Fáze 4: Pokročilé funkce** (1-2 týdny)
- 🔨 Auto-layout algoritmy
- 🔨 Filtrování podle úseků/lokalit
- 🔨 Export do PDF/Image
- 🔨 Historie změn
- 🔨 Hromadné operace

---

## 🎯 Výhody tohoto přístupu

### **Pro administrátory:**
✅ **Vizuální přehled** - okamžitý náhled struktury  
✅ **Rychlá editace** - drag & drop místo formulářů  
✅ **Komplexní správa** - vše na jednom místě  
✅ **Historie** - kdo co změnil  

### **Pro uživatele:**
✅ **Přesné notifikace** - jen co potřebuji  
✅ **Rozšířený přístup** - vidím více lokalit/úseků  
✅ **Přehlednost** - jasné vztahy nadřízený-podřízený  

### **Pro systém:**
✅ **Flexibilita** - snadné přidání nových oprávnění  
✅ **Škálovatelnost** - funguje i pro velké organizace  
✅ **Audit trail** - vše zaznamenáno  

---

## 🚀 Knihovny a nástroje

### **Frontend:**
- **reactflow** (https://reactflow.dev/) - hlavní knihovna pro node editor
  - Drag & Drop out of the box
  - Různé typy layoutů
  - Mini mapa, zoom, controls
  - Customizovatelné nody
  
- **react-dnd** - pokud potřebujeme custom drag & drop

- **d3.js** - pro pokročilé vizualizace (grafy, statistiky)

- **html2canvas** + **jspdf** - export do PDF

### **Backend:**
- Žádné extra knihovny - použijeme PHP + PDO jako doposud

---

## 💰 Odhad náročnosti

### **Čas vývoje:**
- **Fáze 1:** 40-60 hodin (základní vizualizace)
- **Fáze 2:** 20-30 hodin (rozšířená oprávnění)
- **Fáze 3:** 20-30 hodin (notifikace)
- **Fáze 4:** 30-40 hodin (pokročilé funkce)

**Celkem:** 110-160 hodin (3-4 týdny plného vývoje)

### **Složitost:**
- **React Flow integrace:** Střední (dobrá dokumentace)
- **Databázové změny:** Nízká (jasná struktura)
- **API endpointy:** Nízká (podobné existujícím)
- **Integrace s existujícím kódem:** Střední (notifikace, oprávnění)

---

## 🤔 Otázky k diskusi

1. **Priorita funkcí:**
   - Která fáze je nejdůležitější?
   - Můžeme postupovat inkrementálně?

2. **Vizuální styl:**
   - Klasický org chart (strom shora dolů)?
   - Volný layout (jako Mind Map)?
   - Kruhový layout?

3. **Mobilní verze:**
   - Potřebujeme responsive design?
   - Nebo jen desktop?

4. **Export/Import:**
   - Export do PDF/Excel?
   - Import z CSV?

5. **Oprávnění vs Role:**
   - Jak se budou chovat rozšířená oprávnění vs standardní role?
   - Mají přepsat role, nebo jen rozšířit?

6. **Notifikace:**
   - Které typy událostí chceme pokrýt?
   - Globální nastavení vs individuální?

---

## 📝 Další kroky

1. **Diskuse o návrhu** - projít tento dokument
2. **Schválení databázové struktury**
3. **Vytvoření mock-up UI** (Figma/náčrtek)
4. **Implementace Fáze 1** (základní vizualizace)
5. **Testování a feedback**
6. **Iterace a další fáze**

---

**Autor:** GitHub Copilot  
**Datum:** 11. prosince 2025  
**Status:** 📋 K diskusi
