import { loadMergedTranslationDict } from '../services/translationDictionary';

let cachedDict = null;
function getDict() { if (!cachedDict) cachedDict = loadMergedTranslationDict(); return cachedDict || {}; }

// Basic heuristic English->Czech word substitution with suffix stripping.
export function translateToCz(input) {
  if (!input) return input;
  const diacritics = input.match(/[ěščřžýáíéúůťďňó]/gi);
  if (diacritics && diacritics.length > 1) return input; // already Czech looking
  const dict = getDict();
  return input.replace(/([A-Za-z]{2,})(['’]s)?/g, (full, word, possessive) => {
    const lw = word.toLowerCase();
    const attempt = (base) => dict[base];
    let base = attempt(lw);
    if (!base && lw.endsWith('ing')) base = attempt(lw.slice(0,-3)) || attempt(lw.slice(0,-3)+'e');
    if (!base && lw.endsWith('ed')) base = attempt(lw.slice(0,-2)) || attempt(lw.slice(0,-1));
    if (!base && lw.endsWith('es')) base = attempt(lw.slice(0,-2)) || attempt(lw.slice(0,-1));
    if (!base && lw.endsWith('s')) base = attempt(lw.slice(0,-1));
    if (!base) return full;
    const translated = (word[0] === word[0].toUpperCase()) ? base.charAt(0).toUpperCase()+base.slice(1) : base;
    return translated + (possessive ? ' ' : '');
  });
}
