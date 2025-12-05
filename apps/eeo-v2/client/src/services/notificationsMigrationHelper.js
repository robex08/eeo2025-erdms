/* eslint-disable no-undef */
/**
 * =============================================================================
 * MIGRATION HELPER: OrderForm25 Notifications
 * =============================================================================
 *
 * Tento soubor obsahuje NOVOU VERZI funkce sendOrderNotifications
 * pro OrderForm25.js
 *
 * STARÝ systém:
 * - Ruční budování textu notifikací
 * - Ruční formátování dat
 * - Ruční posílání každému uživateli
 *
 * NOVÝ systém:
 * - Backend automaticky naplní 50+ placeholderů z order_id
 * - Stačí poslat: type, order_id, action_user_id, recipients
 * - Hromadné odeslání jedním voláním
 *
 * POUŽITÍ:
 * 1. Zkopíruj funkci `sendOrderNotifications_NEW` níže
 * 2. V OrderForm25.js najdi funkci `sendOrderNotifications` (řádek ~5981)
 * 3. Nahraď celou STAROU funkci touto NOVOU
 * 4. Otestuj vytvoření/schválení/zamítnutí objednávky
 * 5. Zkontroluj notifikace v DB: SELECT * FROM 25_notifications ORDER BY id DESC LIMIT 10
 *
 * =============================================================================
 */

// NOVÁ VERZE FUNKCE - Ready to copy-paste do OrderForm25.js
const sendOrderNotifications_NEW = async (orderId, orderNumber, newWorkflowState, oldWorkflowState, formData) => {
  try {
    // Pokud se stav nezměnil, nic neposílej
    if (oldWorkflowState && newWorkflowState === oldWorkflowState) {
      return;
    }

    // Seber všechny relevantní uživatele
    const uniqueUserIds = new Set();
    if (formData.garant_uzivatel_id) uniqueUserIds.add(formData.garant_uzivatel_id);
    if (formData.objednatel_id) uniqueUserIds.add(formData.objednatel_id);
    if (formData.prikazce_id) uniqueUserIds.add(formData.prikazce_id);
    if (formData.schvalovatel_id) uniqueUserIds.add(formData.schvalovatel_id);

    // Odfiltrovat aktuálně přihlášeného uživatele (sám sobě neposíláme notifikaci)
    if (user_id) {
      const currentUserIdInt = parseInt(user_id);
      if (uniqueUserIds.has(currentUserIdInt)) {
        uniqueUserIds.delete(currentUserIdInt);
      }
    }

    // Pokud nejsou žádní příjemci, skonči
    if (uniqueUserIds.size === 0) {
      return;
    }

    // Convert Set to Array
    const recipients = Array.from(uniqueUserIds);

    // Detekce typu notifikace podle změny stavu
    let notificationType = null;

    // === FÁZE 1: VYTVOŘENÍ OBJEDNÁVKY - Odeslána ke schválení ===
    const hasKeSchvaleni = hasWorkflowState(newWorkflowState, 'ODESLANA_KE_SCHVALENI');
    const hadKeSchvaleni = oldWorkflowState ? hasWorkflowState(oldWorkflowState, 'ODESLANA_KE_SCHVALENI') : false;

    if (hasKeSchvaleni && !hadKeSchvaleni) {
      notificationType = 'order_status_ke_schvaleni';
    }

    // Objednávka byla schválena
    const hasSchvalena = hasWorkflowState(newWorkflowState, 'SCHVALENA');
    const hadSchvalena = oldWorkflowState ? hasWorkflowState(oldWorkflowState, 'SCHVALENA') : false;

    if (hasSchvalena && !hadSchvalena) {
      notificationType = 'order_status_schvalena';
    }

    // Objednávka byla zamítnuta (neschválena)
    const hasZamitnuta = hasWorkflowState(newWorkflowState, 'ZAMITNUTA');
    const hadZamitnuta = oldWorkflowState ? hasWorkflowState(oldWorkflowState, 'ZAMITNUTA') : false;

    if (hasZamitnuta && !hadZamitnuta) {
      notificationType = 'order_status_zamitnuta';
    }

    // Objednávka čeká (CEKA_SE) - schvalovatel vrátil k doplnění
    const hasCekaSe = hasWorkflowState(newWorkflowState, 'CEKA_SE');
    const hadCekaSe = oldWorkflowState ? hasWorkflowState(oldWorkflowState, 'CEKA_SE') : false;

    if (hasCekaSe && !hadCekaSe) {
      notificationType = 'order_status_ceka_se';
    }

    // === FÁZE 2: ODESLANA - Před/po odeslání dodavateli ===
    const hasOdeslana = hasWorkflowState(newWorkflowState, 'ODESLANA');
    const hadOdeslana = oldWorkflowState ? hasWorkflowState(oldWorkflowState, 'ODESLANA') : false;

    if (hasOdeslana && !hadOdeslana) {
      notificationType = 'order_status_odeslana';
    }

    // Objednávka byla zrušena/stornována
    const hasZrusena = hasWorkflowState(newWorkflowState, 'ZRUSENA');
    const hadZrusena = oldWorkflowState ? hasWorkflowState(oldWorkflowState, 'ZRUSENA') : false;

    if (hasZrusena && !hadZrusena) {
      notificationType = 'order_status_zrusena';
    }

    // === FÁZE 3: POTVRZENA - Po potvrzení dodavatelem ===
    const hasPotvrzena = hasWorkflowState(newWorkflowState, 'POTVRZENA');
    const hadPotvrzena = oldWorkflowState ? hasWorkflowState(oldWorkflowState, 'POTVRZENA') : false;

    if (hasPotvrzena && !hadPotvrzena) {
      notificationType = 'order_status_potvrzena';
    }

    // Pokud nebyl detekován žádný typ notifikace, skonči
    if (!notificationType) {
      return;
    }

    // 🆕 NOVÝ BACKEND API - Odeslat notifikaci s automatickými placeholdery
    // Backend automaticky naplní 50+ placeholderů z order_id!

    await notificationService.create({
      token,
      username,
      type: notificationType,
      order_id: orderId,
      action_user_id: user_id,
      recipients // Hromadné odeslání
    });


  } catch (error) {
    // Nezastavuj workflow kvůli chybě notifikace
  }
};

