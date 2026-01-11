-- ============================================================================
-- SQL Skript pro aktualizaci notifikačních šablon - FÁZE 1
-- Základní schvalovací workflow (Schválena, Zamítnuta, Čeká se)
-- Generováno: 2025-12-15 22:10:22
-- ============================================================================

-- ============================================================================
-- Template: order_status_schvalena
-- ============================================================================

UPDATE 25_notification_templates SET
    email_body = '<!-- RECIPIENT: RECIPIENT -->
<!DOCTYPE html>
<html lang=\"cs\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>Objednávka schválena</title>
</head>
<body style=\"margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; background-color: #f5f5f5;\">
    <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse; background-color: #f5f5f5;\">
        <tr>
            <td align=\"center\" style=\"padding: 40px 20px;\">
                <table role=\"presentation\" style=\"max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;\">
                    <!-- Header -->
                    <tr>
                        <td style=\"background: linear-gradient(135deg, #059669, #047857); padding: 30px; border-radius: 8px 8px 0 0;\">
                            <h1 style=\"margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; text-align: center;\">
                                ✅ Objednávka schválena
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style=\"padding: 40px 30px;\">
                            <p style=\"margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;\">
                                Dobrý den <strong>{creator_name}</strong>,
                            </p>
                            
                            <p style=\"margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #374151;\">
                                vaše objednávka byla <strong>úspěšně schválena</strong> uživatelem <strong>{approver_name}</strong>.
                            </p>
                            
                            <!-- Order Details Card -->
                            <div style=\"background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 20px; margin-bottom: 30px;\">
                                <h2 style=\"margin: 0 0 15px; color: #1f2937; font-size: 18px; font-weight: 600;\">
                                    📋 Detaily schválené objednávky
                                </h2>
                                <table style=\"width: 100%; border-collapse: collapse;\">
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Číslo objednávky:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{order_number}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Předmět:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{predmet}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Střediska:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{strediska}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Zdroj financování:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{financovani}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Poznámka:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{financovani_poznamka}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Cena s DPH:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 700; font-size: 16px;\">{amount}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Schválil:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{approver_name}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Datum schválení:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{approval_date}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA Button -->
                            <div style=\"text-align: center; margin: 30px 0;\">
                                <a href=\"https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}\" style=\"display: inline-block; background: linear-gradient(135deg, #059669, #047857); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.3);\">
                                    👁️ Zobrazit schválenou objednávku
                                </a>
                            </div>
                            
                            <p style=\"margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;\">
                                Tento e-mail byl automaticky vygenerován systémem EEO.<br>
                                Nyní můžete pokračovat v dalších krocích objednávkového procesu.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style=\"background-color: #f9fafb; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px;\">
                            <p style=\"margin: 0; font-size: 12px; color: #9ca3af;\">
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
<!DOCTYPE html>
<html lang=\"cs\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>Potvrzení schválení objednávky</title>
</head>
<body style=\"margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; background-color: #f5f5f5;\">
    <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse; background-color: #f5f5f5;\">
        <tr>
            <td align=\"center\" style=\"padding: 40px 20px;\">
                <table role=\"presentation\" style=\"max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;\">
                    <!-- Header -->
                    <tr>
                        <td style=\"background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 30px; border-radius: 8px 8px 0 0;\">
                            <h1 style=\"margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; text-align: center;\">
                                ✅ Potvrzení schválení objednávky
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style=\"padding: 40px 30px;\">
                            <p style=\"margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;\">
                                Dobrý den <strong>{approver_name}</strong>,
                            </p>
                            
                            <p style=\"margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #374151;\">
                                toto je potvrzení, že jste <strong>schválili objednávku</strong> č. <strong>{order_number}</strong>. Tvůrce objednávky byl informován o schválení.
                            </p>
                            
                            <!-- Order Details Card -->
                            <div style=\"background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 20px; margin-bottom: 30px;\">
                                <h2 style=\"margin: 0 0 15px; color: #1f2937; font-size: 18px; font-weight: 600;\">
                                    📋 Detaily schválené objednávky
                                </h2>
                                <table style=\"width: 100%; border-collapse: collapse;\">
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Číslo objednávky:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{order_number}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Předmět:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{predmet}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Střediska:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{strediska}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Zdroj financování:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{financovani}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Poznámka:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{financovani_poznamka}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Cena s DPH:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 700; font-size: 16px;\">{amount}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Tvůrce objednávky:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{creator_name}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Datum schválení:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{approval_date}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA Button -->
                            <div style=\"text-align: center; margin: 30px 0;\">
                                <a href=\"https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}\" style=\"display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);\">
                                    👁️ Zobrazit schválenou objednávku
                                </a>
                            </div>
                            
                            <p style=\"margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;\">
                                Tento e-mail byl automaticky vygenerován systémem EEO.<br>
                                Záznam o vašem schválení byl uložen do systému.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style=\"background-color: #f9fafb; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px;\">
                            <p style=\"margin: 0; font-size: 12px; color: #9ca3af;\">
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
',
    email_subject = '✅ Objednávka {order_number} byla schválena',
    app_title = '✅ Schválena: {order_number}',
    app_message = 'Objednávka {order_number}: \"{order_subject}\" byla schválena uživatelem {approver_name}. Datum schválení: {approval_date}.',
    priority_default = 'normal',
    dt_updated = NOW()
