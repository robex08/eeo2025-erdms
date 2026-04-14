import React from 'react';
import PropTypes from 'prop-types';
import { FiNavigation, FiMapPin, FiMap, FiUser, FiSmartphone, FiKey, FiLayers, FiTruck, FiTag, FiHome, FiBox, FiCalendar, FiInfo } from 'react-icons/fi';
import { formatCzDate } from '../../utils/format';

const VehicleDetailRow = ({ vehicle, last, search, isMobilePortrait, highlightMatch }) => (
  <div style={{display:'flex', flexDirection:'column', alignItems:'stretch', background:'#f0f2f5', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.07)', padding:'1.2rem 2.5rem 1.2rem 1.5rem', margin:'0.5rem 0', border:'1px solid #e0e0e0', width:'94%', minHeight:!isMobilePortrait ? '125px' : undefined}}>
    {/* TOP ROW: wrapper for GPS / Mobil / Right info */}
    <div style={{display:'flex', flexDirection:'row', alignItems:'stretch', width:'100%'}}>
      {/* LEVÝ BLOK: GPS NAHOŘE */}
      <div style={{minWidth:220, marginRight: '2.5rem', display:'flex', flexDirection:'column', justifyContent:'flex-start', flexShrink:0}}>
        <div style={{fontWeight:'bold', marginBottom:4, display:'flex', alignItems:'center', gap:4}}>
          <FiNavigation style={{marginRight:2, color:'#1976d2'}} /> GPS
        </div>
        <div style={{display:'flex', alignItems:'center', marginBottom:2}}>
          <span style={{marginRight:8, display:'flex', alignItems:'center'}}>
            {last.w_zs && last.w_zd ? (
              <>
                <a href={`https://www.google.com/maps?q=${last.w_zs},${last.w_zd}`} target="_blank" rel="noopener noreferrer" style={{color:'#1976d2', textDecoration:'underline', fontWeight:'bold', marginRight:6, display:'flex', alignItems:'center', gap:4}}>
                  <FiMapPin style={{marginRight:2}} />
                  {last.w_zs}, {last.w_zd}
                </a>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${last.w_zs},${last.w_zd}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{color:'#1976d2', textDecoration:'none', fontSize:'1.15em', display:'flex', alignItems:'center'}}
                  title="Vyhledat souřadnice na Google Maps"
                >
                  <FiMap />
                </a>
              </>
            ) : <span style={{color:'#888'}}>Není k dispozici</span>}
          </span>
        </div>
        <div style={{fontSize:'1.01rem', color:'#444', marginBottom:4, display:'flex', alignItems:'center', gap:4}}>
          <FiMapPin style={{marginRight:2}} />
          {last.w_ln ? highlightMatch(last.w_ln, search) : <span style={{color:'#888'}}>Není k dispozici</span>}
        </div>
      </div>

      {/* STŘEDNÍ BLOK: Mobilní zařízení */}
      <div style={{minWidth:260, marginRight:'2.5rem', display:'flex', flexDirection:'column', justifyContent:'flex-start', flexShrink:0}}>
        <div style={{fontWeight:'bold', color:'#1976d2', marginBottom:4, fontSize:'0.98rem', display:'flex', alignItems:'center', gap:4}}>
          <FiSmartphone style={{marginRight:2}} /> Mobilní zařízení
        </div>
        <div style={{display:'flex', flexDirection:'row', gap:'2.5rem', marginBottom:6}}>
          {/* Sestra */}
          <div>
            <div style={{fontWeight:'bold', color:'#555', marginBottom:2, display:'flex', alignItems:'center', gap:4}}>
              <FiUser style={{marginRight:2, color:'#1976d2'}} /> Sestra
            </div>
            <div style={{fontSize:'0.98rem', color:'#444'}}>
              <span style={{display:'flex', alignItems:'center', gap:4, lineHeight:'1.2', marginBottom:1}}>
                <FiSmartphone style={{marginRight:2, color:'#16a085'}} /> mob: {last["sestra SIM"] ? highlightMatch(last["sestra SIM"], search) : <span style={{color:'#888'}}>Není k dispozici</span>}
              </span>
              <span style={{display:'flex', alignItems:'center', gap:4, lineHeight:'1.2', marginBottom:1}}>
                <FiKey style={{marginRight:2, color:'#e67e22'}} /> IMEI: {last.sestra_IMEI ? highlightMatch(last.sestra_IMEI, search) : <span style={{color:'#888'}}>Není k dispozici</span>}
              </span>
              <span style={{display:'flex', alignItems:'center', gap:4, lineHeight:'1.2', marginBottom:0}}>
                <FiLayers style={{marginRight:2, color:'#8e44ad'}} /> Inventární číslo: {last.inv_cis_sestra ? highlightMatch(last.inv_cis_sestra, search) : <span style={{color:'#888'}}>Není k dispozici</span>}
              </span>
            </div>
          </div>

          {/* Řidič */}
          <div>
            <div style={{fontWeight:'bold', color:'#555', marginBottom:2, display:'flex', alignItems:'center', gap:4}}>
              <FiUser style={{marginRight:2, color:'#1976d2'}} /> Řidič
            </div>
            <div style={{fontSize:'0.98rem', color:'#444'}}>
              <span style={{display:'flex', alignItems:'center', gap:4, lineHeight:'1.2', marginBottom:1}}>
                <FiSmartphone style={{marginRight:2, color:'#16a085'}} /> mob: {last.ridic_SIM ? highlightMatch(last.ridic_SIM, search) : <span style={{color:'#888'}}>Není k dispozici</span>}
              </span>
              <span style={{display:'flex', alignItems:'center', gap:4, lineHeight:'1.2', marginBottom:1}}>
                <FiKey style={{marginRight:2, color:'#e67e22'}} /> IMEI: {last.ridic_IMEI ? highlightMatch(last.ridic_IMEI, search) : <span style={{color:'#888'}}>Není k dispozici</span>}
              </span>
              <span style={{display:'flex', alignItems:'center', gap:4, lineHeight:'1.2', marginBottom:0}}>
                <FiLayers style={{marginRight:2, color:'#8e44ad'}} /> Inventární číslo: {last.inv_cis_ridic ? highlightMatch(last.inv_cis_ridic, search) : <span style={{color:'#888'}}>Není k dispozici</span>}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PRAVÝ BLOK: Adresa stanoviště nahoře, najeto dole */}
      <div style={{flex:1, minWidth:0, width:'auto', display:'flex', flexDirection:'column', alignItems:'flex-end', paddingRight:'0.5rem', height:'100%'}}>
        <div style={{textAlign:'right', marginBottom:8}}>
          <div style={{fontWeight:'bold', color:'#1976d2', marginBottom:2, textAlign:'right', display:'flex', alignItems:'center', justifyContent:'flex-end', gap:4, minHeight:'1.5em'}}>
            {last.skupina ? (
              <>
                {last.skupina.match(/RV|RZP|RLP|RLP/i) && (
                  <FiTruck style={{color:'#e67e22', fontSize:'1.2em'}} title="Výjezdová skupina (sanitka)" />
                )}
                {highlightMatch(last.skupina, search)}
              </>
            ) : <span style={{color:'#888'}}>Není k dispozici</span>}
          </div>
          <div style={{fontSize:'0.98rem', color:'#444', textAlign:'right', display:'flex', alignItems:'center', justifyContent:'flex-end', gap:4}}>
            {last.cela_adresa
              ? (
                  <>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(last.cela_adresa)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{color:'#1976d2', textDecoration:'underline', fontWeight:'bold'}}
                      title="Zobrazit adresu na Google Maps"
                    >
                      <FiMapPin style={{marginRight:2}} />
                      {highlightMatch(last.cela_adresa, search)}
                    </a>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(last.cela_adresa)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{marginLeft:8, color:'#1976d2', textDecoration:'none', fontSize:'1.15em'}}
                      title="Vyhledat adresu na Google Maps"
                    >
                      <FiMap />
                    </a>
                  </>
                )
              : <span style={{color:'#888'}}>Není k dispozici</span>
            }
          </div>
          <div style={{height:'1.1rem'}}></div>
        </div>
        <div style={{flex:1}}></div>
        <div style={{width:'100%', display:'flex', justifyContent:'flex-end', alignItems:'flex-end', height:'100%'}}>
          <div style={{textAlign:'right', alignSelf:'flex-end'}}>
            <div style={{fontWeight:'bold', marginBottom:4, display:'flex', alignItems:'center', gap:4}}><FiTruck style={{marginRight:2}} />Aktuálně najeto</div>
            <div style={{fontSize:'1.01rem'}}>
              {last.w_km
                ? (Number(last.w_km) > 300000
                    ? <span style={{fontWeight:'bold', color:'red'}}>{highlightMatch(Number(last.w_km).toLocaleString('cs-CZ') + ' km', search)}</span>
                    : highlightMatch(Number(last.w_km).toLocaleString('cs-CZ') + ' km', search))
                : <span style={{color:'#888'}}>Není k dispozici</span>
              }
            </div>
            {!isMobilePortrait && <div style={{height:'1.1em'}}></div>}
          </div>
        </div>
      </div>
    </div>

    {/* DOTACE PODŘÁDEK - pouze pokud vehicle.dotace === 'A' */}
    {vehicle && String(vehicle.dotace || '').toUpperCase() === 'A' && (
      <div style={{width:'100%', marginTop:14}}>
        <div style={{background:'#fff', border:'1px solid rgba(11,87,208,0.08)', borderRadius:12, padding:'1rem', boxShadow:'0 6px 18px rgba(11,87,208,0.04)'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:12}}>
            <div style={{display:'flex', alignItems:'center', gap:12}}>
              <div style={{display:'flex', alignItems:'center', justifyContent:'center', width:44, height:44, borderRadius:10, background:'linear-gradient(180deg,#eaf2ff, #dfeeff)', color:'#0b57d0', fontWeight:700, fontSize:'0.95rem'}}>
                <FiTag style={{fontSize:'1.25rem'}} />
              </div>
              <div>
                <div style={{fontSize:'0.98rem', fontWeight:800, color:'#0b57d0'}}>
                <span > Doplňující informace o dotaci</span></div>
              </div>
            </div>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              {/* small badge with inv or dotace state */}
              <div style={{padding:'0.25rem 0.6rem', borderRadius:8, background:'#f1f8ff', color:'#0b57d0', fontWeight:700, fontSize:'0.88rem'}}>
               
              </div>
            </div>
          </div>

          {/* grid of items: left column split into top (inv + popis) and bottom (dates), right column stacked for úsek/budova/místnost */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 260px', gap:'0.75rem', alignItems:'start'}}>
            {/* Left: create two-row layout (top: inv+popis, bottom: dates) */}
            <div style={{display:'grid', gridTemplateRows:'auto auto', gap:12}}>
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'0.75rem'}}>
                <div style={{display:'flex', alignItems:'flex-start', gap:10}}>
                  <div style={{width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:8, background:'#f8f9fb', color:'#8e44ad'}}>
                    <FiLayers />
                  </div>
                  <div>
                    <div style={{fontSize:'0.86rem', color:'#666'}}>Inventární číslo</div>
                    <div style={{fontWeight:700, color:'#222', marginTop:4}}>
                      {vehicle && vehicle.inv_cislo
                        ? highlightMatch(String(vehicle.inv_cislo), search)
                        : (last && (last.inv_cis_sestra || last.inv_cis_ridic) ? highlightMatch(String(last.inv_cis_sestra || last.inv_cis_ridic), search) : <span style={{color:'#888'}}>Není k dispozici</span>)
                      }
                    </div>
                  </div>
                </div>

                {/* Popis vozidla immediately after Inventární číslo */}
                <div style={{display:'flex', alignItems:'flex-start', gap:10}}>
                  <div style={{width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:8, background:'linear-gradient(180deg,#fff,#f4f8ff)', color:'#2563eb'}}>
                    <FiKey />
                  </div>
                  <div>
                    <div style={{fontSize:'0.86rem', color:'#666'}}>VIN vozidla</div>
                    <div style={{fontWeight:700, color:'#222', marginTop:4}}>
                      {vehicle && (vehicle.VIN || vehicle.vin) ? highlightMatch(String(vehicle.VIN || vehicle.vin), search) : (vehicle && vehicle.vozidlo_popis ? highlightMatch(String(vehicle.vozidlo_popis), search) : <span style={{color:'#888'}}>Není k dispozici</span>)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom row: dates under the top row */}
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'0.75rem'}}>
                <div style={{display:'flex', alignItems:'flex-start', gap:10}}>
                  <div style={{width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:8, background:'#fff8f2', color:'#d84315'}}>
                    <FiCalendar />
                  </div>
                  <div>
                    <div style={{fontSize:'0.86rem', color:'#666'}}>Datum zařazení</div>
                    <div style={{fontWeight:700, color:'#222', marginTop:4}}>{vehicle && vehicle.dt_zarazeni ? formatCzDate(vehicle.dt_zarazeni, false) : <span style={{color:'#888'}}>Není k dispozici</span>}</div>
                  </div>
                </div>

                <div style={{display:'flex', alignItems:'flex-start', gap:10}}>
                  <div style={{width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:8, background:'#fcfbf6', color:'#8b5e3c'}}>
                    <FiCalendar />
                  </div>
                  <div>
                    <div style={{fontSize:'0.86rem', color:'#666'}}>Datum konece úč.odpisů</div>
                    <div style={{fontWeight:700, color:'#222', marginTop:4}}>
                      {vehicle && (vehicle.dt_konec_odpis || vehicle.plan_vyrazeni || vehicle.odpis)
                        ? (
                            <>
                              <span>{vehicle.dt_konec_odpis ? formatCzDate(vehicle.dt_konec_odpis, false) : (vehicle.plan_vyrazeni ? formatCzDate(vehicle.plan_vyrazeni, false) : '')}</span>
                              {vehicle.odpis ? <span style={{marginLeft:8, color:'#555'}}> / {highlightMatch(String(vehicle.odpis), search)}</span> : null}
                            </>
                          )
                        : <span style={{color:'#888'}}>Není k dispozici</span>
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: stacked Úsek / Budov / Místnost */}
            <div style={{display:'flex', flexDirection:'column', gap:12, alignItems:'flex-end'}}>
              <div style={{display:'flex', alignItems:'center', gap:10, justifyContent:'flex-end'}}>
                <div style={{width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:8, background:'#f8fbf7', color:'#16a085'}}>
                  <FiBox />
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'0.86rem', color:'#666'}}>Úsek</div>
                  <div style={{fontWeight:700, color:'#222', marginTop:4}}>{vehicle && vehicle.usek ? highlightMatch(String(vehicle.usek), search) : <span style={{color:'#888'}}>Není k dispozici</span>}</div>
                </div>
              </div>
 
              <div style={{display:'flex', alignItems:'center', gap:10, justifyContent:'flex-end'}}>
                <div style={{width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:8, background:'#fff7f0', color:'#e67e22'}}>
                  <FiHome />
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'0.86rem', color:'#666'}}>Budova</div>
                  <div style={{fontWeight:700, color:'#222', marginTop:4}}>{vehicle && (vehicle.budov || vehicle.budova) ? highlightMatch(String(vehicle.budov || vehicle.budova), search) : <span style={{color:'#888'}}>Není k dispozici</span>}</div>
                </div>
              </div>
 
              <div style={{display:'flex', alignItems:'center', gap:10, justifyContent:'flex-end'}}>
                <div style={{width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:8, background:'#f6f5ff', color:'#5b6bc0'}}>
                  <FiTag />
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'0.86rem', color:'#666'}}>Místnost</div>
                  <div style={{fontWeight:700, color:'#222', marginTop:4}}>{vehicle && vehicle.mistnost ? highlightMatch(String(vehicle.mistnost), search) : <span style={{color:'#888'}}>Není k dispozici</span>}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    <div style={{width:'100%', textAlign:'right', color:'#888', fontSize:'0.97rem', paddingTop:10}}>
      {last.dt_aktualizace ? `Aktualizace: ${formatCzDate(last.dt_aktualizace, true)}` : ''}
    </div>
  </div>
);

VehicleDetailRow.propTypes = {
  vehicle: PropTypes.object.isRequired,
  last: PropTypes.object.isRequired,
  search: PropTypes.string.isRequired,
  isMobilePortrait: PropTypes.bool.isRequired,
  highlightMatch: PropTypes.func.isRequired,
};

export default React.memo(VehicleDetailRow);
