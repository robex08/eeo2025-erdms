# 🔧 FAKTURACE - Technická specifikace implementace

> **Datum:** 26. října 2025  
> **Účel:** Detailní technická specifikace pro implementaci fakturace  
> **Related:** `WORKFLOW-FAKTURACE-NAVRH.md`

---

## 📦 STRUKTURA PROJEKTU

### Nové/upravené soubory:

```
src/
├── components/
│   ├── FakturaForm.js           [NOVÝ] - Formulář pro fakturu
│   ├── FakturaCard.js           [NOVÝ] - Karta s fakturou
│   └── FakturyList.js           [NOVÝ] - Seznam faktur
├── forms/
│   └── OrderForm25.js           [UPRAVIT] - Integrace sekce fakturace
├── services/
│   └── api25orders.js           [UPRAVIT] - API funkce pro faktury
├── utils/
│   └── fakturaValidation.js    [NOVÝ] - Validace faktur
└── constants/
    └── workflow25.js            [UPRAVIT] - Případné doplnění workflow
```

---

## 1️⃣ BACKEND API SPECIFIKACE

### Endpoint 1: Seznam faktur k objednávce

```php
// Endpoint: POST /api.eeo/faktury/list
// Soubor: api.eeo/endpoints/faktury.php

function getFakturyList($conn, $data) {
    $objednavka_id = $data['objednavka_id'];
    
    $sql = "SELECT 
                f.*,
                u.jmeno as vytvoril_jmeno,
                u.prijmeni as vytvoril_prijmeni
            FROM 25a_objednavky_faktury f
            LEFT JOIN 25_uzivatel u ON f.vytvoril_uzivatel_id = u.id
            WHERE f.objednavka_id = ?
              AND f.aktivni = 1
            ORDER BY f.dt_vytvoreni DESC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('i', $objednavka_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $faktury = [];
    while ($row = $result->fetch_assoc()) {
        $faktury[] = [
            'id' => (int)$row['id'],
            'objednavka_id' => (int)$row['objednavka_id'],
            'fa_dorucena' => (int)$row['fa_dorucena'],
            'fa_castka' => (float)$row['fa_castka'],
            'fa_cislo_vema' => $row['fa_cislo_vema'],
            'fa_stredisko' => $row['fa_stredisko'],
            'fa_poznamka' => $row['fa_poznamka'],
            'rozsirujici_data' => $row['rozsirujici_data'],
            'vytvoril_uzivatel_id' => (int)$row['vytvoril_uzivatel_id'],
            'vytvoril_jmeno' => $row['vytvoril_jmeno'] . ' ' . $row['vytvoril_prijmeni'],
            'dt_vytvoreni' => $row['dt_vytvoreni'],
            'dt_aktualizace' => $row['dt_aktualizace'],
            'aktivni' => (int)$row['aktivni']
        ];
    }
    
    return [
        'status' => 'ok',
        'data' => $faktury
    ];
}
```

### Endpoint 2: Přidat fakturu