WHERE type = 'order_status_schvalena';

-- Ověření aktualizace:
SELECT id, type, name, LENGTH(email_body) as body_length, email_subject, active, dt_updated
FROM 25_notification_templates WHERE type = 'order_status_schvalena';

-- ============================================================================
-- Template: order_status_zamitnuta
-- ============================================================================

UPDATE 25_notification_templates SET
    email_body = '<!-- RECIPIENT: RECIPIENT -->
<!DOCTYPE html>
<html lang=\"cs\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>Objednávka zamítnuta</title>
</head>
<body style=\"margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; background-color: #f5f5f5;\">
    <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse; background-color: #f5f5f5;\">
        <tr>
            <td align=\"center\" style=\"padding: 40px 20px;\">
                <table role=\"presentation\" style=\"max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;\">
                    <!-- Header -->
                    <tr>
                        <td style=\"background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 30px; border-radius: 8px 8px 0 0;\">
                            <h1 style=\"margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; text-align: center;\">
                                ❌ Objednávka zamítnuta
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style=\"padding: 40px 30px;\">
                            <p style=\"margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;\">
                                Dobrý den <strong>{creator_name}</strong>,
                            </p>
                            
                            <p style=\"margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #374151;\">
                                vaše objednávka byla <strong>zamítnuta</strong> uživatelem <strong>{approver_name}</strong>.
                            </p>
                            
                            <!-- Rejection Reason Card -->
                            <div style=\"background: #fef2f2; border: 2px solid #fecaca; border-radius: 6px; padding: 20px; margin-bottom: 30px;\">
                                <h2 style=\"margin: 0 0 15px; color: #991b1b; font-size: 18px; font-weight: 600;\">
                                    📝 Důvod zamítnutí
                                </h2>
                                <p style=\"margin: 0; color: #1f2937; font-size: 15px; line-height: 1.6; white-space: pre-wrap;\">{rejection_comment}</p>
                            </div>
                            
                            <!-- Order Details Card -->
                            <div style=\"background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 30px;\">
                                <h2 style=\"margin: 0 0 15px; color: #1f2937; font-size: 18px; font-weight: 600;\">
                                    📋 Detaily zamítnuté objednávky
                                </h2>
                                <table style=\"width: 100%; border-collapse: collapse;\">
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Číslo objednávky:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{order_number}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Předmět:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{predmet}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Střediska:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{strediska}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Cena s DPH:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 700; font-size: 16px;\">{amount}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Zamítl:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{approver_name}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Datum zamítnutí:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{rejection_date}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA Button -->
                            <div style=\"text-align: center; margin: 30px 0;\">
                                <a href=\"https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}\" style=\"display: inline-block; background: linear-gradient(135deg, #dc2626, #b91c1c); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);\">
                                    👁️ Zobrazit důvod zamítnutí
                                </a>
                            </div>
                            
                            <p style=\"margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;\">
                                Tento e-mail byl automaticky vygenerován systémem EEO.<br>
                                Můžete vytvořit novou objednávku s opraveným obsahem nebo kontaktovat schvalovatele pro více informací.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style=\"background-color: #f9fafb; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px;\">
                            <p style=\"margin: 0; font-size: 12px; color: #9ca3af;\">
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
<!DOCTYPE html>
<html lang=\"cs\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>Potvrzení zamítnutí objednávky</title>
</head>
<body style=\"margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; background-color: #f5f5f5;\">
    <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse; background-color: #f5f5f5;\">
        <tr>
            <td align=\"center\" style=\"padding: 40px 20px;\">
                <table role=\"presentation\" style=\"max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;\">
                    <!-- Header -->
                    <tr>
                        <td style=\"background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; border-radius: 8px 8px 0 0;\">
                            <h1 style=\"margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; text-align: center;\">
                                ❌ Potvrzení zamítnutí objednávky
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style=\"padding: 40px 30px;\">
                            <p style=\"margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;\">
                                Dobrý den <strong>{approver_name}</strong>,
                            </p>
                            
                            <p style=\"margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #374151;\">
                                toto je potvrzení, že jste <strong>zamítli objednávku</strong> č. <strong>{order_number}</strong>. Tvůrce objednávky byl informován o zamítnutí a důvodu.
                            </p>
                            
                            <!-- Your Rejection Reason Card -->
                            <div style=\"background: #fff7ed; border: 2px solid #fed7aa; border-radius: 6px; padding: 20px; margin-bottom: 30px;\">
                                <h2 style=\"margin: 0 0 15px; color: #9a3412; font-size: 18px; font-weight: 600;\">
                                    📝 Váš důvod zamítnutí
                                </h2>
                                <p style=\"margin: 0; color: #1f2937; font-size: 15px; line-height: 1.6; white-space: pre-wrap;\">{rejection_comment}</p>
                            </div>
                            
                            <!-- Order Details Card -->
                            <div style=\"background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 30px;\">
                                <h2 style=\"margin: 0 0 15px; color: #1f2937; font-size: 18px; font-weight: 600;\">
                                    📋 Detaily zamítnuté objednávky
                                </h2>
                                <table style=\"width: 100%; border-collapse: collapse;\">
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Číslo objednávky:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{order_number}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Předmět:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{predmet}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Střediska:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{strediska}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Cena s DPH:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 700; font-size: 16px;\">{amount}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Tvůrce objednávky:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{creator_name}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Datum zamítnutí:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{rejection_date}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA Button -->
                            <div style=\"text-align: center; margin: 30px 0;\">
                                <a href=\"https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}\" style=\"display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);\">
                                    👁️ Zobrazit zamítnutou objednávku
                                </a>
                            </div>
                            
                            <p style=\"margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;\">
                                Tento e-mail byl automaticky vygenerován systémem EEO.<br>
                                Záznam o vašem zamítnutí byl uložen do systému.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style=\"background-color: #f9fafb; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px;\">
                            <p style=\"margin: 0; font-size: 12px; color: #9ca3af;\">
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
',
    email_subject = '❌ Objednávka {order_number} byla zamítnuta',
    app_title = '❌ Zamítnuta: {order_number}',
    app_message = 'Objednávka {order_number} byla zamítnuta uživatelem {approver_name}. Důvod: {rejection_comment}',
    priority_default = 'high',
    dt_updated = NOW()
