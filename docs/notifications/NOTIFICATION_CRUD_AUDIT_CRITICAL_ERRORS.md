# NOTIFICATION CRUD AUDIT - CRITICAL COLUMN NAME ERRORS

## EXECUTIVE SUMMARY
**CRITICAL FINDING**: Multiple column name mismatches discovered between code and actual DB schema causing 500 errors.

## DATABASE SCHEMA (ACTUAL)

### 25_notifikace (19 columns)
```sql
id                  bigint(20) AUTO_INCREMENT
typ                 varchar(64)
nadpis              varchar(255)
zprava              text
data_json           text
od_uzivatele_id     int(11)           ← ✅ CORRECT in code
pro_uzivatele_id    int(11)           ← ✅ CORRECT in code
prijemci_json       text              ← ✅ CORRECT in code
pro_vsechny         tinyint(1)        ← ✅ CORRECT in code
priorita            enum('EXCEPTIONAL','APPROVAL','INFO')
kategorie           varchar(32)
odeslat_email       tinyint(1)        ← ✅ CORRECT in INSERT
email_odeslan       tinyint(1)        ← ✅ CORRECT in UPDATE (line 940)
email_odeslan_kdy   datetime          ← ✅ CORRECT in UPDATE (line 940)
objekt_typ          varchar(32)       ← ✅ CORRECT in code
objekt_id           bigint(20)        ← ✅ CORRECT in code
dt_created          datetime
dt_expires          datetime
aktivni             tinyint(1)        ← ✅ CORRECT in code
```

### 25_notifikace_sablony (12 columns)
```sql
id                  int(11) AUTO_INCREMENT
typ                 varchar(100) UNIQUE
nazev               varchar(255)        ← ✅ CORRECT in code
email_predmet       varchar(500)        ← ✅ CORRECT in code
email_telo          text                ← ✅ CORRECT in code
email_vychozi       tinyint(1)          ← ❌ WRONG: code uses 'odeslat_email_default'
app_nadpis          varchar(255)        ← ✅ CORRECT in code
app_zprava          mediumtext          ← ❌ WRONG: code uses 'app_message'
priorita_vychozi    enum('low','normal','high','urgent')  ← ✅ CORRECT
aktivni             tinyint(1)          ← ✅ CORRECT
dt_created          datetime
dt_updated          datetime
```

## CRITICAL ERRORS FOUND

### ERROR #1: `odeslat_email_default` → SHOULD BE `email_vychozi`
**File**: notificationHandlers.php
**Lines with WRONG column name**:
- Line 860: `$template['odeslat_email_default']` ← CRASHES HERE
- Line 1124: `'odeslat_email_default' => $template['odeslat_email_default']`
- Line 1182: `'odeslat_email_default' => $template['odeslat_email_default']`

**Impact**: FATAL - Attempting to access undefined array key, likely causing silent death of PHP process

**Fix Required**:
```php
// WRONG:
$odeslat_email = isset($input['odeslat_email']) ? (int)$input['odeslat_email'] : (int)$template['odeslat_email_default'];

// CORRECT:
$odeslat_email = isset($input['odeslat_email']) ? (int)$input['odeslat_email'] : (int)$template['email_vychozi'];
```

### ERROR #2: `app_message` → SHOULD BE `app_zprava`
**File**: notificationHandlers.php
**Lines with WRONG column name**:
- Line 793: `$template['app_message']`
- Line 1098: `$template['app_message']`
- Line 1103: `$template['app_message']` (in preg_match_all)
- Line 1179: `'app_message' => $template['app_message']`

**Impact**: HIGH - Placeholder replacement fails, notification message is empty or corrupt

**Fix Required**:
```php
// WRONG:
$app_message = notif_replacePlaceholders($template['app_message'], $placeholderData);

// CORRECT:
$app_message = notif_replacePlaceholders($template['app_zprava'], $placeholderData);
```

### ERROR #3: Missing `kategorie` column in template
**File**: notificationHandlers.php
**Line**: 2186: `':kategorie' => $template['kategorie']`

**Impact**: MEDIUM - Template doesn't have 'kategorie' column (not in DESCRIBE output)

**Fix Required**:
```php
// WRONG:
':kategorie' => $template['kategorie'],

// CORRECT:
':kategorie' => isset($input['kategorie']) ? $input['kategorie'] : 'general',
```

## ALL TEMPLATE COLUMN REFERENCES (36 matches)