```php
// Endpoint: POST /api.eeo/faktury/create

function createFaktura($conn, $data, $user_id) {
    // Validace povinných polí
    if (empty($data['objednavka_id'])) {
        return ['status' => 'error', 'message' => 'objednavka_id je povinné'];
    }
    if (empty($data['fa_castka']) || $data['fa_castka'] <= 0) {
        return ['status' => 'error', 'message' => 'fa_castka musí být větší než 0'];
    }
    if (empty($data['fa_cislo_vema'])) {
        return ['status' => 'error', 'message' => 'fa_cislo_vema je povinné'];
    }
    
    // Kontrola existence objednávky
    $check_sql = "SELECT id FROM 25a_objednavky WHERE id = ? AND aktivni = 1";
    $check_stmt = $conn->prepare($check_sql);
    $check_stmt->bind_param('i', $data['objednavka_id']);
    $check_stmt->execute();
    if ($check_stmt->get_result()->num_rows === 0) {
        return ['status' => 'error', 'message' => 'Objednávka neexistuje'];
    }
    
    // INSERT
    $sql = "INSERT INTO 25a_objednavky_faktury (
                objednavka_id,
                fa_dorucena,
                fa_castka,
                fa_cislo_vema,
                fa_stredisko,
                fa_poznamka,
                rozsirujici_data,
                vytvoril_uzivatel_id,
                dt_vytvoreni,
                aktivni
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)";
    
    $stmt = $conn->prepare($sql);
    $fa_dorucena = isset($data['fa_dorucena']) ? (int)$data['fa_dorucena'] : 0;
    $fa_stredisko = $data['fa_stredisko'] ?? null;
    $fa_poznamka = $data['fa_poznamka'] ?? null;
    $rozsirujici_data = $data['rozsirujici_data'] ?? null;
    
    $stmt->bind_param(
        'iidssssi',
        $data['objednavka_id'],
        $fa_dorucena,
        $data['fa_castka'],
        $data['fa_cislo_vema'],
        $fa_stredisko,
        $fa_poznamka,
        $rozsirujici_data,
        $user_id
    );
    
    if ($stmt->execute()) {
        $faktura_id = $stmt->insert_id;
        
        // Načti vytvořenou fakturu
        $faktura = getFakturaById($conn, $faktura_id);
        
        return [
            'status' => 'ok',
            'message' => 'Faktura byla úspěšně přidána',
            'data' => $faktura
        ];
    } else {
        return ['status' => 'error', 'message' => 'Chyba při ukládání faktury'];
    }
}
```

### Endpoint 3: Upravit fakturu

```php
// Endpoint: POST /api.eeo/faktury/update

function updateFaktura($conn, $data, $user_id) {
    // Validace
    if (empty($data['id'])) {
        return ['status' => 'error', 'message' => 'id je povinné'];
    }
    
    // Kontrola existence faktury
    $check_sql = "SELECT id FROM 25a_objednavky_faktury WHERE id = ? AND aktivni = 1";
    $check_stmt = $conn->prepare($check_sql);
    $check_stmt->bind_param('i', $data['id']);
    $check_stmt->execute();
    if ($check_stmt->get_result()->num_rows === 0) {
        return ['status' => 'error', 'message' => 'Faktura neexistuje'];
    }
    
    // UPDATE
    $sql = "UPDATE 25a_objednavky_faktury SET
                fa_dorucena = ?,
                fa_castka = ?,
                fa_cislo_vema = ?,
                fa_stredisko = ?,
                fa_poznamka = ?,
                dt_aktualizace = NOW()
            WHERE id = ?";
    
    $stmt = $conn->prepare($sql);
    $fa_dorucena = isset($data['fa_dorucena']) ? (int)$data['fa_dorucena'] : 0;
    
    $stmt->bind_param(
        'idsssi',
        $fa_dorucena,
        $data['fa_castka'],
        $data['fa_cislo_vema'],
        $data['fa_stredisko'],
        $data['fa_poznamka'],
        $data['id']
    );
    
    if ($stmt->execute()) {
        $faktura = getFakturaById($conn, $data['id']);
        
        return [
            'status' => 'ok',
            'message' => 'Faktura byla úspěšně aktualizována',
            'data' => $faktura
        ];
    } else {
        return ['status' => 'error', 'message' => 'Chyba při aktualizaci faktury'];
    }
}
```

### Endpoint 4: Smazat fakturu (soft delete)

```php
// Endpoint: POST /api.eeo/faktury/delete

function deleteFaktura($conn, $data, $user_id) {
    if (empty($data['id'])) {
        return ['status' => 'error', 'message' => 'id je povinné'];
    }
    
    $sql = "UPDATE 25a_objednavky_faktury 
            SET aktivni = 0, dt_aktualizace = NOW()
            WHERE id = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('i', $data['id']);
    
    if ($stmt->execute() && $stmt->affected_rows > 0) {
        return [
            'status' => 'ok',
            'message' => 'Faktura byla úspěšně smazána'
        ];
    } else {
        return ['status' => 'error', 'message' => 'Faktura nebyla nalezena'];
    }
}
```

---

## 2️⃣ FRONTEND API SERVICE

### Soubor: `src/services/api25orders.js`

