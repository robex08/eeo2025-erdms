/**
 * 📚 CENTRALIZOVANÝ SYSTÉM HELP TEXTŮ
 * 
 * Tento soubor obsahuje všechny nápovědy, tipy a vysvětlení pro celou aplikaci.
 * Texty jsou strukturovány podle stránek (pageContext) a dále podle konkrétních
 * prvků formulářů (fieldName).
 * 
 * Struktura:
 * {
 *   pageContext: {
 *     _meta: { icon, title, description },
 *     _general: [{ text, type }], // Obecné tipy pro stránku
 *     fieldName: [{ text, type, trigger }] // Tipy pro konkrétní pole
 *   }
 * }
 * 
 * Type: 'tip' | 'info' | 'warning' | 'example'
 * Trigger: 'focus' | 'hover' | 'error' | 'auto'
 */

export const helperTexts = {
  // ============================================================================
  // OBJEDNÁVKY - SEZNAM
  // ============================================================================
  orders: {
    _meta: {
      icon: "📋",
      title: "Objednávky",
      description: "Seznam všech objednávek v systému"
    },
    
    _general: [
      { text: "Použij vyhledávání nahoře – objednávku najdeš během okamžiku", type: "tip", trigger: "auto" },
      { text: "Dvojklikem na řádek otevřeš objednávku k editaci", type: "tip", trigger: "auto" },
      { text: "Barva řádku ukazuje, v jakém stavu se objednávka nachází", type: "tip", trigger: "auto" },
      { text: "Filtr podle dodavatele ti ušetří čas při hledání", type: "tip", trigger: "auto" },
      { text: "Všechny změny se ukládají automaticky – nemusíš se obávat ztráty dat", type: "tip", trigger: "auto" },
      { text: "Barevné značení stavů: Zelená = schváleno, Žlutá = čeká na schválení, Modrá = návrh, Červená = zamítnuto.", type: "info", trigger: "auto" }
    ],
    
    search: [
      { text: "Zadej číslo objednávky, název nebo dodavatele", type: "tip", trigger: "focus" },
      { text: "Systém hledá i bez diakritiky, můžeš tedy psát rychle bez háčků a čárek", type: "info", trigger: "focus" }
    ],
    
    filter: [
      { text: "Kliknutím na barevné tlačítko stavu zobrazíš pouze objednávky v daném stavu", type: "tip", trigger: "hover" },
      { text: "Perfektní pro rychlý přehled práce", type: "info", trigger: "hover" }
    ],
    
    columns: [
      { text: "Můžeš si vybrat, které sloupce chceš zobrazit", type: "tip", trigger: "hover" },
      { text: "Klikni na ikonu sloupců vpravo nahoře a vyber si podle svých potřeb", type: "info", trigger: "hover" }
    ],
    
    sort: [
      { text: "Kliknutím na hlavičku sloupce data seřadíš", type: "tip", trigger: "hover" },
      { text: "Další kliknutí obrátí pořadí. Šipka ukáže, podle čeho je seznam seřazený", type: "info", trigger: "hover" }
    ],
    
    export: [
      { text: "Tlačítko Export stáhne aktuálně zobrazené objednávky do CSV souboru pro Excel", type: "tip", trigger: "hover" },
      { text: "Vhodné pro reporty a další zpracování", type: "info", trigger: "hover" }
    ],
    
    contextMenu: [
      { text: "Pravým tlačítkem myši na řádek otevřeš rychlé akce", type: "tip", trigger: "hover" },
      { text: "K dispozici: zobrazit, upravit, smazat, stáhnout přílohy...", type: "info", trigger: "hover" }
    ],
    
    draft: [
      { text: "Ikona tužky znamená, že máš uložený koncept", type: "tip", trigger: "hover" },
      { text: "Kliknutím na ni můžeš pokračovat, kde jsi skončil", type: "info", trigger: "hover" }
    ]
  },

  // ============================================================================
  // OBJEDNÁVKY - DETAIL/EDITACE
  // ============================================================================
  orderDetail: {
    _meta: {
      icon: "📝",
      title: "Detail objednávky",
      description: "Formulář pro vytvoření nebo úpravu objednávky"
    },
    
    _general: [
      { text: "Číslo objednávky se vyplní automaticky při prvním uložení", type: "tip", trigger: "auto" },
      { text: "Před odesláním ke schválení zkontroluj všechna povinná pole", type: "tip", trigger: "auto" },
      { text: "Nezapomeň uložit změny – jinak se ztratí", type: "warning", trigger: "auto" }
    ],
    
    cislo: [
      { text: "Číslo se generuje automaticky ve formátu OBJ-YYYY-XXXX", type: "info", trigger: "focus" },
      { text: "Můžeš ho změnit, musí však být jedinečné", type: "info", trigger: "focus" },
      { text: "Systém tě upozorní, pokud číslo již existuje", type: "info", trigger: "error" }
    ],
    
    nazev: [
      { text: "Zadej výstižný název – ušetříš si čas při pozdějším hledání", type: "tip", trigger: "focus" },
      { text: "Příklad: 'Kancelářský papír A4 - Q4/2025'", type: "example", trigger: "focus" },
      { text: "Dobrý název ulehčí pozdější vyhledávání", type: "info", trigger: "focus" }
    ],
    
    dodavatel: [
      { text: "Začni psát název nebo IČO a systém ti nabídne odpovídající dodavatele", type: "tip", trigger: "focus" },
      { text: "Pokud není v seznamu, klikni na + a přidej nového", type: "info", trigger: "focus" }
    ],
    
    ico: [
      { text: "Po zadání IČO systém automaticky načte název firmy, adresu a další údaje z ARESu", type: "info", trigger: "focus" },
      { text: "Ušetří to čas", type: "tip", trigger: "focus" }
    ],
    
    castka: [
      { text: "Zadej celkovou částku objednávky včetně DPH", type: "tip", trigger: "focus" },
      { text: "U víceměsíčních objednávek systém automaticky rozpočítá měsíční částky", type: "info", trigger: "focus" }
    ],
    
    druh: [
      { text: "Vyber typ objednávky - běžná objednávka, rámcová smlouva, příkaz...", type: "tip", trigger: "focus" },
      { text: "Podle typu se určí, která pole jsou povinná", type: "info", trigger: "focus" }
    ],
    
    stredisko: [
      { text: "Vyber středisko, které objednávku zadává", type: "tip", trigger: "focus" },
      { text: "Podle střediska se určí schvalovatelé a limity pro automatické schválení", type: "info", trigger: "focus" }
    ],
    
    zdroj: [
      { text: "Urči, z jakého zdroje se objednávka hradí", type: "tip", trigger: "focus" },
      { text: "Možnosti: běžný provoz, projekt, grant, dar...", type: "info", trigger: "focus" },
      { text: "Tato informace je důležitá pro účetnictví", type: "info", trigger: "focus" }
    ],
    
    prilohy: [
      { text: "Přetažením souborů do pole nebo kliknutím na tlačítko nahráš přílohy", type: "tip", trigger: "focus" },
      { text: "Podporované formáty: PDF, JPG, PNG, DOC, XLS...", type: "info", trigger: "focus" },
      { text: "Maximální velikost: 20 MB", type: "info", trigger: "focus" }
    ],
    
    faktura: [
      { text: "Před odesláním ke schválení je nutné přiložit fakturu", type: "warning", trigger: "focus" },
      { text: "Nahraj sken nebo PDF", type: "tip", trigger: "focus" },
      { text: "Bez přílohy nelze objednávku odeslat", type: "warning", trigger: "error" }
    ],
    
    workflow: [
      { text: "Průchod objednávkou: Návrh -> Ke schválení -> Schváleno -> Realizováno", type: "info", trigger: "hover" },
      { text: "V každém stavu máš jiné možnosti úprav", type: "info", trigger: "hover" }
    ],
    
    autosave: [
      { text: "Formulář se ukládá jako koncept každých 30 sekund", type: "info", trigger: "auto" },
      { text: "Můžeš okno kdykoliv zavřít a později pokračovat", type: "tip", trigger: "auto" }
    ],
    
    validation: [
      { text: "Červené ohraničení pole znamená chybu nebo chybějící povinný údaj", type: "warning", trigger: "error" },
      { text: "Přejetím myši zobrazíš podrobnosti", type: "tip", trigger: "error" }
    ],
    
    lock: [
      { text: "Když objednávku edituje jiný uživatel, zobrazí se zámek a jeho jméno", type: "info", trigger: "auto" },
      { text: "Počkej, až dokončí, nebo požádej o odemknutí", type: "tip", trigger: "auto" }
    ]
  },

  // ============================================================================
  // POKLADNÍ KNIHA
  // ============================================================================
  cashbook: {
    _meta: {
      icon: "💰",
      title: "Pokladní kniha",
      description: "Správa příjmů a výdajů pokladny"
    },
    
    _general: [
      { text: "Před uzavřením měsíce vždy zkontroluj konečný zůstatek", type: "tip", trigger: "auto" },
      { text: "Uzavřený měsíc již nelze upravit bez speciálního oprávnění", type: "warning", trigger: "auto" }
    ],
    
    castka: [
      { text: "Částku zadávej bez mezer, jako oddělovač použij tečku nebo čárku", type: "tip", trigger: "focus" }
    ],
    
    popis: [
      { text: "Do popisu zapiš, o co šlo – za měsíc si to už nepamatuješ", type: "tip", trigger: "focus" }
    ],
    
    datum: [
      { text: "Datum se předvyplní dnešním dnem, lze ho však změnit", type: "info", trigger: "focus" }
    ],
    
    summary: [
      { text: "Příjmy a výdaje se automaticky sčítají v záložce nahoře", type: "info", trigger: "hover" }
    ],
    
    transfer: [
      { text: "Převod mezi pokladnami provedeš pomocí tlačítka Převod", type: "tip", trigger: "hover" }
    ]
  },

  // ============================================================================
  // PROFIL UŽIVATELE
  // ============================================================================
  profile: {
    _meta: {
      icon: "⚙️",
      title: "Profil uživatele",
      description: "Osobní nastavení a předvolby"
    },
    
    _general: [
      { text: "Všechny změny se projeví okamžitě po uložení", type: "info", trigger: "auto" }
    ],
    
    email: [
      { text: "Email slouží jako přihlašovací jméno – buď opatrný při změně", type: "warning", trigger: "focus" }
    ],
    
    password: [
      { text: "Nové heslo musí obsahovat minimálně 8 znaků", type: "info", trigger: "focus" }
    ],
    
    notifications: [
      { text: "Notifikace přicházejí na email i do aplikace", type: "info", trigger: "focus" }
    ],
    
    settings: [
      { text: "Svá nastavení můžeš kdykoliv změnit podle svých potřeb", type: "tip", trigger: "auto" }
    ]
  },

  // ============================================================================
  // SPRÁVA UŽIVATELŮ
  // ============================================================================
  users: {
    _meta: {
      icon: "👥",
      title: "Správa uživatelů",
      description: "Administrace uživatelských účtů"
    },
    
    _general: [
      { text: "Každý uživatel vidí pouze to, k čemu má oprávnění", type: "info", trigger: "auto" }
    ],
    
    email: [
      { text: "Při zakládání uživatele zadej jeho email – tam mu přijde pozvánka", type: "tip", trigger: "focus" }
    ],
    
    role: [
      { text: "Role určují, k jakým funkcím má uživatel přístup", type: "info", trigger: "focus" }
    ],
    
    active: [
      { text: "Místo smazání uživatele ho raději deaktivuj – zachováš historii", type: "tip", trigger: "focus" }
    ],
    
    permissions: [
      { text: "Oprávnění upravuj kliknutím na ikonu tužky vedle jména", type: "tip", trigger: "hover" }
    ]
  },

  // ============================================================================
  // ČÍSELNÍKY
  // ============================================================================
  dictionaries: {
    _meta: {
      icon: "📚",
      title: "Číselníky",
      description: "Správa číselníků a katalogů"
    },
    
    _general: [
      { text: "Číselníky jsou společné pro všechny uživatele – změna se projeví všem", type: "warning", trigger: "auto" },
      { text: "Smazat lze pouze položky, které se nikde nepoužívají", type: "info", trigger: "auto" }
    ],
    
    add: [
      { text: "Novou položku přidáš pomocí tlačítka Přidat", type: "tip", trigger: "hover" }
    ],
    
    edit: [
      { text: "Položku upravuj dvojklikem nebo kliknutím na ikonu tužky", type: "tip", trigger: "hover" }
    ],
    
    search: [
      { text: "Vyhledávání funguje i bez háčků a čárek", type: "info", trigger: "focus" }
    ]
  },

  // ============================================================================
  // VÝCHOZÍ NÁPOVĚDA
  // ============================================================================
  default: {
    _meta: {
      icon: "💡",
      title: "Obecná nápověda",
      description: "Základní informace o aplikaci"
    },
    
    _general: [
      { text: "Jsem zde, abych ti pomohl s ovládáním aplikace", type: "tip", trigger: "auto" },
      { text: "Můžeš mě přetáhnout myší kamkoliv na obrazovce", type: "tip", trigger: "auto" },
      { text: "Při kliknutí na pole zobrazím užitečný tip k danému prvku", type: "tip", trigger: "auto" },
      { text: "Nevíš si rady? Klikni na mě a zobrazím obecnou nápovědu", type: "tip", trigger: "auto" }
    ]
  }
};

