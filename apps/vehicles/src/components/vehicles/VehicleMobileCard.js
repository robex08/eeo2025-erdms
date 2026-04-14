

import React from 'react';
import { FiNavigation, FiMapPin, FiMap, FiUser, FiSmartphone, FiKey, FiLayers, FiTruck } from 'react-icons/fi';
import { formatCzDateTime } from '../../utils/format';
import '../../styles/components/VehicleMobileCard.css';

const VehicleMobileCard = ({ v, last = {}, renderPhone, connectionError }) => {
  if (connectionError) {
    return (
      <div className="vehicle-mobile-card error">
        <span className="vehicle-mobile-card-error-title">Chyba ve spojení se serverem</span>
        <span className="vehicle-mobile-card-error-desc">Zkontrolujte připojení k internetu nebo dostupnost serveru.</span>
      </div>
    );
  }
  return (
    <div className="vehicle-mobile-card">
      {/* Horní řádek: Popis/volací znak + SPZ vedle sebe */}
      <div className="vehicle-mobile-card-row">
        <span className="vehicle-mobile-card-label-popis">
          {v.w_popis || v.w_volaci_znak || <span style={{color:'#888'}}>Bez popisu</span>}
        </span>
        <span className="vehicle-mobile-card-label-spz">{v.w_spz}</span>
        <span className="vehicle-mobile-card-label-typ">{v.zzs_typ || 'Neznámý typ'}</span>
      </div>
      {/* Druhý řádek: Výjezdová skupina + okresy */}
      <div className="vehicle-mobile-card-row-secondary">
        <span className="vehicle-mobile-card-label-skupina">{last.skupina || 'Není uvedeno'}</span>
        <span className="vehicle-mobile-card-label-okres">{v.w_stanoviste || 'Neznámý okres'}</span>
      </div>
      {/* Třetí řádek: Najetých KM, zarovnané vpravo */}
      <div className="vehicle-mobile-card-km">
        {last && last.w_km !== undefined ? Number(last.w_km).toLocaleString('cs-CZ') + ' km' : ''}
      </div>
      {/* GPS a adresa */}
      <div className="vehicle-mobile-card-section vehicle-mobile-card-gps">
        <div className="vehicle-mobile-card-gps-row"><FiNavigation style={{marginRight:2}} />GPS</div>
        {last.w_zs && last.w_zd ? (
          <>
            <div className="vehicle-mobile-card-gps-row">
              <a
                href={`https://www.google.com/maps?q=${last.w_zs},${last.w_zd}`}
                target="_blank"
                rel="noopener noreferrer"
                className="vehicle-mobile-card-link-coords"
              >
                <FiMapPin style={{marginRight:2}} />
                {last.w_zs}, {last.w_zd}
              </a>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${last.w_zs},${last.w_zd}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="vehicle-mobile-card-link-map"
                title="Vyhledat souřadnice na Google Maps"
              >
                <FiMap />
              </a>
            </div>
            <div className="vehicle-mobile-card-address">
              <FiMapPin style={{marginRight:2}} />
              {last.w_ln ? last.w_ln : (v.w_stanoviste && v.w_stanoviste.toLowerCase() === 'root' ? 'Nezařazeno' : (v.w_stanoviste || 'Není uvedeno'))}
            </div>
            <div className="vehicle-mobile-card-address">
              <FiMapPin style={{marginRight:2}} />
              {last.cela_adresa ? (
                <>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(last.cela_adresa)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="vehicle-mobile-card-link-address"
                  >
                    {last.cela_adresa}
                  </a>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(last.cela_adresa)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="vehicle-mobile-card-link-map"
                    title="Vyhledat adresu na Google Maps"
                  >
                    <FiMap />
                  </a>
                </>
              ) : <span style={{color:'#888'}}>není uvedeno</span>}
            </div>
          </>
        ) : <span style={{color:'#888'}}>Není k dispozici</span>}
      </div>
      {/* Mobilní zařízení a řidič */}
      <div className="vehicle-mobile-card-section vehicle-mobile-card-contact">
        <div className="vehicle-mobile-card-contact-col">
          <div className="vehicle-mobile-card-contact-title"><FiUser style={{marginRight:2}} />Sestra</div>
          <span className="vehicle-mobile-card-contact-row"><FiSmartphone style={{marginRight:2}} />mob: {renderPhone ? renderPhone('Sestra', last["sestra SIM"]) : (last["sestra SIM"] || <span style={{color:'#888'}}>Není k dispozici</span>)}</span>
          <span className="vehicle-mobile-card-contact-row"><FiKey style={{marginRight:2}} />IMEI: {last.sestra_IMEI || <span style={{color:'#888'}}>Není k dispozici</span>}</span>
          <span className="vehicle-mobile-card-contact-row"><FiLayers style={{marginRight:2}} />Inventární číslo: {last.inv_cis_sestra || <span style={{color:'#888'}}>Není k dispozici</span>}</span>
        </div>
        <div className="vehicle-mobile-card-contact-col">
          <div className="vehicle-mobile-card-contact-title"><FiUser style={{marginRight:2}} />Řidič</div>
          <span className="vehicle-mobile-card-contact-row"><FiSmartphone style={{marginRight:2}} />mob: {renderPhone ? renderPhone('Řidič', last.ridic_SIM) : (last.ridic_SIM || <span style={{color:'#888'}}>Není k dispozici</span>)}</span>
          <span className="vehicle-mobile-card-contact-row"><FiKey style={{marginRight:2}} />IMEI: {last.ridic_IMEI || <span style={{color:'#888'}}>Není k dispozici</span>}</span>
          <span className="vehicle-mobile-card-contact-row"><FiLayers style={{marginRight:2}} />Inventární číslo: {last.inv_cis_ridic || <span style={{color:'#888'}}>Není k dispozici</span>}</span>
        </div>
      </div>
      <div className="vehicle-mobile-card-update">{last.dt_aktualizace ? `Aktualizace: ${formatCzDateTime(last.dt_aktualizace)}` : ''}</div>
    </div>
  );
};

export default VehicleMobileCard;
