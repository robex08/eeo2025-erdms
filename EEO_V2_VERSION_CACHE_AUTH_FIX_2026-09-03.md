# EEO v2 - version/cache/auth stability fix

Datum: 2026-09-03
Verze opravneho buildu: `2.66` / `2.66-DEV`
Oblast: frontend version checking, cache hlavniho HTML, lazy chunks, auth/token refresh, legacy API auth responses

## Kontext

Po deployi z 31. 8. se u uzivatelu zacala objevovat bila/modra obrazovka po delsi necinnosti nebo po kliknuti do modulu Faktury / Objednavky / Orders V3. F5 nebo tvrdy reload stranku obvykle znovu nacetl.

Soucasne se ukazalo, ze detekce nove verze nebyla spolehliva:

- DEV build nekdy ukazoval `2.63-DEV`, i kdyz `version.json` uz hlasil `2.65-DEV`.
- Produkce po `Ctrl+Shift+R` ukazala `2.65`, ale po zavreni a znovuotevreni prohlizece se nekdy vratila stara `2.63`.
- Po novem buildu mohl uzivatel s otevrenou starou zalohou kliknout na jinou lazy-loaded stranku a dostat bilou obrazovku.

## Hlavni priciny

### 1. DEV build mel hardcoded starou verzi

V `apps/eeo-v2/client/package.json` byl v `build:dev:explicit` natvrdo zapsany `REACT_APP_VERSION=2.63-DEV`.

Dopad:

- React bundle a UI ukazovaly `2.63-DEV`.
- `version.json` se generoval z `.env.development`, kde byla uz novejsi verze.
- Vznikal mismatch mezi tim, co hlasi aplikace, a tim, co hlasi version checker.

Oprava:

- `build:dev` a `build:dev:explicit` ctou `REACT_APP_VERSION` dynamicky z `.env.development`.
- `build` a `build:prod` ctou `REACT_APP_VERSION` dynamicky z `.env.production`.
- `package.json` verze sjednocena na `2.66.0`.

### 2. `index.html` a `version.json` nemely no-cache hlavicky

Pres HTTPS bylo overeno, ze DEV i PROD `index.html` vracely odpoved bez `Cache-Control`. To umoznovalo prohlizeci znovu pouzit stary HTML shell, ktery odkazoval na starou verzi aplikace.

Dopad:

- `Ctrl+Shift+R` nacetl aktualni build.
- Bezne znovuotevreni prohlizece mohlo vzit stary `index.html` z cache.
- U uzivatele se mohla znovu objevit starsi verze, napriklad `2.63`.

Oprava v Apache includech:

- `/etc/apache2/sites-available/erdms-proxy-dev.inc`
- `/etc/apache2/sites-available/erdms-proxy-production.inc`

Pridane hlavicky pro HTML a `version.json`:

```apache
Header set Cache-Control "no-cache, no-store, must-revalidate"
Header set Pragma "no-cache"
Header set Expires "0"
```

Poznamka: nginx je mimo tento server a nebyl upravovan. Overovani probehlo pres verejnou HTTPS odpoved, ktera po Apache reloadu tyto hlavicky skutecne vraci.

### 3. Stare otevrene taby mohly po deployi ztratit lazy chunks

React build generuje hashovane lazy chunk soubory. Kdyz se build adresar prepsal, uzivatel se starym `main.js` mohl pri kliknuti na jinou routu pozadovat stary chunk, ktery uz na serveru nebyl.

Dopad:

- Typicky `ChunkLoadError`.
- Bez error boundary to mohlo skoncit bilou obrazovkou.
- Version dialog se nemusel stihnout zobrazit, protoze aplikace spadla pri nacitani dalsiho modulu.

Opravy:

- Pridan `apps/eeo-v2/client/scripts/preserve-stale-assets.sh`.
- Build prikazy jej volaji pred a po buildu.
- Stare `*.chunk.js`, `*.chunk.js.map`, `*.chunk.css`, `*.chunk.css.map` se pred buildem docasne ulozi a po buildu vrati, pokud je novy build nenahradil.
- Pridan fallback v `App.js`, ktery pri `ChunkLoadError` zobrazi overlay s tlacitkem `Obnovit stranku` misto bile obrazovky.

Dulezite: fallback nedela automaticky reload. Uzivatel musi kliknout.

### 4. Version checker byl na DEV vypnuty

V `App.js` byl version checker zapnuty pouze pro `process.env.NODE_ENV === 'production'`. DEV build ale bezi s `NODE_ENV=development`, takze detekce nove verze na DEV vubec nebezela.

