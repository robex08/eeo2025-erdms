# Invoice Attachment Classification System

## Overview
Implemented a proper classification system for invoice attachments in `InvoiceEvidencePage.js` to match the workflow used in `OrderForm25.js`. This ensures that all invoice attachments are properly categorized before upload and have the standardized "fa-" prefix.

## Changes Made

### 1. Frontend - InvoiceEvidencePage.js

#### New Imports
```javascript
import { getStrediska25, getTypyFaktur25 } from '../services/api25orders';
```

#### New State Variables
```javascript
// Typy faktur (klasifikace příloh)
const [typyFakturOptions, setTypyFakturOptions] = useState([]);
const [typyFakturLoading, setTypyFakturLoading] = useState(false);
```

#### FormData Addition
```javascript
file: null,
klasifikace: '', // Klasifikace přílohy (FAKTURA_TYP)
```

#### Data Loading
Added `loadTypyFaktur()` function in the main `useEffect` to load FAKTURA_TYP classification options from the database:
```javascript
const loadTypyFaktur = async () => {
  if (!token || !username) return;
  
  setTypyFakturLoading(true);
  try {
    const data = await getTypyFaktur25({ token, username, aktivni: 1 });
    if (data && Array.isArray(data)) {
      setTypyFakturOptions(data);
      console.log('✅ Typy faktur načteny:', data.length);
    }
  } catch (err) {
    console.error('Chyba při načítání typů faktur:', err);
  } finally {
    setTypyFakturLoading(false);
  }
};
```

#### File Upload Handlers
Modified `handleFileChange` and `handleDrop` to automatically add "fa-" prefix to uploaded files:
```javascript
const handleFileChange = (e) => {
  const selectedFile = e.target.files[0];
  if (selectedFile) {
    // Přidání fa- prefixu k názvu souboru
    const newFileName = selectedFile.name.startsWith('fa-') 
      ? selectedFile.name 
      : `fa-${selectedFile.name}`;
    
    // Vytvoření nového File objektu s upraveným názvem
    const renamedFile = new File([selectedFile], newFileName, {
      type: selectedFile.type,
      lastModified: selectedFile.lastModified
    });
    
    setFormData(prev => ({ ...prev, file: renamedFile }));
  }
};
```

#### New UI Components
Added classification dropdown before file upload:
```javascript
{/* Klasifikace přílohy */}
<FieldRow>
  <FieldGroup>
    <FieldLabel>
      Typ přílohy faktury
      <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
    </FieldLabel>
    <CustomSelect
      name="klasifikace"
      value={formData.klasifikace}
      onChange={(e) => {
        setFormData(prev => ({ 
          ...prev, 
          klasifikace: e.target.value 
        }));
      }}
      options={typyFakturOptions}
      placeholder={typyFakturLoading ? "Načítám typy faktur..." : "Vyberte typ přílohy..."}
      disabled={typyFakturLoading}
      required
      ...
    />
    {touchedSelectFields.has('klasifikace') && !formData.klasifikace && (
      <ErrorMessage>Vyberte typ přílohy</ErrorMessage>
    )}
  </FieldGroup>
</FieldRow>
```

Modified file upload section:
- File upload is disabled until classification is selected
- Added helper text explaining the requirement
- Updated label to show asterisk when classification is selected

```javascript
<FieldLabel>
  Soubor přílohy faktury
  {formData.klasifikace && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
</FieldLabel>
<FileInputWrapper
  style={{
    opacity: !formData.klasifikace ? 0.5 : 1,
    pointerEvents: !formData.klasifikace ? 'none' : 'auto'
  }}
>
  <input
    id="file-upload"
    type="file"
    disabled={!formData.klasifikace}
    ...
  />
</FileInputWrapper>
{!formData.klasifikace && (
  <div style={{ fontSize: '0.875rem', color: '#94a3af', marginTop: '8px' }}>
    ℹ️ Nejprve vyberte typ přílohy, pak můžete nahrát soubor
  </div>
)}
```

#### New Styled Component
```javascript
const ErrorMessage = styled.div`
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.5rem;
`;
```

#### API Call Update
Updated `createInvoiceWithAttachmentV2` call to include klasifikace:
```javascript
result = await createInvoiceWithAttachmentV2({
  ...apiParams,
  file: formData.file,
  klasifikace: formData.klasifikace || null // Typ přílohy
});
```

### 2. Backend API - api25invoices.js

#### Function Signature Update
Added `klasifikace` parameter to `createInvoiceWithAttachmentV2`:
```javascript
export async function createInvoiceWithAttachmentV2({
  token,
  username,
  order_id,
  smlouva_id = null,
  file,
  klasifikace = null, // Klasifikace přílohy (FAKTURA_TYP)
  fa_cislo_vema,
  ...
})
```

#### FormData Addition
Added klasifikace to the FormData sent to backend:
```javascript
// Klasifikace přílohy (typ přílohy)
if (klasifikace) {
  formData.append('klasifikace', String(klasifikace));
}
```

## Workflow

1. **User opens invoice creation form**
   - System loads FAKTURA_TYP classification options from database
   - Classification dropdown is ready with options

2. **User selects classification type**
   - Dropdown shows available FAKTURA_TYP options
   - Selection enables the file upload section
   - If no selection, file upload is disabled with helper text

3. **User uploads file**
   - System automatically adds "fa-" prefix to filename
   - File is validated and stored in formData
   - Selected filename is displayed with checkmark

4. **User submits form**
   - Classification and file are sent to backend
   - Backend receives `klasifikace` parameter
   - Attachment is created with proper classification

## Database Schema

The classification types are stored in the `stavy25` table:
- `typ_objektu`: 'FAKTURA_TYP'
- `kod_stavu`: Classification code (e.g., 'FAKTURA_PRIJATA', 'PROFORMA')
- `nazev_stavu`: Display name
- `aktivni`: 1 for active types, 0 for inactive

## Benefits

1. **Consistency**: Invoice attachments now use the same classification system as order attachments
2. **Data Quality**: All attachments are properly categorized before upload
3. **File Naming**: Automatic "fa-" prefix ensures standardized naming convention
4. **User Experience**: Clear workflow with validation and helper text
5. **Database Integration**: Leverages existing FAKTURA_TYP classifications

## Files Modified

1. `/var/www/erdms-dev/apps/eeo-v2/client/src/pages/InvoiceEvidencePage.js`
   - Added classification dropdown
   - Modified file upload handlers
   - Added validation and UI feedback

2. `/var/www/erdms-dev/apps/eeo-v2/client/src/services/api25invoices.js`
   - Updated `createInvoiceWithAttachmentV2` function signature
   - Added klasifikace to FormData

## Testing Checklist

- [ ] Classification dropdown loads FAKTURA_TYP options
- [ ] File upload is disabled until classification is selected
- [ ] File upload works after classification selection
- [ ] "fa-" prefix is added to uploaded filenames
- [ ] Classification is sent to backend API
- [ ] Validation shows error if classification is missing
- [ ] Drag and drop works with classification requirement
- [ ] Helper text displays correctly
- [ ] Form submission succeeds with classified attachment

## Related Files

- `/var/www/erdms-dev/apps/eeo-v2/client/src/forms/OrderForm25.js` - Reference implementation
- `/var/www/erdms-dev/apps/eeo-v2/client/src/services/api25orders.js` - getTypyFaktur25 function
- `/var/www/erdms-dev/docs/development/SPISOVKA-FAKTURY-ANALYSIS.md` - Database analysis

## Date: 2025-01-26
