-- ============================================
-- NOTIFICATION TEMPLATES - FÁZE 3+4 UPDATE
-- Datum: 2025-12-15 22:36:34
-- Fáze 3: order_status_faktura_schvalena (faktury)
-- Fáze 4: order_status_kontrola_potvrzena, order_status_kontrola_zamitnuta (kontrola)
-- Struktura: 2 varianty (RECIPIENT + SUBMITTER)
-- ============================================

-- Šablona 1: Faktura schválena
UPDATE 25_notification_templates 
SET 
    name = 'Faktura schválena',
    email_subject = '💰 Faktura {invoice_number} byla schválena',
    email_body = '<!-- RECIPIENT: RECIPIENT -->
<!DOCTYPE html>
<html lang=\"cs\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>Faktura schválena</title>
</head>
<body style=\"margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; background-color: #f5f5f5;\">
    <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse; background-color: #f5f5f5;\">
        <tr>
            <td style=\"padding: 40px 20px;\">
                <table role=\"presentation\" style=\"max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;\">
                    
                    <!-- HEADER - Zelený gradient -->
                    <tr>
                        <td style=\"background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;\">
                            <div style=\"font-size: 48px; margin-bottom: 12px;\">💰</div>
                            <h1 style=\"margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;\">
                                Faktura schválena
                            </h1>
                            <p style=\"margin: 12px 0 0 0; color: #d1fae5; font-size: 16px; font-weight: 500;\">
                                K objednávce {order_number}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- HLAVNÍ ZPRÁVA -->
                    <tr>
                        <td style=\"padding: 40px 30px;\">
                            <div style=\"background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 30px;\">
                                <p style=\"margin: 0; color: #065f46; font-size: 16px; line-height: 1.6; font-weight: 600;\">
                                    ✅ Faktura <strong>{invoice_number}</strong> byla úspěšně schválena
                                </p>
                            </div>
                            
                            <p style=\"margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.7;\">
                                Dobrý den,<br><br>
                                tímto Vás informujeme, že faktura <strong>{invoice_number}</strong> k objednávce <strong>{order_number}</strong> byla schválena dne <strong>{approval_date}</strong>.
                            </p>
                            
                            <!-- INFO BOX -->
                            <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; overflow: hidden; margin: 24px 0;\">
                                <tr>
                                    <td style=\"padding: 20px;\">
                                        <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse;\">
                                            <tr>
                                                <td style=\"padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;\">
                                                    Číslo faktury
                                                </td>
                                                <td style=\"padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 700; text-align: right;\">
                                                    {invoice_number}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan=\"2\" style=\"padding: 0; border-bottom: 1px solid #e2e8f0;\"></td>
                                            </tr>
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
                                                    Částka faktury
                                                </td>
                                                <td style=\"padding: 8px 0; color: #0f172a; font-size: 17px; font-weight: 700; text-align: right;\">
                                                    {invoice_amount} Kč
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan=\"2\" style=\"padding: 0; border-bottom: 1px solid #e2e8f0;\"></td>
                                            </tr>
                                            <tr>
                                                <td style=\"padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;\">
                                                    Datum schválení
                                                </td>
                                                <td style=\"padding: 8px 0; color: #10b981; font-size: 15px; font-weight: 700; text-align: right;\">
                                                    {approval_date}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan=\"2\" style=\"padding: 0; border-bottom: 1px solid #e2e8f0;\"></td>
                                            </tr>
                                            <tr>
                                                <td style=\"padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;\">
                                                    Splatnost
                                                </td>
                                                <td style=\"padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 600; text-align: right;\">
                                                    {due_date}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- DALŠÍ KROKY -->
                            <div style=\"background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 24px 0;\">
                                <h3 style=\"margin: 0 0 12px 0; color: #1e40af; font-size: 16px; font-weight: 700;\">
                                    💳 Co bude dál?
                                </h3>
                                <ul style=\"margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px; line-height: 1.8;\">
                                    <li style=\"margin-bottom: 8px;\">Faktura je připravena k platbě</li>
                                    <li style=\"margin-bottom: 8px;\">Ekonomické oddělení zpracuje úhradu</li>
                                    <li style=\"margin-bottom: 0;\">Platba bude provedena dle splatnosti</li>
                                </ul>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- TLAČÍTKO -->
                    <tr>
                        <td style=\"padding: 0 30px 40px 30px; text-align: center;\">
                            <a href=\"{invoice_detail_url}\" style=\"display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);\">
                                📄 Zobrazit detail faktury
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
    <title>Vaše faktura byla schválena</title>
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
                                Faktura schválena!
                            </h1>
                            <p style=\"margin: 12px 0 0 0; color: #d1fae5; font-size: 16px; font-weight: 500;\">
                                K Vaší objednávce {order_number}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- HLAVNÍ ZPRÁVA -->
                    <tr>
                        <td style=\"padding: 40px 30px;\">
                            <div style=\"background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 30px;\">
                                <p style=\"margin: 0; color: #065f46; font-size: 16px; line-height: 1.6; font-weight: 600;\">
                                    ✅ Faktura k Vaší objednávce byla úspěšně schválena
                                </p>
                            </div>
                            
                            <p style=\"margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.7;\">
                                Dobrý den,<br><br>
                                faktura <strong>{invoice_number}</strong> k Vaší objednávce <strong>{order_number}</strong> byla schválena dne <strong>{approval_date}</strong>.
                            </p>
                            
                            <!-- INFO BOX -->
                            <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; overflow: hidden; margin: 24px 0;\">
                                <tr>
                                    <td style=\"padding: 20px;\">
                                        <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse;\">
                                            <tr>
                                                <td style=\"padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;\">
                                                    Číslo faktury
                                                </td>
                                                <td style=\"padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 700; text-align: right;\">
                                                    {invoice_number}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan=\"2\" style=\"padding: 0; border-bottom: 1px solid #e2e8f0;\"></td>
                                            </tr>
                                            <tr>
                                                <td style=\"padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;\">
                                                    Částka
                                                </td>
                                                <td style=\"padding: 8px 0; color: #10b981; font-size: 17px; font-weight: 700; text-align: right;\">
                                                    {invoice_amount} Kč
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- SUCCESS MESSAGE -->
                            <div style=\"background: #d1fae5; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; margin: 24px 0;\">
                                <p style=\"margin: 0; color: #065f46; font-size: 14px; line-height: 1.6;\">
                                    ✅ Faktura bude zpracována k úhradě ekonomickým oddělením.
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
                            <a href=\"{invoice_detail_url}\" style=\"display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);\">
                                📄 Zobrazit moji fakturu
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
    app_title = '💰 Faktura schválena: {invoice_number}',
    app_message = 'Faktura {invoice_number} k objednávce {order_number} byla schválena',
    send_email_default = 1,
    priority_default = 'normal',
    active = 1,
    dt_updated = NOW()
