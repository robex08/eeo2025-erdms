-- ============================================
-- NOTIFICATION TEMPLATES - FÁZE 2 UPDATE
-- Datum: 2025-12-15 22:28:45
-- Šablony: order_status_odeslana, order_status_potvrzena
-- Struktura: 2 varianty (RECIPIENT + SUBMITTER)
-- ============================================

-- Šablona 1: Objednávka odeslána dodavateli
UPDATE 25_notification_templates 
SET 
    name = 'Objednávka odeslána dodavateli',
    email_subject = '📤 Objednávka {order_number} byla odeslána dodavateli',
    email_body = '<!-- RECIPIENT: RECIPIENT -->
<!DOCTYPE html>
<html lang=\"cs\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>Objednávka odeslána dodavateli</title>
</head>
<body style=\"margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; background-color: #f5f5f5;\">
    <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse; background-color: #f5f5f5;\">
        <tr>
            <td style=\"padding: 40px 20px;\">
                <table role=\"presentation\" style=\"max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;\">
                    
                    <!-- HEADER - Modrý gradient -->
                    <tr>
                        <td style=\"background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 30px; text-align: center;\">
                            <div style=\"font-size: 48px; margin-bottom: 12px;\">📤</div>
                            <h1 style=\"margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;\">
                                Objednávka odeslána
                            </h1>
                            <p style=\"margin: 12px 0 0 0; color: #dbeafe; font-size: 16px; font-weight: 500;\">
                                Objednávka {order_number}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- HLAVNÍ ZPRÁVA -->
                    <tr>
                        <td style=\"padding: 40px 30px;\">
                            <div style=\"background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin-bottom: 30px;\">
                                <p style=\"margin: 0; color: #1e40af; font-size: 16px; line-height: 1.6; font-weight: 600;\">
                                    📬 Objednávka byla úspěšně odeslána dodavateli <strong>{supplier_name}</strong>
                                </p>
                            </div>
                            
                            <p style=\"margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.7;\">
                                Dobrý den,<br><br>
                                tímto Vás informujeme, že objednávka <strong>{order_number}</strong> byla odeslána dodavateli dne <strong>{action_date}</strong>.
                            </p>
                            
                            <!-- INFO BOX -->
                            <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; overflow: hidden; margin: 24px 0;\">
                                <tr>
                                    <td style=\"padding: 20px;\">
                                        <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse;\">
                                            <tr>
                                                <td style=\"padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;\">
                                                    Číslo objednávky
                                                </td>
                                                <td style=\"padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 700; text-align: right;\">
                                                    {order_number}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan=\"2\" style=\"padding: 0; border-bottom: 1px solid #e2e8f0;\"></td>
                                            </tr>
                                            <tr>
                                                <td style=\"padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;\">
                                                    Dodavatel
                                                </td>
                                                <td style=\"padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 600; text-align: right;\">
                                                    {supplier_name}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan=\"2\" style=\"padding: 0; border-bottom: 1px solid #e2e8f0;\"></td>
                                            </tr>
                                            <tr>
                                                <td style=\"padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;\">
                                                    Datum odeslání
                                                </td>
                                                <td style=\"padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 600; text-align: right;\">
                                                    {action_date}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan=\"2\" style=\"padding: 0; border-bottom: 1px solid #e2e8f0;\"></td>
                                            </tr>
                                            <tr>
                                                <td style=\"padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;\">
                                                    Celková částka
                                                </td>
                                                <td style=\"padding: 8px 0; color: #0f172a; font-size: 17px; font-weight: 700; text-align: right;\">
                                                    {total_amount} Kč
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- DALŠÍ KROKY -->
                            <div style=\"background: #fefce8; border-left: 4px solid #eab308; padding: 20px; border-radius: 8px; margin: 24px 0;\">
                                <h3 style=\"margin: 0 0 12px 0; color: #854d0e; font-size: 16px; font-weight: 700;\">
                                    ⏳ Co bude dál?
                                </h3>
                                <ul style=\"margin: 0; padding-left: 20px; color: #713f12; font-size: 14px; line-height: 1.8;\">
                                    <li style=\"margin-bottom: 8px;\">Dodavatel nyní objednávku zpracovává</li>
                                    <li style=\"margin-bottom: 8px;\">Po potvrzení obdržíte další notifikaci</li>
                                    <li style=\"margin-bottom: 0;\">Sledujte stav objednávky v systému</li>
                                </ul>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- TLAČÍTKO -->
                    <tr>
                        <td style=\"padding: 0 30px 40px 30px; text-align: center;\">
                            <a href=\"{order_detail_url}\" style=\"display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3); transition: all 0.3s ease;\">
                                📋 Zobrazit detail objednávky
                            </a>
                        </td>
                    </tr>
                    
                    <!-- FOOTER -->
                    <tr>
                        <td style=\"background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;\">
                            <p style=\"margin: 0 0 8px 0; color: #64748b; font-size: 13px;\">
                                Toto je automatická notifikace ze systému ERDMS
                            </p>
                            <p style=\"margin: 0; color: #94a3b8; font-size: 12px;\">
                                © 2025 {organization_name}
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
    <title>Vaše objednávka byla odeslána</title>
