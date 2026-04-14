
import React from 'react';
import VehicleModal from './VehicleModal';
import './VehicleStatsModal.css';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const pad = n => n < 10 ? '0' + n : n;
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;
}

const VehicleStatsModal = ({ open, onClose, statLoading, statError, statData, vehicle }) => {
  // vehicle: { spz, zzs_typ, w_volaciznak, w_popis, celkovyNajezdKm, datumZarazeni }
  return (
    <VehicleModal open={open} onClose={onClose}>
      <div className="vehicle-stats-modal-main">
        {statLoading && <div style={{padding:'2em', textAlign:'center'}}>Načítám statistiku...</div>}
        {statError && <div style={{color:'red', padding:'1em'}}>{statError}</div>}
        {vehicle && (
          <div style={{display:'flex', flexWrap:'wrap', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'0.5em'}}>
            <div style={{display:'flex', gap:'1.2em', flexWrap:'wrap'}}>
              <span className="vehicle-stats-badge vehicle-stats-spz" style={{fontWeight:'bold'}}>{vehicle.w_spz || vehicle.spz || 'Neznámá'}</span>
              <span className="vehicle-stats-badge vehicle-stats-stan" style={{fontWeight:'bold'}}>{vehicle.w_stanoviste || 'Neznámé'}</span>
              <span className="vehicle-stats-badge vehicle-stats-typ" style={{fontWeight:'bold'}}>{vehicle.zzs_typ || ''}</span>
              <span className="vehicle-stats-badge vehicle-stats-volaciznak" style={{fontWeight:'bold', color:'#e53935', background:'#fff4f0', border:'2px solid #e53935'}}>{vehicle.w_popis || ''}</span>
            </div>
            <div style={{marginLeft:'auto', textAlign:'right', fontSize:'1.08em', color:'#2563eb', fontWeight:'bold'}}>
              {vehicle.celkovyNajezdKm?.toLocaleString('cs-CZ') || '0'} km
            </div>
          </div>
        )}
        {statData && statData.length > 0 && (
          <>
            <div className="vehicle-stats-title">Statistika km za období</div>
            <table className="vehicle-stats-table">
              <thead>
                <tr>
                  <th style={{textAlign:'center'}}>Od</th>
                  <th style={{textAlign:'center'}}>Do</th>
                  <th style={{textAlign:'center'}}>Počet měsíců</th>
                  <th style={{textAlign:'right'}}>Stav tach.</th>
                  <th style={{textAlign:'right'}}>Najeto km</th>
                  <th style={{textAlign:'right'}}>Průměr za měsíc</th>
                  <th style={{textAlign:'center'}}>Aktualizace</th>
                </tr>
              </thead>
              <tbody>
                {statData.map(row => {
                  const prumer = row.pocet_mesicu > 0 ? row.km / row.pocet_mesicu : 0;
                  return (
                    <tr key={row.id}>
                      <td style={{textAlign:'center'}}>{formatDate(row.w_datod)}</td>
                      <td style={{textAlign:'center'}}>{formatDate(row.w_datdo)}</td>
                      <td style={{textAlign:'center'}}>{row.pocet_mesicu}</td>
                      <td style={{textAlign:'right'}}>{row.stavTach.toLocaleString('cs-CZ')}</td>
                      <td style={{textAlign:'right'}}>{row.km.toLocaleString('cs-CZ', {minimumFractionDigits:1, maximumFractionDigits:1})}</td>
                      <td style={{textAlign:'right'}}>{prumer.toLocaleString('cs-CZ', {minimumFractionDigits:1, maximumFractionDigits:1})}</td>
                      <td style={{textAlign:'center'}}>{formatDate(row.dt_aktualizace)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Výpočet pod tabulkou */}
            {vehicle && typeof vehicle.celkovyNajezdKm === 'number' && (
              <div style={{marginTop:'1.2em', textAlign:'center', fontSize:'1.08em', fontWeight:'bold'}}>
                {vehicle.celkovyNajezdKm < 250000 ? (() => {
                  // Průměr za měsíc z posledního řádku tabulky
                  const posledni = statData[statData.length-1];
                  const prumerMesic = posledni.pocet_mesicu > 0 ? posledni.km / posledni.pocet_mesicu : 0;
                  if (prumerMesic > 0) {
                    const kmZbyva = 250000 - vehicle.celkovyNajezdKm;
                    const mesicuZbyva = Math.ceil(kmZbyva / prumerMesic);
                    const dnes = new Date();
                    dnes.setMonth(dnes.getMonth() + mesicuZbyva);
                    const rok = dnes.getFullYear();
                    const mesic = dnes.getMonth();
                    const mesicNazvy = ['leden','únor','březen','duben','květen','červen','červenec','srpen','září','říjen','listopad','prosinec'];
                    const mesicText = mesicNazvy[mesic] || `${mesic+1}`;
                    return <span style={{color:'#4e2600', background:'#fff3e0', padding:'0.4em 1.2em', borderRadius:'8px', boxShadow:'0 2px 8px rgba(255,152,0,0.12)'}}>{`Odhad dosažení 250 000 km: za ${mesicuZbyva} měsíců (${mesicText} ${rok})`}</span>;
                  } else {
                    return <span style={{color:'#4e2600', background:'#fff3e0', padding:'0.4em 1.2em', borderRadius:'8px', boxShadow:'0 2px 8px rgba(255,152,0,0.12)'}}>Nelze odhadnout dosažení 250 000 km (průměr za měsíc je 0)</span>;
                  }
                })() : (
                  <span style={{color:'#e53935', background:'#ffebee', padding:'0.4em 1.2em', borderRadius:'8px', boxShadow:'0 2px 8px rgba(229,57,53,0.12)'}}>Vozidlo má nájezd již nad limit 250 000 km</span>
                )}
              </div>
            )}
          </>
        )}
        {statData && statData.length === 0 && !statLoading && (
          <div style={{padding:'2em', textAlign:'center'}}>Žádná data pro statistiku.</div>
        )}
      </div>
    </VehicleModal>
  );
};

export default VehicleStatsModal;