/**
 * Získá help texty pro daný kontext stránky
 * @param {string} pageContext - Kontext stránky (orders, orderDetail, cashbook, atd.)
 * @returns {Object} Objekt s metadaty a tipy
 */
export function getHelperTextsForPage(pageContext) {
  return helperTexts[pageContext] || helperTexts.default;
}

/**
 * Získá help texty pro konkrétní pole
 * @param {string} pageContext - Kontext stránky
 * @param {string} fieldName - Název pole
 * @returns {Array} Pole tipů pro dané pole
 */
export function getHelperTextsForField(pageContext, fieldName) {
  const pageTexts = helperTexts[pageContext] || helperTexts.default;
  return pageTexts[fieldName] || [];
}

/**
 * Získá všechny obecné tipy pro stránku
 * @param {string} pageContext - Kontext stránky
 * @returns {Array} Pole obecných tipů
 */
export function getGeneralTips(pageContext) {
  const pageTexts = helperTexts[pageContext] || helperTexts.default;
  return pageTexts._general || [];
}

/**
 * Získá metadata stránky
 * @param {string} pageContext - Kontext stránky
 * @returns {Object} Metadata s ikonou, titulkem a popisem
 */
export function getPageMetadata(pageContext) {
  const pageTexts = helperTexts[pageContext] || helperTexts.default;
  return pageTexts._meta || { icon: "💡", title: "Nápověda", description: "" };
}

/**
 * Vyhledá help texty podle klíčového slova
 * @param {string} keyword - Klíčové slovo k vyhledání
 * @returns {Array} Pole nalezených tipů s kontextem
 */
export function searchHelperTexts(keyword) {
  const results = [];
  const lowerKeyword = keyword.toLowerCase();
  
  Object.entries(helperTexts).forEach(([pageContext, pageData]) => {
    Object.entries(pageData).forEach(([fieldName, fieldData]) => {
      if (fieldName.startsWith('_')) return; // Skip meta fields
      
      if (Array.isArray(fieldData)) {
        fieldData.forEach(tip => {
          if (tip.text.toLowerCase().includes(lowerKeyword)) {
            results.push({
              pageContext,
              fieldName,
              ...tip
            });
          }
        });
      }
    });
  });
  
  return results;
}

export default helperTexts;
