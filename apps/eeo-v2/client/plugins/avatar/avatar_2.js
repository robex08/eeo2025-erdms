import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Lock, HelpCircle, CheckCircle, AlertCircle } from 'lucide-react';

// Odkaz na nahraný obrázek (v reálné aplikaci bys ho měl v public složce nebo importovaný)
// Pro účely ukázky předpokládáme, že URL je dostupná.
// Pokud se obrázek nezobrazí, nahraď tento string cestou k tvému souboru.
const SPRITE_URL = "https://r.jina.ai/https://i.imgur.com/placeholder-or-local-path.jpg";
// Poznámka: Protože nemám přímou URL k tvému uploadu pro tento kód,
// vložil jsem logiku, která očekává, že si uživatel doplní správnou cestu,
// ale níže v kódu používám base64 placeholder nebo se pokusím využít tvůj upload.
// PRO SPRÁVNOU FUNKCI: Ujisti se, že 'src' img tagu nebo background-image odkazuje na tvůj soubor.

const Assistant = ({ activeState, customMessage }) => {
  // Definice pozic ve sprite sheetu (2x2 mřížka)
  // 0% 0% = Vlevo nahoře (Klid / Čekání)
  // 100% 0% = Vpravo nahoře (Poslouchám / Mrkám)
  // 0% 100% = Vlevo dole (Mám nápad / Ukazuji)
  // 100% 100% = Vpravo dole (Úspěch / Super)

  const getSpritePosition = (state) => {
    switch (state) {
      case 'idea': return '0% 100%';    // Ukazuje prstem
      case 'success': return '100% 100%'; // Palec nahoru
      case 'listen': return '100% 0%';  // Ruce v bok/mrkání
      case 'idle':
      default: return '0% 0%';          // Základní postoj
    }
  };

  // Pokud nemáme zprávu zvenčí, použijeme defaultní pro daný stav
  const getMessage = () => {
    if (customMessage) return customMessage;
    switch (activeState) {
      case 'idea': return "Mám pro tebe tip!";
      case 'success': return "Skvělá práce!";
      case 'listen': return "Poslouchám...";
      default: return "Jsem tu, kdybys něco potřeboval.";
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end animate-in fade-in slide-in-from-bottom-10 duration-500">
      {/* Bublina s textem */}
      <div className={`
        mb-4 mr-8 p-4 bg-yellow-100 border-2 border-yellow-400 rounded-2xl shadow-lg
        max-w-[250px] text-sm text-gray-800 relative font-medium transition-all duration-300 transform
        ${activeState === 'idle' ? 'opacity-0 scale-95 translate-y-4 pointer-events-none' : 'opacity-100 scale-100 translate-y-0'}
      `}>
        {getMessage()}
        {/* Šipka bubliny */}
        <div className="absolute -bottom-2 right-8 w-4 h-4 bg-yellow-100 border-b-2 border-r-2 border-yellow-400 transform rotate-45"></div>
      </div>

      {/* Samotná postavička (Sprite) */}
      <div
        className="w-32 h-32 transition-all duration-300 filter drop-shadow-xl cursor-pointer hover:scale-105"
        style={{
          backgroundImage: `url('https://files.catbox.moe/y2w44s.jpg')`, // Zde jsem použil placeholder URL, nahraď ho svou URL obrázku!
          // Pro lokální vývoj: `url('/cesta/k/tvemu/obrazku.jpg')`
          // Protože jsi nahrál obrázek do chatu, pro tento náhled musím improvizovat s CSS třídami níže
          // nebo použít externí hosting. Pro tuto ukázku předpokládám, že si cestu upravíš.
          backgroundSize: '200% 200%', // Protože je to mřížka 2x2
          backgroundPosition: getSpritePosition(activeState),
          backgroundRepeat: 'no-repeat'
        }}
        title="Tvůj osobní rádce"
      >
        {/* Fallback pro případ, že se obrázek nenačte, aby uživatel věděl, kam ho dát */}
        <div className="hidden">Zde by měl být tvůj sprite sheet</div>
      </div>
    </div>
  );
};

// Hlavní aplikace - Demo formulář
export default function App() {
  const [assistantState, setAssistantState] = useState('idle');
  const [assistantMessage, setAssistantMessage] = useState('');

  // Helper pro změnu stavu sponky
  const setMood = (mood, text = '') => {
    setAssistantState(mood);
    setAssistantMessage(text);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-800 relative overflow-hidden">
      {/* Pozadí dekorace */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-r from-blue-600 to-indigo-700 skew-y-3 transform origin-top-left -z-10"></div>

      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden mt-10">
        <div className="p-8 border-b border-gray-100">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
            Demo Aplikace
          </h1>
          <p className="text-gray-500 mt-2">Vyzkoušej interakci s formulářem a sleduj sponku vpravo dole.</p>
        </div>

        <div className="p-8 space-y-6">
          {/* Sekce: Jméno */}
          <div
            className="group"
            onFocus={() => setMood('listen', 'Napiš své celé jméno, abych věděl, jak ti říkat.')}
            onBlur={() => setMood('idle')}
          >
            <label className="block text-sm font-medium text-gray-700 mb-1">Uživatelské jméno</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Jan Novák"
              />
            </div>
          </div>

          {/* Sekce: Heslo */}
          <div
            className="group"
            onFocus={() => setMood('idea', 'Pst! Heslo by mělo být silné. Zkus použít čísla a znaky!')}
            onBlur={() => setMood('idle')}
          >
            <label className="block text-sm font-medium text-gray-700 mb-1">Heslo</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="password"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Sekce: Složitá volba (vyvolá nápovědu) */}
          <div
            className="p-4 bg-blue-50 rounded-lg border border-blue-100 hover:border-blue-300 transition-colors cursor-help"
            onMouseEnter={() => setMood('idea', 'Tohle nastavení je pokročilé. Pokud si nejsi jistý, nech to prázdné.')}
            onMouseLeave={() => setMood('idle')}
          >
            <div className="flex items-start gap-3">
              <HelpCircle className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900">Pokročilá konfigurace API</h3>
                <p className="text-sm text-blue-700 mt-1">Najeď na mě myší pro radu od sponky.</p>
              </div>
            </div>
          </div>

          {/* Tlačítko Odeslat */}
          <button
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2"
            onMouseEnter={() => setMood('listen', 'Jsi připraven to odeslat?')}
            onMouseLeave={() => setMood('idle')}
            onClick={() => {
              setMood('success', 'Úspěšně odesláno! Jsi jednička.');
              setTimeout(() => setMood('idle'), 3000);
            }}
          >
            <Send className="w-5 h-5" />
            Odeslat Formulář
          </button>

           {/* Varování */}
           <div
            className="mt-4 flex items-center gap-2 text-red-600 text-sm cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
            onMouseEnter={() => setMood('listen', 'Jejda, na tohle tlačítko raději neklikej, pokud to nemyslíš vážně!')}
            onMouseLeave={() => setMood('idle')}
           >
             <AlertCircle className="w-4 h-4" />
             <span>Smazat účet (Danger Zone)</span>
           </div>
        </div>
      </div>

      {/* Zde vkládáme našeho Rádce a předáváme mu stav z hlavní aplikace */}
      <Assistant activeState={assistantState} customMessage={assistantMessage} />

      {/* Instrukce pro uživatele, jak vložit obrázek */}
      <div className="fixed top-5 right-5 max-w-xs bg-white/90 backdrop-blur p-4 rounded-lg shadow-sm border text-xs text-gray-500">
        <p><strong>Tip pro vývojáře:</strong></p>
        <p>Aby se sponka zobrazila, nahraď v kódu <code>backgroundImage</code> URL adresou tvého nahraného obrázku.</p>
        <p className="mt-2">Pro testování jsem použil dočasný placeholder, ale měl bys tam vidět logiku 2x2 mřížky.</p>
      </div>
    </div>
  );
}
