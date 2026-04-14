
import React from 'react';
import VehicleMobileCard from './VehicleMobileCard';
import '../../styles/components/VehicleMobileList.css';


const VehicleMobileList = ({ mobilePaged, positions, renderPhone, connectionError }) => (
  <div className="vehicle-mobile-list">
    {connectionError ? (
      <VehicleMobileCard v={{w_popis: 'Chyba ve spojení se serverem', w_spz: '', zzs_typ: ''}} last={{}} renderPhone={null} connectionError />
    ) : mobilePaged.length === 0 ? (
      <div className="vehicle-mobile-list-empty">Žádná vozidla</div>
    ) : (
      mobilePaged.map(v => {
        const last = positions[v.w_carid] && positions[v.w_carid].length > 0
          ? [...positions[v.w_carid]].sort((a, b) => (b.dt_aktualizace || '').localeCompare(a.dt_aktualizace || ''))[0]
          : {};
        return <VehicleMobileCard key={v.w_carid} v={v} last={last} renderPhone={renderPhone} />;
      })
    )}
  </div>
);

export default VehicleMobileList;
