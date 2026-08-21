import { useCallback, useEffect, useMemo, useState } from 'react';
import AppIcon from '../components/ui/AppIcon';
import { deactivateLookupItem, fetchLookupItems, saveLookupItem } from '../services/apiClient';
import { useAuth } from '../auth/AuthContext';

const EMPTY_FORM = {
  category: '',
  code: '',
  item_name: '',
  item_description: '',
  sort_order: 0,
  is_active: true,
};

const CATEGORY_LABELS = {
  claim_status: 'Stav škodní události',
  equipment_status: 'Stav vybavení',
  equipment_type: 'Typ vybavení',
  funding_status: 'Stav financování',
  insurance_policy_type: 'Typ pojistky',
  service_cancel_reason: 'Důvod ukončení servisu',
  service_kind: 'Druh servisní práce',
  service_status: 'Stav servisu',
  service_type: 'Typ servisu',
  tire_season: 'Sezóna pneumatik',
  tire_status: 'Stav pneumatik',
  vehicle_status_reason: 'Důvod změny stavu vozidla',
};

const NEW_CATEGORY_VALUE = '__new_category__';

function categoryLabel(category) {
  return CATEGORY_LABELS[category] || String(category || '').replaceAll('_', ' ');
}

export default function LookupsPage() {
  const { user } = useAuth();
  const role = String(user?.role || '').toLowerCase();
  const canEdit = role === 'superadmin' || role === 'administrator';
  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchLookupItems({ includeInactive: showInactive ? 1 : 0 });
      const nextItems = Array.isArray(response?.data?.items) ? response.data.items : [];
      setItems(nextItems);
      if (!selectedCategory && nextItems[0]?.category) {
        setSelectedCategory(nextItems[0].category);
      }
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setError(apiMessage || 'Číselníky se nepodařilo načíst.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, showInactive]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => String(item.category || '').trim()).filter(Boolean))).sort(),
    [items]
  );

  const visibleItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((item) => {
      if (selectedCategory && item.category !== selectedCategory) return false;
      if (!needle) return true;
      return [item.code, item.item_name, item.item_description].some((value) => String(value || '').toLowerCase().includes(needle));
    });
  }, [items, search, selectedCategory]);

  function startNew() {
    setEditing(true);
    setMessage('');
    setNewCategory('');
    setForm({ ...EMPTY_FORM, category: selectedCategory || categories[0] || '' });
  }

  function startEdit(item) {
    setEditing(true);
    setMessage('');
    setForm({
      category: item.category || '',
      code: item.code || '',
      item_name: item.item_name || '',
      item_description: item.item_description || '',
      sort_order: item.sort_order || 0,
      is_active: Boolean(item.is_active),
    });
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const category = form.category === NEW_CATEGORY_VALUE ? newCategory : form.category;
      const response = await saveLookupItem({ ...form, category });
      setMessage(response?.data?.message || 'Číselník byl uložen.');
      setEditing(false);
      await loadItems();
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setError(apiMessage || 'Číselník se nepodařilo uložit.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(item) {
    if (!window.confirm(`Deaktivovat položku ${item.item_name}?`)) return;
    setError('');
    try {
      const response = await deactivateLookupItem(item.category, item.code);
      setMessage(response?.data?.message || 'Číselník byl deaktivován.');
      await loadItems();
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setError(apiMessage || 'Číselník se nepodařilo deaktivovat.');
    }
  }

  return (
    <section className="lookup-page">
      <div className="section-head lookup-page-head">
        <div>
          <h2 className="title-with-icon">
            <AppIcon name="db" size={20} weight="duotone" />
            <span>Číselníky V2</span>
          </h2>
          <p className="muted">Stabilní kódy pro formuláře, importy a historii vozidel.</p>
        </div>
        {canEdit ? <button type="button" className="lookup-add-button" onClick={startNew} aria-label="Přidat novou položku číselníku" title="Přidat novou položku číselníku"><AppIcon name="edit" size={19} weight="duotone" /></button> : null}
      </div>

      {error ? <div className="error-box">{error}</div> : null}
      {message ? <div className="status-box">{message}</div> : null}

      <div className="lookup-toolbar">
        <label className="lookup-search">
          <span>Fulltextové hledání</span>
          <div className="overview-search-wrap lookup-search-wrap">
            <AppIcon name="search" size={17} weight="duotone" className="lookup-search-icon" />
            <input className="search-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hledat podle názvu, kódu nebo popisu" />
            {search ? <button type="button" className="lookup-search-clear" onClick={() => setSearch('')} aria-label="Vymazat fulltextové hledání" title="Vymazat hledání"><AppIcon name="close" size={14} weight="bold" /></button> : null}
          </div>
        </label>
        <label className="lookup-toggle">
          <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />
          Zobrazit neaktivní
        </label>
      </div>

      <div className="lookup-workspace">
        <aside className="lookup-categories" aria-label="Kategorie číselníků">
          <div className="lookup-section-label">Kategorie číselníků</div>
          {categories.map((category) => (
            <button key={category} type="button" className={`lookup-category${selectedCategory === category ? ' active' : ''}`} onClick={() => setSelectedCategory(category)}>
              <span><strong>{categoryLabel(category)}</strong><small>{category}</small></span>
              <strong>{items.filter((item) => item.category === category).length}</strong>
            </button>
          ))}
        </aside>

        <div className="lookup-list-panel">
          <div className="lookup-list-head">
            <div>
              <div className="lookup-section-label">Položky</div>
              <h3>{selectedCategory ? categoryLabel(selectedCategory) : 'Všechny kategorie'}</h3>
              {selectedCategory ? <span className="lookup-technical-key">Interní klíč: {selectedCategory}</span> : null}
            </div>
            <span className="lookup-count">{loading ? 'Načítám...' : `${visibleItems.length} položek`}</span>
          </div>
          <div className="lookup-list">
            {visibleItems.map((item) => (
              <article key={`${item.category}:${item.code}`} className={`lookup-item${item.is_active ? '' : ' inactive'}`}>
                <div>
                  <div className="lookup-item-code">{item.code}</div>
                  <h4>{item.item_name}</h4>
                  {item.item_description ? <p>{item.item_description}</p> : null}
                </div>
                <div className="lookup-item-actions">
                  <span className={`lookup-status ${item.is_active ? 'active' : 'inactive'}`}>{item.is_active ? 'Aktivní' : 'Neaktivní'}</span>
                  {canEdit ? <button type="button" className="btn btn-ghost" onClick={() => startEdit(item)}><AppIcon name="edit" size={14} weight="duotone" /> Upravit</button> : null}
                  {canEdit && item.is_active ? <button type="button" className="btn btn-ghost" onClick={() => handleDeactivate(item)}><AppIcon name="lock" size={14} weight="duotone" /> Deaktivovat</button> : null}
                </div>
              </article>
            ))}
            {!loading && visibleItems.length === 0 ? <div className="lookup-empty">Pro zvolený filtr nejsou žádné položky.</div> : null}
          </div>
        </div>

      </div>

      {editing && canEdit ? (
        <div className="lookup-editor-backdrop" role="presentation" onClick={() => setEditing(false)}>
          <aside className="lookup-editor-drawer" role="dialog" aria-modal="true" aria-label="Editace číselníku" onClick={(event) => event.stopPropagation()}>
            <div className="lookup-editor-drawer-head">
              <div>
                <div className="lookup-section-label">Editace číselníku</div>
                <h3>{form.code ? 'Upravit položku' : 'Nová položka'}</h3>
                <p className="muted">Český název je pro uživatele, kód zůstává stabilní pro API.</p>
              </div>
              <button type="button" className="icon-only-btn" onClick={() => setEditing(false)} aria-label="Zavřít editor" title="Zavřít editor">×</button>
            </div>
            <form className="lookup-editor" onSubmit={handleSave}>
              <label>Kategorie
                <select value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}>
                  {categories.map((category) => <option key={category} value={category}>{categoryLabel(category)}</option>)}
                  <option value={NEW_CATEGORY_VALUE}>+ Nová kategorie</option>
                </select>
                {form.category === NEW_CATEGORY_VALUE ? <input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Např. vehicle_type" pattern="[a-z0-9_]{2,64}" required /> : <small className="lookup-editor-key">{form.category || 'Nebyla vybrána kategorie'}</small>}
              </label>
              <label>Technický kód<input value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} placeholder="in_progress" required /></label>
              <label>Název<input value={form.item_name} onChange={(event) => setForm((prev) => ({ ...prev, item_name: event.target.value }))} required /></label>
              <label>Popis<textarea rows={3} value={form.item_description} onChange={(event) => setForm((prev) => ({ ...prev, item_description: event.target.value }))} /></label>
              <label>Pořadí<input type="number" min="0" value={form.sort_order} onChange={(event) => setForm((prev) => ({ ...prev, sort_order: event.target.value }))} /></label>
              <label className="lookup-editor-check"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))} /> Aktivní položka</label>
              <div className="lookup-editor-actions"><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Ukládám...' : 'Uložit'}</button><button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Zrušit</button></div>
            </form>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
