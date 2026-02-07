# CHANGELOG: Oprava určování role příjemců notifikací

**Datum:** 2026-01-03  
**Autor:** GitHub Copilot  
**Typ:** Bugfix  
**Priorita:** Vysoká  

---

## 🐛 Problém

Garant, který má v systému **obecná práva příkazce** (ORDER_APPROVAL), dostával **oranžovou APPROVER notifikaci** (ke schválení), i když v **konkrétní objednávce** byl pouze garant a schvalovatel byl **někdo jiný**.

### Scénář
```
Nová objednávka:
- Objednatel: Robert (běžný uživatel)
- Garant: Jan (má práva příkazce v systému)
- Příkazce/Schvalovatel: Marie (jiná osoba než garant)

❌ PŘED OPRAVOU:
- Jan dostal ORANŽOVOU notifikaci "Ke schválení" (APPROVER)
- I když v TÉTO objednávce není schvalovatel!

✅ PO OPRAVĚ:
- Jan dostane ZELENOU informační notifikaci (SUBMITTER/INFO)
- Protože v TÉTO objednávce je pouze garant
- Marie dostane oranžovou notifikaci ke schválení (je skutečný schvalovatel)
```

---

## ✅ Řešení

Upravena logika v `notificationHandlers.php` funkce `findNotificationRecipients()`:

### Změna (řádek ~3050-3090)

**PŘED:**
- Role příjemce určována podle **obecných práv** v org hierarchii
- Pokud má user právo příkazce → vždy APPROVER

**PO:**
- Role příjemce určována podle **konkrétního přiřazení V TÉTO objednávce**
- Pokud má org hierarchie roli APPROVAL/EXCEPTIONAL, ale v objednávce je garant/objednatel (ne schvalovatel) → **změnit na INFO** (zelená)

### Kód
```php
// ✅ OPRAVA: Určit roli podle KONKRÉTNÍHO přiřazení v objednávce
$finalRecipientRole = $recipientRole;
$finalVariant = $variant;

if ($objectType === 'orders' && !empty($entityData)) {
    $isActualApprover = false;
    
    // Je tento user OPRAVDU schvalovatel TÉTO objednávky?
    if (!empty($entityData['schvalovatel_id']) && $entityData['schvalovatel_id'] == $userId) {
        $isActualApprover = true;
    } elseif (!empty($entityData['prikazce_id']) && $entityData['prikazce_id'] == $userId) {
        $isActualApprover = true;
    }
    
    // Je garant nebo objednatel TÉTO objednávky?
    $isGarant = !empty($entityData['garant_uzivatel_id']) && $entityData['garant_uzivatel_id'] == $userId;
    $isObjednatel = !empty($entityData['objednatel_id']) && $entityData['objednatel_id'] == $userId;
    $isAuthor = !empty($entityData['uzivatel_id']) && $entityData['uzivatel_id'] == $userId;
    
    // Pokud má být APPROVER, ale není skutečný schvalovatel této objednávky
    if (($recipientRole === 'APPROVAL' || $recipientRole === 'EXCEPTIONAL') && !$isActualApprover) {
        // Pokud je garant/objednatel/autor → změnit na INFO
        if ($isGarant || $isObjednatel || $isAuthor) {
            $finalRecipientRole = 'INFO';
            $finalVariant = !empty($node['data']['infoVariant']) ? $node['data']['infoVariant'] : 'SUBMITTER';
            error_log("         🔄 User $userId: Changed from $recipientRole to INFO (is garant/objednatel in THIS order, not actual approver)");
        }
    }
}

$recipients[] = array(
    'uzivatel_id' => $userId,
    'recipientRole' => $finalRecipientRole,  // ✅ POUŽIJE OPRAVENOU ROLI
    'sendEmail' => $sendEmailFinal,
    'sendInApp' => $sendInAppFinal,
    'templateId' => $templateId,
    'templateVariant' => $finalVariant  // ✅ POUŽIJE SPRÁVNOU VARIANTU
);
```

---

## 📊 Dopad

### Kdo je ovlivněn
- ✅ Garanti, kteří mají obecná práva příkazce
- ✅ Objednatelé s právy příkazce
- ✅ Jakýkoli uživatel s právy příkazce, který v konkrétní objednávce není schvalovatel

### Chování
| Situace | Role v systému | Role v objednávce | Dříve | Nyní |
|---------|---------------|-------------------|-------|------|
| Garant má práva příkazce | Příkazce | Garant | 🟠 APPROVER | 🟢 INFO/SUBMITTER |
| Garant je i schvalovatel | Příkazce | Schvalovatel | 🟠 APPROVER | 🟠 APPROVER |
| Objednatel má práva příkazce | Příkazce | Objednatel | 🟠 APPROVER | 🟢 INFO/SUBMITTER |
| Příkazce schvaluje | Příkazce | Schvalovatel | 🟠 APPROVER | 🟠 APPROVER |

---

## 🧪 Testování

### Test case 1: Garant s právy příkazce (není schvalovatel)
```
Objednávka:
- objednatel_id: 5
- garant_uzivatel_id: 10 (má práva příkazce)
- schvalovatel_id: 15

Očekávaný výsledek:
- User 10 dostane INFO/SUBMITTER (zelená)
- User 15 dostane APPROVAL/APPROVER (oranžová)
```

### Test case 2: Garant JE zároveň schvalovatel
```
Objednávka:
- objednatel_id: 5
- garant_uzivatel_id: 10
- schvalovatel_id: 10 (stejný jako garant)

Očekávaný výsledek:
- User 10 dostane APPROVAL/APPROVER (oranžová) - je skutečný schvalovatel
```

### Test case 3: Garant nemá práva příkazce
```
Objednávka:
- objednatel_id: 5
- garant_uzivatel_id: 20 (NEMÁ práva příkazce)
- schvalovatel_id: 15

Očekávaný výsledek:
- User 20 dostane INFO/SUBMITTER (zelená) - přidán jako source účastník
- User 15 dostane APPROVAL/APPROVER (oranžová)
```

---

## 📝 Soubory změněny

- `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php`
  - Funkce: `findNotificationRecipients()`
  - Řádky: ~3050-3090

---

## 🔗 Související

- **Email šablony:** `25_notifikace_sablony` (APPROVER_NORMAL, APPROVER_URGENT, SUBMITTER)
- **Org hierarchie:** `25_hierarchie_profily` (recipientRole definice)
- **Předchozí změny:** RH-SABLONY-UZIVATELID (přidání objednatel_name a garant_name do šablon)

---

## ⚠️ Poznámky

1. **Zpětná kompatibilita:** ✅ Ano - funkce pouze zpřesňuje roli, nemění API
2. **Performance:** ✅ Minimální dopad - pouze 1 extra SELECT již načtený
3. **Edge cases:** Ošetřeno - kontrola na NULL hodnoty

---

**Status:** ✅ Implementováno  
**Branch:** `feature/generic-recipient-system`  
**Commit:** Připraven pro commit  
