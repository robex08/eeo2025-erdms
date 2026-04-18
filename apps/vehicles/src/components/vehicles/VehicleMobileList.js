
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
        const last = {
          w_km: v.pos_km, w_lp: v.pos_lp, w_ln: v.pos_ln,
          w_majak: v.pos_majak, w_zs: v.pos_zs, w_zd: v.pos_zd,
          dt_aktualizace: v.pos_dt_aktualizace
        };
        return <VehicleMobileCard key={v.w_carid} v={v} last={last} renderPhone={renderPhone} />;
      })
    )}
  </div>
);

export default VehicleMobileList;
