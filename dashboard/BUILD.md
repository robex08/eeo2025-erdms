# Dashboard – DEV build only (FE)

> ⚠️ Tento dokument je záměrně **DEV-only**.
> - ✅ Pouze build do `/var/www/erdms-dev/dashboard/build/`
> - ❌ ŽÁDNÉ kopírování do release adresářů
> - ❌ ŽÁDNÝ deploy / produkce

## Rychlý DEV build

```bash
cd /var/www/erdms-dev/dashboard
rm -rf node_modules/.vite .vite dist build
npm run build -- --outDir build
echo "✅ DEV build hotový (dashboard/build)"
```

## Poznámky

- Cache je dobré smazat před buildem, aby se nepoužily staré assets.
- Build musí jít do `build/` (ne `dist/`), protože DEV Apache typicky míří na `build/`.
- Apache reload obvykle není nutný (statické soubory se jen čtou), ale pokud máš problém s cache, řeš primárně prohlížeč.

## Struktura

```
/var/www/erdms-dev/dashboard/build/          # DEV build
```
