# CHANGELOG - MAINTENANCE Mode Indikátor v Hlavičce

**Datum:** 2025-01-13  
**Branch:** feature/generic-recipient-system  
**Commit:** 3a662ce

---

## 📋 Přehled změn

Přidán vizuální indikátor MAINTENANCE módu do hlavičky aplikace, který upozorňuje uživatele (zejména administrátory s MAINTENANCE_ADMIN právem), že systém je v režimu údržby.

---

## 🎯 Účel

- **Vizuální zpětná vazba**: Uživatelé s oprávněním obejít maintenance mód vidí výrazné upozornění, že systém je v údržbě
- **Podobné DEVELOP labelu**: Stejný vizuální styl jako existující DEVELOP indikátor
- **Automatická aktualizace**: Pravidelná kontrola stavu každých 30 sekund
- **Univerzální zobrazení**: Zobrazuje se na všech stránkách (na rozdíl od DEVELOP, který je jen na /dev/)

---

## 🔧 Implementované změny

### 1. Frontend - Layout.js

**Soubor:** `/apps/eeo-v2/client/src/components/Layout.js`

#### Import global settings API:
```javascript
import { checkMaintenanceMode } from '../services/globalSettingsApi';
```

#### Nový state pro maintenance indikátor:
```javascript
const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
```

#### useEffect pro pravidelnou kontrolu maintenance módu:
```javascript
// Check maintenance mode status periodically
useEffect(() => {
  const checkMaintenance = async () => {
    try {
      const maintenanceActive = await checkMaintenanceMode();
      setIsMaintenanceMode(maintenanceActive);
    } catch (error) {
      console.warn('Nepodařilo se zkontrolovat maintenance mode:', error);
      setIsMaintenanceMode(false);
    }
  };

  // Check immediately on mount
  checkMaintenance();

  // Check every 30 seconds
  const interval = setInterval(checkMaintenance, 30000);

  return () => clearInterval(interval);
}, []);
```

#### Vizuální indikátor v hlavičce:
```javascript
{/* MAINTENANCE label při aktivním maintenance módu */}
{isMaintenanceMode && (
  <span style={{ 
    color: '#f97316', 
    fontWeight: '700',
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    padding: '2px 6px',
    borderRadius: '3px',
    marginRight: '6px',
    border: '1px solid rgba(249, 115, 22, 0.4)',
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
    display: 'inline-flex',
    alignItems: 'center',
    animation: 'pulse-maintenance 2s ease-in-out infinite'
  }}>
    MAINTENANCE
  </span>
)}
```

#### CSS animace pro pulse efekt:
```javascript
@keyframes pulse-maintenance { 
  0%, 100% { opacity: 1; } 
  50% { opacity: 0.7; } 
}
```

---

## 🎨 Vizuální specifikace

### Barvy a styling:
- **Barva textu:** `#f97316` (oranžová)
- **Background:** `rgba(249, 115, 22, 0.2)` (průhledná oranžová)
- **Border:** `1px solid rgba(249, 115, 22, 0.4)`
- **Animace:** Pulse efekt (opacity 1 → 0.7 → 1 každé 2s)
- **Umístění:** V `<sup>` elementu v HeaderTitle, před DEVELOP labelem

### Vzhled v hlavičce:
```
Systém správy a workflow objednávek [MAINTENANCE] [DEVELOP eeo2025-dev] 2.0
```

---

## 🔄 Logika zobrazení

### Kdy se zobrazuje:
- ✅ Kdykoliv je v global settings aktivní `maintenance_mode = 1`
- ✅ Zobrazuje se všem přihlášeným uživatelům (včetně těch s bypass oprávněním)
- ✅ Na všech cestách (/dev/ i produkční)
- ✅ Aktualizuje se automaticky každých 30 sekund

### Kdy se nezobrazuje:
- ❌ Když je `maintenance_mode = 0` nebo není nastaveno
- ❌ Když API endpoint vrátí chybu (fallback na false)

---

## 🔗 Závislosti

