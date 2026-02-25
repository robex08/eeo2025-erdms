-- =============================================================================
-- INSERT NOVÉ NOTIFIKACE DO PRODUKCE - Informace systému aplikace EEO v2
-- =============================================================================
-- Datum: 23.2.2026
-- Záloha: /var/www/__BCK_PRODUKCE/2026-02-23_09-38-35_eeo2025_before_notification.sql
-- DB: eeo2025 (PRODUKCE)
-- 
-- POZOR: INSERT (ne UPDATE) - původní notifikace 2045 zůstává zachována
-- =============================================================================

INSERT INTO 25_notifikace (
    typ,
    nadpis,
    zprava,
    data_json,
    od_uzivatele_id,
    pro_uzivatele_id,
    prijemci_json,
    pro_vsechny,
    priorita,
    kategorie,
    odeslat_email,
    email_odeslan,
    email_odeslan_kdy,
    objekt_typ,
    objekt_id,
    dt_created,
    dt_expires,
    aktivni
) VALUES (
    'system_announcement',
    'ℹ️ Informace systému aplikace EEO v2',
    '<div class="eeo-notification" style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Oxygen, Ubuntu, Cantarell, ''Helvetica Neue'', sans-serif; color: #374151; font-size: 15px; line-height: 1.7; max-width: 800px; margin: 0 auto;">
    
    <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="font-size: 26px; font-weight: 600; color: #111827; margin: 0; letter-spacing: -0.3px;">ℹ️ Informace systému aplikace EEO v2</h1>
        <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">Aktuální informace | Únor 2026</p>
    </div>

    <div style="background: #eff6ff; border: 1px solid #93c5fd; border-radius: 8px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);">
        <h3 style="font-size: 16px; font-weight: 600; color: #1e40af; margin: 0 0 12px 0;">🎯 Online setkání - 26.2.2026 v 10:30</h3>
        <p style="margin: 0 0 16px 0; color: #1e3a8a; line-height: 1.7;">Rádi bychom Vás pozvali na <strong style="font-weight: 600;">online setkání 26.2.2026 v 10:30</strong>, kde si společně projdeme aktuální stav systému a zodpovíme Vaše dotazy.</p>
        <div style="text-align: center;">
            <a href="https://teams.microsoft.com/l/meetup-join/19%3ameeting_ODY3MWY5YjAtN2NkMy00ZWM0LWE2ZDQtY2VjMTUwYWVkMjdh%40thread.v2/0?context=%7b%22Tid%22%3a%222bd7827b-4550-48ad-bd15-62f9a17990f1%22%2c%22Oid%22%3a%22c3f090b3-3a1e-41f3-95c8-d909f6bc7481%22%7d" 
               style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px; transition: background 0.2s;" 
               onmouseover="this.style.background=''#1d4ed8''" 
               onmouseout="this.style.background=''#2563eb''">
                📹 Odkaz k online schůzce
            </a>
        </div>
    </div>

    <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);">
        <h3 style="font-size: 16px; font-weight: 600; color: #111827; margin: 0 0 12px 0;">📦 EEO aktuálně obsahuje tyto moduly</h3>
        <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px;">Moduly jsou přidělené dle rolí:</p>
        <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 12px;"><span style="color: #2563eb; font-weight: 600; flex-shrink: 0;">📋</span><p style="margin: 0; color: #4b5563; line-height: 1.7;">Objednávky</p></div>
            <div style="display: flex; align-items: center; gap: 12px;"><span style="color: #2563eb; font-weight: 600; flex-shrink: 0;">📂</span><p style="margin: 0; color: #4b5563; line-height: 1.7;">Evidence objednávek před rokem 2026</p></div>
            <div style="display: flex; align-items: center; gap: 12px;"><span style="color: #2563eb; font-weight: 600; flex-shrink: 0;">💰</span><p style="margin: 0; color: #4b5563; line-height: 1.7;">Pokladna</p></div>
            <div style="display: flex; align-items: center; gap: 12px;"><span style="color: #2563eb; font-weight: 600; flex-shrink: 0;">🧾</span><p style="margin: 0; color: #4b5563; line-height: 1.7;">Evidence Faktur</p></div>
            <div style="display: flex; align-items: center; gap: 12px;"><span style="color: #2563eb; font-weight: 600; flex-shrink: 0;">💳</span><p style="margin: 0; color: #4b5563; line-height: 1.7;">Evidence ročních poplatků</p></div>
        </div>
    </div>

    <div style="background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 8px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);">
        <h3 style="font-size: 16px; font-weight: 600; color: #0c4a6e; margin: 0 0 12px 0;">📌 Panel poznámek - nová funkce</h3>
        <p style="margin: 0; color: #075985; line-height: 1.7;">Pro lepší přehlednost při práci s objednávkami je nyní k dispozici <strong style="font-weight: 600;">panel poznámek</strong>, který lze kdykoliv vyvolat. Funkce je dostupná <strong style="font-weight: 600;">na přání uživatele</strong>.</p>
    </div>

    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 15px; color: #78350f; line-height: 1.7;">💡 <strong style="font-weight: 600;">Prosím prostudujte si návody</strong>, naleznete je v&nbsp;pravém horním rohu aplikace pod ikonou otazníku <a href="help" style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; background: #374151; color: white; border-radius: 50%; font-size: 13px; vertical-align: middle; text-decoration: none; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background=''#1f2937''" onmouseout="this.style.background=''#374151''">?</a></p>
    </div>

    <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 24px; border-radius: 8px; text-align: center;">
        <h3 style="font-size: 16px; font-weight: 600; color: #111827; margin: 0 0 16px 0;">Potřebujete pomoc?</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; align-items: center; font-size: 14px;">
            <a href="mailto:helpdesk@zachranka.cz" style="color: #2563eb; font-weight: 500; text-decoration: none;">📧 helpdesk@zachranka.cz</a>
            <span style="color: #d1d5db;">|</span>
            <span style="color: #374151; font-weight: 500;">☎️ 731 137 100</span>
        </div>
    </div>

</div>',
    NULL,  -- data_json
    NULL,  -- od_uzivatele_id
    NULL,  -- pro_uzivatele_id
    NULL,  -- prijemci_json
    1,     -- pro_vsechny
    'EXCEPTIONAL',  -- priorita
    'system',       -- kategorie
    0,     -- odeslat_email
    0,     -- email_odeslan
    NULL,  -- email_odeslan_kdy
    NULL,  -- objekt_typ
    NULL,  -- objekt_id
    NOW(), -- dt_created
    DATE_ADD(NOW(), INTERVAL 30 DAY),  -- dt_expires (30 dní od teď)
    1      -- aktivni
);

-- Ověření vložení
SELECT id, typ, nadpis, pro_vsechny, priorita, kategorie, aktivni, dt_created, dt_expires 
FROM 25_notifikace 
WHERE nadpis = 'ℹ️ Informace systému aplikace EEO v2'
ORDER BY dt_created DESC
LIMIT 2;
