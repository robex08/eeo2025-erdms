# 🚀 Návod: Migrace ERDMS Produkce na Nový Server

**Status:** Ověřeno na reálné topologii (2026-09-08)  
**Rozsah:** eeo-v2 + auth-api (EntraId base)  
**Domény:** `erdms.zachranka.cz` → nový produkční server; `erdmsdev.zachranka.cz` → tento server (dev)  
**Předchozí verze:** [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) a [PRODUCTION.md](../production/PRODUCTION.md) jsou **zastaralé**; tento dokument nahrazuje jejich migrační část.

---

## ⚡ Quick Checklist (pro zkušené)

Pro znovupoužití při migraci dalších apps (vehicles, intranet) később:

1. ✅ Audit `.env` klíčů na starém serveru (mysql, entra, cesty)
2. ✅ Pre-flight na starém serveru (systemd, zálohy, data cesty)
3. ✅ Příprava nového serveru (PHP-FPM, apache moduly, Node.js verze, adresáře)
4. ✅ DNS TTL ↓, EntraId URI doplnit/ověřit v Azure
5. ✅ Přenos zdrojáků + DB (přes proxy — váš NTB; checksum validace)
6. ✅ Konfigurace (Apache vhost, systemd, .env, SSL)
7. ✅ Cutover (krátké okno, DB finální dump, DNS switch, test, dev server reconfig)
8. ✅ Rollback plán (DNS zpět, DB restore)
9. ✅ Po migraci (CLAUDE.md, cron zálohy, Azure cleanup)

**Poznámka:** Soubory se přenášejí přes váš NTB (stará → NTB → nový), protože mezi servery není přímá síť.

---

## 📋 1. Přehled a Topologie

### Aktuální Stav (Tento Server `10.1.1.51`)

```
/var/www/
├── erdms-dev/          ← git repo (dev branche)
│   ├── apps/
│   │   ├── eeo-v2/                    ← DEV kód
│   │   │   ├── client/build           ← React build (pro /dev/eeo-v2)
│   │   │   ├── api-legacy/api.eeo/    ← PHP API (dev)
│   │   │   └── api/src                ← Node.js API src (dev)
│   │   └── auth-api/src/              ← DEV Entra auth
│   └── data/eeo-v2/prilohy/           ← Uploads (sdílené s PROD!)
│
└── erdms-platform/     ← PROD kopie (mimo git)
    ├── apps/
    │   ├── dashboard                  ← React app (root)
    │   └── eeo-v2/                    ← PROD binární kopie
    │       ├── index.html (build-prod)
    │       ├── api-legacy/api.eeo/    ← PHP API (prod)
    │       └── api/                   ← Node.js API (prod)
    ├── auth-api/                      ← PROD auth-api + node_modules
    └── data/...                       ← ostatní aplikace
```

**Apache vhost:** `/etc/apache2/sites-enabled/001-erdms.zachranka.cz.conf`
- Port 80/443 na `erdms.zachranka.cz`
- DocumentRoot: `/var/www/erdms-platform/apps/dashboard`
- Proxy na Node.js: `erdms-auth-api` (port 4000), `erdms-eeo-api` (port 4001)
- PHP apps aliasované: `/api.eeo` → `/var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo`
- Zahrnuje proxy pravidla ze souboru `erdms-proxy-production.inc`

**Systemd služby:**
- `erdms-auth-api.service` (port 4000) — `/var/www/erdms-platform/auth-api`
- `erdms-eeo-api.service` (port 4001) — `/var/www/erdms-platform/apps/eeo-v2/api` **← CRASH LOOP (viz krok 2)**

**Databáze:**
- `eeo2025` — MySQL/MariaDB na `10.3.172.11:3306`, user `erdms_user`
- `erdms` — MySQL/MariaDB na `10.3.172.11:3306`, user `erdms_user` (pro auth-api)

### Cílový Stav (Nový Server)

```
/var/www/
└── erdms-platform/
    ├── apps/
    │   ├── dashboard
    │   └── eeo-v2/
    │       ├── (React build-prod)
    │       ├── api-legacy/api.eeo/
    │       └── api/
    ├── auth-api/
    └── data/eeo-v2/prilohy/
```

- Apache vhost `erdms.zachranka.cz` → nový server IP
- Systemd služby s správným `WorkingDirectory`
- Databáze (stejný host `10.3.172.11` nebo nový DB server)
- Tento server (`10.1.1.51`) změní DNS na `erdmsdev.zachranka.cz` — běží jen dev branche

---

## ⚠️ 2. Pre-Migrační Audit (Starý Server — TOHLE DĚLAT NEJDŘÍV)

### 2.1 Ověřit Aktuální Systemd Stav

```bash
systemctl status erdms-eeo-api
# OČEKÁVANÝ VÝSLEDEK: Status = "activating (auto-restart)" a "CHDIR" error
# → služba PADÁ, protože WorkingDirectory=/var/www/erdms-builds/current neexistuje
```

**Rozhodnutí:** Tuto chybu NEOPRAVUJEME na starém serveru (může by zásah do prod). Jen si ji zapamatujeme a **v kroku 7 (nový server) ji zamezíme správným `WorkingDirectory`**.

### 2.2 Ověřit a Dokumentovat `.env` Klíče

V těchto souborech jsou gitignored, proto je musíme dokumentovat ručně (bezpečně — jen klíče, bez hodnot):

**eeo-v2 API-legacy (PHP):**
```bash
grep -E '^[A-Z_]+=' /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env | cut -d= -f1 | sort
# Očekávané: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, UPLOAD_ROOT_PATH, DOCX_TEMPLATES_PATH, ...
```

