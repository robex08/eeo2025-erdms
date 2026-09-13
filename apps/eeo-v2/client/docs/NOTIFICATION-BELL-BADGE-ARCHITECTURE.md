# Zvoneček a unread badge — architektura (aktuální stav 2026-09-06)

Účel dokumentu: rychlá orientace v tom, **odkud se bere číslo v badge zvonečku** v hlavičce
a jaké mechanismy (background polling, cross-tab leader election) to ovlivňují. Vzniklo
po vyšetřování bugu, kdy badge nešel na `DEV build` (fungoval na `npm start` i na `PROD`).

**Stav: 3 bugy opraveny a 2026-09-06 ověřeny ručním buildem+deployem na DEV** (stabilní
počet nepřečtených při opakovaném F5). Viz Bug #1, #2, #3 níže.

## Tok dat (od backendu po UI)

```
Backend: POST /notifications/unread-count
  api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php
    → handle_notifications_unread_count()
    → api.php (routing, řádek ~3517)
        ↓
Frontend service:
  client/src/services/notificationsUnified.js
    → getUnreadCount()  (řádek 392)
        ↓
Background task (polling každých 90s, viz níže):
  client/src/services/backgroundTasks.js
    → createNotificationCheckTask()  (řádek 68)
        ↓ callback onUnreadCountChange(count, badgeColor)
Registrace tasků:
  client/src/App.js  (~řádek 1182 a 1247 — dvě registrační místa, viz "Poznámky")
        ↓
Context (drží stav pro celou appku):
  client/src/context/BackgroundTasksContext.js
    → unreadNotificationsCount, notificationsBadgeColor (state)
    → handleUnreadCountChange()  (řádek 174)
        ↓
UI:
  client/src/components/Layout.js
    → NotificationBellWrapper  (řádek 1453)
    → čte bgTasks.unreadNotificationsCount  (řádek 1459)
    → badge se renderuje jen když: unreadCount > 0 && !dropdownVisible  (řádek 1916)
```

## Klíčové soubory

| Vrstva | Soubor | Co tam je |
|---|---|---|
| UI badge | `client/src/components/Layout.js` | `NotificationBellWrapper`, render podmínka badge |
| App state | `client/src/context/BackgroundTasksContext.js` | `unreadNotificationsCount`, `handleUnreadCountChange` |
| Polling task | `client/src/services/backgroundTasks.js` | `createNotificationCheckTask()` — interval, leader election |
| API volání | `client/src/services/notificationsUnified.js` | `getUnreadCount()` (řádek 392) |
| Registrace tasků | `client/src/App.js` | `createStandardTasks(...)`, napojení callbacků na context |
| Backend endpoint | `api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php` | `handle_notifications_unread_count()` |
| Routing backendu | `api-legacy/api.eeo/v2025.03_25/api.php` | `case '/notifications/unread-count'` (~ř. 3517) |

## Leader election (cross-tab polling optimalizace)

Zavedeno 2026-06-23 (optimalizace trafficu — 1 tab pollinguje místo N tabů).
Mechanismus: první tab, který "vyhraje", si do `localStorage` zapíše svůj `tabId` a
`timestamp` pod klíč `notification_checker_leader_<ENV>`. Ostatní taby vidí, že leader
existuje a je čerstvý (< 120 s), a polling **vůbec nespustí** (`condition()` vrátí `false`).
Leadership vyprší po 120 s bez update, kdy může vyhrát jiný tab.

Stejný vzor (jiný interval, jiný účel — kontrola nové verze appky) používá
`client/src/utils/versionChecker.js` s klíčem `version_checker_leader_<ENV>`.

### Bug #1: kolize leader klíče mezi DEV a PROD (OPRAVENO + OVĚŘENO 2026-09-06)

`client/package.json` má `"homepage": "/dev/eeo-v2"` — DEV build i PROD build (`/eeo-v2`)
běží **na stejné doméně**, jen na jiné cestě → stejný browser origin → **sdílený
`localStorage`**. Klíč `notification_checker_leader` (bez namespace) proto kolidoval mezi
DEV a PROD tabem ve stejném prohlížeči: vyhrál jen jeden z nich (typicky PROD, protože byl
otevřený/aktivní), druhý tab už notifikace vůbec nekontroloval → `unreadNotificationsCount`
zůstal na výchozí `0` → badge se nikdy nezobrazil. Bez chyby v konzoli — vypadalo to jako
tichý fail. `npm start` fungoval správně, protože běží na jiném originu (`localhost:3001`),
takže s DEV/PROD nekoliduje vůbec.

