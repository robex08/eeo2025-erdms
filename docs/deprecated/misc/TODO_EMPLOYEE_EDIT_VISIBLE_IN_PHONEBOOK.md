# 📋 TODO: Implementace editace zaměstnanců s visible_in_phonebook checkboxem

**Datum vytvoření:** 5. ledna 2026  
**Priorita:** 🟡 MEDIUM (není kritické, lze měnit v DB)  
**Odhadovaný čas:** 4-6 hodin  
**Závislosti:** Deployment v2.00 (SUPPLIER/PHONEBOOK permissions)

---

## 📝 Popis úkolu

Po deploymentu v2.00 máme v databázi sloupec `visible_in_phonebook` v tabulce `25_uzivatele`, který odděluje:
- **aktivni** = systémový přístup (login)
- **visible_in_phonebook** = viditelnost v telefonním seznamu (menu "Kontakty")

Aktuálně není žádné UI pro změnu tohoto flagu - admin musí měnit přímo v databázi.

**Cíl:** Přidat kompletní edit funkcionalitu pro zaměstnance včetně checkboxu pro `visible_in_phonebook`.

---

## 🎯 Acceptance Criteria

- [ ] Uživatel s právem `PHONEBOOK_MANAGE` může editovat zaměstnance
- [ ] Edit modal zobrazuje všechny relevantní údaje (jméno, email, telefon, pozice, úsek, lokalita)
- [ ] Checkbox "Viditelný v telefonním seznamu" je viditelný a funkční
- [ ] Po uložení se změny promítnou do:
  - [ ] AddressBookPage → Záložka Zaměstnanci
  - [ ] ContactsPage (menu "Kontakty")
  - [ ] Universal search
- [ ] Backend validuje oprávnění `PHONEBOOK_MANAGE` pro update
- [ ] Frontend zobrazuje chybové hlášky při selhání
- [ ] Optimistic UI update (okamžitá aktualizace bez reload)

---

## 🔧 Technické kroky

### 1. Backend - Endpoint `users/update` ⏱️ ~2h

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php`

**Implementace:**

```php
/**
 * Update user profile data (restricted to PHONEBOOK_MANAGE)
 * Endpoint: POST users/update
 * Expects: { token, username, id, visible_in_phonebook, ... }
 */