**eeo-v2 API (Node.js):**
```bash
grep -E '^[A-Z_]+=' /var/www/erdms-platform/apps/eeo-v2/api/.env | cut -d= -f1 | sort
# Očekávané: NODE_ENV, PORT, DB_*, ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET, ENTRA_TENANT_ID, ENTRA_REDIRECT_URI, CLIENT_URL, DASHBOARD_URL, REACT_APP_VERSION
```

**auth-api:**
```bash
grep -E '^[A-Z_]+=' /var/www/erdms-platform/auth-api/.env.production | cut -d= -f1 | sort
# Stejné jako Node eeo-v2 API (sdílejí stejné Entra config)
```

**Důležité hodnoty k zapamatování (bezpečně):**
- `DB_NAME` pro auth-api (zjistit: `grep DB_NAME /var/www/erdms-platform/auth-api/.env.production`)
- `UPLOAD_ROOT_PATH` pro eeo-v2 PHP API (zjistit: `grep UPLOAD_ROOT_PATH /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env`)
- Port `4000` (auth-api) a `4001` (eeo-v2 Node API)
- Node.js verze: `node --version` ← **MUSÍ se shodovat na novém serveru**

```bash
node --version
# Výstup: v20.19.6
# → Na novém serveru instalovat stejnou verzi
```

### 2.3 Rozhodnutí: Umístění Uploadů (`prilohy`)

**Anomálie:** Apache config servíruje `/eeo-v2/prilohy` z `/var/www/erdms-dev/data/eeo-v2/prilohy` (DEV strom), ne z `erdms-platform/`. Toto je buď:
1. Záměr (dev a prod sdílí uploads)
2. Pozůstatek nedokončené migrace

**Rozhodnutí (zvolit a zdokumentovat):**
- **Možnost A** (doporučeno): Uploads zůstávají v `/var/www/erdms-dev/data/eeo-v2/prilohy` i na novém serveru (dev a prod sdílené).
- **Možnost B**: Migrace uploadů do `/var/www/erdms-platform/data/eeo-v2/prilohy` na novém serveru (prod izolované).

Pro tento průvodce: **Předpokládáme Možnost A** (uploads jako sdílené). Pokud zvolíte B, upravte příkazy v kroku 6 odpovídajícím způsobem.

### 2.4 Apache Config — Ověřit Reálné Cesty

```bash
# Ověřit, že production include obsahuje to, co jsme viděli:
grep -A 2 "ProxyPass /auth http://localhost:4000" \
  /etc/apache2/sites-available/erdms-proxy-production.inc
# Výstup by měl být: ProxyPass /auth http://localhost:4000/api/auth
```

Výsledek: Ověřit, že vhost je aktivní, включае správné porty proxy, a že to odpovídá skutečnému stavu.

---

## 🛠️ 3. Příprava Nového Serveru

Předpokládáme, že máte **čistý OS + Apache + PHP-FPM + MariaDB klient, ale bez prod konfigurace**.

### 3.1 PHP 8.4 a FPM Pool

**Ověřit PHP verzi:**
```bash
php --version
# Výstup: PHP 8.4.* (musí být 8.4, stejně jako produkce)
```

**Ověřit FPM socket existuje:**
```bash
ls -la /run/php/php8.4-fpm.sock
# Pokud neexistuje, instalovat: apt install php8.4-fpm
```

**Ověřit FPM pool `www`:**
```bash
cat /etc/php/8.4/fpm/pool.d/www.conf | grep -A 3 "^\[www\]"
# Ověřit: listen = /run/php/php8.4-fpm.sock, user=www-data, group=www-data
```

**Pokud pool neexistuje, kopírovat ze starého serveru:**
```bash
scp root@10.1.1.51:/etc/php/8.4/fpm/pool.d/www.conf /etc/php/8.4/fpm/pool.d/
systemctl restart php8.4-fpm
```

### 3.2 Apache Moduly

**Ověřit, že jsou povoleny:**
```bash
apache2ctl -M | grep -E 'rewrite|headers|proxy_http|ssl|expires'
# Musí se objevit: rewrite_module, headers_module, proxy_module, proxy_http_module, ssl_module
```

**Pokud chybí, zapnout:**
```bash
a2enmod rewrite headers proxy proxy_http ssl expires
systemctl reload apache2
```

### 3.3 Node.js (via nvm)

```bash
# Ověřit nvm:
source ~/.nvm/nvm.sh
nvm --version

# Instalovat Node v20.19.6 (MUSÍ být stejná verze jako produkce):
nvm install 20.19.6
node --version  # v20.19.6

# Nastavit jako default:
nvm alias default 20.19.6
```

### 3.4 MariaDB Klient (Správné Hostname)

**DŮLEŽITÉ:** Místo přímé IP adresy `10.3.172.11` používejte správný hostname. V infrastruktuře máte:
- **Produkční DB:** `akp-db-mysql01.zzssk.zachranka.cz` (nebo kratší: `akp-db-mysql01`)
- **DNS search domain:** `zzssk.zachranka.cz` (zadáno v `/etc/resolv.conf`)

```bash
# Instalace klienta:
apt install mariadb-client
mysql --version

# Ověřit aktuální DNS nastavení:
grep search /etc/resolv.conf
# Mělo by vrátit: search zzssk.zachranka.cz

# Ověřit připojení na PRODUKČNÍ DB (přes hostname):
mysql -h akp-db-mysql01 -u erdms_user -p
# Nebo s FQDN:
mysql -h akp-db-mysql01.zzssk.zachranka.cz -u erdms_user -p

# (Zadejte heslo — mělo by se connectit)
mysql -h akp-db-mysql01 -u erdms_user -p eeo2025 -e "SELECT VERSION();"
exit
```

