# Nasazení React mapy do WordPress stránky (varianta 2: build + shortcode)

Datum: 12. 2. 2026

Tento postup je pro tvoji strukturu projektu:

- React/Vite app: `wp-mapa/preview`
- Cíl: zobrazit app ve WordPress stránce přes shortcode (bez iframe)

---

## Co tím získáš

- čisté vložení do WP stránky
- dobrý výkon (statický build)
- jednoduchý update (nový build přehraješ na server)

---

## 1) Připrav produkční build

V rootu projektu spusť:

```bash
npm --prefix ./wp-mapa/preview install
npm --prefix ./wp-mapa/preview run build
```

Po buildu vznikne složka:

- `wp-mapa/preview/dist`

---

## 2) Doporučené nastavení Vite (manifest + správná base)

Aby WordPress uměl načíst správné hashované soubory, je nejlepší mít Vite manifest.

Otevři `wp-mapa/preview/vite.config.js` a nastav build takto (princip):

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/wp-content/uploads/wp-mapa-app/', // URL, kde bude dist nasazený
  build: {
    manifest: true,
    outDir: 'dist'
  }
})
```

Pak build spusť znovu.

> Pokud budeš nasazovat do jiné URL, uprav `base`.

Reference:
- Vite build options: https://vite.dev/config/build-options
- Vite static deploy: https://vite.dev/guide/static-deploy

---

## 3) Nahraj build na WordPress server

Nahraj obsah `dist` do:

- `wp-content/uploads/wp-mapa-app/`

Typicky tam bude:

- `index.html`
- `manifest.json`
- `assets/...`

> Pro shortcode řešení se `index.html` přímo nevkládá do stránky; důležité jsou hlavně `manifest.json` a `assets`.

---

## 4) Vytvoř mini plugin se shortcodem

Na WP serveru vytvoř složku pluginu:

- `wp-content/plugins/wp-mapa-embed/`

A v ní soubor:

- `wp-content/plugins/wp-mapa-embed/wp-mapa-embed.php`

Obsah:

```php
<?php
/**
 * Plugin Name: WP Mapa Embed
 * Description: Shortcode pro vložení React/Vite mapy.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

define('WP_MAPA_BUILD_DIR', WP_CONTENT_DIR . '/uploads/wp-mapa-app');
define('WP_MAPA_BUILD_URL', content_url('uploads/wp-mapa-app'));

function wp_mapa_get_manifest() {
    $manifest_path = WP_MAPA_BUILD_DIR . '/manifest.json';

    if (!file_exists($manifest_path)) {
        return null;
    }

    $json = file_get_contents($manifest_path);
    $data = json_decode($json, true);

    return is_array($data) ? $data : null;
}

function wp_mapa_enqueue_assets() {
    static $done = false;

    if ($done) {
        return;
    }

    $manifest = wp_mapa_get_manifest();
    if (!$manifest) {
        return;
    }

    // Najdi entry chunk (nejčastěji src/main.jsx nebo první s "isEntry")
    $entry = null;

    if (isset($manifest['src/main.jsx'])) {
        $entry = $manifest['src/main.jsx'];
    } else {
        foreach ($manifest as $item) {
            if (!empty($item['isEntry'])) {
                $entry = $item;
                break;
            }
        }
    }

    if (!$entry || empty($entry['file'])) {
        return;
    }

    $js_handle = 'wp-mapa-app';
    $js_url = WP_MAPA_BUILD_URL . '/' . ltrim($entry['file'], '/');

    wp_register_script($js_handle, $js_url, array(), null, true);
    wp_enqueue_script($js_handle);

    // Vite output je ES module -> přidej type="module"
    add_filter('script_loader_tag', function($tag, $handle, $src) use ($js_handle) {
        if ($handle !== $js_handle) {
            return $tag;
        }
        return '<script type="module" src="' . esc_url($src) . '"></script>' . "\n";
    }, 10, 3);

    // CSS z manifestu
    if (!empty($entry['css']) && is_array($entry['css'])) {
        foreach ($entry['css'] as $i => $css_file) {
            $css_handle = 'wp-mapa-app-css-' . $i;
            $css_url = WP_MAPA_BUILD_URL . '/' . ltrim($css_file, '/');
            wp_enqueue_style($css_handle, $css_url, array(), null);
        }
    }

    $done = true;
}

function wp_mapa_shortcode($atts = array()) {
    $atts = shortcode_atts(array(
        'height' => '70vh',
        'class'  => ''
    ), $atts, 'wp_mapa');

    wp_mapa_enqueue_assets();

    $classes = trim('wp-mapa-root-wrap ' . $atts['class']);
    $height  = esc_attr($atts['height']);

    // ROOT element pro React app
    return '<div class="' . esc_attr($classes) . '" style="height:' . $height . ';"><div id="root"></div></div>';
}

add_shortcode('wp_mapa', 'wp_mapa_shortcode');
```

Potom plugin aktivuj v administraci WP.

Reference:
- Shortcode API: https://developer.wordpress.org/plugins/shortcodes/
- `wp_enqueue_script`: https://developer.wordpress.org/reference/functions/wp_enqueue_script/
- `wp_enqueue_style`: https://developer.wordpress.org/reference/functions/wp_enqueue_style/

---

## 5) Vlož shortcode do stránky

Do stránky/příspěvku dej:

```text
[wp_mapa]
```

Nebo s parametry:

```text
[wp_mapa height="80vh" class="moje-mapa"]
```

V Gutenberg editoru použij blok **Shortcode** a vlož to tam.

---

## 6) Update proces (až bude nová verze mapy)

1. Lokálně: `npm --prefix ./wp-mapa/preview run build`
2. Přehraj obsah `dist` na server do `wp-content/uploads/wp-mapa-app/`
3. Vyčisti cache (WP cache plugin / CDN)
4. Hotovo

---

## 7) Nejčastější problémy

### Bílá stránka / nic se nenačte

- zkontroluj v DevTools 404 na JS/CSS
- nejčastěji špatně nastavené `base` ve Vite

### 404 na assets

- ověř, že opravdu existují v `wp-content/uploads/wp-mapa-app/assets/`
- ověř URL v `manifest.json`

### V adminu shortcode funguje, na frontendu ne

- plugin není aktivní
- cache vrací starou stránku

### React Router nefunguje při refreshi URL

- pokud má app více rout, nastav radši `HashRouter`, nebo server rewrite pravidla

---

## 8) Volitelně: lepší WordPress root kontejner

Jestli nechceš kolizi s jinými pluginy, můžeš změnit root id v Reactu i pluginu, např.:

- v Reactu `createRoot(document.getElementById('wp-mapa-root'))`
- v shortcode vracet `<div id="wp-mapa-root"></div>`

To je často bezpečnější než obecné `id="root"`.

---

## 9) FTP upload (automatizace)

V projektu už je připravený script:

- `wp-mapa/preview/deploy-ftp.sh`
- `wp-mapa/preview/.env.ftp.example`

Postup:

1. Zkopíruj example env:

```bash
cd ./wp-mapa/preview
cp .env.ftp.example .env.ftp
```

2. Vyplň `.env.ftp` (host, user, pass, remote dir)
3. Spusť deploy:

```bash
./deploy-ftp.sh
```

Co script dělá:

- udělá `npm run build`
- přes `lftp` nahraje `dist/` do `FTP_REMOTE_DIR`
- použije `mirror -R --delete`, takže smaže i staré soubory na serveru

> Poznámka: potřebuješ nainstalované `lftp`.

Reference:
- lftp mirror: https://lftp.yar.ru/lftp-man.html