function handle_users_update($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    // Optimalizace: vytvoř DB spojení jednou
    try {
        $db = get_db($config);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }
    
    // Předej DB spojení do verify_token
    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }
    if ($request_username && $token_data['username'] !== $request_username) {
        api_error(401, 'Username z tokenu neodpovídá username z požadavku', 'UNAUTHORIZED');
        return;
    }
    
    $current_user_id = $token_data['id'];
    
    // Ověření oprávnění PHONEBOOK_MANAGE
    if (!has_permission($db, $request_username, 'PHONEBOOK_MANAGE')) {
        api_error(403, 'Nemáte oprávnění pro úpravu zaměstnanců', 'FORBIDDEN');
        return;
    }
    
    // Validace ID uživatele k editaci
    $user_id = isset($input['id']) ? (int)$input['id'] : 0;
    if (!$user_id) {
        api_error(400, 'Chybí ID uživatele', 'MISSING_ID');
        return;
    }
    
    try {
        // Načti aktuální data uživatele
        $stmt = $db->prepare("SELECT * FROM " . TBL_UZIVATELE . " WHERE id = :id LIMIT 1");
        $stmt->bindParam(':id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        $existing_user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$existing_user) {
            api_error(404, 'Uživatel nenalezen', 'NOT_FOUND');
            return;
        }
        
        // Připrav UPDATE - pouze povolené fieldy
        $allowed_fields = ['visible_in_phonebook', 'aktivni', 'email', 'telefon'];
        $update_fields = [];
        $params = [':id' => $user_id];
        
        foreach ($allowed_fields as $field) {
            if (isset($input[$field])) {
                $update_fields[] = "$field = :$field";
                
                // Speciální handling pro boolean fieldy
                if ($field === 'visible_in_phonebook' || $field === 'aktivni') {
                    $params[":$field"] = (int)$input[$field];
                } else {
                    $params[":$field"] = trim($input[$field]);
                }
            }
        }
        
        if (empty($update_fields)) {
            api_error(400, 'Žádná pole k aktualizaci', 'NO_FIELDS');
            return;
        }
        
        // Sestavení UPDATE query
        $sql = "UPDATE " . TBL_UZIVATELE . " 
                SET " . implode(', ', $update_fields) . ", 
                    dt_aktualizace = NOW() 
                WHERE id = :id";
        
        if (API_DEBUG_MODE) {
            error_log("Update user SQL: " . $sql);
            error_log("Update params: " . print_r($params, true));
        }
        
        $stmt = $db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();
        
        // Načti aktualizovaná data
        $stmt = $db->prepare("SELECT * FROM " . TBL_UZIVATELE . " WHERE id = :id LIMIT 1");
        $stmt->bindParam(':id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        $updated_user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        api_ok([
            'updated' => true,
            'user' => $updated_user
        ]);
        return;
        
    } catch (Exception $e) {
        if (API_DEBUG_MODE) {
            error_log("Update user error: " . $e->getMessage());
        }
        api_error(500, 'Chyba při aktualizaci uživatele: ' . $e->getMessage(), 'DB_ERROR');
        return;
    }
}
```

**Registrace endpoint:** Přidat do `lib/router.php`:
```php
'users/update' => 'handle_users_update',
```

---

### 2. Frontend API - Funkce `updateEmployee()` ⏱️ ~30min

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/client/src/services/api2auth.js`

**Implementace:**

```javascript
/**
 * Update employee profile (requires PHONEBOOK_MANAGE permission)
 * Expects { token, username, id, visible_in_phonebook, aktivni, email, telefon }
 */
export async function updateEmployee({ token, username, id, visible_in_phonebook, aktivni, email, telefon }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  }
  
  if (!id) {
    throw new Error('ID zaměstnance je vyžadováno pro aktualizaci.');
  }
  
  try {
    const payload = { token, username, id };
    
    // Přidat pouze poskytnuté fieldy
    if (visible_in_phonebook !== undefined) payload.visible_in_phonebook = visible_in_phonebook;
    if (aktivni !== undefined) payload.aktivni = aktivni;
    if (email !== undefined) payload.email = email;
    if (telefon !== undefined) payload.telefon = telefon;
    
    const response = await api2.post('users/update', payload, { timeout: 10000 });
    
    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi ze serveru from users/update');
    }
    
    return response.data;
  } catch (err) {
    console.error('❌ [API updateEmployee] CHYBA:', err);
    console.error('📋 [API updateEmployee] Error response:', err.response?.data);
    throw new Error(err.response?.data?.message || err.message || 'Chyba při aktualizaci zaměstnance');
  }
}
```

---

### 3. Frontend - Edit Modal v EmployeeManagement.js ⏱️ ~3h

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/client/src/components/EmployeeManagement.js`

**Změny:**

#### 3.1 Přidat stavy pro edit modal

```javascript
const [editModalOpen, setEditModalOpen] = useState(false);
const [editingEmployee, setEditingEmployee] = useState(null);
const [editForm, setEditForm] = useState({
  visible_in_phonebook: 1,
  aktivni: 1,
  email: '',
  telefon: ''
});
const [isSaving, setIsSaving] = useState(false);
```

#### 3.2 Přidat styled komponenty pro modal

```javascript
const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e2e8f0;
`;

const ModalTitle = styled.h3`
  margin: 0;
  color: #1e293b;
  font-size: 1.5rem;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    background: #f1f5f9;
    color: #334155;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: #334155;
  font-weight: 500;
  font-size: 0.875rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    background: #f8fafc;
    color: #94a3b8;
    cursor: not-allowed;
  }