**Pokud je DB na novém serveru s jiným hostname**, ověřit, že je v DNS registru (IT/sysadmin by měl nastavit).

**Pokud DB běží na novém serveru, instalovat server:**
```bash
apt install mariadb-server
mysql --version
# Nastavit root uživatele (během instalace se ptá)
# Také nastavit stejný DNS alias: db.erdms.local
```

### 3.5 Adresářová Struktura

Vytvořit složky ekvivalentní prod topologii:

```bash
mkdir -p /var/www/erdms-platform/apps/eeo-v2/{api-legacy/api.eeo,api,uploads-backup}
mkdir -p /var/www/erdms-platform/apps/dashboard
mkdir -p /var/www/erdms-platform/auth-api
mkdir -p /var/www/erdms-dev/data/eeo-v2/prilohy

# Nastavit vlastnictví (pokud potřebné Apache/systemd services):
chown -R www-data:www-data /var/www/erdms-platform/apps/
chown -R www-data:www-data /var/www/erdms-dev/data/

# Zálohy:
mkdir -p /var/www/__BCK_PRODUKCE
```

---

## ⚙️ 3.6 Best Practice: DNS vs IP Adresa — Správné Hostname Jména

Aktuálně máte všechno na IP `10.3.172.11`. V Interní infrastruktuře máte ale už DNS názvy pro servery:
- **DEV DB:** `akd-db-mysql01.zzssk.zachranka.cz` (akd = Aktuální Dev)
- **PROD DB:** `akp-db-mysql01.zzssk.zachranka.cz` (akp = Aktuální Prod)

To je **produkční riziko** — používat IP namísto hostname:

| Scénář | S IP (`10.3.172.11`) | S Hostname (`akp-db-mysql01`) |
|--------|---|---|
| DB server se přesune na nový hardware | ❌ Všechny `.env` se musí aktualizovat | ✅ Jen DNS záznam (IT změní) |
| Přechod na jiného DB poskytovatele | ❌ Všechny `.env` manuálně | ✅ Jen DNS alias (IT změní) |
| Failover / redundance | ❌ Komplikované (kdy změnit IP?) | ✅ Jednoduchý (DNS load balancing) |

**Správně:**
- **DEV (.env):** `DB_HOST=akd-db-mysql01.zzssk.zachranka.cz` (nebo kratší: `akd-db-mysql01` — DNS hledá v `zzssk.zachranka.cz`)
- **PROD (.env):** `DB_HOST=akp-db-mysql01.zzssk.zachranka.cz` (nebo kratší: `akp-db-mysql01`)

V migraci (krok 7.3) to implementujeme — všechny `.env` budou používat `DB_HOST=akp-db-mysql01`.

---

## 🌐 4. DNS a EntraId Příprava

### 4.1 DNS TTL — Snížit Předem

Pokud máte DNS u svého poskytovatele, snižte TTL pro `erdms.zachranka.cz` na **60-300 sekund** aspoň 24 hodin **před** cutoverem. Tím zajistíte, že se DNS změní rychleji, když ji přepnete.

### 4.2 EntraId App Registration — Doplnit Redirect URIs

App Registration v Azure Portal (`erdms.zachranka.cz`) je již hotová. Teď musíme:

1. **Přidat redirect URI pro dev (nový):** `https://erdmsdev.zachranka.cz/auth/callback`
2. **Ověřit, že stávající URI pro prod zůstane platné i po přesměrování DNS na nový server IP:** `https://erdms.zachranka.cz/auth/callback`

**Postup (Azure Portal):**
- Jít na Azure AD → App registrations → vaše aplikace (`erdms.zachranka.cz`)
- Authentication → Redirect URIs
- Přidat (Add URI): `https://erdmsdev.zachranka.cz/auth/callback`
- Uložit (Save)

**Ověřit:** Po uložení byste měli vidět obě:
- `https://erdms.zachranka.cz/auth/callback`
- `https://erdmsdev.zachranka.cz/auth/callback`

### 4.3 ENTRA_REDIRECT_URI v `.env`

Všechny `.env` soubory mají `ENTRA_REDIRECT_URI=https://erdms.zachranka.cz/auth/callback`. Po cutoveru:
- Na **novém serveru** (prod): zůstane stejný (pokud se IP změní, Azure se neumaž — `erdms.zachranka.cz` se na ní přeloží).
- Na **tomto serveru** (dev): změní se na `https://erdmsdev.zachranka.cz/auth/callback` (v Kroku 8).

---

## 📦 5. Příprava Staging Přenosu

Budeme používat `/var/www/prenos/` na starém serveru jako staging area. **DŮLEŽITÉ:** Přenos mezi servery bude muset jít přes váš NTB jako proxy (přímá síťová viditelnost mezi servery není dostupná).

### 5.0 Proxy Přenosy (SSH přes NTB)

Pokud nemáte přímou síťovou cestu mezi starým a novým serverem, budete přenášet přes svůj NTB. Máte dvě možnosti:

**Možnost A: Přímé stahování a nahrávání (nejjednoduší)**

```bash
# Na vašem NTB — stáhnout soubory ze STARÉHO serveru:
mkdir -p ~/erdms-migration
scp -r root@10.1.1.51:/var/www/prenos/*.tar.gz ~/erdms-migration/
scp -r root@10.1.1.51:/var/www/prenos/.env_files/ ~/erdms-migration/
scp root@10.1.1.51:/var/www/prenos/checksums.sha256 ~/erdms-migration/

# Na vašem NTB — nahrát soubory na NOV server:
scp -r ~/erdms-migration/*.tar.gz root@NEW_IP:/var/www/prenos/
scp -r ~/erdms-migration/.env_files/ root@NEW_IP:/var/www/prenos/
scp ~/erdms-migration/checksums.sha256 root@NEW_IP:/var/www/prenos/

# Ověřit integritu (na novém serveru):
ssh root@NEW_IP "cd /var/www/prenos && sha256sum -c checksums.sha256"

# Smazat dočasné soubory z NTB:
rm -rf ~/erdms-migration/
```

