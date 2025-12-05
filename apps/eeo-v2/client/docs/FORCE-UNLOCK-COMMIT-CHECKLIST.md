# Force Unlock Feature - Git Commit Checklist

## 📋 Co bylo změněno

### ✅ Soubory upravené (3)

1. **src/services/api25orders.js**
   - ✅ `unlockOrder25()` - přidán parametr `force: boolean`
   - ✅ `lockOrder25()` - přidán `locked_by_name` v response pro toast
   - ✅ Dokumentace v JSDoc

2. **src/forms/OrderForm25.js**
   - ✅ Force unlock logika pro SUPERADMIN/ADMINISTRATOR
   - ✅ Confirm dialog s upozorněním na notifikaci
   - ✅ Toast notifikace se jmény uživatelů (ne ID)
   - ✅ Fallback pro běžné uživatele (jen info)

3. **src/pages/Orders25List.js**
   - ✅ Import `unlockOrder25`
   - ✅ Force unlock logika (identická s OrderForm25.js)
   - ✅ Toast notifikace konzistentní

### ✅ Soubory vytvořené (4)

4. **docs/DB-NOTIFICATION-TEMPLATE-ORDER-UNLOCK-FORCED.sql**
   - ✅ SQL INSERT pro notification_template
   - ✅ Type: `order_unlock_forced`
   - ✅ Placeholders dokumentované

5. **docs/BACKEND-FORCE-UNLOCK-REQUIREMENTS.md**
   - ✅ API endpoint specifikace
   - ✅ Request/Response struktury
   - ✅ Authorization logic
   - ✅ Notification flow
   - ✅ Security considerations
   - ✅ Testing checklist

6. **docs/FORCE-UNLOCK-IMPLEMENTATION-SUMMARY.md**
   - ✅ Kompletní přehled implementace
   - ✅ User flow scenarios
   - ✅ Toast notifikace přehled
   - ✅ Frontend/Backend rozdělení
   - ✅ Testing checklist

7. **docs/DB-NOTIFICATION-TEMPLATE-STRUCTURE.md**
   - ✅ Struktura tabulky podle UI obrázku
   - ✅ Placeholders dokumentace
   - ✅ Příklady použití (Python/JS)
   - ✅ Testing SQL queries

## ✅ Funkcionality implementované

### Frontend (COMPLETE ✅)

- [x] Force unlock pro SUPERADMIN/ADMINISTRATOR
- [x] Authorization check (role check)
- [x] Confirm dialog s upozorněním
- [x] API call s `force: true`
- [x] Toast notifikace se jmény (ne ID)
- [x] Lock po force unlock
- [x] Fallback pro běžné uživatele
- [x] Konzistentní UX v OrderForm25 i Orders25List
- [x] Žádné compilation errors
- [x] Dokumentace připravena

### Backend (TODO pro BE tým)

- [ ] Implementovat `force` parametr v `/unlock` endpoint
- [ ] Authorization check (role validation)
- [ ] Notification creation při force unlock
- [ ] Real-time notification dispatch
- [ ] Audit log
- [ ] Response s `unlock_type: "forced"`
- [ ] Vložit notification_template do DB
- [ ] Testing

## 📝 Commit Message (návrh)

```
feat: Force unlock pro SUPERADMIN/ADMINISTRATOR + notifikace

FRONTEND IMPLEMENTACE:
- api25orders: unlockOrder25() s force parametrem
- OrderForm25 + Orders25List: force unlock logika
- Confirm dialog s upozorněním na notifikaci
- Toast notifikace se jmény uživatelů (ne ID)
- Authorization check podle role (SUPERADMIN/ADMINISTRATOR)

BACKEND DOKUMENTACE:
- API endpoint specifikace (force unlock)
- Notification template SQL (order_unlock_forced)
- Placeholders dokumentace
- Security requirements
- Testing checklist

SOUBORY:
Upravené:
  - src/services/api25orders.js
  - src/forms/OrderForm25.js
  - src/pages/Orders25List.js

Nové:
  - docs/DB-NOTIFICATION-TEMPLATE-ORDER-UNLOCK-FORCED.sql
  - docs/BACKEND-FORCE-UNLOCK-REQUIREMENTS.md
  - docs/FORCE-UNLOCK-IMPLEMENTATION-SUMMARY.md
  - docs/DB-NOTIFICATION-TEMPLATE-STRUCTURE.md

Frontend je COMPLETE a ready pro backend integraci.
Backend potřebuje implementovat podle docs/BACKEND-FORCE-UNLOCK-REQUIREMENTS.md
```

## 🧪 Manual Testing - Frontend

### Test 1: SUPERADMIN vidí force unlock dialog
1. Přihlásit se jako SUPERADMIN
2. Uživatel A otevře objednávku pro editaci
3. Jako SUPERADMIN kliknout na "Editovat" stejné objednávky
4. **Očekáváno**: Dialog s možností force unlock
5. **Očekáváno**: Toast "Objednávka byla násilně odemčena..."
6. **Očekáváno**: Formulář se načte

### Test 2: Běžný uživatel nevidí force unlock
1. Přihlásit se jako běžný uživatel
2. Jiný uživatel otevře objednávku
3. Pokus o editaci
4. **Očekáváno**: Pouze info dialog bez možnosti unlock
5. **Očekáváno**: Toast warning
6. **Očekáváno**: Zůstane v seznamu

### Test 3: Toast notifikace zobrazují jména
1. Otevřít objednávku pro editaci (normální flow)
2. **Očekáváno**: Toast "Objednávka zamknuta pro editaci" (info)
3. Pokus o editaci zamčené objednávky
4. **Očekáváno**: Toast "Objednávka je zamčena uživatelem Jan Novák" (warning)
5. Force unlock jako admin
6. **Očekáváno**: Toast "...násilně odemčena uživateli Jan Novák..." (success)

## 🔄 Co dalšího?

### Po commitu frontend změn:
1. ✅ Frontend je DONE
2. 🔄 Předat dokumentaci backend týmu
3. 🔄 Backend implementace podle docs
4. 🔄 Testing po BE integraci

### Backend implementation order:
1. Vložit notification_template do DB (SQL ready)
2. Implementovat force unlock logic
3. Notification creation
4. Real-time dispatch (pokud existuje infrastruktura)
5. Testing s frontendem

## 📞 Contact backend team

Přeposláno dokumentace:
- ✅ BACKEND-FORCE-UNLOCK-REQUIREMENTS.md
- ✅ DB-NOTIFICATION-TEMPLATE-ORDER-UNLOCK-FORCED.sql
- ✅ DB-NOTIFICATION-TEMPLATE-STRUCTURE.md

Backend team potřebuje:
1. SQL vložit do DB
2. Implementovat force unlock endpoint
3. Otestovat s frontendem
4. Feedback pokud struktura neodpovídá

---

**Status: ✅ FRONTEND READY FOR COMMIT**
