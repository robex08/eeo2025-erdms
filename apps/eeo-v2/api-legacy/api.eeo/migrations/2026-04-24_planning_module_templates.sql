-- ===============================================
-- PLANNING MODULE - Notifikační šablony
-- Vytvořeno: 2026-04-24
-- ===============================================

-- Kontrola zda již šablony neexistují (idempotence)
DELETE FROM 25_notifikace_sablony WHERE typ IN ('PLANNING_MESSAGE_CREATED', 'PLANNING_EVENT_CREATED', 'PLANNING_MESSAGE_RESPONSE', 'PLANNING_EVENT_RESPONSE');

-- 1. PLANNING_MESSAGE_CREATED - Nová zpráva na dashboardu
INSERT INTO 25_notifikace_sablony (typ, nazev, email_predmet, email_telo, app_nadpis, app_zprava, aktivni, dt_created)
VALUES (
  'PLANNING_MESSAGE_CREATED',
  'Nová zpráva v plánování',
  '📋 Nová zpráva: {nazev}',
  '<!DOCTYPE html>
<html lang="cs" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nová zpráva v plánování</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="width: 600px; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border: 1px solid #fed7aa;">
                    <tr>
                        <td align="center" style="background-color: #f59e0b; padding: 0; border-bottom: 4px solid #f97316;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                                <tr>
                                    <td align="center" style="padding: 30px 20px;">
                                        <h1 style="margin: 0; padding: 0; color: #ffffff; font-size: 24px; font-weight: 700; font-family: Arial, sans-serif; line-height: 1.2;">📋 Nová zpráva</h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #374151; font-family: Arial, sans-serif;">
                                Dobrý den <strong style="font-weight: 700;">{recipient_name}</strong>,
                            </p>
                            <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #374151; font-family: Arial, sans-serif;">
                                byla vytvořena nová zpráva v modulu plánování.
                            </p>
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #fef3c7; border: 2px solid #fed7aa; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px; font-weight: 600; font-family: Arial, sans-serif;">{nazev}</h2>
                                        <p style="margin: 0; color: #4b5563; font-size: 14px; font-family: Arial, sans-serif; line-height: 1.6;">{obsah}</p>
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-top: 15px;">
                                            <tr>
                                                <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px; font-family: Arial, sans-serif; width: 35%;">Platnost od:</td>
                                                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-family: Arial, sans-serif;">{dt_od}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px; font-family: Arial, sans-serif;">Platnost do:</td>
                                                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-family: Arial, sans-serif;">{dt_do}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 30px auto 0;">
                                <tr>
                                    <td align="center" style="background-color: #f59e0b; padding: 15px 40px; border: 2px solid #f97316;">
                                        <a href="{system_url}/planning" target="_blank" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; font-family: Arial, sans-serif; display: block;">
                                            Zobrazit v systému
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #6b7280; font-family: Arial, sans-serif; text-align: center;">
                                Tento email byl odeslán systémem ERDMS<br>
                                {system_url}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
  'Nová zpráva v plánování',
  '{nazev}\n\n{obsah}\n\nPlatnost: {dt_od} - {dt_do}',
  1,
  NOW()
);

-- 2. PLANNING_EVENT_CREATED - Nová událost v kalendáři
INSERT INTO 25_notifikace_sablony (typ, nazev, email_predmet, email_telo, app_nadpis, app_zprava, aktivni, dt_created)
VALUES (
  'PLANNING_EVENT_CREATED',
  'Nová událost v kalendáři',
  '📅 Nová událost: {nazev}',
  '<!DOCTYPE html>
<html lang="cs" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nová událost v kalendáři</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="width: 600px; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border: 1px solid #fed7aa;">
                    <tr>
                        <td align="center" style="background-color: #f59e0b; padding: 0; border-bottom: 4px solid #f97316;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                                <tr>
                                    <td align="center" style="padding: 30px 20px;">
                                        <h1 style="margin: 0; padding: 0; color: #ffffff; font-size: 24px; font-weight: 700; font-family: Arial, sans-serif; line-height: 1.2;">📅 Nová událost v kalendáři</h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #374151; font-family: Arial, sans-serif;">
                                Dobrý den <strong style="font-weight: 700;">{recipient_name}</strong>,
                            </p>
                            <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #374151; font-family: Arial, sans-serif;">
                                byla vytvořena nová událost v kalendáři.
                            </p>
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #fef3c7; border: 2px solid #fed7aa; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px; font-weight: 600; font-family: Arial, sans-serif;">{nazev}</h2>
                                        <p style="margin: 0 0 15px 0; color: #4b5563; font-size: 14px; font-family: Arial, sans-serif; line-height: 1.6;">{popis}</p>
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                                            <tr>
                                                <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px; font-family: Arial, sans-serif; width: 35%;">Začátek:</td>
                                                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-family: Arial, sans-serif;">{dt_od}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px; font-family: Arial, sans-serif;">Konec:</td>
                                                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-family: Arial, sans-serif;">{dt_do}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 30px auto 0;">
                                <tr>
                                    <td align="center" style="background-color: #f59e0b; padding: 15px 40px; border: 2px solid #f97316;">
                                        <a href="{system_url}/planning" target="_blank" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; font-family: Arial, sans-serif; display: block;">
                                            Zobrazit v systému
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #6b7280; font-family: Arial, sans-serif; text-align: center;">
                                Tento email byl odeslán systémem ERDMS<br>
                                {system_url}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
  'Nová událost v kalendáři',
  '{nazev}\n\n{popis}\n\nČas: {dt_od} - {dt_do}',
  1,
  NOW()
);