`;

const CheckboxContainer = styled.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  user-select: none;
  padding: 0.75rem;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background: #f8fafc;
  }
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #3b82f6;
`;

const CheckboxLabel = styled.span`
  color: #334155;
  font-size: 0.875rem;
  font-weight: 500;
`;

const CheckboxHint = styled.span`
  color: #64748b;
  font-size: 0.75rem;
  margin-left: auto;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 2px solid #e2e8f0;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CancelButton = styled(Button)`
  background: white;
  border: 2px solid #e2e8f0;
  color: #64748b;

  &:hover:not(:disabled) {
    background: #f8fafc;
    border-color: #cbd5e1;
  }
`;

const SaveButton = styled(Button)`
  background: #3b82f6;
  border: 2px solid #3b82f6;
  color: white;

  &:hover:not(:disabled) {
    background: #2563eb;
    border-color: #2563eb;
  }
`;
```

#### 3.3 Přidat edit button do EmployeeCard

```javascript
// V EmployeeCard přidat edit button v EmployeeHeader:
<EmployeeActions>
  <SmartTooltip text="Upravit zaměstnance" icon="info">
    <EditButton onClick={() => handleEditClick(employee)}>
      <Edit2 size={16} />
    </EditButton>
  </SmartTooltip>
</EmployeeActions>
```

#### 3.4 Přidat handlery

```javascript
const handleEditClick = (employee) => {
  setEditingEmployee(employee);
  setEditForm({
    visible_in_phonebook: employee.visible_in_phonebook ?? 1,
    aktivni: employee.aktivni ?? 1,
    email: employee.email || '',
    telefon: employee.telefon || ''
  });
  setEditModalOpen(true);
};

const handleCloseModal = () => {
  setEditModalOpen(false);
  setEditingEmployee(null);
  setEditForm({
    visible_in_phonebook: 1,
    aktivni: 1,
    email: '',
    telefon: ''
  });
};

const handleSaveEmployee = async () => {
  if (!editingEmployee || !user?.username || !token) {
    showToast?.('Nelze uložit změny', { type: 'error' });
    return;
  }

  try {
    setIsSaving(true);
    
    await updateEmployee({
      token,
      username: user.username,
      id: editingEmployee.id,
      visible_in_phonebook: editForm.visible_in_phonebook,
      aktivni: editForm.aktivni,
      email: editForm.email,
      telefon: editForm.telefon
    });

    showToast?.('Zaměstnanec byl úspěšně aktualizován', { type: 'success' });

    // Optimistic update - update local state
    setEmployees(prev => prev.map(emp => 
      emp.id === editingEmployee.id 
        ? { ...emp, ...editForm }
        : emp
    ));

    handleCloseModal();
    
    // Reload to ensure fresh data
    await loadEmployees();

  } catch (err) {
    console.error('Save employee error:', err);
    showToast?.(err.message || 'Chyba při ukládání změn', { type: 'error' });
  } finally {
    setIsSaving(false);
  }
};
```

#### 3.5 Přidat Edit Modal JSX