**Možnost B: SSH tunel — bezprostřednímu přenosu přes NTB (pokročilé)**

Pokud nechcete, aby soubory ležely na vašem disku, můžete SSH tunel:

```bash
# Na vašem NTB — nastavit SSH proxy:
# V ~/.ssh/config přidat:
Host new-server
    Hostname NEW_IP
    User root
    ProxyJump old-server  # Jít přes starý server jako proxy

# Pak přenášet přímo:
scp -r old-server:/var/www/prenos/eeo2025.sql.gz new-server:/var/www/prenos/
```

Ale **jednodušší je Možnost A** — soubory na NTB nejsou problém, stačí je po přenosu smazat.

**Bezpečnostní poznámka:** `.env_files/` obsahují hesla k databázi. Zajistěte, že:
- Soubory na vašem NTB jsou mazány po přenosu a ověření: `rm -rf ~/erdms-migration/`
- Používáte zabezpečené SSH (SSH klíč nebo heslo — ne bez ověření)
- Bash history není zaznamenán: `history -c` po práci se soubory
- `.env` soubory se nikdy nedostanou do gitu: vždy kontrolovat `.gitignore`

### 5.1 Čerstvé Tarball Zdrojáků (Bez node_modules)

Na **starém serveru**:

```bash
cd /var/www
rm -rf /var/www/prenos/*.tar.gz  # Smazat staré soubory (z 23.7.)

# Tarball eeo-v2 produkčního kódu:
tar --exclude=node_modules --exclude=.git \
  -czf /var/www/prenos/erdms-platform-eeo-v2.tar.gz \
  erdms-platform/apps/eeo-v2/ \
  erdms-platform/auth-api/

# Tarball jen zdrojáků (bez node_modules):
ls -lh /var/www/prenos/erdms-platform-eeo-v2.tar.gz
# Očekávaně cca 10-20 MB (bez node_modules; staré archyvy byly 4 GB!)

# Checksum pro integritu:
sha256sum /var/www/prenos/erdms-platform-eeo-v2.tar.gz > /var/www/prenos/checksums.sha256
```

### 5.2 `.env` Soubory — Bezpečný Přenos

Tyto soubory **NEJSOU v tarballu** (gitignored). Přeneseme je odděleně přes zabezpečený kanál (SSH).

**Na starém serveru**, připravit `.env` soubory do dočasné složky (bez git):

```bash
mkdir -p /var/www/prenos/.env_files
cp /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env \
   /var/www/prenos/.env_files/eeo-v2-api-legacy.env

cp /var/www/erdms-platform/apps/eeo-v2/api/.env \
   /var/www/prenos/.env_files/eeo-v2-api.env

cp /var/www/erdms-platform/auth-api/.env.production \
   /var/www/prenos/.env_files/auth-api.env.production

chmod 600 /var/www/prenos/.env_files/*

# Vytvořit checksums i pro .env soubory (aby se nepokazily při přenosu):
sha256sum /var/www/prenos/.env_files/* >> /var/www/prenos/checksums.sha256
```

Tyto soubory **přeneseme v Kroku 6** přes proxy (váš NTB), bezpečně (ne gitem).

---

## 💾 6. Přenos Databáze

### 6.1 Dump na Starém Serveru

```bash
cd /var/www/prenos

# Full dump obou DB (eeo2025 + erdms):
mysqldump --single-transaction --routines --events --triggers \
  -h 10.3.172.11 -u erdms_user -p eeo2025 | gzip > eeo2025.sql.gz

mysqldump --single-transaction --routines --events --triggers \
  -h 10.3.172.11 -u erdms_user -p erdms | gzip > erdms.sql.gz

# Ověřit velikost:
ls -lh *.sql.gz
```

### 6.2 Checksum Kontrola (Integrita)

```bash
# Na starém serveru:
sha256sum eeo2025.sql.gz erdms.sql.gz > checksums.sha256
cat checksums.sha256
```

### 6.3 Přenos Souborů (přes Proxy — váš NTB)

Protože mezi servery není přímá síťová cesta, **musí jít vše přes váš NTB**:

**Na vašem NTB — stáhnout soubory ze STARÉHO serveru:**

```bash
mkdir -p ~/erdms-migration
cd ~/erdms-migration

# DB dumps:
scp root@10.1.1.51:/var/www/prenos/eeo2025.sql.gz .
scp root@10.1.1.51:/var/www/prenos/erdms.sql.gz .
scp root@10.1.1.51:/var/www/prenos/checksums.sha256 .

# Tarball (pokud ještě není stažen):
scp root@10.1.1.51:/var/www/prenos/erdms-platform-eeo-v2.tar.gz .

# Ověřit:
ls -lh
```

**Na vašem NTB — nahrát soubory na NOV server:**

```bash
# DB dumps a checksums:
scp eeo2025.sql.gz root@NEW_IP:/var/www/prenos/
scp erdms.sql.gz root@NEW_IP:/var/www/prenos/
scp checksums.sha256 root@NEW_IP:/var/www/prenos/

# Tarball (pokud ještě není):
scp erdms-platform-eeo-v2.tar.gz root@NEW_IP:/var/www/prenos/

# Ověřit přenos na novém serveru:
ssh root@NEW_IP "cd /var/www/prenos && ls -lh"
```