Oprava:

- Checker je zapnuty i pro DEV build.
- Prvni kontrola po nacteni stranky: `10 s`.
- Kontrola po prihlaseni: okamzite pres `force: true`.
- Periodicka kontrola: `10 min`.
- Focus kontrola: debounce `2 min`.
- Leader election zustava, aby polling nedelaly vsechny taby zaroven.

### 5. Token refresh na DEV volal produkcni API cestu

V `apps/eeo-v2/client/src/utils/tokenRefresh.js` byla hardcoded cesta:

```js
/api.eeo/token-refresh
```

Dopad:

- DEV frontend mohl po delsi dobe volat produkcni legacy API endpoint.
- To mohlo rozhodit session/token refresh chovani, hlavne u idle scenaru.

Oprava:

- Token refresh URL se sklada z `process.env.REACT_APP_API2_BASE_URL || '/api.eeo/'`.
- DEV build tak vola `/dev/api.eeo/token-refresh`.
- PROD build vola `/api.eeo/token-refresh`.

### 6. Nektere Orders/Faktury API klienty okamzite odhlasovaly pri `401`

Nektere sluzby pro Faktury a Objednavky mely vlastni axios interceptory, ktere pri `401` ihned dispatchovaly globalni `authError`. `App.js` pak po 1,5 s spustil logout.

Dotcene soubory:

- `apps/eeo-v2/client/src/services/api25orders.js`
- `apps/eeo-v2/client/src/services/api25invoices.js`
- `apps/eeo-v2/client/src/services/apiOrderV2.js`
- `apps/eeo-v2/client/src/services/apiInvoiceV2.js`

Oprava:

- Pridan `apps/eeo-v2/client/src/services/authErrorHandler.js`.
- Pred globalnim `authError` se overi, zda ma prohlizec stale cached auth session (`token + user`).
- Pokud cached session existuje, chyba se vrati volajici komponente, ale aplikace se globalne neodhlasi.
- Pokud cached session neexistuje, globalni auth error se vyvola jako driv.

## Zmenene / pridane soubory

Frontend a build:

- `apps/eeo-v2/client/package.json`
- `apps/eeo-v2/client/scripts/preserve-stale-assets.sh`
- `apps/eeo-v2/client/src/App.js`
- `apps/eeo-v2/client/src/index.js`
- `apps/eeo-v2/client/src/config/appVersion.js`
- `apps/eeo-v2/client/src/hooks/useVersionChecker.js`
- `apps/eeo-v2/client/src/utils/versionChecker.js`
- `apps/eeo-v2/client/src/utils/tokenRefresh.js`
- `apps/eeo-v2/client/src/services/authErrorHandler.js`
- `apps/eeo-v2/client/src/services/api25orders.js`
- `apps/eeo-v2/client/src/services/api25invoices.js`
- `apps/eeo-v2/client/src/services/apiOrderV2.js`
- `apps/eeo-v2/client/src/services/apiInvoiceV2.js`

Dokumentace / ignore:

- `VERSION_CHECKING_GUIDE.md`
- `.gitignore`

Deploy guard:

- `docs/scripts-shell/build-eeo-v2.sh`

Server Apache config, mimo git repo:

- `/etc/apache2/sites-available/erdms-proxy-dev.inc`
- `/etc/apache2/sites-available/erdms-proxy-production.inc`

## Chovani po oprave

### Pri bezne praci

- Aplikace se sama automaticky nereloaduje.
- Uzivatel nema byt opakovane rusen stejnou aktualizaci.
- Version modal se po detekci nove verze zobrazi jednou v aktualni instanci aplikace.
- Pokud uzivatel zvoli `Pozdeji`, modal se v dane otevrene instanci nema stale vracet.

### Pri novem deployi

- Otevrene taby mohou dostat informaci o nove verzi.
- Pokud stara zalozka pozada o stary lazy chunk, ma zustat dostupny diky `preserve-stale-assets.sh`.
- Pokud chunk presto selze, aplikace zobrazi reload overlay misto bile obrazovky.
- Reload probiha pouze po kliknuti uzivatele.

### Po reloadu

- Pred reloadem se maze `localStorage.app_build_hash`.
- Po nacteni se vezme aktualni hash z `<meta name="build-hash">`.
- Pokud `index.html` a `version.json` maji stejny hash, dialog se nema zobrazovat znovu pro stejnou verzi.

## Validacni prikazy

