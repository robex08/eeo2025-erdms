-- Aktualizace šablony: order_status_ke_schvaleni
-- Popis: HTML email šablona pro notifikaci příkazce o nové objednávce ke schválení
-- Poznámka: app_title a app_message (zvoneček) zůstávají beze změny

USE eeo2025;

-- Aktualizace email předmětu a těla (HTML šablona s červeným gradientem)
UPDATE 25_notification_templates 
SET 
    email_subject = 'EEO: Nová objednávka ke schválení #{order_number}',
    email_body = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 30px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                                Nová objednávka ke schválení
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px;">
                            <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                Dobrý den <strong>{approver_name}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 25px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                v systému EEO 2025 čeká na Vaše schválení nová objednávka od uživatele <strong>{user_name}</strong>.
                            </p>
                            
                            <!-- Order Info Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; margin-bottom: 25px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <table width="100%" cellpadding="8" cellspacing="0">
                                            <tr>
                                                <td style="color: #6b7280; font-size: 14px; width: 160px;"><strong>Číslo objednávky:</strong></td>
                                                <td style="color: #1f2937; font-size: 14px; font-weight: 600;">{order_number}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #6b7280; font-size: 14px;"><strong>Předmět:</strong></td>
                                                <td style="color: #1f2937; font-size: 14px;">{predmet}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #6b7280; font-size: 14px;"><strong>Dodavatel:</strong></td>
                                                <td style="color: #1f2937; font-size: 14px;">{dodavatel_nazev}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #6b7280; font-size: 14px;"><strong>Zdroj financování:</strong></td>
                                                <td style="color: #1f2937; font-size: 14px;">{financovani}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #6b7280; font-size: 14px;"><strong>Cena s DPH:</strong></td>
                                                <td style="color: #dc2626; font-size: 18px; font-weight: bold;">{amount}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #6b7280; font-size: 14px;"><strong>Datum vytvoření:</strong></td>
                                                <td style="color: #1f2937; font-size: 14px;">{date}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Action Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 10px 0 25px 0;">
                                        <a href="https://erdms.zachranka.cz/order-form-25?edit={order_id}" style="display: inline-block; background: linear-gradient(135deg, #dc2626, #b91c1c); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);">
                                            Schválit / Zamítnout objednávku
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px; line-height: 1.6; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                                <strong>Poznámka:</strong> Objednávku prosím schvalte nebo zamítněte v co nejkratší době.
                            </p>
                            
                            <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
                                Děkuji,<br>
                                <strong>{user_name}</strong>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
                                <strong>Zdravotnická záchranná služba Středočeského kraje, p.o.</strong><br>
                                EEO 2025 - Systém správy a workflow objednávek
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                                Tento email byl odeslán automaticky, prosím neodpovídejte na něj.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    dt_updated = NOW()
WHERE type = 'order_status_ke_schvaleni';

-- Ověření
SELECT id, type, name, email_subject, LENGTH(email_body) as body_length, dt_updated 
FROM 25_notification_templates 
WHERE type = 'order_status_ke_schvaleni';