</head>
<body style=\"margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; background-color: #f5f5f5;\">
    <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse; background-color: #f5f5f5;\">
        <tr>
            <td style=\"padding: 40px 20px;\">
                <table role=\"presentation\" style=\"max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;\">
                    
                    <!-- HEADER - Zelený gradient -->
                    <tr>
                        <td style=\"background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;\">
                            <div style=\"font-size: 48px; margin-bottom: 12px;\">✅</div>
                            <h1 style=\"margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;\">
                                Objednávka odeslána
                            </h1>
                            <p style=\"margin: 12px 0 0 0; color: #d1fae5; font-size: 16px; font-weight: 500;\">
                                Váš požadavek {order_number}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- HLAVNÍ ZPRÁVA -->
                    <tr>
                        <td style=\"padding: 40px 30px;\">
                            <div style=\"background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 30px;\">
                                <p style=\"margin: 0; color: #065f46; font-size: 16px; line-height: 1.6; font-weight: 600;\">
                                    ✅ Vaše objednávka byla úspěšně odeslána dodavateli
                                </p>
                            </div>
                            
                            <p style=\"margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.7;\">
                                Dobrý den,<br><br>
                                Vaše objednávka <strong>{order_number}</strong> byla po schválení úspěšně odeslána dodavateli <strong>{supplier_name}</strong> dne <strong>{action_date}</strong>.
                            </p>
                            
                            <!-- INFO BOX -->
                            <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; overflow: hidden; margin: 24px 0;\">
                                <tr>
                                    <td style=\"padding: 20px;\">
                                        <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse;\">
                                            <tr>
                                                <td style=\"padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;\">
                                                    Číslo objednávky
                                                </td>
                                                <td style=\"padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 700; text-align: right;\">
                                                    {order_number}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan=\"2\" style=\"padding: 0; border-bottom: 1px solid #e2e8f0;\"></td>
                                            </tr>
                                            <tr>
                                                <td style=\"padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;\">
                                                    Dodavatel
                                                </td>
                                                <td style=\"padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 600; text-align: right;\">
                                                    {supplier_name}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan=\"2\" style=\"padding: 0; border-bottom: 1px solid #e2e8f0;\"></td>
                                            </tr>
                                            <tr>
                                                <td style=\"padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;\">
                                                    Datum odeslání
                                                </td>
                                                <td style=\"padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 600; text-align: right;\">
                                                    {action_date}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- INFO MESSAGE -->
                            <div style=\"background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px; margin: 24px 0;\">
                                <p style=\"margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;\">
                                    ℹ️ Další aktualizace obdržíte po potvrzení objednávky dodavatelem.
                                </p>
                            </div>
                            
                            <p style=\"margin: 24px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;\">
                                Děkujeme za použití systému ERDMS.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- TLAČÍTKO -->
                    <tr>
                        <td style=\"padding: 0 30px 40px 30px; text-align: center;\">
                            <a href=\"{order_detail_url}\" style=\"display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);\">
                                📋 Zobrazit moji objednávku
                            </a>
                        </td>
                    </tr>
                    
                    <!-- FOOTER -->
                    <tr>
                        <td style=\"background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;\">
                            <p style=\"margin: 0 0 8px 0; color: #64748b; font-size: 13px;\">
                                Toto je automatická notifikace ze systému ERDMS
                            </p>
                            <p style=\"margin: 0; color: #94a3b8; font-size: 12px;\">
                                © 2025 {organization_name}
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
    app_title = '📤 Odeslána: {order_number}',
    app_message = 'Objednávka {order_number} byla odeslána dodavateli {supplier_name}',
    send_email_default = 1,
    priority_default = 'normal',
    active = 1,
    dt_updated = NOW()
WHERE type = 'order_status_odeslana';

-- Šablona 2: Objednávka potvrzena dodavatelem
UPDATE 25_notification_templates 
SET 
    name = 'Objednávka potvrzena dodavatelem',
    email_subject = '✅ Objednávka {order_number} byla potvrzena dodavatelem',
    email_body = '<!-- RECIPIENT: RECIPIENT -->