**Bezpečnost:** Po úspěšném přenosu a ověření integrity smazte soubory z vašeho NTB:
```bash
# Na vašem NTB:
rm -rf ~/erdms-migration/
```

### 6.4 Obnovit DB na Novém Serveru

**Na novém serveru:**

```bash
cd /var/www/prenos

# Ověřit checksum (integrita při transferu):
sha256sum -c checksums.sha256
# Musí vrátit: OK pro oba soubory

# Obnovit DB (pokud neexistují, MySQL je vytvoří):
mysql -h 10.3.172.11 -u erdms_user -p < <(zcat eeo2025.sql.gz)
mysql -h 10.3.172.11 -u erdms_user -p < <(zcat erdms.sql.gz)

# Alternativa (pokud pipes nefungují):
gunzip -c eeo2025.sql.gz | mysql -h 10.3.172.11 -u erdms_user -p
gunzip -c erdms.sql.gz | mysql -h 10.3.172.11 -u erdms_user -p
```

### 6.5 Validace DB

```bash
# Zkontrolovat, že DB se vytvořily:
mysql -h 10.3.172.11 -u erdms_user -p -e "SHOW DATABASES;" | grep -E 'eeo2025|erdms'

# Ověřit počty řádků v klíčových tabulkách (porovnat se starým serverem):
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 -e "SELECT COUNT(*) FROM Orders25;"
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 -e "SELECT COUNT(*) FROM Faktury25;"

# Na starém serveru (pro porovnání):
# mysql -h 10.3.172.11 -u erdms_user -p eeo2025 -e "SELECT COUNT(*) FROM Orders25;"
# mysql -h 10.3.172.11 -u erdms_user -p eeo2025 -e "SELECT COUNT(*) FROM Faktury25;"
# (výsledky by měly být stejné)
```

---

## ⚙️ 7. Konfigurace Služeb na Novém Serveru

### 7.1 Rozbalení Zdrojáků

**Na novém serveru:**

```bash
cd /var/www
tar -xzf /var/www/prenos/erdms-platform-eeo-v2.tar.gz

# Ověřit:
ls -la erdms-platform/apps/eeo-v2/
ls -la erdms-platform/auth-api/
```

### 7.2 Instalace Node Dependencies

```bash
# auth-api:
cd /var/www/erdms-platform/auth-api
npm ci --production  # ci = clean install (respektuje package-lock.json)

# eeo-v2 Node API:
cd /var/www/erdms-platform/apps/eeo-v2/api
npm ci --production
```

### 7.3 Konfigurace `.env` Souborů — DNS vs IP

Z `/var/www/prenos/.env_files/` zkopírujeme a **upravíme cesty + DB host**.

```bash
# eeo-v2 PHP API:
cp /var/www/prenos/.env_files/eeo-v2-api-legacy.env \
   /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env

# eeo-v2 Node API:
cp /var/www/prenos/.env_files/eeo-v2-api.env \
   /var/www/erdms-platform/apps/eeo-v2/api/.env

# auth-api:
cp /var/www/prenos/.env_files/auth-api.env.production \
   /var/www/erdms-platform/auth-api/.env.production
```

**KRITICKÉ: Nahradit IP adresu DB za správný Hostname**

Starý server používá IP `10.3.172.11` — to je rizikové (pokud se server přesune, všechny `.env` se musí aktualizovat). Produkce by měla používat hostname:

```bash
# Nahradit DB_HOST ve VŠECH .env souborech:
# Stare: DB_HOST=10.3.172.11
# Nove: DB_HOST=akp-db-mysql01  (produkční DB v infrastruktuře)

sed -i 's/DB_HOST=10\.3\.172\.11/DB_HOST=akp-db-mysql01/g' \
  /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env \
  /var/www/erdms-platform/apps/eeo-v2/api/.env \
  /var/www/erdms-platform/auth-api/.env.production

# Ověřit:
grep DB_HOST /var/www/erdms-platform/apps/eeo-v2/api/.env
grep DB_HOST /var/www/erdms-platform/auth-api/.env.production
# Mělo by být: DB_HOST=akp-db-mysql01
```

**Poznámka:** Hostname `akp-db-mysql01` se bude resolovat přes DNS server v `zzssk.zachranka.cz` dománě (viz `/etc/resolv.conf search` directive).

**Ostatní úpravy (cesty, upload):**

```bash
# Ověřit UPLOAD_ROOT_PATH (měl by existovat):
grep UPLOAD_ROOT_PATH /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env
# Pokud je potřeba, upravit cestu (viz klíč 2.3):
# sed -i 's|UPLOAD_ROOT_PATH=.*|UPLOAD_ROOT_PATH=/var/www/erdms-platform/data/eeo-v2/prilohy|' ...

# Ověřit, že všechny `.env` soubory existují a obsahují hodnoty:
grep -E 'DB_HOST|DB_PORT|ENTRA_CLIENT_ID' /var/www/erdms-platform/apps/eeo-v2/api/.env
grep -E 'DB_HOST|DB_PORT|ENTRA_CLIENT_ID' /var/www/erdms-platform/auth-api/.env.production
# Mělo by se objevit:
#   DB_HOST=db.erdms.local
#   DB_PORT=3306
#   ENTRA_CLIENT_ID=...
```

### 7.4 Apache VirtualHost

Kopírovat a upravit existující prod vhost z repa (nebo ze starého serveru):

