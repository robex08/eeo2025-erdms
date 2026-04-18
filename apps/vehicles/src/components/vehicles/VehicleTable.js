import React from 'react';
import VehicleDetailRow from './VehicleDetailRow';
import '../../styles/components/VehicleTable.css';

const VehicleTable = ({ paged, expanded, positions, rowHighlightEnabled, vehicleKmColors, handleExpand, handleExpandAll, allExpanded, highlightMatch, search, formatCzDate, formatCzDateTime, isMobilePortrait, setSort, sort, onRowDoubleClick, selectedRowId, onStatClick }) => {
  // Helper pro zobrazení šipky
  const sortArrow = (field) => {
    if (!sort || sort.field !== field) return '';
    return sort.dir === 'asc' ? ' ▲' : ' ▼';
  };
  const handleSort = (field) => {
    if (!setSort) return;
    setSort(prev => {
      if (prev.field === field) {
        return { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { field, dir: 'asc' };
    });
  };
  return (
    <div style={{width:'100%', overflowX:'auto'}}>
      <table className="vehicles-table" style={{minWidth:'100%'}}>
        <thead>
          <tr>
            <th style={{width:36}}>
              <button
                onClick={handleExpandAll}
                style={{width:22, height:22, fontWeight:'bold', fontSize:'1rem', border:'none', background:'transparent', cursor:'pointer'}}
                aria-label={allExpanded ? 'Skrýt všechny detaily' : 'Zobrazit všechny detaily'}
              >
                {allExpanded ? '−' : '+'}
              </button>
            </th>
            <th onClick={() => handleSort('w_spz')} style={{cursor:'pointer'}}>SPZ{sortArrow('w_spz')}</th>
            <th onClick={() => handleSort('zzs_typ')} style={{cursor:'pointer'}}>TYP{sortArrow('zzs_typ')}</th>
            <th onClick={() => handleSort('w_popis')} style={{cursor:'pointer'}}>Popis{sortArrow('w_popis')}</th>
            <th onClick={() => handleSort('w_tovarni_znacka')} style={{cursor:'pointer'}}>Značka{sortArrow('w_tovarni_znacka')}</th>
            <th onClick={() => handleSort('w_model_vozu')} style={{cursor:'pointer'}}>Model{sortArrow('w_model_vozu')}</th>
            <th onClick={() => handleSort('w_typ_phm')} style={{cursor:'pointer'}}>PHM{sortArrow('w_typ_phm')}</th>
            <th onClick={() => handleSort('w_groupname')} style={{cursor:'pointer'}}>Stanoviště{sortArrow('w_groupname')}</th>
            <th onClick={() => handleSort('w_stanoviste')} style={{cursor:'pointer'}}>Lokalita{sortArrow('w_stanoviste')}</th>
            <th onClick={() => handleSort('najezd')} style={{textAlign:'center', cursor:'pointer'}}>Nájezd{sortArrow('najezd')}</th>
            <th onClick={() => handleSort('Zasmluvneno')} style={{textAlign:'center', cursor:'pointer'}}>Zasmluvněno{sortArrow('Zasmluvneno')}</th>
            <th onClick={() => handleSort('w_datod')} style={{textAlign:'center', cursor:'pointer'}}>Zařazeno{sortArrow('w_datod')}</th>
            <th onClick={() => handleSort('dotace')} style={{textAlign:'center', cursor:'pointer'}}>Dotace{sortArrow('dotace')}</th>
            <th onClick={() => handleSort('dt_aktualizace')} style={{textAlign:'center', cursor:'pointer'}}>Aktualizace{sortArrow('dt_aktualizace')}</th>
              <th style={{width:'2em', textAlign:'center'}} title="Akce">
                <span role="img" aria-label="Akce" style={{fontSize:'1.2em'}}>⚡</span>
              </th>
          </tr>
        </thead>
      <tbody>
        {paged.length === 0 ? (
          <tr><td colSpan={15} style={{textAlign:'center'}}>Žádná data</td></tr>
        ) : (
          paged.map(v => {
            const lastKm = v.pos_km ? Number(v.pos_km) : null;
            let rowStyle = {};
            if (lastKm !== null && lastKm <= 100000) {
              rowStyle = {};
            } else if (rowHighlightEnabled && lastKm !== null) {
              if (lastKm >= 500000) rowStyle = { background: vehicleKmColors[4] };
              else if (lastKm >= 400000) rowStyle = { background: vehicleKmColors[3] };
              else if (lastKm >= 300000) rowStyle = { background: vehicleKmColors[2] };
              else if (lastKm >= 200000) rowStyle = { background: vehicleKmColors[1] };
              else if (lastKm >= 100000) rowStyle = { background: vehicleKmColors[0] };
            }
            return (
              <React.Fragment key={v.w_carid}>
                <tr
                  style={{
                    ...rowStyle,
                    cursor: 'pointer'
                  }}
                  onDoubleClick={() => onRowDoubleClick && onRowDoubleClick(v.w_carid)}
                  className={selectedRowId === v.w_carid ? 'selected-row' : ''}
                >
                  <td style={{width:36}}>
                    <button onClick={() => handleExpand(v.w_carid)} style={{width:22, height:22, fontWeight:'bold', fontSize:'1rem', border:'none', background:'transparent', cursor:'pointer'}} aria-label={expanded[v.w_carid] ? 'Skrýt detail' : 'Zobrazit detail'}>
                      {expanded[v.w_carid] ? '-' : '+'}
                    </button>
                  </td>
                  <td>{v.w_spz ? highlightMatch(v.w_spz, search) : <span style={{color:'#888'}}>Není k dispozici</span>}</td>
                  <td>{highlightMatch(v.zzs_typ, search)}</td>
                  <td>{highlightMatch(v.w_popis, search)}</td>
                  <td>{highlightMatch(v.w_tovarni_znacka, search)}</td>
                  <td>{highlightMatch(v.w_model_vozu, search)}</td>
                  <td>{highlightMatch(v.w_typ_phm, search)}</td>
                  <td>
                    {v.w_groupname && v.w_groupname.toLowerCase().includes('root')
                      ? <span style={{color:'#888'}}>Nezařazeno</span>
                      : highlightMatch(v.w_groupname, search)}
                  </td>
                  <td>{highlightMatch(v.w_stanoviste, search)}</td>
                  <td style={{textAlign:'center'}}>
                    {v.pos_km
                      ? <>{highlightMatch(`${v.pos_km} km`, search)}</>
                      : <span style={{color:'#888'}}>Není k dispozici</span>
                    }
                  </td>
                  <td style={{textAlign:'center'}}>{v.Datum_od ? v.Datum_od : ''}</td>
                  <td style={{textAlign:'center'}}>{formatCzDate(v.w_datod, false)}</td>
                  <td style={{textAlign:'center'}}>{v.dotace ? highlightMatch(String(v.dotace).toUpperCase(), search) : <span style={{color:'#888'}}></span>}</td>
                  <td style={{textAlign:'center'}}>{formatCzDate(v.dt_aktualizace, true)}</td>
                    <td style={{width:'2em', textAlign:'center'}}>
                      <button
                        type="button"
                        title="Statistika"
                        style={{background:'none', border:'none', cursor:'pointer', fontSize:'1.2em', color:'#2563eb', padding:0}}
                        onClick={() => onStatClick && onStatClick(v.w_carid)}
                      >
                        📊
                      </button>
                    </td>
                </tr>
                {expanded[v.w_carid] && (
                  <tr style={{ cursor: 'default' }}>
                    <td colSpan={15} style={{background:'#f7f7f7', padding:'0.5rem 0.5rem'}}>
                      {positions[v.w_carid] === null ? (
                        <span>Načítám detail...</span>
                      ) : positions[v.w_carid] && positions[v.w_carid].length > 0 ? (() => {
                        const sorted = [...positions[v.w_carid]].sort((a, b) => (b.dt_aktualizace || '').localeCompare(a.dt_aktualizace || ''));
                        const last = sorted[0];
                        return (
                          <VehicleDetailRow vehicle={v} last={last} search={search} isMobilePortrait={isMobilePortrait} highlightMatch={highlightMatch} />
                        );
                      })() : (
                        <VehicleDetailRow vehicle={v} last={{
                          w_km: v.pos_km, w_lp: v.pos_lp, w_ln: v.pos_ln,
                          w_majak: v.pos_majak, w_zs: v.pos_zs, w_zd: v.pos_zd,
                          dt_aktualizace: v.pos_dt_aktualizace,
                          skupina: v.mt_skupina, znak: v.mt_znak,
                          cela_adresa: v.mt_cela_adresa,
                          inv_cis_sestra: v.mt_inv_cis_sestra, sestra_IMEI: v.mt_sestra_IMEI,
                          'sestra SIM': v.mt_sestra_SIM,
                          inv_cis_ridic: v.mt_inv_cis_ridic, ridic_IMEI: v.mt_ridic_IMEI,
                          ridic_SIM: v.mt_ridic_SIM
                        }} search={search} isMobilePortrait={isMobilePortrait} highlightMatch={highlightMatch} />
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })
        )}
      </tbody>
    </table>
    </div>
  );
};

export default VehicleTable;