WHERE type = 'order_status_zamitnuta';

-- Ověření aktualizace:
SELECT id, type, name, LENGTH(email_body) as body_length, email_subject, active, dt_updated
FROM 25_notification_templates WHERE type = 'order_status_zamitnuta';

-- ============================================================================
-- Template: order_status_ceka_se
-- ============================================================================

UPDATE 25_notification_templates SET
    email_body = '<!-- RECIPIENT: RECIPIENT -->
<!DOCTYPE html>
<html lang=\"cs\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>Objednávka vrácena k doplnění</title>
</head>
<body style=\"margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; background-color: #f5f5f5;\">
    <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse; background-color: #f5f5f5;\">
        <tr>
            <td align=\"center\" style=\"padding: 40px 20px;\">
                <table role=\"presentation\" style=\"max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;\">
                    <!-- Header -->
                    <tr>
                        <td style=\"background: linear-gradient(135deg, #f97316, #fb923c); padding: 30px; border-radius: 8px 8px 0 0;\">
                            <h1 style=\"margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; text-align: center;\">
                                ⏸️ Objednávka vrácena k doplnění
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style=\"padding: 40px 30px;\">
                            <p style=\"margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;\">
                                Dobrý den <strong>{creator_name}</strong>,
                            </p>
                            
                            <p style=\"margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #374151;\">
                                vaše objednávka byla <strong>vrácena k doplnění</strong> uživatelem <strong>{approver_name}</strong>. Po doplnění požadovaných údajů prosím objednávku znovu odešlete ke schválení.
                            </p>
                            
                            <!-- Revision Notes Card -->
                            <div style=\"background: #fff7ed; border: 2px solid #fed7aa; border-radius: 6px; padding: 20px; margin-bottom: 30px;\">
                                <h2 style=\"margin: 0 0 15px; color: #9a3412; font-size: 18px; font-weight: 600;\">
                                    📝 Co je třeba doplnit/upravit
                                </h2>
                                <p style=\"margin: 0; color: #1f2937; font-size: 15px; line-height: 1.6; white-space: pre-wrap;\">{revision_comment}</p>
                            </div>
                            
                            <!-- Order Details Card -->
                            <div style=\"background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 30px;\">
                                <h2 style=\"margin: 0 0 15px; color: #1f2937; font-size: 18px; font-weight: 600;\">
                                    📋 Detaily objednávky
                                </h2>
                                <table style=\"width: 100%; border-collapse: collapse;\">
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Číslo objednávky:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{order_number}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Předmět:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{predmet}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Střediska:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{strediska}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Cena s DPH:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 700; font-size: 16px;\">{amount}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Vrátil:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{approver_name}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Datum vrácení:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{revision_date}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA Button -->
                            <div style=\"text-align: center; margin: 30px 0;\">
                                <a href=\"https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}\" style=\"display: inline-block; background: linear-gradient(135deg, #f97316, #fb923c); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);\">
                                    ✏️ Doplnit a odeslat objednávku
                                </a>
                            </div>
                            
                            <p style=\"margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;\">
                                Tento e-mail byl automaticky vygenerován systémem EEO.<br>
                                Po doplnění požadovaných údajů nezapomeňte objednávku znovu odeslat ke schválení.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style=\"background-color: #f9fafb; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px;\">
                            <p style=\"margin: 0; font-size: 12px; color: #9ca3af;\">
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
<!DOCTYPE html>
<html lang=\"cs\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>Potvrzení vrácení objednávky</title>
</head>
<body style=\"margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; background-color: #f5f5f5;\">
    <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse; background-color: #f5f5f5;\">
        <tr>
            <td align=\"center\" style=\"padding: 40px 20px;\">
                <table role=\"presentation\" style=\"max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;\">
                    <!-- Header -->
                    <tr>
                        <td style=\"background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 30px; border-radius: 8px 8px 0 0;\">
                            <h1 style=\"margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; text-align: center;\">
                                ⏸️ Potvrzení vrácení objednávky
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style=\"padding: 40px 30px;\">
                            <p style=\"margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;\">
                                Dobrý den <strong>{approver_name}</strong>,
                            </p>
                            
                            <p style=\"margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #374151;\">
                                toto je potvrzení, že jste <strong>vrátili objednávku k doplnění</strong> č. <strong>{order_number}</strong>. Tvůrce objednávky byl informován o požadavcích na doplnění.
                            </p>
                            
                            <!-- Your Revision Notes Card -->
                            <div style=\"background: #eff6ff; border: 2px solid #bfdbfe; border-radius: 6px; padding: 20px; margin-bottom: 30px;\">
                                <h2 style=\"margin: 0 0 15px; color: #1e40af; font-size: 18px; font-weight: 600;\">
                                    📝 Vaše požadavky na doplnění
                                </h2>
                                <p style=\"margin: 0; color: #1f2937; font-size: 15px; line-height: 1.6; white-space: pre-wrap;\">{revision_comment}</p>
                            </div>
                            
                            <!-- Order Details Card -->
                            <div style=\"background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 30px;\">
                                <h2 style=\"margin: 0 0 15px; color: #1f2937; font-size: 18px; font-weight: 600;\">
                                    📋 Detaily objednávky
                                </h2>
                                <table style=\"width: 100%; border-collapse: collapse;\">
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Číslo objednávky:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{order_number}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Předmět:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{predmet}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Střediska:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{strediska}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Cena s DPH:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 700; font-size: 16px;\">{amount}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Tvůrce objednávky:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{creator_name}</td>
                                    </tr>
                                    <tr>
                                        <td style=\"padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;\">Datum vrácení:</td>
                                        <td style=\"padding: 8px 0; color: #1f2937; font-size: 14px;\">{revision_date}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA Button -->
                            <div style=\"text-align: center; margin: 30px 0;\">
                                <a href=\"https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}\" style=\"display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);\">
                                    👁️ Zobrazit objednávku
                                </a>
                            </div>
                            
                            <p style=\"margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;\">
                                Tento e-mail byl automaticky vygenerován systémem EEO.<br>
                                Objednávka bude znovu odeslána ke schválení po doplnění požadovaných údajů.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style=\"background-color: #f9fafb; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px;\">
                            <p style=\"margin: 0; font-size: 12px; color: #9ca3af;\">
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
',
    email_subject = '⏸️ Objednávka {order_number} čeká na doplnění',
    app_title = '⏸️ K doplnění: {order_number}',
    app_message = 'Objednávka {order_number} vrácena k doplnění uživatelem {approver_name}. Požadavky: {revision_comment}',
    priority_default = 'high',
    dt_updated = NOW()
WHERE type = 'order_status_ceka_se';

-- Ověření aktualizace:
SELECT id, type, name, LENGTH(email_body) as body_length, email_subject, active, dt_updated
FROM 25_notification_templates WHERE type = 'order_status_ceka_se';

-- ============================================================================
-- Kontrola všech aktualizovaných šablon
-- ============================================================================

SELECT id, type, name, LENGTH(email_body) as body_length, email_subject, active, dt_updated
FROM 25_notification_templates
WHERE type IN ('order_status_schvalena', 'order_status_zamitnuta', 'order_status_ceka_se')
ORDER BY id;

-- ============================================================================
-- KONEC SKRIPTU
-- ============================================================================