### Backend API:
- **Endpoint:** `/api.eeo/maintenance-status` (GET)
- **Response:** `{ maintenance: true/false, canAccess: true/false }`
- Implementováno v `globalSettingsHandlers.php`

### Frontend služby:
- `checkMaintenanceMode()` z `globalSettingsApi.js`
- Vrací `Promise<boolean>` - true pokud je údržba aktivní

---

## 📊 Integrace s existujícími funkcemi

### Souvislost s MAINTENANCE_ADMIN právem:
- Uživatelé s právem **MAINTENANCE_ADMIN** (ID: 96) mohou obejít maintenance mode
- Vidí však stále indikátor, aby věděli, že systém je v údržbě
- To zajišťuje, že administrátoři jsou informováni o stavu systému

### Souvislost s App.js MaintenanceModeWrapper:
- **App.js:** Blokuje přístup uživatelům BEZ oprávnění
- **Layout.js:** Informuje uživatele S oprávněním o aktivní údržbě

---

## 🧪 Testování

### Manuální test:
1. Přihlásit se jako uživatel s MAINTENANCE_ADMIN právem
2. Otevřít Global Settings a zapnout Maintenance Mode
3. **Očekávaný výsledek:** Oranžový badge "MAINTENANCE" se objeví v hlavičce s pulse animací
4. Počkat 30+ sekund a vypnout Maintenance Mode v jiné záložce
5. **Očekávaný výsledek:** Badge zmizí po max. 30 sekundách

### Edge cases:
- ✅ API nedostupné → Badge se nezobrazí (fallback na false)
- ✅ Nevalidní JSON response → Badge se nezobrazí
- ✅ 404 endpoint → Badge se nezobrazí
- ✅ Rychlé přepínání ON/OFF → Interval správně aktualizuje

---

## 📁 Změněné soubory

### Frontend:
```
/apps/eeo-v2/client/src/components/Layout.js
  - Přidán import checkMaintenanceMode
  - Přidán state isMaintenanceMode
  - Přidán useEffect pro kontrolu maintenance módu (30s interval)
  - Přidán vizuální indikátor v HeaderTitle
  - Přidána CSS animace pulse-maintenance
```

### Git:
```bash
git commit -m "feat: MAINTENANCE mode indikátor v hlavičce aplikace"
git push origin feature/generic-recipient-system
```

### Build:
```bash
npm run build:dev:explicit
```

---

## 🚀 Deployment

### DEV prostředí:
✅ Build dokončen: `/var/www/erdms-dev/apps/eeo-v2/client/build/`
✅ Git push proveden

### PROD prostředí:
⚠️ Čeká na potvrzení před nasazením
- Backend změny: `globalSettingsHandlers.php` již nasazen
- Frontend změny: Vyžaduje `npm run build:prod` a deploy

---

## 📝 Poznámky

### Výhody tohoto řešení:
1. **Neblokuje práci**: Administrátoři vidí varování, ale mohou pracovat
2. **Jasná vizuální zpětná vazba**: Nelze přehlédnout oranžový pulsující badge
3. **Automatická aktualizace**: Není třeba refresh stránky
4. **Konzistentní design**: Stejný styl jako DEVELOP label

### Možná budoucí vylepšení:
- Tooltip s informací, kdo aktivoval maintenance mód a kdy
- Přidání času do maintenance módu (např. "MAINTENANCE - do 14:00")
- Rozlišení typu údržby (plánovaná / neplánovaná)
- Countdown timer zobrazující zbývající čas údržby

---

## 🔗 Související dokumentace

- `CHANGELOG_DEV_PROD_SEPARATION.md` - Backend API pro maintenance status
- `ADD_MAINTENANCE_ADMIN_PERMISSION.sql` - Database schema pro MAINTENANCE_ADMIN
- `globalSettingsHandlers.php` - Backend handler pro global settings
- `App.js` - MaintenanceModeWrapper logika

---

**Autor:** GitHub Copilot  
**Testováno:** DEV prostředí (eeo2025-dev)  
**Status:** ✅ Implementováno a otestováno
