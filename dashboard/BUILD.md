# Dashboard Build & Deploy

## Kompletní rebuild a nasazení do produkce

```bash
cd /var/www/erdms-dev/dashboard && \
rm -rf node_modules/.vite .vite dist build && \
npm run build -- --outDir build && \
cp -r build/* /var/www/erdms-builds/releases/20251205-000933/dashboard/build/ && \
cp -r build/* /var/www/erdms-builds/releases/eeo-v2/dashboard/build/ && \
systemctl reload apache2 && \
echo "✅ Rebuild hotový!"
```

## Krok za krokem

1. **Přejít do dashboard adresáře:**
   ```bash
   cd /var/www/erdms-dev/dashboard
   ```

2. **Vymazat všechny cache:**
   ```bash
   rm -rf node_modules/.vite .vite dist build
   ```

3. **Buildnout do build/ adresáře:**
   ```bash
   npm run build -- --outDir build
   ```

4. **Nakopírovat do release adresářů:**
   ```bash
   cp -r build/* /var/www/erdms-builds/releases/20251205-000933/dashboard/build/
   cp -r build/* /var/www/erdms-builds/releases/eeo-v2/dashboard/build/
   ```

5. **Restartovat Apache:**
   ```bash
   systemctl reload apache2
   ```

## Poznámky

- **Vždy mazat cache** před buildem, jinak se použijí staré CSS soubory
- Build musí jít do `build/` adresáře (ne `dist/`), protože Apache ukazuje na `build/`
- Kopírovat do **OBOU** release adresářů
- Po buildu vždy **reload Apache**
- Pro vymazání cache v prohlížeči: **Ctrl+Shift+R** nebo inkognito mód

## Struktura

```
/var/www/erdms-dev/dashboard/build/          # Vývojový build
/var/www/erdms-builds/releases/20251205-000933/dashboard/build/  # Release 1
/var/www/erdms-builds/releases/eeo-v2/dashboard/build/          # Release 2
```

## Apache konfigurace

Aktivní konfigurace ukazuje na:
```
DocumentRoot /var/www/erdms-dev/dashboard/build
```

(viz `/etc/apache2/sites-available/erdms.zachranka.cz.conf`)
