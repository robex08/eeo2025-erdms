-- ================================================
-- Přidání šablony pro zamítnutou věcnou správnost
-- INVOICE_MATERIAL_CHECK_REJECTED
-- ================================================

INSERT INTO `25_notifikace_sablony` 
(
    `typ`,
    `nazev`,
    `email_predmet`,
    `email_telo`,
    `email_vychozi`,
    `app_nadpis`,
    `app_zprava`,
    `priorita_vychozi`,
    `aktivni`,
    `dt_created`,
    `dt_updated`
)
VALUES
(
    'INVOICE_MATERIAL_CHECK_REJECTED',
    'Věcná správnost faktury zamítnuta',
    '❌ Věcná správnost faktury {{invoice_number}} byla zamítnuta',
    '<!-- OUTLOOK COMPATIBLE VERSION - Fixed gradients, box-shadow -->
<!DOCTYPE html>
<html lang="cs" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Věcná správnost faktury zamítnuta</title>
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
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="width: 600px; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border: 1px solid #fca5a5;">
                    <!-- Header - Red theme -->
                    <tr>
                        <td align="center" style="background-color: #dc2626; padding: 0; border-bottom: 4px solid #b91c1c;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                                <tr>
                                    <td align="center" style="padding: 30px 20px;">
                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                                            <tr>
                                                <td align="center" style="padding: 0;">
                                                    <h1 style="margin: 0; padding: 0; color: #ffffff; font-size: 24px; font-weight: 700; font-family: Arial, sans-serif; line-height: 1.2;">Věcná správnost faktury zamítnuta</h1>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 0 0 20px 0;">
                                        <p style="margin: 0; padding: 0; color: #111827; font-size: 16px; line-height: 1.6; font-family: Arial, sans-serif;">
                                            Věcná správnost faktury <strong>{{invoice_number}}</strong> byla zamítnuta kontrolorem.
                                        </p>
                                    </td>
                                </tr>

                                <!-- Důvod zamítnutí -->
                                {{#if rejection_reason}}
                                <tr>
                                    <td style="padding: 0 0 20px 0;">
                                        <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin: 0;">
                                            <p style="margin: 0 0 8px 0; padding: 0; color: #991b1b; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif;">
                                                Důvod zamítnutí:
                                            </p>
                                            <p style="margin: 0; padding: 0; color: #7f1d1d; font-size: 14px; line-height: 1.5; font-family: Arial, sans-serif;">
                                                {{rejection_reason}}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                                {{/if}}

                                <!-- Details table -->
                                <tr>
                                    <td style="padding: 0 0 30px 0;">
                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #f9fafb; border: 1px solid #e5e7eb;">
                                            {{#if order_number}}
                                            <tr>
                                                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                                                    <p style="margin: 0; padding: 0; color: #6b7280; font-size: 13px; font-family: Arial, sans-serif;">Objednávka:</p>
                                                </td>
                                                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                                                    <p style="margin: 0; padding: 0; color: #111827; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif;">{{order_number}}</p>
                                                </td>
                                            </tr>
                                            {{/if}}
                                            {{#if invoice_amount}}
                                            <tr>
                                                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                                                    <p style="margin: 0; padding: 0; color: #6b7280; font-size: 13px; font-family: Arial, sans-serif;">Částka faktury:</p>
                                                </td>
                                                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                                                    <p style="margin: 0; padding: 0; color: #111827; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif;">{{invoice_amount}} Kč</p>
                                                </td>
                                            </tr>
                                            {{/if}}
                                            {{#if organization_name}}
                                            <tr>
                                                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                                                    <p style="margin: 0; padding: 0; color: #6b7280; font-size: 13px; font-family: Arial, sans-serif;">Organizace:</p>
                                                </td>
                                                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                                                    <p style="margin: 0; padding: 0; color: #111827; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif;">{{organization_name}}</p>
                                                </td>
                                            </tr>
                                            {{/if}}
                                            {{#if rejected_by_name}}
                                            <tr>
                                                <td style="padding: 12px 16px;">
                                                    <p style="margin: 0; padding: 0; color: #6b7280; font-size: 13px; font-family: Arial, sans-serif;">Zamítnul:</p>
                                                </td>
                                                <td style="padding: 12px 16px;">
                                                    <p style="margin: 0; padding: 0; color: #111827; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif;">{{rejected_by_name}}</p>
                                                </td>
                                            </tr>
                                            {{/if}}
                                        </table>
                                    </td>
                                </tr>

                                <!-- Next steps -->
                                <tr>
                                    <td style="padding: 0 0 30px 0;">
                                        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 0;">
                                            <p style="margin: 0 0 8px 0; padding: 0; color: #92400e; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif;">
                                                ⚠️ Další kroky:
                                            </p>
                                            <p style="margin: 0; padding: 0; color: #78350f; font-size: 14px; line-height: 1.5; font-family: Arial, sans-serif;">
                                                Faktura byla vrácena k dořešení. Prosím, upravte fakturu podle důvodu zamítnutí a odešlete ji znovu ke kontrole věcné správnosti.
                                            </p>
                                        </div>
                                    </td>
                                </tr>

                                <!-- CTA Button -->
                                <tr>
                                    <td align="center" style="padding: 0 0 30px 0;">
                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                            <tr>
                                                <td align="center" style="background-color: #dc2626; padding: 14px 32px; border-radius: 6px;">
                                                    <a href="{{detail_url}}" style="display: inline-block; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; font-family: Arial, sans-serif;">
                                                        Zobrazit fakturu
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; padding: 0; color: #6b7280; font-size: 12px; line-height: 1.5; text-align: center; font-family: Arial, sans-serif;">
                                Toto je automatická notifikace ze systému ERDMS<br>
                                Prosím neodpovídejte na tento email
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
    'Věcná správnost zamítnuta: {{invoice_number}}',
    'Věcná správnost faktury {{invoice_number}} byla zamítnuta kontrolorem - nutné úpravy. {{#if rejection_reason}}Důvod: {{rejection_reason}}{{/if}}',
    'high',
    1,
    NOW(),
    NOW()
);

-- ================================================
-- Ověření
-- ================================================
SELECT 'Šablona INVOICE_MATERIAL_CHECK_REJECTED vytvořena' as Status;
SELECT id, typ, nazev FROM 25_notifikace_sablony WHERE typ = 'INVOICE_MATERIAL_CHECK_REJECTED';
