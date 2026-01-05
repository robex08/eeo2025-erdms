import { createWorker } from 'tesseract.js';

/**
 * Převede PDF na canvas obrázek pomocí PDF.js
 */
async function pdfToCanvas(arrayBuffer) {
  // Dynamicky importujeme pdfjs-dist
  const pdfjsLib = await import('pdfjs-dist/webpack');
  
  // Načteme PDF z ArrayBuffer
  const loadingTask = pdfjsLib.getDocument({ 
    data: arrayBuffer,
    verbosity: 0 // Snížíme úroveň logování
  });
  
  const pdf = await loadingTask.promise;
  
  // Získáme první stranu
  const page = await pdf.getPage(1);
  
  // Nastavíme viewport (scale 2 pro lepší kvalitu OCR)
  const viewport = page.getViewport({ scale: 2.0 });
  
  // Vytvoříme canvas
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  // Renderujeme stránku na canvas
  const renderTask = page.render({
    canvasContext: context,
    viewport: viewport
  });
  
  await renderTask.promise;
  
  return canvas;
}

/**
 * Extrahuje text z PDF pomocí OCR
 * @param {ArrayBuffer} arrayBuffer - PDF data jako ArrayBuffer
 * @param {Function} onProgress - Callback pro progress (0-100)
 * @returns {Promise<string>} - Extrahovaný text
 */
