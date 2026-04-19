import VehicleRefreshButton from '../components/vehicles/VehicleRefreshButton';
import '../styles/pages/Vehicles.css';
import vehicleKmColors from '../utils/vehicleKmColors';
import { FiChevronDown, FiChevronUp, FiRefreshCw } from 'react-icons/fi';

import { MdLocationCity, MdLocalHospital } from 'react-icons/md';
import { FiMapPin, FiMap, FiUser, FiSmartphone, FiKey, FiNavigation, FiTruck, FiLayers, FiVolume2 } from 'react-icons/fi';

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchVehicles, fetchVehiclePositions, postWebDispecink, fetchVehicleKmMonth } from '../api/webDispecinkDB';
import VehicleCharts from '../components/vehicles/VehicleCharts';
import VehicleTable from '../components/vehicles/VehicleTable';
import VehicleMobileList from '../components/vehicles/VehicleMobileList';
import VehicleMobileCard from '../components/vehicles/VehicleMobileCard';
import VehicleModal from '../components/vehicles/VehicleModal';
import VehicleStatsModal from '../components/vehicles/VehicleStatsModal';
import VehiclePaging from '../components/vehicles/VehiclePaging';
import VehicleChartsPanel from '../components/vehicles/VehicleChartsPanel';
import MobileTabs from '../components/vehicles/MobileTabs';
import Fleet250kStatsBlock from '../components/vehicles/Fleet250kStatsBlock';
import StationsMapBlock from '../components/vehicles/StationsMapBlock';

import { formatCzDate, highlightMatch, removeDiacritics } from '../utils/format';