**Oprava**: oba leader klíče (`notification_checker_leader`, `version_checker_leader`) jsou
teď namespaced podle `process.env.PUBLIC_URL` (CRA ho odvozuje z `homepage` při produkčním
buildu; na `npm start` je prázdný → fallback `'local'`):

```js
const ENV_NAMESPACE = (process.env.PUBLIC_URL || 'local').replace(/[^a-zA-Z0-9]/g, '_') || 'local';
const NOTIFICATION_LEADER_KEY = `notification_checker_leader_${ENV_NAMESPACE}`;
```

Viz `client/src/services/backgroundTasks.js` a `client/src/utils/versionChecker.js`.

### Bug #2: tab si po reloadu "orphanuje" vlastní leadership (OPRAVENO + OVĚŘENO 2026-09-06)

Objeveno při testu: 5 nepřečtených → 1 označena přečtenou → badge správně ukázal šedou "4"
→ po F5 reloadu badge **úplně zmizel** (na `npm start` se stejný test choval správně).

Příčina: `condition()` v `backgroundTaskService.js` (řádek 97) se vyhodnocuje **jen při
`setInterval` ticku** (u notifikací každých 90s) + jednou `immediate` hned po registraci.
Žádný jiný periodický re-check neexistuje. Když je tab leader a udělá tvrdý F5 reload,
React cleanup (`useEffect` return) se u opravdového reloadu (na rozdíl od SPA unmountu)
nespustí — starý `tabId` zůstane v `localStorage` zapsaný jako aktivní leader až do 120s
timeoutu. Nová instance stránky po reloadu se okamžitě pokusí stát leaderem, ale narazí na
"cizí" (ve skutečnosti mrtvý) záznam s čerstvým timestampem → `condition()` vrátí `false` →
`getUnreadCount()` se vůbec nezavolá → `unreadNotificationsCount` zůstane na výchozí `0` →
badge je schovaný, klidně až ~120-180s (do dalšího interval ticku po expiraci).

Toto není specifické pro DEV/PROD prostředí (stejná logika běží všude) — jde o to, jestli v
okamžiku reloadu existuje ještě "živý" (nevypršelý) záznam z předchozí instance stránky.
Když testuješ opakovaně v krátkém sledu (reload hned po reloadu), na tenhle bug narazíš
skoro jistě; po delší pauze mezi testy stačí, aby starý záznam mezitím vypršel sám.

**Oprava**: oba leader mechanismy (notifikace i version checker) teď při odchodu ze
stránky (`pagehide` event — F5, zavření tabu, navigace pryč) synchronně uvolní svůj
leader záznam z `localStorage`, pokud ho drží. Nová instance po reloadu tak leadership
získá okamžitě, místo čekání na timeout. Viz `releaseLeadershipIfHeld` v
`backgroundTasks.js` a `pagehide` listener v `versionChecker.js::start()`.

**Ověření**: 2026-09-06 ruční `build:dev` + deploy na DEV, opakované F5 (i rychle po sobě) →
badge stabilně ukazuje správný počet, žádné mizení po reloadu.

