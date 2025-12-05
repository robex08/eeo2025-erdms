import React from 'react';
import { Global, css } from '@emotion/react';

/*
  GlobalStyles centralizuje původní obsah index.css a App.css.
  Pokud něco chybí, lze doplnit zde – po migraci již nepoužíváme přímé importy .css.
*/

export const GlobalStyles = () => (
  <Global styles={css`
    /* --------------------------------------------------
       Global CSS Variables (moved from Layout.js to avoid
       first-paint fallback mismatch + content overlap)
       Keep ONLY size/typography vars here (no theme deps).
    -------------------------------------------------- */
    :root {
      --app-header-height:96px; /* single source of truth */
      --app-menu-height:48px;
      --app-footer-height:54px;
      --app-fixed-offset: calc(var(--app-header-height) + var(--app-menu-height));
      --app-fixed-offset-safe: calc(var(--app-fixed-offset) + 1px); /* border compensation */
      /* Theme primary colors */
    /* Theme tokens (synced with src/theme/theme.js) */
  --app-primary: #1f2a57;
    --app-primary-accent: #2563eb;
    --app-primary-accent-alt: #1d4ed8;
    --app-primary-accent-alt-hover: #1e40af;
    --app-danger: #dc2626;
    --app-danger-soft: #fee2e2;
    --app-gold: #FFD700;
    --app-surface-light: #f8f9fa;
    --app-surface-alt: #f3f4f6;
    --app-dark-bg: #1e293b;
    --app-dark-border: #334155;
    --app-gray-100: #f1f5f9;
    --app-gray-200: #e2e8f0;
    --app-gray-300: #cbd5e1;
    --app-gray-500: #64748b;
    --app-gray-700: #334155;
    --app-bg-body: #f0f0f0;
    --app-primary-dark: #162248;
      /* Typography */
      --app-font-family: Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, 'Inter', 'Helvetica Neue', Arial, sans-serif;
      --app-base-font-size: 14.5px;
      --app-base-line-height: 1.45;
      --app-header-title-size: 1.75rem;
      --app-header-title-weight: 600;
      --app-menu-link-size: 0.95rem;
      --app-menu-link-weight: 500;
    }

    /* Reset (původně App.css) */
    * { margin:0; padding:0; box-sizing:border-box; }

    html, body, #root { height:100%; }

    body, button, input, select, textarea {
      font-family: var(--app-font-family);
      font-size: var(--app-base-font-size);
      line-height: var(--app-base-line-height);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
      font-feature-settings: "liga", "kern";
    }
  body { margin:0; background-color:#f0f0f0; color:#333; transition: background-color .25s ease,color .25s ease; }

    html[data-theme='dark'] body {
      background:#0f172a;
      color:#e2e8f0;
    }

    html[data-theme='dark'] .header { background-color:#1e293b; }
    html[data-theme='dark'] .logout-button { background-color:#dc2626; }
    html[data-theme='dark'] .logout-button:hover { background-color:#b91c1c; }

    code { font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace; }

    /* Anchor reset (z index.css) */
    a, a:link, a:visited, a:hover, a:active, a:focus { text-decoration:none; color:inherit; }

    /* Původní .App wrapper */
    .App { display:flex; flex-direction:column; min-height:100vh; }

    /* Historické utility (ponechány pro případ, že někde ještě existuje className) */
    .header { display:flex; justify-content:space-between; align-items:center; padding:10px 20px; background-color:#202d65; color:#fff; }
    .user-info { font-size:16px; font-weight:bold; }
    .logout-button { background-color:#ff4d4d; color:#fff; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; }
    .logout-button:hover { background-color:#e60000; }

    /* Unified page title + nav link sizing (moved from Layout) */
    nav a, nav button { font-size: var(--app-menu-link-size); font-weight: var(--app-menu-link-weight); }
    .page-title { font-size:1.40rem; font-weight:600; line-height:1.18; margin:0 0 0.9rem; letter-spacing:.35px; font-family:var(--app-font-family); }
    [data-mode='dark'] .page-title { color:#f1f5f9; }
    main h1 { font-size: 1.4rem; font-weight:600; line-height:1.2; margin:0 0 0.85rem; letter-spacing:0.25px; }
    main h2 { font-size: 1.1rem; font-weight:600; line-height:1.25; margin:1.5rem 0 0.6rem; }
    main h3 { font-size: 1rem; font-weight:600; line-height:1.3; margin:1.2rem 0 0.5rem; }
    main > *:first-of-type { margin-top:0 !important; }
  `} />
);

export default GlobalStyles;
