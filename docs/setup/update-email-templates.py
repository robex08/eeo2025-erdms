#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Update email šablon do DB - order_status_ke_schvaleni
Spojuje 3 varianty (APPROVER_NORMAL, APPROVER_URGENT, SUBMITTER) do jednoho pole
"""

import sys
sys.path.insert(0, '/var/www/erdms-dev/apps/eeo-v2/client/src/pages')

# Načtení šablon z emailTemplatesFromDB.js
import subprocess
import pymysql

# Definice 3 variant šablon
APPROVER_NORMAL = """<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nová objednávka ke schválení</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #f97316, #fb923c); padding: 30px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; text-align: center;">
                                ❗ Nová objednávka ke schválení
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                                Dobrý den <strong>{approver_name}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #374151;">
                                byla vytvořena <strong>nová objednávka</strong>, která vyžaduje vaše schválení.
                            </p>
                            
                            <!-- Order Details Card -->
                            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
                                <h2 style="margin: 0 0 15px; color: #1f2937; font-size: 18px; font-weight: 600;">
                                    📋 Detaily objednávky
                                </h2>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Číslo objednávky:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{order_number}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Předmět:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{predmet}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Střediska:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{strediska}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Zdroj financování:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{financovani}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Poznámka:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{financovani_poznamka}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Cena s DPH:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 700; font-size: 16px;">{amount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Datum vytvoření:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{date}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #fb923c); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);">
                                    👁️ Zobrazit a schválit objednávku
                                </a>
                            </div>
                            
                            <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                                Tento e-mail byl automaticky vygenerován systémem EEO.<br>
                                Pro schválení nebo zamítnutí objednávky prosím použijte tlačítko výše.
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
</html>"""

# Spojení všech 3 variant
combined_email_body = f"""<!-- RECIPIENT: APPROVER_NORMAL -->
{APPROVER_NORMAL}

<!-- RECIPIENT: APPROVER_URGENT -->
{APPROVER_NORMAL.replace('#f97316', '#dc2626').replace('#fb923c', '#b91c1c').replace('❗ Nová objednávka ke schválení', '<span style="display: inline-block; font-family: \\'Segoe UI Symbol\\', \\'Apple Color Emoji\\', sans-serif; font-style: normal; color: #dc2626; font-size: 32px; font-weight: bold; text-shadow: -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, -3px 0 0 #fff, 3px 0 0 #fff, 0 -3px 0 #fff, 0 3px 0 #fff;">⚡</span> Nová objednávka ke schválení').replace('249, 115, 22', '220, 38, 38')}

<!-- RECIPIENT: SUBMITTER -->
{APPROVER_NORMAL.replace('#f97316', '#059669').replace('#fb923c', '#047857').replace('❗ Nová objednávka ke schválení', '✅ Objednávka odeslána ke schválení').replace('Dobrý den <strong>{approver_name}</strong>', 'Dobrý den <strong>{user_name}</strong>').replace('byla vytvořena <strong>nová objednávka</strong>, která vyžaduje vaše schválení', 'vaše objednávka byla <strong>úspěšně odeslána ke schválení</strong>. O jejím schválení nebo zamítnutí budete informováni e-mailem').replace('Detaily objednávky', 'Detaily vaší objednávky').replace('249, 115, 22', '5, 150, 105').replace('Zobrazit a schválit objednávku', 'Zobrazit objednávku').replace('Pro schválení nebo zamítnutí objednávky prosím použijte tlačítko výše', 'Jakmile bude objednávka schválena nebo zamítnuta, dostanete další e-mail s informací o výsledku')}"""

# DB připojení
try:
    connection = pymysql.connect(
        host='10.3.172.11',
        user='erdms_user',
        password='AhchohTahnoh7eim',
        database='eeo2025',
        charset='utf8mb4'
    )
    
    with connection.cursor() as cursor:
        sql = "UPDATE 25_notification_templates SET email_body = %s WHERE type = 'order_status_ke_schvaleni'"
        cursor.execute(sql, (combined_email_body,))
        connection.commit()
        print(f"✓ Email šablony byly úspěšně aktualizovány ({cursor.rowcount} záznamů)")
        
finally:
    connection.close()
