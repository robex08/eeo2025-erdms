import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes, faClock, faSpinner } from '@fortawesome/free-solid-svg-icons';
import './OrderApprovalCard.css';

/**
 * 📱 Karta objednávky ke schválení v mobilním dashboardu
 * Zobrazuje: Předmět, Max cena s DPH, Zdroj financování
 * Akce: Schválit, Zamítnout, Čeká se
 */
function OrderApprovalCard({ order, onApprove, onReject, onWait, loading }) {
  const [localLoading, setLocalLoading] = useState(null); // 'approve', 'reject', 'wait'

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleAction = async (action, handler) => {
    setLocalLoading(action);
    try {
      await handler(order);
    } finally {
      setLocalLoading(null);
    }
  };

  const maxCena = parseFloat(order.max_cena_s_dph || 0);
  
  // 🔍 DEBUG: Výpis struktury order
  console.log('[OrderApprovalCard] Order ID:', order.id);
  console.log('[OrderApprovalCard] _enriched keys:', order._enriched ? Object.keys(order._enriched) : 'NO _enriched');
  console.log('[OrderApprovalCard] objednatel_id:', order.objednatel_id);
  console.log('[OrderApprovalCard] garant_id:', order.garant_id);
  console.log('[OrderApprovalCard] _enriched.objednatel:', order._enriched?.objednatel);
  console.log('[OrderApprovalCard] _enriched.garant:', order._enriched?.garant);
  console.log('[OrderApprovalCard] financovani:', order.financovani);
  
  // ✅ Zdroj financování - parsování a zobrazení detailů
  let zdrojFinancovani = 'Neuvedeno';
  let financovaniDetail = null;
  let financovaniData = null;
  
  if (order.financovani) {
    // Parsovat financovani objekt
    if (typeof order.financovani === 'object') {
      financovaniData = order.financovani;
    } else if (typeof order.financovani === 'string') {
      try {
        financovaniData = JSON.parse(order.financovani);
      } catch {
        // Není JSON, použij jako string
        zdrojFinancovani = order.financovani;
      }
    }
    
    if (financovaniData) {
      // Získat TYP financování (kod_stavu nebo typ)
      const typKod = financovaniData.kod_stavu || financovaniData.typ || '';
      
      // Mapování kodů na lidské názvy (podle OrderForm25 financovaniOptions)
      const typyFinancovaniMap = {
        'LP': 'Limitovaný příslib',
        'SMLOUVA': 'Smlouva',
        'INDIVIDUALNI_SCHVALENI': 'Individuální schválení',
        'INDIVIDUALNI': 'Individuální schválení',
        'POJISTNA_UDALOST': 'Pojistná událost',
        'POJISTNE_UDALOSTI': 'Pojistná událost'
      };
      
      // Název zdroje - priorita: nazev_stavu > nazev > mapování z kódu > kód
      zdrojFinancovani = financovaniData.nazev_stavu 
        || financovaniData.nazev 
        || typyFinancovaniMap[typKod] 
        || typKod 
        || 'Neuvedeno';
      
      // Detail podle typu
      if (typKod === 'LP') {
        // LP kódy - zobrazit cislo_lp (zkratky) místo ID
        if (financovaniData.lp_nazvy && Array.isArray(financovaniData.lp_nazvy)) {
          // lp_nazvy je array objektů: [{id, cislo_lp, nazev}, ...]
          const lpCodes = financovaniData.lp_nazvy
            .map(lp => lp.cislo_lp || lp.id)
            .filter(Boolean)
            .join(', ');
          financovaniDetail = lpCodes || 'LP';
        } else if (financovaniData.lp_kody && Array.isArray(financovaniData.lp_kody)) {
          // Fallback: zobrazit ID
          financovaniDetail = financovaniData.lp_kody.join(', ');
        }
      } else if (typKod === 'SMLOUVA' && financovaniData.cislo_smlouvy) {
        // Číslo smlouvy
        financovaniDetail = financovaniData.cislo_smlouvy;
      } else if ((typKod === 'INDIVIDUALNI_SCHVALENI' || typKod === 'INDIVIDUALNI') && financovaniData.individualni_schvaleni) {
        // Individuální schválení
        financovaniDetail = financovaniData.individualni_schvaleni;
      } else if ((typKod === 'POJISTNA_UDALOST' || typKod === 'POJISTNE_UDALOSTI') && financovaniData.pojistna_udalost_cislo) {
        // Pojistná událost
        financovaniDetail = financovaniData.pojistna_udalost_cislo;
      }
    }
  } else if (order.zpusob_financovani) {
    zdrojFinancovani = order.zpusob_financovani;
  }
  
  const predmet = order.predmet || 'Bez názvu';
  const orderNumber = order.cislo_objednavky || order.ev_cislo || `#${order.id}`;
  const isMimoradna = order.mimoradna_udalost === 1 || order.mimoradna_udalost === true;
  
  // ✅ Objednatel - enriched data jsou přímo v order.objednatel (ne v _enriched)
  let objednatel = 'Neznámý';
  if (order.objednatel?.cele_jmeno) {
    objednatel = order.objednatel.cele_jmeno;
  } else if (order._enriched?.objednatel?.cele_jmeno) {
    objednatel = order._enriched.objednatel.cele_jmeno;
  } else if (order.objednatel_cele_jmeno) {
    objednatel = order.objednatel_cele_jmeno;
  } else if (order.objednatel_jmeno) {
    objednatel = order.objednatel_jmeno;
  } else if (order.jmeno) {
    objednatel = order.jmeno;
  }
  
  // ✅ Garant - enriched data jsou v order.garant_uzivatel (ne _enriched.garant)
  let garant = null;
  if (order.garant_uzivatel?.cele_jmeno) {
    garant = order.garant_uzivatel.cele_jmeno;
  } else if (order._enriched?.garant?.cele_jmeno) {
    garant = order._enriched.garant.cele_jmeno;
  } else if (order.garant_cele_jmeno) {
    garant = order.garant_cele_jmeno;
  } else if (order.garant_jmeno) {
    garant = order.garant_jmeno;
  }

  return (
    <div className={`mobile-approval-card ${isMimoradna ? 'urgent' : ''}`}>
      {/* Header s číslem objednávky a objednatelem */}
      <div className="mobile-approval-header">
        <span className="mobile-approval-number">
          {orderNumber}
          {isMimoradna && <span className="mobile-approval-urgent-badge"> ⚠️</span>}
        </span>
        <span className="mobile-approval-objednatel">{objednatel}</span>
      </div>

      {/* Obsah - předmět */}
      <div className="mobile-approval-subject">
        {predmet}
      </div>

      {/* Detaily - cena a zdroj */}
      <div className="mobile-approval-details">
        <div className="mobile-approval-detail-row">
          {garant && (
            <div className="mobile-approval-detail mobile-approval-detail-half">
              <span className="mobile-approval-label">Garant:</span>
              <span className="mobile-approval-value">{garant}</span>
            </div>
          )}
          <div className="mobile-approval-detail mobile-approval-detail-half">
            <span className="mobile-approval-label">Max. cena s DPH:</span>
            <span className="mobile-approval-value">{formatCurrency(maxCena)}</span>
          </div>
        </div>
        <div className="mobile-approval-detail">
          <span className="mobile-approval-label">Zdroj financování:</span>
          <span className="mobile-approval-value">
            {financovaniDetail ? `${zdrojFinancovani} : ${financovaniDetail}` : zdrojFinancovani}
          </span>
        </div>
        {order.financovani?.poznamka && (
          <div className="mobile-approval-detail">
            <span className="mobile-approval-label">Poznámka:</span>
            <span className="mobile-approval-value">{order.financovani.poznamka}</span>
          </div>
        )}
      </div>

      {/* Akce - 3 čtvercová tlačítka */}
      <div className="mobile-approval-actions">
        <button
          className="mobile-approval-btn approve"
          onClick={() => handleAction('approve', onApprove)}
          disabled={loading || localLoading !== null}
          title="Schválit objednávku"
        >
          {localLoading === 'approve' ? (
            <FontAwesomeIcon icon={faSpinner} spin />
          ) : (
            <FontAwesomeIcon icon={faCheck} />
          )}
          <span>Schválit</span>
        </button>

        <button
          className="mobile-approval-btn reject"
          onClick={() => handleAction('reject', onReject)}
          disabled={loading || localLoading !== null}
          title="Zamítnout objednávku"
        >
          {localLoading === 'reject' ? (
            <FontAwesomeIcon icon={faSpinner} spin />
          ) : (
            <FontAwesomeIcon icon={faTimes} />
          )}
          <span>Zamítnout</span>
        </button>

        <button
          className="mobile-approval-btn wait"
          onClick={() => handleAction('wait', onWait)}
          disabled={loading || localLoading !== null}
          title="Označit jako čeká se"
        >
          {localLoading === 'wait' ? (
            <FontAwesomeIcon icon={faSpinner} spin />
          ) : (
            <FontAwesomeIcon icon={faClock} />
          )}
          <span>Čeká se</span>
        </button>
      </div>
    </div>
  );
}

export default OrderApprovalCard;