WHERE type = 'order_status_faktura_schvalena';

-- Šablona 2: Kontrola kvality potvrzena
UPDATE 25_notification_templates 
SET 
    name = 'Kontrola kvality potvrzena',
    email_subject = '✅ Kontrola objednávky {order_number} byla potvrzena',
    email_body = '<!-- RECIPIENT: RECIPIENT -->
<!DOCTYPE html>
<html lang=\"cs\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>Kontrola kvality potvrzena</title>
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
                                Kontrola potvrzena
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
                                    ✅ Kontrola kvality objednávky <strong>{order_number}</strong> byla úspěšně potvrzena
                                </p>
                            </div>
                            
                            <p style=\"margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.7;\">
                                Dobrý den,<br><br>
                                kontrola kvality objednávky <strong>{order_number}</strong> byla provedena a potvrzena dne <strong>{control_date}</strong>.
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
                                                    Kontroloval(a)
                                                </td>
                                                <td style=\"padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 600; text-align: right;\">
                                                    {controller_name}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan=\"2\" style=\"padding: 0; border-bottom: 1px solid #e2e8f0;\"></td>
                                            </tr>
                                            <tr>
                                                <td style=\"padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;\">
                                                    Datum kontroly
                                                </td>
                                                <td style=\"padding: 8px 0; color: #10b981; font-size: 15px; font-weight: 700; text-align: right;\">
                                                    {control_date}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan=\"2\" style=\"padding: 0; border-bottom: 1px solid #e2e8f0;\"></td>
                                            </tr>
                                            <tr>
                                                <td style=\"padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;\">
                                                    Výsledek
                                                </td>
                                                <td style=\"padding: 8px 0; color: #10b981; font-size: 16px; font-weight: 700; text-align: right;\">
                                                    ✅ Potvrzeno
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- POZNÁMKA -->
                            {if_comment}
                            <div style=\"background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px; margin: 24px 0;\">
                                <p style=\"margin: 0 0 8px 0; color: #1e40af; font-size: 14px; font-weight: 700;\">
                                    📝 Poznámka kontrolora:
                                </p>
                                <p style=\"margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6; font-style: italic;\">
                                    {control_comment}
                                </p>
                            </div>
                            {/if_comment}
                            
                            <!-- DALŠÍ KROKY -->
                            <div style=\"background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin: 24px 0;\">
                                <h3 style=\"margin: 0 0 12px 0; color: #065f46; font-size: 16px; font-weight: 700;\">
                                    🎯 Co bude dál?
                                </h3>
                                <ul style=\"margin: 0; padding-left: 20px; color: #065f46; font-size: 14px; line-height: 1.8;\">
                                    <li style=\"margin-bottom: 8px;\">Objednávka pokračuje v procesu</li>
                                    <li style=\"margin-bottom: 8px;\">Další kroky dle workflow</li>
                                    <li style=\"margin-bottom: 0;\">Žádné další akce nejsou potřeba</li>
                                </ul>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- TLAČÍTKO -->
                    <tr>
                        <td style=\"padding: 0 30px 40px 30px; text-align: center;\">
                            <a href=\"{order_detail_url}\" style=\"display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);\">
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
    <title>Vaše objednávka - kontrola OK</title>
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
                                Kontrola OK!
                            </h1>
                            <p style=\"margin: 12px 0 0 0; color: #d1fae5; font-size: 16px; font-weight: 500;\">
                                Vaše objednávka {order_number}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- HLAVNÍ ZPRÁVA -->
                    <tr>
                        <td style=\"padding: 40px 30px;\">
                            <div style=\"background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 30px;\">
                                <p style=\"margin: 0; color: #065f46; font-size: 16px; line-height: 1.6; font-weight: 600;\">
                                    ✅ Vaše objednávka prošla kontrolou kvality bez připomínek
                                </p>
                            </div>
                            
                            <p style=\"margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.7;\">
                                Dobrý den,<br><br>
                                Vaše objednávka <strong>{order_number}</strong> byla zkontrolována a potvrzena dne <strong>{control_date}</strong>.
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
                                                    Výsledek kontroly
                                                </td>
                                                <td style=\"padding: 8px 0; color: #10b981; font-size: 16px; font-weight: 700; text-align: right;\">
                                                    ✅ V pořádku
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- POZNÁMKA -->
                            {if_comment}
                            <div style=\"background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px; margin: 24px 0;\">
                                <p style=\"margin: 0 0 8px 0; color: #1e40af; font-size: 14px; font-weight: 700;\">
                                    📝 Poznámka:
                                </p>
                                <p style=\"margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6; font-style: italic;\">
                                    {control_comment}
                                </p>
                            </div>
                            {/if_comment}
                            
                            <!-- SUCCESS MESSAGE -->
                            <div style=\"background: #d1fae5; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; margin: 24px 0;\">
                                <p style=\"margin: 0; color: #065f46; font-size: 14px; line-height: 1.6;\">
                                    ✅ Objednávka pokračuje v dalších krocích automaticky.
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
    app_title = '✅ Kontrola OK: {order_number}',
    app_message = 'Kontrola kvality objednávky {order_number} byla úspěšně potvrzena',
    send_email_default = 1,
    priority_default = 'normal',
    active = 1,
    dt_updated = NOW()
