import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { AuthContext } from '../context/AuthContext';
import './ModernHelper.css';
import { getHelperTextsForPage, getGeneralTips, getPageMetadata } from '../data/helperTexts';
import { getToolsVisibility } from '../utils/toolsVisibility';

// Cesta k PNG avatarovi v public složce
const avatarImage = '/assets/helper-avatar.png';

/**
 * ModernHelper - Moderní kontextový pomocník
 * 
 * Viditelný pouze pro uživatele s oprávněním HELPER_VIEW
 * Zobrazuje kontextové rady v bubline automaticky
 * Draggable - lze přesunout myší kamkoliv v okně
 * Avatar má 4 animační stavy (sprite sheet 2x2)
 * 
 * @param {string} pageContext - Kontext stránky (orders, cashbook, profile, atd.)
 * @param {string} customTip - Vlastní tip (přepisuje výchozí)
 */
const ModernHelper = ({ pageContext = 'default', customTip = null }) => {
  const { hasPermission, user_id } = useContext(AuthContext);
  
  // Key pro reload viditelnosti po změně nastavení
  const [visibilityKey, setVisibilityKey] = useState(0);
  
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isBubbleVisible, setIsBubbleVisible] = useState(false);
  const [avatarState, setAvatarState] = useState('idle'); // idle (levý horní), wink (pravý horní), tip (levý dolní), info (pravý dolní)
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 120 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isContainerHovered, setIsContainerHovered] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, offsetX: 0, offsetY: 0 });
  const bubbleTimerRef = useRef(null);
  
  // 👁️ Kontrola viditelnosti z uživatelských nastavení (memoizováno pro optimalizaci)
  const toolsVisibility = useMemo(() => getToolsVisibility(user_id), [user_id, visibilityKey]);
  
  // Naslouchej změnám nastavení (triggerované po uložení v ProfilePage)
  useEffect(() => {
    const handleSettingsChange = () => {
      setVisibilityKey(prev => prev + 1);
    };
    
    window.addEventListener('userSettingsChanged', handleSettingsChange);
    return () => window.removeEventListener('userSettingsChanged', handleSettingsChange);
  }, []);

  // 📚 Načtení help textů z centrálního úložiště
  const pageHelperData = getHelperTextsForPage(pageContext);
  const pageMetadata = getPageMetadata(pageContext);
  const generalTips = getGeneralTips(pageContext);

  // Pro zpětnou kompatibilitu - transformuj strukturu z centrálního úložiště
  const contextualTips = {
    // Objednávky - Seznam
    orders: {
      icon: "📋",
      title: "Objednávky",
      tips: [
        { text: "Použij vyhledávání nahoře – objednávku najdeš během okamžiku", type: "tip" },
        { text: "Dvojklikem na řádek otevřeš objednávku k editaci", type: "tip" },
        { text: "Barva řádku ukazuje, v jakém stavu se objednávka nachází", type: "tip" },
        { text: "Filtr podle dodavatele ti ušetří čas při hledání", type: "tip" },
        { text: "Všechny změny se ukládají automaticky – nemusíš se obávat ztráty dat", type: "tip" },
        { text: "Vyhledávání: Zadej číslo objednávky, název nebo dodavatele. Systém hledá i bez diakritiky, můžeš tedy psát rychle bez háčků a čárek.", type: "info" },
        { text: "Rychlé filtry: Kliknutím na barevné tlačítko stavu (Návrh, Ke schválení…) zobrazíš pouze objednávky v daném stavu. Perfektní pro rychlý přehled.", type: "info" },
        { text: "Sloupce: Můžeš si vybrat, které sloupce chceš zobrazit. Klikni na ikonu sloupců vpravo nahoře a vyber si podle svých potřeb.", type: "info" },
        { text: "Řazení: Kliknutím na hlavičku sloupce data seřadíš. Další kliknutí obrátí pořadí. Šipka ukáže, podle čeho je seznam seřazený.", type: "info" },
        { text: "Export dat: Tlačítko Export stáhne aktuálně zobrazené objednávky do CSV souboru pro Excel. Vhodné pro reporty a další zpracování.", type: "info" },
        { text: "Kontextová nabídka: Pravým tlačítkem myši na řádek otevřeš rychlé akce – zobrazit, upravit, smazat, stáhnout přílohy…", type: "tip" },
        { text: "Rozdělaná práce: Ikona tužky u objednávky znamená, že máš uložený koncept. Kliknutím na ni můžeš pokračovat, kde jsi skončil.", type: "info" },
        { text: "Barevné značení stavů: Zelená = schváleno, Žlutá = čeká na schválení, Modrá = návrh, Červená = zamítnuto.", type: "info" }
      ]
    },
    
    // Detail objednávky
    orderDetail: {
      icon: "📝",
      title: "Objednávka",
      tips: [
        { text: "Číslo objednávky se vyplní automaticky při prvním uložení", type: "tip" },
        { text: "Zadej výstižný název – ušetříš si čas při pozdějším hledání", type: "tip" },
        { text: "Dodavatele vyber ze seznamu nebo přidej nového pomocí tlačítka +", type: "tip" },
        { text: "Cenu zadávej včetně DPH, pokud není uvedeno jinak", type: "tip" },
        { text: "Před odesláním ke schválení zkontroluj všechna povinná pole", type: "tip" },
        { text: "Nezapomeň uložit změny – jinak se ztratí", type: "tip" },
        { text: "Přílohy přidáš přetažením souboru nebo kliknutím na tlačítko", type: "tip" },
        { text: "Fakturu nahraj ihned, aby ses na ni později nezapomněl", type: "tip" },
        { text: "Číslo objednávky: Generuje se automaticky ve formátu OBJ-YYYY-XXXX. Můžeš ho změnit, musí však být jedinečné. Systém tě upozorní, pokud číslo již existuje.", type: "info" },
        { text: "Název objednávky: Zadej stručný a výstižný popis. Příklad: 'Kancelářský papír A4 - Q4/2025'. Ulehčí to pozdější vyhledávání.", type: "info" },
        { text: "Dodavatel: Začni psát název nebo IČO a systém ti nabídne odpovídající dodavatele. Pokud není v seznamu, klikni na + a přidej nového.", type: "info" },
        { text: "IČO dodavatele: Po zadání IČO systém automaticky načte název firmy, adresu a další údaje z ARESu. Ušetří to čas.", type: "info" },
        { text: "Částka: Zadej celkovou částku objednávky včetně DPH. U víceměsíčních objednávek systém automaticky rozpočítá měsíční částky.", type: "info" },
        { text: "Druh objednávky: Vyber typ objednávky - běžná objednávka, rámcová smlouva, příkaz... Podle typu se určí, která pole jsou povinná.", type: "info" },
        { text: "Středisko: Vyber středisko, které objednávku zadává. Podle střediska se určí schvalovatelé a limity pro automatické schválení.", type: "info" },
        { text: "Zdroj financování: Urči, z jakého zdroje se objednávka hradí - běžný provoz, projekt, grant, dar... Tato informace je důležitá pro účetnictví.", type: "info" },
        { text: "Přílohy: Přetažením souborů do pole nebo kliknutím na tlačítko nahráš přílohy. Podporované formáty: PDF, JPG, PNG, DOC, XLS... Maximální velikost: 20 MB.", type: "info" },
        { text: "Faktura: Před odesláním ke schválení je nutné přiložit fakturu. Nahraj sken nebo PDF. Bez přílohy nelze objednávku odeslat.", type: "info" },
        { text: "Průchod objednávkou: Návrh -> Ke schválení -> Schváleno -> Realizováno. V každém stavu máš jiné možnosti úprav.", type: "info" },
        { text: "Automatické ukládání: Formulář se ukládá jako koncept každých 30 sekund. Můžeš okno kdykoliv zavřít a později pokračovat.", type: "info" },
        { text: "Chybová hlášení: Červené ohraničení pole znamená chybu nebo chybějící povinný údaj. Přejetím myši zobrazíš podrobnosti.", type: "info" },
        { text: "Zamčená objednávka: Když objednávku edituje jiný uživatel, zobrazí se zámek a jeho jméno. Počkej, až dokončí, nebo požádej o odemknutí.", type: "info" }
      ]
    },
    
    // Pokladní kniha
    cashbook: {
      icon: "💰",
      title: "Pokladna",
      tips: [
        { text: "Částku zadávej bez mezer, jako oddělovač použij tečku nebo čárku", type: "tip" },
        { text: "Do popisu zapiš, o co šlo – za měsíc si to už nepamatuješ", type: "tip" },
        { text: "Datum se předvyplní dnešním dnem, lze ho však změnit", type: "tip" },
        { text: "Příjmy a výdaje se automaticky sčítají v záložce nahoře", type: "tip" },
        { text: "Před uzavřením měsíce vždy zkontroluj konečný zůstatek", type: "tip" },
        { text: "Uzavřený měsíc již nelze upravit bez speciálního oprávnění", type: "tip" },
        { text: "Převod mezi pokladnami provedeš pomocí tlačítka Převod", type: "tip" }
      ]
    },
    
    // Profil a nastavení
    profile: {
      icon: "⚙️",
      title: "Profil",
      tips: [
        { text: "Email slouží jako přihlašovací jméno – buď opatrný při změně", type: "tip" },
        { text: "Nové heslo musí obsahovat minimálně 8 znaků", type: "tip" },
        { text: "Notifikace přicházejí na email i do aplikace", type: "tip" },
        { text: "Svá nastavení můžeš kdykoliv změnit podle svých potřeb", type: "tip" },
        { text: "Všechny změny se projeví okamžitě po uložení", type: "tip" }
      ]
    },
    
    // Uživatelé
    users: {
      icon: "👥",
      title: "Uživatelé",
      tips: [
        { text: "Při zakládání uživatele zadej jeho email – tam mu přijde pozvánka", type: "tip" },
        { text: "Role určují, k jakým funkcím má uživatel přístup", type: "tip" },
        { text: "Místo smazání uživatele ho raději deaktivuj – zachováš historii", type: "tip" },
        { text: "Oprávnění upravuj kliknutím na ikonu tužky vedle jména", type: "tip" },
        { text: "Každý uživatel vidí pouze to, k čemu má oprávnění", type: "tip" }
      ]
    },
    
    // Slovníky
    dictionaries: {
      icon: "📚",
      title: "Číselníky",
      tips: [
        { text: "Číselníky jsou společné pro všechny uživatele – změna se projeví všem", type: "tip" },
        { text: "Novou položku přidáš pomocí tlačítka Přidat", type: "tip" },
        { text: "Položku upravuj dvojklikem nebo kliknutím na ikonu tužky", type: "tip" },
        { text: "Smazat lze pouze položky, které se nikde nepoužívají", type: "tip" },
        { text: "Vyhledávání funguje i bez háčků a čárek", type: "tip" }
      ]
    },
    
    // Výchozí
    default: {
      icon: "💡",
      title: "Nápověda",
      tips: [
        { text: "Jsem zde, abych ti pomohl s ovládáním aplikace", type: "tip" },
        { text: "Můžeš mě přetáhnout myší kamkoliv na obrazovce", type: "tip" },
        { text: "Při kliknutí na pole zobrazím užitečný tip k danému prvku", type: "tip" },
        { text: "Nevíš si rady? Klikni na mě a zobrazím obecnou nápovědu", type: "tip" }
      ]
    }
  };

  // Získání aktuálního tipu podle kontextu
  const currentTip = customTip
    ? { icon: "💡", title: "Tip", tips: [{ text: customTip, type: "tip" }] }
    : (contextualTips[pageContext] || contextualTips.default);

  // Funkce pro výpočet doby zobrazení podle délky textu
  const calculateDisplayDuration = (text) => {
    const textLength = text?.length || 0;
    // Min 10s, max 15s, cca 50 znaků = 1 sekunda navíc
    const baseDuration = 10000;
    const extraDuration = Math.min(5000, Math.floor(textLength / 50) * 1000);
    return baseDuration + extraDuration;
  };

  // Funkce pro detekci pozice bubliny podle umístění avatara
  const getBubblePosition = () => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const bubbleWidth = 300; // max-width bubliny
    const bubbleHeight = 240; // přibližná výška
    const margin = 20; // bezpečný okraj

    // Detekce vertikální pozice (horní/dolní část okna)
    const isTopHalf = position.y < windowHeight / 2;
    const verticalPosition = isTopHalf ? 'bottom' : 'top';

    // Detekce horizontální pozice (levá/pravá strana okna)
    const isLeftHalf = position.x < windowWidth / 2;
    const horizontalPosition = isLeftHalf ? 'left' : 'right';

    // Kontrola, zda by bublina nebyla mimo obrazovku
    let adjustedVertical = verticalPosition;
    let adjustedHorizontal = horizontalPosition;

    // Vertikální kontrola
    if (verticalPosition === 'bottom') {
      // Bublina dole - zkontroluj, zda se vejde
      if (position.y + 110 + bubbleHeight > windowHeight - margin) {
        adjustedVertical = 'top';
      }
    } else {
      // Bublina nahoře - zkontroluj, zda se vejde
      if (position.y - 110 - bubbleHeight < margin) {
        adjustedVertical = 'bottom';
      }
    }

    // Horizontální kontrola
    if (horizontalPosition === 'left') {
      // Bublina vlevo - zkontroluj, zda se vejde
      if (position.x + bubbleWidth > windowWidth - margin) {
        adjustedHorizontal = 'right';
      }
    } else {
      // Bublina vpravo - zkontroluj, zda se vejde
      if (position.x - bubbleWidth < margin) {
        adjustedHorizontal = 'left';
      }
    }

    return {
      vertical: adjustedVertical,
      horizontal: adjustedHorizontal
    };
  };

  // Idle timer - po 30 sekundách nečinnosti zobraz tip
  useEffect(() => {
    let idleTimer = null;
    let lastActivityTime = Date.now();

    const resetIdleTimer = () => {
      lastActivityTime = Date.now();
      if (idleTimer) clearTimeout(idleTimer);
      
      // Po 30 sekundách nečinnosti zobraz náhodný tip
      idleTimer = setTimeout(() => {
        if (!isBubbleVisible && currentTip.tips.length > 0) {
          const randomIndex = Math.floor(Math.random() * currentTip.tips.length);
          setCurrentTipIndex(randomIndex);
          const tipData = currentTip.tips[randomIndex];
          const tipText = tipData?.text || tipData;
          // tip = levý dolní (0% 100%), info = pravý dolní (100% 100%)
          setAvatarState(tipData?.type === 'info' ? 'info' : 'tip');
          setIsBubbleVisible(true);
          
          // Auto-skrytí podle délky textu (10-15s)
          if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
          bubbleTimerRef.current = setTimeout(() => {
            setIsBubbleVisible(false);
            setAvatarState('idle');
          }, calculateDisplayDuration(tipText));
        }
      }, 30000);
    };

    // Sleduj aktivitu uživatele
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      document.addEventListener(event, resetIdleTimer, { passive: true });
    });

    resetIdleTimer();

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [pageContext, isBubbleVisible, currentTip.tips.length]);

  // Idle animace avatara - střídání mezi idle (levý horní) a wink (pravý horní) každých 2-5 sekund
  useEffect(() => {
    if (isBubbleVisible) return; // Během zobrazení bubliny neanimuj

    const getRandomInterval = () => Math.random() * 3000 + 2000; // 2-5 sekund
    
    let animTimer = setTimeout(function animate() {
      setAvatarState(prev => prev === 'idle' ? 'wink' : 'idle');
      animTimer = setTimeout(animate, getRandomInterval());
    }, getRandomInterval());

    return () => clearTimeout(animTimer);
  }, [isBubbleVisible]);

  // Mapování sprite pozic (2x2 grid) - background-size: 200% background-size dělí obrázek na 2x2 matici
  const getSpritePosition = (state) => {
    switch (state) {
      case 'idle': return '0% 0%';        // [0,0] Levý horní - klidový stav
      case 'wink': return '100% 0%';      // [0,1] Pravý horní - mrkání
      case 'tip': return '0% 100%';       // [1,0] Levý dolní - dává tip
      case 'info': return '100% 100%';    // [1,1] Pravý dolní - nápověda/vysvětlení
      default: return '0% 0%';
    }
  };

  // Decentní zobrazení bubliny - bez automatického spamování
  useEffect(() => {
    // Připrav event listenery pro kontextové elementy
    const handleElementFocus = (e) => {
      const element = e.target;
      const tipData = getContextualTipForElement(element);
      
      if (tipData) {
        setCurrentTipIndex(tipData.tipIndex);
        const currentTipData = currentTip.tips[tipData.tipIndex];
        // tip = levý dolní (0% 100%), info = pravý dolní (100% 100%)
        setAvatarState(currentTipData?.type === 'info' ? 'info' : 'tip');
        setIsBubbleVisible(true);
        
        // Skryj bublinu podle délky textu (10-15s)
        const focusTipData = currentTip.tips[tipData.tipIndex];
        const focusTipText = focusTipData?.text || focusTipData;
        if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
        bubbleTimerRef.current = setTimeout(() => {
          setIsBubbleVisible(false);
          setAvatarState('idle');
        }, calculateDisplayDuration(focusTipText));
      }
    };

    // Přidej listenery na všechny inputy a buttony v kontextu
    const inputs = document.querySelectorAll('input, textarea, select, button[type="submit"]');
    inputs.forEach(input => {
      input.addEventListener('focus', handleElementFocus);
    });

    return () => {
      inputs.forEach(input => {
        input.removeEventListener('focus', handleElementFocus);
      });
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    };
  }, [pageContext]);

  // Funkce pro získání tipu podle elementu
  const getContextualTipForElement = (element) => {
    if (!element) return null;
    
    const name = (element.name || element.id || '').toLowerCase();
    const type = (element.type || '').toLowerCase();
    const placeholder = (element.placeholder || '').toLowerCase();
    
    // Mapování podle pageContext a atributů elementu
    // Stav avatara (tip/info) se určuje podle currentTipData.type
    const contextMap = {
      orderDetail: {
        'cislo': { tipIndex: 0 },
        'number': { tipIndex: 0 },
        'nazev': { tipIndex: 1 },
        'name': { tipIndex: 1 },
        'title': { tipIndex: 1 },
        'dodavatel': { tipIndex: 2 },
        'supplier': { tipIndex: 2 },
        'vendor': { tipIndex: 2 },
        'ico': { tipIndex: 10 },
        'cena': { tipIndex: 3 },
        'price': { tipIndex: 3 },
        'amount': { tipIndex: 3 },
        'castka': { tipIndex: 11 },
        'druh': { tipIndex: 12 },
        'type': { tipIndex: 12 },
        'stredisko': { tipIndex: 13 },
        'zdroj': { tipIndex: 14 },
        'priloha': { tipIndex: 15 },
        'attachment': { tipIndex: 15 },
        'file': { tipIndex: 15 },
        'faktura': { tipIndex: 16 },
        'invoice': { tipIndex: 16 },
        'submit': { tipIndex: 4 },
        'uloz': { tipIndex: 5 },
        'save': { tipIndex: 5 }
      },
      cashbook: {
        'castka': { tipIndex: 0 },
        'amount': { tipIndex: 0 },
        'cena': { tipIndex: 0 },
        'popis': { tipIndex: 1 },
        'description': { tipIndex: 1 },
        'poznamka': { tipIndex: 1 },
        'datum': { tipIndex: 2 },
        'date': { tipIndex: 2 },
        'prijem': { tipIndex: 3 },
        'vydaj': { tipIndex: 3 },
        'income': { tipIndex: 3 },
        'expense': { tipIndex: 3 },
        'zustatek': { tipIndex: 4 },
        'balance': { tipIndex: 4 },
        'prevod': { tipIndex: 6 },
        'transfer': { tipIndex: 6 }
      },
      orders: {
        'search': { tipIndex: 0 },
        'hledat': { tipIndex: 0 },
        'filter': { tipIndex: 1 },
        'filtr': { tipIndex: 1 },
        'dodavatel': { tipIndex: 3 },
        'supplier': { tipIndex: 3 }
      },
      users: {
        'email': { tipIndex: 0 },
        'role': { tipIndex: 1 },
        'opravneni': { tipIndex: 3 },
        'permission': { tipIndex: 3 },
        'active': { tipIndex: 2 },
        'aktivni': { tipIndex: 2 }
      },
      profile: {
        'email': { tipIndex: 0 },
        'heslo': { tipIndex: 1 },
        'password': { tipIndex: 1 },
        'notif': { tipIndex: 2 },
        'setting': { tipIndex: 3 },
        'nastav': { tipIndex: 3 }
      }
    };
    
    const pageMap = contextMap[pageContext] || {};
    
    // Hledej podle name/id/placeholder
    for (const key in pageMap) {
      if (name.includes(key) || placeholder.includes(key) || type.includes(key)) {
        return pageMap[key];
      }
    }
    
    return null;
  };

  // 🖱️ Dragging handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.helper-bubble')) return; // Neklikáme na bublinu
    
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      offsetX: position.x,
      offsetY: position.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;

    const newX = Math.max(0, Math.min(window.innerWidth - 100, dragRef.current.offsetX + deltaX));
    const newY = Math.max(0, Math.min(window.innerHeight - 100, dragRef.current.offsetY + deltaY));

    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // Kliknutí mimo bublinu pro zavření
  useEffect(() => {
    if (!isBubbleVisible) return;

    const handleClickOutside = (e) => {
      // Pokud klik nebyl na avatara ani na bublinu, zavři bublinu
      if (!e.target.closest('.modern-helper-container') && 
          !e.target.closest('.helper-bubble-modern') &&
          !e.target.closest('.helper-minimized-icon')) {
        setIsBubbleVisible(false);
        setAvatarState('idle');
        if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      }
    };

    // Přidej listener na levé i pravé tlačítko myši
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('contextmenu', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [isBubbleVisible]);

  // Minimalizace/obnovení avatara
  const handleMinimize = () => {
    setIsMinimized(true);
    setIsBubbleVisible(false);
    setAvatarState('idle');
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
  };

  const handleRestore = () => {
    setIsMinimized(false);
  };

  // Kliknutí na avatara - zobraz náhodný tip
  const handleAvatarClick = () => {
    if (!isDragging) {
      if (isBubbleVisible) {
        setIsBubbleVisible(false);
        setAvatarState('idle');
      } else {
        const randomIndex = Math.floor(Math.random() * currentTip.tips.length);
        setCurrentTipIndex(randomIndex);
        const tipData = currentTip.tips[randomIndex];
        // tip = levý dolní (0% 100%), info = pravý dolní (100% 100%)
        setAvatarState(tipData?.type === 'info' ? 'info' : 'tip');
        setIsBubbleVisible(true);
        
        // Auto-skrytí podle délky textu (10-15s)
        if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
        bubbleTimerRef.current = setTimeout(() => {
          setIsBubbleVisible(false);
          setAvatarState('idle');
        }, calculateDisplayDuration(currentTipText));
      }
    }
  };

  // 🔒 Kontrola oprávnění - pouze pro uživatele s HELPER_VIEW
  if (!hasPermission || !hasPermission('HELPER_VIEW')) {
    return null;
  }
  
  // 👁️ Kontrola viditelnosti z uživatelských nastavení
  if (toolsVisibility.helper === false) {
    return null;
  }

  const currentTipData = currentTip.tips[currentTipIndex] || currentTip.tips[0];
  const currentTipText = currentTipData?.text || currentTipData;
  const currentTipType = currentTipData?.type || 'tip';
  const tipIcon = currentTipType === 'info' ? '❓' : '💡';
  
  // Získej dynamickou pozici bubliny
  const bubblePosition = getBubblePosition();

  // Renderuj přes portal aby byl vždy navrchu
  return ReactDOM.createPortal(
    <>
      {/* Minimalizovaná ikona - malá statická ikona jako ostatní nástroje */}
      {isMinimized && (
        <div 
          className="helper-minimized-icon"
          onClick={handleRestore}
          title="Obnovit pomocníka"
        >
          <div 
            className="helper-minimized-avatar"
            style={{
              backgroundImage: `url(${avatarImage})`,
              backgroundPosition: '0% 0%',
              backgroundSize: '200% 200%',
              backgroundRepeat: 'no-repeat'
            }}
          />
        </div>
      )}

      {/* Hlavní avatar - zobrazit jen když není minimalizovaný */}
      {!isMinimized && (
        <div 
          className={`modern-helper-container ${isDragging ? 'dragging' : ''}`}
          style={{ 
            left: `${position.x}px`, 
            top: `${position.y}px`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onMouseEnter={() => setIsContainerHovered(true)}
          onMouseLeave={() => setIsContainerHovered(false)}
        >
          {/* Křížek pro zavření - zobrazit jen při hoveru */}
          {isContainerHovered && (
            <button
              className="helper-close-btn"
              onClick={handleMinimize}
              title="Minimalizovat"
              aria-label="Minimalizovat pomocníka"
            >
              ×
            </button>
          )}

          {/* Bublina s aktuálním tipem */}
          {isBubbleVisible && (
            <div 
              className="helper-bubble-modern animate-bubble-in"
              data-vertical={bubblePosition.vertical}
              data-horizontal={bubblePosition.horizontal}
            >
              <div className="helper-bubble-header-modern">
                <span className="helper-bubble-icon">{tipIcon}</span>
                <span className="helper-bubble-title-modern">{currentTipType === 'info' ? 'Vysvětlení' : 'Tip'}</span>
              </div>
              <div className="helper-bubble-content-modern">
                <div className="helper-tip-item-single">
                  {currentTipText}
                </div>
              </div>
              {/* Šipka směřující k avatarovi */}
              <div className="helper-bubble-arrow-modern"></div>
            </div>
          )}

          {/* Avatar - sprite sheet animace */}
          <div
            className={`helper-avatar-modern ${isBubbleVisible ? 'active' : ''}`}
            onClick={handleAvatarClick}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            role="button"
            tabIndex={0}
            aria-label="Kontextový pomocník"
            title="Přetáhni mě kamkoliv"
            style={{
              backgroundImage: `url(${avatarImage})`,
              backgroundPosition: getSpritePosition(avatarState),
              backgroundSize: '200% 200%',
              backgroundRepeat: 'no-repeat'
            }}
          >
          </div>
        </div>
      )}
    </>,
    document.body
  );
};

export default ModernHelper;