<!DOCTYPE html>
<html lang=\"cs\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>Objednávka potvrzena dodavatelem</title>
</head>
<body style=\"margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; background-color: #f5f5f5;\">
    <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse; background-color: #f5f5f5;\">
        <tr>
            <td style=\"padding: 40px 20px;\">
                <table role=\"presentation\" style=\"max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;\">
                    
                    <!-- HEADER - Zelený gradient -->
                    <tr>
                        <td style=\"background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;\">
                            <div style=\"font-size: 48px; margin-bottom: 12px;\">✅</div>
                            <h1 style=\"margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;\">
                                Objednávka potvrzena
                            </h1>
                            <p style=\"margin: 12px 0 0 0; color: #d1fae5; font-size: 16px; font-weight: 500;\">
                                Objednávka {order_number}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- HLAVNÍ ZPRÁVA -->
                    <tr>
                        <td style=\"padding: 40px 30px;\">
                            <div style=\"background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 30px;\">
                                <p style=\"margin: 0; color: #065f46; font-size: 16px; line-height: 1.6; font-weight: 600;\">
                                    ✅ Dodavatel <strong>{supplier_name}</strong> potvrdil přijetí objednávky
                                </p>
                            </div>
                            
                            <p style=\"margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.7;\">
                                Dobrý den,<br><br>
                                tímto Vás informujeme, že dodavatel <strong>{supplier_name}</strong> potvrdil přijetí objednávky <strong>{order_number}</strong> dne <strong>{action_date}</strong>.
                            </p>
                            
                            <!-- INFO BOX -->
                            <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; overflow: hidden; margin: 24px 0;\">
                                <tr>
                                    <td style=\"padding: 20px;\">
                                        <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse;\">
                                            <tr>
                                                <td style=\"padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;\">
                                                    Číslo objednávky
                                                </td>
                                                <td style=\"padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 700; text-align: right;\">
                                                    {order_number}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan=\"2\" style=\"padding: 0; border-bottom: 1px solid #e2e8f0;\"></td>
                                            </tr>
                                            <tr>
                                                <td style=\"padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;\">
                                                    Dodavatel
                                                </td>
                                                <td style=\"padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 600; text-align: right;\">
                                                    {supplier_name}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan=\"2\" style=\"padding: 0; border-bottom: 1px solid #e2e8f0;\"></td>
                                            </tr>
                                            <tr>
                                                <td style=\"padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;\">
                                                    Datum potvrzení
                                                </td>
                                                <td style=\"padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 600; text-align: right;\">
                                                    {action_date}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan=\"2\" style=\"padding: 0; border-bottom: 1px solid #e2e8f0;\"></td>
                                            </tr>
                                            <tr>
                                                <td style=\"padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;\">
                                                    Celková částka
                                                </td>
                                                <td style=\"padding: 8px 0; color: #0f172a; font-size: 17px; font-weight: 700; text-align: right;\">
                                                    {total_amount} Kč
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan=\"2\" style=\"padding: 0; border-bottom: 1px solid #e2e8f0;\"></td>
                                            </tr>
                                            <tr>
                                                <td style=\"padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;\">
                                                    Předpokládané dodání
                                                </td>
                                                <td style=\"padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 600; text-align: right;\">
                                                    {expected_delivery}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- DALŠÍ KROKY -->
                            <div style=\"background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 24px 0;\">
                                <h3 style=\"margin: 0 0 12px 0; color: #1e40af; font-size: 16px; font-weight: 700;\">
                                    📦 Co bude dál?
                                </h3>
                                <ul style=\"margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px; line-height: 1.8;\">
                                    <li style=\"margin-bottom: 8px;\">Dodavatel připravuje zásilku</li>
                                    <li style=\"margin-bottom: 8px;\">Po dodání lze vytvořit fakturu</li>
                                    <li style=\"margin-bottom: 0;\">Sledujte stav v systému</li>
                                </ul>
                            </div>
                            
                            <!-- POZNÁMKA -->
                            {if_comment}
                            <div style=\"background: #fefce8; border-left: 4px solid #eab308; padding: 16px; border-radius: 8px; margin: 24px 0;\">
                                <p style=\"margin: 0 0 8px 0; color: #854d0e; font-size: 14px; font-weight: 700;\">
                                    📝 Poznámka od dodavatele:
                                </p>
                                <p style=\"margin: 0; color: #713f12; font-size: 14px; line-height: 1.6; font-style: italic;\">
                                    {supplier_comment}
                                </p>
                            </div>
                            {/if_comment}
                        </td>
                    </tr>
                    
                    <!-- TLAČÍTKO -->
                    <tr>
                        <td style=\"padding: 0 30px 40px 30px; text-align: center;\">
                            <a href=\"{order_detail_url}\" style=\"display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3); transition: all 0.3s ease;\">
                                📋 Zobrazit detail objednávky
                            </a>
                        </td>
                    </tr>
                    
                    <!-- FOOTER -->
                    <tr>
                        <td style=\"background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;\">
                            <p style=\"margin: 0 0 8px 0; color: #64748b; font-size: 13px;\">
                                Toto je automatická notifikace ze systému ERDMS
                            </p>
                            <p style=\"margin: 0; color: #94a3b8; font-size: 12px;\">
                                © 2025 {organization_name}
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
    <title>Vaše objednávka byla potvrzena</title>