WHERE type = 'order_status_kontrola_potvrzena';

-- Šablona 3: Kontrola kvality zamítnuta
UPDATE 25_notification_templates 
SET 
    name = 'Kontrola kvality zamítnuta',
    email_subject = '❌ Kontrola objednávky {order_number} byla zamítnuta',
    email_body = '<!-- RECIPIENT: RECIPIENT -->
<!DOCTYPE html>
<html lang=\"cs\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>Kontrola kvality zamítnuta</title>
</head>
<body style=\"margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; background-color: #f5f5f5;\">
    <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse; background-color: #f5f5f5;\">
        <tr>
            <td style=\"padding: 40px 20px;\">
                <table role=\"presentation\" style=\"max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;\">
                    
                    <!-- HEADER - Červený gradient -->
                    <tr>
                        <td style=\"background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 40px 30px; text-align: center;\">
                            <div style=\"font-size: 48px; margin-bottom: 12px;\">❌</div>
                            <h1 style=\"margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;\">
                                Kontrola zamítnuta
                            </h1>
                            <p style=\"margin: 12px 0 0 0; color: #fecaca; font-size: 16px; font-weight: 500;\">
                                Objednávka {order_number}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- HLAVNÍ ZPRÁVA -->
                    <tr>
                        <td style=\"padding: 40px 30px;\">
                            <div style=\"background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px; margin-bottom: 30px;\">
                                <p style=\"margin: 0; color: #991b1b; font-size: 16px; line-height: 1.6; font-weight: 600;\">
                                    ❌ Kontrola kvality objednávky <strong>{order_number}</strong> byla zamítnuta
                                </p>
                            </div>
                            
                            <p style=\"margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.7;\">
                                Dobrý den,<br><br>
                                kontrola kvality objednávky <strong>{order_number}</strong> byla provedena a zamítnuta dne <strong>{control_date}</strong>.
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
                                                    Kontroloval(a)
                                                </td>
                                                <td style=\"padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 600; text-align: right;\">
                                                    {controller_name}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan=\"2\" style=\"padding: 0; border-bottom: 1px solid #e2e8f0;\"></td>
                                            </tr>
                                            <tr>
                                                <td style=\"padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;\">
                                                    Datum kontroly
                                                </td>
                                                <td style=\"padding: 8px 0; color: #dc2626; font-size: 15px; font-weight: 700; text-align: right;\">
                                                    {control_date}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan=\"2\" style=\"padding: 0; border-bottom: 1px solid #e2e8f0;\"></td>
                                            </tr>
                                            <tr>
                                                <td style=\"padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;\">
                                                    Výsledek
                                                </td>
                                                <td style=\"padding: 8px 0; color: #dc2626; font-size: 16px; font-weight: 700; text-align: right;\">
                                                    ❌ Zamítnuto
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- DŮVOD ZAMÍTNUTÍ -->
                            <div style=\"background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px; margin: 24px 0;\">
                                <h3 style=\"margin: 0 0 12px 0; color: #991b1b; font-size: 16px; font-weight: 700;\">
                                    ⚠️ Důvod zamítnutí:
                                </h3>
                                <p style=\"margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.8; white-space: pre-line;\">
                                    {rejection_reason}
                                </p>
                            </div>
                            
                            <!-- DALŠÍ KROKY -->
                            <div style=\"background: #fefce8; border-left: 4px solid #eab308; padding: 20px; border-radius: 8px; margin: 24px 0;\">
                                <h3 style=\"margin: 0 0 12px 0; color: #854d0e; font-size: 16px; font-weight: 700;\">
                                    🔧 Co je potřeba udělat?
                                </h3>
                                <ul style=\"margin: 0; padding-left: 20px; color: #713f12; font-size: 14px; line-height: 1.8;\">
                                    <li style=\"margin-bottom: 8px;\">Zkontrolujte důvod zamítnutí</li>
                                    <li style=\"margin-bottom: 8px;\">Proveďte požadované úpravy</li>
                                    <li style=\"margin-bottom: 0;\">Kontaktujte kontrolora v případě dotazů</li>
                                </ul>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- TLAČÍTKO -->
                    <tr>
                        <td style=\"padding: 0 30px 40px 30px; text-align: center;\">
                            <a href=\"{order_detail_url}\" style=\"display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);\">
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
    <title>Vaše objednávka - kontrola zamítnuta</title>
