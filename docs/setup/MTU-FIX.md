# MTU Fix - Síťový problém s databází

## Problém
SELECT * FROM erdms_users se zasekával a nikdy nevracel data kvůli problému se síťovou komunikací mezi aplikačním serverem (10.3.174.11) a databázovým serverem (10.3.172.11).

## Příčina
**MTU (Maximum Transmission Unit) bylo nastaveno na 9000 bajtů (jumbo frames)**, ale síť mezi servery nepodporuje jumbo frames. Větší TCP pakety se fragmentovaly nebo zahazovaly.

### Symptomy:
- ✅ Malé dotazy (SELECT s WHERE) fungovaly
- ❌ Velké dotazy (SELECT * bez LIMIT) timeout
- ❌ PING nefungoval (100% packet loss)
- ✅ TCP port 3306 dostupný

## Řešení
Snížení MTU z 9000 na standardních **1500 bajtů**.

### Dočasná změna (do restartu):
```bash
ip link set ens18 mtu 1500
```

### Permanentní změna:
Přidáno do `/etc/network/interfaces`:
```
iface ens18 inet static
        address 10.3.174.11/24
        gateway 10.3.174.1
        mtu 1500  # <-- PŘIDÁNO
        dns-nameservers 10.3.100.11 10.3.100.12
        dns-search zzssk.zachranka.cz
```

### Restart sítě:
```bash
systemctl restart networking
# nebo
ifdown ens18 && ifup ens18
```

## Výsledky po opravě
- ✅ SELECT * FROM erdms_users: **5ms** (dříve timeout)
- ✅ Všechna data načtena úspěšně
- ✅ Stabilní spojení s databází

## Test
```bash
cd /var/www/eeo2025/server
node test-final-select.js
```

Datum opravy: 2. prosince 2025