// =============================================================================
// NÁVOD PRO MANUÁLNÍ MIGRACI OrderForm25.js
// =============================================================================

/**
 * KROK 1: Otevři OrderForm25.js
 *
 * KROK 2: Najdi funkci sendOrderNotifications (řádek ~5981)
 *
 * KROK 3: Smaž CELOU STAROU funkci od:
 *   const sendOrderNotifications = async (orderId, orderNumber, newWorkflowState, oldWorkflowState, formData) => {
 *
 * až po (včetně):
 *   };
 *
 * KROK 4: Vlož NOVOU funkci `sendOrderNotifications_NEW` z tohoto souboru
 *         (bez sufixu _NEW, přejmenuj ji na `sendOrderNotifications`)
 *
 * KROK 5: Ulož soubor
 *
 * KROK 6: Testování:
 *   - Vytvoř novou objednávku
 *   - Odešli ke schválení
 *   - Zkontroluj notifikaci v DB:
 *     SELECT * FROM 25_notifications WHERE order_id = [ID objednávky] ORDER BY id DESC;
 *   - Ověř, že placeholdery jsou naplněné (order_number, order_subject, max_price, atd.)
 *
 * KROK 7: Testuj další akce:
 *   - Schválení objednávky
 *   - Zamítnutí objednávky
 *   - Vrácení k přepracování
 *   - Odeslání dodavateli
 *   - Potvrzení dodavatelem
 *
 * KROK 8: SQL kontrola:
 *   ```sql
 *   -- Všechny notifikace za poslední hodinu
 *   SELECT
 *     n.id,
 *     n.type,
 *     u.username,
 *     n.message,
 *     n.is_read,
 *     n.created_at
 *   FROM 25_notifications n
 *   LEFT JOIN 25_users u ON n.user_id = u.id
 *   WHERE n.created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
 *   ORDER BY n.created_at DESC;
 *
 *   -- Počet notifikací podle typu
 *   SELECT type, COUNT(*) as pocet
 *   FROM 25_notifications
 *   WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
 *   GROUP BY type
 *   ORDER BY pocet DESC;
 *   ```
 *
 * HOTOVO! ✅
 */

// =============================================================================
// EXPORT (pokud budeš chtít použít jako modul)
// =============================================================================

export { sendOrderNotifications_NEW };