```javascript
{/* Edit Modal */}
{editModalOpen && editingEmployee && (
  <Modal onClick={handleCloseModal}>
    <ModalContent onClick={(e) => e.stopPropagation()}>
      <ModalHeader>
        <ModalTitle>Upravit zaměstnance</ModalTitle>
        <CloseButton onClick={handleCloseModal}>
          <X size={24} />
        </CloseButton>
      </ModalHeader>

      <FormGroup>
        <Label>Jméno</Label>
        <Input 
          type="text" 
          value={editingEmployee.full_name} 
          disabled 
          style={{ background: '#f8fafc', color: '#94a3b8' }}
        />
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
          Jméno nelze měnit z administrace kontaktů
        </div>
      </FormGroup>

      <FormGroup>
        <Label>Email</Label>
        <Input
          type="email"
          value={editForm.email}
          onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
          placeholder="email@example.com"
        />
      </FormGroup>

      <FormGroup>
        <Label>Telefon</Label>
        <Input
          type="tel"
          value={editForm.telefon}
          onChange={(e) => setEditForm(prev => ({ ...prev, telefon: e.target.value }))}
          placeholder="+420 123 456 789"
        />
      </FormGroup>

      <FormGroup>
        <CheckboxContainer>
          <Checkbox
            type="checkbox"
            checked={editForm.aktivni === 1}
            onChange={(e) => setEditForm(prev => ({ ...prev, aktivni: e.target.checked ? 1 : 0 }))}
          />
          <CheckboxLabel>Aktivní uživatel (má přístup do systému)</CheckboxLabel>
          <CheckboxHint>{editForm.aktivni === 1 ? '✓ Ano' : '✗ Ne'}</CheckboxHint>
        </CheckboxContainer>
      </FormGroup>

      <FormGroup>
        <CheckboxContainer>
          <Checkbox
            type="checkbox"
            checked={editForm.visible_in_phonebook === 1}
            onChange={(e) => setEditForm(prev => ({ ...prev, visible_in_phonebook: e.target.checked ? 1 : 0 }))}
          />
          <CheckboxLabel>Viditelný v telefonním seznamu</CheckboxLabel>
          <CheckboxHint>{editForm.visible_in_phonebook === 1 ? '✓ Ano' : '✗ Ne'}</CheckboxHint>
        </CheckboxContainer>
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', marginLeft: '2.5rem' }}>
          Určuje, zda se zaměstnanec zobrazuje v menu "Kontakty" a ve výsledcích vyhledávání
        </div>
      </FormGroup>

      <ModalFooter>
        <CancelButton onClick={handleCloseModal} disabled={isSaving}>
          Zrušit
        </CancelButton>
        <SaveButton onClick={handleSaveEmployee} disabled={isSaving}>
          {isSaving ? 'Ukládám...' : 'Uložit změny'}
        </SaveButton>
      </ModalFooter>
    </ModalContent>
  </Modal>
)}
```

---

## 🧪 Testování

### Backend test:
```bash
# Test update endpoint
curl -X POST http://localhost/dev/api-legacy/api.eeo/v2025.03_25/index.php \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "users/update",
    "token": "YOUR_TOKEN",
    "username": "admin",
    "id": 123,
    "visible_in_phonebook": 0
  }'
```

### Frontend test:
1. Login jako uživatel s `PHONEBOOK_MANAGE`
2. Přejít na "Administrace → Adresář → Zaměstnanci"
3. Kliknout na edit button u zaměstnance
4. Změnit checkbox "Viditelný v telefonním seznamu"
5. Uložit změny
6. Ověřit v menu "Kontakty" že se změna projevila
7. Vyhledat uživatele v Universal Search
8. Ověřit optimistic update (okamžitá změna v seznamu)

---

## 📝 Poznámky

- **Oprávnění:** Pouze `PHONEBOOK_MANAGE` může editovat zaměstnance
- **Optimistic update:** Frontend okamžitě aktualizuje zobrazení ještě před refresh
- **Validace:** Backend kontroluje všechny inputy
- **Error handling:** Všechny chyby jsou zachyceny a zobrazeny uživateli
- **Audit log:** Zvážit logování změn `visible_in_phonebook` pro audit trail

---

## ✅ Definition of Done

- [ ] Backend endpoint `users/update` implementován a otestován
- [ ] Frontend API funkce `updateEmployee()` vytvořena
- [ ] Edit modal v EmployeeManagement.js funguje
- [ ] Checkbox `visible_in_phonebook` je funkční
- [ ] Změny se promítají do všech UI komponent
- [ ] Unit testy pro backend endpoint (volitelné)
- [ ] Code review + merge do main
- [ ] Dokumentace aktualizována
- [ ] Deployment guide upraven (odstranit TODO poznámku)

---

*Vytvořeno: 5. ledna 2026*  
*Status: 🟡 PENDING*
