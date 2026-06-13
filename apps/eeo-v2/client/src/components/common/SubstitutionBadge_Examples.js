import React from 'react';
import styled from 'styled-components';

/**
 * 🎯 Příklad integrace SubstitutionBadge do OrdersTableV3
 * 
 * Místo:
 * <div style={{ lineHeight: '1.3' }}>
 *   <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prikazce}</div>
 *   <div style={{ fontSize: '0.85em', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{schvalovatel}</div>
 * </div>
 * 
 * Bude:
 * <div style={{ lineHeight: '1.3' }}>
 *   <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
 *     {prikazce}
 *     <SubstitutionBadge substitutionInfo={order.substitution_info?.schvalovatel} actionLabel="Schváleno" />
 *   </div>
 *   <div style={{ fontSize: '0.85em', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
 *     {schvalovatel}
 *     <SubstitutionBadge substitutionInfo={order.substitution_info?.schvalovatel} actionLabel="Schváleno" />
 *   </div>
 * </div>
 */

export const OrdersTableV3_IntegrationExample = `
// V OrdersTableV3.js - v columns[], najdi sloupec 'prikazce_schvalovatel':

import SubstitutionBadge from './common/SubstitutionBadge';

// Pak v cell funkcích:

{
  accessorKey: 'prikazce_schvalovatel',
  id: 'prikazce_schvalovatel',
  header: 'Příkazce / Schvalovatel',
  cell: ({ row }) => {
    const order = row.original;
    const prikazce = (order.prikazce_prijmeni && order.prikazce_jmeno)
      ? \`\${order.prikazce_prijmeni} \${order.prikazce_jmeno}\`
      : (order.prikazce_prijmeni || order.prikazce_jmeno || '---');
    const schvalovatel = (order.schvalovatel_prijmeni && order.schvalovatel_jmeno)
      ? \`\${order.schvalovatel_prijmeni} \${order.schvalovatel_jmeno}\`
      : (order.schvalovatel_prijmeni || order.schvalovatel_jmeno || '---');
    
    return (
      <div style={{ lineHeight: '1.3' }}>
        <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {prikazce}
          <SubstitutionBadge 
            substitutionInfo={order.substitution_info?.schvalovatel} 
            actionLabel="Schváleno" 
          />
        </div>
        <div style={{ fontSize: '0.85em', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {schvalovatel}
          <SubstitutionBadge 
            substitutionInfo={order.substitution_info?.schvalovatel} 
            actionLabel="Schváleno" 
          />
        </div>
      </div>
    );
  },
  size: 165,
  minSize: 140,
  maxSize: 240,
  enableSorting: true,
},
`;

/**
 * 🎯 Příklad pro OrderExpandedRowV3 - Detail objednávky
 */
export const OrderExpandedRowV3_IntegrationExample = `
// V OrderExpandedRowV3.js - kde se zobrazuje schvalovatel:

import SubstitutionBadge from '../common/SubstitutionBadge';

// Pak ve vrenderu:

{(detail.schvalovatel_jmeno || detail.schvalovatel_prijmeni) && (
  <div style={{ marginBottom: '0.75rem' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0 1rem', alignItems: 'center' }}>
      <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
        Schvalovatel
      </div>
      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
        {formatUserName(detail.schvalovatel_jmeno, detail.schvalovatel_prijmeni, detail.schvalovatel_titul_pred, detail.schvalovatel_titul_za)}
        <SubstitutionBadge 
          substitutionInfo={detail.substitution_info?.schvalovatel} 
          actionLabel="Schváleno" 
        />
      </div>
      {detail.schvalovatel_email && (
        <div style={{ gridColumn: '2', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
          {detail.schvalovatel_email}
        </div>
      )}
    </div>
  </div>
)}
`;

/**
 * 🎯 Příklad pro faktury - Invoices25List.js
 */
export const Invoices25List_IntegrationExample = `
// V Invoices25List.js - kde se zobrazuje potvrzovatel věcné správnosti:

import SubstitutionBadge from '../common/SubstitutionBadge';

// Pak v renderování:

{invoice.potvrdil_vecnou_spravnost_jmeno && (
  <tr>
    <td>Potvrdil věcnou správnost:</td>
    <td style={{ color: 'white' }}>
      {invoice.potvrdil_vecnou_spravnost_jmeno}
      <SubstitutionBadge 
        substitutionInfo={invoice.substitution_info?.potvrdil_vecnou_spravnost} 
        actionLabel="Potvrzeno" 
      />
    </td>
  </tr>
)}
`;
