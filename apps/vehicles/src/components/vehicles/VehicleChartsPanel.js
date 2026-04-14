import React from 'react';
import VehicleCharts from './VehicleCharts';
import { FiChevronUp, FiChevronDown } from 'react-icons/fi';

export default function VehicleChartsPanel({
  chartsVisible,
  setChartsVisible,
  filtered,
  positions,
  rowHighlightEnabled,
  setRowHighlightEnabled,
  kmFilter,
  setKmFilter,
  typeFilter,
  setTypeFilter,
  stationFilter,
  setStationFilter
}) {
  return (
    <div style={{marginBottom:'1.2rem', background:'#fff', borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.07)', overflow:'visible', border:'1px solid #e0e0e0'}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.7rem 1.3rem', borderBottom:'1px solid #e0e0e0', background:'#f7f7f7'}}>
        <div style={{fontWeight:'bold', fontSize:'1.08rem', color:'#1976d2', letterSpacing:'0.01em'}}>
          Přehled vozového parku
          <span style={{fontWeight:'normal', color:'#555', fontSize:'0.98em', marginLeft:10}}>
            ({filtered.length} zobrazeno)
          </span>
        </div>
        <button
          onClick={() => {
            setChartsVisible(v => {
              localStorage.setItem('chartsVisible', String(!v));
              return !v;
            });
          }}
          aria-label={chartsVisible ? 'Skrýt přehled' : 'Zobrazit přehled'}
          style={{border:'none', background:'transparent', cursor:'pointer', fontSize:'1.5rem', color:'#1976d2', padding:4, marginLeft:8, transition:'transform 0.2s'}}
        >
          {chartsVisible ? <FiChevronUp /> : <FiChevronDown />}
        </button>
      </div>
      {chartsVisible && (
        <div style={{padding:'1.1rem 1.3rem 1.2rem 1.3rem'}}>
          <VehicleCharts
            data={filtered}
            positions={positions}
            filteredCount={filtered.length}
            onKmSliceClick={setKmFilter}
            activeKmFilter={kmFilter}
            onTypeSliceClick={setTypeFilter}
            activeTypeFilter={typeFilter}
            onStationSliceClick={setStationFilter}
            activeStationFilter={stationFilter}
          />
          <div style={{display:'flex', alignItems:'center', gap:'16px', marginTop:8}}>
            <button
              onClick={() => setRowHighlightEnabled(v => !v)}
              style={{
                background: rowHighlightEnabled ? '#e3f2fd' : '#f7f7f7',
                color: rowHighlightEnabled ? '#1976d2' : '#888',
                border: '1px solid #1976d2',
                borderRadius: 6,
                padding: '0.25rem 1.1rem',
                fontSize: '0.98em',
                fontWeight: 500,
                cursor: 'pointer'
              }}
              title={rowHighlightEnabled ? 'Vypnout podbarvení řádků podle km' : 'Zapnout podbarvení řádků'}
            >
              {rowHighlightEnabled ? 'Vypnout podbarvení řádků' : 'Zapnout podbarvení řádků'}
            </button>
            {kmFilter && (
              <button
                onClick={() => setKmFilter(null)}
                style={{
                  background: '#e3f2fd',
                  color: '#1976d2',
                  border: '1px solid #1976d2',
                  borderRadius: 6,
                  padding: '0.25rem 1.1rem',
                  fontSize: '0.98em',
                  fontWeight: 500,
                  cursor: 'pointer',
                  marginLeft: 8
                }}
                title="Zrušit filtr km"
              >
                Zrušit filtr km ({kmFilter})
              </button>
            )}
            {typeFilter && (
              <button
                onClick={() => setTypeFilter(null)}
                style={{
                  background: '#fff3e0',
                  color: '#d84315',
                  border: '1px solid #ffb300',
                  borderRadius: 6,
                  padding: '0.25rem 1.1rem',
                  fontSize: '0.98em',
                  fontWeight: 500,
                  cursor: 'pointer',
                  marginLeft: 8
                }}
                title="Zrušit filtr typu vozidla"
              >
                Zrušit filtr typu vozidla ({typeFilter})
              </button>
            )}
            {stationFilter && (
              <button
                onClick={() => setStationFilter(null)}
                style={{
                  background: '#e0f7fa',
                  color: '#00838f',
                  border: '1px solid #00bcd4',
                  borderRadius: 6,
                  padding: '0.25rem 1.1rem',
                  fontSize: '0.98em',
                  fontWeight: 500,
                  cursor: 'pointer',
                  marginLeft: 8
                }}
                title="Zrušit filtr stanoviště"
              >
                Zrušit filtr stanoviště ({stationFilter})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
