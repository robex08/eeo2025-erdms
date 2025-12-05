/**
 * Order V2 Invoice API - Usage Examples
 * 
 * Praktické příklady použití nového Invoice API
 * Datum: 31. října 2025
 */

import { 
  createInvoiceWithAttachmentV2,
  createInvoiceV2,
  updateInvoiceV2 
} from '../services/api25invoices';

// ===================================================================
// PŘÍKLAD 1: Vytvoření faktury s přílohou (atomic)
// ===================================================================

async function example1_CreateInvoiceWithFile(orderId, file) {
  try {
    const result = await createInvoiceWithAttachmentV2({
      token: getCurrentToken(),
      username: getCurrentUsername(),
      order_id: orderId,
      
      // Povinné fieldy
      fa_cislo_vema: 'FA-2025-001',
      fa_datum_vystaveni: '2025-10-31',
      fa_castka: '25000.00',
      
      // Volitelné fieldy
      fa_datum_splatnosti: '2025-11-30', // ⭐ Toto bude fungovat!
      fa_datum_doruceni: '2025-10-31',
      fa_dorucena: 1,
      fa_strediska_kod: 'STR001',
      fa_poznamka: 'Poznámka k faktuře',
      
      // Soubor (povinný)
      file: file
    });
    
    if (result.status === 'ok') {
      console.log('✅ Faktura vytvořena!');
      console.log('Invoice ID:', result.data.invoice_id);
      console.log('Attachment ID:', result.data.attachment_id);
      console.log('Filename:', result.data.filename);
      return result.data;
    }
  } catch (error) {
    console.error('❌ Chyba při vytváření faktury s přílohou:', error.message);
    throw error;
  }
}

// ===================================================================
// PŘÍKLAD 2: Vytvoření faktury bez přílohy
// ===================================================================

async function example2_CreateInvoiceWithoutFile(orderId) {
  try {
    const result = await createInvoiceV2({
      token: getCurrentToken(),
      username: getCurrentUsername(),
      order_id: orderId,
      
      // Povinné fieldy
      fa_cislo_vema: 'FA-2025-002',
      fa_datum_vystaveni: '2025-10-31',
      fa_castka: '15000.00',
      
      // Volitelné fieldy
      fa_datum_splatnosti: '2025-12-31',
      fa_poznamka: 'Faktura bez přílohy'
    });
    
    if (result.status === 'ok') {
      console.log('✅ Faktura vytvořena (bez přílohy)!');
      console.log('Invoice ID:', result.data.invoice_id);
      return result.data;
    }
  } catch (error) {
    console.error('❌ Chyba při vytváření faktury:', error.message);
    throw error;
  }
}

// ===================================================================
// PŘÍKLAD 3: Aktualizace faktury (pouze změněné fieldy)
// ===================================================================

async function example3_UpdateInvoice(invoiceId) {
  try {
    const result = await updateInvoiceV2({
      token: getCurrentToken(),
      username: getCurrentUsername(),
      invoice_id: invoiceId,
      
      // Pouze fieldy které chceš změnit
      updateData: {
        fa_datum_splatnosti: '2025-12-15',
        fa_poznamka: 'Aktualizovaná poznámka',
        fa_strediska_kod: 'STR003'
      }
    });
    
    if (result.status === 'ok') {
      console.log('✅ Faktura aktualizována!');
      console.log('Updated fields:', result.data.updated_fields);
      console.log('Nové datum splatnosti:', result.data.fa_datum_splatnosti);
      return result.data;
    }
  } catch (error) {
    console.error('❌ Chyba při aktualizaci faktury:', error.message);
    throw error;
  }
}

// ===================================================================
// PŘÍKLAD 4: Komplexní workflow - vytvoř fakturu z ISDOC souboru
// ===================================================================

async function example4_CreateFromISDOC(orderId, isdocFile, parsedData) {
  try {
    // parsedData obsahuje data z ISDOC parseru
    const result = await createInvoiceWithAttachmentV2({
      token: getCurrentToken(),
      username: getCurrentUsername(),
      order_id: orderId,
      
      // Data z ISDOC
      fa_cislo_vema: parsedData.cisloFaktury,
      fa_datum_vystaveni: parsedData.datumVystaveni,
      fa_datum_splatnosti: parsedData.datumSplatnosti,
      fa_castka: parsedData.celkovaCastka,
      fa_dorucena: 1,
      fa_poznamka: 'Importováno z ISDOC',
      
      // Uložit ISDOC metadata
      rozsirujici_data: {
        isdoc: {
          polozky: parsedData.polozky,
          dodavatel: parsedData.dodavatel
        }
      },
      
      // ISDOC soubor
      file: isdocFile
    });
    
    if (result.status === 'ok') {
      console.log('✅ ISDOC faktura vytvořena!');
      console.log('Invoice ID:', result.data.invoice_id);
      return result.data;
    }
  } catch (error) {
    console.error('❌ Chyba při importu ISDOC:', error.message);
    throw error;
  }
}

// ===================================================================
// PŘÍKLAD 5: Error handling
// ===================================================================

async function example5_ErrorHandling(orderId, file) {
  try {
    const result = await createInvoiceWithAttachmentV2({
      token: getCurrentToken(),
      username: getCurrentUsername(),
      order_id: orderId,
      fa_cislo_vema: 'FA-2025-003',
      fa_datum_vystaveni: '2025-10-31',
      fa_castka: '10000.00',
      file: file
    });
    
    return result;
    
  } catch (error) {
    // Error message je již user-friendly
    switch (true) {
      case error.message.includes('token'):
        console.error('🔑 Problém s autentizací - přihlaste se znovu');
        // Redirect to login
        break;
        
      case error.message.includes('Chybí'):
        console.error('📋 Chybí povinné údaje:', error.message);
        // Zobraz formulář s chybějícími fieldy
        break;
        
      case error.message.includes('404'):
        console.error('🔍 Objednávka nenalezena');
        break;
        
      default:
        console.error('❌ Obecná chyba:', error.message);
    }
    
    throw error;
  }
}

// ===================================================================
// HELPER FUNKCE
// ===================================================================

function getCurrentToken() {
  // Implementace závisí na tvé auth logice
  return localStorage.getItem('token');
}

function getCurrentUsername() {
  // Implementace závisí na tvé auth logice
  return localStorage.getItem('username');
}

// ===================================================================
// USAGE V REACT KOMPONENÁTĚ
// ===================================================================

/**
 * Example React Component
 */
/*
import React, { useState } from 'react';
import { createInvoiceWithAttachmentV2 } from '../services/api25invoices';

function InvoiceUploadForm({ orderId }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const result = await createInvoiceWithAttachmentV2({
        token: getCurrentToken(),
        username: getCurrentUsername(),
        order_id: orderId,
        fa_cislo_vema: 'FA-2025-001',
        fa_datum_vystaveni: '2025-10-31',
        fa_datum_splatnosti: '2025-11-30',
        fa_castka: '25000.00',
        file: file
      });
      
      if (result.status === 'ok') {
        alert(`Faktura vytvořena! ID: ${result.data.invoice_id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="file" 
        onChange={(e) => setFile(e.target.files[0])} 
        required 
      />
      <button type="submit" disabled={loading || !file}>
        {loading ? 'Nahrávám...' : 'Vytvořit fakturu'}
      </button>
      {error && <div style={{color: 'red'}}>{error}</div>}
    </form>
  );
}
*/

export {
  example1_CreateInvoiceWithFile,
  example2_CreateInvoiceWithoutFile,
  example3_UpdateInvoice,
  example4_CreateFromISDOC,
  example5_ErrorHandling
};
