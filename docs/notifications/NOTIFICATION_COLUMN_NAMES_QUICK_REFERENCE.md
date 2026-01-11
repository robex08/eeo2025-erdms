# NOTIFICATION SYSTEM - COLUMN NAME QUICK REFERENCE

## ⚠️ ALWAYS USE THESE CORRECT COLUMN NAMES ⚠️

---

## 25_notifikace_sablony (Templates)

| ✅ CORRECT | ❌ WRONG (DO NOT USE) |
|------------|----------------------|
| `email_vychozi` | `odeslat_email_default`, `email_default` |
| `app_zprava` | `app_message`, `app_text` |
| `app_nadpis` | ✓ (correct everywhere) |
| `email_predmet` | ✓ (correct everywhere) |
| `email_telo` | ✓ (correct everywhere) |
| `priorita_vychozi` | ✓ (correct everywhere) |

**Note**: Template table does NOT have `kategorie` column!

---

## 25_notifikace (Notifications)

| ✅ CORRECT | ❌ WRONG (DO NOT USE) |
|------------|----------------------|
| `od_uzivatele_id` | `from_user_id`, `sender_id`, `from_uzivatel_id` |
| `pro_uzivatele_id` | `to_user_id`, `recipient_id`, `to_uzivatel_id` |
| `email_odeslan` | `email_odeslany`, `email_sent` |
| `email_odeslan_kdy` | ✓ (correct everywhere) |
| `nadpis` | ✓ (correct everywhere) |
| `zprava` | ✓ (correct everywhere) |
| `priorita` | ✓ (correct everywhere) |
| `kategorie` | ✓ (correct everywhere) |

---

## 25a_objednavky (Orders)

| ✅ CORRECT | ❌ WRONG (DO NOT USE) |
|------------|----------------------|
| `garant_uzivatel_id` | `garant_id`, `garant` |
| `schvalovatel_id` | `schvalovatel_uzivatel_id`, `schvalovatel` |
| `prikazce_id` | `prikazce_uzivatel_id`, `prikazce` |
| `objednatel_id` | ✓ (correct everywhere) |
| `uzivatel_id` | ✓ (correct everywhere) |

**Note**: Columns schvalovatel_2_id through schvalovatel_5_id DO NOT EXIST!

---

## 25_uzivatele (Users)

| ✅ CORRECT | ❌ WRONG (DO NOT USE) |
|------------|----------------------|
| `25_uzivatele` | `25_users`, `24a_users`, `users` |
| `TABLE_UZIVATELE` constant | ANY hardcoded table name |

---

## 25_uzivatele_role (User Roles)

| ✅ CORRECT | ❌ WRONG (DO NOT USE) |
|------------|----------------------|
| `25_uzivatele_role` | `25_user_roles`, `user_roles` |
| `TABLE_UZIVATELE_ROLE` constant | ANY hardcoded table name |

---

## USAGE EXAMPLES

### ✅ CORRECT Template Access:
```php
$odeslat_email = $template['email_vychozi'];
$app_message = $template['app_zprava'];
$email_predmet = $template['email_predmet'];
```

### ❌ WRONG Template Access:
```php
$odeslat_email = $template['odeslat_email_default'];  // UNDEFINED KEY!
$app_message = $template['app_message'];              // UNDEFINED KEY!
```

### ✅ CORRECT Notification INSERT:
```php
INSERT INTO 25_notifikace (
    od_uzivatele_id,
    pro_uzivatele_id,
    email_odeslan
) VALUES (?, ?, ?)
```

### ❌ WRONG Notification INSERT:
```php
INSERT INTO 25_notifikace (
    from_user_id,        // COLUMN DOESN'T EXIST!
    to_user_id,          // COLUMN DOESN'T EXIST!
    email_odeslany       // COLUMN DOESN'T EXIST!
) VALUES (?, ?, ?)
```

---

## NAMING CONVENTION RULES

1. **Czech naming**: Use Czech column names (`uzivatele`, `zprava`, `odeslan`)
2. **Underscore suffix**: IDs end with `_id` (not just `id`)
3. **Full names**: Use full words like `uzivatel_id` (not just `user_id`)
4. **Prefixes matter**: `od_uzivatele_id` vs `pro_uzivatele_id` (from vs to)
5. **Table prefixes**: Tables start with number prefix (`25_`, `25a_`)

---

## VERIFICATION CHECKLIST

Before committing any code that accesses DB tables:

- [ ] Run `DESCRIBE table_name` to verify column names
- [ ] Check that column exists in schema
- [ ] Use correct Czech column name
- [ ] Use table constants (TABLE_*) not hardcoded names
- [ ] Test with actual data on dev server
- [ ] Check Apache error.log for undefined index warnings

---

## IF YOU SEE THESE ERRORS:

### "Undefined index: odeslat_email_default"
→ Use `email_vychozi` instead

### "Undefined index: app_message"
→ Use `app_zprava` instead

### "Unknown column 'from_user_id' in field list"
→ Use `od_uzivatele_id` instead

### "Unknown column 'email_odeslany' in field list"
→ Use `email_odeslan` instead

### "Table '25_users' doesn't exist"
→ Use `TABLE_UZIVATELE` constant (resolves to `25_uzivatele`)

---

## QUICK DB SCHEMA LOOKUP

```bash
# Check notification template columns:
mysql -h 10.3.172.11 -u erdms_user -pAhchohTahnoh7eim eeo2025 -e "DESCRIBE 25_notifikace_sablony;"

# Check notification columns:
mysql -h 10.3.172.11 -u erdms_user -pAhchohTahnoh7eim eeo2025 -e "DESCRIBE 25_notifikace;"

# Check order columns:
mysql -h 10.3.172.11 -u erdms_user -pAhchohTahnoh7eim eeo2025 -e "DESCRIBE 25a_objednavky;"

# Check user columns:
mysql -h 10.3.172.11 -u erdms_user -pAhchohTahnoh7eim eeo2025 -e "DESCRIBE 25_uzivatele;"
```

---

## REMEMBER: When in doubt, DESCRIBE it out! 🔍