### DEV build

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm run build:dev:explicit
```

Ocekavani:

- Build projde.
- `version.json` ma `version: "2.66-DEV"`.
- `index.html` meta hash odpovida `version.json`.

Kontrola hashu:

```bash
/var/www/erdms-dev/check_build_hashes.sh /var/www/erdms-dev/apps/eeo-v2/client/build
```

Ocekavani:

```text
SUCCESS: Hashe jsou synchronizovane
```

Kontrola verejneho DEV buildu:

```bash
curl -sS -L -H 'Cache-Control: no-cache' \
  'https://erdms.zachranka.cz/dev/eeo-v2/version.json?check='$(date +%s)

curl -sS -L -H 'Cache-Control: no-cache' \
  'https://erdms.zachranka.cz/dev/eeo-v2/?check='$(date +%s) \
  | grep -oE 'build-hash" content="[^"]+"|main\.[A-Za-z0-9]+\.js|2\.66-DEV|2\.63-DEV'
```

Ocekavani:

- Vystup obsahuje `2.66-DEV`.
- Vystup neobsahuje `2.63-DEV`.

Kontrola verze primo v hlavnim bundle:

```bash
MAIN=$(ls /var/www/erdms-dev/apps/eeo-v2/client/build/static/js/main.*.js | head -1)
echo "$MAIN"
grep -o 'REACT_APP_VERSION:"[^"]*"' "$MAIN" | head -3
if grep -q '2\.63-DEV' "$MAIN"; then echo 'FOUND 2.63-DEV IN MAIN'; else echo 'OK no 2.63-DEV in main'; fi
```

Ocekavani:

- `REACT_APP_VERSION:"2.66-DEV"`
- `OK no 2.63-DEV in main`

Kontrola DEV API base v bundle:

```bash
MAIN=$(ls /var/www/erdms-dev/apps/eeo-v2/client/build/static/js/main.*.js | head -1)
grep -o '/dev/api\.eeo/\|/api\.eeo/' "$MAIN" | sort | uniq -c
```

Ocekavani pro DEV:

- V hlavnim DEV bundle se vyskytuje `/dev/api.eeo/`.
- Nemela by se objevit produkcni cesta jako primarni hardcoded refresh URL.

### PROD build bez deploye

```bash
cd /var/www/erdms-dev/docs/scripts-shell
./build-eeo-v2.sh --prod --frontend --no-deploy
```

Ocekavani:

- Vytvori se `/var/www/erdms-dev/apps/eeo-v2/client/build-prod`.
- `build-prod/version.json` ma `version: "2.66"`.
- `build-prod/index.html` a `build-prod/version.json` maji stejny hash.
- Na ostrou se nic nekopiruje, pokud neni `--deploy`.

Kontrola produkcniho build-prod:

```bash
/var/www/erdms-dev/check_build_hashes.sh /var/www/erdms-dev/apps/eeo-v2/client/build-prod

MAIN=$(ls /var/www/erdms-dev/apps/eeo-v2/client/build-prod/static/js/main.*.js | head -1)
grep -o 'REACT_APP_VERSION:"[^"]*"' "$MAIN" | head -3
```

Ocekavani:

- `REACT_APP_VERSION:"2.66"`

### HTTP cache hlavicky

DEV:

```bash
curl -sS -L -D - -o /dev/null \
  'https://erdms.zachranka.cz/dev/eeo-v2/index.html?cachecheck='$(date +%s) \
  | sed -n '1,18p'

curl -sS -L -D - -o /dev/null \
  'https://erdms.zachranka.cz/dev/eeo-v2/version.json?cachecheck='$(date +%s) \
  | sed -n '1,18p'
```

PROD:

```bash
curl -sS -L -D - -o /dev/null \
  'https://erdms.zachranka.cz/eeo-v2/index.html?cachecheck='$(date +%s) \
  | sed -n '1,18p'

curl -sS -L -D - -o /dev/null \
  'https://erdms.zachranka.cz/eeo-v2/version.json?cachecheck='$(date +%s) \
  | sed -n '1,18p'
```

Ocekavani pro HTML i `version.json`:

```text
cache-control: no-cache, no-store, must-revalidate
pragma: no-cache
expires: 0
```

### Legacy API auth smoke test

Tyto testy nemaji vracet HTML ani PHP fatal output. Maji vracet JSON.

```bash
curl -sS -L -D - -o /tmp/auth-me.out 'https://erdms.zachranka.cz/auth/me'
cat /tmp/auth-me.out

curl -sS -L -D - -H 'Content-Type: application/json' -d '{}' \
  'https://erdms.zachranka.cz/dev/api.eeo/user/detail' | sed -n '1,35p'

