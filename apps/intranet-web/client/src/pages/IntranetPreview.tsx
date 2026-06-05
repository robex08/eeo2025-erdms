import React, { useState, useEffect } from 'react';
import { 
  Newspaper, LayoutGrid, Calendar,
  AlertTriangle, Wrench, Phone, BookOpen, Monitor, 
  Clock, CheckCircle, Radio, User as UserIcon, Pill,
  GraduationCap, Ambulance
} from 'lucide-react';
import Header from '../components/Header';
import HeaderV2 from '../components/HeaderV2';

const IntranetPreview: React.FC = () => {
  const [headerVersion, setHeaderVersion] = useState<1 | 2>(() => {
    const saved = localStorage.getItem('headerVersion');
    return saved === '2' ? 2 : 1;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('headerVersion');
      setHeaderVersion(saved === '2' ? 2 : 1);
    };
    
    window.addEventListener('storage', handleStorageChange);
    // Kontrola localStorage každých 100ms pro změny v rámci stejného tabu
    const interval = setInterval(() => {
      const saved = localStorage.getItem('headerVersion');
      const current = saved === '2' ? 2 : 1;
      if (current !== headerVersion) {
        setHeaderVersion(current);
      }
    }, 100);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [headerVersion]);

  return (
    <div className="bg-[#F8FAFC] flex flex-col">
      {/* Hlavička */}
      {headerVersion === 1 ? <Header /> : <HeaderV2 />}

      {/* Obsah intranetu */}
      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full">
        
        {/* FLASH ALERT - Mimořádné opatření */}
        <section className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div className="flex items-start gap-3">
            <span className="p-2 bg-red-100 text-red-600 rounded-lg shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </span>
            <div>
              <h3 className="font-bold text-red-950 text-base">MIMOŘÁDNÉ OPATŘENÍ - Uzavírka mostu a změna spádovosti</h3>
              <p className="text-sm text-red-800 mt-1">Z důvodu havarijního stavu mostu ev.č. 116-003 je od dnešních 18:00 přesměrována spádovost záchranářů z oblasti Berounska do KN Kladno.</p>
            </div>
          </div>
          <button className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shrink-0 self-end md:self-center">
            Zobrazit detaily
          </button>
        </section>

        {/* HLAVNÍ LAYOUT: Aktuality vs Dlaždice */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEVÁ STRANA: AKTUALITY (5 sloupců) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
              <h2 className="text-xl font-bold text-[#0D2C66] flex items-center gap-2">
                <Newspaper className="text-[#0D2C66]" /> AKTUALITY Z PROVOZU
              </h2>
              <a href="#" className="text-xs font-semibold text-[#173B7A] hover:underline">Všechny zprávy →</a>
            </div>

            {/* Karta aktuality 1 */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-3">
                Provozní info
              </span>
              <h3 className="font-bold text-base text-slate-900 hover:text-[#0D2C66] cursor-pointer">
                Distribuce nových transportních nosítek s elektrickým pohonem
              </h3>
              <p className="text-slate-600 text-xs mt-2 line-clamp-3">
                Na výjezdové základny Kolín, Benešov a Mladá Boleslav byla doručena první vlna nových hydraulických nosítek Stryker Power-PRO XT s elektrickým pohonem. Prosíme posádky o prostudování instruktážního videa...
              </p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Dnes, 14:20</span>
                <span className="flex items-center gap-1"><UserIcon className="w-3.5 h-3.5" /> Mgr. Petr Šmíd</span>
              </div>
            </div>

            {/* Karta aktuality 2 */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 mb-3">
                Vzdělávání
              </span>
              <h3 className="font-bold text-base text-slate-900 hover:text-[#0D2C66] cursor-pointer">
                Spuštění registrace na e-learningové kurzy: ALS & Trauma postupy 2026
              </h3>
              <p className="text-slate-600 text-xs mt-2 line-clamp-3">
                Oddělení vzdělávání otevírá povinný roční e-learningový blok pro NLZP a lékaře. Splnění je nutné do konce srpna tohoto roku. Přihlašování probíhá přes modul Vzdělávání...
              </p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Včera</span>
                <span className="flex items-center gap-1"><UserIcon className="w-3.5 h-3.5" /> MUDr. Radka Knorová</span>
              </div>
            </div>

            {/* Rychlá anketa */}
            <div className="bg-[#ECF2FE] rounded-2xl p-5 border border-blue-100">
              <h4 className="font-bold text-sm text-[#0D2C66] flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4" /> RYCHLÝ PRŮZKUM
              </h4>
              <p className="text-xs font-semibold text-slate-700 mb-3">Vyhovuje vám nové rozvržení směn na základnách typu RZP?</p>
              <div className="space-y-2">
                <button className="w-full text-left text-xs bg-white hover:bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-medium transition-all flex items-center justify-between">
                  <span>Ano, 12h směny jsou optimální</span>
                  <span className="text-slate-400 font-bold">74 %</span>
                </button>
                <button className="w-full text-left text-xs bg-white hover:bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-medium transition-all flex items-center justify-between">
                  <span>Preferuji návrat k 24h službám</span>
                  <span className="text-slate-400 font-bold">26 %</span>
                </button>
              </div>
            </div>
          </div>

          {/* PRAVÁ STRANA: DLAŽDICOVÝ SYSTÉM (7 sloupců) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="border-b-2 border-slate-200 pb-3">
              <h2 className="text-xl font-bold text-[#0D2C66] flex items-center gap-2">
                <LayoutGrid className="text-[#0D2C66]" /> RYCHLÉ VOLBY & MODULY
              </h2>
            </div>

            {/* Mřížka dlaždic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Dlaždice 1: Kniha závad */}
              <div className="bg-white rounded-2xl border-l-8 border-[#FFD600] border-y border-r border-slate-200 p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group">
                <div className="flex justify-between items-start">
                  <span className="p-3 bg-yellow-50 text-yellow-600 rounded-xl group-hover:bg-[#FFD600] group-hover:text-[#0D2C66] transition-all">
                    <Wrench className="w-6 h-6" />
                  </span>
                  <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded">HLÁŠENÍ</span>
                </div>
                <h3 className="font-bold text-lg mt-4 text-[#0D2C66]">Kniha závad</h3>
                <p className="text-xs text-slate-500 mt-1">Nahlášení technického problému na voze či základně.</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Možnost odeslat z mobilu</span>
                </div>
              </div>

              {/* Dlaždice 2: Rozpisy Služeb */}
              <div className="bg-white rounded-2xl border-l-8 border-[#0D2C66] border-y border-r border-slate-200 p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group">
                <div className="flex justify-between items-start">
                  <span className="p-3 bg-blue-50 text-[#0D2C66] rounded-xl group-hover:bg-[#0D2C66] group-hover:text-white transition-all">
                    <Calendar className="w-6 h-6" />
                  </span>
                  <span className="text-xs font-bold text-[#0D2C66] bg-blue-50 px-2 py-1 rounded">MŮJ ROZPIS</span>
                </div>
                <h3 className="font-bold text-lg mt-4 text-[#0D2C66]">Rozpis služeb</h3>
                <p className="text-xs text-slate-500 mt-1">Plánované směny, žádosti o výměny, výpomoci.</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Aktualizováno před 2 hod</span>
                </div>
              </div>

              {/* Dlaždice 3: Směrnice a Standardy */}
              <div className="bg-white rounded-2xl border-l-8 border-slate-600 border-y border-r border-slate-200 p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group">
                <div className="flex justify-between items-start">
                  <span className="p-3 bg-slate-50 text-slate-600 rounded-xl group-hover:bg-slate-600 group-hover:text-white transition-all">
                    <BookOpen className="w-6 h-6" />
                  </span>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">SOP</span>
                </div>
                <h3 className="font-bold text-lg mt-4 text-[#0D2C66]">Metodika & Standardy</h3>
                <p className="text-xs text-slate-500 mt-1">Aktuální léčebné standardy, farmakologické karty.</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Aktuální verze 2026</span>
                </div>
              </div>

              {/* Dlaždice 4: Kontakty a Vysílačky */}
              <div className="bg-white rounded-2xl border-l-8 border-sky-600 border-y border-r border-slate-200 p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group">
                <div className="flex justify-between items-start">
                  <span className="p-3 bg-sky-50 text-sky-600 rounded-xl group-hover:bg-sky-600 group-hover:text-white transition-all">
                    <Phone className="w-6 h-6" />
                  </span>
                  <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded">RYCHLÉ SPOJENÍ</span>
                </div>
                <h3 className="font-bold text-lg mt-4 text-[#0D2C66]">Adresář & Spojení</h3>
                <p className="text-xs text-slate-500 mt-1">Kontakty na dispečinky, nemocnice, radiokódy.</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                  <Radio className="w-3.5 h-3.5" />
                  <span>Včetně kódů Matra</span>
                </div>
              </div>

            </div>

            {/* Další aplikace */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
                  <Ambulance className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Vozový park</h3>
                <p className="text-xs text-slate-500 mt-1">Správa vozidel, STK, revize.</p>
                <button className="mt-4 text-xs font-bold text-[#0D2C66] hover:underline flex items-center gap-1">Vstoupit →</button>
              </div>

              <div className="bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900">E-learning</h3>
                <p className="text-xs text-slate-500 mt-1">Vzdělávací moduly a testy.</p>
                <button className="mt-4 text-xs font-bold text-[#0D2C66] hover:underline flex items-center gap-1">Vstoupit →</button>
              </div>

              <div className="bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center mb-4">
                  <Pill className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Sklad materiálu</h3>
                <p className="text-xs text-slate-500 mt-1">Objednávky zdravotnického materiálu.</p>
                <button className="mt-4 text-xs font-bold text-[#0D2C66] hover:underline flex items-center gap-1">Vstoupit →</button>
              </div>
            </div>

          </div>

        </div>

        {/* MONITOR VÝJEZDŮ - Plnoširokový blok před footerem */}
        <div className="max-w-7xl mx-auto px-4 mt-8">
          <div className="bg-slate-900 text-[#00FF66] font-mono p-5 rounded-2xl border-2 border-slate-800 shadow-lg relative overflow-hidden">
            <div className="absolute right-3 top-3 w-3.5 h-3.5 rounded-full bg-[#00FF66] animate-ping opacity-75"></div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-sans font-bold uppercase tracking-wider mb-3">
              <Monitor className="w-4 h-4 text-[#00FF66]" /> MONITOR VÝJEZDŮ (LIVE)
            </div>
            <div className="space-y-2.5 text-[11px] sm:text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-300">Kladno - RLP-831</span>
                <span className="text-amber-400">Výjezd k zásahu</span>
                <span>14:31:02</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-300">Mladá Boleslav - RZP-812</span>
                <span className="text-emerald-400">Předávání v nemocnici</span>
                <span>14:28:44</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-300">Benešov - RV-850</span>
                <span className="text-slate-400">Základna (Připraven)</span>
                <span>14:25:10</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-300">Beroun - RZP-801</span>
                <span className="text-red-500 animate-pulse font-bold">NÁHLÁ ZÁSTAVA OBĚHU</span>
                <span>14:33:15</span>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-50 text-slate-600 py-8 border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-xs">
          <div>
            <p className="font-bold text-slate-800 mb-2 uppercase">Grafické Standardy Intranetu</p>
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-[#0D2C66] border border-slate-200"></span>
                <span>#0D2C66</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-[#FFD600]"></span>
                <span>#FFD600</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-[#173B7A]"></span>
                <span>#173B7A</span>
              </div>
            </div>
          </div>
          <div className="text-center md:text-left">
            <p className="font-bold text-slate-800 mb-2">Kontaktní centrum IT podpory</p>
            <p>Hotline: +420 311 555 999 (Po-Pá 7:00-15:30)</p>
            <p>Mimo pracovní dobu volejte hlavní dispečink.</p>
          </div>
          <div className="text-center md:text-right">
            <p className="font-bold text-slate-800 mb-1">© 2026 Zdravotnická záchranná služba SK</p>
            <p className="text-slate-500">Všechna práva vyhrazena. Pouze pro vnitřní potřebu zaměstnanců.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default IntranetPreview;
