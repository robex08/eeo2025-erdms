import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, Phone, Navigation, Search, Filter, Ambulance, Stethoscope, Info, Menu, X, Layers, ChevronLeft, ChevronRight, AlertTriangle, RefreshCw } from 'lucide-react';

// --- DATA: Seznam stanic ZZS SČK ---
const RAW_STATIONS = [
  // Kladno a okolí
  { id: 1, city: "Kladno", address: "Vančurova 1544 (areál nemocnice), 272 01 Kladno", crews: ["RV", "RZP", "RZP", "RZP"], coords: [50.1435, 14.0988], type: "main" },
  { id: 2, city: "Slaný", address: "Výjezdová základna Slaný (ASČR)", crews: ["RV", "RZP", "RZP"], coords: [50.2309, 14.0872], type: "partner" },
  { id: 3, city: "Rakovník", address: "Dukelských Hrdinů 200, 269 01 Rakovník", crews: ["RV", "RZP", "RZP"], coords: [50.1064, 13.7317], type: "standard" },
  { id: 4, city: "Jesenice u Rakovníka", address: "Plzeňská 420, 270 33 Jesenice u Rakovníka", crews: ["RZP"], coords: [50.0963, 13.4735], type: "standard" },
  { id: 5, city: "Nové Strašecí", address: "Čsl. Armády 414, 271 01, Nové Strašecí", crews: ["RZP"], coords: [50.1534, 13.9011], type: "standard" },
  { id: 6, city: "Roztoky u Křivoklátu", address: "Roztoky č.p. 275, 270 23 Křivoklát", crews: ["RZP"], coords: [50.0267, 13.8646], type: "standard" },
  
  // Beroun a okolí
  { id: 7, city: "Beroun", address: "Prof. Veselého 461, 266 01 Beroun", crews: ["RV", "RZP"], coords: [49.9668, 14.0724], type: "main" },
  { id: 8, city: "Zdice", address: "Čs. armády 18, Zdice", crews: ["RZP"], coords: [49.9142, 13.9785], type: "standard" },
  { id: 9, city: "Hořovice", address: "Pod Nádražím 654, 268 01 Hořovice", crews: ["RLP", "RZP"], coords: [49.8366, 13.9034], type: "standard" },
  { id: 10, city: "Řevnice", address: "Trans Hospital, Řevnice", crews: ["RLP"], coords: [49.9145, 14.2447], type: "partner" },
  
  // Příbram a jih
  { id: 11, city: "Příbram", address: "Školní 70, 261 95 Příbram", crews: ["RV", "RZP", "RZP", "RZP"], coords: [49.6896, 14.0104], type: "main" },
  { id: 12, city: "Dobříš", address: "Průmyslová 2121, 263 01 Dobříš", crews: ["RZP"], coords: [49.7827, 14.1706], type: "standard" },
  { id: 13, city: "Březnice", address: "Sadová 618, 262 72 Březnice", crews: ["RZP"], coords: [49.5574, 13.9542], type: "standard" },
  { id: 14, city: "Krásná Hora", address: "Krásná Hora nad Vltavou 192, 262 55", crews: ["RZP"], coords: [49.5936, 14.2835], type: "standard" },
  { id: 15, city: "Sedlčany", address: "Tyršova 160, 264 01 Sedlčany", crews: ["RV", "RZP", "RZP"], coords: [49.6587, 14.4258], type: "standard" },
  
  // Praha - Západ/Východ
  { id: 16, city: "Roztoky u Prahy", address: "Masarykova 2514, 252 63 Roztoky", crews: ["RZP"], coords: [50.1585, 14.3983], type: "standard" },
  { id: 17, city: "Hostivice", address: "Jiráskova 201, 253 01 Hostivice", crews: ["RV", "RZP"], coords: [50.0815, 14.2573], type: "standard" },
  { id: 18, city: "Zbraslav", address: "Žitavského čp. 497, 156 00 Praha - Zbraslav", crews: ["RV", "RZP"], coords: [49.9765, 14.3938], type: "partner" },
  { id: 19, city: "Jesenice u Prahy", address: "Budějovická 77, 252 42 Jesenice", crews: ["RV", "RZP"], coords: [49.9705, 14.5126], type: "standard" },
  { id: 20, city: "Davle", address: "Davle (ASČR)", crews: ["RZP"], coords: [49.8893, 14.3995], type: "partner" },
  { id: 21, city: "Mníšek pod Brdy", address: "Mníšek pod Brdy (ASČR)", crews: ["RV", "RZP"], coords: [49.8665, 14.2618], type: "partner" },
  { id: 22, city: "Hradištko", address: "Ve Dvoře 3, Hradištko", crews: ["RZP", "RZP"], coords: [49.8693, 14.4158], type: "standard" },
  { id: 23, city: "Ždáň (Slapy)", address: "Osada Ždáň 270, Slapy (VZS)", crews: ["RZP", "BOAT"], coords: [49.8105, 14.4277], type: "seasonal" },
  
  // Mělník, Mladá Boleslav
  { id: 24, city: "Mělník", address: "Bezručova 3409, 276 01 Mělník", crews: ["RV", "RZP", "RZP"], coords: [50.3542, 14.4754], type: "main" },
  { id: 25, city: "Kralupy nad Vltavou", address: "Kralupy nad Vltavou (ASČR)", crews: ["RV", "RZP"], coords: [50.2413, 14.3117], type: "partner" },
  { id: 26, city: "Neratovice", address: "Ed. Urxe 1027, 277 11, Neratovice", crews: ["RZP"], coords: [50.2588, 14.5168], type: "standard" },
  { id: 27, city: "Zdiby", address: "Ústecká 98, 250 66 Zdiby", crews: ["RZP"], coords: [50.1802, 14.4491], type: "standard" },
  { id: 28, city: "Mladá Boleslav", address: "Laurinova 333, 293 01 Mladá Boleslav", crews: ["RV", "RZP", "RZP"], coords: [50.4124, 14.9026], type: "main" },
  { id: 29, city: "Mnichovo Hradiště", address: "Jiráskova 1533, 259 01 Mnichovo Hradiště", crews: ["RZP"], coords: [50.5228, 14.9744], type: "standard" },
  { id: 30, city: "Benátky nad Jizerou", address: "Pražská 123, 294 71 Benátky n. J.", crews: ["RZP"], coords: [50.2905, 14.8236], type: "standard" },
  
  // Polabí
  { id: 31, city: "Brandýs nad Labem", address: "Františka Melichara 370, 251 01", crews: ["RV", "RZP", "RZP"], coords: [50.1873, 14.6613], type: "standard" },
  { id: 32, city: "Nymburk", address: "Smetanova 55, 288 02 Nymburk", crews: ["RV", "RZP", "RZP"], coords: [50.1860, 15.0416], type: "main" },
  { id: 33, city: "Lysá nad Labem", address: "Masarykova 214, 289 22 Lysá n/L.", crews: ["RZP"], coords: [50.2016, 14.8398], type: "standard" },
  { id: 34, city: "Městec Králové", address: "Prezidenta Beneše 343, 289 03", crews: ["RZP"], coords: [50.2075, 15.3006], type: "standard" },
  { id: 35, city: "Český Brod", address: "Žižkova 282, 282 01 Český Brod", crews: ["RZP"], coords: [50.0743, 14.8612], type: "standard" },
  
  // Východ a Jihovýchod
  { id: 36, city: "Kolín", address: "Žižkova 146, 280 02 Kolín", crews: ["RV", "RZP", "RZP", "RZP"], coords: [50.0267, 15.1973], type: "main" },
  { id: 37, city: "Kutná Hora", address: "Vojtěšská 687, 284 00 Kutná Hora", crews: ["RV", "RZP", "RZP"], coords: [49.9489, 15.2678], type: "main" },
  { id: 38, city: "Čáslav", address: "Jeníkovská 348, 286 01 Čáslav", crews: ["RLP", "RZP"], coords: [49.9126, 15.3937], type: "standard" },
  { id: 39, city: "Uhlířské Janovice", address: "Zdravotní 108, 285 04 Uhlířské Janovice", crews: ["RZP"], coords: [49.8817, 15.0634], type: "standard" },
  { id: 40, city: "Zbraslavice", address: "Zbraslavice 329, 285 21", crews: ["RV"], coords: [49.8134, 15.1832], type: "standard" },
  { id: 41, city: "Zruč nad Sázavou", address: "Poštovní 593, 285 22 Zruč nad Sázavou", crews: ["RZP"], coords: [49.7436, 15.1018], type: "standard" },
  
  // Benešovsko
  { id: 42, city: "Benešov", address: "Máchova 400, 256 01 Benešov", crews: ["RV", "RZP", "RZP"], coords: [49.7836, 14.6865], type: "main" },
  { id: 43, city: "Říčany", address: "Komenského nám. 1910, 251 01, Říčany", crews: ["RV", "RZP", "RZP"], coords: [49.9918, 14.6617], type: "standard" },
  { id: 44, city: "Kostelec n. Č. lesy", address: "Jevanská 1293, 281 63 Kostelec n/Č.L.", crews: ["RZP"], coords: [49.9945, 14.8604], type: "standard" },
  { id: 45, city: "Vranov", address: "Vranov 58, 257 22 Čerčany", crews: ["RZP"], coords: [49.8687, 14.7712], type: "standard" },
  { id: 46, city: "Votice", address: "Pražská 290, 259 01 Votice", crews: ["RZP"], coords: [49.6384, 14.6375], type: "standard" },
  { id: 47, city: "Vlašim", address: "J. Masaryka 1711, 258 01 Vlašim", crews: ["RV", "RZP", "RZP"], coords: [49.7047, 14.9015], type: "standard" },
];