```bash
# Možnost 1: Vzor z repa (může být zastaralý):
cp /var/www/erdms-dev/docs/deployment/apache-erdms-production.conf \
   /etc/apache2/sites-available/erdms.zachranka.cz.conf

# Možnost 2: Zkopírovat ze starého serveru (aktuálnější):
scp root@10.1.1.51:/etc/apache2/sites-available/001-erdms.zachranka.cz.conf \
    /etc/apache2/sites-available/

scp root@10.1.1.51:/etc/apache2/sites-available/erdms-proxy-production.inc \
    /etc/apache2/sites-available/

scp root@10.1.1.51:/etc/apache2/sites-available/erdms-proxy-dev.inc \
    /etc/apache2/sites-available/
```

**Upravit vhost pro nový server:**

Otevřít `/etc/apache2/sites-available/001-erdms.zachranka.cz.conf` a ověřit:

```apache
# Musí být na portu 80 a 443, přesměrování SSL
# DocumentRoot by měla být /var/www/erdms-platform/apps/dashboard (na novém serveru)
# SSL cesty: zkopírovat certifikáty (viz 7.5)

ServerName erdms.zachranka.cz
# (ne erdmsdev.zachranka.cz — to je jen na starém serveru později)
```

### 7.5 SSL Certifikáty

**Možnost A: Kopírovat existující certifikáty ze starého serveru** (pokud jsou kompatibilní — domain `erdms.zachranka.cz` by měl být stejný):

```bash
scp -r root@10.1.1.51:/etc/letsEncrypt/ /etc/letsEncrypt/

# V Apache vhost ověřit cesty:
SSLCertificateFile /etc/letsEncrypt/fullchain1.pem
SSLCertificateKeyFile /etc/letsEncrypt/privkey1.pem
Include /etc/letsEncrypt/options-ssl-apache.conf
```

**Možnost B: Vygenerovat nové certifikáty (certbot):**

```bash
# Instalovat certbot:
apt install certbot python3-certbot-apache

# Vygenerovat cert pro erdms.zachranka.cz (dopo DNS přenavázání):
certbot --apache -d erdms.zachranka.cz

# Ověřit auto-renewal:
certbot renew --dry-run
```

### 7.6 Aktivace Apache Vhost

```bash
a2ensite 001-erdms.zachranka.cz.conf

# Ověřit syntaxi:
apache2ctl configtest
# Výstup: Syntax OK

# Reload:
systemctl reload apache2

# Ověřit logování:
tail -f /var/log/apache2/erdms-443-ssl-error.log
```

### 7.7 Systemd Jednotky (Node.js Services)

Vytvořit `/etc/systemd/system/erdms-auth-api.service`:

```ini
[Unit]
Description=ERDMS Auth API Server - Microsoft Entra ID Authentication
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/erdms-platform/auth-api
Environment="NODE_ENV=production"
Environment="PORT=4000"
ExecStart=/root/.nvm/versions/node/v20.19.6/bin/node src/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Vytvořit `/etc/systemd/system/erdms-eeo-api.service`:

```ini
[Unit]
Description=ERDMS EEO v2 API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/erdms-platform/apps/eeo-v2/api
# ↑ DŮLEŽITÉ: Správná cesta (na starém serveru byla /var/www/erdms-builds/current, což neexistuje!)
Environment="NODE_ENV=production"
Environment="PORT=4001"
ExecStart=/root/.nvm/versions/node/v20.19.6/bin/node src/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

**Aktivace:**

```bash
systemctl daemon-reload
systemctl enable erdms-auth-api erdms-eeo-api
systemctl start erdms-auth-api erdms-eeo-api

# Ověřit stav:
systemctl status erdms-auth-api
systemctl status erdms-eeo-api

# Health check:
curl http://localhost:4000/api/auth/health
curl http://localhost:4001/api/health  # (pokud endpoint existuje)
```

### 7.8 Uploads Prilohy — Synchronizace

Pokud jste v kroku 2.3 zvolili, že uploads zůstávají sdílené, zkopírujte je:

```bash
# Ze starého serveru:
scp -r root@10.1.1.51:/var/www/erdms-dev/data/eeo-v2/prilohy/ \
       /var/www/erdms-dev/data/eeo-v2/

# Na novém serveru (pokud není v tarballu):
mkdir -p /var/www/erdms-dev/data/eeo-v2/
# (zkopírovat z výše)

chown -R www-data:www-data /var/www/erdms-dev/data/eeo-v2/prilohy
```

---

## 🔄 8. Cutover Procedura (Přepnutí do Produkce)

Toto se dělá během **krátké maintenance okna** (ideálně v noci, cca 30 minut).

### 8.1 Příprava (1 hodina před cutoverem)

- ✅ Ověřit, že všechny služby na novém serveru běží a jsou healthy
- ✅ Zkontrolovat Apache logy (žádné error 500)
- ✅ Přihlásit se k novému serveru a otestovat eeo-v2 UI (pokud máte přístup)
- ✅ Notifikace týmu, že od HH:MM bude maintenance

### 8.2 Okno Maintenance (Cutover)

**1. Finální DB dump na starém serveru:**

```bash
cd /var/www/prenos
mysqldump --single-transaction -h 10.3.172.11 -u erdms_user -p eeo2025 \
  | gzip > eeo2025-final.sql.gz
mysqldump --single-transaction -h 10.3.172.11 -u erdms_user -p erdms \
  | gzip > erdms-final.sql.gz

# Backup pro případ rollbacku:
cp eeo2025-final.sql.gz eeo2025-final.sql.gz.backup
cp erdms-final.sql.gz erdms-final.sql.gz.backup
```

**2. Zastavit zápisy (minimálně na eeo-v2):**

Na starém serveru zastavit eeo-v2 služby (DB bude přístupná jen pro čtení, ale PHP API se nebudou spouštět):