**Důsledek pro budoucí podobné bugy**: jakýkoli nový cross-tab/localStorage koordinační
mechanismus (leader election, "poslední aktivní tab", cache invalidation broadcast apod.)
musí být stejně namespaced (Bug #1) a musí se uvolňovat na `pagehide` (Bug #2) — jinak se
bude chovat nekonzistentně mezi DEV a PROD, nebo se bude sám blokovat po každém reloadu.

### Bug #3: barva badge padala na šedou při každé lokální úpravě (OPRAVENO 2026-09-06)

Zjištěno při stejném testu: po označení jedné zprávy z 5 jako přečtené badge správně
ukázal "4", ale **vždy šedě** — bez ohledu na to, jestli mezi zbylými 4 nepřečtenými byla
třeba HIGH priorita, která by měla svítit červeně.

Příčina: `handleUnreadCountChange(count, badgeColor = 'gray')` v
`BackgroundTasksContext.js` (ř. 174) měla default parametr `'gray'`. Všechna volání z
lokálních/optimistických úprav v `Layout.js` (`handleMarkAsRead`, `handleMarkAllRead`,
`handleDismiss`, `handleDismissAll`, TODO alarm handlery) volala funkci **jen s počtem**,
bez barvy — takže barva se při každé takové akci tiše resetovala na šedou, dokud ji
nepřepsal další úspěšný backend poll (0–90s, dřív i déle kvůli Bug #2).

**Oprava** (dvě vrstvy):
1. `BackgroundTasksContext.js::handleUnreadCountChange` už nemá default `'gray'` — když
   volající barvu nepředá, **zachová se předchozí barva** (šedá se vynutí jen když
   `count === 0`).
2. `Layout.js` navíc pro dropdown akce (`handleMarkAsRead`, `handleDismiss`) přidává
   `computeBadgeColorFromNotifications()` — dopočítá barvu ze zbylých nepřečtených položek
   v lokálním seznamu, zrcadlí prioritní logiku backendu (`handle_notifications_unread_count`
   v `notificationHandlers.php`, ř. 1071-1082): červená (urgent/high/schválení) > modrá
   (komentáře) > modrá (jen planning) > zelená (info/normal/low u objednávek) > oranžová.

   ⚠️ Caveat: dropdown drží jen posledních 20 položek (`limit: 20`), takže při >20
   nepřečtených je to odhad, ne 100% přesná hodnota — příští backend poll to dorovná.

## Další zjištění z vyšetřování

- **Tiché polykání chyb (NEOPRAVENO)**: `getUnreadCount()` v `notificationsUnified.js` (ř. 406–413)
  chytá *jakoukoli* chybu (401, 500, síť) a vždy vrací `{ unread_count: 0, ... }` bez logu.
  Skutečná backend chyba tedy navenek vypadá úplně stejně jako "0 nepřečtených" — nelze
  je z UI rozlišit. Pokud se badge znovu "ztratí", nejdřív zkontrolovat Network tab
  (`POST /notifications/unread-count`), ne věřit tomu, že appka mlčí = OK.
- **`versionChecker.js` version.json endpoint (OPRAVENO 2026-09-06)**: původně byl
  natvrdo `'/dev/eeo-v2/version.json'` s runtime detekcí přes `window.location.pathname`
  (`startsWith('/eeo-v2')`), která PROD case fakticky opravovala za běhu — takže reálně
  nešlo o funkční bug (na rozdíl od prvotního podezření), jen o křehký kód se stringy
  natvrdo. Nahrazeno odvozením z `PUBLIC_URL` (stejně jako `Router basename` a leader
  klíče výše): `` `${process.env.PUBLIC_URL || ''}/version.json` ``. `generate-build-info.sh`
  totiž zapisuje `version.json` do kořene build outputu, který se nasazuje přesně pod
  `PUBLIC_URL` base cestou, takže je to konzistentní se skutečným umístěním souboru.
- **Dvě registrační místa v `App.js`** (not a bug, jen k vědomí, ~ř. 1182 a ~1247): jedno běží při prvním loginu
  (registruje všechny standardní tasky), druhé je "dohnání" chybějících tasků v dlouhé
  session bez re-login (kontroluje jen `autoRefreshOrdersV3` a `autoRefreshInvoices`,
  ne notifikační task). Při debugování "proč se task nezaregistroval" je třeba zkontrolovat
  oboje.

## Rychlá diagnostika "badge nesedí"

1. DevTools → Network → filtr `unread-count` → ověřit, že se request vůbec posílá (leader
   election) a co vrací (`unread_count`, `badge_color`).
2. DevTools → Console → `Object.keys(localStorage).filter(k => k.startsWith('notification_checker_leader'))`
   a zkontrolovat `tabId`/`timestamp` (klíč je teď namespaced, např.
   `notification_checker_leader_dev_eeo_v2`).
3. Pokud request nechodí vůbec → tab prohrál leader election (jiný tab/okno běží jako
   leader, viz výše) — po opravě Bug #2 by se to mělo samo srovnat řádově v sekundách.
4. Pokud request chodí, ale vrací `unread_count: 0` a uživatel má nepřečtené zprávy →
   problém je na backendu (`handle_notifications_unread_count`) nebo v auth datech.
5. Pokud číslo sedí, ale **barva** ne → zkontrolovat, jestli šlo o lokální/optimistickou
   akci (mark as read, dismiss, TODO alarm) — ta buď dopočítá barvu z `notifications`
   (dropdown), nebo zachová předchozí (viz Bug #3); definitivní barvu vždy dodá až další
   `unread-count` poll z backendu.
