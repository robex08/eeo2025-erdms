# Outlook CSV export - pravidla

Tento dokument shrnuje, co je nutne dodrzet, aby import kontaktu fungoval v Outlooku na Windows.

## 1) Kodovani CSV

- Pro export pouzivat Windows-1250 (CP1250) bajty.
- Nepouzivat UTF-8 BOM pro tento export (v Outlooku na Windows casto zpusobi rozpad diakritiky pri importu).
- Rozbita diakritika (typicky rozsypane znaky) obvykle znamena, ze se misi UTF-8 obsah a ANSI/CP1250 cteni.

## 2) Hlavicka sloupcu

- Drzet presne strukturu sloupcu podle sablony souboru `podklad/outlook-struktara365.csv`.
- Nemenit poradi sloupcu.
- Nemenit nazvy sloupcu.
- Nemenit CSV quoting (vsechny hodnoty v uvozovkach, vnitrni uvozovky escapovat jako "").

## 3) Filtry exportu (aktualni zadani)

Exportovat jen uzivatele, kteri splnuji vse:

- accountEnabled je true
- email konci na @zachranka.cz
- oddeleni je vyplnene (neni prazdne)

## 4) Mapovani hodnot (aktualni zadani)

- Spolecnost: `ZZS SK, p.o.`
- Typ e-mailu: `SMTP`
- Zobrazovane jmeno e-mailu: `Jmeno Prijmeni | ZZSSK (email)`
- Citlivost: `Normalni`
- Priorita: `Stredni`
- Soukrome: `False`
- Inicialy: format `J.P.` (z firstName + lastName)

## 5) Typicke chyby

- Hlavicka vypada rozbite, ale data ne: obvykle spatne kodovani exportu.
- Outlook import selze nebo rozhazi pole: odlisne poradi sloupcu proti sablone.
- Jiny format `Zobrazovane jmeno e-mailu`: Outlook pak zobrazuje kontakt jinak, nez bylo pozadovano.

## 6) Kontrolni checklist pred nasazenim

- Vygenerovat CSV a otevrit v editoru, ktery umi CP1250.
- Otestovat import primo do Outlooku na Windows.
- Overit alespon jeden kontakt s diakritikou v oddeleni/funkci.
- Overit format `Zobrazovane jmeno e-mailu` na realnem prikladu.
