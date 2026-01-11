-- ===========================================================================
-- Nahrání šablony notifikace ID 952 do produkce
-- Datum: 3. ledna 2026
-- Verze: 1.95
-- Účel: Post-login modal - Uvítací zpráva pro nový EEO v2 systém
-- ===========================================================================

-- Ověření, zda notifikace s ID 952 již existuje (pokud ano, přeskočit)
-- Pro manuální použití: nejprve zkontrolovat, pak spustit INSERT

-- KONTROLA PŘED NAHRÁNÍM:
-- SELECT id, typ, nadpis FROM 25_notifikace WHERE id = 952;

-- Pokud neexistuje, vložit:
INSERT INTO 25_notifikace (
    id,
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
    952,
    'system_announcement',
    '🎉 Vítejte v novém EEO systému v2!',
    '<div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 12px; padding: 40px; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; color: #1e293b; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 50%; margin-bottom: 20px; box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.4);">
            <span style="font-size: 36px; color: white;">🎯</span>
        </div>
        <h1 style="color: #1e293b; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.025em;">Úspěšně jste se přihlásili do nového EEO systému!</h1>
        <p style="color: #64748b; font-size: 18px; margin: 15px 0 0 0; font-weight: 400;">
            S účinností od <strong style="color: #3b82f6;">5. ledna 2026</strong> pracujete v kompletně renovovaném systému EEO v2
        </p>
    </div>
    
    <div style="background: #ffffff; border-radius: 12px; padding: 30px; margin: 30px 0; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
        <h2 style="color: #1e293b; font-size: 20px; font-weight: 600; margin: 0 0 20px 0; display: flex; align-items: center; gap: 12px;">
            <span style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; color: white; font-size: 16px;">✨</span>
            Klíčové novinky pro Vás
        </h2>
        <div style="display: grid; gap: 16px;">
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span style="color: #10b981; font-size: 20px; margin-top: 2px;">🎨</span>
                <div>
                    <strong style="color: #1e293b; font-weight: 600;">Moderní rozhraní</strong>
                    <span style="color: #64748b; margin-left: 8px;">– intuitivní ovládání a přehledné zobrazení</span>
                </div>
            </div>
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span style="color: #3b82f6; font-size: 20px; margin-top: 2px;">⚡</span>
                <div>
                    <strong style="color: #1e293b; font-weight: 600;">Vyšší výkon</strong>
                    <span style="color: #64748b; margin-left: 8px;">– rychlejší načítání dat a lepší odezva</span>
                </div>
            </div>
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span style="color: #8b5cf6; font-size: 20px; margin-top: 2px;">🔄</span>
                <div>
                    <strong style="color: #1e293b; font-weight: 600;">Workflow schvalování</strong>
                    <span style="color: #64748b; margin-left: 8px;">– automatizované procesy a notifikace</span>
                </div>
            </div>
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span style="color: #f59e0b; font-size: 20px; margin-top: 2px;">🔔</span>
                <div>
                    <strong style="color: #1e293b; font-weight: 600;">Systémové notifikace</strong>
                    <span style="color: #64748b; margin-left: 8px;">– aktuální informace v reálném čase</span>
                </div>
            </div>
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span style="color: #ef4444; font-size: 20px; margin-top: 2px;">⚙️</span>
                <div>
                    <strong style="color: #1e293b; font-weight: 600;">Rozšířené funkce</strong>
                    <span style="color: #64748b; margin-left: 8px;">– objednávky, faktury, pokladní kniha</span>
                </div>
            </div>
        </div>
    </div>
    
    <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 1px solid #93c5fd; border-radius: 12px; padding: 25px; margin: 30px 0; display: flex; align-items: flex-start; gap: 15px;">
        <span style="font-size: 24px; color: #1d4ed8; margin-top: 2px;">💡</span>
        <div>
            <h3 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">Tip pro snadné přihlášení</h3>
            <p style="color: #1e40af; font-size: 15px; margin: 0; line-height: 1.5;">
                Vaše přihlašovací údaje zůstávají stejné. Uživatelské jméno ve formátu <strong>u0xxxx</strong> (Vaše osobní číslo).
            </p>
        </div>
    </div>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin: 30px 0;">
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
            <span style="font-size: 28px;">📞</span>
            <h3 style="color: #1e293b; font-size: 18px; font-weight: 600; margin: 0;">Potřebujete pomoc?</h3>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
            <div>
                <div style="color: #64748b; font-size: 14px; margin-bottom: 5px;">IT hotline (nonstop)</div>
                <div style="color: #1e293b; font-weight: 600; font-size: 16px;">📞 731 137 100</div>
            </div>
            <div>
                <div style="color: #64748b; font-size: 14px; margin-bottom: 5px;">E-mail podpora</div>
                <div style="color: #3b82f6; font-weight: 600; font-size: 16px;">📧 helpdesk@zachranka.cz</div>
            </div>
        </div>
    </div>
    
    <div style="text-align: center; margin-top: 40px; padding: 20px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; border: 1px solid #f59e0b;">
        <span style="font-size: 24px; display: block; margin-bottom: 10px;">✨🎉✨</span>
        <p style="color: #92400e; font-size: 16px; font-weight: 600; margin: 0;">
            Šťastný a úspěšný nový rok 2026!
        </p>
    </div>
</div>',
    NULL,
    1,
    NULL,
    NULL,
    1,
    'INFO',
    'system_announcement',
    0,
    0,
    NULL,
    NULL,
    NULL,
    '2026-01-03 01:04:24',
    '2026-01-31 23:59:59',
    1
)
ON DUPLICATE KEY UPDATE
    typ = VALUES(typ),
    nadpis = VALUES(nadpis),
    zprava = VALUES(zprava),
    data_json = VALUES(data_json),
    od_uzivatele_id = VALUES(od_uzivatele_id),
    pro_uzivatele_id = VALUES(pro_uzivatele_id),
    prijemci_json = VALUES(prijemci_json),
    pro_vsechny = VALUES(pro_vsechny),
    priorita = VALUES(priorita),
    kategorie = VALUES(kategorie),
    objekt_typ = VALUES(objekt_typ),
    objekt_id = VALUES(objekt_id),
    dt_created = VALUES(dt_created),
    dt_expires = VALUES(dt_expires),
    aktivni = VALUES(aktivni);

-- ===========================================================================
-- OVĚŘENÍ PO NAHRÁNÍ:
-- SELECT id, typ, nadpis, aktivni, dt_expires FROM 25_notifikace WHERE id = 952;
-- ===========================================================================
