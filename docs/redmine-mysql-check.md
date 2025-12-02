# Redmine zpráva - Ověření MySQL serveru

---

## Předmět
**Ověření dostupnosti MySQL serveru 10.3.172.11**

---

## Priorita
Nízká

---

## Popis

Ahoj,

potřebuji ověřit dostupnost MySQL serveru pro projekt **ERDMS** 

### Informace o MySQL serveru:
- **IP adresa:** 10.3.172.11
- **Port:** 3306 (standardní MySQL)

### Co jsem zkusil:
```bash
# Ping test
ping -c 3 10.3.172.11
# Výsledek: 100% packet loss

# Telnet na MySQL port
telnet 10.3.172.11 3306
# Výsledek: Spojení odmítnuto (Connection refused)
```

### Co potřebuji:
1. **Ověřit, jestli MySQL server běží** na 10.3.172.11
2. **Zkontrolovat firewall** - jestli povoluje spojení z našeho web serveru
3. **Zjistit přístupové údaje** pro připojení (user, password, database)

### Informace o web serveru:
- **Hostname:** akd-www-web01
- **IP:** (potřebuji povolit v MySQL/firewallu)
- **Projekt:** ERDMS - https://erdms.zachranka.cz

---

## Očekávaná akce
Prosím o ověření a zpětnou vazbu:
- Je MySQL server aktivní? ANO je phpmyadmin mi funguje
- Potřebujeme upravit firewall pravidla?


---

**Díky!**

---

_Vytvořeno: 2. prosince 2025_
_Autor: ERDMS Development Team_