const App = () => {
  const [activeTab, setActiveTab] = useState('map'); 
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL'); 
  const [selectedStation, setSelectedStation] = useState(null);
  const [mapError, setMapError] = useState(null);
  const [loadingBoundaries, setLoadingBoundaries] = useState(true);
  const [loadedInfo, setLoadedInfo] = useState(null); // Pro debug info
  
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  const aggregateCrews = (crews) => {
    const counts = crews.reduce((acc, curr) => {
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {});
    
    const order = ['RLP', 'RV', 'RZP', 'BOAT'];
    return Object.entries(counts)
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
      .map(([type, count]) => ({ type, count, label: `${count}x ${type}` }));
  };

  const filteredStations = useMemo(() => {
    return RAW_STATIONS.filter(station => {
      const matchesSearch = station.city.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            station.address.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesType = true;
      if (filterType === 'DOCTOR') {
        matchesType = station.crews.includes('RV') || station.crews.includes('RLP');
      } else if (filterType === 'RZP') {
        matchesType = !station.crews.includes('RV') && !station.crews.includes('RLP');
      }

      return matchesSearch && matchesType;
    });
  }, [searchTerm, filterType]);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    
    script.onload = () => {
        initMap();
        loadRealBoundaries(); 
    };
    
    script.onerror = () => {
        setMapError("Nepodařilo se načíst mapové podklady (Leaflet).");
    };
    
    document.body.appendChild(script);

    return () => {};
  }, []);

  const initMap = () => {
    if (!mapContainerRef.current || window.L === undefined) return;
    if (mapInstanceRef.current) return;

    const map = window.L.map(mapContainerRef.current, {
        zoomControl: false 
    }).setView([49.95, 14.6], 9);
    
    window.L.control.zoom({ position: 'topright' }).addTo(map);

    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19
    }).addTo(map);

    mapInstanceRef.current = map;
    updateMarkers();
  };

  // --- INTELIGENTNÍ NAČÍTÁNÍ REÁLNÝCH VEKTOROVÝCH DAT ---
  const loadRealBoundaries = async () => {
    if (!mapInstanceRef.current || !window.L) return;
    setLoadingBoundaries(true);

    const stredoceskeOkresy = [
        "Benešov", "Beroun", "Kladno", "Kolín", "Kutná Hora", "Mělník", 
        "Mladá Boleslav", "Nymburk", "Praha-východ", "Praha-západ", "Příbram", "Rakovník"
    ];

    const getColor = (okresName) => {
        if (!okresName) return "#facc15";
        const name = okresName.trim();

        const colors = {
            "Rakovník": "#eab308",
            "Kladno": "#fef08a",
            "Mělník": "#facc15",
            "Mladá Boleslav": "#eab308", 
            "Nymburk": "#fef08a",
            "Kolín": "#eab308",
            "Kutná Hora": "#facc15",
            "Benešov": "#fef08a",
            "Příbram": "#facc15",
            "Beroun": "#eab308",
            "Praha-západ": "#fef08a",
            "Praha-východ": "#facc15"
        };
        // Hledáme částečnou shodu pro barvení (pokud je název "Okres Benešov")
        for (const [key, color] of Object.entries(colors)) {
            if (name.includes(key)) return color;
        }
        return "#facc15";
    };

    // Detekuje název vlastnosti, která obsahuje jméno okresu
    const detectNameProperty = (features) => {
        // Zkusíme najít vlastnost, která obsahuje název některého ze známých okresů
        const testDistricts = ["Benešov", "Kladno", "Příbram"]; 
        
        for (const feature of features) {
            if (!feature.properties) continue;
            for (const [key, value] of Object.entries(feature.properties)) {
                if (typeof value === 'string') {
                    if (testDistricts.some(td => value.includes(td))) {
                        console.log(`Detekován klíč pro název okresu: ${key}`);
                        return key;
                    }
                }
            }
        }
        // Fallback
        return 'name';
    };

    const renderData = (data) => {
        if (!data || !data.features || data.features.length === 0) return 0;

        // Automatická detekce klíče
        const nameProperty = detectNameProperty(data.features);

        const filteredFeatures = data.features.filter(f => {
             const propName = f.properties[nameProperty];
             return propName && stredoceskeOkresy.some(okres => propName.includes(okres));
        });

        if (filteredFeatures.length === 0) {
            return 0;
        }

        window.L.geoJSON({ type: "FeatureCollection", features: filteredFeatures }, {
            style: (feature) => ({
                fillColor: getColor(feature.properties[nameProperty]),
                weight: 3,         // SILNÁ ČÁRA
                opacity: 1,        
                color: '#000000',  // ČERNÁ BARVA (dle požadavku)
                dashArray: '',
                fillOpacity: 0.6
            }),
            onEachFeature: (feature, layer) => {
                const label = feature.properties[nameProperty];
                // Zkrátíme label pokud obsahuje "Okres" (pro hezčí tooltip)
                const shortLabel = label.replace("Okres ", "");
                
                layer.bindTooltip(shortLabel, {
                    permanent: true,
                    direction: "center",
                    className: "bg-transparent border-0 shadow-none text-xs font-bold text-slate-900 uppercase tracking-wide"
                });
            }
        }).addTo(mapInstanceRef.current);
        
        return filteredFeatures.length;
    };

    try {
        // Zkusíme PRIMÁRNÍ zdroj (siwekm) - preferovaný uživatelem
        const primaryUrl = 'https://raw.githubusercontent.com/siwekm/czech-geojson/master/okresy.json';
        
        try {
            const response = await fetch(primaryUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            const count = renderData(data);
            
            if (count > 0) {
                setLoadingBoundaries(false);
                setLoadedInfo(`Načteno ${count} okresů.`);
                return;
            } else {
                console.warn("Primární zdroj neobsahuje hledané okresy, zkouším zálohu.");
            }
        } catch (e) {
            console.warn("Primární zdroj selhal:", e);
        }

        // Zkusíme ZÁLOŽNÍ zdroj (pokud primární selže)
        try {
            const backupUrl = 'https://raw.githubusercontent.com/33bcdd/je-to-brno/master/data/okresy.json';
            const responseBackup = await fetch(backupUrl);
            if (!responseBackup.ok) throw new Error(`HTTP ${responseBackup.status}`);
            
            const dataBackup = await responseBackup.json();
            const count = renderData(dataBackup);
            
            if (count > 0) {
                setLoadingBoundaries(false);
                return;
            }
            
            throw new Error("Žádné okresy nenalezeny ani v záloze");
        } catch (e) {
             console.error("Všechny zdroje selhaly.");
             throw e;
        }

    } catch (error) {
        console.error("Chyba při načítání hranic:", error);
        setMapError("Data stažena, ale okresy nenalezeny. (Chyba zpracování)");
    } finally {
        setLoadingBoundaries(false);
    }
  };

  useEffect(() => {
    updateMarkers();
  }, [filteredStations]);

  const updateMarkers = () => {
    if (!mapInstanceRef.current || !window.L) return;

    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    filteredStations.forEach(station => {
      const hasDoctor = station.crews.includes('RV') || station.crews.includes('RLP');
      
      let markerColor = "bg-slate-900"; 
      let ringColor = "border-white";
      
      if (station.city === "Kladno") {
          markerColor = "bg-red-600";
      } else if (station.type === "partner") {
          markerColor = "bg-green-600";
      } else if (station.type === "seasonal") {
          markerColor = "bg-purple-600";
      }

      const iconHtml = `
        <div class="relative flex items-center justify-center">
            <div class="${markerColor} w-4 h-4 rounded-full border-2 ${ringColor} shadow-md z-10"></div>
            ${station.city === "Kladno" ? '<div class="absolute w-6 h-6 bg-red-500/30 rounded-full animate-ping"></div>' : ''}
        </div>
      `;
      
      const icon = window.L.divIcon({
        className: 'custom-div-icon bg-transparent border-0',
        html: iconHtml,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const aggregated = aggregateCrews(station.crews);
      const crewsHtml = aggregated.map(c => 
        `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${c.type === 'RZP' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}">${c.label}</span>`
      ).join('');

      const marker = window.L.marker(station.coords, { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div class="font-sans min-w-[200px]">
            <h3 class="font-bold text-sm mb-1 text-slate-900">${station.city}</h3>
            <p class="text-xs text-gray-500 mb-2 border-b border-gray-100 pb-2">${station.address}</p>
            <div class="flex flex-wrap gap-1">
              ${crewsHtml}
            </div>
          </div>
        `);
      
      marker.on('click', () => {
        setSelectedStation(station);
        if (window.innerWidth < 768) {
             setActiveTab('list');
        }
      });

      markersRef.current[station.id] = marker;
    });
  };

  const handleStationClick = (station) => {
    setSelectedStation(station);
    if (mapInstanceRef.current && window.L) {
      mapInstanceRef.current.flyTo(station.coords, 13);
      const marker = markersRef.current[station.id];
      if (marker) marker.openPopup();
    }
    if (window.innerWidth < 768) {
        setActiveTab('map');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-slate-800 font-sans overflow-hidden">
      
      {/* Header */}
      <header className="bg-blue-900 text-white p-3 shadow-lg flex items-center justify-between z-20 h-16 flex-shrink-0">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
                <span className="text-blue-900 font-bold text-xl">*</span>
            </div>
            <div>
                <h1 className="text-lg font-bold leading-tight">ZZS Středočeského kraje</h1>
                <p className="text-xs text-blue-200">Interaktivní mapa stanovišť</p>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <a href="https://www.zachranka.cz" target="_blank" rel="noreferrer" className="text-xs text-blue-200 hover:text-white underline hidden sm:block">
                Zpět na web ZZS
            </a>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Sidebar (Collapsible) */}
        <aside 
            className={`
                relative bg-white shadow-xl transition-all duration-300 ease-in-out flex flex-col z-10 border-r border-gray-200
                ${sidebarOpen ? 'w-full md:w-80' : 'w-0 md:w-0'}
                ${activeTab === 'list' ? 'translate-x-0' : (sidebarOpen ? '-translate-x-full md:translate-x-0' : '-translate-x-full md:translate-x-0')}
            `}
            style={{ overflow: sidebarOpen ? 'visible' : 'hidden' }}
        >
          {/* Collapse Toggle Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex absolute -right-3 top-20 bg-white border border-gray-200 text-gray-600 rounded-full p-1 shadow-md hover:bg-gray-50 z-50 items-center justify-center w-6 h-6"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          
          {/* Controls */}
          <div className={`flex flex-col h-full ${sidebarOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}>
              <div className="p-4 border-b border-gray-100 bg-white">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="Hledat stanoviště..." 
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-2">
                  <button onClick={() => setFilterType('ALL')} className={`flex-1 py-1.5 text-xs font-medium rounded transition ${filterType === 'ALL' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}>Vše</button>
                  <button onClick={() => setFilterType('DOCTOR')} className={`flex-1 py-1.5 text-xs font-medium rounded transition ${filterType === 'DOCTOR' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'}`}>Lékař</button>
                  <button onClick={() => setFilterType('RZP')} className={`flex-1 py-1.5 text-xs font-medium rounded transition ${filterType === 'RZP' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}`}>RZP</button>
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto bg-gray-50/50">
                <div className="p-2 space-y-2">
                  {filteredStations.map(station => (
                      <div 
                        key={station.id}
                        onClick={() => handleStationClick(station)}
                        className={`p-3 rounded-lg border cursor-pointer hover:shadow-md bg-white ${selectedStation?.id === station.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <h3 className="font-bold text-sm text-gray-800">{station.city}</h3>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{station.address}</p>
                      </div>
                    )
                  )}
                </div>
              </div>
          </div>
          
          {/* Detail */}
          {selectedStation && sidebarOpen && (
            <div className="bg-white border-t p-4 shadow-up z-20">
               <div className="flex justify-between items-start mb-2">
                   <h2 className="font-bold text-lg text-blue-900">{selectedStation.city}</h2>
                   <button onClick={() => setSelectedStation(null)}><X className="w-5 h-5 text-gray-400" /></button>
               </div>
               <p className="text-sm text-gray-600 flex items-center gap-2 mb-3"><MapPin className="w-3 h-3" />{selectedStation.address}</p>
               <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedStation.coords[0]},${selectedStation.coords[1]}`, '_blank')} className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2"><Navigation className="w-4 h-4" /> Navigovat</button>
            </div>
          )}
        </aside>

        {!sidebarOpen && (
             <button onClick={() => setSidebarOpen(true)} className="hidden md:flex absolute left-4 top-4 z-20 bg-white p-2 rounded-lg shadow-md border border-gray-200"><Menu className="w-5 h-5 text-blue-900" /></button>
        )}

        {/* Map */}
        <main className="flex-1 relative z-0">
          <div ref={mapContainerRef} className="w-full h-full bg-gray-200" />
          
          {/* Loading Indicator for Boundaries */}
          {loadingBoundaries && (
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow border border-blue-100 flex items-center gap-2 text-xs text-blue-800 z-[400]">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Načítám geodata okresů...
            </div>
          )}

          {/* Error */}
          {mapError && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  {mapError}
              </div>
          )}

          <button onClick={() => setActiveTab(activeTab === 'map' ? 'list' : 'map')} className="md:hidden absolute bottom-6 right-6 z-[1000] bg-blue-900 text-white p-4 rounded-full shadow-xl"><Menu className="w-6 h-6" /></button>
        </main>

      </div>
    </div>
  );
};

export default App;