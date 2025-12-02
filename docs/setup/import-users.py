#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dávkový import uživatelů ze starého systému do erdms_users
Zachování původních ID (NUTNÉ)
"""

import subprocess
import sys

# Databázové přihlašovací údaje
DB_HOST = "10.3.172.11"
DB_USER = "erdms_user"
DB_PASS = "AhchohTahnoh7eim"
DB_NAME = "erdms"

# Data uživatelů (id, username, titul_pred, jmeno, prijmeni, titul_za, email, telefon, pozice_id, lokalita_id, organizace_id, usek_id, aktivni, dt_vytvoreni, dt_aktualizace, dt_posledni_aktivita)
# Mapování: entra_id=NULL, upn=NULL, auth_source='database', role='user'|'admin', opravneni=NULL, password_hash=NULL, entra_sync_at=NULL

users_data = [
    (0, 'system', '', 'system', 'global', '', None, None, None, None, 1, 4, 0, '2025-10-04 11:27:30', '2025-10-04 11:27:30', None, 'user'),
    (1, 'admin', 'IT', 'RH', 'ADMIN', None, 'robert.holovsky@zachranka.cz', '731137100', 68, 1, 1, 4, 1, '2025-09-27 12:15:06', '2025-11-20 21:39:54', '2025-12-01 23:41:29', 'admin'),
    (2, 'nologin_lp', None, 'Leoš', 'Procházka', None, '', '', None, 40, 1, 1, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2016-07-26 15:37:21', 'user'),
    (3, 'nologin_novakova', None, 'Michaela', 'Nováková', None, 'michaela.novakova@zachranka.cz', '', None, 40, 1, 1, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2025-10-10 13:16:35', 'user'),
    (4, 'nologin_pellichova', None, 'Jitka', 'Pellichová', None, 'jitka.pellichova@zachranka.cz', '', None, 40, 1, 6, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2024-12-03 07:41:07', 'user'),
    (5, 'nologin_163', None, 'Robert', 'Holovský', None, 'r.holovsky@zachranka.cz', '777007763', None, 40, 1, 1, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2024-09-09 15:23:27', 'user'),
    (6, 'nologin_frolikova', None, 'Zuzana', 'Frolíková', None, 'zuzana.frolikova@zachranka.cz', '', None, 40, 1, 1, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', None, 'user'),
    (7, 'nologin_chochola', None, 'Roman', 'Chochola', None, 'roman.chochola@zachranka.cz', '', None, 40, 1, 1, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2023-03-31 12:44:57', 'user'),
    (8, 'nologin_2399', None, 'Patrik', 'Merhaut', None, '', '', None, 40, 1, 8, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2009-06-24 15:52:11', 'user'),
    (10, 'nologin_1985', None, 'Věra', 'Zemanová', None, '', '', None, 40, 1, 1, 0, '2025-10-18 21:09:41', '2025-10-18 21:09:41', '2009-06-24 15:52:11', 'user'),
]

def format_value(v):
    """Formátuje hodnotu pro SQL"""
    if v is None:
        return 'NULL'
    elif isinstance(v, str):
        # Escapuje apostrofy
        return f"'{v.replace(chr(39), chr(39)+chr(39))}'"
    else:
        return str(v)

def import_batch(batch, batch_num):
    """Importuje jednu dávku uživatelů"""
    values = []
    for row in batch:
        user_id, username, titul_pred, jmeno, prijmeni, titul_za, email, telefon, pozice_id, lokalita_id, organizace_id, usek_id, aktivni, dt_vytvoreni, dt_aktualizace, dt_posledni_aktivita, role = row
        
        value_str = f"({user_id}, {format_value(username)}, {format_value(titul_pred)}, {format_value(jmeno)}, {format_value(prijmeni)}, {format_value(titul_za)}, {format_value(email)}, {format_value(telefon)}, {format_value(pozice_id)}, {format_value(lokalita_id)}, {format_value(organizace_id)}, {format_value(usek_id)}, {aktivni}, {format_value(dt_vytvoreni)}, {format_value(dt_aktualizace)}, {format_value(dt_posledni_aktivita)}, NULL, NULL, 'database', {format_value(role)}, NULL, NULL, NULL)"
        values.append(value_str)
    
    sql = f"SET FOREIGN_KEY_CHECKS = 0; SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO'; INSERT INTO erdms_users (id, username, titul_pred, jmeno, prijmeni, titul_za, email, telefon, pozice_id, lokalita_id, organizace_id, usek_id, aktivni, dt_vytvoreni, dt_aktualizace, dt_posledni_aktivita, entra_id, upn, auth_source, role, opravneni, password_hash, entra_sync_at) VALUES {', '.join(values)}; SELECT LAST_INSERT_ID();"
    
    cmd = [
        'mysql',
        '-h', DB_HOST,
        '-u', DB_USER,
        f'-p{DB_PASS}',
        '--skip-ssl',
        DB_NAME,
        '-e', sql
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            print(f"✓ Dávka {batch_num}: Importováno {len(batch)} uživatelů")
            return True
        else:
            print(f"✗ Dávka {batch_num}: CHYBA - {result.stderr}")
            return False
    except Exception as e:
        print(f"✗ Dávka {batch_num}: VÝJIMKA - {str(e)}")
        return False

def main():
    print(f"Import uživatelů do erdms_users (celkem {len(users_data)} záznamů)")
    print("="*60)
    
    batch_size = 5  # Po 5 záznamech
    total = len(users_data)
    success = 0
    
    for i in range(0, total, batch_size):
        batch = users_data[i:i+batch_size]
        batch_num = (i // batch_size) + 1
        
        if import_batch(batch, batch_num):
            success += len(batch)
        else:
            print(f"\nPřerušeno po chybě v dávce {batch_num}")
            sys.exit(1)
    
    print("="*60)
    print(f"✓ Import dokončen: {success}/{total} záznamů")

if __name__ == '__main__':
    main()