</head>
<body style=\"margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; background-color: #f5f5f5;\">
    <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse; background-color: #f5f5f5;\">
        <tr>
            <td style=\"padding: 40px 20px;\">
                <table role=\"presentation\" style=\"max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;\">
                    
                    <!-- HEADER - Zelený gradient -->
                    <tr>
                        <td style=\"background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;\">
                            <div style=\"font-size: 48px; margin-bottom: 12px;\">🎉</div>
                            <h1 style=\"margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;\">
                                Objednávka potvrzena!
                            </h1>
                            <p style=\"margin: 12px 0 0 0; color: #d1fae5; font-size: 16px; font-weight: 500;\">
                                Váš požadavek {order_number}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- HLAVNÍ ZPRÁVA -->
                    <tr>
                        <td style=\"padding: 40px 30px;\">
                            <div style=\"background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 30px;\">
                                <p style=\"margin: 0; color: #065f46; font-size: 16px; line-height: 1.6; font-weight: 600;\">
                                    🎉 Skvělá zpráva! Dodavatel potvrdil Vaši objednávku
                                </p>
                            </div>
                            
                            <p style=\"margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.7;\">
                                Dobrý den,<br><br>
                                Vaše objednávka <strong>{order_number}</strong> byla úspěšně potvrzena dodavatelem <strong>{supplier_name}</strong> dne <strong>{action_date}</strong>.
                            </p>
                            
                            <!-- INFO BOX -->
                            <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; overflow: hidden; margin: 24px 0;\">
                                <tr>
                                    <td style=\"padding: 20px;\">
                                        <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse;\">
                                            <tr>
                                                <td style=\"padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;\">
                                                    Číslo objednávky
                                                </td>
                                                <td style=\"padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 700; text-align: right;\">
                                                    {order_number}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan=\"2\" style=\"padding: 0; border-bottom: 1px solid #e2e8f0;\"></td>
                                            </tr>
                                            <tr>
                                                <td style=\"padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;\">
                                                    Dodavatel
                                                </td>
                                                <td style=\"padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 600; text-align: right;\">
                                                    {supplier_name}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan=\"2\" style=\"padding: 0; border-bottom: 1px solid #e2e8f0;\"></td>
                                            </tr>
                                            <tr>
                                                <td style=\"padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;\">
                                                    Předpokládané dodání
                                                </td>
                                                <td style=\"padding: 8px 0; color: #10b981; font-size: 16px; font-weight: 700; text-align: right;\">
                                                    {expected_delivery}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- POZNÁMKA -->
                            {if_comment}
                            <div style=\"background: #fefce8; border-left: 4px solid #eab308; padding: 16px; border-radius: 8px; margin: 24px 0;\">
                                <p style=\"margin: 0 0 8px 0; color: #854d0e; font-size: 14px; font-weight: 700;\">
                                    📝 Poznámka od dodavatele:
                                </p>
                                <p style=\"margin: 0; color: #713f12; font-size: 14px; line-height: 1.6; font-style: italic;\">
                                    {supplier_comment}
                                </p>
                            </div>
                            {/if_comment}
                            
                            <!-- SUCCESS MESSAGE -->
                            <div style=\"background: #d1fae5; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; margin: 24px 0;\">
                                <p style=\"margin: 0; color: #065f46; font-size: 14px; line-height: 1.6;\">
                                    ✅ Vaše objednávka je nyní v procesu zpracování a připravuje se k dodání.
                                </p>
                            </div>
                            
                            <p style=\"margin: 24px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;\">
                                Děkujeme za použití systému ERDMS.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- TLAČÍTKO -->
                    <tr>
                        <td style=\"padding: 0 30px 40px 30px; text-align: center;\">
                            <a href=\"{order_detail_url}\" style=\"display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);\">
                                📋 Zobrazit moji objednávku
                            </a>
                        </td>
                    </tr>
                    
                    <!-- FOOTER -->
                    <tr>
                        <td style=\"background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;\">
                            <p style=\"margin: 0 0 8px 0; color: #64748b; font-size: 13px;\">
                                Toto je automatická notifikace ze systému ERDMS
                            </p>
                            <p style=\"margin: 0; color: #94a3b8; font-size: 12px;\">
                                © 2025 {organization_name}
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
    app_title = '✅ Potvrzena: {order_number}',
    app_message = 'Dodavatel {supplier_name} potvrdil objednávku {order_number}',
    send_email_default = 1,
    priority_default = 'normal',
    active = 1,
    dt_updated = NOW()
WHERE type = 'order_status_potvrzena';

