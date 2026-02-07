# 🚀 Optimalizace vývojového prostředí pro SSH tunel

## Shrnutí provedených změn

### ✅ 1. React HMR Optimalizace (eeo-v2)

- **Polling interval**: 5000ms (místo real-time watch)
- **Aggregate timeout**: 1000ms před rebuildem
- **Ignorované složky**: Rozšířeno o test files, coverage, cache
- **Client logging**: Pouze chyby (vypnuto info/warnings)
- **Progress bar**: Vypnut (šetří WebSocket zprávy)
- **LiveReload**: Vypnut (pouze HMR)

📁 Soubor: [eeo-v2/client/config-overrides.js](eeo-v2/client/config-overrides.js#L22-L55)

---

### ✅ 2. VS Code File Watching

Vytvořen workspace settings soubor s rozsáhlými optimalizacemi:

**File Watcher Exclusions:**
- Build artifacts (build, dist, .webpack-cache)
- Test files (*.test.*, *.spec.*)
- Dokumentace (docs, manualy, TODO)
- Large files (*.sql, *.dump, uploads)
- Cache & temp (tmp, .cache, coverage)

**Další optimalizace:**
- Auto-save: `onFocusChange` (místo afterDelay)
- Format on save: **vypnuto**
- Git auto-refresh: **vypnuto**
- Extension auto-update: **vypnuto**
- Terminal persistent sessions: **vypnuto**

📁 Soubor: [.vscode/settings.json](.vscode/settings.json)

---

### ✅ 3. PHP-FPM Development Config

Minimalizovaný pool pro dev prostředí:

```ini
pm.max_children = 5          (produkce: 20-50)
pm.start_servers = 2         (produkce: 5-10)
pm.min_spare_servers = 1     (produkce: 5)
pm.max_spare_servers = 3     (produkce: 10)
pm.max_requests = 100        (produkce: 500-1000)
```

**Další nastavení:**
- Memory limit: 256M (místo 512M+)
- Opcache revalidate: 2s (vidět změny rychle)
- Slow log: 10s threshold
- Menší upload limity (20M)

📁 Soubor: [php-fpm-dev.conf](php-fpm-dev.conf)

**Instalace:**
```bash
# 1. Vytvořit log adresáře
sudo mkdir -p /var/log/php-fpm /tmp/php-sessions-dev
sudo chown www-data:www-data /var/log/php-fpm /tmp/php-sessions-dev

# 2. Symlink config (nahraďte 8.x vaší verzí PHP)
sudo ln -sf /var/www/erdms-dev/apps/php-fpm-dev.conf /etc/php/8.2/fpm/pool.d/dev.conf

# 3. Test a reload
sudo php-fpm8.2 -t
sudo systemctl reload php8.2-fpm

# 4. Monitoring
sudo systemctl status php8.2-fpm
```

---

### ✅ 4. SSH Tunel Optimalizace

Kompletní průvodce pro klientské i serverové nastavení:

**Klient (~/.ssh/config):**
- **Compression**: Level 6
- **Multiplexing**: ControlMaster auto (sdílené spojení)
- **Keepalive**: 30s interval
- **QoS**: IPQoS af21 cs1 (priorita interaktivního provozu)
- **Rychlé ciphers**: chacha20-poly1305, aes-gcm
- **Rychlé MACs**: umac-128-etm

**Server (/etc/ssh/sshd_config):**
- UseDNS no (rychlejší auth)
- Compression yes
- ClientAliveInterval 30
- Stejné cipher preference

📁 Soubor: [SSH_OPTIMIZATION_GUIDE.conf](SSH_OPTIMIZATION_GUIDE.conf)

**Setup (na vašem LOKÁLNÍM PC):**
```bash
# 1. Vytvořit socket directory
mkdir -p ~/.ssh/sockets
chmod 700 ~/.ssh/sockets

# 2. Editovat ~/.ssh/config
nano ~/.ssh/config
# (zkopírovat blok z SSH_OPTIMIZATION_GUIDE.conf)
# Upravit HostName a User!

# 3. Test
ssh -v erdms-dev
# Hledejte: "Compression", "multiplexing" v output
```

---

## 🎯 Očekávané výsledky

### Snížení datového toku:
- **HMR/File watching**: ~70-80% snížení (polling vs real-time)
- **VS Code metadata**: ~60% snížení (excludes)
- **PHP-FPM I/O**: ~50% snížení (méně workerů)
- **SSH overhead**: 20-40% snížení (komprese + multiplexing)

### Přetrvávající provoz:
- GitHub Copilot: **priorita** (interaktivní QoS)
- Typing/editing: Plynulé (nízká latence)
- HMR updates: Pomalejší (5s delay), ale stabilní

---

## 🔧 Okamžité kroky k aplikaci

### 1. **Reload VS Code window**
Aby se načetly nové `.vscode/settings.json`:
```
Ctrl+Shift+P → "Developer: Reload Window"
```

### 2. **Restart dev serverů**
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm start  # Nově s polling a omezeným loggingem

cd /var/www/erdms-dev/apps/intranet-v26/client
npm run dev  # Vite s polling
```

### 3. **Aktivovat PHP-FPM dev pool**
```bash
# Podle instrukcí výše
sudo ln -sf /var/www/erdms-dev/apps/php-fpm-dev.conf /etc/php/8.2/fpm/pool.d/dev.conf
sudo systemctl reload php8.2-fpm
```

### 4. **Konfigurovat SSH (na lokálním PC)**
```bash
# Editovat ~/.ssh/config dle SSH_OPTIMIZATION_GUIDE.conf
# DŮLEŽITÉ: Změnit HostName a User!
nano ~/.ssh/config
```

### 5. **Reconnect VS Code**
- Disconnect z Remote SSH
- Reconnect (použije novou SSH konfiguraci)

---

## 📊 Monitoring & Fine-tuning

### Sledovat bandwidth:
```bash
# Na serveru
iftop -i eth0 -f 'port 22'
```

### Sledovat PHP-FPM:
```bash
watch -n 2 'sudo systemctl status php8.2-fpm | grep "active"'
tail -f /var/log/php-fpm/dev-slow.log
```

### Pokud stále timeouty:
1. **Zvýšit polling intervaly** na 10s (config-overrides.js, vite.config.ts)
2. **Vypnout auto-save úplně** (`files.autoSave: "off"`)
3. **Omezit Copilot** dočasně (jen Chat, vypnout inline suggestions)
4. **Zastavit jeden dev server** (pracovat jen na jednom projektu najednou)

---

## ⚠️ Trade-offs

- **Hot reload je pomalejší** (5s delay místo instant)
- **Manuální save** doporučeno (format-on-save vypnut)
- **Git změny** se nerefreshují automaticky (F5 v Git panelu)
- **PHP worker pool** je malý (může být pomalejší při high load)

---

## 🔄 Návrat k původnímu stavu

Pokud potřebujete full performance (např. na lokálním stroji):

```bash
# 1. Smazat/přejmenovat .vscode/settings.json
mv .vscode/settings.json .vscode/settings.json.ssh-optimized

# 2. Git revert HMR config
cd eeo-v2/client && git checkout config-overrides.js

# 3. Odstranit PHP-FPM dev pool
sudo rm /etc/php/8.2/fpm/pool.d/dev.conf
sudo systemctl reload php8.2-fpm
```

---

**Vytvořeno:** 7. února 2026  
**Pro:** Vzdálený SSH development s omezeným bandwidth  
**Projekt:** eeo-v2 (Webpack/CRA)