</head>
<body style=\"margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; background-color: #f5f5f5;\">
    <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse; background-color: #f5f5f5;\">
        <tr>
            <td style=\"padding: 40px 20px;\">
                <table role=\"presentation\" style=\"max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;\">
                    
                    <!-- HEADER - Oranžový gradient -->
                    <tr>
                        <td style=\"background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 30px; text-align: center;\">
                            <div style=\"font-size: 48px; margin-bottom: 12px;\">⚠️</div>
                            <h1 style=\"margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;\">
                                Nutná revize objednávky
                            </h1>
                            <p style=\"margin: 12px 0 0 0; color: #fed7aa; font-size: 16px; font-weight: 500;\">
                                Vaše objednávka {order_number}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- HLAVNÍ ZPRÁVA -->
                    <tr>
                        <td style=\"padding: 40px 30px;\">
                            <div style=\"background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%); border-left: 4px solid #f97316; padding: 20px; border-radius: 8px; margin-bottom: 30px;\">
                                <p style=\"margin: 0; color: #9a3412; font-size: 16px; line-height: 1.6; font-weight: 600;\">
                                    ⚠️ Vaše objednávka nepro šla kontrolou kvality - nutné úpravy
                                </p>
                            </div>
                            
                            <p style=\"margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.7;\">
                                Dobrý den,<br><br>
                                Vaše objednávka <strong>{order_number}</strong> byla zkontrolována a zamítnuta dne <strong>{control_date}</strong>. Je nutné provést úpravy.
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
                                                    Stav
                                                </td>
                                                <td style=\"padding: 8px 0; color: #f97316; font-size: 16px; font-weight: 700; text-align: right;\">
                                                    ⚠️ Nutná revize
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- DŮVOD ZAMÍTNUTÍ -->
                            <div style=\"background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px; margin: 24px 0;\">
                                <h3 style=\"margin: 0 0 12px 0; color: #991b1b; font-size: 16px; font-weight: 700;\">
                                    ⚠️ Důvod zamítnutí:
                                </h3>
                                <p style=\"margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.8; white-space: pre-line;\">
                                    {rejection_reason}
                                </p>
                            </div>
                            
                            <!-- AKCE -->
                            <div style=\"background: #fefce8; border-left: 4px solid #eab308; padding: 20px; border-radius: 8px; margin: 24px 0;\">
                                <h3 style=\"margin: 0 0 12px 0; color: #854d0e; font-size: 16px; font-weight: 700;\">
                                    🔧 Požadované akce:
                                </h3>
                                <ul style=\"margin: 0; padding-left: 20px; color: #713f12; font-size: 14px; line-height: 1.8;\">
                                    <li style=\"margin-bottom: 8px;\">Proveďte požadované úpravy v objednávce</li>
                                    <li style=\"margin-bottom: 8px;\">V případě dotazů kontaktujte kontrolora</li>
                                    <li style=\"margin-bottom: 0;\">Po úpravách odešlete objednávku znovu ke kontrole</li>
                                </ul>
                            </div>
                            
                            <p style=\"margin: 24px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;\">
                                Děkujeme za pochopení.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- TLAČÍTKO -->
                    <tr>
                        <td style=\"padding: 0 30px 40px 30px; text-align: center;\">
                            <a href=\"{order_detail_url}\" style=\"display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);\">
                                ✏️ Upravit objednávku
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
    app_title = '❌ Kontrola zamítnuta: {order_number}',
    app_message = 'Kontrola kvality objednávky {order_number} byla zamítnuta - nutné úpravy',
    send_email_default = 1,
    priority_default = 'high',
    active = 1,
    dt_updated = NOW()
WHERE type = 'order_status_kontrola_zamitnuta';