```javascript
/**
 * FAKTURY API FUNKCE
 */

/**
 * Načíst seznam faktur k objednávce
 * @param {Object} params - { token, username, objednavkaId }
 * @returns {Promise<Array>} - Pole faktur
 */
export async function getFaktury25({ token, username, objednavkaId }) {
  try {
    const response = await api25orders.post('/api.php', {
      endpoint: 'faktury/list',
      token,
      username,
      objednavka_id: objednavkaId
    });

    if (response.data?.status === 'ok') {
      return response.data.data || [];
    }

    throw new Error(response.data?.message || 'Chyba při načítání faktur');
  } catch (err) {
    console.error('[API25] getFaktury25 error:', err);
    throw normalizeApi25OrdersError(err);
  }
}

/**
 * Přidat novou fakturu
 * @param {Object} params - { token, username, fakturaData }
 * @returns {Promise<Object>} - Vytvořená faktura
 */
export async function createFaktura25({ token, username, fakturaData }) {
  try {
    const response = await api25orders.post('/api.php', {
      endpoint: 'faktury/create',
      token,
      username,
      ...fakturaData
    });

    if (response.data?.status === 'ok') {
      return response.data.data;
    }

    throw new Error(response.data?.message || 'Chyba při vytváření faktury');
  } catch (err) {
    console.error('[API25] createFaktura25 error:', err);
    throw normalizeApi25OrdersError(err);
  }
}

/**
 * Upravit existující fakturu
 * @param {Object} params - { token, username, fakturaId, fakturaData }
 * @returns {Promise<Object>} - Aktualizovaná faktura
 */
export async function updateFaktura25({ token, username, fakturaId, fakturaData }) {
  try {
    const response = await api25orders.post('/api.php', {
      endpoint: 'faktury/update',
      token,
      username,
      id: fakturaId,
      ...fakturaData
    });

    if (response.data?.status === 'ok') {
      return response.data.data;
    }

    throw new Error(response.data?.message || 'Chyba při aktualizaci faktury');
  } catch (err) {
    console.error('[API25] updateFaktura25 error:', err);
    throw normalizeApi25OrdersError(err);
  }
}

/**
 * Smazat fakturu (soft delete)
 * @param {Object} params - { token, username, fakturaId }
 * @returns {Promise<void>}
 */
export async function deleteFaktura25({ token, username, fakturaId }) {
  try {
    const response = await api25orders.post('/api.php', {
      endpoint: 'faktury/delete',
      token,
      username,
      id: fakturaId
    });

    if (response.data?.status === 'ok') {
      return;
    }

    throw new Error(response.data?.message || 'Chyba při mazání faktury');
  } catch (err) {
    console.error('[API25] deleteFaktura25 error:', err);
    throw normalizeApi25OrdersError(err);
  }
}
```

---

## 3️⃣ VALIDACE FAKTUR

### Soubor: `src/utils/fakturaValidation.js` [NOVÝ]

```javascript
/**
 * Validace údajů faktury
 * @param {Object} faktura - Data faktury
 * @returns {Object} - Objekt s chybami (prázdný pokud OK)
 */
export function validateFaktura(faktura) {
  const errors = {};

  // Povinné: Číslo Fa/VPD
  if (!faktura.fa_cislo_vema?.trim()) {
    errors.fa_cislo_vema = 'Číslo Fa/VPD z VEMA je povinné';
  }

  // Povinné: Částka
  if (!faktura.fa_castka) {
    errors.fa_castka = 'Částka faktury je povinná';
  } else {
    const castka = parseFloat(faktura.fa_castka);
    if (isNaN(castka) || castka <= 0) {
      errors.fa_castka = 'Částka musí být větší než 0';
    }
  }

  return errors;
}

/**
 * Kontrola odchylky částky faktury vs. max cena objednávky
 * @param {number} fakturaAmount - Částka faktury
 * @param {number} maxOrderAmount - Max cena objednávky s DPH
 * @returns {Object|null} - Upozornění nebo null
 */
export function checkFakturaAmountDeviation(fakturaAmount, maxOrderAmount) {
  if (!fakturaAmount || !maxOrderAmount) return null;

  const faktura = parseFloat(fakturaAmount);
  const maxCena = parseFloat(maxOrderAmount);

  if (faktura > maxCena) {
    const rozdil = faktura - maxCena;
    const procento = ((rozdil / maxCena) * 100).toFixed(1);

    return {
      type: 'warning',
      message: `Částka faktury (${faktura.toLocaleString('cs-CZ')} Kč) je vyšší než maximální cena objednávky (${maxCena.toLocaleString('cs-CZ')} Kč). Rozdíl: ${rozdil.toLocaleString('cs-CZ')} Kč (${procento}%).`,
      difference: rozdil,
      percentage: parseFloat(procento)
    };
  }

  return null;
}

/**
 * Formátování částky pro zobrazení
 * @param {number} amount - Částka
 * @returns {string} - Formátovaná částka
 */
export function formatCurrency(amount) {
  if (!amount) return '0 Kč';
  return `${parseFloat(amount).toLocaleString('cs-CZ', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })} Kč`;
}
```

