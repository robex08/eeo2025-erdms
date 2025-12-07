// =================================================================================
// DALŠÍ EMAIL ŠABLONY PRO WORKFLOW FÁZE
// =================================================================================
// Nové šablony pro: Schváleno, Potvrzeno dodavatelem, Faktury, Věcná správnost
// Placeholders: {order_number}, {predmet}, {amount}, {date}, {user_name}, 
//               {approver_name}, {order_id}, {invoice_number}, {invoice_amount},
//               {invoice_count}, {invoiced_total}
// =================================================================================

export const DB_TEMPLATE_APPROVED = `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Objednávka byla schválena</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; text-align: center;">
                                ✅ Objednávka schválena
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
                                vaše objednávka byla <strong>schválena</strong> uživatelem <strong>{approver_name}</strong>. Nyní může být odeslána dodavateli.
                            </p>
                            
                            <!-- Order Details Card -->
                            <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
                                <h2 style="margin: 0 0 15px; color: #065f46; font-size: 18px; font-weight: 600;">
                                    📋 Detaily objednávky
                                </h2>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px; width: 180px;">Číslo objednávky:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 700;">{order_number}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Předmět:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{predmet}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Cena celkem s DPH:</td>
                                        <td style="padding: 8px 0; color: #065f46; font-size: 18px; font-weight: 700;">{amount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Datum schválení:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{date}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                                    👁️ Zobrazit objednávku
                                </a>
                            </div>
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
</html>`;

export const DB_TEMPLATE_CONFIRMED_BY_SUPPLIER = `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Objednávka potvrzena dodavatelem</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 30px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; text-align: center;">
                                📦 Potvrzeno dodavatelem
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
                                objednávka byla <strong>potvrzena dodavatelem</strong>. Čekáme na dodání zboží/služeb.
                            </p>
                            
                            <!-- Order Details Card -->
                            <div style="background: #eff6ff; border: 2px solid #93c5fd; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
                                <h2 style="margin: 0 0 15px; color: #1e40af; font-size: 18px; font-weight: 600;">
                                    📋 Detaily objednávky
                                </h2>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px; width: 180px;">Číslo objednávky:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 700;">{order_number}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Předmět:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{predmet}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Cena celkem s DPH:</td>
                                        <td style="padding: 8px 0; color: #1e40af; font-size: 18px; font-weight: 700;">{amount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Datum potvrzení:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{date}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                                    👁️ Zobrazit objednávku
                                </a>
                            </div>
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
</html>`;

export const DB_TEMPLATE_INVOICE_RECEIVED = `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Přijata faktura k objednávce</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); padding: 30px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; text-align: center;">
                                🧾 Přijata faktura
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
                                k objednávce byla <strong>přijata faktura</strong> od dodavatele. Faktura čeká na kontrolu a zpracování.
                            </p>
                            
                            <!-- Order Details Card -->
                            <div style="background: #faf5ff; border: 2px solid #d8b4fe; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
                                <h2 style="margin: 0 0 15px; color: #6b21a8; font-size: 18px; font-weight: 600;">
                                    📋 Detaily objednávky a faktury
                                </h2>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px; width: 180px;">Číslo objednávky:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 700;">{order_number}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Předmět:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{predmet}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Číslo faktury:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 700;">{invoice_number}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Částka faktury s DPH:</td>
                                        <td style="padding: 8px 0; color: #6b21a8; font-size: 18px; font-weight: 700;">{invoice_amount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Počet faktur celkem:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{invoice_count}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Datum přijetí:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{date}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(139, 92, 246, 0.3);">
                                    👁️ Zobrazit faktury
                                </a>
                            </div>
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
</html>`;

