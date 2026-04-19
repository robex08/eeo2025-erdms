# Copilot Instructions

These are project rules for GitHub Copilot for the ZZS map app.

## Project Context
- React + Vite app lives in wp-mapa/preview.
- Main UI and map logic is in src/App.jsx.
- Station data is in src/data/stations.js.
- District boundaries are loaded from public/data/okresy-stc.geojson.
- Leaflet provides the map; lucide-react provides icons.

## General
- Prefer small, focused changes.
- Keep code readable and consistent with the existing style.
- Do not remove unrelated code or files.
- Avoid large refactors unless explicitly requested.
- If unsure about intent or data, ask for clarification.

## React/Leaflet
- Use functional components and hooks.
- Keep map setup and Leaflet side effects in useEffect.
- Avoid re-creating Leaflet layers unless needed; reuse refs.
- When changing map behavior, verify both desktop and mobile zoom behavior.

## Data And Paths
- Preserve station objects structure: id, city, address, crews, coords, type.
- Keep district name normalization consistent with existing helpers.
- When referencing the GeoJSON file, keep the relative base path logic intact.

## Styling
- Follow Tailwind usage in JSX and custom CSS in src/styles/app.css.
- Reuse existing class names and patterns before adding new ones.
- Avoid new font families unless explicitly requested.

## Build And Deploy
- Vite base path is important for WordPress/FTP deploy; do not change without intent.
- If build output or asset paths change, update docs in POSTUP-WORDPRESS.md.

## Testing And Docs
- Add or update tests when behavior changes, if tests exist.
- Update docs or comments when behavior or usage changes.