curl -sS -L -D - -H 'Content-Type: application/json' -d '{}' \
  'https://erdms.zachranka.cz/dev/api.eeo/token-refresh' | sed -n '1,35p'

curl -sS -L -D - -H 'Content-Type: application/json' -d '{}' \
  'https://erdms.zachranka.cz/dev/api.eeo/user/login' | sed -n '1,40p'

curl -sS -L -D - -o /tmp/auth-config.out \
  'https://erdms.zachranka.cz/dev/api.eeo/system/auth-config'
cat /tmp/auth-config.out
```

Ocekavani:

- `/auth/me` bez session: JSON `401`.
- `/dev/api.eeo/user/detail` bez tokenu: JSON `401`.
- `/dev/api.eeo/token-refresh` bez parametru: JSON `400`.
- `/dev/api.eeo/user/login` bez dat: JSON `400`.
- `/dev/api.eeo/system/auth-config`: JSON `200`.

Kontrola PHP logu:

```bash
tail -120 /var/log/apache2/erdms-dev-php-error.log 2>/dev/null | tail -80
tail -80 /var/log/php8.4-fpm.log 2>/dev/null | tail -40
```

Ocekavani:

- Zadne aktualni `Fatal error`, `Parse error`, `Uncaught`.

## Browser test checklist

### DEV po buildu

1. Otevrit `https://erdms.zachranka.cz/dev/eeo-v2/`.
2. Overit ve footeru/splashi `2.66-DEV`.
3. Prihlasit se lokalnim uzivatelem.
4. Projit routy:
   - `/dev/eeo-v2/dashboard`
   - `/dev/eeo-v2/invoices25-list`
   - `/dev/eeo-v2/orders25-list`
   - `/dev/eeo-v2/orders25-list-v3`
5. Ocekavani: zadna bila obrazovka, zadny opakovany reload prompt.
6. Otevrit DevTools Console a hledat:
   - `ChunkLoadError`
   - `Uncaught`
   - `Failed to fetch dynamically imported module`
   - opakovane `authError`

### Test detekce nove verze

1. Nechat otevrenou aplikaci.
2. Provest novy DEV build.
3. Ocekavat maximalne jednu informaci o nove verzi.
4. Kliknout `Pozdeji`.
5. Pokracovat v aplikaci a overit, ze dialog neskace kazdou chvili znovu.
6. Kliknout `Obnovit nyni` / `Obnovit stranku`.
7. Po reloadu overit, ze se stejna aktualizace nehlasi opakovane.

### Test stale chunk scenare

1. Otevrit aplikaci pred buildem.
2. Provest build.
3. V otevrene stare zalozce prejit na jinou lazy route.
4. Ocekavani:
   - Idealne se route nacte diky zachovanym chunkum.
   - Pokud chunk chybi, zobrazi se reload overlay.
   - Nesmí vzniknout cista bila obrazovka.

## Deploy checklist

### DEV

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm run build:dev:explicit
/var/www/erdms-dev/check_build_hashes.sh /var/www/erdms-dev/apps/eeo-v2/client/build
```

### PROD priprava bez deploye

```bash
cd /var/www/erdms-dev/docs/scripts-shell
./build-eeo-v2.sh --prod --frontend --no-deploy
/var/www/erdms-dev/check_build_hashes.sh /var/www/erdms-dev/apps/eeo-v2/client/build-prod
```

### PROD frontend deploy

Pouzit az po potvrzeni DEV testu:

```bash
cd /var/www/erdms-dev/docs/scripts-shell
./build-eeo-v2.sh --prod --frontend --deploy
```

Po deployi overit:

```bash
curl -sS -L -H 'Cache-Control: no-cache' \
  'https://erdms.zachranka.cz/eeo-v2/version.json?check='$(date +%s)

curl -sS -L -H 'Cache-Control: no-cache' \
  'https://erdms.zachranka.cz/eeo-v2/?check='$(date +%s) \
  | grep -oE 'build-hash" content="[^"]+"|main\.[A-Za-z0-9]+\.js|2\.66|2\.63'
