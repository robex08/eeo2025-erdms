
import React, { useState } from 'react';

const VehicleFilters = ({
  search,
  setSearch,
  showTypeDropdown,
  setShowTypeDropdown,
  selectedTypes,
  setSelectedTypes,
  typeOptions,
  showStationDropdown,
  setShowStationDropdown,
  selectedStations,
  setSelectedStations,
  stationOptions,
  showGroupDropdown,
  setShowGroupDropdown,
  selectedGroups,
  setSelectedGroups,
  groupOptions,
  kmFilter,
  setKmFilter
}) => {
  // Pending states for dropdowns
  const [pendingTypes, setPendingTypes] = useState(selectedTypes);
  const [pendingStations, setPendingStations] = useState(selectedStations);
  const [pendingGroups, setPendingGroups] = useState(selectedGroups);

  return (
    <div className="vehicles-filters" style={{display:'flex', gap:'1.2rem', alignItems:'center', margin:'1.2rem 0'}}>
      {/* Fulltext search */}
      <input
        type="text"
        placeholder="Hledat..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{marginRight: 12}}
      />
      {/* Typ vozidla dropdown */}
      <div style={{position:'relative'}}>
        <button type="button" style={{minWidth:120, padding:'0.3rem 1.5rem 0.3rem 0.7rem', borderRadius:6, border:'1px solid #bbb', background:'#fff', fontSize:'1rem', cursor:'pointer', textAlign:'left'}} onClick={() => { setPendingTypes(selectedTypes); setShowTypeDropdown(v => !v); }}>
          {selectedTypes.length === 0 ? 'Typ vozidla...' : selectedTypes.join(', ')}
        </button>
        {showTypeDropdown && (
          <div style={{position:'absolute', zIndex:10, top:'110%', left:0, minWidth:180, background:'#fff', border:'1px solid #bbb', borderRadius:6, boxShadow:'0 2px 8px rgba(0,0,0,0.13)', padding:'0.3rem 0', maxHeight:320, overflowY:'auto'}}>
            <div style={{padding:'0.18rem 1rem', borderBottom:'1px solid #eee', background:'#f7f7f7', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8}}>
              <button type="button" style={{padding:'0.25rem 1.2rem', borderRadius:6, border:'1px solid #1976d2', background:'#1976d2', color:'#fff', fontWeight:'bold', fontSize:'1rem', cursor:'pointer'}} onClick={() => { setSelectedTypes(pendingTypes); setShowTypeDropdown(false); }} >Použij</button>
              <button type="button" style={{padding:'0.25rem 1.2rem', borderRadius:6, border:'1px solid #bbb', background:'#fff', color:'#1976d2', fontWeight:'bold', fontSize:'1rem', cursor:'pointer'}} onClick={() => { setPendingTypes([]); setSelectedTypes([]); setShowTypeDropdown(false); }} >Zruš</button>
            </div>
            {typeOptions.map(type => (
              <label key={type} style={{display:'flex', alignItems:'center', padding:'0.18rem 1rem', cursor:'pointer', fontSize:'1rem'}}>
                <input
                  type="checkbox"
                  checked={pendingTypes.includes(type)}
                  onChange={e => {
                    let newSelected;
                    if (e.target.checked) {
                      newSelected = [...pendingTypes, type];
                    } else {
                      newSelected = pendingTypes.filter(t => t !== type);
                    }
                    setPendingTypes(newSelected);
                  }}
                  style={{marginRight:8}}
                />
                {type}
              </label>
            ))}
          </div>
        )}
      </div>
      {/* Stanoviště dropdown */}
      <div style={{position:'relative'}}>
        <button type="button" style={{minWidth:120, padding:'0.3rem 1.5rem 0.3rem 0.7rem', borderRadius:6, border:'1px solid #bbb', background:'#fff', fontSize:'1rem', cursor:'pointer', textAlign:'left'}} onClick={() => { setPendingStations(selectedStations); setShowStationDropdown(v => !v); }}>
          {selectedStations.length === 0 ? 'Lokalita...' : selectedStations.join(', ')}
        </button>
        {showStationDropdown && (
          <div style={{position:'absolute', zIndex:10, top:'110%', left:0, minWidth:180, background:'#fff', border:'1px solid #bbb', borderRadius:6, boxShadow:'0 2px 8px rgba(0,0,0,0.13)', padding:'0.3rem 0', maxHeight:320, overflowY:'auto'}}>
            <div style={{padding:'0.18rem 1rem', borderBottom:'1px solid #eee', background:'#f7f7f7', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8}}>
              <button type="button" style={{padding:'0.25rem 1.2rem', borderRadius:6, border:'1px solid #1976d2', background:'#1976d2', color:'#fff', fontWeight:'bold', fontSize:'1rem', cursor:'pointer'}} onClick={() => { setSelectedStations(pendingStations); setShowStationDropdown(false); }} >Použij</button>
              <button type="button" style={{padding:'0.25rem 1.2rem', borderRadius:6, border:'1px solid #bbb', background:'#fff', color:'#1976d2', fontWeight:'bold', fontSize:'1rem', cursor:'pointer'}} onClick={() => { setPendingStations([]); setSelectedStations([]); setShowStationDropdown(false); }} >Zruš</button>
            </div>
            {stationOptions.map(stan => (
              <label key={stan} style={{display:'flex', alignItems:'center', padding:'0.18rem 1rem', cursor:'pointer', fontSize:'1rem'}}>
                <input
                  type="checkbox"
                  checked={pendingStations.includes(stan)}
                  onChange={e => {
                    let newSelected;
                    if (e.target.checked) {
                      newSelected = [...pendingStations, stan];
                    } else {
                      newSelected = pendingStations.filter(s => s !== stan);
                    }
                    setPendingStations(newSelected);
                  }}
                  style={{marginRight:8}}
                />
                {stan}
              </label>
            ))}
          </div>
        )}
      </div>
  {/* Stanoviště dropdown */}
      <div style={{position:'relative'}}>
        <button type="button" style={{minWidth:120, padding:'0.3rem 1.5rem 0.3rem 0.7rem', borderRadius:6, border:'1px solid #bbb', background:'#fff', fontSize:'1rem', cursor:'pointer', textAlign:'left'}} onClick={() => { setPendingGroups(selectedGroups); setShowGroupDropdown(v => !v); }}>
          {selectedGroups.length === 0 ? 'Stanoviště...' : selectedGroups.join(', ')}
        </button>
        {showGroupDropdown && (
          <div style={{position:'absolute', zIndex:10, top:'110%', left:0, minWidth:180, background:'#fff', border:'1px solid #bbb', borderRadius:6, boxShadow:'0 2px 8px rgba(0,0,0,0.13)', padding:'0.3rem 0', maxHeight:320, overflowY:'auto'}}>
            <div style={{padding:'0.18rem 1rem', borderBottom:'1px solid #eee', background:'#f7f7f7', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8}}>
              <button type="button" style={{padding:'0.25rem 1.2rem', borderRadius:6, border:'1px solid #1976d2', background:'#1976d2', color:'#fff', fontWeight:'bold', fontSize:'1rem', cursor:'pointer'}} onClick={() => { setSelectedGroups(pendingGroups); setShowGroupDropdown(false); }} >Použij</button>
              <button type="button" style={{padding:'0.25rem 1.2rem', borderRadius:6, border:'1px solid #bbb', background:'#fff', color:'#1976d2', fontWeight:'bold', fontSize:'1rem', cursor:'pointer'}} onClick={() => { setPendingGroups([]); setSelectedGroups([]); setShowGroupDropdown(false); }} >Zruš</button>
            </div>
            {groupOptions.map(group => (
              <label key={group} style={{display:'flex', alignItems:'center', padding:'0.18rem 1rem', cursor:'pointer', fontSize:'1rem'}}>
                <input
                  type="checkbox"
                  checked={pendingGroups.includes(group)}
                  onChange={e => {
                    let newSelected;
                    if (e.target.checked) {
                      newSelected = [...pendingGroups, group];
                    } else {
                      newSelected = pendingGroups.filter(g => g !== group);
                    }
                    setPendingGroups(newSelected);
                  }}
                  style={{marginRight:8}}
                />
                {group}
              </label>
            ))}
          </div>
        )}
      </div>
      {/* Km filter */}
      <select value={kmFilter || ''} onChange={e => setKmFilter(e.target.value || null)}>
        <option value="">Všechny km</option>
        <option value="0+">0 - 100 000 km</option>
        <option value="100 000+">100 000 - 200 000 km</option>
        <option value="200 000+">200 000 - 300 000 km</option>
        <option value="300 000+">300 000 - 400 000 km</option>
        <option value="400 000+">400 000 - 500 000 km</option>
        <option value="≥500 000">500 000+ km</option>
      </select>
    </div>
  );
};

export default VehicleFilters;
