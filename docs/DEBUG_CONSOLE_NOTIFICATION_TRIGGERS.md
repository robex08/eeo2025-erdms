# DEBUG CONSOLE OUTPUT - NOTIFICATION TRIGGERS

**Datum:** 31. prosince 2025  
**Verze:** 1.92d  
**Status:** ✅ DEBUG VÝPISY IMPLEMENTOVÁNY

---

## 📺 CO UVIDÍŠ V KONZOLI

### 1. Když se vyvolá TRIGGER (např. faktura se uloží)

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║  🔔 NOTIFICATION TRIGGER CALLED!                             ║
║                                                              ║
║  Event Type:   INVOICE_SUBMITTED                            ║
║  Object ID:    12345                                         ║
║  Trigger User: 42                                            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

**Co znamená:**
- **Event Type** - typ události (INVOICE_SUBMITTED, CASHBOOK_MONTH_CLOSED, atd.)
- **Object ID** - ID faktury/objednávky/pokladny
- **Trigger User** - ID uživatele který akci provedl

---

### 2. NotificationRouter zpracovává

```
╔══════════════════════════════════════════════════════════════╗
║  🎯 NOTIFICATION ROUTER - Processing Trigger                 ║
╠══════════════════════════════════════════════════════════════╣
║  Event:     INVOICE_SUBMITTED                                ║
║  Object:    12345                                            ║
║  User:      42                                               ║
║  Frontend:  0 placeholders                                   ║
╚══════════════════════════════════════════════════════════════╝
```

**Co dělá:**
- Načítá data faktury/objednávky z databáze
- Připravuje placeholders pro šablony

---

### 3. Organizační hierarchie - hledání příjemců

```
┌────────────────────────────────────────────────────────────────┐
│  📊 ORGANIZATIONAL HIERARCHY - Finding Recipients              │
├────────────────────────────────────────────────────────────────┤
│  Event Type:   INVOICE_SUBMITTED                               │
│  Object ID:    12345                                           │
│  Trigger User: 42                                              │
└────────────────────────────────────────────────────────────────┘

✅ Nalezen aktivní profil: ID=12
📊 Hierarchie: 15 nodes, 23 edges
📦 Object type: invoices

🔍 Hledám templates s event typem 'INVOICE_SUBMITTED'...

   ✅ MATCH! Template: 'Faktura předána'
      ↪ Event: 'INVOICE_SUBMITTED'
         Edge #1: edge-template-1-role-2
         → recipient_type=ROLE, scope_filter=NONE, recipientRole=APPROVER
         → sendEmail=ANO, sendInApp=ANO
         ✅ Target node: type=role, name=Schvalovatel 1
         → Resolved 3 recipients: 10, 15, 22
         → After scope filter: 3 recipients
         → Template variant: APPROVER_NORMAL
         ✅ User 10: Added to recipients (email=YES, inapp=YES)
         ✅ User 15: Added to recipients (email=YES, inapp=YES)
         ✅ User 22: Added to recipients (email=YES, inapp=YES)

┌────────────────────────────────────────────────────────────────┐
│  📊 ORGANIZATIONAL HIERARCHY - SUMMARY                         │
├────────────────────────────────────────────────────────────────┤
│  Event:              INVOICE_SUBMITTED                         │
│  Matching Templates: 1                                         │
│  Total Recipients:   3                                         │
│                                                                │
│  ✅ Recipients found and ready to receive notifications        │
└────────────────────────────────────────────────────────────────┘
```

**Co znamená:**
- **Matching Templates** - kolik šablon odpovídá tomuto eventu
  - **0** = ⚠️ Žádná šablona není nakonfigurována pro tento event!
  - **1+** = ✅ Šablona(y) nalezena(y)
- **Total Recipients** - kolik uživatelů dostane notifikaci
  - **0** = ⚠️ Šablony jsou, ale žádní příjemci (zkontroluj edge filtry)
  - **1+** = ✅ Příjemci nalezeni

---

### 4. Finální shrnutí

```
╔══════════════════════════════════════════════════════════════╗
║  🎯 NOTIFICATION ROUTER - FINAL SUMMARY                      ║
╠══════════════════════════════════════════════════════════════╣
║  Event:              INVOICE_SUBMITTED                       ║
║  Object ID:          12345                                   ║
║  Recipients Found:   3                                       ║
║  Notifications Sent: 3                                       ║
║  Errors:             0                                       ║
║                                                              ║
║  ✅ ✅ ✅  SUCCESS - Notifications sent successfully!         ║
╚══════════════════════════════════════════════════════════════╝
```

**Co znamená:**
- **Recipients Found** - kolik příjemců bylo nalezeno
- **Notifications Sent** - kolik notifikací bylo skutečně odesláno
- **Errors** - počet chyb (např. email se nepodařilo odeslat)