```bash
# Na starém serveru:
systemctl stop erdms-eeo-api
# (erdms-auth-api ponechejte běžet, pokud je to potřeba pro dev/ostatní apps)

# Ověřit:
systemctl status erdms-eeo-api
```

**3. Poslední sync DB na novém serveru:**

```bash
# Na novém serveru:
gunzip -c /var/www/prenos/eeo2025-final.sql.gz | \
  mysql -h 10.3.172.11 -u erdms_user -p eeo2025

gunzip -c /var/www/prenos/erdms-final.sql.gz | \
  mysql -h 10.3.172.11 -u erdms_user -p erdms

# Ověřit:
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 -e "SELECT COUNT(*) AS 'Orders25 rows' FROM Orders25;"
# Mělo by se shodovat se starým serverem
```

**4. Přepnutí DNS:**

Ke DNS poskytovateli (Registrar, Route53, apod.):
- Změnit `erdms.zachranka.cz` A record na IP nového serveru
- Čekat na propagaci (15-30 minut, podle TTL)

```bash
# Ověřit propagaci:
nslookup erdms.zachranka.cz
# Mělo by vrátit nový server IP
```

**5. Ověření na novém serveru:**

Jakmile se DNS propaguje, otestovat:

```bash
# Health check:
curl -I https://erdms.zachranka.cz/
# Mělo by vrátit 200 OK (HTML s React app)

curl -I https://erdms.zachranka.cz/api/auth/health
# Mělo by vrátit 200 OK

curl -I https://erdms.zachranka.cz/api.eeo/api.php
# Mělo by vrátit 200 OK (PHP API)

# V prohlížeči:
# 1. Jít na https://erdms.zachranka.cz
# 2. Mělo by se přihlášení přesměrovat na Azure Entra
# 3. Po přihlášení, test eeo-v2:
#    - Pokladna: Otevřít a zobrazit seznam pokladních knih
#    - Faktury: Otevřít a zobrazit faktury
```

**6. Přejmenování starého serveru na DEV:**

Na **starém serveru** (`10.1.1.51`):

```bash
# Přejmenovat DNS pro dev:
# Ve vhost /etc/apache2/sites-available/001-erdms.zachranka.cz.conf:
# ServerName erdmsdev.zachranka.cz  (místo erdms.zachranka.cz)

# Nebo vytvořit nový vhost pro dev:
cp /etc/apache2/sites-available/001-erdms.zachranka.cz.conf \
   /etc/apache2/sites-available/002-erdmsdev.zachranka.cz.conf

# Editovat:
sed -i 's/erdms.zachranka.cz/erdmsdev.zachranka.cz/g' \
  /etc/apache2/sites-available/002-erdmsdev.zachranka.cz.conf

# Aktivovat:
a2ensite 002-erdmsdev.zachranka.cz.conf
a2dissite 001-erdms.zachranka.cz.conf  # (pokud nechcete, aby poslouchala na prod doméně)
apache2ctl configtest
systemctl reload apache2

# V Azure Portal: doplnit redirect URI pro `erdmsdev.zachranka.cz` (měli jsme v kroku 4):
# https://erdmsdev.zachranka.cz/auth/callback

# Upravit `.env` na dev serveru (pokud je potřebné):
sed -i 's|https://erdms.zachranka.cz|https://erdmsdev.zachranka.cz|g' \
  /var/www/erdms-dev/apps/eeo-v2/api/.env
sed -i 's|https://erdms.zachranka.cz|https://erdmsdev.zachranka.cz|g' \
  /var/www/erdms-platform/auth-api/.env.production

# Restart services:
systemctl restart erdms-auth-api  # (pokud je na dev serveru)
```

---

## ↩️ 9. Rollback Plán

Pokud se nový server nepovedl, máte tento plán:

### 9.1 Okamžitý Rollback (během maintenance okna)

```bash
# Na DNS poskytovateli:
# Změní A record `erdms.zachranka.cz` zpět na starou IP (10.1.1.51)

# Počkat na propagaci (5-15 minut)
nslookup erdms.zachranka.cz
```

### 9.2 Obnova DB (pokud byl problém se daty)

```bash
# Na starém serveru (pokud jsou DB ještě intaktní):
# Pokud jste v kroku 8.2 zálohovali DB dump:
gunzip -c /var/www/prenos/eeo2025-final.sql.gz.backup | \
  mysql -h 10.3.172.11 -u erdms_user -p eeo2025
```

### 9.3 Restart Starých Služeb

```bash
# Na starém serveru:
systemctl start erdms-eeo-api
systemctl status erdms-eeo-api
```

---

## ✅ 10. Po Migraci

### 10.1 Aktualizace Dokumentace

- [ ] Aktualizovat `apps/eeo-v2/CLAUDE.md` s novou topologií (produkce na novém serveru)
- [ ] Označit `docs/deployment/DEPLOYMENT-GUIDE.md` a `PRODUCTION.md` jako zastaralé (odkaz na tento dokument)
- [ ] Aktualizovat `docs/deployment/` s novou architekturou

### 10.2 Cron Zálohy na Novém Serveru

Nastavit automatické denní zálohy:

```bash
# Na novém serveru, vytvořit `/etc/cron.d/erdms-backup`:
cat > /etc/cron.d/erdms-backup <<'EOF'
# ERDMS Prod Backup (daily at 2 AM)
0 2 * * * root /var/www/erdms-dev/apps/eeo-v2/scripts/backup_production.sh --run

# Log rotation (optional)
0 3 * * 0 root /usr/sbin/logrotate /etc/logrotate.d/erdms
EOF

# Ověřit:
crontab -l | grep erdms-backup
```

