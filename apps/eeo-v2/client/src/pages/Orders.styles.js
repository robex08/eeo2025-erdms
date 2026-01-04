import React from 'react';
import { Global, css } from '@emotion/react';

const styles = css`
  :root {
    --app-primary: #202d65; /* canonical header blue */
    --app-primary-dark: #162248; /* slightly darker for hover states */
  }

  .orders-page {
    padding: 1rem;
  }

  /* Generic highlight styling for search matches within Orders pages */
  .orders-page mark {
    background: #ffe78f;
    color: inherit;
    padding: 0 0px; /* keep text height consistent */
    border-radius: 2px;
    font-weight: 600;
  }

  .orders-table,
  .orders-header,
  .filter-box,
  .summary-boxes,
  .stats-box,
  input,
  select,
  textarea,
  button {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .orders-table {
    padding: 1rem;
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
    overflow-x: auto;
    display: block;
  }

  /* modern card-like table container */
  .orders-table {
    background: #ffffff;
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(16,24,64,0.06);
    padding: 12px;
  }

  .orders-table table {
    width: 100%;
    border-collapse: collapse;
  }

  .orders-table th,
  .orders-table td {
    border: 1px solid #ddd;
    padding: 10px;
    text-align: left;
    word-wrap: break-word;
    font-size: 19.32px;
  }

  .orders-table thead {
    background: linear-gradient(135deg, #1f2a57 0%, #2563eb 70%, #1d4ed8 100%);
  }

  .orders-table th {
    background: transparent;
    color: #fff;
    font-weight: 700;
    text-align: center;
    font-size: 13px;
    padding: 14px 12px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    cursor: pointer;
    transition: all .12s ease;
  }

  /* Odstraněno problematické thead:hover pravidlo které způsobovalo bělení záhlaví */

  /* Table styling dle OrdersListNew.js */
  .orders-table table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
  }

  /* Sticky header styling jako v OrdersListNew */
  .orders-table thead tr:first-of-type {
    background: linear-gradient(135deg, #1f2a57 0%, #2563eb 70%, #1d4ed8 100%);
  }

  .orders-table thead tr:first-of-type th {
    position: sticky;
    top: 0;
    z-index: 3;
    background: transparent;
    color: #fff;
    padding: 12px 8px;
    text-align: center;
    vertical-align: middle;
    font-weight: 700;
    border-bottom: 1px solid #e6eef8;
    box-shadow: 0 1px 0 0 rgba(255,255,255,0.12) inset;
  }

  /* Zruší nežádoucí hover efekt jako v OrdersListNew */
  .orders-table thead th:hover {
    background-color: transparent !important;
    background: transparent !important;
  }

  /* Apply zebra and hover only when row highlighting (status colors) is OFF.
     We toggle via a class on the page root: .orders-page.colors-on/.colors-off */
  .orders-page:not(.colors-on) .orders-table tr:nth-of-type(even) {
    background-color: #fbfcff;
  }

  .orders-page:not(.colors-on) .orders-table tr:hover {
    background-color: #f6f7ff;
  }

  /* When colors are ON, make sure no generic hover/zebra leaks through from elsewhere */
  .orders-page.colors-on .orders-table tr:nth-of-type(even) { background-color: transparent !important; }
  .orders-page.colors-on .orders-table tr:hover { background-color: inherit !important; }

  .orders-table td {
    font-size: 15px;
    padding: 12px 14px;
  }

  /* Dashboard tiles active state */
  .summary-boxes .summary-box {
    cursor: pointer;
    transition: transform .12s ease, box-shadow .18s ease, border-color .18s ease;
    border: 1px solid rgba(2,6,23,0.06);
  }
  .summary-boxes .summary-box:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 18px rgba(2,6,23,0.08);
  }
  .summary-boxes .summary-box.active {
    outline: 2px solid #3b82f6;
    outline-offset: -2px;
    box-shadow: 0 10px 22px rgba(59,130,246,0.18);
    border-color: rgba(59,130,246,0.45);
  }

  /* Make the first (expander) column narrow and visually lighter */
  .orders-table td:first-of-type, .orders-table th:first-of-type {
    width: 48px;
    text-align: center;
    padding: 6px;
  }

  /* header expander button - subtle white */
  .orders-table th .header-expander {
    background: transparent;
    border: none !important;
    box-shadow: none !important;
    color: #fff;
    width: auto;
    height: auto;
    padding: 0;
    line-height: 1;
    display:inline-flex; align-items:center; justify-content:center;
    font-size:14px;
  }
  /* Ensure SVG icons inside the header expander are white and small */
  .orders-table th .header-expander svg {
    color: #fff !important;
    fill: #fff !important;
    stroke: #fff !important;
    width: 14px;
    height: 14px;
  }
  /* ensure internal paths also white */
  .orders-table th .header-expander svg path,
  .orders-table th .header-expander svg rect,
  .orders-table th .header-expander svg line {
    fill: #fff !important;
    stroke: #fff !important;
  }
  /* force button text/icon color */
  .orders-table th .header-expander {
    color: #fff !important;
  }
  /* legacy Orders page header expander support */
  .orders-page .header-expander {
    background: transparent;
    border: none !important;
    box-shadow: none !important;
    color: #fff !important;
    font-size: 14px;
    padding: 0;
    line-height: 1;
  }

  /* row expander - small circular, subtle border */
  .orders-table .expander-btn {
    background: transparent;
    border: none !important;
    width: auto;
    height: auto;
    padding: 0 4px;
    font-size: 14px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .orders-table .expander-btn:hover { opacity: 0.85; }

  /* Softer cell borders and slightly smaller font for a modern look */
  .orders-table th, .orders-table td {
    border-color: #eef0f6;
    font-size: 15px;
  }

  /* Checkbox styling */
  .orders-table input[type="checkbox"] {
    width: 15px;
    height: 15px;
    cursor: pointer;
    margin: 0;
    accent-color: var(--app-primary);
  }

  .orders-table th input[type="checkbox"] {
    transform: scale(1.05);
  }

  /* Action button look inside table */
  .orders-table .action-button, .orders-table button[title] {
    background: transparent;
    border: 1px solid #e6e6f0;
    padding: 6px 8px;
    border-radius: 8px;
    color: #170d79;
    cursor: pointer;
  }
  .orders-table .action-button:hover, .orders-table button[title]:hover { background:#f3f4ff; transform: translateY(-1px); }

  /* Subrow panel visual improvements */
  .subrow-column {
    background-color: #fff;
    border: 1px solid #f1f3fb;
    box-shadow: 0 1px 2px rgba(18,24,48,0.04);
    padding: 14px;
  }

  .orders-table td.centered {
    text-align: center;
  }

  .orders-table td.right-aligned {
    text-align: right;
    font-weight: bold;
  }

  .orders-table td.centered-cell {
    text-align: center;
    font-weight: bold;
  }

  .orders-table td.right-aligned-cell {
    text-align: right;
    font-weight: bold;
  }

  .orders2025 .orders-header.orders2025-header {
    padding: 0.5em 0 0 !important;
  }

  .orders2025 .filter-box {
    margin-top: 0 !important;
  }

  .orders-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0.5em 0 0.75em;
  }

  .orders-header .page-title {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin: 0;
  }

  .total-orders {
    font-size: 18px;
    color: #666;
    text-align: right;
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
    margin-top: 20px;
    position: relative;
  }

  .rows-per-page {
    position: absolute;
    right: 0;
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 14px;
    color: #170d79;
  }

  .rows-per-page label {
    font-weight: bold;
    color: #170d79;
    font-size: 18px;
  }

  .rows-per-page select {
    padding: 8px 12px;
    border: 1px solid #dfe6fb;
    border-radius: 6px;
    font-size: 14px;
    background-color: white;
    color: #170d79;
    cursor: pointer;
    transition: background-color 0.18s ease, color 0.18s ease, border-color 0.18s ease;
  }

  .rows-per-page select:hover {
    background-color: #f0f0f0;
  }

  .rows-per-page select:focus {
    outline: none;
    border-color: #2e2766;
  }

  .pagination-button {
    padding: 8px 12px;
    background-color: var(--app-primary);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 15px;
    box-shadow: 0 6px 14px rgba(16,24,64,0.08);
  }

  .pagination-button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }

  .pagination-button:hover:not(:disabled) {
    background-color: var(--app-primary-dark);
  }

  .pagination-number {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 5px;
    background-color: #fff;
    color: #202d65;
    font-size: 16px;
    cursor: pointer;
    line-height: 1;
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  }

  .pagination-number.active {
    background-color: var(--app-primary);
    color: #fff;
    border-color: var(--app-primary);
  }

  .pagination-number:hover {
    background-color: #f3f4f6;
  }

  .pagination-number.active {
    background-color: var(--app-primary);
    color: #fff;
    border-color: var(--app-primary);
  }

  .pagination-ellipsis {
    color: #666;
    padding: 0 4px;
  }

  .error-message {
    color: red;
    font-weight: bold;
    margin-top: 20px;
  }

  .subrow-group {
    margin-bottom: 10px;
  }

  .subrow-group h4 {
    margin: 0;
    font-size: 16px;
    color: #170d79;
    border-bottom: 1px solid #ddd;
    padding-bottom: 5px;
  }

  .subrow-details {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 5px;
  }

  .subrow-item {
    flex: 1 1 calc(33.333% - 20px);
    min-width: 200px;
  }

  .subrow-item.zverejneno-invalid {
    background-color: lightcoral;
  }

  .subrow-grid {
    display: flex;
    gap: 20px;
    margin-top: 10px;
  }

  .subrow-column {
    flex: 1;
    background-color: #fff;
    padding: 12px;
    border: 1px solid #f1f3fb;
    border-radius: 8px;
    box-sizing: border-box;
  }

  .subrow-column h4 {
    margin: 0 0 10px;
    font-size: 16px;
    color: #170d79;
    border-bottom: 1px solid #ddd;
    padding-bottom: 5px;
  }

  .subrow-item {
    margin-bottom: 8px;
    font-size: 14px;
    color: #222;
  }

  .subrow-box {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    padding: 15px;
    border: 1px solid #ddd;
    border-radius: 10px;
    background-color: #f9f9f9;
    margin-top: 10px;
    text-align: left; /* ensure default left alignment inside subrow area */
  }

  .subrow-item h4 {
    margin: 0 0 10px;
    font-size: 16px;
    color: #170d79;
    border-bottom: 1px solid #ddd;
    padding-bottom: 5px;
    text-align: left; /* left-align subrow section titles */
  }

  .subrow-item p {
    margin: 5px 0;
    font-size: 14px;
    color: #333;
    text-align: left; /* left-align subrow paragraph content */
  }

  /* Moderní filter box - F P R | fulltext | multiselect | multiselect */
  .filter-box {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    width: 100%;
    box-sizing: border-box;
    padding: 16px;
    background-color: #ffffff;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
  }

  /* Tlačítka F, P, R */
  .filter-buttons {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .filter-button {
    height: 48px;
    min-width: 48px;
    padding: 0 16px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    background-color: #ffffff;
    color: #1f2937;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .filter-button:hover {
    background-color: #f9fafb;
    border-color: #3b82f6;
  }

  .filter-button.active {
    background-color: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  /* Fulltext input - zabírá celou šířku */
  .filter-input-wrapper {
    position: relative;
    flex: 1;
    min-width: 250px;
  }

  input.filter-input {
    width: 100%;
    height: 56px !important;
    padding: 0 2.5rem;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.95rem;
    box-sizing: border-box;
    background: #ffffff;
    transition: all 0.2s ease;
    font-weight: 400;
    color: #1f2937;
    line-height: 56px;
  }

  input.filter-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  input.filter-input::placeholder {
    color: #9ca3af;
    font-weight: 400;
  }

  .search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    pointer-events: none;
    font-size: 16px;
    z-index: 1;
  }

  .clear-filter-button {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    font-size: 20px;
    font-weight: 600;
    color: #9ca3af;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s ease;
    line-height: 1;
    z-index: 1;
  }

  .clear-filter-button:hover {
    color: #374151;
    background: #f3f4f6;
  }

  /* Multi-select dropdown wrapper */
  .filter-group {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  .filter-select {
    height: 48px;
    padding: 0 12px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.95rem;
    line-height: 1.2;
    background-color: #ffffff;
    color: #1f2937;
    cursor: pointer;
    transition: all 0.2s ease;
    box-sizing: border-box;
  }

  .filter-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .orders-boxes {
    display: flex;
    flex-wrap: nowrap;
    gap: 12px;
    margin-bottom: 16px;
    width: 100%;
    margin-left: auto;
    margin-right: auto;
    box-sizing: border-box;
  }

  .orders-box {
    flex: 1;
    min-width: 300px;
    padding: 15px;
    border: 1px solid #ddd;
    border-radius: 10px;
    background-color: #fff;
    font-size: 16px;
    font-weight: bold;
    text-align: center;
    box-sizing: border-box;
    box-shadow: none;
  }

  .orders-box.stats-box {
    flex: 0 0 63%;
    margin-right: 1px;
  }
  .orders-box.overview-box {
    flex: 1 1 auto;
  }

  .overview-box {
    background-color: #fff;
  }

  .stats-box {
    position: relative;
    padding: 12px;
    border: none;
    border-radius: 10px;
    background-color: #fff;
    box-shadow: none;
    min-height: 210px;
  }

  .stats-box canvas,
  .stats-box table {
    border: none;
    box-shadow: none;
  }

  @media (max-width: 768px) {
    .orders-box {
      flex: 1 1 100%;
    }
  }

  .collapse-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 20px;
    color: #888;
    font-weight: normal;
    position: relative;
  }

  .dashboard-label {
    font-size: 14px;
    color: #aaa;
    font-weight: normal;
  }

  .collapse-button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 16px;
    color: #aaa;
    display: flex;
    align-items: center;
    transition: color 0.3s ease;
    position: relative;
    z-index: 2;
    pointer-events: auto;
    padding: 6px 10px; /* bigger hit area */
    border-radius: 6px;
  }

  .collapse-button.caret {
    transition: color .25s ease, transform .25s ease;
  }
  .collapse-button.caret svg {
    transition: transform .25s ease;
  }
  /* rotate chevron when expanded (we rely on DOM state replacement, so no extra class; left for potential future) */
  .collapse-button.caret[title*='Sbalit'] svg {
    transform: translateY(-1px);
  }

  .collapse-button:hover {
    color: #666;
    background: rgba(0,0,0,0.03);
  }

  .collapse-button:focus-visible {
    outline: 2px solid #94a3b8;
    outline-offset: 2px;
  }

  .divider-line {
    flex-grow: 1;
    border: none;
    border-top: 1px solid #ddd;
    margin: 0 10px;
    pointer-events: none; /* do not block the caret click */
  }

  .action-icons {
    display: flex;
    gap: 5px;
    justify-content: flex-start; /* align left as requested */
  }

  .action-button {
    background: none;
    border: none;
    cursor: pointer;
    color: #170d79;
    font-size: 16px;
    transition: color 0.3s ease;
  }

  .action-button:hover {
    color: #2e2766;
  }

  .action-button:focus {
    outline: none;
  }

  .action-icons button {
    padding: 0px;
    margin: 0 1px;
    border: none;
    background: none;
    cursor: pointer;
  }

  .action-icons button:hover {
    background-color: #f0f0f0;
    border-radius: 4px;
  }

  .action-icons svg {
    width: 16px;
    height: 16px;
    margin: 0;
    vertical-align: middle;
  }

  /* View-only mode (disabled actions) revamped */
  .orders-page.view-only .action-icons.view-only-disabled {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    opacity: 0.55;
  }
  .orders-page.view-only .action-icons.view-only-disabled .view-only-text {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: #402080;
    line-height: 1;
    pointer-events: none;
    user-select: none;
  }
  .orders-page.view-only .action-icons.view-only-disabled .icons-row {
    display: flex;
    gap: 5px;
    justify-content: center;
    pointer-events: none; /* block interactions */
  }
  .orders-page.view-only .action-icons.view-only-disabled button,
  .orders-page.view-only .action-icons.view-only-disabled button * {
    cursor: not-allowed !important;
  }

  .stats-box h3 {
    margin-bottom: 20px;
    font-size: 18px;
    color: #333;
    text-align: center;
  }

  .stats-box canvas {
    max-width: 100%;
    height: auto;
    margin: 0 auto;
  }

  .chart-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .chart-legend {
    flex: 1;
    max-width: 200px;
  }

  .chart-legend ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .chart-legend li {
    margin-bottom: 10px;
    font-size: 14px;
    color: #333;
  }

  .chart-wrapper {
    flex: 1 1 520px;
    max-width: 312px;
    max-height: 312px;
    height: 500px;
    overflow: hidden;
  }

  .chart-wrapper canvas {
    max-width: 100%;
    max-height: 100%;
    height: 500px;
  }

  .chart-legend-above {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .legend-color {
    width: 15px;
    height: 15px;
    border-radius: 3px;
    display: inline-block;
    background-color: var(--app-primary);
  }

  .legend-text {
    font-size: 18px;
    font-weight: normal;
    color: #333;
    white-space: nowrap;
  }

  .legend-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px;
    font-size: 14px;
    color: #333;
    margin-top: 20px;
    align-items: flex-start;
  }

  .stats-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
  }

  .stats-icon {
    font-size: 24px;
    color: #170d79;
  }

  .header-with-icon {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 20px;
  }

  .header-icon-large {
    font-size: 28px;
    color: #170d79;
  }

  .header-with-icon h1 {
    font-size: 20px;
    color: #333;
    margin: 0;
  }

  .summary-boxes {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    width: 100%;
    margin-top: 10px;
    gap: 12px; /* uniform gap between tiles */
    align-items: stretch;
  }
  /* Make tiles flow left-to-right with consistent sizing; adjust base tile size by screen */
  @media (min-width: 1400px) {
    .summary-boxes { gap: 14px; }
  }
  @media (max-width: 640px) {
    .summary-boxes { gap: 10px; }
  }
  .summary-box {
    padding: 14px 16px 16px;
    border: 1px solid #e3e6ef;
    border-radius: 10px;
    background: linear-gradient(180deg,#fafbff 0%, #f3f5fa 100%);
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
    text-align: left;
    position: relative;
    min-height: 86px;
    box-shadow: 0 1px 2px rgba(20,24,40,0.05), 0 0 0 1px #e6eaf2;
    transition: box-shadow .18s ease, transform .18s ease;
    flex: 1 1 160px; /* allow tiles to grow, shrink, and have a sensible base width */
    max-width: 1fr; /* let flex determine width; keep consistent flow */
    box-sizing: border-box;
  }
  .summary-box:hover {
    box-shadow: 0 4px 12px rgba(20,24,40,0.12), 0 0 0 1px #d3d9e4;
    transform: translateY(-2px);
  }
  .summary-box .summary-icon {
    font-size: 36px; /* slightly reduced for a cleaner look */
    line-height: 1;
    margin: 0;
    flex-shrink: 0;
    filter: drop-shadow(0 2px 2px rgba(0,0,0,0.08));
  }
  /* Vnitřní textový blok – dodatečný padding aby text nepůsobil namačkaně */
  .summary-box .summary-icon + div {
    padding: 2px 0 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }
  .summary-box h3 {
    margin: 0;
    font-size: 11px;
    letter-spacing: .55px;
    font-weight: 600;
    text-transform: uppercase;
    color: #4a4f5e;
    line-height: 1.15;
    white-space: nowrap;
  }
  .summary-box p {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #12141a;
    line-height: 1.1;
    letter-spacing: .25px;
  }
  /* Make the total price tile visually prominent but not overly wide */
  .summary-box.total-price {
    /* align with flex tiles: slightly larger growth so it becomes a bit more prominent */
    flex: 1.5 1 220px; /* grow more than others but still respect shrinking */
    max-width: 520px;
    min-width: 200px;
    justify-content: center; /* center icon + text horizontally for nicer look */
    gap: 14px;
  }
  /* Only allow spanning multiple columns on very wide screens where there's room */
  @media (min-width: 1400px) {
    .summary-box.total-price { grid-column: span 2; }
  }
  @media (max-width: 900px) {
    .summary-box.total-price { max-width: none; min-width: 140px; justify-content: flex-start; }
  }
  /* Prevent price overflow: allow wrapping and scale long numbers */
  .summary-box.total-price p {
    white-space: normal; /* allow wrap */
    word-break: break-word;
    overflow-wrap: anywhere;
    display: block;
    font-size: 18px; /* base */
    text-align: center;
  }
  /* If the number becomes very long, reduce font-size slightly to keep it in the tile */
  .summary-box.total-price p.long-number {
    font-size: 15px;
    line-height: 1.05;
  }
  .summary-box small { display:block; font-size:11px; color:#6b7280; margin-top:2px; }

  .floating-add-button {
    position: fixed;
    bottom: 60px;
    right: 20px;
    background-color: rgba(63, 61, 158, 0.6);
    color: white;
    border: none;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    font-size: 24px;
    z-index: 1000;
    transition: background-color 0.3s ease;
  }

  .floating-add-button:hover {
    background-color: rgba(63, 61, 158, 0.8);
  }

  .floating-add-button::after {
    position: absolute;
    bottom: 70px;
    right: 50%;
    transform: translateX(50%);
    background-color: #333;
    color: white;
    padding: 5px 10px;
    border-radius: 5px;
    font-size: 12px;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0.3s ease;
  }

  .floating-add-button:hover::after {
    opacity: 1;
    visibility: visible;
  }

  .tabs {
    display: flex;
    justify-content: flex-start;
    gap: 10px;
    margin-bottom: 20px;
  }

  .tab-button {
    padding: 7px 15px; /* ~25% méně */
    border: 1px solid #ddd;
    border-radius: 5px 5px 0 0;
    background-color: #f9f9f9;
    color: #333;
    cursor: pointer;
    font-size: 15px; /* z 20px na 15px (-25%) */
    line-height: 1.25;
    transition: background-color 0.25s ease, color 0.25s ease;
  }

  .tab-button.active {
    background-color: #202d65;
    color: white;
    border-bottom: none;
  }

  .tab-button:hover:not(.active) {
    background-color: #e0e0e0;
  }

  .tab-content {
    padding: 20px;
    border-radius: 0 5px 5px 5px;
    background-color: #fff;
  }

  .empty-tab-content {
    text-align: center;
    color: #666;
    font-size: 14px;
  }

  .legend-chart-container {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    align-items: flex-start;
  }

  @media (max-width: 768px) {
    .legend-chart-container {
      flex-direction: column;
      align-items: center;
    }

    .chart-wrapper {
      max-width: 300px;
      max-height: 300px;
    }
  }

  input,
  select,
  textarea {
    height: 40px;
    font-size: 16px;
    box-sizing: border-box;
  }

  input[type="date"],
  input[type="text"] {
    height: 40px;
    font-size: 16px;
    box-sizing: border-box;
  }

  .refresh-icon {
    margin-left: 10px;
    color: #4caf50;
    cursor: pointer;
    transition: transform 0.3s ease, color 0.3s ease;
  }

  .refresh-icon:hover {
    color: #388e3c;
    transform: rotate(360deg);
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.4);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .modal-content {
    background: #fff;
    max-width: 1100px;
    width: 95vw;
    min-width: 350px;
    max-height: 95vh;
    overflow: auto;
    position: relative;
    display: flex;
    flex-direction: column;
    box-shadow: 0 2px 24px rgba(0, 0, 0, 0.25);
  }

  .floating-add-button {
    position: fixed;
    bottom: 32px;
    right: 32px;
    background: #4f46e5;
    color: #fff;
    border: none;
    border-radius: 50%;
    width: 56px;
    height: 56px;
    font-size: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    cursor: pointer;
    transition: background 0.2s;
    z-index: 1100;
  }
  .floating-add-button:hover {
    background: #3730a3;
  }

  .modal-content button[title="Zavřít"] {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 10;
    background: transparent;
    border: none;
    font-size: 2rem;
    color: #666;
    cursor: pointer;
    transition: color 0.2s;
  }
  .modal-content button[title="Zavřít"]:hover {
    color: #222;
  }

  .progress-bar-container {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .progress-bar-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 5px;
    background-color: #e0e0e0;
    z-index: 1000;
  }

  .progress-bar {
    height: 100%;
    background-color: #4caf50;
    transition: width 0.3s ease-in-out;
  }

  .statistics-container table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 6px; /* space between rows for card effect */
  }
  .statistics-container thead th {
    background: #f4f6f9;
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: .5px;
    padding: 8px 10px;
    color: #334155;
    position: sticky;
    top: 0;
    z-index: 2;
    border-bottom: 1px solid #e2e8f0;
  }
  .statistics-container tbody tr {
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05), 0 0 0 1px #e5e7eb;
    transition: box-shadow .15s ease, transform .15s ease;
  }
  .statistics-container tbody tr:hover {
    box-shadow: 0 4px 10px rgba(0,0,0,0.08), 0 0 0 1px #cbd5e1;
  }
  .statistics-container tbody td {
    padding: 6px 10px;
    font-size: 14px;
    border-top: 1px solid #f1f5f9;
  }
  .statistics-container tbody td:first-of-type {
    /* remove left accent for cleaner look */
    border-left: none;
    border-radius: 4px 0 0 4px;
  }
  .statistics-container tbody td:last-of-type {
    border-radius: 0 4px 4px 0;
  }
  .statistics-container tbody tr + tr td:first-of-type {
    border-top: 1px solid #f1f5f9;
  }
  .statistics-container .sub-table-wrapper {
    background: #fafafa;
    margin: 2px 0 4px 0;
    padding: 6px 8px 8px 18px; /* reduced left indent */
    border-left: none; /* removed blue bar */
    border-radius: 4px;
  }
  .statistics-container .sub-table-wrapper table {
    border-spacing: 0;
    width: 100%;
  }
  .statistics-container .sub-table-wrapper td {
    background: transparent;
    box-shadow: none;
    padding: 4px 6px;
    font-size: 13px;
  }
  .statistics-container .sub-table-wrapper tr td:first-of-type {
    padding-left: calc(150px + 10px); /* align with LP column under main header (Příkazce ~150px + gap) */
  }
  .statistics-container .value-positive { color: #059669; font-weight: 600; }
  .statistics-container .value-negative { color: #dc2626; font-weight: 600; }
  .statistics-container .lp-code { font-weight: 600; color: #334155; }
  .statistics-container .lp-account { color: #64748b; font-size: 11px; }
  .statistics-container .lp-sub-first {
    padding-left: calc(150px + 30px); /* align under LP column (expander ~30 + Příkazce 150) */
    text-align: left;
  }
  .statistics-container .lp-sub-row td { background: #ffffff; font-size: 13px; }
  .statistics-container .lp-sub-row td.lp-sub-empty { background: #f5f7fa; width: 30px; }
  .statistics-container .lp-sub-row td.lp-sub-empty + td.lp-sub-empty { width:150px; }
  .statistics-container .lp-sub-row td.lp-sub-empty + td.lp-sub-empty + td.lp-sub-empty { width:100px; }
  .statistics-container .lp-sub-row td.lp-sub-lp { font-weight: 600; color: #334155; background:#ffffff; }
`;

export const OrdersPageStyles = () => <Global styles={styles} />;