---

## 🧪 JAK TESTOVAT

### 1. Sleduj Apache error log
```bash
# V terminálu sleduj log v reálném čase
tail -f /var/log/apache2/error.log | grep -E "🔔|🎯|📊|✅|❌"
```

### 2. Test faktury
```bash
# 1. Otevři fakturu v EEO
# 2. Změň stav na "Předáno"
# 3. Ulož
# 4. Sleduj log - měl bys vidět:
#    🔔 NOTIFICATION TRIGGER CALLED!
#    Event Type: INVOICE_SUBMITTED
```

### 3. Test pokladny
```bash
# 1. Otevři pokladní knihu
# 2. Uzavři měsíc
# 3. Sleduj log - měl bys vidět:
#    🔔 NOTIFICATION TRIGGER CALLED!
#    Event Type: CASHBOOK_MONTH_CLOSED
```

### 4. Zkontroluj organizační hierarchii
```bash
# Pokud vidíš "Matching Templates: 0", znamená to:
# → V organizační hierarchii NENÍ nakonfigurována šablona pro tento event

# Co dělat:
# 1. Jdi do EEO → Nastavení → Organizační hierarchie
# 2. Uprav profil "PRIKAZCI"
# 3. Přidej novou šablonu pro event type (např. INVOICE_SUBMITTED)
# 4. Definuj edges (kdo dostane notifikaci)
# 5. Ulož
# 6. Zkus znovu
```

---

## 📋 SEZNAM VŠECH EVENT TYPES

### Faktury (invoices)
| Event Type                           | Kdy se volá                              |
|--------------------------------------|------------------------------------------|
| `INVOICE_SUBMITTED`                  | Faktura předána ke kontrole              |
| `INVOICE_RETURNED`                   | Faktura vrácena k doplnění               |
| `INVOICE_MATERIAL_CHECK_REQUESTED`   | Přiřazena k objednávce (věcná kontrola)  |
| `INVOICE_UPDATED`                    | Obecná aktualizace faktury               |
| `INVOICE_MATERIAL_CHECK_APPROVED`    | Věcná správnost potvrzena                |
| `INVOICE_REGISTRY_PUBLISHED`         | Uveřejněna v registru                    |

### Pokladna (cashbook)
| Event Type               | Kdy se volá                        |
|--------------------------|------------------------------------|
| `CASHBOOK_MONTH_CLOSED`  | Měsíc uzavřen uživatelem           |
| `CASHBOOK_MONTH_LOCKED`  | Měsíc zamknut správcem (URGENT!)   |

### Objednávky (orders) - již existující
| Event Type                  | Kdy se volá                        |
|-----------------------------|------------------------------------|
| `ORDER_MATERIAL_CORRECTNESS`| Věcná správnost objednávky         |
| `ORDER_SENT_FOR_APPROVAL`   | Objednávka odeslána ke schválení   |
| ... a další ...             |                                    |

---

## 🐛 TROUBLESHOOTING

### Problém: Vidím "Matching Templates: 0"
**Řešení:**
1. Zkontroluj organizační hierarchii v UI
2. Ověř že existuje šablona s tímto event typem
3. Zkontroluj že profil "PRIKAZCI" je aktivní

### Problém: Vidím "Total Recipients: 0"
**Řešení:**
1. Šablony jsou v pořádku, problém je v edges
2. Zkontroluj že edges mají správné filtry
3. Zkontroluj že cílové role mají uživatele

### Problém: Vidím "Notifications Sent: 0" ale "Recipients Found: 3"
**Řešení:**
1. Problém při odesílání emailů nebo ukládání do DB
2. Zkontroluj další error logy
3. Ověř emailové nastavení

### Problém: Trigger se vůbec nevolá
**Řešení:**
1. Zkontroluj že business logika se provádí (např. faktura se opravdu ukládá)
2. Zkontroluj že podmínky pro trigger jsou splněny (např. stav se opravdu změnil)
3. Hledej v logu "🔔 NOTIFICATION TRIGGER" - pokud tam není, trigger se vůbec nespustil

---

## 🎨 EMOJI LEGEND

| Emoji | Význam |
|-------|--------|
| 🔔    | Trigger byl vyvolán |
| 🎯    | NotificationRouter zpracovává |
| 📊    | Organizační hierarchie |
| 🔍    | Hledání/vyhledávání |
| ✅    | Úspěch/nalezeno |
| ❌    | Chyba/nenalezeno |
| ⚠️    | Varování |
| 📦    | Objekt/data |
| 👤    | Uživatel |
| 📧    | Email |
| 💬    | In-app notifikace |

---

**Vytvořil:** GitHub Copilot  
**Datum:** 31. prosince 2025
