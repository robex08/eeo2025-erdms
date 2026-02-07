# Notification Templates Expansion Plan

## Current State Analysis

### Existing Complete Template (Reference)
- **Template Type**: `order_status_ke_schvaleni` (ID: 2)
- **States**: 3 variants
  1. `APPROVER_NORMAL` - Normal notification for approver (orange gradient)
  2. `APPROVER_URGENT` - Urgent notification for approver (red gradient)
  3. `SUBMITTER` - Confirmation for submitter (green gradient)

### Database Schema
Table: `25_notification_templates`

| Column | Type | Description |
|--------|------|-------------|
| `id` | int(11) | Primary key |
| `type` | varchar(100) | Unique template type identifier |
| `name` | varchar(255) | Human-readable name |
| `email_subject` | varchar(500) | Email subject line with placeholders |
| `email_body` | text | HTML email body with recipient variants |
| `send_email_default` | tinyint(1) | Default send email flag |
| `app_title` | varchar(255) | In-app notification title |
| `app_message` | mediumtext | In-app notification message |
| `priority_default` | enum | low/normal/high/urgent |
| `active` | tinyint(1) | Template active status |
| `dt_created` | datetime | Creation timestamp |
| `dt_updated` | datetime | Last update timestamp |

## New Template Structure Requirements

### Simplified 2-State System
User requirement: New templates should have **only 2 states** (not 3 like ke_schvaleni):

1. **RECIPIENT** - Person receiving the notification (e.g., order creator after approval)
2. **SUBMITTER** - Person who performed the action (e.g., approver confirming their action)

**No URGENT variant** - All new templates use normal styling only.

### Color Schemes by Template Type

| Template | Recipient Color | Submitter Color | Primary Gradient |
|----------|----------------|-----------------|------------------|
| Schválena | Green #059669 | Blue #3b82f6 | Success |
| Zamítnuta | Red #dc2626 | Orange #f97316 | Alert/Warning |
| Vrácena k doplnění | Orange #f97316 | Blue #3b82f6 | Warning/Info |
| Odeslána dodavateli | Blue #3b82f6 | Green #059669 | Info/Success |
| Potvrzena dodavatelem | Green #10b981 | Blue #3b82f6 | Success |
| Faktura schválena | Green #059669 | Blue #3b82f6 | Success |
| Věcná správnost OK | Green #10b981 | Blue #3b82f6 | Success |
| Věcná správnost zamítnuta | Red #dc2626 | Orange #f97316 | Alert |

## Templates to Create

### Priority Group 1 - Core Approval Workflow (Already Have Placeholders)

#### 1. `order_status_schvalena` (ID: 3) ✅ EXISTS IN DB
**Current State**: Only subject defined: "✅ Objednávka {order_number} byla schválena"
**Needs**: HTML body with 2 states

