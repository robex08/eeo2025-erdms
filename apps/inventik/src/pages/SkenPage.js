// Stránka pro skenování čárového kódu pomocí kamery
import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { FaBarcode, FaCamera, FaCheckCircle, FaEdit, FaSave, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import './SkenPage.css';

function SkenPage() {
  const [scanning, setScanning] = useState(false);
  const [scanningSerialNumber, setScanningSerialNumber] = useState(false); // Skenování sériového čísla
  const [scannedCode, setScannedCode] = useState(null);
  const [itemDetail, setItemDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  
  // Ref pro scanner element
  const scannerRef = useRef(null);
  const html5QrcodeRef = useRef(null);
  const lastScanRef = useRef({ code: null, time: 0 });
  
  // Číselníky pro selecty
  const [inventarniUseky, setInventarniUseky] = useState([]);
  const [budovy, setBudovy] = useState([]);
  const [mistnosti, setMistnosti] = useState([]);
  
  // Formulářová data
  const [formData, setFormData] = useState({
    cinv: '',
    budt: '',
    mist: '',
    poznamka: '',
    seriove_cislo: '',
    ip_adresa: ''
  });

  // Načíst číselníky při načtení komponenty
  useEffect(() => {
    fetchCiselniky();
  }, []);

  const fetchCiselniky = async () => {
    try {
      const isDev = window.location.pathname.startsWith('/dev/');
      const apiUrl = isDev ? '/dev/api.inventik/api.php' : '/api.inventik/api.php';
      
      // Paralelní načtení všech číselníků
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

  // Formátování data do českého formátu DD.MM.YYYY
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  useEffect(() => {
    const startScanner = async () => {
      if (scanning && scannerRef.current) {
        try {
          console.log('🎥 Inicializuji Html5Qrcode scanner...');
          
          const html5Qrcode = new Html5Qrcode("reader");
          html5QrcodeRef.current = html5Qrcode;

          // Minimální konfigurace - jen základní nastavení
          const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          };

          const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            const now = Date.now();
            
            // Anti-duplicate
            if (lastScanRef.current.code === decodedText && 
                now - lastScanRef.current.time < 2000) {
              return;
            }
            
            lastScanRef.current = { code: decodedText, time: now };
            console.log('✅ Kód detekován:', decodedText);
            
            // Zastavit a zpracovat
            html5Qrcode.stop().then(() => {
              setScannedCode(decodedText);
              setScanning(false);
              fetchItemDetail(decodedText);
            }).catch(err => console.error('Stop error:', err));
          };

          // Získat kamery
          const devices = await Html5Qrcode.getCameras();
          console.log('📹 Nalezeno kamer:', devices.length, devices);
          
          if (devices && devices.length > 0) {
            // Prioritně hledat ZADNÍ kameru podle názvu
            let selectedCamera = null;
            
            for (const device of devices) {
              const label = device.label.toLowerCase();
              console.log('🎥 Kamera:', device.label);
              
              if (label.includes('back') || 
                  label.includes('rear') || 
                  label.includes('environment') ||
                  label.includes('zadní') ||
                  label.includes('hlavní')) {
                selectedCamera = device;
                console.log('✅ Nalezena zadní kamera:', device.label);
                break;
              }
            }
            
            // Pokud nenalezena zadní, použij poslední v seznamu
            if (!selectedCamera) {
              selectedCamera = devices[devices.length - 1];
              console.log('⚠️ Zadní kamera nenalezena, používám:', selectedCamera.label);
            }
            
            const cameraId = selectedCamera.id;
            console.log('✅ Používám kameru ID:', cameraId);
            
            await html5Qrcode.start(
              cameraId,
              config,
              qrCodeSuccessCallback,
              undefined // onError callback - necháme undefined pro tišší chování
            );
            
            console.log('✅ Scanner spuštěn');
          } else {
            throw new Error('Žádná kamera nebyla nalezena');
          }
        } catch (err) {
          console.error('❌ Chyba při inicializaci:', err);
          setError('Chyba kamery: ' + err.message);
          setScanning(false);
        }
      }
    };

    startScanner();

    return () => {
      // Cleanup
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        console.log('🛑 Zastavuji scanner');
        html5QrcodeRef.current.stop().catch(err => console.error('Cleanup error:', err));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  // Scanner pro sériové číslo
  useEffect(() => {
    const startSerialScanner = async () => {
      if (scanningSerialNumber && scannerRef.current) {
        try {
          console.log('🔢 Spouštím scanner pro sériové číslo...');
          
          const html5Qrcode = new Html5Qrcode("reader");
          html5QrcodeRef.current = html5Qrcode;

          const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          };

          const serialCodeCallback = (decodedText) => {
            console.log('✅ Sériové číslo detekováno:', decodedText);
            
            // Zastavit scanner a vyplnit sériové číslo
            html5Qrcode.stop().then(() => {
              setFormData(prev => ({ ...prev, seriove_cislo: decodedText }));
              setScanningSerialNumber(false);
            }).catch(err => console.error('Stop error:', err));
          };

          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            // Prioritně hledat ZADNÍ kameru
            let selectedCamera = null;
            
            for (const device of devices) {
              const label = device.label.toLowerCase();
              
              if (label.includes('back') || 
                  label.includes('rear') || 
                  label.includes('environment') ||
                  label.includes('zadní') ||
                  label.includes('hlavní')) {
                selectedCamera = device;
                console.log('✅ Pro sériové číslo: zadní kamera', device.label);
                break;
              }
            }
            
            if (!selectedCamera) {
              selectedCamera = devices[devices.length - 1];
              console.log('⚠️ Pro sériové číslo: používám', selectedCamera.label);
            }
            
            const cameraId = selectedCamera.id;
            
            await html5Qrcode.start(
              cameraId,
              config,
              serialCodeCallback,
              undefined
            );
            
            console.log('✅ Serial scanner spuštěn');
          }
        } catch (err) {
          console.error('❌ Chyba při skenování sériového čísla:', err);
          setScanningSerialNumber(false);
        }
      }
    };

    startSerialScanner();

    return () => {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(err => console.error('Serial cleanup error:', err));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanningSerialNumber]);

  const fetchItemDetail = async (code) => {
    setLoading(true);
    setError(null);
    
    try {
      const isDev = window.location.pathname.startsWith('/dev/');
      const apiUrl = isDev ? '/dev/api.inventik/api.php' : '/api.inventik/api.php';
      
      console.log('📦 Načítám detail majetku:', code);
      const response = await fetch(`${apiUrl}?endpoint=majetek&cislo=${encodeURIComponent(code)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 Detail majetku načten:', data);
      
      if (data.success && data.data) {
        setItemDetail(data.data);
        // Předvyplnit formulář načtenými daty
        setFormData({
          cinv: data.data.cinv || '',
          budt: data.data.budt || '',
          mist: data.data.mist || '',
          poznamka: '',
          seriove_cislo: '',
          ip_adresa: ''
        });
        
        // Zkontrolovat, zda už nebyl majetek naskenován
        console.log('🔍 Spouštím kontrolu duplicity...');
        await checkDuplicate(code);
      } else {
        // Majetek nenalezen - umožnit založit novou kartu
        console.log('⚠️ Majetek nenalezen v databázi, umožňuji založit novou kartu');
        setItemDetail(null);
        setFormData({
          cinv: '',
          budt: '',
          mist: '',
          poznamka: '',
          seriove_cislo: '',
          ip_adresa: ''
        });
        // Zkontrolovat duplicitu i pro nenalezený majetek
        await checkDuplicate(code);
      }
    } catch (err) {
      console.error('Error fetching item:', err);
      setError('Chyba při načítání dat: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkDuplicate = async (code) => {
    try {
      const isDev = window.location.pathname.startsWith('/dev/');
      const apiUrl = isDev ? '/dev/api.inventik/api.php' : '/api.inventik/api.php';
      
      console.log('🔍 Kontrola duplicity pro:', code);
      const response = await fetch(`${apiUrl}?endpoint=inventura_check_duplicate&cislo=${encodeURIComponent(code)}`);
      const data = await response.json();
      
      console.log('📋 Výsledek kontroly duplicity:', data);
      
      if (data.success && data.exists) {
        const scanDate = new Date(data.data.datum_vytvoreni);
        const formattedDate = `${String(scanDate.getDate()).padStart(2, '0')}.${String(scanDate.getMonth() + 1).padStart(2, '0')}.${scanDate.getFullYear()} ${String(scanDate.getHours()).padStart(2, '0')}:${String(scanDate.getMinutes()).padStart(2, '0')}`;
        
        console.log('⚠️ DUPLICITA NALEZENA! Uživatel:', data.data.jmeno_uzivatele, 'Datum:', formattedDate);
        
        setDuplicateWarning({
          user: data.data.jmeno_uzivatele,
          date: formattedDate
        });
      } else {
        console.log('✅ Majetek ještě nebyl naskenován');
        setDuplicateWarning(null);
      }
    } catch (err) {
      console.error('❌ Error checking duplicate:', err);
      // Nezobrazovat chybu uživateli, jen logovat
    }
  };

  const startScanning = () => {
    setScanning(true);
    setScannedCode(null);
    setItemDetail(null);
    setError(null);
    setEditMode(false);
    setDuplicateWarning(null);
  };

  const resetScanner = () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      html5QrcodeRef.current.stop().catch(err => console.error('Reset error:', err));
    }
    setScanning(false);
    setScannedCode(null);
    setItemDetail(null);
    setError(null);
    setEditMode(false);
    setDuplicateWarning(null);
  };

  const handleCancelScanning = () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      html5QrcodeRef.current.stop().catch(err => console.error('Cancel error:', err));
    }
    setScanning(false);
  };

  const handleEditClick = () => {
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    // Reset formuláře na původní hodnoty
    if (itemDetail) {
      setFormData({
        cinv: itemDetail.cinv || '',
        budt: itemDetail.budt || '',
        mist: itemDetail.mist || '',
        poznamka: '',
        seriove_cislo: '',
        ip_adresa: ''
      });
    }
  };

  const handleSaveInventory = async () => {
    const userName = localStorage.getItem('inventik_user_name');
    
    if (!userName) {
      alert('Uživatel není přihlášen! Vraťte se na úvodní stránku.');
      return;
    }
    
    setSaving(true);
    
    try {
      const isDev = window.location.pathname.startsWith('/dev/');
      const apiUrl = isDev ? '/dev/api.inventik/api.php' : '/api.inventik/api.php';
      
      const payload = {
        cislo_majetku: scannedCode,
        nazev: itemDetail?.nazev || null,
        datum_zarazeni: itemDetail?.datum_zarazeni || null,
        cena_mj_num: itemDetail?.cena_mj_num || null,
        cinv: formData.cinv || null,
        budt: formData.budt || null,
        mist: formData.mist || null,
        poznamka: formData.poznamka || null,
        seriove_cislo: formData.seriove_cislo || null,
        ip_adresa: formData.ip_adresa || null,
        metadata: null,
        jmeno_uzivatele: userName
      };
      
      const response = await fetch(`${apiUrl}?endpoint=inventura_save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('✓ Majetek byl úspěšně uložen do inventury!');
        resetScanner();
      } else {
        alert('Chyba při ukládání: ' + (result.error || 'Neznámá chyba'));
      }
    } catch (err) {
      console.error('Error saving inventory:', err);
      alert('Chyba při ukládání: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sken-page">
      <div className="page-header">
        <FaBarcode className="page-icon" />
        <h1>Skenování čárového kódu</h1>
        <p>Nasměrujte kameru na čárový kód položky majetku</p>
      </div>

      {!scanning && !scannedCode && (
        <div className="scanner-start">
          <button className="btn-primary btn-large" onClick={startScanning}>
            <FaCamera /> Spustit kameru
          </button>
        </div>
      )}

      {scanning && (
        <div className="scanner-container">
          <div id="reader" ref={scannerRef} className="barcode-scanner"></div>
          <button className="btn-secondary" onClick={handleCancelScanning}>
            Zrušit skenování
          </button>
        </div>
      )}

      {scanningSerialNumber && (
        <div className="scanner-container">
          <h3 style={{ color: '#0e7490', marginBottom: '1rem' }}>
            <FaBarcode style={{ marginRight: '0.5rem' }} />
            Skenování sériového čísla
          </h3>
          <div id="reader" ref={scannerRef} className="barcode-scanner"></div>
          <button className="btn-secondary" onClick={() => setScanningSerialNumber(false)}>
            Zrušit skenování
          </button>
        </div>
      )}

      {scannedCode && !editMode && (
        <div className="scan-result">
          <div className="success-badge">
            <FaCheckCircle /> Naskenováno
          </div>
          <div className="scanned-code">
            <strong>Čárový kód:</strong> {scannedCode}
          </div>

          {loading && <div className="loading">Načítám detail...</div>}

          {!loading && itemDetail && (
            <div className="item-detail">
              <div className="confirmation-box">
                <FaCheckCircle className="confirm-icon" />
                <h2>✓ Majetek byl nalezen v databázi</h2>
              </div>

              {duplicateWarning && (
                <div className="warning-box">
                  <FaExclamationTriangle className="warning-icon" />
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '1.05rem', display: 'block', marginBottom: '0.75rem' }}>
                      ⚠️ Tento majetek už byl inventarizován!
                    </strong>
                    <div style={{ 
                      background: 'rgba(255, 255, 255, 0.7)', 
                      padding: '0.75rem', 
                      borderRadius: '6px',
                      marginTop: '0.5rem'
                    }}>
                      <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.6' }}>
                        <strong style={{ color: '#92400e' }}>Přidal:</strong> <span style={{ fontWeight: 600, color: '#78350f' }}>{duplicateWarning.user}</span>
                      </p>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem', lineHeight: '1.6' }}>
                        <strong style={{ color: '#92400e' }}>Datum:</strong> <span style={{ fontWeight: 600, color: '#78350f' }}>{duplicateWarning.date}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="detail-grid">
                <div className="detail-row highlight">
                  <span className="detail-label">Název:</span>
                  <span className="detail-value"><strong>{itemDetail.nazev || '-'}</strong></span>
                </div>
                <div className="detail-row highlight">
                  <span className="detail-label">Datum zařazení:</span>
                  <span className="detail-value"><strong>{formatDate(itemDetail.datum_zarazeni)}</strong></span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Inventární číslo:</span>
                  <span className="detail-value">{itemDetail.cislo || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Pořizovací cena:</span>
                  <span className="detail-value">{itemDetail.cena_mj_num ? `${itemDetail.cena_mj_num} Kč` : '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">cinv:</span>
                  <span className="detail-value">
                    {itemDetail.cinv && itemDetail.inv_usek_nazev 
                      ? `${itemDetail.cinv} - ${itemDetail.inv_usek_nazev}`
                      : (itemDetail.cinv || '-')
                    }
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">budt:</span>
                  <span className="detail-value">
                    {itemDetail.budt && itemDetail.budova_nazev 
                      ? `${itemDetail.budt} - ${itemDetail.budova_nazev}`
                      : (itemDetail.budt || '-')
                    }
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">mist:</span>
                  <span className="detail-value">
                    {itemDetail.mist && itemDetail.mistnost_nazev 
                      ? `${itemDetail.mist} - ${itemDetail.mistnost_nazev}`
                      : (itemDetail.mist || '-')
                    }
                  </span>
                </div>
              </div>

              <div className="action-buttons">
                <button className="btn-primary btn-action" onClick={handleEditClick}>
                  <FaEdit /> Upravit a uložit
                </button>
                <button className="btn-secondary btn-action" onClick={resetScanner}>
                  Skenovat další
                </button>
              </div>
            </div>
          )}

          {!loading && !itemDetail && (
            <div className="item-detail">
              <div className="warning-box" style={{ marginBottom: '1.5rem' }}>
                <FaExclamationTriangle className="warning-icon" />
                <div>
                  <strong>Majetek nebyl nalezen v databázi</strong>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                    Čárový kód: <strong style={{ fontFamily: 'monospace', background: '#fff', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{scannedCode}</strong>
                  </p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#78350f' }}>
                    Můžete i tak založit novou kartu inventarizovaného majetku.
                  </p>
                </div>
              </div>

              {duplicateWarning && (
                <div className="warning-box" style={{ marginBottom: '1.5rem' }}>
                  <FaExclamationTriangle className="warning-icon" />
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '1.05rem', display: 'block', marginBottom: '0.75rem' }}>
                      ⚠️ Tento kód už byl inventarizován!
                    </strong>
                    <div style={{ 
                      background: 'rgba(255, 255, 255, 0.7)', 
                      padding: '0.75rem', 
                      borderRadius: '6px',
                      marginTop: '0.5rem'
                    }}>
                      <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.6' }}>
                        <strong style={{ color: '#92400e' }}>Přidal:</strong> <span style={{ fontWeight: 600, color: '#78350f' }}>{duplicateWarning.user}</span>
                      </p>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem', lineHeight: '1.6' }}>
                        <strong style={{ color: '#92400e' }}>Datum:</strong> <span style={{ fontWeight: 600, color: '#78350f' }}>{duplicateWarning.date}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="action-buttons">
                <button className="btn-primary btn-action" onClick={handleEditClick}>
                  <FaEdit /> Založit novou kartu
                </button>
                <button className="btn-secondary btn-action" onClick={resetScanner}>
                  Skenovat další
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {editMode && (
        <div className="edit-form-container">
          <h2><FaEdit /> {itemDetail ? 'Úprava naskenovaného majetku' : 'Nová karta majetku'}</h2>
          
          <div className="form-group">
            <label>Čárový kód (read-only)</label>
            <input type="text" value={scannedCode} disabled />
          </div>

          {itemDetail && (
            <>
              <div className="form-group">
                <label>Název (read-only)</label>
                <input type="text" value={itemDetail.nazev || '-'} disabled />
              </div>

              <div className="form-group">
                <label>Datum zařazení (read-only)</label>
                <input type="text" value={formatDate(itemDetail.datum_zarazeni)} disabled />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Inventární úsek (cinv)</label>
            <input 
              type="text"
              list="cinv-list"
              value={formData.cinv} 
              onChange={(e) => setFormData({...formData, cinv: e.target.value})}
              placeholder="Začněte psát nebo vyberte..."
            />
            <datalist id="cinv-list">
              {inventarniUseky.map(item => (
                <option key={item.cinv} value={item.cinv}>
                  {item.cinv} - {item.nazinv}
                </option>
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label>Budova (budt)</label>
            <input 
              type="text"
              list="budt-list"
              value={formData.budt} 
              onChange={(e) => setFormData({...formData, budt: e.target.value})}
              placeholder="Začněte psát nebo vyberte..."
            />
            <datalist id="budt-list">
              {budovy.map(item => (
                <option key={item.budt} value={item.budt}>
                  {item.budt} - {item.budovat}
                </option>
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label>Místnost (mist)</label>
            <input 
              type="text"
              list="mist-list"
              value={formData.mist} 
              onChange={(e) => setFormData({...formData, mist: e.target.value})}
              placeholder="Začněte psát nebo vyberte..."
            />
            <datalist id="mist-list">
              {mistnosti
                .filter(m => !formData.budt || m.budt == formData.budt)
                .map(item => (
                  <option key={item.id} value={item.mist}>
                    {item.mist} - {item.mistt}
                  </option>
                ))
              }
            </datalist>
          </div>

          <div className="form-group">
            <label>Poznámka (volitelné)</label>
            <textarea 
              value={formData.poznamka} 
              onChange={(e) => setFormData({...formData, poznamka: e.target.value})}
              rows="3"
              placeholder="Volitelná poznámka k inventuře..."
            />
          </div>

          <div className="form-group">
            <label>Sériové číslo (volitelné)</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input 
                type="text" 
                value={formData.seriove_cislo} 
                onChange={(e) => setFormData({...formData, seriove_cislo: e.target.value})}
                placeholder="např. SN123456789"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={() => setScanningSerialNumber(true)}
                style={{
                  padding: '0.6rem 1rem',
                  background: 'linear-gradient(135deg, #0284c7, #0891b2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}
                title="Naskenovat sériové číslo"
              >
                <FaBarcode /> Skenovat
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>IP adresa (volitelné)</label>
            <input 
              type="text" 
              value={formData.ip_adresa} 
              onChange={(e) => setFormData({...formData, ip_adresa: e.target.value})}
              placeholder="např. 192.168.1.100"
            />
          </div>

          <div className="action-buttons">
            <button 
              className="btn-primary btn-action" 
              onClick={handleSaveInventory}
              disabled={saving}
            >
              <FaSave /> {saving ? 'Ukládám...' : 'Uložit do inventury'}
            </button>
            <button className="btn-secondary btn-action" onClick={handleCancelEdit}>
              <FaTimes /> Zrušit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SkenPage;