---

## 4️⃣ FRONTEND KOMPONENTY

### Komponenta 1: `FakturaForm.js` [NOVÝ]

```javascript
import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Calculator, Hash, FileText, CheckSquare, X, Save } from 'lucide-react';
import { validateFaktura, checkFakturaAmountDeviation, formatCurrency } from '../utils/fakturaValidation';

const FormContainer = styled.div`
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 1rem;
`;

const FormTitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  
  &.required::after {
    content: ' *';
    color: #ef4444;
  }
`;

const Input = styled.input`
  padding: 0.625rem;
  border: 1px solid ${props => props.hasError ? '#ef4444' : '#cbd5e1'};
  border-radius: 6px;
  font-size: 0.875rem;
  
  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#ef4444' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }
`;

const Textarea = styled.textarea`
  padding: 0.625rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.875rem;
  min-height: 80px;
  font-family: inherit;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #475569;
  cursor: pointer;
  user-select: none;
`;

const Checkbox = styled.input`
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
`;

const ErrorText = styled.span`
  font-size: 0.75rem;
  color: #ef4444;
`;

const WarningBox = styled.div`
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: #92400e;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
`;

const Button = styled.button`
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  border: none;
  
  &.primary {
    background: #3b82f6;
    color: white;
    
    &:hover:not(:disabled) {
      background: #2563eb;
    }
  }
  
  &.secondary {
    background: #e2e8f0;
    color: #475569;
    
    &:hover:not(:disabled) {
      background: #cbd5e1;
    }
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default function FakturaForm({ 
  faktura, 
  maxCenaObjednavky, 
  onSave, 
  onCancel, 
  isSaving 
}) {
  const [formData, setFormData] = useState({
    fa_dorucena: faktura?.fa_dorucena || false,
    fa_cislo_vema: faktura?.fa_cislo_vema || '',
    fa_castka: faktura?.fa_castka || '',
    fa_stredisko: faktura?.fa_stredisko || '',
    fa_poznamka: faktura?.fa_poznamka || ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Vyčisti error pro dané pole
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = () => {
    // Validace
    const validationErrors = validateFaktura(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Uložit
    onSave(formData);
  };

  // Kontrola odchylky částky
  const amountWarning = checkFakturaAmountDeviation(
    formData.fa_castka,
    maxCenaObjednavky
  );

  return (
    <FormContainer>
      <FormTitle>
        {faktura ? '✏️ Upravit fakturu' : '➕ Nová faktura'}
      </FormTitle>

      {amountWarning && (
        <WarningBox>
          ⚠️ {amountWarning.message}
        </WarningBox>
      )}

      <CheckboxLabel>
        <Checkbox
          type="checkbox"
          checked={formData.fa_dorucena}
          onChange={(e) => handleChange('fa_dorucena', e.target.checked)}
        />
        Faktura doručena na ZZS SK
      </CheckboxLabel>

      <FormRow style={{ marginTop: '1rem' }}>
        <FormGroup>
          <Label className="required">ČÍSLO FA/VPD Z VEMA</Label>
          <Input
            type="text"
            placeholder="např. 2025/0123"
            value={formData.fa_cislo_vema}
            onChange={(e) => handleChange('fa_cislo_vema', e.target.value)}
            hasError={!!errors.fa_cislo_vema}
          />
          {errors.fa_cislo_vema && (
            <ErrorText>{errors.fa_cislo_vema}</ErrorText>
          )}
        </FormGroup>

        <FormGroup>
          <Label className="required">ČÁSTKA (Kč)</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.fa_castka}
            onChange={(e) => handleChange('fa_castka', e.target.value)}
            hasError={!!errors.fa_castka}
            style={{ textAlign: 'right' }}
          />
          {errors.fa_castka && (
            <ErrorText>{errors.fa_castka}</ErrorText>
          )}
        </FormGroup>
      </FormRow>

      <FormGroup>
        <Label>STŘEDISKO</Label>
        <Input
          type="text"
          placeholder="např. Technický úsek"
          value={formData.fa_stredisko}
          onChange={(e) => handleChange('fa_stredisko', e.target.value)}
        />
      </FormGroup>

      <FormGroup style={{ marginTop: '1rem' }}>
        <Label>POZNÁMKA/VZKAZ</Label>
        <Textarea
          placeholder="Volitelná poznámka k faktuře..."
          value={formData.fa_poznamka}
          onChange={(e) => handleChange('fa_poznamka', e.target.value)}
        />
      </FormGroup>

      <ButtonGroup>
        <Button
          type="button"
          className="secondary"
          onClick={onCancel}
          disabled={isSaving}
        >
          <X size={16} />
          Zrušit
        </Button>
        <Button
          type="button"
          className="primary"
          onClick={handleSubmit}
          disabled={isSaving}
        >
          <Save size={16} />
          {isSaving ? 'Ukládám...' : 'Uložit fakturu'}
        </Button>
      </ButtonGroup>
    </FormContainer>
  );
}
```

