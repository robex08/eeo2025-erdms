# FTP deploy na preview web (webvoky-ai)

Toto je samostatný deploy mimo WordPress.

## Co je připravené

- script: `deploy-ftp.sh`
- env template: `.env.ftp.example`

## Postup

1. Otevři složku projektu:

```bash
cd /home/holovsky/dokumenty/Jazyky/react/zzs-util/wp-mapa/preview
```

2. Připrav konfiguraci:

```bash
cp .env.ftp.example .env.ftp
```

Alternativa (doporučeno): script umí číst i kořenový `.env` z projektu (`../../.env`) s proměnnými:

```env
FTP_HOST=...
FTP_USERNAME=...
FTP_PASSWORD=...
FTP_ROOT_PATH=/webovky-ai.cz/web/zzssk/wp-mapa
```

V tom případě `.env.ftp` není nutný.

3. Doplň hodnoty do `.env.ftp`:

```env
FTP_HOST=TVUJ_FTP_HOST_WEBVOKY_AI
FTP_PORT=21
FTP_USER=TVUJ_LOGIN
FTP_PASS=TVE_HESLO
FTP_SSL=false
FTP_REMOTE_DIR=/public_html/preview
```

Poznámky:
- `FTP_REMOTE_DIR` nastav na document root preview webu.
- pokud hosting vyžaduje FTPS, dej `FTP_SSL=true`.

4. Spusť deploy:

```bash
./deploy-ftp.sh
```

Script udělá:
- `npm run build`
- upload `dist/` přes FTP
- synchronizaci přes `mirror -R` (bez mazání souborů na FTP)

## Ověření

- Otevři preview URL a zkontroluj mapu.
- Pokud něco chybí, zkontroluj v DevTools 404 na `assets/*`.

## Rychlé opakování deploye

Po každé změně stačí:

```bash
cd /home/holovsky/dokumenty/Jazyky/react/zzs-util/wp-mapa/preview && ./deploy-ftp.sh
```

## Zapsáno pro příště

- Cílová FTP složka mapy: `/webovky-ai.cz/web/zzssk/wp-mapa`
- Bere se z proměnné v `.env`: `FTP_ROOT_PATH`
- Spuštění odkudkoliv:

```bash
bash /home/holovsky/dokumenty/Jazyky/react/zzs-util/wp-mapa/preview/deploy-ftp.sh
```

## Lokální backup z FTP

- Script: `backup-ftp.sh`
- Stáhne obsah z `FTP_ROOT_PATH` do `../ftp-backup-YYYYmmdd-HHMMSS`
- Složka `down` se při backupu vždy ignoruje

Spuštění:

```bash
bash /home/holovsky/dokumenty/Jazyky/react/zzs-util/wp-mapa/preview/backup-ftp.sh
```