-- 3. PLANNING_MESSAGE_RESPONSE - Odpověď na zprávu
INSERT INTO 25_notifikace_sablony (typ, nazev, email_predmet, email_telo, app_nadpis, app_zprava, aktivni, dt_created)
VALUES (
  'PLANNING_MESSAGE_RESPONSE',
  'Odpověď na zprávu',
  '💬 Nová odpověď na zprávu: {nazev}',
  '<!DOCTYPE html>
<html lang="cs" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Odpověď na zprávu</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="width: 600px; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border: 1px solid #fed7aa;">
                    <tr>
                        <td align="center" style="background-color: #f59e0b; padding: 0; border-bottom: 4px solid #f97316;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                                <tr>
                                    <td align="center" style="padding: 30px 20px;">
                                        <h1 style="margin: 0; padding: 0; color: #ffffff; font-size: 24px; font-weight: 700; font-family: Arial, sans-serif; line-height: 1.2;">💬 Nová odpověď</h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #374151; font-family: Arial, sans-serif;">
                                Dobrý den <strong style="font-weight: 700;">{recipient_name}</strong>,
                            </p>
                            <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #374151; font-family: Arial, sans-serif;">
                                uživatel <strong>{user_name}</strong> odpověděl na zprávu "{nazev}".
                            </p>
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #fef3c7; border: 2px solid #fed7aa; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0; color: #1f2937; font-size: 14px; font-family: Arial, sans-serif; line-height: 1.6;">{odpoved_text}</p>
                                    </td>
                                </tr>
                            </table>
                            <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 30px auto 0;">
                                <tr>
                                    <td align="center" style="background-color: #f59e0b; padding: 15px 40px; border: 2px solid #f97316;">
                                        <a href="{system_url}/planning" target="_blank" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; font-family: Arial, sans-serif; display: block;">
                                            Zobrazit v systému
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #6b7280; font-family: Arial, sans-serif; text-align: center;">
                                Tento email byl odeslán systémem ERDMS<br>
                                {system_url}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
  'Odpověď na zprávu',
  'Nová odpověď od {user_name}:\n\n{odpoved_text}',
  1,
  NOW()
);

-- 4. PLANNING_EVENT_RESPONSE - Odpověď na událost
INSERT INTO 25_notifikace_sablony (typ, nazev, email_predmet, email_telo, app_nadpis, app_zprava, aktivni, dt_created)
VALUES (
  'PLANNING_EVENT_RESPONSE',
  'Odpověď na událost',
  '💬 Nová odpověď na událost: {nazev}',
  '<!DOCTYPE html>
<html lang="cs" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Odpověď na událost</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="width: 600px; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border: 1px solid #fed7aa;">
                    <tr>
                        <td align="center" style="background-color: #f59e0b; padding: 0; border-bottom: 4px solid #f97316;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                                <tr>
                                    <td align="center" style="padding: 30px 20px;">
                                        <h1 style="margin: 0; padding: 0; color: #ffffff; font-size: 24px; font-weight: 700; font-family: Arial, sans-serif; line-height: 1.2;">💬 Nová odpověď</h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #374151; font-family: Arial, sans-serif;">
                                Dobrý den <strong style="font-weight: 700;">{recipient_name}</strong>,
                            </p>
                            <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #374151; font-family: Arial, sans-serif;">
                                uživatel <strong>{user_name}</strong> odpověděl na událost "{nazev}".
                            </p>
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #fef3c7; border: 2px solid #fed7aa; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0; color: #1f2937; font-size: 14px; font-family: Arial, sans-serif; line-height: 1.6;">{odpoved_text}</p>
                                    </td>
                                </tr>
                            </table>
                            <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 30px auto 0;">
                                <tr>
                                    <td align="center" style="background-color: #f59e0b; padding: 15px 40px; border: 2px solid #f97316;">
                                        <a href="{system_url}/planning" target="_blank" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; font-family: Arial, sans-serif; display: block;">
                                            Zobrazit v systému
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #6b7280; font-family: Arial, sans-serif; text-align: center;">
                                Tento email byl odeslán systémem ERDMS<br>
                                {system_url}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
  'Odpověď na událost',
  'Nová odpověď od {user_name}:\n\n{odpoved_text}',
  1,
  NOW()
);

-- Ověření zda byly šablony vytvořeny
SELECT id, typ, nazev FROM 25_notifikace_sablony WHERE typ LIKE 'PLANNING_%';