### Komponenta 2: `FakturaCard.js` [NOVÝ]

```javascript
import React from 'react';
import styled from '@emotion/styled';
import { CheckCircle, XCircle, Edit2, Trash2, User, Calendar } from 'lucide-react';
import { formatCurrency } from '../utils/fakturaValidation';
import { prettyDate } from '../utils/format';

const Card = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  transition: box-shadow 0.2s;
  
  &:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

const Title = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  
  &.dorucena {
    background: #dcfce7;
    color: #166534;
  }
  
  &.nedorucena {
    background: #fee2e2;
    color: #991b1b;
  }
`;

const CardBody = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const InfoRow = styled.div`
  color: #64748b;
  
  strong {
    color: #475569;
    font-weight: 500;
  }
`;

const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.75rem;
  border-top: 1px solid #e2e8f0;
  font-size: 0.75rem;
  color: #64748b;
`;

const AuthorInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  padding: 0.375rem 0.75rem;
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  transition: all 0.2s;
  
  &.edit {
    background: #eff6ff;
    color: #1e40af;
    
    &:hover {
      background: #dbeafe;
    }
  }
  
  &.delete {
    background: #fef2f2;
    color: #991b1b;
    
    &:hover {
      background: #fee2e2;
    }
  }
`;

export default function FakturaCard({ faktura, onEdit, onDelete }) {
  const isDorucena = faktura.fa_dorucena === 1 || faktura.fa_dorucena === true;

  return (
    <Card>
      <CardHeader>
        <Title>
          Fa: <strong>{faktura.fa_cislo_vema}</strong>
        </Title>
        <StatusBadge className={isDorucena ? 'dorucena' : 'nedorucena'}>
          {isDorucena ? (
            <>
              <CheckCircle size={12} />
              Doručena
            </>
          ) : (
            <>
              <XCircle size={12} />
              Nedoručena
            </>
          )}
        </StatusBadge>
      </CardHeader>

      <CardBody>
        <InfoRow>
          <strong>Částka:</strong> {formatCurrency(faktura.fa_castka)}
        </InfoRow>
        {faktura.fa_stredisko && (
          <InfoRow>
            <strong>Středisko:</strong> {faktura.fa_stredisko}
          </InfoRow>
        )}
        {faktura.fa_poznamka && (
          <InfoRow style={{ gridColumn: '1 / -1' }}>
            <strong>Poznámka:</strong> {faktura.fa_poznamka}
          </InfoRow>
        )}
      </CardBody>

      <CardFooter>
        <AuthorInfo>
          <User size={14} />
          {faktura.vytvoril_jmeno || 'Neznámý'}
          <span>•</span>
          <Calendar size={14} />
          {prettyDate(faktura.dt_vytvoreni)}
        </AuthorInfo>
        <ActionButtons>
          <ActionButton className="edit" onClick={() => onEdit(faktura)}>
            <Edit2 size={14} />
            Upravit
          </ActionButton>
          <ActionButton className="delete" onClick={() => onDelete(faktura.id)}>
            <Trash2 size={14} />
            Smazat
          </ActionButton>
        </ActionButtons>
      </CardFooter>
    </Card>
  );
}
```

### Komponenta 3: `FakturyList.js` [NOVÝ]

```javascript
import React, { useState, useEffect, useContext } from 'react';
import styled from '@emotion/styled';
import { Plus, FileText } from 'lucide-react';
import FakturaCard from './FakturaCard';
import FakturaForm from './FakturaForm';
import { ToastContext } from '../context/ToastContext';
import { AuthContext } from '../context/AuthContext';
import { 
  getFaktury25, 
  createFaktura25, 
  updateFaktura25, 
  deleteFaktura25 
} from '../services/api25orders';

