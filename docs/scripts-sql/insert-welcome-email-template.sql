-- Vložení uvítací email šablony pro nové uživatele
-- Placeholder: {docasne_heslo}

INSERT INTO 25_notifikace_sablony (
    typ,
    nazev,
    email_predmet,
    email_telo,
    app_nadpis,
    app_zprava,
    email_vychozi,
    priorita_vychozi,
    aktivni,
    dt_created,
    dt_updated
) VALUES (
    'welcome_new_user',
    'Uvítací email - Nový uživatel EEO systému',
    'Váš přístup do EEO systému správy objednávek',
    '<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Přístup do EEO systému</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                                🎉 Vítejte v EEO systému
                            </h1>
                            <p style="margin: 10px 0 0 0; color: #e0f2fe; font-size: 16px;">
                                Správa a workflow objednávek
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
                                <strong>Dobrý den,</strong>
                            </p>
                            <p style="margin: 0 0 25px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                                s potěšením Vám oznamujeme, že Vám byl založen přístup k našemu novému 
                                <strong style="color: #2563eb;">EEO systému správy a workflow objednávek</strong>.
                            </p>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 30px 0; background-color: #eff6ff; border: 2px solid #3b82f6; border-radius: 8px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding-bottom: 15px;">
                                                    <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">
                                                        📝 Vaše přihlašovací údaje:
                                                    </p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px 0;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                        <tr>
                                                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">
                                                                <strong>🔑 Heslo:</strong>
                                                            </td>
                                                            <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">
                                                                <code style="background-color: #ffffff; padding: 4px 8px; border-radius: 4px; font-family: Courier New, monospace; font-size: 15px; color: #dc2626; font-weight: 600;">
                                                                    {docasne_heslo}
                                                                </code>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding-top: 8px;">
                                                    <p style="margin: 0; color: #6b7280; font-size: 13px; font-style: italic;">
                                                        ℹ️ Jedná se o dočasné heslo
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 30px 0;">
                                <tr>
                                    <td style="padding: 15px 0; text-align: center;">
                                        <a href="https://erdms.zachranka.cz/eeo-v2" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);">
                                            🔵 Odkaz na aplikaci
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 30px 0; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <p style="margin: 0 0 18px 0; color: #1f2937; font-size: 15px; font-weight: 600;">
                                            ✅ Jak začít
                                        </p>
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 10px 0;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                        <tr>
                                                            <td style="vertical-align: top; width: 30px; color: #3b82f6; font-weight: 700; font-size: 15px;">1.</td>
                                                            <td style="vertical-align: top; color: #4b5563; font-size: 14px; line-height: 1.6;">
                                                                Otevři aplikaci na <a href="https://erdms.zachranka.cz/eeo-v2" style="color: #3b82f6; text-decoration: none; font-weight: 600;">https://erdms.zachranka.cz/eeo-v2</a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                        <tr>
                                                            <td style="vertical-align: top; width: 30px; color: #3b82f6; font-weight: 700; font-size: 15px;">2.</td>
                                                            <td style="vertical-align: top; color: #4b5563; font-size: 14px; line-height: 1.6;">
                                                                Přihlašte se pomocí výše uvedených údajů
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                        <tr>
                                                            <td style="vertical-align: top; width: 30px; color: #3b82f6; font-weight: 700; font-size: 15px;">3.</td>
                                                            <td style="vertical-align: top; color: #4b5563; font-size: 14px; line-height: 1.6;">
                                                                Při prvním přihlášení si nastavte <strong>nové heslo přes úpravu profilu v aplikaci</strong> 👤
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                        <tr>
                                                            <td style="vertical-align: top; width: 30px; color: #3b82f6; font-weight: 700; font-size: 15px;">4.</td>
                                                            <td style="vertical-align: top; color: #4b5563; font-size: 14px; line-height: 1.6;">
                                                                Přečti si <strong>Nápovědu</strong> a začni pracovat
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 30px 40px 30px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <p style="margin: 0 0 20px 0; color: #059669; font-size: 16px; font-weight: 600;">
                                            💚 Kontakty a podpora
                                        </p>
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
                                            <tr>
                                                <td style="padding-bottom: 15px; border-bottom: 1px solid #e5e7eb;">
                                                    <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 15px; font-weight: 600;">
                                                        IT hotline – nonstop
                                                    </p>
                                                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">
                                                        Technická podpora 24/7
                                                    </p>
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                        <tr>
                                                            <td style="padding: 5px 0;">
                                                                <span style="color: #10b981; font-size: 14px; font-weight: 600;">📞</span>
                                                                <a href="tel:731137100" style="color: #059669; text-decoration: none; font-size: 14px; font-weight: 600; margin-left: 8px;">731 137 100</a>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding: 5px 0;">
                                                                <span style="color: #10b981; font-size: 14px; font-weight: 600;">📧</span>
                                                                <a href="mailto:helpdesk@zachranka.cz" style="color: #059669; text-decoration: none; font-size: 14px; margin-left: 8px;">helpdesk@zachranka.cz</a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td>
                                                    <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 15px; font-weight: 600;">
                                                        Robert Holovský
                                                    </p>
                                                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">
                                                        IT a programátor
                                                    </p>
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                        <tr>
                                                            <td style="padding: 5px 0;">
                                                                <span style="color: #10b981; font-size: 14px; font-weight: 600;">📞</span>
                                                                <a href="tel:731137077" style="color: #059669; text-decoration: none; font-size: 14px; font-weight: 600; margin-left: 8px;">731 137 077</a>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding: 5px 0;">
                                                                <span style="color: #10b981; font-size: 14px; font-weight: 600;">📧</span>
                                                                <a href="mailto:robert.holovsky@zachranka.cz" style="color: #059669; text-decoration: none; font-size: 14px; margin-left: 8px;">robert.holovsky@zachranka.cz</a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 25px 30px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">
                                Tento email byl vygenerován automaticky systémem EEO
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                © {YEAR} Zdravotnická záchranná služba Středočeského kraje
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    'Nový přístup do EEO systému',
    'Byl Vám založen přístup do EEO systému správy objednávek.',
    1,
    'normal',
    1,
    NOW(),
    NOW()
);
