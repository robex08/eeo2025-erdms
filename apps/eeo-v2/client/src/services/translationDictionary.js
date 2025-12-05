// Default EN -> CZ dictionary (can be extended by user via localStorage key 'translation_dict_user')
export const baseTranslationDict = {
  // Workflow / orders
  "order":"objednávka","orders":"objednávky","purchase":"nákup","purchaser":"nákupčí",
  "approval":"schválení","approvals":"schvalování","approve":"schválit","approved":"schváleno","reject":"zamítnout","rejected":"zamítnuto","return":"vrátit","returned":"vráceno","reopen":"znovu otevřít",
  "draft":"návrh","ready":"připraveno","status":"stav","history":"historie","workflow":"workflow","sequence":"sekvence",
  // Users / roles
  "user":"uživatel","users":"uživatelé","role":"role","roles":"role","permission":"oprávnění","permissions":"oprávnění",
  // Items / attachments
  "item":"položka","items":"položky","line":"řádek","lines":"řádky","attachment":"příloha","attachments":"přílohy","file":"soubor","files":"soubory",
  // Fields / form
  "subject":"předmět","description":"popis","note":"poznámka","notes":"poznámky","internal":"interní","price":"cena","number":"číslo","currency":"měna","locality":"lokalita","localities":"lokality","limit":"limit","amount":"částka","total":"celkem","date":"datum","time":"čas",
  // Actions
  "add":"přidat","create":"vytvořit","save":"uložit","update":"aktualizovat","delete":"smazat","remove":"odebrat","edit":"upravit","load":"načíst","loading":"načítání","refresh":"obnovit","filter":"filtrovat","search":"hledat","print":"tisk","export":"export","import":"import","close":"zavřít","open":"otevřít",
  // States / messages
  "error":"chyba","errors":"chyby","warning":"varování","info":"info","success":"úspěch","failed":"selhalo","pending":"čeká","processing":"zpracování","locked":"uzamčeno","unlocked":"odemčeno",
  // Misc
  "task":"úkol","tasks":"úkoly","comment":"komentář","comments":"komentáře","log":"log","logs":"logy","audit":"audit","version":"verze","change":"změna","changes":"změny","diff":"rozdíl","conflict":"konflikt","numbering":"číslování"
};

export function loadMergedTranslationDict() {
  try {
    const raw = localStorage.getItem('translation_dict_user');
    if (!raw) return { ...baseTranslationDict };
    const userDict = JSON.parse(raw);
    return { ...baseTranslationDict, ...(userDict && typeof userDict === 'object' ? userDict : {}) };
  } catch { return { ...baseTranslationDict }; }
}

export function saveUserTranslationDict(partial) {
  try {
    // User isolation pro translation dictionary
    const userId = localStorage.getItem('current_user_id') || 'anonymous';
    const userDictKey = `translation_dict_user_${userId}`;

    const raw = localStorage.getItem(userDictKey);
    const current = raw ? JSON.parse(raw) : {};
    const merged = { ...(current||{}), ...(partial||{}) };
    localStorage.setItem(userDictKey, JSON.stringify(merged));
    return merged;
  } catch { return null; }
}
