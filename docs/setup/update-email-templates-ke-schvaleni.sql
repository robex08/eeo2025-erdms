-- =================================================================================
-- UPDATE EMAIL ŠABLON - order_status_ke_schvaleni
-- =================================================================================
-- Datum: 7.12.2025
-- Popis: Update 3 variant emailových šablon pro "ke schválení" stav objednávky
-- Tabulka: 25_notification_templates
-- =================================================================================

USE eeo2025;

-- VARIANTA 1: APPROVER_NORMAL (Oranžová) - Pro běžné schválení (UPDATE existujícího)
UPDATE 25_notification_templates 
SET 
  email_subject = 'EEO: Nová objednávka ke schválení #{order_number}',
  email_body = '<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nová objednávka ke schválení</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #f97316, #fb923c); padding: 30px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; text-align: center;">
                                ❗ Nová objednávka ke schválení
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                                Dobrý den <strong>{approver_name}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #374151;">
                                byla vytvořena <strong>nová objednávka</strong>, která vyžaduje vaše schválení.
                            </p>
                            
                            <!-- Order Details Card -->
                            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
                                <h2 style="margin: 0 0 15px; color: #1f2937; font-size: 18px; font-weight: 600;">
                                    📋 Detaily objednávky
                                </h2>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Číslo objednávky:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{order_number}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Předmět:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{predmet}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Střediska:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{strediska}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Zdroj financování:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{financovani}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Poznámka:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{financovani_poznamka}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Cena s DPH:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 700; font-size: 16px;">{amount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Datum vytvoření:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{date}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #fb923c); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);">
                                    👁️ Zobrazit a schválit objednávku
                                </a>
                            </div>
                            
                            <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                                Tento e-mail byl automaticky vygenerován systémem EEO.<br>
                                Pro schválení nebo zamítnutí objednávky prosím použijte tlačítko výše.
                            </p>
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
</html>'
WHERE type = 'order_status_ke_schvaleni' AND name LIKE '%NORMAL%';

-- VARIANTA 2: APPROVER_URGENT (Červená) - Pro urgentní schválení  
UPDATE 25_notification_templates 
SET 
  email_subject = 'EEO: ⚡ URGENTNÍ - Nová objednávka ke schválení #{order_number}',
  email_body = '<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nová objednávka ke schválení</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 30px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; text-align: center;">
                                <span style="display: inline-block; font-family: ''Segoe UI Symbol'', ''Apple Color Emoji'', sans-serif; font-style: normal; color: #dc2626; font-size: 32px; font-weight: bold; text-shadow: -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, -3px 0 0 #fff, 3px 0 0 #fff, 0 -3px 0 #fff, 0 3px 0 #fff;">⚡</span> Nová objednávka ke schválení
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                                Dobrý den <strong>{approver_name}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #374151;">
                                byla vytvořena <strong>nová objednávka</strong>, která vyžaduje vaše schválení.
                            </p>
                            
                            <!-- Order Details Card -->
                            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
                                <h2 style="margin: 0 0 15px; color: #1f2937; font-size: 18px; font-weight: 600;">
                                    📋 Detaily objednávky
                                </h2>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Číslo objednávky:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{order_number}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Předmět:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{predmet}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Střediska:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{strediska}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Zdroj financování:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{financovani}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Poznámka:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{financovani_poznamka}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Cena s DPH:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 700; font-size: 16px;">{amount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Datum vytvoření:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{date}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}" style="display: inline-block; background: linear-gradient(135deg, #dc2626, #b91c1c); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);">
                                    👁️ Zobrazit a schválit objednávku
                                </a>
                            </div>
                            
                            <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                                Tento e-mail byl automaticky vygenerován systémem EEO.<br>
                                Pro schválení nebo zamítnutí objednávky prosím použijte tlačítko výše.
                            </p>
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
</html>'
WHERE type = 'order_status_ke_schvaleni' AND name LIKE '%URGENT%';

-- VARIANTA 3: SUBMITTER (Zelená) - Pro zadavatele objednávky
UPDATE 25_notification_templates 
SET 
  email_subject = 'EEO: Vaše objednávka byla odeslána ke schválení #{order_number}',
  email_body = '<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vaše objednávka byla odeslána ke schválení</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #059669, #047857); padding: 30px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; text-align: center;">
                                ✅ Objednávka odeslána ke schválení
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                                Dobrý den <strong>{user_name}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #374151;">
                                vaše objednávka byla <strong>úspěšně odeslána ke schválení</strong>. O jejím schválení nebo zamítnutí budete informováni e-mailem.
                            </p>
                            
                            <!-- Order Details Card -->
                            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
                                <h2 style="margin: 0 0 15px; color: #1f2937; font-size: 18px; font-weight: 600;">
                                    📋 Detaily vaší objednávky
                                </h2>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Číslo objednávky:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{order_number}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Předmět:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{predmet}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Střediska:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{strediska}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Zdroj financování:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{financovani}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Poznámka:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{financovani_poznamka}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Cena s DPH:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 700; font-size: 16px;">{amount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Datum vytvoření:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{date}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Schvalovatel:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{approver_name}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}" style="display: inline-block; background: linear-gradient(135deg, #059669, #047857); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.3);">
                                    👁️ Zobrazit objednávku
                                </a>
                            </div>
                            
                            <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                                Tento e-mail byl automaticky vygenerován systémem EEO.<br>
                                Jakmile bude objednávka schválena nebo zamítnuta, dostanete další e-mail s informací o výsledku.
                            </p>
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
</html>'
WHERE type = 'order_status_ke_schvaleni' AND name LIKE '%SUBMITTER%';

-- Kontrola výsledků
SELECT id, type, name, email_subject, dt_created 
FROM 25_notification_templates 
WHERE type = 'order_status_ke_schvaleni'
ORDER BY id;