### ✅ CORRECT References (using actual DB columns):
- Line 720: `$template['nazev']` ✓
- Line 756: `$template['priorita_vychozi']` ✓
- Line 791: `$template['app_nadpis']` ✓
- Line 795: `$template['email_predmet']` ✓
- Line 797: `$template['email_telo']` ✓
- Line 858: `$template['priorita_vychozi']` ✓
- Line 1093: `$template['priorita_vychozi']` ✓
- Line 1097: `$template['app_nadpis']` ✓
- Line 1099: `$template['email_predmet']` ✓
- Line 1100: `$template['email_telo']` ✓
- Line 1103: `$template['app_nadpis']` ✓
- Line 1123: `$template['priorita_vychozi']` ✓
- Line 1175-1186: All correct except 'app_message' and 'odeslat_email_default'
- Line 2133: `$template['email_telo']` ✓
- Line 2149: `$template['app_nadpis']` ✓
- Line 2150: `$template['app_zprava']` ✓ (THIS ONE IS CORRECT!)
- Line 2154: `$template['app_nadpis']` ✓
- Line 2155: `$template['app_zprava']` ✓ (THIS ONE IS CORRECT!)
- Line 2156: `$template['email_telo']` ✓

### ❌ WRONG References (using non-existent columns):
- Line 793: `$template['app_message']` → should be `app_zprava`
- Line 860: `$template['odeslat_email_default']` → should be `email_vychozi`
- Line 1098: `$template['app_message']` → should be `app_zprava`
- Line 1103: `$template['app_message']` → should be `app_zprava`
- Line 1124: `$template['odeslat_email_default']` → should be `email_vychozi`
- Line 1179: `'app_message' => $template['app_message']` → should be `app_zprava`
- Line 1182: `$template['odeslat_email_default']` → should be `email_vychozi`
- Line 2186: `$template['kategorie']` → column doesn't exist in template table

## ROOT CAUSE ANALYSIS

**Why process dies silently**:
1. Frontend calls `/notifications/trigger`
2. Backend loads template from DB with `SELECT *`
3. Code attempts to access `$template['odeslat_email_default']` on line 860
4. PHP encounters undefined array key
5. Depending on error_reporting settings, this either:
   - Throws warning/notice that's not caught → process continues with NULL value → later SQL fails
   - OR array access on undefined key causes fatal error in strict mode
6. No exception handler catches this → Apache returns 500
7. Debug logs show execution reaches line 2050 (notificationRouter START) but dies before reaching placeholder loading

**Likely execution path**:
```
handle_notifications_trigger (line 2867) ✓ Logged
  └─> notificationRouter (line 2050) ✓ Logged
      └─> loadOrderPlaceholders (line 1468) ← Dies here before SQL executes
          OR
      └─> sendNotificationsToRecipients (line 2105)
          └─> Lines 2120-2186 template loading & processing ← Dies here
```

## VERIFICATION STEPS

1. ✅ Verified INSERT statements use correct column names
2. ✅ Verified UPDATE statements use correct column names  
3. ❌ Found template column access uses WRONG names
4. ⚠️ Inconsistent usage: Some places use `app_zprava` (correct), others use `app_message` (wrong)

## RECOMMENDED FIX ORDER (by priority)

### PRIORITY 1 (CRITICAL - Causes 500 error):
1. Fix line 860: `odeslat_email_default` → `email_vychozi`
2. Fix line 1124: `odeslat_email_default` → `email_vychozi`
3. Fix line 1182: `odeslat_email_default` → `email_vychozi`

### PRIORITY 2 (HIGH - Breaks functionality):
4. Fix line 793: `app_message` → `app_zprava`
5. Fix line 1098: `app_message` → `app_zprava`
6. Fix line 1103: `app_message` → `app_zprava`
7. Fix line 1179: `'app_message'` → `'app_zprava'`

### PRIORITY 3 (MEDIUM - Error handling):
8. Fix line 2186: Remove `$template['kategorie']`, use fallback

## INTERESTING FINDING

Lines 2150 and 2155 **DO** use the correct `app_zprava` column name! This suggests:
- The code was partially updated in some functions (sendNotificationsToRecipients)
- But older functions (handle_notifications_create_simple) still use old column names
- This inconsistency caused the bug to be missed during testing

## NEXT STEPS

1. Apply all 8 fixes in multi_replace_string_in_file operation
2. Restart Apache to clear any cached code
3. Test order creation with notification trigger
4. Verify debug logs show complete execution without errors
5. Check notification appears in DB correctly
