/**
 * 🔧 HOTFIX SCRIPT - Přepočet zůstatků v lednové knize
 * 
 * POUŽITÍ:
 * 1. Otevři pokladní knihu v prohlížeči
 * 2. Otevři Developer Console (F12)
 * 3. Zkopíruj a vlož tento celý skript
 * 4. Stiskni Enter
 * 
 * NEBO použij book_id jako parametr:
 * recalculateBook(123);  // kde 123 je ID tvé knihy
 */

async function recalculateBook(bookId = null) {
    try {
        // Získat autentizaci z localStorage
        const username = localStorage.getItem('username');
        const token = localStorage.getItem('token');
        
        if (!username || !token) {
            console.error('❌ Nejsi přihlášen! Přihlaš se v aplikaci.');
            return;
        }
        
        // Pokud není book_id zadáno, zkusit najít v URL
        if (!bookId) {
            const urlParams = new URLSearchParams(window.location.search);
            bookId = urlParams.get('book_id') || urlParams.get('bookId');
        }
        
        // Pokud stále nemáme book_id, zkusit najít v globální proměnné (může být v React state)
        if (!bookId && window.__CURRENT_BOOK_ID__) {
            bookId = window.__CURRENT_BOOK_ID__;
        }
        
        if (!bookId) {
            console.error('❌ Nezjištěno book_id. Použij: recalculateBook(123)');
            return;
        }
        
        console.log('🔄 Přepočítávám knihu ID:', bookId);
        
        // Zavolat API endpoint
        const response = await fetch('/api.eeo/api.php?endpoint=cashbook-force-recalculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                token,
                book_id: parseInt(bookId)
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'ok' || result.status === 'success') {
            console.log('✅ Úspěch!', result);
            console.log('📊 Kniha přepočítána:');
            console.log('   - Převod z předchozího:', result.data?.book?.prevod_z_predchoziho);
            console.log('   - Počáteční stav:', result.data?.book?.pocatecni_stav);
            console.log('   - Koncový stav:', result.data?.book?.koncovy_stav);
            console.log('');
            console.log('🔄 REFRESH stránku (F5) pro zobrazení aktualizovaných dat!');
            
            // Auto-refresh za 2 sekundy
            setTimeout(() => {
                console.log('♻️ Refreshuji stránku...');
                window.location.reload();
            }, 2000);
            
        } else {
            console.error('❌ Chyba:', result.message || result.err);
        }
        
    } catch (error) {
        console.error('❌ Síťová chyba:', error);
    }
}

// Pokud je v URL book_id, automaticky spustit
const urlParams = new URLSearchParams(window.location.search);
const autoBookId = urlParams.get('book_id') || urlParams.get('bookId');

if (autoBookId) {
    console.log('📖 Detekováno book_id v URL:', autoBookId);
    console.log('🔄 Spouštím automatický přepočet za 3 sekundy...');
    console.log('💡 Pro zrušení zadej: clearTimeout(window.__recalcTimer__)');
    
    window.__recalcTimer__ = setTimeout(() => {
        recalculateBook(autoBookId);
    }, 3000);
} else {
    console.log('💡 Pro manuální spuštění zadej: recalculateBook(book_id)');
    console.log('   Příklad: recalculateBook(123)');
}

// Export do window pro globální přístup
window.recalculateBook = recalculateBook;