export async function extractTextFromPDF(arrayBuffer, onProgress = () => {}, retryCount = 0) {
  const MAX_RETRIES = 2;
  const TIMEOUT_MS = 90000; // 90 sekund timeout (delší kvůli konverzi)
  
  try {
    // Validace vstupu
    if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer)) {
      throw new Error('Neplatný ArrayBuffer');
    }

    onProgress(0, 'Načítám PDF...');
    
    // Validace velikosti
    if (arrayBuffer.byteLength === 0) {
      throw new Error('PDF soubor je prázdný');
    }
    
    if (arrayBuffer.byteLength < 100) {
      throw new Error('PDF soubor je příliš malý (možná není kompletní)');
    }
    
    onProgress(10, 'Převádím PDF na obrázek...');
    
    // Převedeme PDF na canvas (první strana)
    let canvas;
    try {
      canvas = await Promise.race([
        pdfToCanvas(arrayBuffer),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout při konverzi PDF (30s)')), 30000)
        )
      ]);
    } catch (conversionError) {
      console.error('❌ PDF conversion error:', conversionError);
      
      // Retry logic
      if (retryCount < MAX_RETRIES) {
        onProgress(5, `Opakuji pokus ${retryCount + 2}/${MAX_RETRIES + 1}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return extractTextFromPDF(arrayBuffer, onProgress, retryCount + 1);
      }
      
      throw new Error(`Nepodařilo se převést PDF na obrázek: ${conversionError.message}`);
    }
    
    onProgress(30, 'Připravuji optimalizovaný OCR engine...');
    
    // 🎯 SINGLE OPTIMALIZOVANÝ PRŮCHOD s nejlepším nastavením
    let worker;
    try {
      worker = await Promise.race([
        createWorker('ces', 1, {
          logger: m => {
            if (m.status === 'recognizing text') {
              const progress = 30 + (m.progress * 60);
              onProgress(progress, `Rozpoznávám text: ${Math.round(m.progress * 100)}%`);
            }
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout při inicializaci OCR (30s)')), 30000)
        )
      ]);
      
      // ✨ OPTIMÁLNÍ NASTAVENÍ pro faktury
      await worker.setParameters({
        tessedit_pageseg_mode: '3', // PSM 3 = Automatic page segmentation (nejspolehlivější)
        preserve_interword_spaces: '1', // Zachovat mezery mezi slovy
        tessedit_char_whitelist: '0123456789.,/:- ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁáČčĎďÉéĚěÍíŇňÓóŘřŠšŤťÚúŮůÝýŽž', // Povolené znaky
      });
      
      
    } catch (workerError) {
      console.error('❌ Worker creation error:', workerError);
      
      if (retryCount < MAX_RETRIES) {
        onProgress(5, `Opakuji pokus ${retryCount + 2}/${MAX_RETRIES + 1}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return extractTextFromPDF(arrayBuffer, onProgress, retryCount + 1);
      }
      
      throw new Error('Nepodařilo se spustit OCR engine. Zkuste obnovit stránku.');
    }
    
    let text = '';
    try {
      onProgress(90, 'Dokončuji rozpoznávání...');
      
      // Rozpoznáme text z canvas
      const result = await Promise.race([
        worker.recognize(canvas),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout při OCR (${TIMEOUT_MS/1000}s)`)), TIMEOUT_MS)
        )
      ]);
      
      text = result?.data?.text || '';
      const confidence = result?.data?.confidence || 0;
      
      
      if (!text || text.trim().length === 0) {
        throw new Error('PDF neobsahuje rozpoznatelný text. Dokument může být prázdný nebo ve špatné kvalitě.');
      }
    } catch (recognizeError) {
      console.error('❌ Recognition error:', recognizeError);
      
      if (retryCount < MAX_RETRIES && !recognizeError.message.includes('Timeout')) {
        await worker.terminate();
        return extractTextFromPDF(arrayBuffer, onProgress, retryCount + 1);
      }
      
      throw new Error('OCR selhalo: ' + (recognizeError.message || 'Neznámá chyba'));
    } finally {
      try {
        await worker.terminate();
      } catch (e) {
        console.warn('⚠️ Worker termination error:', e);
      }
    }
    
    onProgress(100, 'Hotovo!');
    
    return text;
  } catch (error) {
    console.error('💥 OCR extraction error:', error, error.stack);
    throw error;
  }
}

/**
 * Vytěží údaje o faktuře z textu
 * @param {string} text - Text z OCR
 * @returns {Object} - Vytěžené údaje
 */
export function extractInvoiceData(text) {
  const result = {
    datumVystaveni: null,
    datumSplatnosti: null,
    variabilniSymbol: null,
    castka: null,
    isFaktura: false,
    warning: null
  };

  // Normalizujeme text - odstranění diakritiky pro robustnější hledání
  const normalizedText = text.toLowerCase();
  
  // Rozdělíme na řádky pro lepší analýzu
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // ========== DETEKCE TYPU DOKUMENTU ==========
  // Kontrola, zda dokument obsahuje slovo "FAKTURA"
  const fakturaKeywords = ['faktura', 'invoice', 'daňový doklad', 'tax invoice'];
  const isFaktura = fakturaKeywords.some(keyword => normalizedText.includes(keyword));
  
  result.isFaktura = isFaktura;
  
  if (!isFaktura) {
    // Detekce jiných typů dokumentů
    if (normalizedText.includes('objednávka') || normalizedText.includes('order')) {
      result.warning = 'Dokument se zdá být objednávkou, ne fakturou. OCR extrakce nemusí být relevantní.';
    } else if (normalizedText.includes('dodací list') || normalizedText.includes('delivery note')) {
      result.warning = 'Dokument se zdá být dodacím listem, ne fakturou. OCR extrakce nemusí být relevantní.';
    } else if (normalizedText.includes('nabídka') || normalizedText.includes('quotation')) {
      result.warning = 'Dokument se zdá být cenovou nabídkou, ne fakturou. OCR extrakce nemusí být relevantní.';
    } else {
      result.warning = 'Dokument neobsahuje slovo "FAKTURA". Může se jednat o jiný typ dokumentu (objednávku, dodací list, nabídku).';
    }
  }
  
  // ========== Hledání Variabilního symbolu ==========
  // Možné varianty: "Variabilní symbol", "Číslo faktury", "Faktura číslo", "VS", "Faktura č."
  const vsPatterns = [
    /(?:variabiln[ií]\s*symbol|var\.?\s*symbol|vs)[:\s]*(\d{4,})/i,
    /(?:číslo\s*faktury|faktura\s*číslo|faktura\s*č\.?)[:\s]*(\d{4,})/i,
    /\b(\d{8,})\b/  // Fallback: 8+ číslic
  ];
  
  for (const pattern of vsPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      result.variabilniSymbol = match[1].trim();
      break;
    }
  }

  // ========== ROBUSTNÍ HLEDÁNÍ DATUMŮ S MULTI-LINE KONTEXTEM ==========
  // Najdeme všechny datumy v textu a analyzujeme jejich kontext (i přes řádky)
  const allDateMatches = [];
  
  // Více variant datumových formátů (pro špatné OCR)
  const dateRegex = /(\d{1,2}[\s./-]*\d{1,2}[\s./-]*\d{4})/g;
  let match;
  
  while ((match = dateRegex.exec(text)) !== null) {
    const dateStr = match[1];
    const startPos = match.index;
    const endPos = startPos + dateStr.length;
    
    // Získáme široký kontext (100 znaků před, 50 po) pro multi-line analýzu
    const contextBefore = text.substring(Math.max(0, startPos - 100), startPos);
    const contextAfter = text.substring(endPos, Math.min(text.length, endPos + 50));
    const fullContext = contextBefore + ' ' + contextAfter;
    
    // Normalizace kontextu - odstranění nadbytečných mezer/newlines
    const normalizedContext = fullContext.toLowerCase()
      .replace(/\s+/g, ' ')  // Více mezer → jedna mezera
      .replace(/[^\w\s:.-]/g, ''); // Odstranit speciální znaky kromě : . -
    
    // Parsování data (s tolerancí k mezerám)
    const cleanDateStr = dateStr.replace(/\s+/g, '');
    const parsed = parseCzechDate(cleanDateStr);
    
    if (parsed) {
      allDateMatches.push({
        date: cleanDateStr,
        originalDate: dateStr,
        parsed,
        contextBefore: contextBefore.toLowerCase(),
        contextAfter: contextAfter.toLowerCase(),
        fullContext: normalizedContext,
        position: startPos
      });
    }
  }
  
  // ========== ROBUSTNÍ Hledání Datumu vystavení ==========
  // Více variant klíčových slov (včetně OCR chyb: í→i, ě→e, ř→r, atd.)
  const issueDateKeywords = [
    // Přesné varianty - VYSOKÉ SKÓRE
    { word: 'datum vystaveni', score: 20, aliases: ['datumvystaveni', 'dat vystaveni', 'dat.vystaveni'] },
    { word: 'datum vystavení', score: 20, aliases: ['datumvystavení'] },
    { word: 'vystaveni dokladu', score: 18, aliases: ['vystavénídokladu', 'vystaveni dokl'] },
    { word: 'datum dokladu', score: 16, aliases: ['datdokladu', 'dat.dokladu'] },
    { word: 'vystaveno', score: 14, aliases: ['vystavěno'] },
    { word: 'date of issue', score: 15, aliases: [] },
    { word: 'datum vytvoreni', score: 12, aliases: ['datumvytvoreni'] },
    { word: 'datum vytvoření', score: 12, aliases: ['datumvytvoření'] },
    { word: 'issued', score: 10, aliases: [] },
    // OCR typo varianty
    { word: 'daturn vystaveni', score: 18, aliases: [] }, // OCR: m→rn
    { word: 'oatum vystaveni', score: 18, aliases: [] }, // OCR: d→o
    { word: 'vystavem', score: 12, aliases: [] }, // OCR: no→m
  ];
  
  let bestIssueDate = null;
  let bestIssueScore = 0;
  let bestIssueDebug = '';
  
  for (const dateMatch of allDateMatches) {
    let score = 0;
    let foundKeywords = [];
    
    // Skóre podle klíčových slov v kontextu
    for (const keywordObj of issueDateKeywords) {
      const mainWord = keywordObj.word;
      const wordScore = keywordObj.score;
      const aliases = keywordObj.aliases || [];
      
      // Kontrola hlavního slova
      if (dateMatch.fullContext.includes(mainWord)) {
        score += wordScore;
        foundKeywords.push(mainWord);
        
        // Extra body pokud je těsně před datem (30 znaků)
        const closeContext = dateMatch.contextBefore.slice(-30);
        if (closeContext.includes(mainWord)) {
          score += Math.floor(wordScore * 0.5); // +50% bonusu
        }
      }
      
      // Kontrola aliasů
      for (const alias of aliases) {
        if (dateMatch.fullContext.includes(alias)) {
          score += Math.floor(wordScore * 0.8); // 80% skóre pro alias
          foundKeywords.push(`${alias}(alias)`);
        }
      }
    }
    
    // SILNÁ penalizace pro slova typická pro splatnost
    const antiKeywords = ['splatnost', 'splatnosti', 'splatno', 'splatne', 'due date', 'payment due', 
                          'zaplatit', 'uhradit', 'uhrazen', 'zaplaceno'];
    for (const antiWord of antiKeywords) {
      if (dateMatch.fullContext.includes(antiWord)) {
        score -= 30; // Zvýšeno z 25
        foundKeywords.push(`-${antiWord}(penalty)`);
      }
    }
    
    // SILNÁ penalizace pro "zdanitelného plnění" (často tam je jiné datum)
    if (dateMatch.fullContext.includes('zdanitelneho') || dateMatch.fullContext.includes('zdanitelného') ||
        dateMatch.fullContext.includes('zdanitelne') || dateMatch.fullContext.includes('plneni')) {
      score -= 20; // Zvýšeno z 15
      foundKeywords.push('-zdanitelneho/plneni(penalty)');
    }
    
    // SILNÁ penalizace pro "dne" bez dalšího kontextu (slabý indikátor)
    const hasWeakDne = dateMatch.contextBefore.includes(' dne ') || dateMatch.contextBefore.includes(' dne:');
    const hasStrongKeyword = foundKeywords.some(kw => 
      kw.includes('datum') || kw.includes('vystaveni') || kw.includes('dokladu')
    );
    if (hasWeakDne && !hasStrongKeyword) {
      score -= 10;
      foundKeywords.push('-weak_dne(penalty)');
    }
    
    if (score > bestIssueScore) {
      bestIssueScore = score;
      bestIssueDate = dateMatch.parsed;
      bestIssueDebug = `${dateMatch.date} [${foundKeywords.join(', ')}]`;
    }
  }
  
  result.datumVystaveni = bestIssueDate;
  
  // ========== ROBUSTNÍ Hledání Datumu splatnosti ==========
  // Více variant klíčových slov (včetně OCR chyb)
  const dueDateKeywords = [
    // Přesné varianty - VYSOKÉ SKÓRE
    { word: 'datum splatnosti', score: 20, aliases: ['datumsplatnosti', 'dat splatnosti', 'dat.splatnosti'] },
    { word: 'termin splatnosti', score: 18, aliases: ['terminsplatnosti'] },
    { word: 'splatnost:', score: 16, aliases: ['splatnost :'] }, // S dvojtečkou = silnější
    { word: 'splatnost', score: 14, aliases: [] }, // Bez dvojtečky = slabší
    { word: 'due date', score: 17, aliases: ['duedate'] },
    { word: 'payment due', score: 17, aliases: ['paymentdue'] },
    { word: 'splatne', score: 13, aliases: ['splatné'] },
    { word: 'splatno', score: 13, aliases: [] },
    { word: 'splatna dne', score: 15, aliases: ['splatnadne'] },
    { word: 'zaplatit do', score: 12, aliases: ['zaplatitdo'] },
    { word: 'uhradit do', score: 12, aliases: ['uhraditdo'] },
    // OCR typo varianty
    { word: 'oatum splatnosti', score: 18, aliases: [] }, // OCR: d→o
    { word: 'splamost', score: 13, aliases: [] }, // OCR: tn→m
  ];
  
  let bestDueDate = null;
  let bestDueScore = 0;
  let bestDueDebug = '';
  
  for (const dateMatch of allDateMatches) {
    let score = 0;
    let foundKeywords = [];
    
    // Skóre podle klíčových slov v kontextu
    for (const keywordObj of dueDateKeywords) {
      const mainWord = keywordObj.word;
      const wordScore = keywordObj.score;
      const aliases = keywordObj.aliases || [];
      
      // Kontrola hlavního slova
      if (dateMatch.fullContext.includes(mainWord)) {
        score += wordScore;
        foundKeywords.push(mainWord);
        
        // Extra body pokud je těsně před datem (30 znaků)
        const closeContext = dateMatch.contextBefore.slice(-30);
        if (closeContext.includes(mainWord)) {
          score += Math.floor(wordScore * 0.5); // +50% bonusu
        }
      }
      
      // Kontrola aliasů
      for (const alias of aliases) {
        if (dateMatch.fullContext.includes(alias)) {
          score += Math.floor(wordScore * 0.8); // 80% skóre pro alias
          foundKeywords.push(`${alias}(alias)`);
        }
      }
    }
    
    // SILNÁ penalizace pro slova typická pro vystavení
    const antiKeywords = ['vystaveni', 'vystavení', 'vystaveno', 'datum dokladu', 'issued', 
                          'date of issue', 'vytvoreni', 'vytvoření', 'datum vytvoreni'];
    for (const antiWord of antiKeywords) {
      if (dateMatch.fullContext.includes(antiWord)) {
        score -= 30; // Zvýšeno z 25
        foundKeywords.push(`-${antiWord}(penalty)`);
      }
    }
    
    // SILNÁ penalizace pro "zdanitelného plnění" (není to splatnost)
    if (dateMatch.fullContext.includes('zdanitelneho') || dateMatch.fullContext.includes('zdanitelného') ||
        dateMatch.fullContext.includes('zdanitelne') || dateMatch.fullContext.includes('plneni')) {
      score -= 20; // Zvýšeno z 15
      foundKeywords.push('-zdanitelneho/plneni(penalty)');
    }
    
    // SILNÝ bonus pokud je datum POZDĚJI než datum vystavení (logická kontrola)
    if (result.datumVystaveni && dateMatch.parsed > result.datumVystaveni) {
      score += 10; // Zvýšeno z 5
      foundKeywords.push('+later_than_issue(+10)');
    } else if (result.datumVystaveni && dateMatch.parsed === result.datumVystaveni) {
      // Penalizace pokud je STEJNÉ jako datum vystavení (nesmysl)
      score -= 15;
      foundKeywords.push('-same_as_issue(penalty)');
    }
    
    if (score > bestDueScore) {
      bestDueScore = score;
      bestDueDate = dateMatch.parsed;
      bestDueDebug = `${dateMatch.date} [${foundKeywords.join(', ')}]`;
    }
  }
  
  result.datumSplatnosti = bestDueDate;

  // ========== Hledání Částky vč. DPH ==========
  // Hledáme částku s označením různých variant
  const amountPatterns = [
    // Primární varianty - nejpřesnější
    /(?:celkem|včetně\s*dph|s\s*dph|k\s*úhradě|k\s*zaplacení)[:\s]*(\d+(?:[,\s]\d{3})*[,.]?\d{0,2})\s*(?:kč|czk)?/i,
    /(?:cena\s*celkem|celková\s*cena|total\s*price)[:\s]*(\d+(?:[,\s]\d{3})*[,.]?\d{0,2})\s*(?:kč|czk)?/i,
    // Sekundární varianty
    /(?:částka|cena|amount|price)[:\s]*(\d+(?:[,\s]\d{3})*[,.]?\d{0,2})\s*(?:kč|czk)?/i,
    // Celkem na konci řádku
    /(\d+(?:[,\s]\d{3})*[,.]?\d{2})\s*(?:kč|czk)?\s*celkem/i,
    // S mezerou mezi čísly (formát tisíce)
    /(?:celkem|cena)[:\s]*(\d{1,3}(?:\s\d{3})*[,.]?\d{0,2})\s*(?:kč|czk)?/i
  ];
  
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      result.castka = parseAmount(match[1]);
      break;
    }
  }

  // Pokud jsme nenašli částku s klíčovými slovy, zkusíme největší částku v dokumentu
  if (!result.castka) {
    const allAmounts = text.match(/(\d+(?:[,\s]\d{3})*[,.]?\d{2})\s*(?:kč|czk)/gi);
    if (allAmounts && allAmounts.length > 0) {
      const amounts = allAmounts.map(a => parseAmount(a));
      result.castka = Math.max(...amounts);
    }
  }

  return result;
}

/**
 * Parsuje české datum do ISO formátu
 */
function parseCzechDate(dateStr) {
  // Formáty: DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
  const parts = dateStr.split(/[./-]/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return null;
}

/**
 * Parsuje částku (odstraní mezery, správně zpracuje čárky a tečky)
 */
function parseAmount(amountStr) {
  if (!amountStr) return null;
  
  // Odstranění nečíselných znaků kromě čárky a tečky
  let cleaned = amountStr.replace(/[^\d,.]/g, '');
  
  // Odstranění mezer používaných jako oddělovače tisíců
  cleaned = cleaned.replace(/\s/g, '');
  
  // 🎯 INTELIGENTNÍ detekce formátu:
  // Formát: 18 400,40 nebo 18.400,40 → čárka = des. tečka
  // Formát: 18,400.40 → tečka = des. tečka (EN formát)
  
  const commaCount = (cleaned.match(/,/g) || []).length;
  const dotCount = (cleaned.match(/\./g) || []).length;
  
  let normalized = cleaned;
  
  if (commaCount === 1 && dotCount === 0) {
    // Formát: 18400,40 → čárka je desetinná tečka (CZ)
    normalized = cleaned.replace(',', '.');
  } else if (commaCount === 0 && dotCount === 1) {
    // Formát: 18400.40 → tečka je desetinná tečka (OK)
    normalized = cleaned;
  } else if (commaCount > 0 && dotCount > 0) {
    // Smíšený formát - zjistit, co je oddělovač tisíců
    const lastCommaPos = cleaned.lastIndexOf(',');
    const lastDotPos = cleaned.lastIndexOf('.');
    
    if (lastCommaPos > lastDotPos) {
      // Poslední je čárka → čárka = des. tečka, tečky = tisíce
      // Např: 18.400,40
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Poslední je tečka → tečka = des. tečka, čárky = tisíce
      // Např: 18,400.40
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (commaCount > 1) {
    // Více čárek → všechny jsou oddělovače tisíců
    // Např: 1,000,000 → odstraníme
    normalized = cleaned.replace(/,/g, '');
  } else if (dotCount > 1) {
    // Více teček → všechny jsou oddělovače tisíců
    // Např: 1.000.000 → odstraníme
    normalized = cleaned.replace(/\./g, '');
  }
  
  const result = parseFloat(normalized);
  
  return isNaN(result) ? null : result;
}