// Pomocná funkce pro český formát data a času
function formatCzDateTime(dt) {
	if (!dt) return '';
	const d = new Date(dt);
	if (isNaN(d.getTime())) return dt;
	const pad = n => n < 10 ? '0' + n : n;
	return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${pad(d.getFullYear())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const PAGE_SIZES = [15, 30, 50, 100];

const Vehicles = () => {
	// --- Carid filter from chart ---
	const [statChartCarids, setStatChartCarids] = useState([]);
	const handleChartCaridFilter = (carids) => {
		setStatChartCarids(carids);
		setPage(1);
	};
	const handleClearChartCaridFilter = () => {
		setStatChartCarids([]);
		setPage(1);
	}
	const [modalCarId, setModalCarId] = useState(null);
	// --- STATISTIKA MODAL ---
	const [statCarId, setStatCarId] = useState(null);
	const [statData, setStatData] = useState(null);
	const [statLoading, setStatLoading] = useState(false);
	const [statError, setStatError] = useState('');

	const handleStatClick = async (carid) => {
		setStatCarId(carid);
		setStatLoading(true);
		setStatError('');
		setStatData(null);
		try {
			// 1. Dotaz na API - detail vozidla
			const vehicleDetail = await fetchVehicles({ id: carid });
			// 2. Dotaz na DB - km data
			const interval = process.env.REACT_APP_KM_MONTHS_BACK || 3;
			const json = await import('../api/webDispecinkDB').then(mod => mod.fetchVehicleKmMonthWithRefresh(carid, interval));
			if (json.status === 'success' && json.km && json.km.length > 0) {
				setStatData(json.km);
			} else {
				setStatError(json.message || 'Chyba při načítání statistiky.');
			}
		} catch (e) {
			setStatError('Chyba při načítání statistiky.');
		}
		setStatLoading(false);
	};

	// --- VŠECHNY HOOKY useState pro dropdowny musí být zde, před jakýmkoli použitím! ---
	// Typ vozidla
	const [showTypeDropdown, setShowTypeDropdown] = useState(false);
	const [selectedTypes, setSelectedTypes] = useState([]);
	const [pendingTypes, setPendingTypes] = useState([]);
	// Stanoviště
	const [showStationDropdown, setShowStationDropdown] = useState(false);
	const [selectedStations, setSelectedStations] = useState([]);
	const [pendingStations, setPendingStations] = useState([]);
	// Okresy
	const [showGroupDropdown, setShowGroupDropdown] = useState(false);
	const [selectedGroups, setSelectedGroups] = useState([]);
	const [pendingGroups, setPendingGroups] = useState([]);

	// Filtr podle km (výseč grafu)
	const [kmFilter, setKmFilter] = useState(null);
	// Filtr podle typu (výseč grafu)
	const [typeFilter, setTypeFilter] = useState(null);
	// Filtr podle stanoviště (výseč grafu)
	const [stationFilter, setStationFilter] = useState(null);
	// Filtr podle dotace (A)
	const [filterDotaceA, setFilterDotaceA] = useState(false);
	// Detekce mobilního zařízení (na výšku, max-width 600px)
	const [isMobilePortrait, setIsMobilePortrait] = useState(() => {
		if (typeof window !== 'undefined') {
			return window.matchMedia('(max-width: 600px) and (orientation: portrait)').matches;
		}
		return false;
	});
	useEffect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(max-width: 600px) and (orientation: portrait)');
		const handler = e => setIsMobilePortrait(e.matches);
		mq.addEventListener('change', handler);
		setIsMobilePortrait(mq.matches);
		return () => mq.removeEventListener('change', handler);
	}, []);
	// ...all React hooks (useState, useEffect, useNavigate, etc.) must be called here, before any return or condition...
	// All hooks below (unconditional)
	// Dropdown pro okresy - zavírání při kliknutí mimo

	useEffect(() => {
		if (!showGroupDropdown) return;
		const handle = () => setShowGroupDropdown(false);
		window.addEventListener('click', handle);
		return () => window.removeEventListener('click', handle);
	}, [showGroupDropdown]);

	const [search, setSearch] = useState('');
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(30);
	const [data, setData] = useState([]);
	const [sort, setSort] = useState({ field: '', dir: 'asc' });
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	// Pozice pro jednotlivá auta: { [w_carid]: [záznamy] }
	const [positions, setPositions] = useState({});
	const [expanded, setExpanded] = useState({}); // { [w_carid]: true/false }
	const [refreshing, setRefreshing] = useState(false);
	const navigate = useNavigate();
	useEffect(() => {
		setLoading(true);
		setError('');
		fetchVehicles()
			.then((json) => {
				// Očekáváme { status: 'success', cars: [...] }
				if (json.status === 'success' && Array.isArray(json.cars)) {
					setData(json.cars);
				} else {
					setData([]);
				}
				setLoading(false);
			})
			.catch((e) => {
				setError('Chyba při načítání dat.');
				setLoading(false);
			});
	}, []);
	// Přepínač podbarvení řádků musí být zde, ne v podmínce!
	const [rowHighlightEnabled, setRowHighlightEnabled] = useState(true);
	// Stanoviště - získání unikátních hodnot
	const stationOptions = Array.from(new Set(data.map(v => v.w_stanoviste || 'Neznámé'))).sort();
	// Okresy - získání unikátních hodnot
	const groupOptions = Array.from(new Set(data.map(v => v.w_groupname || 'Neznámé'))).sort();
	// Typy vozidel - unikátní hodnoty
	const typeOptions = Array.from(new Set(data.map(v => v.zzs_typ || 'Neznámý'))).sort();

	// Zachování stavu viditelnosti boxů v localStorage
	const getChartsVisible = () => {
		const v = localStorage.getItem('chartsVisible');
		return v === null ? true : v === 'true';
	};
	const getFilterVisible = () => {
		const v = localStorage.getItem('filterVisible');
		return v === null ? true : v === 'true';
	};
	const [chartsVisible, setChartsVisible] = useState(getChartsVisible());
	const [filterVisible, setFilterVisible] = useState(getFilterVisible());
	// Dropdown pro stanoviště - zavírání při kliknutí mimo
 
	useEffect(() => {
		if (!showStationDropdown) return;
		const handle = () => setShowStationDropdown(false);
		window.addEventListener('click', handle);
		return () => window.removeEventListener('click', handle);
	}, [showStationDropdown]);
	// Filtrování podle fulltextu, stanoviště, okresu a typu
	let filtered = data.filter(
		v => {
			// If chart carid filter is active, only show matching carids
			if (statChartCarids.length > 0 && !statChartCarids.includes(v.w_carid)) return false;
			// Zahrnout i poslední najeté km do filtru
			let km = '';
			let lastKmNum = null;
			let podradekFields = [];
			// Pozice a MT data jsou přímo v hlavním objektu (pos_km, mt_* atd.)
			if (v.pos_km) {
				km = String(v.pos_km);
				lastKmNum = Number(v.pos_km);
			}
			// Přidej relevantní pole z MT dat do pole pro vyhledávání
			podradekFields = [
				v.mt_sestra_SIM,
				v.mt_sestra_IMEI,
				v.mt_inv_cis_sestra,
				v.mt_ridic_SIM,
				v.mt_ridic_IMEI,
				v.mt_inv_cis_ridic,
				v.mt_skupina,
				v.mt_cela_adresa,
				v.pos_zs,
				v.pos_zd,
				v.pos_ln
			].filter(Boolean).map(String);
			// Filtr podle km (výseč)
			let kmMatchFilter = true;
			if (kmFilter) {
				if (lastKmNum === null) kmMatchFilter = false;
				else if (kmFilter === '0+') kmMatchFilter = lastKmNum >= 0 && lastKmNum < 100000;
				else if (kmFilter === '≥500 000') kmMatchFilter = lastKmNum >= 500000;
				else if (kmFilter === '400 000+') kmMatchFilter = lastKmNum >= 400000 && lastKmNum < 500000;
				else if (kmFilter === '300 000+') kmMatchFilter = lastKmNum >= 300000 && lastKmNum < 400000;
				else if (kmFilter === '200 000+') kmMatchFilter = lastKmNum >= 200000 && lastKmNum < 300000;
				else if (kmFilter === '100 000+') kmMatchFilter = lastKmNum >= 100000 && lastKmNum < 200000;
			}
			// Filtr stanoviště
			const stationMatch = stationFilter ? (v.w_groupname || 'Neznámé') === stationFilter : (selectedGroups.length === 0 || selectedGroups.includes(v.w_groupname || 'Neznámé'));
			// Filtr okresy
			const groupMatch = selectedGroups.length === 0 || selectedGroups.includes(v.w_groupname || 'Neznámé');
			// Filtr typ vozidla (výseč grafu nebo multiselect)
			const typeMatch = (typeFilter ? (v.zzs_typ || 'Neznámý') === typeFilter : (selectedTypes.length === 0 || selectedTypes.includes(v.zzs_typ || 'Neznámý')));
			// Fulltext nad hlavními daty, km, a podřádkem
			const searchLower = removeDiacritics(search.toLowerCase());
			const mainMatch = Object.values(v).some(val => removeDiacritics(String(val).toLowerCase()).includes(searchLower));
			const kmMatch = removeDiacritics(km.toLowerCase()).includes(searchLower);
			const podradekMatch = podradekFields.some(val => removeDiacritics(val.toLowerCase()).includes(searchLower));
			return (
				(mainMatch || kmMatch || podradekMatch) &&
				stationMatch &&
				groupMatch &&
				typeMatch &&
				// If filterDotaceA is enabled, only include vehicles whose dotace is 'A'
				(!filterDotaceA || String(v.dotace || '').toUpperCase() === 'A') &&
				kmMatchFilter
			);
		}
	);
	// Řazení
	if (sort.field) {
		filtered = [...filtered].sort((a, b) => {
			let av = a[sort.field], bv = b[sort.field];
			// Speciální řazení pro "Nájezd" (pos_km z hlavního dotazu)
			if (sort.field === 'najezd') {
				const akm = a.pos_km ? Number(a.pos_km) : -1;
				const bkm = b.pos_km ? Number(b.pos_km) : -1;
				return sort.dir === 'asc' ? akm - bkm : bkm - akm;
			}
			// Speciální řazení pro "Zasmluvněno" (Datum_od, formát DD.MM.YYYY)
			if (sort.field === 'Zasmluvneno') {
				const parseCzDate = d => {
					if (!d) return '';
					const m = d.match(/(\d{2})\.(\d{2})\.(\d{4})/);
					if (m) return m[3] + m[2] + m[1];
					return d;
				};
				const ad = parseCzDate(a.Datum_od), bd = parseCzDate(b.Datum_od);
				return sort.dir === 'asc' ? ad.localeCompare(bd) : bd.localeCompare(ad);
			}
			// Přidejte podporu pro řazení podle zzs_typ
			if (sort.field === 'zzs_typ') {
				return sort.dir === 'asc'
					? String(av || '').localeCompare(String(bv || ''), 'cs')
					: String(bv || '').localeCompare(String(av || ''), 'cs');
			}
			// Číselné řazení pokud jsou čísla
			if (!isNaN(Number(av)) && !isNaN(Number(bv))) {
				av = Number(av); bv = Number(bv);
				return sort.dir === 'asc' ? av - bv : bv - av;
			}
			// Datumové řazení (YYYY-MM-DD ...)
			if (sort.field === 'w_datod' || sort.field === 'dt_aktualizace') {
				return sort.dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
			}
			// Textové řazení
			return sort.dir === 'asc' ? String(av).localeCompare(String(bv), 'cs') : String(bv).localeCompare(String(av), 'cs');
		});
	}
	// Paging
	const pageCount = Math.ceil(filtered.length / pageSize);
	const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
	const handlePageChange = (newPage) => {
		setPage(newPage);
	};
	const handlePageSizeChange = (e) => {
		setPageSize(Number(e.target.value));
		setPage(1);
	};
	// Handler pro rozbalení/stažení detailu auta
	const handleExpand = async (carid) => {
		// Pokud už je rozbaleno, pouze zavři
		if (expanded[carid]) {
			setExpanded(exp => ({ ...exp, [carid]: false }));
			return;
		}
		setExpanded(exp => ({ ...exp, [carid]: true }));
		// Pokud ještě nejsou načteny pozice, načti je
		if (positions[carid] === undefined) {
			setPositions(pos => ({ ...pos, [carid]: null })); // null = loading
			try {
				const json = await fetchVehiclePositions(carid);
				// Očekáváme { status: 'success', positions: [...] }
				if (json.status === 'success' && Array.isArray(json.positions)) {
					setPositions(pos => ({ ...pos, [carid]: json.positions }));
				} else {
					setPositions(pos => ({ ...pos, [carid]: [] }));
				}
			} catch {
				setPositions(pos => ({ ...pos, [carid]: [] }));
			}
		}
	};
	const handleWebDispecinkRefresh = async () => {
		setRefreshing(true);
		try {
			// Proveď POST dotazy na webDispečink API (paralelně - jsou nezávislé)
			await Promise.all([
				postWebDispecink('wdCarsList'),
				postWebDispecink('wdCarsGroup'),
				postWebDispecink('wdCarsIDPosition'),
				postWebDispecink('wdCarsGeneralInfo'),
			]);
			setLoading(true);
			setError('');
			const json = await fetchVehicles();
			if (json && Array.isArray(json.cars) && json.cars.length > 0) {
				setData(json.cars);
				// Reset pozic - budou se lazy-loadovat při rozbalení
				setPositions({});
				setExpanded({});
			} else {
				setData([]);
			}
			setLoading(false);
		} catch (e) {
			setError('Chyba při aktualizaci dat z webDispečinku.');
			setData([]);
			setLoading(false);
		}
		setRefreshing(false);
	};
	// Paging pro mobilní verzi - hooky musí být volány vždy
	const mobilePageSize = 80;
	const [mobilePage, setMobilePage] = useState(1);
	const mobilePageCount = Math.ceil(filtered.length / mobilePageSize);
	const mobilePaged = filtered.slice((mobilePage - 1) * mobilePageSize, mobilePage * mobilePageSize);

	// Globální rozbalení/sbalení všech podrádků (musí být před return!)
	const allExpanded = paged.length > 0 && paged.every(v => expanded[v.w_carid]);
	const handleExpandAll = () => {
		const newExpanded = { ...expanded };
		paged.forEach(v => {
			newExpanded[v.w_carid] = !allExpanded;
		});
		setExpanded(newExpanded);
	};

	// Mobilní záložky: hooks musí být vždy nahoře
	const [activeTab, setActiveTab] = React.useState('cards');
	React.useEffect(() => { setActiveTab('cards'); }, [refreshing]);

	// Mobilní render pouze v návratové části
	if (isMobilePortrait) {
		// Helper for phone rendering
		const renderPhone = (label, value) => {
			if (!value) return <span style={{color:'#888'}}>Není k dispozici</span>;
			const phone = String(value).replace(/\s+/g, '');
			return (
				<a href={`tel:${phone}`} style={{color:'#1976d2', textDecoration:'underline', fontWeight:'bold'}} title={`Zavolat ${label}`}>{value}</a>
			);
		};
		// Layout: header (fixed), filter (fixed), tabs (fixed), content (scroll)
		// Header is outside this block, so start with filter+tabs
		// --- UI fixy: header height, padding, content offset ---
		// header height: 48px (original)
	const HEADER_HEIGHT = 96; // double original for more space
		// filter+tabs height: 88px (44+44)
	const FILTER_TABS_HEIGHT = 30;
		// Remove scroll from tab content, let main page scroll
		return (
			<div className="vehicles-mobile" style={{background:'#f7f7f7', minHeight:'100vh', width:'100%', overflowX:'hidden'}}>
				{/* Filter (fixed) */}
				<div style={{position:'fixed', top:HEADER_HEIGHT, left:0, width:'100vw', zIndex:1001, background:'#f7f7f7', boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
					<div style={{display:'flex', alignItems:'center', justifyContent:'space-between', maxWidth:'420px', width:'96%', margin:'0 auto', padding:'0.7rem 0.3rem 0.5rem 0.3rem', borderBottom:'1px solid #e0e0e0', background:'#f7f7f7'}}>
						<input
							type="text"
							placeholder="Vyhledat vozidlo..."
							value={search}
							onChange={e => { setSearch(e.target.value); setMobilePage(1); }}
							style={{flex:1, minWidth:0, fontSize:'1.1rem', padding:'0.6rem 2.2em 0.6rem 0.8em', borderRadius:8, border:'1px solid #bbb', background:'#fff', boxSizing:'border-box'}}
						/>
						{search && (
							<button
								type="button"
								onClick={() => { setSearch(''); setMobilePage(1); }}
								aria-label="Vymazat hledání"
								style={{
									position:'absolute',
									right:'3.5rem',
									top:'50%',
									transform:'translateY(-50%)',
									background:'transparent',
									border:'none',
									cursor:'pointer',
									fontSize:'1.45em',
									color:'#888',
									padding:0,
									lineHeight:1,
									zIndex:2,
									width:'1.5em',
									height:'1.5em',
									display:'flex',
									alignItems:'center',
									justifyContent:'center'
								}}
							>
								&#10005;
							</button>
						)}
						<button
							onClick={handleWebDispecinkRefresh}
							style={{marginLeft:10, background:'#1976d2', color:'#fff', border:'none', borderRadius:8, padding:'0.5rem 0.8rem', fontSize:'1.3rem', cursor:'pointer', display:'flex', alignItems:'center'}}
							disabled={refreshing}
							title="Aktualizovat data"
						>
							<FiRefreshCw />
						</button>
					</div>
					{/* Tabs (fixed below filter) */}
					<MobileTabs activeTab={activeTab} setActiveTab={setActiveTab} />
				</div>
				{/* Content area: scrollable, below header+filter+tabs */}
				<div style={{
					marginTop: HEADER_HEIGHT + FILTER_TABS_HEIGHT,
					width:'100%',
					maxWidth:'100vw',
					boxSizing:'border-box',
					background:'#f7f7f7',
					padding:'0.35rem 0.7rem 1.5rem 0.7rem',
				}}>
					{activeTab === 'cards' ? (
						loading ? (
							<div style={{padding:'2rem', textAlign:'center'}}>Načítám data...</div>
						) : (
							<>
								<VehicleMobileList mobilePaged={mobilePaged} positions={positions} renderPhone={renderPhone} connectionError={!!error && !loading} />
								{mobilePageCount > 1 && (
									<div style={{display:'flex', justifyContent:'center', alignItems:'center', margin:'1.2rem 0 0.5rem 0', gap:'1.2rem'}}>
										<button
											style={{padding:'0.5rem 1.1rem', borderRadius:8, border:'1px solid #bbb', background:'#fff', color:'#1976d2', fontWeight:'bold', fontSize:'1.1rem', cursor: mobilePage === 1 ? 'not-allowed' : 'pointer'}}
											disabled={mobilePage === 1}
											onClick={() => setMobilePage(mobilePage - 1)}
										>&lt;</button>
										<span style={{fontSize:'1.08rem', color:'#444'}}>{mobilePage} / {mobilePageCount}</span>
										<button
											style={{padding:'0.5rem 1.1rem', borderRadius:8, border:'1px solid #bbb', background:'#fff', color:'#1976d2', fontWeight:'bold', fontSize:'1.1rem', cursor: mobilePage === mobilePageCount ? 'not-allowed' : 'pointer'}}
											disabled={mobilePage === mobilePageCount}
											onClick={() => setMobilePage(mobilePage + 1)}
										>&gt;</button>
									</div>
								)}
							</>
						)
					) : (
						// Statistiky tab: charts stacked vertically, full width
						<div style={{width:'100%', maxWidth:'100vw', margin:'0 auto'}}>
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
						</div>
					)}
				</div>
			</div>
		);
	}

	// Desktop render (full backup code)
	return (
		<div className="vehicles-page">
			<div className="vehicles-nav">
				<button className="vehicles-back" onClick={() => navigate('/')}>⟵ Zpět na Dashboard</button>
			</div>
			<VehicleChartsPanel
				chartsVisible={chartsVisible}
				setChartsVisible={setChartsVisible}
				filtered={filtered}
				positions={positions}
				rowHighlightEnabled={rowHighlightEnabled}
				setRowHighlightEnabled={setRowHighlightEnabled}
				kmFilter={kmFilter}
				setKmFilter={setKmFilter}
				typeFilter={typeFilter}
				setTypeFilter={setTypeFilter}
				stationFilter={stationFilter}
				setStationFilter={setStationFilter}
			/>				<StationsMapBlock vehicles={filtered} />									<Fleet250kStatsBlock
										data={filtered}
										positions={positions}
										onChartFilter={handleChartCaridFilter}
										chartCarids={statChartCarids}
										onClearChartFilter={handleClearChartCaridFilter}
									/>
		
			{/* FILTRAČNÍ BOX NAD TABULKOU */}
			<div style={{margin:'1.2rem 0', background:'#fff', borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.07)', border:'1px solid #e0e0e0', overflow:'visible'}}>
				<div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.7rem 1.3rem', borderBottom:'1px solid #e0e0e0', background:'#f7f7f7'}}>
					<div style={{fontWeight:'bold', fontSize:'1.08rem', color:'#1976d2', letterSpacing:'0.01em'}}>
						Filtr vozidel
						<span style={{fontWeight:'normal', color:'#555', fontSize:'0.98em', marginLeft:10}}>
							(možnosti filtru)
						</span>
					</div>
					<button
						onClick={() => {
							setFilterVisible(v => {
								localStorage.setItem('filterVisible', String(!v));
								return !v;
							});
						}}
						aria-label={filterVisible ? 'Skrýt filtr' : 'Zobrazit filtr'}
						style={{border:'none', background:'transparent', cursor:'pointer', fontSize:'1.5rem', color:'#1976d2', padding:4, marginLeft:8, transition:'transform 0.2s'}}
					>
						{filterVisible ? <FiChevronUp /> : <FiChevronDown />}
					</button>
				</div>
						{filterVisible && (
							<div className="vehicles-filter-box" style={{padding:'1.1rem 1.5rem', display:'flex', alignItems:'center', gap:'2.2rem', flexWrap:'wrap', overflow:'visible'}}>
								<div style={{display:'flex', alignItems:'center', width:'100%', gap:'1.2rem'}}>
									{/* Fulltext vyhledávání */}
									<div style={{position:'relative', flex:'1 1 0%', minWidth:120, maxWidth:'100%', marginRight:'0.8rem'}}>
										<input
											className="vehicles-search"
											type="text"
											placeholder="Vyhledat..."
											value={search}
											onChange={e => {
												setSearch(e.target.value);
												setPage(1); // Reset na první stránku při změně vyhledávání
											}}
											style={{width:'100%', paddingRight:'2.2em', boxSizing:'border-box'}}
										/>
										{search && (
											<button
												type="button"
												onClick={() => { setSearch(''); setPage(1); }}
												aria-label="Vymazat hledání"
												style={{
													position:'absolute',
													right:'6px',
													top:'50%',
													transform:'translateY(-50%)',
													background:'transparent',
													border:'none',
													cursor:'pointer',
													fontSize:'1.25em',
													color:'#888',
													padding:0,
													lineHeight:1,
													zIndex:2,
													width:'1.5em',
													height:'1.5em',
													display:'flex',
													alignItems:'center',
													justifyContent:'center'
												}}
											>
												&#10005;
											</button>
										)}
									</div>
									{/* Typ vozidla dropdown */}
									<div style={{position:'relative', minWidth:180, flex:'0 0 auto'}}>
										<button
											type="button"
											style={{minWidth:160, padding:'0.3rem 1.5rem 0.3rem 0.7rem', borderRadius:6, border:'1px solid #bbb', background:'#fff', fontSize:'1rem', cursor:'pointer', textAlign:'left', position:'relative'}}
											onClick={e => {
												e.stopPropagation();
												setShowTypeDropdown(v => !v);
												setPendingTypes(selectedTypes);
											}}
										>
											{selectedTypes.length === 0 ? 'Typ vozidla...' : selectedTypes.join(', ')}
											<span style={{position:'absolute', right:10, top:8, pointerEvents:'none', fontSize:'1.25em', color:'#888'}}>
												{showTypeDropdown ? <FiChevronUp /> : <FiChevronDown />}
											</span>
										</button>
										{showTypeDropdown && (
											<div style={{position:'absolute', zIndex:10, top:'110%', left:0, minWidth:180, background:'#fff', border:'1px solid #bbb', borderRadius:6, boxShadow:'0 2px 8px rgba(0,0,0,0.13)', padding:'0.3rem 0', maxHeight:320, overflowY:'auto'}}>
												<div style={{padding:'0.18rem 1rem', borderBottom:'1px solid #eee', background:'#f7f7f7', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8}}>
													<button
														type="button"
														style={{padding:'0.25rem 1.2rem', borderRadius:6, border:'1px solid #1976d2', background:'#1976d2', color:'#fff', fontWeight:'bold', fontSize:'1rem', cursor:'pointer'}}
														onClick={e => {
															e.stopPropagation();
															setSelectedTypes(pendingTypes);
															setShowTypeDropdown(false);
															setPage(1);
														}}
													>Použij</button>
													<button
														type="button"
														style={{padding:'0.25rem 1.2rem', borderRadius:6, border:'1px solid #bbb', background:'#fff', color:'#1976d2', fontWeight:'bold', fontSize:'1rem', cursor:'pointer'}}
														onClick={e => {
															e.stopPropagation();
															setPendingTypes([]);
															setSelectedTypes([]);
															setShowTypeDropdown(false);
															setPage(1);
														}}
													>Zruš</button>
												</div>
												{typeOptions.map(type => (
													<label key={type} style={{display:'flex', alignItems:'center', padding:'0.18rem 1rem', cursor:'pointer', fontSize:'1rem'}}>
														<input
															type="checkbox"
															checked={pendingTypes.includes(type)}
															onClick={e => e.stopPropagation()}
															onChange={e => {
																e.stopPropagation();
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
									{/* Lokalita dropdown */}
									<div style={{position:'relative', minWidth:180, flex:'0 0 auto'}}>
										<button
											type="button"
											style={{minWidth:160, padding:'0.3rem 1.5rem 0.3rem 0.7rem', borderRadius:6, border:'1px solid #bbb', background:'#fff', fontSize:'1rem', cursor:'pointer', textAlign:'left', position:'relative'}}
											onClick={e => {
												e.stopPropagation();
												setShowStationDropdown(v => !v);
												setPendingStations(selectedStations);
											}}
										>
											{selectedStations.length === 0 ? 'Lokalita...' : selectedStations.join(', ')}
											<span style={{position:'absolute', right:10, top:8, pointerEvents:'none', fontSize:'1.25em', color:'#888'}}>
												{showStationDropdown ? <FiChevronUp /> : <FiChevronDown />}
											</span>
										</button>
										{showStationDropdown && (
											<div style={{position:'absolute', zIndex:10, top:'110%', left:0, minWidth:180, background:'#fff', border:'1px solid #bbb', borderRadius:6, boxShadow:'0 2px 8px rgba(0,0,0,0.13)', padding:'0.3rem 0', maxHeight:320, overflowY:'auto'}}>
												<div style={{padding:'0.18rem 1rem', borderBottom:'1px solid #eee', background:'#f7f7f7', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8}}>
													<button
														type="button"
														style={{padding:'0.25rem 1.2rem', borderRadius:6, border:'1px solid #1976d2', background:'#1976d2', color:'#fff', fontWeight:'bold', fontSize:'1rem', cursor:'pointer'}}
														onClick={e => {
															e.stopPropagation();
															setSelectedStations(pendingStations);
															setShowStationDropdown(false);
															setPage(1); // Použij filtr až po kliknutí
														}}
													>Použij</button>
													<button
														type="button"
														style={{padding:'0.25rem 1.2rem', borderRadius:6, border:'1px solid #bbb', background:'#fff', color:'#1976d2', fontWeight:'bold', fontSize:'1rem', cursor:'pointer'}}
														onClick={e => {
															e.stopPropagation();
															setPendingStations([]);
															setSelectedStations([]);
															setShowStationDropdown(false);
															setPage(1); // Zruš filtr
														}}
													>Zruš</button>
												</div>
												{stationOptions.map(stan => (
													<label key={stan} style={{display:'flex', alignItems:'center', padding:'0.18rem 1rem', cursor:'pointer', fontSize:'1rem'}}>
														<input
															type="checkbox"
															checked={pendingStations.includes(stan)}
															onClick={e => e.stopPropagation()}
															onChange={e => {
																e.stopPropagation(); // zabrání zavření dropdownu
																let newSelected;
																if (e.target.checked) {
																	newSelected = [...pendingStations, stan];
																} else {
																	newSelected = pendingStations.filter(s => s !== stan);
																}
																setPendingStations(newSelected);
																// NEaplikovat filtr hned, pouze změnit výběr
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
									<div style={{position:'relative', minWidth:180, flex:'0 0 auto'}}>
										<button
											type="button"
											style={{minWidth:160, padding:'0.3rem 1.5rem 0.3rem 0.7rem', borderRadius:6, border:'1px solid #bbb', background:'#fff', fontSize:'1rem', cursor:'pointer', textAlign:'left', position:'relative'}}
											onClick={e => {
												e.stopPropagation();
												setPendingGroups(selectedGroups);
												setShowGroupDropdown(v => !v);
											}}
										>
																	{selectedGroups.length === 0
																		? 'Stanoviště...'
												: selectedGroups
														.map((g, idx) =>
															g && g.toLowerCase().includes('root')
																? <span key={g + idx} style={{color:'#888'}}>Nezařazeno{idx < selectedGroups.length - 1 ? ', ' : ''}</span>
																: <span key={g + idx}>{g}{idx < selectedGroups.length - 1 ? ', ' : ''}</span>
														)
											}
											<span style={{position:'absolute', right:10, top:8, pointerEvents:'none', fontSize:'1.25em', color:'#888'}}>
												{showGroupDropdown ? <FiChevronUp /> : <FiChevronDown />}
											</span>
										</button>
										{typeof showGroupDropdown !== 'undefined' && showGroupDropdown && (
											<div style={{position:'absolute', zIndex:10, top:'110%', left:0, minWidth:180, background:'#fff', border:'1px solid #bbb', borderRadius:6, boxShadow:'0 2px 8px rgba(0,0,0,0.13)', padding:'0.3rem 0', maxHeight:320, overflowY:'auto'}}>
												<div style={{padding:'0.18rem 1rem', borderBottom:'1px solid #eee', background:'#f7f7f7', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8}}>
													<button
														type="button"
														style={{padding:'0.25rem 1.2rem', borderRadius:6, border:'1px solid #1976d2', background:'#1976d2', color:'#fff', fontWeight:'bold', fontSize:'1rem', cursor:'pointer'}}
														onClick={e => {
														 e.stopPropagation();
														 setSelectedGroups(pendingGroups);
														 setShowGroupDropdown(false);
														 setPage(1);
														}}
													>Použij</button>
													<button
														type="button"
														style={{padding:'0.25rem 1.2rem', borderRadius:6, border:'1px solid #bbb', background:'#fff', color:'#1976d2', fontWeight:'bold', fontSize:'1rem', cursor:'pointer'}}
														onClick={e => {
															e.stopPropagation();
															setPendingGroups([]);
															setSelectedGroups([]);
														 setShowGroupDropdown(false);
														}}
													>Zruš</button>
												</div>
												{groupOptions.map(group => (
													<label key={group} style={{display:'flex', alignItems:'center', padding:'0.18rem 1rem', cursor:'pointer', fontSize:'1rem'}}>
														<input
															type="checkbox"
															checked={pendingGroups.includes(group)}
															onClick={e => e.stopPropagation()}
															onChange={e => {
																e.stopPropagation();
															 let newSelected;
															 if (e.target.checked) {
																 newSelected = [...pendingGroups, group];
															 } else {
																 newSelected = pendingGroups.filter(s => s !== group);
															 }
															 setPendingGroups(newSelected);
															}}
															style={{marginRight:8}}
														/>
														{group && group.toLowerCase().includes('root')
															? <span style={{color:'#888'}}>Nezařazeno</span>
															: group}
													</label>
												))}
											</div>
										)}
									</div>
									{/* ZDE BUDE MOŽNÉ PŘIDÁVAT DALŠÍ FILTRAČNÍ PRVKY */}
									{/* <div>Další filtry...</div> */}
									{/* Filtr: pouze dotace A */}
									<div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:8}}>
										<label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer'}}>
											<input
												type="checkbox"
												checked={filterDotaceA}
												onChange={e => { setFilterDotaceA(e.target.checked); setPage(1); }}
												style={{width:16, height:16}}
											/>
											<span style={{fontSize:'0.95rem', color:'#333'}}>Dotace</span>
										</label>
									</div>
								</div>
							</div>
						)}
			</div>
			{/* HLAVIČKA SEZNAMU */}
			<div className="vehicles-header" style={{display:'flex', alignItems:'center', gap:'1.2rem', justifyContent:'space-between'}}>
				<h2 style={{marginRight:'2.5rem'}}>Seznam vozidel</h2>
				<div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'0.7rem'}}>
					{data.length > 0 && (() => {
						const maxDt = data.reduce((max, v) => {
							const dt = v.dt_aktualizace || '';
							return dt > max ? dt : max;
						}, '');
						return maxDt ? (
							<span style={{fontSize:'0.88rem', color:'#888', whiteSpace:'nowrap'}}>
								Aktualizováno: {formatCzDateTime(maxDt)}
							</span>
						) : null;
					})()}
					<VehicleRefreshButton refreshing={refreshing} handleWebDispecinkRefresh={handleWebDispecinkRefresh} />
				</div>
			</div>
				<div className="vehicles-table-wrapper" style={{position:'relative'}}>
					{refreshing && (
						<div style={{
							position:'absolute', top:0, left:0, right:0, bottom:0,
							background:'rgba(255,255,255,0.8)', zIndex:100,
							display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
							backdropFilter:'blur(2px)', borderRadius:12
						}}>
							<FiRefreshCw style={{fontSize:'2.5rem', color:'#1976d2', animation:'spin 1s linear infinite'}} />
							<div style={{fontWeight:'bold', fontSize:'1.1rem', color:'#1976d2', marginTop:'0.7rem'}}>
								Synchronizace z WebDispečinku...
							</div>
							<div style={{color:'#555', fontSize:'0.92rem', marginTop:'0.3rem'}}>
								Načítám aktuální data – stav tachometru, km, pozice...
							</div>
						</div>
					)}
					{loading ? (
						<div style={{padding: '2rem', textAlign: 'center'}}>Načítám data...</div>
					) : error ? (
						<div style={{padding: '2rem', color: 'red', textAlign: 'center'}}>{error}</div>
					) : (
						!isMobilePortrait ? (
															<VehicleTable
																paged={paged}
																expanded={expanded}
																positions={positions}
																rowHighlightEnabled={rowHighlightEnabled}
																vehicleKmColors={vehicleKmColors}
																handleExpand={handleExpand}
																handleExpandAll={handleExpandAll}
																allExpanded={allExpanded}
																highlightMatch={highlightMatch}
																search={search}
																formatCzDate={formatCzDate}
																formatCzDateTime={formatCzDateTime}
																isMobilePortrait={isMobilePortrait}
																setSort={setSort}
																sort={sort}
																onRowDoubleClick={carId => setModalCarId(carId)}
																selectedRowId={modalCarId}
																onStatClick={handleStatClick}
															/>
						) : (
							<VehicleMobileList
								mobilePaged={paged}
								positions={positions}
								renderPhone={highlightMatch}
							/>
						)
					)}
						<VehicleModal open={!!modalCarId} onClose={() => setModalCarId(null)}>
							{modalCarId && (() => {
								const v = data.find(x => x.w_carid === modalCarId);
								const last = v ? {
									w_km: v.pos_km, w_lp: v.pos_lp, w_ln: v.pos_ln,
									w_majak: v.pos_majak, w_zs: v.pos_zs, w_zd: v.pos_zd,
									dt_aktualizace: v.pos_dt_aktualizace
								} : {};
								return v ? <VehicleMobileCard v={v} last={last} /> : null;
							})()}
						</VehicleModal>
						<VehicleStatsModal
							open={!!statCarId}
							onClose={() => { setStatCarId(null); setStatData(null); setStatError(''); }}
							statLoading={statLoading}
							statError={statError}
							statData={statData}
							vehicle={statCarId ? (() => {
								const v = data.find(x => x.w_carid === statCarId);
								if (!v) return null;
								const celkovyNajezdKm = v.pos_km ? Number(v.pos_km) : null;
								return { ...v, celkovyNajezdKm };
							})() : null}
						/>
					</div>
				<VehiclePaging
					page={page}
					pageCount={pageCount}
					pageSize={pageSize}
					PAGE_SIZES={PAGE_SIZES}
					handlePageChange={handlePageChange}
					handlePageSizeChange={handlePageSizeChange}
				/>
		</div>
	);
};

export default Vehicles;
