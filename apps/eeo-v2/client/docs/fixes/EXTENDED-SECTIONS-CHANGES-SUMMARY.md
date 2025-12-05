# Změny v Extended Form Sections

## Provedené úpravy dle požadavků uživatele:

### 1. ✅ Změna zobrazení rozšířených sekcí
**PŘED**: Zobrazily se po schválení (`formData.stav_schvaleni === 'schvaleno'`)  
**PO**: Zobrazí se až po schválení A uložení do DB (`formData.stav_schvaleni === 'schvaleno' && isOrderSaved && savedOrderId`)

### 2. ✅ Změna logiky uzamčení
**PŘED**: Všechny rozšířené sekce byly uzamčené pro uživatele bez ORDER_APPROVE  
**PO**: 
- **Uzamčené pro běžné uživatele**: Pouze původní sekce (Informace o objednateli + Schválení nákupu PO)
- **Volně editovatelné**: Všechny nové rozšířené sekce může editovat kdokoliv

### 3. ✅ Nová oprávnění
- Přidáno `ORDER_MANAGE` oprávnění jako alternativa k `ORDER_APPROVE`
- Logika: `canEditApprovedSections = canApproveOrders || canManageOrders`

### 4. ✅ Upravená pole pro uzamčení
**Uzamčené po schválení (pro běžné uživatele):**
- Garant (výběr uživatele)
- Předmět objednávky
- Příkazce operace
- Maximální cena s DPH
- Středisko

**Vždy editovatelné po schválení:**
- Způsob financování
- Informace o dodavateli
- Kontaktní osoba dodavatele
- Detaily objednávky (včetně ceny a DPH)
- Dodací a záruční podmínky
- Stav odeslání objednávky

## Výsledná logika workflow:

```
1. TVORBA → běžný uživatel může vyplnit základní informace
2. SCHVÁLENÍ → pouze uživatelé s ORDER_APPROVE mohou schválit
3. ULOŽENÍ → automatické uložení do databáze po schválení  
4. ROZŠÍŘENÉ SEKCE → objeví se až po kroku 3, editovatelné pro všechny
5. UZAMČENÍ ZÁKLADU → původní informace uzamčené pro běžné uživatele
```

## Bezpečnostní model:
- **Běžný uživatel**: Může spravovat operační část objednávky po schválení
- **ORDER_APPROVE/ORDER_MANAGE**: Může měnit i základní schválené informace
- **Validace**: Zachována pro všechny editovatelné pole
- **UI indikátory**: Zámek (🔒) pouze u uzamčených sekcí