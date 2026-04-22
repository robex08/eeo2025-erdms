// Stránka pro inventuru majetku - seznam naskenovaných položek
import React, { useState, useEffect } from 'react';
import { FaClipboardList, FaEdit, FaTrash, FaSave, FaTimes, FaSync, FaFilter, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './CommonPage.css';

function InventuraPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  
  // Filtr uživatele
  const [selectedUser, setSelectedUser] = useState('all');
  const [users, setUsers] = useState([]);
  
  // Paging
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Číselníky
  const [inventarniUseky, setInventarniUseky] = useState([]);
  const [budovy, setBudovy] = useState([]);
  const [mistnosti, setMistnosti] = useState([]);

  useEffect(() => {
    fetchData();
    fetchCiselniky();
    fetchUsers();
  }, []);

  useEffect(() => {
    setCurrentPage(1); // Reset na první stránku při změně filtru
    fetchData();
  }, [selectedUser]);

  const fetchUsers = async () => {
    try {
      const isDev = window.location.pathname.startsWith('/dev/');
      const apiUrl = isDev ? '/dev/api.inventik/api.php' : '/api.inventik/api.php';
      
      const response = await fetch(`${apiUrl}?endpoint=inventura_users`);
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data || []);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const fetchCiselniky = async () => {
    try {
      const isDev = window.location.pathname.startsWith('/dev/');
      const apiUrl = isDev ? '/dev/api.inventik/api.php' : '/api.inventik/api.php';
      
      const [invUsekyRes, budovyRes, mistnostiRes] = await Promise.all([
        fetch(`${apiUrl}?endpoint=inventarni_useky`),
        fetch(`${apiUrl}?endpoint=budovy`),
        fetch(`${apiUrl}?endpoint=mistnosti&limit=2000`)
      ]);
      
      const invUsekyData = await invUsekyRes.json();
      const budovyData = await budovyRes.json();
      const mistnostiData = await mistnostiRes.json();
      
      if (invUsekyData.success) setInventarniUseky(invUsekyData.data);
      if (budovyData.success) setBudovy(budovyData.data);
      if (mistnostiData.success) setMistnosti(mistnostiData.data);
    } catch (err) {
      console.error('Error loading číselníky:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const isDev = window.location.pathname.startsWith('/dev/');
      const apiUrl = isDev ? '/dev/api.inventik/api.php' : '/api.inventik/api.php';
      
      let url = `${apiUrl}?endpoint=inventura_list&limit=500`;
      if (selectedUser !== 'all') {
        url += `&uzivatel=${encodeURIComponent(selectedUser)}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setItems(data.data || []);
      } else {
        setError('Chyba při načítání dat');
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError('Chyba připojení k API');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setEditForm({
      id: item.id,
      cinv: item.cinv || '',
      budt: item.budt || '',
      mist: item.mist || '',
      poznamka: item.poznamka || '',
      ip_adresa: item.ip_adresa || '',
      seriove_cislo: item.seriove_cislo || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    try {
      const isDev = window.location.pathname.startsWith('/dev/');
      const apiUrl = isDev ? '/dev/api.inventik/api.php' : '/api.inventik/api.php';
      
      const item = items.find(i => i.id === editingId);
      
      const payload = {
        id: editForm.id,
        cislo_majetku: item.cislo_majetku,
        nazev: item.nazev,
        datum_zarazeni: item.datum_zarazeni,
        cena_mj_num: item.cena_mj_num,
        cinv: editForm.cinv || null,
        budt: editForm.budt || null,
        mist: editForm.mist || null,
        poznamka: editForm.poznamka || null,
        ip_adresa: editForm.ip_adresa || null,
        seriove_cislo: editForm.seriove_cislo || null,
        metadata: item.metadata,
        jmeno_uzivatele: item.jmeno_uzivatele
      };
      
      const response = await fetch(`${apiUrl}?endpoint=inventura_save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('✓ Změny byly uloženy');
        setEditingId(null);
        setEditForm({});
        fetchData(); // Reload data
      } else {
        alert('Chyba při ukládání: ' + (result.error || 'Neznámá chyba'));
      }
    } catch (err) {
      console.error('Error saving:', err);
      alert('Chyba při ukládání: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Opravdu chcete smazat tuto položku z inventury?')) {
      return;
    }
    
    try {
      const isDev = window.location.pathname.startsWith('/dev/');
      const apiUrl = isDev ? '/dev/api.inventik/api.php' : '/api.inventik/api.php';
      
      const response = await fetch(`${apiUrl}?endpoint=inventura_delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('✓ Položka byla smazána');
        fetchData(); // Reload data
      } else {
        alert('Chyba při mazání: ' + (result.error || 'Neznámá chyba'));
      }
    } catch (err) {
      console.error('Error deleting:', err);
      alert('Chyba při mazání: ' + err.message);
    }
  };

  // Detekce duplicit podle cislo_majetku a příprava tree struktury
  const prepareItemsWithTree = () => {
    // Seskupit podle cislo_majetku
    const groups = {};
    items.forEach(item => {
      const key = item.cislo_majetku;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    
    // Pro každou skupinu: seřadit podle datum_vytvoreni, označit hlavní/podřízené
    const result = [];
    const duplicateCodes = new Set();
    
    Object.keys(groups).forEach(code => {
      const group = groups[code];
      
      if (group.length > 1) {
        // Je to duplicita
        duplicateCodes.add(code);
        
        // Seřadit podle datum_vytvoreni (nejstarší první)
        group.sort((a, b) => new Date(a.datum_vytvoreni) - new Date(b.datum_vytvoreni));
        
        // První = hlavní, ostatní = podřízené
        group.forEach((item, index) => {
          result.push({
            ...item,
            _isMainDuplicate: index === 0,
            _isDuplicateChild: index > 0,
            _duplicateGroup: code
          });
        });
      } else {
        // Není duplicita
        result.push({
          ...group[0],
          _isMainDuplicate: false,
          _isDuplicateChild: false,
          _duplicateGroup: null
        });
      }
    });
    
    return { items: result, duplicateCodes };
  };

  // Paging výpočet s tree strukturou
  const { items: treeItems, duplicateCodes } = prepareItemsWithTree();
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = treeItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(treeItems.length / itemsPerPage);
  const duplicateCount = duplicateCodes.size;

  if (loading) {
    return (
      <div className="common-page full-width">
        <div className="page-header">
          <FaClipboardList className="page-icon" />
          <h1>Inventura majetku</h1>
        </div>
        <div className="content-box">
          <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            Načítám data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="common-page full-width">
        <div className="page-header">
          <FaClipboardList className="page-icon" />
          <h1>Inventura majetku</h1>
        </div>
        <div className="content-box">
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px' }}>
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="common-page full-width">
      <div className="page-header">
        <FaClipboardList className="page-icon" />
        <h1>Inventura majetku</h1>
        <p>Přehled naskenovaných a upravených položek</p>
      </div>

      <div className="content-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <strong style={{ fontSize: '1.1rem', color: '#0e7490' }}>
              Celkem položek: {items.length}
            </strong>
            {duplicateCount > 0 && (
              <span style={{ marginLeft: '1rem', color: '#dc2626', fontWeight: 'bold' }}>
                ⚠️ Duplicit: {duplicateCount}
              </span>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FaFilter style={{ color: '#0891b2' }} />
              <select 
                value={selectedUser} 
                onChange={(e) => setSelectedUser(e.target.value)}
                style={{
                  padding: '0.5rem',
                  border: '2px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  background: 'white'
                }}
              >
                <option value="all">Všichni uživatelé</option>
                {users.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Položek:</span>
              <select 
                value={itemsPerPage} 
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.5rem',
                  border: '2px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  background: 'white'
                }}
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            
            <button 
              onClick={fetchData} 
              style={{
                padding: '0.5rem 1rem',
                background: '#0891b2',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <FaSync /> Obnovit
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            Zatím nebyly naskenované žádné položky.
          </p>
        ) : (
          <div className="table-wrapper">
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.9rem',
              background: 'white'
            }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Číslo</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Název</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>cinv</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>budt</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>mist</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Poznámka</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>IP</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Sériové č.</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Uživatel</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Vytvořeno</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Akce</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map(item => {
                  const isMain = item._isMainDuplicate;
                  const isChild = item._isDuplicateChild;
                  
                  return (
                  <tr 
                    key={item.id} 
                    style={{ 
                      borderBottom: '1px solid #e2e8f0',
                      background: isMain ? '#fef3c7' : (isChild ? '#fee2e2' : 'transparent')
                    }}
                    title={
                      isMain ? '⭐ HLAVNÍ záznam (nejstarší)' : 
                      (isChild ? '⚠️ DUPLICITNÍ záznam - novější než hlavní' : '')
                    }
                  >
                    <td style={{ 
                      padding: '0.75rem',
                      paddingLeft: isChild ? '2.5rem' : '0.75rem',
                      position: 'relative'
                    }}>
                      {isChild && (
                        <span style={{
                          position: 'absolute',
                          left: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#dc2626',
                          fontSize: '1.2rem'
                        }}>└─</span>
                      )}
                      {isMain && <span style={{ marginRight: '0.5rem' }}>⭐</span>}
                      {item.cislo_majetku}
                    </td>
                    <td style={{ padding: '0.75rem', maxWidth: '200px' }}>
                      {item.nazev || '-'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {editingId === item.id ? (
                        <>
                          <input 
                            type="text"
                            list="table-cinv-list"
                            value={editForm.cinv} 
                            onChange={(e) => setEditForm({...editForm, cinv: e.target.value})}
                            style={{ width: '100%', padding: '0.25rem', fontSize: '0.85rem' }}
                            placeholder="Začněte psát..."
                          />
                          <datalist id="table-cinv-list">
                            {inventarniUseky.map(inv => (
                              <option key={inv.cinv} value={inv.cinv}>{inv.cinv} - {inv.nazinv}</option>
                            ))}
                          </datalist>
                        </>
                      ) : (
                        item.cinv && item.inv_usek_nazev 
                          ? `${item.cinv} - ${item.inv_usek_nazev}` 
                          : (item.cinv || '-')
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {editingId === item.id ? (
                        <>
                          <input 
                            type="text"
                            list="table-budt-list"
                            value={editForm.budt} 
                            onChange={(e) => setEditForm({...editForm, budt: e.target.value})}
                            style={{ width: '100%', padding: '0.25rem', fontSize: '0.85rem' }}
                            placeholder="Začněte psát..."
                          />
                          <datalist id="table-budt-list">
                            {budovy.map(bud => (
                              <option key={bud.budt} value={bud.budt}>{bud.budt} - {bud.budovat}</option>
                            ))}
                          </datalist>
                        </>
                      ) : (
                        item.budt && item.budova_nazev 
                          ? `${item.budt} - ${item.budova_nazev}` 
                          : (item.budt || '-')
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {editingId === item.id ? (
                        <>
                          <input 
                            type="text"
                            list="table-mist-list"
                            value={editForm.mist} 
                            onChange={(e) => setEditForm({...editForm, mist: e.target.value})}
                            style={{ width: '100%', padding: '0.25rem', fontSize: '0.85rem' }}
                            placeholder="Začněte psát..."
                          />
                          <datalist id="table-mist-list">
                            {mistnosti
                              .filter(m => !editForm.budt || m.budt == editForm.budt)
                              .map(mis => (
                                <option key={mis.id} value={mis.mist}>{mis.mist} - {mis.mistt}</option>
                              ))
                            }
                          </datalist>
                        </>
                      ) : (
                        item.mist && item.mistnost_nazev 
                          ? `${item.mist} - ${item.mistnost_nazev}` 
                          : (item.mist || '-')
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', maxWidth: '150px' }}>
                      {editingId === item.id ? (
                        <input 
                          type="text" 
                          value={editForm.poznamka} 
                          onChange={(e) => setEditForm({...editForm, poznamka: e.target.value})}
                          style={{ width: '100%', padding: '0.25rem', fontSize: '0.85rem' }}
                        />
                      ) : (
                        item.poznamka || '-'
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {editingId === item.id ? (
                        <input 
                          type="text" 
                          value={editForm.ip_adresa} 
                          onChange={(e) => setEditForm({...editForm, ip_adresa: e.target.value})}
                          style={{ width: '100%', padding: '0.25rem', fontSize: '0.85rem' }}
                          placeholder="192.168..."
                        />
                      ) : (
                        item.ip_adresa || '-'
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {editingId === item.id ? (
                        <input 
                          type="text" 
                          value={editForm.seriove_cislo} 
                          onChange={(e) => setEditForm({...editForm, seriove_cislo: e.target.value})}
                          style={{ width: '100%', padding: '0.25rem', fontSize: '0.85rem' }}
                          placeholder="SN123..."
                        />
                      ) : (
                        item.seriove_cislo || '-'
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#64748b' }}>
                      {item.jmeno_uzivatele}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#64748b' }}>
                      {formatDateTime(item.datum_vytvoreni)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      {editingId === item.id ? (
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                          <button 
                            onClick={handleSaveEdit}
                            style={{
                              padding: '0.35rem 0.6rem',
                              background: '#22c55e',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                            title="Uložit"
                          >
                            <FaSave />
                          </button>
                          <button 
                            onClick={handleCancelEdit}
                            style={{
                              padding: '0.35rem 0.6rem',
                              background: '#64748b',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                            title="Zrušit"
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                          <button 
                            onClick={() => handleEditClick(item)}
                            style={{
                              padding: '0.35rem 0.6rem',
                              background: '#0891b2',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                            title="Upravit"
                          >
                            <FaEdit />
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            style={{
                              padding: '0.35rem 0.6rem',
                              background: '#dc2626',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                            title="Smazat"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Paging controls */}
        {items.length > itemsPerPage && (
          <div style={{ 
            marginTop: '1.5rem', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '0.5rem 1rem',
                background: currentPage === 1 ? '#cbd5e1' : '#0891b2',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <FaChevronLeft /> Předchozí
            </button>
            
            <span style={{ color: '#64748b', fontWeight: 'bold' }}>
              Stránka {currentPage} z {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '0.5rem 1rem',
                background: currentPage === totalPages ? '#cbd5e1' : '#0891b2',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              Další <FaChevronRight />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default InventuraPage;