```

Ocekavani:

- `version: "2.66"`
- zadne `2.63` v aktualnim index/main markeru
- no-cache hlavicky pro HTML a `version.json`

## Production env guard

Do `docs/scripts-shell/build-eeo-v2.sh` byl pridan guard pro produkcni backend deploy legacy API.

Pred kopirovanim `.env.production` do runtime `.env` se overuje:

```text
APP_ENV=production
DB_NAME=eeo2025
UPLOAD_ROOT_PATH=/var/www/erdms-platform/data/eeo-v2/prilohy/
DOCX_TEMPLATES_PATH=/var/www/erdms-platform/data/eeo-v2/sablony/
MANUALS_PATH=/var/www/erdms-platform/data/eeo-v2/manualy/
```

Pokud nektera hodnota nesedi, deploy se zastavi s `CRITICAL ERROR`.

Dulezite:

- Produkcni API `.env` nebyl v ramci teto opravy modifikovan.
- Frontend-only deploy legacy API `.env` nekopiruje.
- Backend deploy `.env.production` kopiruje, ale nove jen po validaci.

## Zjisteni k produkcnim priloham

Overeny production API legacy env ma spravne produkcni datove cesty:

```text
UPLOAD_ROOT_PATH=/var/www/erdms-platform/data/eeo-v2/prilohy/
DOCX_TEMPLATES_PATH=/var/www/erdms-platform/data/eeo-v2/sablony/
MANUALS_PATH=/var/www/erdms-platform/data/eeo-v2/manualy/
```

Pri budouci kontrole Apache rout je vhodne extra overit i alias pro verejne prilohy `/eeo-v2/prilohy`, protoze serverova cesta aliasu je mimo frontend build a muze mit samostatnou historii. Tento dokument nemeni aliasy pro prilohy.

## Co sledovat, pokud se problem vrati

### Bila obrazovka po kliknuti v aplikaci

1. DevTools Console:
   - `ChunkLoadError`
   - `Loading chunk ... failed`
   - `Uncaught TypeError`
   - `Failed to fetch dynamically imported module`
2. Network:
   - request na `static/js/*.chunk.js` se statusem `404` / `403` / HTML misto JS
   - `version.json` bez no-cache hlavicek
   - API odpoved `text/html` misto `application/json`
3. Server:
   - `/var/log/apache2/erdms-dev-php-error.log`
   - `/var/log/php8.4-fpm.log`

### Opakovany update dialog

Overit:

```js
document.querySelector('meta[name="build-hash"]')?.content
localStorage.getItem('app_build_hash')
```

A porovnat s:

```bash
curl -sS -L -H 'Cache-Control: no-cache' \
  'https://erdms.zachranka.cz/dev/eeo-v2/version.json?check='$(date +%s)
```

Pokud se hashe shoduji a dialog se stale vraci, hledat chybu v `VersionChecker.notificationShown`, storage eventu nebo v tom, zda stranka skutecne nenacita stary `index.html`.

### Navrat stare verze po restartu prohlizece

Overit hlavicky:

```bash
curl -sS -L -D - -o /dev/null \
  'https://erdms.zachranka.cz/eeo-v2/index.html?cachecheck='$(date +%s) \
  | sed -n '1,18p'
```

Pokud chybi no-cache hlavicky, prohlizec muze stale brat stary HTML shell.

### Podezreni na service worker

Aktualni EEO v2 service worker nepouziva. Do `src/index.js` byla pridana ochrana, ktera pri startu odregistruje stare service workery pouze pro scope aktualni EEO aplikace.

V browser konzoli lze overit:

```js
navigator.serviceWorker.getRegistrations().then(r => console.log(r.map(x => x.scope)))
```

Pokud se objevi scope pro `/eeo-v2/` nebo `/dev/eeo-v2/`, mel by se po nacteni aktualni aplikace odregistrovat.

## Stav posledniho overeni

Posledni overeny DEV build:

```text
version: 2.66-DEV
buildHash: 86ea91cee183
main bundle: main.7ad6f2f0.js
```

Poznamka: pri dalsim buildu se hash a main filename zmeni. Dulezite je, aby `index.html`, `version.json` a main bundle ukazovaly stejnou aktualni verzi a stejne build hash metadata.

## Otevrene body / rizika

- Produkcni frontend deploy `2.66` je potreba provest az po odsouhlaseni DEV testu.
- Produkcni backend deploy neni pro tyto frontend/cache opravy nutny, pokud se nemeni PHP API.
- Pokud se bude delat backend deploy, novy guard chrani produkcni `.env` pred spatnou DB/cestami.
- Stare zalozky z doby pred touto opravou nemusi mit novy error boundary kod; po jednom reloadu uz pobezi nova ochrana.
- Pokud uzivatel mel velmi agresivne cachovany stary `index.html`, muze byt potreba jednorazove `Ctrl+Shift+R`, aby si prohlizec vzal odpoved s novymi no-cache hlavickami.
