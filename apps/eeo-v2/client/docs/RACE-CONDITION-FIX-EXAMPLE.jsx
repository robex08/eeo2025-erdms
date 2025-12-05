// 🎯 PRAKTICKÝ PŘÍKLAD: Jak implementovat Race Condition Fix v jiné komponentě

import React, { useState, useEffect, useRef, useMemo } from 'react';

/**
 * SCÉNÁŘ:
 * Máte formulář pro editaci produktu, který:
 * 1. Načítá ČÍSELNÍKY (kategorie, značky, dodavatelé) z API
 * 2. Načítá DATA PRODUKTU z API (pokud je editace)
 * 
 * PROBLÉM:
 * Data produktu obsahují `categoryId: 5`, ale číselník kategorií
 * se načte později → select zůstane prázdný!
 * 
 * ŘEŠENÍ:
 * Implementace "Loading Gate" pattern z OrderForm25
 */

function ProductForm({ productId }) {
  // ===== KROK 1: STAVY PRO LOADING =====
  
  // Stav načítání číselníků
  const [isLoadingCiselniky, setIsLoadingCiselniky] = useState(true);
  
  // Stav načítání dat produktu (jen pro editaci)
  const [isLoadingFormData, setIsLoadingFormData] = useState(false);
  
  // ===== KROK 2: DATA STATES =====
  
  // Číselníky
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  
  // Data produktu
  const [formData, setFormData] = useState({
    name: '',
    categoryId: null,
    brandId: null,
    supplierId: null,
    price: ''
  });
  
  // ===== KROK 3: PROMISE PRO ČEKÁNÍ =====
  
  const dictionariesReadyPromiseRef = useRef(null);
  const dictionariesReadyResolveRef = useRef(null);
  
  // Vytvoření Promise při mount
  useEffect(() => {
    dictionariesReadyPromiseRef.current = new Promise((resolve) => {
      dictionariesReadyResolveRef.current = resolve;
    });
  }, []);
  
  // ===== KROK 4: NAČÍTÁNÍ ČÍSELNÍKŮ (VŽDY PRVNÍ!) =====
  
  useEffect(() => {
    const loadDictionaries = async () => {
      console.log('📚 1. Začínám načítat číselníky...');
      setIsLoadingCiselniky(true);
      
      try {
        // Paralelní načítání všech číselníků
        const [categoriesData, brandsData, suppliersData] = await Promise.all([
          fetch('/api/categories').then(r => r.json()),
          fetch('/api/brands').then(r => r.json()),
          fetch('/api/suppliers').then(r => r.json())
        ]);
        
        setCategories(categoriesData);
        setBrands(brandsData);
        setSuppliers(suppliersData);
        
        console.log('✅ 2. Číselníky načteny!', {
          categories: categoriesData.length,
          brands: brandsData.length,
          suppliers: suppliersData.length
        });
        
        // 🎯 KRITICKÉ: Resolve Promise - data jsou připravená!
        setIsLoadingCiselniky(false);
        if (dictionariesReadyResolveRef.current) {
          dictionariesReadyResolveRef.current(true);
        }
        
      } catch (error) {
        console.error('❌ Chyba při načítání číselníků:', error);
        setIsLoadingCiselniky(false);
        if (dictionariesReadyResolveRef.current) {
          dictionariesReadyResolveRef.current(false);
        }
      }
    };
    
    loadDictionaries();
  }, []); // Prázdné dependencies = spustit jednou při mount
  
  // ===== KROK 5: NAČÍTÁNÍ DAT PRODUKTU (PO ČÍSELNÍKÁCH!) =====
  
  useEffect(() => {
    // Pouze pro editaci (když máme productId)
    if (!productId) {
      return;
    }
    
    const loadProduct = async () => {
      console.log(`📦 3. Čekám na číselníky pro produkt #${productId}...`);
      
      // 🎯 ČEKEJ až budou číselníky hotové!
      await dictionariesReadyPromiseRef.current;
      
      console.log(`🔄 4. Číselníky hotové, načítám produkt #${productId}...`);
      setIsLoadingFormData(true);
      
      try {
        const response = await fetch(`/api/products/${productId}`);
        const productData = await response.json();
        
        console.log('✅ 5. Produkt načten:', productData);
        
        // Nastavit data do formuláře
        setFormData({
          name: productData.name,
          categoryId: productData.category_id,  // 🎯 Číselník je JIŽ načtený!
          brandId: productData.brand_id,        // 🎯 Select se vyplní správně!
          supplierId: productData.supplier_id,  // 🎯 Žádný race condition!
          price: productData.price
        });
        
        setIsLoadingFormData(false);
        
      } catch (error) {
        console.error('❌ Chyba při načítání produktu:', error);
        setIsLoadingFormData(false);
      }
    };
    
    loadProduct();
  }, [productId]); // Spustit při změně productId
  
  // ===== KROK 6: LOADING GATE =====
  
  // Definuj celkový loading stav
  const isFormLoading = useMemo(() => {
    // Číselníky se načítají → LOADING
    if (isLoadingCiselniky) {
      return true;
    }
    
    // Editační režim A načítají se data → LOADING
    if (productId && isLoadingFormData) {
      return true;
    }
    
    // Všechno je hotové → READY!
    return false;
  }, [isLoadingCiselniky, productId, isLoadingFormData]);
  
  // 🎯 LOADING GATE: Zobrazit spinner dokud nejsou data připravená
  if (isFormLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '400px',
        gap: '1rem'
      }}>
        <div className="spinner" />
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>
          {isLoadingCiselniky && !isLoadingFormData && '📚 Načítám číselníky...'}
          {isLoadingCiselniky && isLoadingFormData && '📚 Načítám číselníky a data produktu...'}
          {!isLoadingCiselniky && isLoadingFormData && '📦 Načítám data produktu...'}
        </div>
        <div style={{ fontSize: '0.9rem', color: '#666' }}>
          {isLoadingCiselniky && 'Zpracovávám seznamy pro výběrová pole...'}
          {!isLoadingCiselniky && isLoadingFormData && 'Zpracovávám data z databáze...'}
        </div>
      </div>
    );
  }
  
  // ===== KROK 7: FORMULÁŘ - DATA JSOU GARANTOVANĚ PŘIPRAVENÁ! =====
  
  console.log('🎉 6. Vykresluji formulář s daty:', {
    categories: categories.length,
    brands: brands.length,
    suppliers: suppliers.length,
    formData
  });
  
  return (
    <form>
      <h2>{productId ? `Editace produktu #${productId}` : 'Nový produkt'}</h2>
      
      {/* Text input - funguje vždy */}
      <div>
        <label>Název produktu:</label>
        <input 
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      
      {/* Select pro kategorii - NYNÍ SE VYPLNÍ SPRÁVNĚ! */}
      <div>
        <label>Kategorie:</label>
        <select 
          value={formData.categoryId || ''}
          onChange={(e) => setFormData({ ...formData, categoryId: parseInt(e.target.value) })}
        >
          <option value="">-- Vyberte kategorii --</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {/* ✅ Pokud formData.categoryId = 5 a categories obsahuje {id: 5, name: 'Elektronika'},
             select SPRÁVNĚ zobrazí "Elektronika" jako vybranou hodnotu! */}
      </div>
      
      {/* Select pro značku - NYNÍ SE VYPLNÍ SPRÁVNĚ! */}
      <div>
        <label>Značka:</label>
        <select 
          value={formData.brandId || ''}
          onChange={(e) => setFormData({ ...formData, brandId: parseInt(e.target.value) })}
        >
          <option value="">-- Vyberte značku --</option>
          {brands.map(brand => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Select pro dodavatele - NYNÍ SE VYPLNÍ SPRÁVNĚ! */}
      <div>
        <label>Dodavatel:</label>
        <select 
          value={formData.supplierId || ''}
          onChange={(e) => setFormData({ ...formData, supplierId: parseInt(e.target.value) })}
        >
          <option value="">-- Vyberte dodavatele --</option>
          {suppliers.map(sup => (
            <option key={sup.id} value={sup.id}>
              {sup.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Number input - funguje vždy */}
      <div>
        <label>Cena:</label>
        <input 
          type="number"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
        />
      </div>
      
      <button type="submit">Uložit produkt</button>
    </form>
  );
}

export default ProductForm;

/**
 * ===== SHRNUTÍ ŘEŠENÍ =====
 * 
 * 1️⃣ STAVY:
 *    - isLoadingCiselniky - načítají se číselníky?
 *    - isLoadingFormData - načítají se data produktu?
 * 
 * 2️⃣ PROMISE:
 *    - dictionariesReadyPromiseRef - Promise pro čekání
 *    - Resolve se po načtení číselníků
 * 
 * 3️⃣ POŘADÍ NAČÍTÁNÍ:
 *    a) Načti číselníky (categories, brands, suppliers)
 *    b) Resolve Promise
 *    c) ČEKEJ na Promise (await)
 *    d) Načti data produktu
 * 
 * 4️⃣ LOADING GATE:
 *    - if (isFormLoading) return <Spinner />
 *    - Zaručuje, že formulář se vykreslí AŽ když jsou data připravena
 * 
 * 5️⃣ VÝSLEDEK:
 *    - Select boxy jsou VŽDY správně vyplněné
 *    - ŽÁDNÝ race condition!
 * 
 * ===== JAK TESTOVAT =====
 * 
 * 1. Otevřít DevTools → Network tab
 * 2. Nastavit "Slow 3G" pro simulaci pomalé sítě
 * 3. Otevřít <ProductForm productId={123} />
 * 4. Ověřit:
 *    ✅ Zobrazí se spinner
 *    ✅ Po načtení jsou všechny selecty SPRÁVNĚ vyplněné
 *    ❌ Select je prázdný i když data dorazila (= race condition - OPRAVENO!)
 */
