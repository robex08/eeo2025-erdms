import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Normalizuje text - odstranění diakritiky, malá písmena, trimování
 * @param {string} text - Text k normalizaci
 * @returns {string} - Normalizovaný text
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD') // Rozloží diakritiku na základní znaky + kombinující znaky
    .replace(/[\u0300-\u036f]/g, ''); // Odstraní kombinující znaky (diakritiku)
}

/**
 * Vypočítá podobnost dvou textů pomocí Levenshtein distance
 * @param {string} str1 - První text
 * @param {string} str2 - Druhý text
 * @returns {number} - Podobnost v procentech (0-100)
 */
function calculateSimilarity(str1, str2) {
  // Normalizace textu - bez diakritiky, malá písmena
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);

  if (s1 === s2) return 100;
  if (!s1 || !s2) return 0;

  // Levenshtein distance
  const matrix = [];
  const n = s1.length;
  const m = s2.length;

  if (n === 0) return 0;
  if (m === 0) return 0;

  for (let i = 0; i <= n; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= m; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (s1.charAt(i - 1) === s2.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  const distance = matrix[n][m];
  const maxLength = Math.max(n, m);
  const similarity = ((maxLength - distance) / maxLength) * 100;

  return Math.round(similarity);
}

/**
 * Globální hook pro hlasový přepis pomocí Web Speech API
 *
 * Funkce:
 * - CTRL+Space kdekoli v aplikaci spustí/zastaví nahrávání
 * - Pokud je focus na input/textarea → přepíše tam
 * - Pokud není focus nikde → otevře NotesPanel a přepíše tam
 * - Zvýraznění klíčových slov
 *
 * @param {Object} options - Konfigurace
 * @param {Function} options.onOpenNotesPanel - Callback pro otevření NotesPanel
 * @param {Function} options.onInsertToNotes - Callback pro vložení textu do NotesPanel
 * @param {Function} options.onUnsupportedBrowser - Callback volaný když API není podporováno (zobrazit dialog)
 * @param {Array<string>} options.keywords - Klíčová slova pro zvýraznění
 * @param {string} options.lang - Jazyk rozpoznávání (default: 'cs-CZ')
 */
export function useGlobalVoiceRecognition({
  onOpenNotesPanel,
  onInsertToNotes,
  onUnsupportedBrowser, // ✅ Nový callback pro nepodporovaný prohlížeč
  keywords = [],
  lang = 'cs-CZ'
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [currentTarget, setCurrentTarget] = useState(null); // null | HTMLElement
  const [isSupported, setIsSupported] = useState(false); // ✅ Nový state pro detekci podpory
  const accumulatedTextRef = useRef(''); // Akumulovaný text během nahrávání

  // Inicializace Speech Recognition
  useEffect(() => {
    const hasSupport = ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
    setIsSupported(hasSupport);

    if (!hasSupport) {
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();

    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = lang;

    recognitionInstance.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Vložit finální text
      if (finalTranscript) {
        accumulatedTextRef.current += finalTranscript;
        insertText(finalTranscript, currentTarget);
      }
    };

    recognitionInstance.onerror = (event) => {
      if (event.error === 'no-speech') {
        // Ignorovat, pokud není detekována řeč
        return;
      }
      stopRecording();
    };

    recognitionInstance.onend = () => {
      setIsRecording(false);
      accumulatedTextRef.current = '';
    };

    setRecognition(recognitionInstance);

    return () => {
      if (recognitionInstance) {
        try {
          recognitionInstance.stop();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // Funkce pro vložení textu
  const insertText = useCallback((text, targetElement) => {
    if (!text) return;

    // console.log(`🎤 insertText volána s textem:`, JSON.stringify(text), `(délka: ${text.length})`);

    // Trimování textu - odstranění mezer na začátku a konci (speech recognition často přidává mezery)
    text = text.trim();
    if (!text) return; // Pokud po trimování není nic, skonči

    // console.log(`🎤 Po trimování:`, JSON.stringify(text), `(délka: ${text.length})`);

    // console.log('🎤 insertText called', { text, targetElement, hasCallback: !!onInsertToNotes });

    // Pokud není targetElement, zkus detekovat aktivní element
    let actualTarget = targetElement;
    if (!actualTarget) {
      const activeElement = document.activeElement;

      // console.log(`🔍 DEBUG activeElement:`, {
      //   tagName: activeElement?.tagName,
      //   type: activeElement?.type,
      //   id: activeElement?.id,
      //   name: activeElement?.name
      // });

      // Kontrola pro INPUT, TEXTAREA, SELECT i CUSTOM SELECT
      if (activeElement) {
        // SPECIÁLNÍ PŘÍPAD: Search input uvnitř custom selectu
        // Pokud je to input a má parent s data-custom-select nebo data-stable-select,
        // použij parent select místo inputu
        if (activeElement.tagName === 'INPUT' &&
            activeElement.type === 'text' &&
            (activeElement.closest('[data-custom-select]') || activeElement.closest('[data-stable-select]'))) {
          const parentSelect = activeElement.closest('[data-custom-select]') || activeElement.closest('[data-stable-select]');
          actualTarget = parentSelect;
        }
        // Native SELECT nebo INPUT/TEXTAREA
        else if (activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.tagName === 'SELECT') {

          // Pro SELECT jen zkontroluj disabled
          if (activeElement.tagName === 'SELECT') {
            if (!activeElement.disabled) {
              actualTarget = activeElement;
            }
          } else {
            // Pro INPUT/TEXTAREA kontrola jako dosud
            const isEditable = !activeElement.disabled && !activeElement.readOnly;
            const isValidType = !['password', 'file', 'radio', 'checkbox', 'submit', 'button'].includes(activeElement.type);

            if (isEditable && isValidType) {
              actualTarget = activeElement;
            }
          }
        }
        // CustomSelect nebo StableCustomSelect - button nebo search input uvnitř selectu
        else {
          const customSelectParent = activeElement.closest('[data-custom-select]');
          const stableSelectParent = activeElement.closest('[data-stable-select]');

          if (customSelectParent || stableSelectParent) {
            actualTarget = customSelectParent || stableSelectParent;
          }
        }
      }
    }
    // Zvýraznění klíčových slov
    let highlightedText = text;
    if (keywords && keywords.length > 0) {
      keywords.forEach(keyword => {
        const regex = new RegExp(`(${keyword})`, 'gi');
        highlightedText = highlightedText.replace(
          regex,
          '<mark style="background:#fef08a; color:#854d0e; padding:2px 4px; border-radius:3px;">$1</mark>'
        );
      });
    }

    // SPECIÁLNÍ HANDLING PRO CUSTOM SELECT a STABLE SELECT (DIV komponenty)
    if (actualTarget && (actualTarget.hasAttribute('data-custom-select') || actualTarget.hasAttribute('data-stable-select'))) {
      const isStableSelect = actualTarget.hasAttribute('data-stable-select');

      // DEBUG: Co je actualTarget?
      // console.log(`🔍 DEBUG actualTarget:`, {
      //   tagName: actualTarget.tagName,
      //   hasDataCustomSelect: actualTarget.hasAttribute('data-custom-select'),
      //   hasDataStableSelect: actualTarget.hasAttribute('data-stable-select'),
      //   dataFieldAttr: actualTarget.getAttribute('data-field'),
      //   allAttributes: Array.from(actualTarget.attributes).map(a => `${a.name}="${a.value}"`).join(', '),
      //   outerHTML: actualTarget.outerHTML?.substring(0, 300)
      // });

      // Pokud data-field není na wrapperu, zkus najít button s data-field uvnitř
      let fieldName = actualTarget.getAttribute('data-field');
      if (!fieldName) {
        const buttonWithField = actualTarget.querySelector('[data-field]');
        if (buttonWithField) {
          fieldName = buttonWithField.getAttribute('data-field');
          // console.log(`🔧 [field] Nenalezen data-field na wrapperu, použit z buttonu:`, fieldName);
        } else {
          fieldName = 'neznámé pole';
        }
      }

      // 🎙️ OZNAČIT SELECT JAKO HLASOVÝ VSTUP HNED NA ZAČÁTKU
      actualTarget.setAttribute('data-voice-input', 'true');
      // console.log(`🎤 [${fieldName}] Nastavuji data-voice-input="true" pro hlasové ovládání`);

      // console.log(`🎤 Zpracovávám hlasový vstup pro SELECT: "${fieldName}" | Text: "${text}"`);

      // Najdi dropdown element - pro StableSelect hledej všude v dokumentu podle position: fixed
      let dropdown = null;

      if (isStableSelect) {
        // Pro StableSelect je dropdown fixed positioned mimo wrapper - musíme hledat globálně
        const allFixedDropdowns = document.querySelectorAll('[style*="position: fixed"]');
        // Najdi dropdown, který je viditelný a obsahuje options
        for (let d of allFixedDropdowns) {
          const hasOptions = Array.from(d.children).some(el =>
            el.tagName === 'DIV' &&
            el.textContent &&
            el.textContent.trim() !== 'Vyhledat...' &&
            el.textContent.trim() !== 'Žádné výsledky'
          );
          if (hasOptions && d.offsetParent !== null) { // offsetParent !== null znamená, že je viditelný
            dropdown = d;
            break;
          }
        }
      } else {
        // Pro CustomSelect hledej v rámci wrapperu
        // 1. Zkus najít podle inline style
        dropdown = actualTarget.querySelector('[style*="position: fixed"]') ||
                   actualTarget.querySelector('div[style*="max-height"]');

        // 2. Pokud nenalezen, zkus najít dropdown podle children (druhý DIV child je obvykle dropdown)
        if (!dropdown) {
          const children = Array.from(actualTarget.children);
          // Dropdown je obvykle DIV (ne LABEL, ne BUTTON)
          const divChildren = children.filter(c => c.tagName === 'DIV');
          // Dropdown obvykle obsahuje více než 1 child (search input + options)
          dropdown = divChildren.find(c => c.children.length > 0);
        }
      }

      // console.log(`🔍 [${fieldName}] Dropdown nalezen:`, !!dropdown, dropdown ? `(${dropdown.children.length} children)` : '(null)');
      // console.log(`🔍 [${fieldName}] Hledám dropdown v:`, actualTarget.tagName, actualTarget.className);
      // console.log(`🔍 [${fieldName}] actualTarget.children.length:`, actualTarget.children.length);
      // if (actualTarget.children.length > 0) {
      //   Array.from(actualTarget.children).forEach((child, idx) => {
      //     console.log(`🔍 [${fieldName}] Child ${idx}:`, {
      //       tag: child.tagName,
      //       style: child.getAttribute('style'),
      //       className: child.className,
      //       hasFixedPosition: child.style?.position === 'fixed' || child.getAttribute('style')?.includes('position: fixed'),
      //       isVisible: child.offsetParent !== null
      //     });
      //   });
      // }

      if (dropdown) {
        // Dropdown je otevřený - najdi search input a vyplň ho HNED
        const searchInput = actualTarget.querySelector('input[type="text"]');
        // console.log(`🔍 [${fieldName}] Search input nalezen:`, !!searchInput);

        if (searchInput) {
          // NEJDŘÍV vyplň search input
          if (searchInput.value !== text) {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              'value'
            ).set;
            nativeInputValueSetter.call(searchInput, text);
            const inputEvent = new Event('input', { bubbles: true });
            searchInput.dispatchEvent(inputEvent);
          }
          searchInput.focus();

          // POČKEJ na React filtrování (100ms by mělo stačit)
          setTimeout(() => {
            // TEĎ kontroluj options PO filtrování
            const dropdownContent = Array.from(dropdown.children).find(c =>
              c.tagName === 'DIV' && c.querySelector('input[type="text"]')
            );

            if (!dropdownContent) {
              return;
            }

            const optionElements = Array.from(dropdownContent.children).filter(el => {
              if (el.tagName !== 'DIV') return false;
              const optText = el.textContent?.trim() || '';
              if (!optText || optText === 'Vyhledat...' || optText === 'Žádné výsledky' || optText === 'Načítání...') return false;
              if (el.querySelector('input[type="text"]')) return false;
              return true;
            });

            // console.log(`🔍 [${fieldName}] Po filtrování nalezeno ${optionElements.length} option elementů`);
            // if (optionElements.length > 0) {
            //   console.log(`🔍 [${fieldName}] První 3 options:`, optionElements.slice(0, 3).map(el => el.textContent.trim()));
            // }

            // 🎙️ KLÍČOVÁ LOGIKA: Pokud je HLASOVÝ VSTUP a jen 1 SHODA → automaticky vyber
            const isVoiceInput = actualTarget.getAttribute('data-voice-input') === 'true';
            // console.log(`🔍 [${fieldName}] isVoiceInput=${isVoiceInput}, count=${optionElements.length}`);

            if (isVoiceInput && optionElements.length === 1) {
              // console.log(`✅ [${fieldName}] HLASOVÝ VSTUP + 1 SHODA → automaticky vybírám:`, optionElements[0].textContent.trim());
              optionElements[0].click();
              actualTarget.removeAttribute('data-voice-input');
            } else if (optionElements.length === 0) {
              // console.log(`⚠️ [${fieldName}] Žádné výsledky po filtrování`);
            } else {
              // console.log(`ℹ️ [${fieldName}] ${isVoiceInput ? 'Hlasový vstup, více shod' : 'Ruční vstup'} (${optionElements.length} výsledků)`);
            }
          }, 100); // Počkat 100ms na React filtrování
        }

        return; // Hotovo
      } else {
        // Dropdown není otevřený - zkusíme vložit text přímo do search inputu
        const searchInput = actualTarget.querySelector('input[type="text"]');

        if (searchInput) {
          // Vlož text přímo do search inputu

          // Nastavit hodnotu
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
          ).set;
          nativeInputValueSetter.call(searchInput, text);

          // Vyvolat input event pro React (to způsobí otevření dropdownu a filtrování)
          const inputEvent = new Event('input', { bubbles: true });
          searchInput.dispatchEvent(inputEvent);

          // Nastavit focus AŽ PO události (důležité pro správné chování)
          searchInput.focus();

          // Počkat na otevření a filtrování dropdownu, pak zkontrolovat similarity
          setTimeout(() => {
            // Zajistit, že focus zůstane na search inputu
            searchInput.focus();
            let dropdown = null;

            if (isStableSelect) {
              // Pro StableSelect hledej globálně
              const allFixedDropdowns = document.querySelectorAll('[style*="position: fixed"]');
              for (let d of allFixedDropdowns) {
                const hasOptions = Array.from(d.children).some(el =>
                  el.tagName === 'DIV' &&
                  el.textContent &&
                  el.textContent.trim() !== 'Vyhledat...' &&
                  el.textContent.trim() !== 'Žádné výsledky'
                );
                if (hasOptions && d.offsetParent !== null) {
                  dropdown = d;
                  break;
                }
              }
            } else {
              // Pro CustomSelect hledej v rámci wrapperu
              dropdown = actualTarget.querySelector('[style*="position: fixed"]') ||
                         actualTarget.querySelector('div[style*="max-height"]');
            }

            if (dropdown) {
              // Najdi filtrované options
              const optionElements = Array.from(dropdown.children).filter(el => {
                if (el.tagName !== 'DIV') return false;
                const optText = el.textContent?.trim() || '';
                if (!optText || optText === 'Vyhledat...' || optText === 'Žádné výsledky' || optText === 'Načítání...') return false;
                if (el.querySelector('input[type="text"]')) return false;
                return true;
              });

              if (optionElements.length > 0) {
                // 🎙️ KLÍČOVÁ LOGIKA: Pokud je HLASOVÝ VSTUP a jen 1 SHODA → automaticky vyber
                const isVoiceInput = actualTarget.getAttribute('data-voice-input') === 'true';
                // console.log(`🔍 [${fieldName}] (delayed) Debug atribut data-voice-input="${actualTarget.getAttribute('data-voice-input')}" (isVoiceInput=${isVoiceInput})`);
                // console.log(`🔍 [${fieldName}] (delayed) Podmínky: isVoiceInput=${isVoiceInput}, optionElements.length=${optionElements.length}`);

                if (isVoiceInput && optionElements.length === 1) {
                  // console.log(`✅ [${fieldName}] (delayed) HLASOVÝ VSTUP + 1 SHODA po filtrování → automaticky vybírám`);
                  // console.log(`🖱️ [${fieldName}] (delayed) Klikám na option:`, optionElements[0].textContent.trim());
                  optionElements[0].click();
                  // Odstranit atribut po použití
                  actualTarget.removeAttribute('data-voice-input');
                  // console.log(`🧹 [${fieldName}] (delayed) Odstraněn atribut data-voice-input`);
                } else {
                  // JINAK: Nech focus na search inputu (pro ruční výběr nebo více shod)
                  // console.log(`ℹ️ [${fieldName}] (delayed) ${isVoiceInput ? 'Hlasový vstup, více shod' : 'Ruční vstup'} (${optionElements.length} výsledků) → ponechávám v search inputu`);
                  searchInput.focus();
                }
              } else {
                // Pokud nejsou žádné výsledky, nech focus na search inputu pro manuální úpravu a korekci
                // console.log(`⚠️ [${fieldName}] Žádné výsledky po filtrování, nechávám search input pro korekci`);
                searchInput.focus();
              }
            }
          }, 300); // Počkat 300ms na React render + filtrování

        } else {
          // Fallback - zkusíme otevřít dropdown kliknutím na button
          const button = actualTarget.querySelector('button[data-field]') || actualTarget.querySelector('[data-field]');
          if (button) {
            button.click();
          }
        }
      }

      return; // Hotovo pro CustomSelect/StableSelect
    }

    // SPECIÁLNÍ HANDLING PRO NATIVE SELECT ELEMENTY
    if (actualTarget && actualTarget.tagName === 'SELECT') {
      let bestOption = null;
      let bestSimilarity = 0;
      const SIMILARITY_THRESHOLD = 90;

      // Najdi option s nejvyšší podobností
      for (let option of actualTarget.options) {
        const optionText = option.text.trim();
        const similarity = calculateSimilarity(text, optionText);

        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestOption = option;
        }
      }

      // console.log(`🎤 SELECT: Nejlepší shoda: ${bestSimilarity}% (práh: ${SIMILARITY_THRESHOLD}%)`);

      if (bestOption && bestSimilarity >= SIMILARITY_THRESHOLD) {
        // 90%+ shoda - automaticky vyber
        const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLSelectElement.prototype,
          'value'
        )?.set;

        if (nativeSelectValueSetter) {
          nativeSelectValueSetter.call(actualTarget, bestOption.value);
        } else {
          actualTarget.value = bestOption.value;
        }

        // Trigger events pro React
        const changeEvent = new Event('change', { bubbles: true, cancelable: false });
        actualTarget.dispatchEvent(changeEvent);

        const inputEvent = new Event('input', { bubbles: true, cancelable: false });
        actualTarget.dispatchEvent(inputEvent);

        // console.log('✅ SELECT: Automaticky vybráno:', bestOption.text, '(value:', bestOption.value, ')');
      } else {
        // Nižší shoda - jen upozornění
        // console.log('⚠️ SELECT: Nízká shoda, hodnota nebyla vybrána. Mluvený text:', text);
      }

      return; // Hotovo pro SELECT
    }

    if (actualTarget && (actualTarget.tagName === 'INPUT' || actualTarget.tagName === 'TEXTAREA')) {
      // Vložit do INPUT/TEXTAREA
      const isEditableInput = !actualTarget.disabled && !actualTarget.readOnly;
      const isValidType = !['password', 'file', 'radio', 'checkbox', 'submit', 'button'].includes(actualTarget.type);

      if (isEditableInput && isValidType) {
        // Vložit na pozici kurzoru (prostý text, bez HTML)
        const cursorPos = actualTarget.selectionStart || 0;
        const textBefore = actualTarget.value.substring(0, cursorPos);
        const textAfter = actualTarget.value.substring(actualTarget.selectionEnd || cursorPos);

        const newValue = textBefore + text + textAfter;

        // Pro React controlled komponenty musíme použít native setter
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value'
        )?.set;

        if (actualTarget.tagName === 'INPUT' && nativeInputValueSetter) {
          nativeInputValueSetter.call(actualTarget, newValue);
        } else if (actualTarget.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
          nativeTextAreaValueSetter.call(actualTarget, newValue);
        } else {
          actualTarget.value = newValue;
        }

        // Posunout kurzor za vložený text
        const newCursorPos = cursorPos + text.length;
        actualTarget.selectionStart = newCursorPos;
        actualTarget.selectionEnd = newCursorPos;

        // Trigger events pro React - KRITICKÉ PRO REACT CONTROLLED KOMPONENTY!
        // Musíme vytvořit event s `bubbles: true` aby se propagoval správně

        // 1. input event - React 17+ používá tento event pro onChange
        try {
          const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: false,
            composed: true,
            data: text,
            inputType: 'insertText'
          });
          actualTarget.dispatchEvent(inputEvent);
        } catch (e) {
          // Fallback pro starší prohlížeče
          const inputEvent = new Event('input', { bubbles: true, cancelable: false });
          actualTarget.dispatchEvent(inputEvent);
        }

        // 2. change event - pro jistotu (některé komponenty to používají)
        const changeEvent = new Event('change', { bubbles: true, cancelable: false });
        actualTarget.dispatchEvent(changeEvent);

        // 3. Focus element - ujisti se, že je aktivní
        actualTarget.focus();

        // console.log('✅ Text vložen do input:', actualTarget.name || actualTarget.id, 'value:', newValue.substring(0, 50) + (newValue.length > 50 ? '...' : ''));
      }
    } else {
      // Vložit do NotesPanel (HTML s možným zvýrazněním)
      // console.log('🎤 Trying to insert to NotesPanel via callback');
      if (onInsertToNotes) {
        onInsertToNotes(highlightedText);
        // console.log('✅ Text vložen do NotesPanel');
      } else {
      }
    }
  }, [keywords, onInsertToNotes]);

  // Spuštění nahrávání
  const startRecording = useCallback((targetElement = null) => {
    if (!recognition) {
      // ❌ NEPOUŽÍVAT alert - nekontrolovat podporu zde (to se vrací v isSupported)
      // Dialog se zobrazí v komponentě která používá tento hook
      return;
    }

    try {
      setCurrentTarget(targetElement);
      accumulatedTextRef.current = '';
      recognition.start();
      setIsRecording(true);
    } catch (error) {
      if (error.message && error.message.includes('already started')) {
        // Už běží, jen zastavit bez opakování
        recognition.stop();
        setIsRecording(false);
      }
    }
  }, [recognition]);

  // Zastavení nahrávání
  const stopRecording = useCallback(() => {
    if (recognition && isRecording) {
      try {
        recognition.stop();
        // console.log('🎤 Recording stopped');
      } catch (error) {
      }
    }
    setIsRecording(false);
    setCurrentTarget(null);
  }, [recognition, isRecording]);

  // Toggle nahrávání
  const toggleRecording = useCallback(() => {
    // ✅ Pokud API není podporováno, zavolej callback pro zobrazení dialogu
    if (!isSupported && onUnsupportedBrowser) {
      onUnsupportedBrowser();
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      // Detekovat aktivní element
      const activeElement = document.activeElement;

      // Zkontrolovat, jestli je to editovatelný input
      if (activeElement &&
          (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        const isEditable = !activeElement.disabled && !activeElement.readOnly;
        const isValidType = !['password', 'file', 'radio', 'checkbox', 'submit', 'button'].includes(activeElement.type);

        if (isEditable && isValidType) {
          // Nahrávat do tohoto inputu
          startRecording(activeElement);
          return;
        }
      }

      // Jinak otevřít NotesPanel a nahrávat tam
      if (onOpenNotesPanel) {
        onOpenNotesPanel();
        // Malé zpoždění pro otevření panelu (React render)
        setTimeout(() => {
          startRecording(null);
        }, 100); // 100ms stačí na render
      } else {
        startRecording(null);
      }
    }
  }, [isRecording, startRecording, stopRecording, onOpenNotesPanel, isSupported, onUnsupportedBrowser]);

  // Globální klávesová zkratka CTRL+Space
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // CTRL+Space (nebo CMD+Space na Mac) - bez Shift
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        toggleRecording();
      }
    };

    // Připojit na document úroveň (nejvyšší priorita)
    document.addEventListener('keydown', handleGlobalKeyDown, true); // capture phase

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [toggleRecording]);

  return {
    isRecording,
    isSupported, // ✅ Vrátit info o podpoře API
    startRecording,
    stopRecording,
    toggleRecording,
    currentTarget
  };
}
