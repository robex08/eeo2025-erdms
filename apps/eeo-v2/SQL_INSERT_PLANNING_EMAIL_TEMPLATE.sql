-- ============================================================================
-- EMAIL ŠABLONA PRO PLANNING UDÁLOSTI
-- ============================================================================
-- Datum: 27. dubna 2026
-- Účel: Manuální odeslání notifikace o nové události
-- 
-- POUŽITÍ:
-- - Organizátor vytvoří událost
-- - Tlačítkem "Odeslat notifikace" rozešle tuto email šablonu příjemcům
-- - Šablona obsahuje detaily události včetně termínů a link na aplikaci
-- ============================================================================

USE `EEO-OSTRA-DEV`;

-- Aktualizace nebo vložení šablony
INSERT INTO 25_notifikace_sablony (
    typ, 
    nazev, 
    email_predmet, 
    email_telo, 
    email_vychozi, 
    app_nadpis, 
    app_zprava, 
    priorita_vychozi, 
    aktivni
)
VALUES (
    'PLANNING_EVENT_CREATED',
    'Nová událost v kalendáři',
    '📅 Nová událost: {event_title}',
    '<!DOCTYPE html>
<html lang="cs" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nová událost v kalendáři</title>
    <!--[if mso]>
    <xml>
        <o:OfficeDocumentSettings>
            <o:AllowPNG/>
            <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
    </xml>
    <style type="text/css">
        body, table, td, p, a {font-family: Arial, sans-serif !important;}
        table {border-collapse: collapse !important;}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="width: 600px; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e7eb;">
                    <!-- Header - Blue theme -->
                    <tr>
                        <td align="center" style="background-color: #2563eb; padding: 0; border-bottom: 4px solid #3b82f6;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                                <tr>
                                    <td align="center" style="padding: 30px 20px;">
                                        <h1 style="margin: 0; padding: 0; color: #ffffff; font-size: 24px; font-weight: 700; font-family: Arial, sans-serif; line-height: 1.2;">
                                            📅 Nová událost v kalendáři
                                        </h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #374151; font-family: Arial, sans-serif;">
                                Dobrý den <strong style="font-weight: 700;">{recipient_name}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #374151; font-family: Arial, sans-serif;">
                                <strong style="font-weight: 700;">{organizer_name}</strong> vytvořil novou událost v plánovacím kalendáři.
                            </p>
                            
                            <!-- Event Details Card -->
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #eff6ff; border: 2px solid #bfdbfe; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <h2 style="margin: 0 0 15px 0; color: #1e40af; font-size: 20px; font-weight: 700; font-family: Arial, sans-serif;">
                                            {event_title}
                                        </h2>
                                        
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                                            <tr>
                                                <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px; font-family: Arial, sans-serif; width: 35%;">Organizátor:</td>
                                                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-family: Arial, sans-serif;">{organizer_name}</td>
                                            </tr>
                                            <tr>
                                                <td colspan="2" style="border-bottom: 1px solid #bfdbfe; padding: 0; line-height: 1px;">&nbsp;</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px; font-family: Arial, sans-serif;">Popis:</td>
                                                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-family: Arial, sans-serif;">{event_description}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Termíny Section -->
                            {terms_section}
                            
                            <!-- CTA Button -->
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <!--[if mso]>
                                        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" 
                                            href="{event_link}" 
                                            style="height:48px;v-text-anchor:middle;width:320px;" 
                                            arcsize="10%" 
                                            stroke="f" 
                                            fillcolor="#2563eb">
                                            <w:anchorlock/>
                                            <center style="color:#ffffff;font-family:Arial, sans-serif;font-size:16px;font-weight:bold;">
                                                Zobrazit událost a potvrdit termín
                                            </center>
                                        </v:roundrect>
                                        <![endif]-->
                                        <!--[if !mso]><!-->
                                        <a href="{event_link}" 
                                           target="_blank" 
                                           style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 16px; font-weight: 600; font-family: Arial, sans-serif; border: 2px solid #3b82f6; text-align: center; mso-hide: all;">
                                            📅 Zobrazit událost a potvrdit termín
                                        </a>
                                        <!--<![endif]-->
                                    </td>
                                </tr>
                            </table>
                            
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-top: 30px; border-top: 1px solid #e5e7eb;">
                                <tr>
                                    <td style="padding-top: 20px;">
                                        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6b7280; font-family: Arial, sans-serif;">
                                            Tento e-mail byl automaticky vygenerován systémem EEO v2.<br>
                                            Pro potvrzení nebo odmítnutí termínu prosím použijte tlačítko výše.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; font-size: 12px; color: #9ca3af; font-family: Arial, sans-serif;">
                                © 2026 EEO V2 | Modul plánování a rezervací
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    1,
    'Nová událost: {event_title}',
    '{organizer_name} vytvořil událost "{event_title}" na {event_date}',
    'normal',
    1
)
ON DUPLICATE KEY UPDATE 
    nazev = VALUES(nazev),
    email_predmet = VALUES(email_predmet),
    email_telo = VALUES(email_telo),
    email_vychozi = VALUES(email_vychozi),
    app_nadpis = VALUES(app_nadpis),
    app_zprava = VALUES(app_zprava),
    priorita_vychozi = VALUES(priorita_vychozi),
    aktivni = VALUES(aktivni);

SELECT 'Email šablona pro PLANNING_EVENT_CREATED byla úspěšně vytvořena/aktualizována.' as Status;
