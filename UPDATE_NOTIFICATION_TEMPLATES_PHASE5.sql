-- ============================================
-- NOTIFICATION TEMPLATES - FÁZE 5 UPDATE
-- Datum: 2025-12-16
-- Šablony: order_status_nova, order_status_registr_ceka, 
--          order_status_faktura_pridana, order_status_dokoncena
-- Struktura: 2 varianty (RECIPIENT + SUBMITTER)
-- ============================================

-- ============================================
-- Šablona 1: Objednávka odeslána ke schválení (ORDER_SENT_FOR_APPROVAL)
-- ============================================
UPDATE 25_notification_templates 
SET 
    name = 'Nová objednávka vytvořena',
    email_subject = '📝 Nová objednávka {order_number} byla vytvořena',
    email_body = '<!-- RECIPIENT: RECIPIENT -->
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nová objednávka vytvořena</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    
                    <!-- HEADER - Červený gradient (EXCEPTIONAL - příkazce musí schválit) -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 12px;">📝</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                Nová objednávka ke schválení
                            </h1>
                            <p style="margin: 12px 0 0 0; color: #fecaca; font-size: 16px; font-weight: 500;">
                                Objednávka {order_number}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- HLAVNÍ ZPRÁVA -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                                <p style="margin: 0; color: #991b1b; font-size: 16px; line-height: 1.6; font-weight: 600;">
                                    🔴 Nová objednávka <strong>{order_number}</strong> čeká na vaše schválení
                                </p>
                            </div>
                            
                            <p style="margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.7;">
                                Dobrý den <strong>{recipient_name}</strong>,<br><br>
                                uživatel <strong>{creator_name}</strong> vytvořil novou objednávku, která vyžaduje vaše schválení.
                            </p>
                            
                            <!-- DETAILY OBJEDNÁVKY -->
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
                                <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px; font-weight: 600;">
                                    📋 Detaily objednávky
                                </h2>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Číslo objednávky:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">{order_number}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Předmět:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{predmet}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Dodavatel:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{supplier_name}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Střediska:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{strediska}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Zdroj financování:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{financovani}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Celková cena s DPH:</td>
                                        <td style="padding: 8px 0; color: #dc2626; font-size: 18px; font-weight: 700;">{amount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Vytvořil:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{creator_name}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Datum vytvoření:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{created_at}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA BUTTON -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3); transition: all 0.3s ease;">
                                    ✅ Schválit objednávku
                                </a>
                            </div>
                            
                            <p style="margin: 30px 0 0 0; color: #64748b; font-size: 13px; line-height: 1.6; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                                Tento e-mail byl automaticky vygenerován systémem ERDMS.<br>
                                Pro schválení nebo zamítnutí objednávky klikněte na tlačítko výše.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- FOOTER -->
                    <tr>
                        <td style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                                © 2025 ERDMS - Elektronický Registr Dodavatelů a Materiálů<br>
                                Zdravotnická záchranná služba Jihomoravského kraje
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
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Objednávka vytvořena</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    
                    <!-- HEADER - Zelený gradient (INFO - potvrzení pro autora) -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                Objednávka vytvořena
                            </h1>
                            <p style="margin: 12px 0 0 0; color: #d1fae5; font-size: 16px; font-weight: 500;">
                                Objednávka {order_number}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- HLAVNÍ ZPRÁVA -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                                <p style="margin: 0; color: #065f46; font-size: 16px; line-height: 1.6; font-weight: 600;">
                                    ✅ Objednávka <strong>{order_number}</strong> byla úspěšně vytvořena a odeslána ke schválení
                                </p>
                            </div>
                            
                            <p style="margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.7;">
                                Dobrý den <strong>{creator_name}</strong>,<br><br>
                                vaše objednávka byla úspěšně vytvořena a odeslána ke schválení příkazci <strong>{recipient_name}</strong>.
                            </p>
                            
                            <!-- DETAILY OBJEDNÁVKY -->
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
                                <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px; font-weight: 600;">
                                    📋 Detaily objednávky
                                </h2>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Číslo objednávky:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">{order_number}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Předmět:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{predmet}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Dodavatel:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{supplier_name}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Střediska:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{strediska}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Celková cena s DPH:</td>
                                        <td style="padding: 8px 0; color: #10b981; font-size: 18px; font-weight: 700;">{amount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Čeká na schválení:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{recipient_name}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA BUTTON -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                                    📄 Zobrazit objednávku
                                </a>
                            </div>
                            
                            <p style="margin: 30px 0 0 0; color: #64748b; font-size: 13px; line-height: 1.6; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                                Tento e-mail byl automaticky vygenerován systémem ERDMS.<br>
                                O dalším postupu budete informováni e-mailem.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- FOOTER -->
                    <tr>
                        <td style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                                © 2025 ERDMS - Elektronický Registr Dodavatelů a Materiálů<br>
                                Zdravotnická záchranná služba Jihomoravského kraje
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    active = 1,
    dt_updated = NOW()
WHERE type = 'order_status_nova';

-- ============================================
-- Šablona 2: Žádost o zveřejnění v registru (ORDER_REGISTRY_APPROVAL_REQUESTED)
-- ============================================
UPDATE 25_notification_templates 
SET 
    name = 'Objednávka čeká na zveřejnění v registru',
    email_subject = '📋 Objednávka {order_number} čeká na zveřejnění v registru',
    email_body = '<!-- RECIPIENT: RECIPIENT -->
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Žádost o registr</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    
                    <!-- HEADER - Červený gradient (EXCEPTIONAL - musí schválit registr) -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 12px;">📋</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                Žádost o registr
                            </h1>
                            <p style="margin: 12px 0 0 0; color: #fecaca; font-size: 16px; font-weight: 500;">
                                Objednávka {order_number}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- HLAVNÍ ZPRÁVA -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                                <p style="margin: 0; color: #991b1b; font-size: 16px; line-height: 1.6; font-weight: 600;">
                                    🔴 Objednávka <strong>{order_number}</strong> čeká na zveřejnění v registru
                                </p>
                            </div>
                            
                            <p style="margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.7;">
                                Dobrý den,<br><br>
                                uživatel <strong>{creator_name}</strong> žádá o zveřejnění objednávky v registru smluv/objednávek.
                            </p>
                            
                            <!-- DETAILY -->
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
                                <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px; font-weight: 600;">
                                    📋 Detaily objednávky
                                </h2>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Číslo objednávky:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">{order_number}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Předmět:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{predmet}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Dodavatel:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{supplier_name}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Celková cena:</td>
                                        <td style="padding: 8px 0; color: #dc2626; font-size: 18px; font-weight: 700;">{amount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Žádá:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{creator_name}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA BUTTON -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">
                                    📋 Zpracovat žádost
                                </a>
                            </div>
                            
                            <p style="margin: 30px 0 0 0; color: #64748b; font-size: 13px; line-height: 1.6; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                                Tento e-mail byl automaticky vygenerován systémem ERDMS.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- FOOTER -->
                    <tr>
                        <td style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                                © 2025 ERDMS - Elektronický Registr Dodavatelů a Materiálů<br>
                                Zdravotnická záchranná služba Jihomoravského kraje
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
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Žádost odeslána</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    
                    <!-- HEADER - Zelený gradient (INFO pro autora) -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                Žádost odeslána
                            </h1>
                            <p style="margin: 12px 0 0 0; color: #d1fae5; font-size: 16px; font-weight: 500;">
                                Objednávka {order_number}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- HLAVNÍ ZPRÁVA -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                                <p style="margin: 0; color: #065f46; font-size: 16px; line-height: 1.6; font-weight: 600;">
                                    ✅ Žádost o zveřejnění v registru byla úspěšně odeslána
                                </p>
                            </div>
                            
                            <p style="margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.7;">
                                Dobrý den <strong>{creator_name}</strong>,<br><br>
                                vaše žádost o zveřejnění objednávky v registru byla odeslána ke zpracování.
                            </p>
                            
                            <!-- CTA BUTTON -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                                    📄 Zobrazit objednávku
                                </a>
                            </div>
                            
                            <p style="margin: 30px 0 0 0; color: #64748b; font-size: 13px; line-height: 1.6; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                                O dalším postupu budete informováni e-mailem.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- FOOTER -->
                    <tr>
                        <td style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                                © 2025 ERDMS
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    active = 1,
    dt_updated = NOW()
WHERE type = 'order_status_registr_ceka';

-- ============================================
-- Šablona 3: Faktura přidána (ORDER_INVOICE_ADDED)
-- ============================================
UPDATE 25_notification_templates 
SET 
    name = 'K objednávce byla přidána faktura',
    email_subject = '💰 K objednávce {order_number} byla přidána faktura',
    email_body = '<!-- RECIPIENT: RECIPIENT -->
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Faktura přidána</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    
                    <!-- HEADER - Oranžový gradient (APPROVAL - musí provést věcnou kontrolu) -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 12px;">💰</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                Faktura přidána
                            </h1>
                            <p style="margin: 12px 0 0 0; color: #fef3c7; font-size: 16px; font-weight: 500;">
                                K objednávce {order_number}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- HLAVNÍ ZPRÁVA -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                                <p style="margin: 0; color: #78350f; font-size: 16px; line-height: 1.6; font-weight: 600;">
                                    🟠 K objednávce byla přidána faktura - proveďte věcnou kontrolu
                                </p>
                            </div>
                            
                            <p style="margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.7;">
                                Dobrý den <strong>{creator_name}</strong>,<br><br>
                                k vaší objednávce byla přidána faktura. Je nutné provést věcnou kontrolu a potvrdit přijetí.
                            </p>
                            
                            <!-- DETAILY -->
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
                                <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px; font-weight: 600;">
                                    📋 Detaily
                                </h2>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Číslo objednávky:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">{order_number}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Číslo faktury:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">{invoice_number}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Předmět:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{predmet}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Dodavatel:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{supplier_name}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Částka faktury:</td>
                                        <td style="padding: 8px 0; color: #d97706; font-size: 18px; font-weight: 700;">{amount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Přidal:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{submitter_name}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA BUTTON -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);">
                                    ✅ Provést věcnou kontrolu
                                </a>
                            </div>
                            
                            <p style="margin: 30px 0 0 0; color: #64748b; font-size: 13px; line-height: 1.6; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                                Tento e-mail byl automaticky vygenerován systémem ERDMS.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- FOOTER -->
                    <tr>
                        <td style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                                © 2025 ERDMS
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
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Faktura přidána</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    
                    <!-- HEADER - Zelený gradient (INFO pro autora akce) -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                Faktura přidána
                            </h1>
                            <p style="margin: 12px 0 0 0; color: #d1fae5; font-size: 16px; font-weight: 500;">
                                K objednávce {order_number}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- HLAVNÍ ZPRÁVA -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                                <p style="margin: 0; color: #065f46; font-size: 16px; line-height: 1.6; font-weight: 600;">
                                    ✅ Faktura byla úspěšně přidána a notifikace odeslána objednateli
                                </p>
                            </div>
                            
                            <p style="margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.7;">
                                Dobrý den,<br><br>
                                faktura <strong>{invoice_number}</strong> byla úspěšně přidána k objednávce. Objednatel byl informován.
                            </p>
                            
                            <!-- CTA BUTTON -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                                    📄 Zobrazit objednávku
                                </a>
                            </div>
                            
                            <p style="margin: 30px 0 0 0; color: #64748b; font-size: 13px; line-height: 1.6; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                                Tento e-mail byl automaticky vygenerován systémem ERDMS.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- FOOTER -->
                    <tr>
                        <td style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                                © 2025 ERDMS
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    active = 1,
    dt_updated = NOW()
WHERE type = 'order_status_faktura_pridana';

-- ============================================
-- Šablona 4: Objednávka dokončena (ORDER_COMPLETED)
-- ============================================
UPDATE 25_notification_templates 
SET 
    name = 'Objednávka dokončena',
    email_subject = '✅ Objednávka {order_number} byla dokončena',
    email_body = '<!-- RECIPIENT: RECIPIENT -->
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Objednávka dokončena</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    
                    <!-- HEADER - Zelený gradient (INFO - proces úspěšně dokončen) -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                Objednávka dokončena
                            </h1>
                            <p style="margin: 12px 0 0 0; color: #d1fae5; font-size: 16px; font-weight: 500;">
                                Objednávka {order_number}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- HLAVNÍ ZPRÁVA -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                                <p style="margin: 0; color: #065f46; font-size: 16px; line-height: 1.6; font-weight: 600;">
                                    🎉 Objednávka <strong>{order_number}</strong> byla úspěšně dokončena
                                </p>
                            </div>
                            
                            <p style="margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.7;">
                                Dobrý den,<br><br>
                                objednávka byla úspěšně dokončena a proces byl uzavřen.
                            </p>
                            
                            <!-- DETAILY -->
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
                                <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px; font-weight: 600;">
                                    📋 Souhrn objednávky
                                </h2>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Číslo objednávky:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">{order_number}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Předmět:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{predmet}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Dodavatel:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{supplier_name}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Celková cena:</td>
                                        <td style="padding: 8px 0; color: #10b981; font-size: 18px; font-weight: 700;">{amount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Vytvořil:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{creator_name}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Dokončil:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{submitter_name}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Datum dokončení:</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{completed_date}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA BUTTON -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                                    📄 Zobrazit dokončenou objednávku
                                </a>
                            </div>
                            
                            <p style="margin: 30px 0 0 0; color: #64748b; font-size: 13px; line-height: 1.6; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                                Tento e-mail byl automaticky vygenerován systémem ERDMS.<br>
                                Děkujeme za využívání systému ERDMS.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- FOOTER -->
                    <tr>
                        <td style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                                © 2025 ERDMS - Elektronický Registr Dodavatelů a Materiálů<br>
                                Zdravotnická záchranná služba Jihomoravského kraje
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
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Objednávka dokončena</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    
                    <!-- HEADER - Zelený gradient -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                Dokončení potvrzeno
                            </h1>
                            <p style="margin: 12px 0 0 0; color: #d1fae5; font-size: 16px; font-weight: 500;">
                                Objednávka {order_number}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- HLAVNÍ ZPRÁVA -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                                <p style="margin: 0; color: #065f46; font-size: 16px; line-height: 1.6; font-weight: 600;">
                                    ✅ Objednávka byla úspěšně dokončena a všichni účastníci byli informováni
                                </p>
                            </div>
                            
                            <p style="margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.7;">
                                Dobrý den,<br><br>
                                objednávka <strong>{order_number}</strong> byla úspěšně dokončena a proces byl uzavřen.
                            </p>
                            
                            <!-- CTA BUTTON -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                                    📄 Zobrazit objednávku
                                </a>
                            </div>
                            
                            <p style="margin: 30px 0 0 0; color: #64748b; font-size: 13px; line-height: 1.6; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                                Tento e-mail byl automaticky vygenerován systémem ERDMS.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- FOOTER -->
                    <tr>
                        <td style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                                © 2025 ERDMS
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    active = 1,
    dt_updated = NOW()
WHERE type = 'order_status_dokoncena';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Ověření aktualizace
SELECT id, type, name, active, 
       SUBSTRING(email_body, 1, 50) as email_preview,
       dt_updated
FROM 25_notification_templates 
WHERE type IN (
    'order_status_nova',
    'order_status_registr_ceka', 
    'order_status_faktura_pridana',
    'order_status_dokoncena'
)
ORDER BY id;

-- Kontrola všech order_status šablon
SELECT 
    COUNT(*) as total_templates,
    SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active_templates,
    SUM(CASE WHEN email_body LIKE '%<!-- RECIPIENT: RECIPIENT -->%' THEN 1 ELSE 0 END) as dual_variant_templates
FROM 25_notification_templates 
WHERE type LIKE 'order_status_%';
