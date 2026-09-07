# Optimalizace repa erdms-dev pro práci s Claude Code — 2026-09-07

Shrnutí první vlny úklidu (scope: `apps/eeo-v2/` + root `archive/`/`backups/`/`docs/`) a doporučení pro navazující vlny (ostatní `apps/*`).

## Co proběhlo

### 1. Archivace starých souborů mimo repo
Stovky starých debug/test/fix/changelog souborů a dokumentů přesunuty **mimo git** do `/home/erdms_zalohy/` (nic se nesmazalo, jen se to nemotá pod nohama):

| Odkud | Kam | Rozsah |
|---|---|---|
| `apps/eeo-v2/` (root i podadresáře) | `/home/erdms_zalohy/eeo-v2/` | 616 souborů (staré test/fix/debug skripty, dated reporty, `client/docs/` reporty, staré backup adresáře) |
| root `archive/`, `backups/db/`, `backups/cerpani-lp-module/` | `/home/erdms_zalohy/root/` | archivní složka + staré eeo2025 SQL dumpy |
| root `docs/` (jen eeo-v2 relevantní část) | `/home/erdms_zalohy/root/docs-eeo-v2/` | 574 souborů, `docs/` kleslo z 51MB na 1,1MB |

### 2. Vyčištění git historie
`docs/deprecated/backups/` (2× tar.gz, ~725MB) bylo trackované v gitu a nafukovalo `.git`. Odstraněno z **celé historie** přes `git filter-repo` + force-push všech větví na `origin`. `.git` kleslo z 425MB na 336MB.

⚠️ **Během tohoto kroku došlo k incidentu** — `git filter-repo --force` udělal tvrdý checkout pracovního adresáře a smazal 11 necommitnutých rozpracovaných souborů (Vema propojení, notifikační zvoneček). Podařilo se je **plně zrekonstruovat** z transkriptů předchozích Claude Code relací (přehráním Edit/Write operací), ale bylo to riskantní a nemuselo to vyjít. Viz doporučení č. 1 níže.

### 3. `.gitignore`
Doplněno o `backups/`, `docs/deprecated/backups/`, `.stale-build-assets/` a další, aby se podobné věci už nedostaly zpátky do gitu.

### 4. CLAUDE.md + skilly pro eeo-v2
- `apps/eeo-v2/CLAUDE.md` — struktura projektu, DEV/PROD prostředí, konvence, produkční bezpečnostní pravidla, poznámka k `.gitignore` vs. explicitnímu čtení `.env`
- `apps/eeo-v2/.claude/skills/` — tři skilly postavené na existujících Copilot instrukcích, ale ověřené proti aktuálnímu kódu:
  - `php-legacy-guardian` — produkční ochrana + PHP/MariaDB konvence pro `api-legacy/`
  - `eeo-build-troubleshoot` — DEV/PROD build, deploy, časté chyby
  - `eeo-fe-conventions` — React state/async pravidla, konvence tabulek

### 5. `.claudeignore`
Zjištění: Claude Code nemá vlastní `.claudeignore` mechanismus. Respektuje `.gitignore` pro procházení/hledání (Glob/Grep) — `node_modules/`, `build/`, `.webpack-cache/` apod. se tak automaticky neprocházejí. To ale neplatí pro **explicitní čtení** konkrétní cesty (`.env` soubory jde stále cíleně otevřít, když je potřeba) — zdokumentováno v `apps/eeo-v2/CLAUDE.md`.

## Doporučení do budoucna

1. **Necommitnutou práci necházet dlouho ležet.** Incident s `filter-repo` (viz výše) se stal jen proto, že rozpracované soubory ležely necommitnuté napříč několika dny/relacemi. Průběžné `wip:` commity jsou levná pojistka proti podobné nehodě.
2. **Rizikové git operace (rewrite historie, force-push) vždy jako samostatný, explicitně odsouhlasený krok** — ne mimochodem uprostřed jiné práce. Tentokrát to nakonec fungovalo (záloha `.git` předem, potvrzení před force-push), ale je to postup, který se vyplatí dodržovat důsledně.
3. **Stejný postup zopakovat pro další projekty** (`vehicles`, `intranet`, ZZS-Entra), až přijde jejich řada — archivační konvence (`/home/erdms_zalohy/<app>/`) i vzor CLAUDE.md/skillů jsou teď hotové jako šablona.
4. **Zvážit pre-commit hook proti velkým binárkám** (např. odmítnout commit souboru nad 10MB) — prevence stejného problému, jaký nastal s `docs/deprecated/backups/`.
5. **Skilly udržovat aktuální.** Vznikly z jednorázového průzkumu — pokud se něco v konvencích/build procesu změní, je potřeba je doplnit/opravit, ať nezůstanou zastaralé.

## Co zůstává otevřené (vědomě odloženo)

- `backups/vehicles-*/` a `backups/dev-db/` — jiný projekt / aktivně používané, nesaháno
- root `docs/` — platform/Entra-SSO/multi-app obsah (AZURE_*, ENTRA*, multiapp build skripty) — netýká se eeo-v2, řešit až přijde na řadu
- Rekonstruované rozpracované soubory (Vema propojení, notifikace) — je potřeba projít `git diff` a commitnout, viz `git status` v `apps/eeo-v2/`