const Container = styled.div`
  margin-top: 1rem;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const Title = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AddButton = styled.button`
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.2s;
  
  &:hover {
    background: #2563eb;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #64748b;
  font-size: 0.875rem;
`;

export default function FakturyList({ objednavkaId, maxCenaObjednavky }) {
  const [faktury, setFaktury] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFaktura, setEditingFaktura] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const { showToast } = useContext(ToastContext);
  const { userInfo } = useContext(AuthContext);

  // Načíst faktury
  useEffect(() => {
    loadFaktury();
  }, [objednavkaId]);

  const loadFaktury = async () => {
    if (!objednavkaId) return;

    try {
      setLoading(true);
      const data = await getFaktury25({
        token: userInfo.token,
        username: userInfo.username,
        objednavkaId
      });
      setFaktury(data);
    } catch (error) {
      console.error('Chyba při načítání faktur:', error);
      showToast('Chyba při načítání faktur', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingFaktura(null);
    setShowForm(true);
  };

  const handleEdit = (faktura) => {
    setEditingFaktura(faktura);
    setShowForm(true);
  };

  const handleSave = async (fakturaData) => {
    try {
      setIsSaving(true);

      if (editingFaktura) {
        // Aktualizace
        await updateFaktura25({
          token: userInfo.token,
          username: userInfo.username,
          fakturaId: editingFaktura.id,
          fakturaData
        });
        showToast('Faktura byla úspěšně aktualizována', 'success');
      } else {
        // Vytvoření nové
        await createFaktura25({
          token: userInfo.token,
          username: userInfo.username,
          fakturaData: {
            ...fakturaData,
            objednavka_id: objednavkaId
          }
        });
        showToast('Faktura byla úspěšně přidána', 'success');
      }

      setShowForm(false);
      setEditingFaktura(null);
      loadFaktury();
    } catch (error) {
      console.error('Chyba při ukládání faktury:', error);
      showToast(error.message || 'Chyba při ukládání faktury', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (fakturaId) => {
    if (!window.confirm('Opravdu chcete smazat tuto fakturu?')) {
      return;
    }

    try {
      await deleteFaktura25({
        token: userInfo.token,
        username: userInfo.username,
        fakturaId
      });
      showToast('Faktura byla smazána', 'success');
      loadFaktury();
    } catch (error) {
      console.error('Chyba při mazání faktury:', error);
      showToast(error.message || 'Chyba při mazání faktury', 'error');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingFaktura(null);
  };

  if (loading) {
    return <div>Načítám faktury...</div>;
  }

  return (
    <Container>
      <Header>
        <Title>
          <FileText size={20} />
          📋 Seznam faktur ({faktury.length})
        </Title>
        {!showForm && (
          <AddButton onClick={handleAddNew}>
            <Plus size={16} />
            Přidat fakturu
          </AddButton>
        )}
      </Header>

      {faktury.length === 0 && !showForm && (
        <EmptyState>
          K této objednávce zatím nebyly přidány žádné faktury.
        </EmptyState>
      )}

      {faktury.map(faktura => (
        <FakturaCard
          key={faktura.id}
          faktura={faktura}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}

      {showForm && (
        <FakturaForm
          faktura={editingFaktura}
          maxCenaObjednavky={maxCenaObjednavky}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isSaving}
        />
      )}
    </Container>
  );
}
```

---

## 5️⃣ INTEGRACE DO OrderForm25.js

### Změny v `src/forms/OrderForm25.js`:

#### 1. Import komponent a funkcí:
```javascript
// Na začátek souboru přidat:
import FakturyList from '../components/FakturyList';
```

#### 2. Upravit podmínku zobrazení sekce (řádek ~16536):
```javascript
// ZMĚNIT Z:
{false && formData.dodavatel_zpusob_potvrzeni?.potvrzeni === 'ANO' && (

// NA (varianta A - po potvrzení):
{shouldShowFakturace() && (

// NEBO NA (varianta B - po odeslání):
{shouldShowFakturace() && (
```

#### 3. Přidat helper funkci `shouldShowFakturace()`:
```javascript
// Někde v OrderForm25 komponentě (např. kolem řádku 4000):

/**
 * Určí, zda se má zobrazit sekce fakturace
 */
const shouldShowFakturace = useCallback(() => {
  if (!isEditMode || !orderId) return false;
  
  const stav = formData.stav_schvaleni_kod;
  
  // Varianta A: Po potvrzení dodavatele
  return ['POTVRZENA', 'DOKONCENA'].includes(stav);
  
  // NEBO Varianta B: Po odeslání objednávky
  // return ['CEKA_POTVRZENI', 'POTVRZENA', 'ROZPRACOVANA', 'DOKONCENA'].includes(stav);
}, [isEditMode, orderId, formData.stav_schvaleni_kod]);
```

#### 4. Upravit obsah sekce fakturace (řádek ~16556):
```javascript
<SectionContent collapsed={sectionStates.fakturace}>
  <FakturyList 
    objednavkaId={orderId}
    maxCenaObjednavky={formData.max_cena_s_dph}
  />
</SectionContent>
```

---

## 6️⃣ TESTOVÁNÍ

### Testovací scénáře:

1. **Zobrazení sekce**
   - [ ] Sekce se nezobrazuje pro novou objednávku (NOVA)
   - [ ] Sekce se nezobrazuje pro objednávky před odeslám
   - [ ] Sekce se zobrazuje podle zvoleného workflow (A nebo B)

2. **Přidání faktury**
   - [ ] Formulář se zobrazí po kliknutí na "Přidat fakturu"
   - [ ] Validace povinných polí funguje
   - [ ] Upozornění při překročení max částky
   - [ ] Faktura se uloží a zobrazí v seznamu

3. **Úprava faktury**
   - [ ] Formulář se předvyplní daty faktury
   - [ ] Změny se uloží správně
   - [ ] Aktualizace se projeví v seznamu

4. **Smazání faktury**
   - [ ] Potvrzovací dialog se zobrazí
   - [ ] Faktura zmizí ze seznamu
   - [ ] Soft delete - faktura zůstane v DB (aktivni=0)

5. **Edge cases**
   - [ ] Více faktur k jedné objednávce
   - [ ] Prázdný seznam faktur
   - [ ] Chyby API se zobrazí korektně
   - [ ] Loading states fungují správně

---

## 📋 CHECKLIST PRO IMPLEMENTACI

### Backend
- [ ] Vytvořit endpoint `POST /faktury/list`
- [ ] Vytvořit endpoint `POST /faktury/create`
- [ ] Vytvořit endpoint `POST /faktury/update`
- [ ] Vytvořit endpoint `POST /faktury/delete`
- [ ] Otestovat všechny endpointy pomocí Postman/Insomnia
- [ ] Ověřit validaci na backendu
- [ ] Ověřit správné JOIN s tabulkou uživatelů

### Frontend
- [ ] Přidat API funkce do `api25orders.js`
- [ ] Vytvořit `fakturaValidation.js`
- [ ] Vytvořit komponentu `FakturaForm.js`
- [ ] Vytvořit komponentu `FakturaCard.js`
- [ ] Vytvořit komponentu `FakturyList.js`
- [ ] Upravit `OrderForm25.js` - integrace
- [ ] Otestovat workflow

### Testing
- [ ] Unit testy pro validaci
- [ ] Integration testy pro API
- [ ] E2E testy pro celý workflow
- [ ] Manuální testování všech scénářů

---

**Připraveno k implementaci! 🚀**