### 10.3 Azure Entra — Cleanup

Po ověřeném provozu (cca 1-2 týdny), smazat staré redirect URI:
- V Azure Portal → App registrations → vaše aplikace
- Odebrat `https://erdmsdev.zachranka.cz/auth/callback` (pokud jste ji dodali v kroku 4 pro test)
- Ponechat jen `https://erdms.zachranka.cz/auth/callback` (nový prod server)
- Případně přidat starou IP `10.1.1.51` jako dev URI pro kompatibilitu

---

## 🔗 Přílohy a Šablony

### Šablona: Příkazní Řádka pro Komplexní Cutover (Bash Script)

Pokud budete migrovat i ostatní aplikace, můžete si vytvořit bash skript:

```bash
#!/bin/bash
# migration-cutover.sh

OLD_SERVER="10.1.1.51"
NEW_SERVER="NEW_IP"
DATE=$(date +%Y%m%d_%H%M%S)

echo "=== ERDMS Migration Cutover ==="
echo "From: $OLD_SERVER"
echo "To: $NEW_SERVER"
echo "Time: $DATE"

# 1. Final DB dump on old server
ssh root@$OLD_SERVER "cd /var/www/prenos && mysqldump ... > eeo2025-$DATE.sql.gz"

# 2. Sync to new server
ssh root@$OLD_SERVER "scp /var/www/prenos/eeo2025-$DATE.sql.gz root@$NEW_SERVER:/var/www/prenos/"

# 3. Restore on new server
ssh root@$NEW_SERVER "gunzip -c /var/www/prenos/eeo2025-$DATE.sql.gz | mysql ..."

# 4. Health check on new server
ssh root@$NEW_SERVER "curl http://localhost:4000/api/auth/health"

# 5. Update DNS (manual step)
echo "MANUAL: Update DNS A record for erdms.zachranka.cz to $NEW_SERVER"

# 6. Wait for DNS propagation
sleep 300

# 7. Verify
curl -I https://erdms.zachranka.cz/
```

---

## 📞 FAQ & Troubleshooting

**Q: Jak poznám, že cutover je hotový?**
A: Až se DNS změní a všechny tři health checky (auth-api, eeo-v2 api, PHP API) vrátí 200 OK.

**Q: Co když certifikáty neexistují?**
A: Vygenerujte nové přes `certbot --apache -d erdms.zachranka.cz`.

**Q: Co když je Apache 403 Forbidden?**
A: Ověřit `/var/www/erdms-platform` vlastnictví: `chown -R www-data:www-data /var/www/erdms-platform/`.

**Q: Co když Node.js API padá?**
A: Ověřit `systemctl status erdms-eeo-api`, podívat se do logu: `journalctl -u erdms-eeo-api -f`.

**Q: Co když se DB nevytvořila?**
A: Ověřit, že uživatel `erdms_user` má práva `CREATE DATABASE`: `GRANT ALL PRIVILEGES ON *.* TO erdms_user@'10.1.1.51' IDENTIFIED BY 'PASSWORD';`.

**Q: Jak přenést soubory, pokud mezi servery není přímá SSH cesta?**
A: Používejte proxy přes váš NTB:
```bash
# NTB stáhne ze starého serveru:
scp root@10.1.1.51:/var/www/prenos/soubor.tar.gz ~/migration/

# NTB nahraje na nový server:
scp ~/migration/soubor.tar.gz root@NEW_IP:/var/www/prenos/

# Ověřit a smazat z NTB:
rm ~/migration/soubor.tar.gz
```

**Q: Měl bych předat `.env` soubory jinak (bez SCP)?**
A: SCP je bezpečný. Ale pokud chcete extra opatrnost: 
  1. Propojit SSH přes váš NTB jako jump host: `ssh -J user@NTB root@NEW_IP`
  2. Nebo přenesit `.env` ručně přes terminálu (copy-paste), ne přes soubory

**Q: Jak zásadně zkontrolovat, že DB dump je intaktní?**
A: Ověřit checksum před i po přenosu:
```bash
# Před přenosem na starém serveru:
sha256sum /var/www/prenos/eeo2025.sql.gz

# Po přenosu na novém serveru:
sha256sum /var/www/prenos/eeo2025.sql.gz

# Musí se shodovat!
```

**Q: Co když se DB přesune na nový server s jinou IP?**
A: 
- Pokud máte `.env` nastavené na `DB_HOST=akp-db-mysql01`: IT změní DNS záznam, `.env` se nemusí měnit
- Pokud máte `.env` s IP (`10.3.172.11`): musíte aktualizovat všechny `.env` soubory + restart služeb
Proto je hostname lepší pro produkci! (IT změní DNS, vývojáři nemusí nic dělat)

**Q: Jak ověřit, že se hostname resoluje správně?**
A: 
```bash
# Ověřit DNS konfiguraci:
cat /etc/resolv.conf
# Mělo by mít: search zzssk.zachranka.cz

# Ověřit rezoluci hostname:
getent hosts akp-db-mysql01
# Mělo by vrátit: 10.3.172.11 akp-db-mysql01.zzssk.zachranka.cz

# Ověřit MySQL spojení:
mysql -h akp-db-mysql01 -u erdms_user -p eeo2025 -e "SELECT 'OK';"
```

**Q: Jaký je hostname pro DEV DB?**
A: `akd-db-mysql01` (akd = Aktuální Dev). Na DEV serveru `.env` by měly mít `DB_HOST=akd-db-mysql01`.

---

**Datum:** 2026-09-08 (ověřeno na reálné topologii)  
**Autor:** ERDMS Team  
**Kontakt:** r.holovsky@gmail.com