export const DB_TEMPLATE_MATERIAL_CORRECTNESS = `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kontrola věcné správnosti</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #14b8a6, #0d9488); padding: 30px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; text-align: center;">
                                ✔️ Kontrola věcné správnosti
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
                                faktura k objednávce vyžaduje <strong>kontrolu věcné správnosti</strong>. Prosím ověřte, zda dodané zboží/služby odpovídají objednávce a fakturované částce.
                            </p>
                            
                            <!-- Order Details Card -->
                            <div style="background: #f0fdfa; border: 2px solid #99f6e4; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
                                <h2 style="margin: 0 0 15px; color: #115e59; font-size: 18px; font-weight: 600;">
                                    📋 Detaily kontroly
                                </h2>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px; width: 180px;">Číslo objednávky:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 700;">{order_number}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Předmět:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{predmet}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Objednaná částka:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{amount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Fakturováno celkem:</td>
                                        <td style="padding: 8px 0; color: #115e59; font-size: 18px; font-weight: 700;">{invoiced_total}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Počet faktur:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{invoice_count}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Datum vytvoření:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{date}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}" style="display: inline-block; background: linear-gradient(135deg, #14b8a6, #0d9488); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(20, 184, 166, 0.3);">
                                    ✓ Zkontrolovat věcnou správnost
                                </a>
                            </div>
                            
                            <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                                Tento e-mail byl automaticky vygenerován systémem EEO.<br>
                                Po provedení kontroly prosím potvrďte věcnou správnost v systému.
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
</html>`;

// =================================================================================
// ŠABLONA 5: K UVEŘEJNĚNÍ V REGISTRU SMLUV
// =================================================================================

export const DB_TEMPLATE_TO_PUBLISH_REGISTRY = `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Objednávka k uveřejnění v registru smluv</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; text-align: center;">
                                📢 K uveřejnění v registru smluv
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
                                objednávka byla označena jako <strong>určená k uveřejnění v registru smluv</strong>. Je nutné zajistit její uveřejnění v souladu s legislativními požadavky.
                            </p>
                            
                            <!-- Order Details Card -->
                            <div style="background: #fffbeb; border: 2px solid #fcd34d; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
                                <h2 style="margin: 0 0 15px; color: #92400e; font-size: 18px; font-weight: 600;">
                                    📋 Detaily objednávky
                                </h2>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px; width: 180px;">Číslo objednávky:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 700;">{order_number}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Předmět:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{predmet}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Celková cena:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 700;">{amount} Kč</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Datum:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{date}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Important Notice -->
                            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin-bottom: 25px;">
                                <p style="margin: 0; font-size: 14px; color: #92400e;">
                                    <strong>⚠️ Důležité upozornění:</strong><br>
                                    Objednávka podléhá zveřejnění v registru smluv dle zákona č. 340/2015 Sb. Zajistěte prosím její publikaci v zákonem stanovené lhůtě.
                                </p>
                            </div>
                            
                            <!-- Action Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{order_link}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                                    Zobrazit objednávku
                                </a>
                            </div>
                            
                            <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                                S pozdravem,<br>
                                <strong>Webaplikace EEO</strong>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                                Toto je automaticky generovaná zpráva z elektronického systému EEO.<br>
                                Prosím neodpovídejte na tento e-mail.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

// =================================================================================
// ŠABLONA 6: UVEŘEJNĚNO V REGISTRU SMLUV
// =================================================================================

export const DB_TEMPLATE_PUBLISHED_IN_REGISTRY = `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Objednávka uveřejněna v registru smluv</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #06b6d4, #0891b2); padding: 30px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; text-align: center;">
                                ✅ Uveřejněno v registru smluv
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
                                objednávka byla <strong>úspěšně uveřejněna v registru smluv</strong>. Legislativní povinnost byla splněna.
                            </p>
                            
                            <!-- Order Details Card -->
                            <div style="background: #ecfeff; border: 2px solid #67e8f9; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
                                <h2 style="margin: 0 0 15px; color: #164e63; font-size: 18px; font-weight: 600;">
                                    📋 Detaily objednávky
                                </h2>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px; width: 180px;">Číslo objednávky:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 700;">{order_number}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Předmět:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{predmet}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Celková cena:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 700;">{amount} Kč</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Datum uveřejnění:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{date}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Uveřejnil(a):</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{publisher_name}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Success Notice -->
                            <div style="background: #cffafe; border-left: 4px solid #06b6d4; padding: 15px 20px; margin-bottom: 25px;">
                                <p style="margin: 0; font-size: 14px; color: #164e63;">
                                    <strong>✅ Stav publikace:</strong><br>
                                    Objednávka je nyní veřejně dostupná v registru smluv v souladu se zákonem č. 340/2015 Sb.
                                </p>
                            </div>
                            
                            <!-- Action Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{order_link}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4, #0891b2); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                                    Zobrazit objednávku
                                </a>
                            </div>
                            
                            <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                                S pozdravem,<br>
                                <strong>Webaplikace EEO</strong>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                                Toto je automaticky generovaná zpráva z elektronického systému EEO.<br>
                                Prosím neodpovídejte na tento e-mail.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
