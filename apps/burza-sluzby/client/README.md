# Burza služeb client (React + Vite)

## Lokální vývoj

```bash
cp .env.example .env
npm install
npm run dev
```

V DEV režimu je k dispozici i lokální admin fallback přes username a heslo, pokud je v `.env` zapnutý `VITE_BURZA_LOCAL_LOGIN_ENABLED=1`.

## Build a base path

Frontend používá `VITE_APP_BASE_PATH` jako produkční `base` pro Vite build.

- DEV nasazení:
	- `VITE_APP_BASE_PATH=/dev/burza-sluzby/`
	- `VITE_BURZA_API_BASE=/dev/api.burza-sluzby`
- PROD nasazení:
	- `VITE_APP_BASE_PATH=/burza-sluzby/`
	- `VITE_BURZA_API_BASE=/api.burza-sluzby`

Příklad:

```bash
VITE_APP_BASE_PATH=/dev/burza-sluzby/ VITE_BURZA_API_BASE=/dev/api.burza-sluzby npm run build
```

## Důležité

- Router používá `import.meta.env.BASE_URL` jako `basename`, takže refresh (`F5`) zachovává podcestu aplikace.
- Login/logout redirect používá stejný `BASE_URL`, takže funguje korektně v DEV i PROD bez hardcodu `/dev/`.