**States:**
- **RECIPIENT** (Order Creator): "Vaše objednávka byla schválena"
  - Green gradient (#059669)
  - Message: Order approved by {approver_name}
  - CTA: "Zobrazit objednávku"
  
- **SUBMITTER** (Approver): "Potvrzení schválení objednávky"
  - Blue gradient (#3b82f6)
  - Message: You have approved order {order_number}
  - CTA: "Zobrazit schválenou objednávku"

**Placeholders:**
```
{order_number}, {order_id}, {predmet}, {strediska}, {financovani}, 
{financovani_poznamka}, {amount}, {date}, {approver_name}, 
{creator_name}, {approval_date}
```

---

#### 2. `order_status_zamitnuta` (ID: 4) ✅ EXISTS IN DB
**Current State**: Only subject defined: "❌ Objednávka {order_number} byla zamítnuta"
**Needs**: HTML body with 2 states

**States:**
- **RECIPIENT** (Order Creator): "Vaše objednávka byla zamítnuta"
  - Red gradient (#dc2626)
  - Message: Order rejected by {approver_name}
  - Rejection reason: {rejection_comment}
  - CTA: "Zobrazit důvod zamítnutí"
  
- **SUBMITTER** (Approver): "Potvrzení zamítnutí objednávky"
  - Orange gradient (#f97316)
  - Message: You have rejected order {order_number}
  - Your comment: {rejection_comment}
  - CTA: "Zobrazit zamítnutou objednávku"

**Placeholders:**
```
{order_number}, {order_id}, {predmet}, {strediska}, {amount}, 
{approver_name}, {creator_name}, {rejection_date}, 
{rejection_comment} (důvod zamítnutí)
```

---

#### 3. `order_status_ceka_se` (ID: 5) ✅ EXISTS IN DB
**Current State**: Only subject defined: "⏸️ Objednávka {order_number} čeká na doplnění"
**Needs**: HTML body with 2 states

**States:**
- **RECIPIENT** (Order Creator): "Objednávka vrácena k doplnění"
  - Orange gradient (#f97316)
  - Message: Order returned for completion by {approver_name}
  - Required changes: {revision_comment}
  - CTA: "Doplnit objednávku"
  
- **SUBMITTER** (Approver): "Potvrzení vrácení objednávky"
  - Blue gradient (#3b82f6)
  - Message: You have returned order {order_number} for completion
  - Your comment: {revision_comment}
  - CTA: "Zobrazit objednávku"

**Placeholders:**
```
{order_number}, {order_id}, {predmet}, {strediska}, {amount}, 
{approver_name}, {creator_name}, {revision_date}, 
{revision_comment} (co je třeba doplnit)
```

---

### Priority Group 2 - Supplier Communication (Important Statuses)

#### 4. `order_status_odeslana` (ID: 6) - NEW HTML NEEDED
**Current State**: Subject empty, needs complete template
**Proposed Subject**: "📤 Objednávka {order_number} odeslána dodavateli"

**States:**
- **RECIPIENT** (Supplier Contact / Order Manager): "Objednávka byla odeslána dodavateli"
  - Blue gradient (#3b82f6)
  - Message: Order sent to supplier {supplier_name}
  - CTA: "Zobrazit odeslanou objednávku"
  
- **SUBMITTER** (Person who sent): "Potvrzení odeslání dodavateli"
  - Green gradient (#059669)
  - Message: You have sent order {order_number} to supplier
  - CTA: "Zobrazit objednávku"

**Placeholders:**
```
{order_number}, {order_id}, {predmet}, {supplier_name}, 
{supplier_email}, {amount}, {sender_name}, {send_date}
```

---

#### 5. `order_status_potvrzena` (ID: 8) - NEW HTML NEEDED
**Current State**: Only subject: "✔️ Objednávka {order_number} potvrzena dodavatelem"

**States:**
- **RECIPIENT** (Order Creator / Manager): "Objednávka potvrzena dodavatelem"
  - Green gradient (#10b981)
  - Message: Supplier {supplier_name} confirmed order
  - Confirmed delivery date: {delivery_date}
  - CTA: "Zobrazit potvrzenou objednávku"
  
- **SUBMITTER** (Person who recorded confirmation): "Záznam potvrzení dodavatelem"
  - Blue gradient (#3b82f6)
  - Message: You have recorded supplier confirmation for order {order_number}
  - CTA: "Zobrazit objednávku"

**Placeholders:**
```
{order_number}, {order_id}, {predmet}, {supplier_name}, 
{delivery_date}, {confirmation_date}, {recorder_name}
```

---

### Priority Group 3 - Invoice Workflow (Financial)

#### 6. `order_status_faktura_schvalena` (ID: 17) ✅ EXISTS IN DB
**Current State**: Only subject: "✅ Faktura {invoice_number} schválena k úhradě"
**Needs**: HTML body with 2 states

**States:**
- **RECIPIENT** (Invoice Creator / Accountant): "Faktura schválena k úhradě"
  - Green gradient (#059669)
  - Message: Invoice approved for payment by {approver_name}
  - CTA: "Zobrazit schválenou fakturu"
  
- **SUBMITTER** (Financial Approver): "Potvrzení schválení faktury"
  - Blue gradient (#3b82f6)
  - Message: You have approved invoice {invoice_number} for payment
  - CTA: "Zobrazit fakturu"

**Placeholders:**
```
{invoice_number}, {invoice_id}, {order_number}, {supplier_name}, 
{amount}, {amount_without_dph}, {approver_name}, {approval_date}
```

---

### Priority Group 4 - Quality Control (Věcná správnost)

#### 7. `order_status_kontrola_potvrzena` (ID: 20) - NEW HTML NEEDED
**Current State**: Only subject: "✅ Věcná správnost potvrzena: {order_number}"

**States:**
- **RECIPIENT** (Order Creator / Manager): "Věcná správnost potvrzena"
  - Green gradient (#10b981)
  - Message: Quality control confirmed by {inspector_name}
  - CTA: "Zobrazit potvrzenou objednávku"
  
- **SUBMITTER** (Quality Inspector): "Záznam potvrzení věcné správnosti"
  - Blue gradient (#3b82f6)
  - Message: You have confirmed quality control for order {order_number}
  - CTA: "Zobrazit objednávku"

**Placeholders:**
```
{order_number}, {order_id}, {predmet}, {inspector_name}, 
{inspection_date}, {inspection_note}
```

---

#### 8. `order_status_kontrola_zamitnuta` (ID: 21) - NEW HTML NEEDED
**Current State**: Only subject: "❌ Věcná správnost zamítnuta: {order_number}"

**States:**
- **RECIPIENT** (Order Creator / Manager): "Věcná správnost zamítnuta - reklamace"
  - Red gradient (#dc2626)
  - Message: Quality control rejected by {inspector_name}
  - Issue description: {rejection_reason}
  - CTA: "Zobrazit reklamaci"
  
- **SUBMITTER** (Quality Inspector): "Záznam zamítnutí věcné správnosti"
  - Orange gradient (#f97316)
  - Message: You have rejected quality control for order {order_number}
  - Your finding: {rejection_reason}
  - CTA: "Zobrazit reklamaci"

**Placeholders:**
```
{order_number}, {order_id}, {predmet}, {inspector_name}, 
{rejection_date}, {rejection_reason}, {supplier_name}
```

---

## Implementation Approach

### Step 1: Create Base HTML Template Structure
```html
<!-- RECIPIENT: RECIPIENT -->
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <title>{{TITLE}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 8px;">
                    <!-- Header with gradient -->
                    <tr>
                        <td style="background: linear-gradient(135deg, {{COLOR1}}, {{COLOR2}}); padding: 30px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; text-align: center;">
                                {{ICON}} {{HEADER_TEXT}}
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            {{CONTENT}}
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                © 2025 EEO | Systém řízení objednávek
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

<!-- RECIPIENT: SUBMITTER -->
[Similar structure with different gradient/content]
```

### Step 2: SQL Update Scripts
For each template, execute:
```sql
UPDATE 25_notification_templates 
SET 
    email_body = '[HTML_WITH_BOTH_RECIPIENT_VARIANTS]',
    email_subject = '[UPDATED_SUBJECT]',
    dt_updated = NOW()
WHERE type = '[TEMPLATE_TYPE]';
```

### Step 3: Validation Checklist
For each template:
- [ ] Both recipient variants present (RECIPIENT, SUBMITTER)
- [ ] Correct color gradients applied
- [ ] All placeholders documented and used
- [ ] Subject line includes emoji and key info
- [ ] CTA button links to correct URL
- [ ] Mobile-responsive styling
- [ ] Tested in mail client preview

### Step 4: Testing Strategy
1. Create test PHP script with template rendering function
2. Test each template with sample data
3. Send test emails to verify rendering in:
   - Gmail
   - Outlook
   - Apple Mail
4. Verify placeholder replacement works correctly

## Template Priority Order

### Implementation Phases

**Phase 1 (Critical - Complete existing):**
1. ✅ order_status_schvalena (ID: 3)
2. ✅ order_status_zamitnuta (ID: 4)
3. ✅ order_status_ceka_se (ID: 5)

**Phase 2 (Important - Supplier workflow):**
4. ✅ order_status_odeslana (ID: 6)
5. ✅ order_status_potvrzena (ID: 8)

**Phase 3 (Financial):**
6. ✅ order_status_faktura_schvalena (ID: 17)

**Phase 4 (Quality control):**
7. ✅ order_status_kontrola_potvrzena (ID: 20)
8. ✅ order_status_kontrola_zamitnuta (ID: 21)

## Future Enhancements

### Integration with Hierarchy System
Once templates are complete, apply hierarchy rules:
- Determine which hierarchical relations should receive notifications
- Filter recipients based on hierarchy profiles
- Apply permission checks before sending notifications

### Template Variables Standardization
Create unified placeholder mapping service:
- Consistent naming across all templates
- Automatic data fetching from order/invoice objects
- Fallback values for missing data
- Date/time formatting standards

## Files to Modify/Create

1. **SQL Update Scripts**
   - `/var/www/erdms-dev/UPDATE_NOTIFICATION_TEMPLATES_PHASE1.sql`
   - `/var/www/erdms-dev/UPDATE_NOTIFICATION_TEMPLATES_PHASE2.sql`
   - `/var/www/erdms-dev/UPDATE_NOTIFICATION_TEMPLATES_PHASE3.sql`
   - `/var/www/erdms-dev/UPDATE_NOTIFICATION_TEMPLATES_PHASE4.sql`

2. **Test Scripts**
   - `/var/www/erdms-dev/test-notification-templates.php` (generate test emails)
   - `/var/www/erdms-dev/preview-notification-templates.php` (HTML preview in browser)

3. **Documentation**
   - This plan document (NOTIFICATION_TEMPLATES_EXPANSION_PLAN.md)
   - `/var/www/erdms-dev/NOTIFICATION_TEMPLATES_PLACEHOLDERS.md` (placeholder reference)

## Notes

- User specifically requested **no "Mimoradka" (urgent) variant** for new templates
- Existing ke_schvaleni template can remain with 3 variants as it's already complete
- Focus on consistency: Same structure across all new templates
- Color gradients should reflect the action type (success=green, alert=red, info=blue, warning=orange)
- All recipient types should use comment-based markers: `<!-- RECIPIENT: TYPE -->`
