# Extended Order Form Sections - Implementation Summary

## Overview
Successfully implemented conditional extended sections for post-approval order management in `OrderForm25.js`. These sections are only visible after the order has been **approved AND saved to database** (`formData.stav_schvaleni === 'schvaleno' && isOrderSaved && savedOrderId`) with proper permission-based locking for original sections.

## Features Implemented

### 1. Conditional Visibility
- **Trigger**: Extended sections appear when `formData.stav_schvaleni === 'schvaleno' && isOrderSaved && savedOrderId`
- **Rationale**: Prevents editing until order is both approved AND persisted to database
- **Structure**: Wrapped in conditional JSX with all three conditions
- **Container**: All extended sections are wrapped in React Fragment `<>...</>`

### 2. Permission-Based Section Locking
#### Original Sections (Objednatel + Schválení PO):
- **Permission Check**: Uses `canEditApprovedSections = canApproveOrders || canManageOrders`
- **Permissions**: `ORDER_APPROVE` OR `ORDER_MANAGE`
- **Field Locking**: After approval, users without proper permissions:
  - Fields are `disabled={formData.stav_schvaleni === 'schvaleno' && !canEditApprovedSections}`
  - Visual lock warning (🔒) appears in section headers
  - Affects: garant selection, předmět, příkazce, max. cena, střediska

#### Extended Sections (New Post-Approval):
- **No Permission Restrictions**: Any user can edit once sections are visible
- **Rationale**: These are operational details that regular users should manage
- **Fields**: All new sections are fully editable for any authenticated user

### 3. Extended Form Data Fields
Added the following new fields to `formData` structure:

```javascript
// === DALŠÍ ČÁST - VIDITELNÁ JEN PO SCHVÁLENÍ ===

// Financování objednávky
zpusob_financovani: '',

// Informace o dodavateli
dodavatel_nazev: '',
dodavatel_sidlo: '',
dodavatel_ico: '',
dodavatel_dic: '',
dodavatel_zastoupeni: '',

// Kontaktní osoba dodavatele
kontakt_jmeno: '',
kontakt_email: '',
kontakt_telefon: '',

// Detaily objednávky
druh_objednavky: '',
obsah_objednavky: '',
cena_bez_dph: '',
dph_sazba: '21',
cena_s_dph_vypocitana: '', // Vypočítané pole
poznamka_objednavky: '',

// Dodací a záruční podmínky
termin_dodani: '',
misto_dodani: '',
zaruka: '',

// Stav odeslání objednávky
stav_odeslani: '', // 'odeslano' nebo 'stornováno'
datum_odeslani: '',

// Příložené dokumenty
prilohy_dokumenty: [],
```

### 4. New Form Sections

#### A. Financování objednávky
- **Icon**: CreditCard
- **Fields**: způsob financování (text input)

#### B. Informace o dodavateli
- **Icon**: Building2  
- **Fields**: 
  - Název dodavatele (required, text)
  - Sídlo (text)
  - IČO (text)
  - DIČ (text) 
  - Zastoupení (text, full width)

#### C. Kontaktní osoba dodavatele
- **Icon**: User
- **Fields**:
  - Jméno a příjmení (text)
  - E-mail (email input)
  - Telefon (tel input)

#### D. Detaily objednávky  
- **Icon**: Package
- **Fields**:
  - Druh objednávky (text)
  - Obsah objednávky (textarea, 4 rows)
  - Cena bez DPH (currency formatted)
  - DPH sazba (select: 0%, 12%, 21%)
  - Cena s DPH (auto-calculated, disabled)
  - Poznámka k objednávce (textarea, 3 rows)

#### E. Dodací a záruční podmínky
- **Icon**: Calendar
- **Fields**:
  - Termín dodání (date input)
  - Místo dodání (text)
  - Záruka (text, full width)

#### F. Stav odeslání objednávky
- **Icon**: Package
- **Fields**:
  - Stav odeslání (select: prázdné/odesláno/stornováno)
  - Datum odeslání (date input)

### 5. New Components Added

#### TextArea Styled Component
```javascript
const TextArea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem;
  border: 2px solid ${props => props.hasError ? '#dc2626' : '#e5e7eb'};
  border-radius: 8px;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  background: ${props => props.hasError ? '#fef2f2' : '#ffffff'};
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  // ... focus and disabled states
`;
```

#### LockWarning Component
```javascript
const LockWarning = styled.span`
  margin-left: 0.5rem;
  color: #dc2626;
  font-size: 1rem;
  cursor: help;
`;
```

### 6. Section State Management
Updated section states to include new sections:
```javascript
const [sectionStates, setSectionStates] = useState({
  objednatel: false,
  schvaleni: false,
  
  // Rozšířené sekce - viditelné jen po schválení
  financovani: false,
  dodavatel: false,
  kontakt: false,
  detaily: false,
  dodaci_podminky: false,
  stav_odeslani: false,
});
```

### 7. Smart Features

#### Auto-calculated DPH
```javascript
value={(() => {
  const cenaBezDph = parseFloat(formData.cena_bez_dph?.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
  const dphSazba = parseFloat(formData.dph_sazba) || 0;
  const cenaSdph = cenaBezDph * (1 + dphSazba / 100);
  return formatCurrency(cenaSdph.toString());
})()}
```

#### Currency Formatting
- Reuses existing `formatCurrency` and `handleCurrencyChange` functions
- Right-aligned text for currency fields
- Proper placeholder formatting (e.g., "314 049,59 Kč")

### 8. Icons Used
All icons are from lucide-react (already imported):
- `CreditCard` - Financování
- `Building2` - Dodavatel info
- `User` - Kontaktní osoba 
- `Package` - Detaily a stav odeslání
- `Calendar` - Dodací podmínky
- `Mail`, `Phone` - Kontakt
- `Euro`, `Banknote`, `Coins` - Ceny
- `MapPin` - Místo dodání
- `FileText` - Záruka a poznámky
- `Hash` - IČO/DIČ

## User Experience

### For Regular Users (No Special Permissions)
- **Before Approval**: Can create and edit all basic order information
- **After Approval**: 
  - Original sections (Objednatel + Schválení PO) become read-only with lock icons
  - Extended sections appear and are fully editable
  - Can manage all post-approval workflow steps

### For Privileged Users (ORDER_APPROVE or ORDER_MANAGE)
- **Before Approval**: Same as regular users plus approval capabilities
- **After Approval**: 
  - Can edit ALL sections including locked original ones
  - No lock indicators appear for them
  - Full administrative control over entire order lifecycle

## Technical Notes

### File Structure
- All changes contained within `OrderForm25.js`
- No breaking changes to existing functionality
- Maintains backward compatibility
- Uses existing styled components where possible

### Performance
- Conditional rendering prevents unnecessary DOM elements
- Sections only mounted when needed (after approval)
- Reuses existing form handling logic

### Validation
- Permission-aware validation (locked fields skip validation)
- Maintains existing validation patterns
- Required fields properly marked in dodavatel section

## Next Steps
1. **Backend Integration**: Ensure API endpoints support new fields
2. **Database Schema**: Add new columns to orders table
3. **Testing**: Test permission-based functionality
4. **Documentation**: Update API documentation with new fields
5. **File Attachments**: Implement `prilohy_dokumenty` upload functionality

## Code Quality
- ✅ No syntax errors
- ✅ Proper JSX structure  
- ✅ Consistent styling patterns
- ✅ Accessibility considerations (tooltips, labels)
- ✅ Responsive design maintained
- ✅ Icon consistency