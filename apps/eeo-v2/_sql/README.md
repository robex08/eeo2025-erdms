# SQL Migrace a Skripty

SQL migrace a databázové skripty pro EEO-v2.

## Obsah
- `SQL_MIGRATION_*.sql` - Migrační skripty
- `SQL_ADD_*.sql` - Přidání nových funkcionalit
- `SQL_*_INDEXES.sql` - Index optimalizace
- `VERIFY_DB_MIGRATIONS.sql` - Verifikační skripty

## Použití
```bash
mysql -h <host> -u <user> -p <database> < SQL_MIGRATION_*.sql
```

⚠️ **Pozor:** Vždy nejdřív testovat na DEV databázi!
