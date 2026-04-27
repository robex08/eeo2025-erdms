# EEO Mobile (eeo-v2-mt)

Mobilní PWA aplikace pro správu objednávek v systému EEO v2.

## 🎯 Funkcionalita

- ✅ Přihlášení (lokální + připraveno na MS Entra ID)
- ✅ Dashboard s přehledem statistik objednávek
- ✅ Seznam objednávek s filtrováním
- ✅ Detail objednávky v bottom sheet
- ✅ Dark mode (default)
- ✅ PWA ready (offline caching, install to home screen)

## 🛠️ Tech Stack

- **Framework:** Vite 8 + React 18 + TypeScript
- **State Management:** Zustand
- **Data Fetching:** TanStack Query (React Query v5)
- **Routing:** React Router v6
- **Styling:** TailwindCSS
- **PWA:** vite-plugin-pwa
- **HTTP Client:** Axios
- **Icons:** Lucide React

## 🚀 Development

### Spuštění DEV serveru

\`\`\`bash
npm run dev
\`\`\`

Aplikace běží na: \`http://localhost:3001\`

### Build pro produkci

\`\`\`bash
npm run build
\`\`\`

## 🌐 API Konfigurace

**DEV:** \`https://erdms.zachranka.cz/dev/api.eeo\`  
**PROD:** \`https://erdms.zachranka.cz/api.eeo\`

Konfigurace v \`.env.development\` a \`.env.production\`.

## 📱 PWA Features

- Install to Home Screen
- Offline Caching (NetworkFirst, 15 min)
- Service Worker auto-update

## 🎨 Dark Mode

Default: Dark mode (podle mockupů). Přepínání v pravém horním rohu.

## 📄 API Dokumentace

Viz: \`/var/www/erdms-dev/apps/eeo-v2/mobilni_app_doc/\`

---

**Verze:** 1.0.0 | **Datum:** 27. 04. 2026
