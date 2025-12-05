/**
 * DOCX Field Processor - Nahrazení DOCVARIABLE/MERGEFIELD v DOCX
 * Převzato z plugins/src/processDocx.js (odladěná verze)
 * @date 2025-10-21
 */

import JSZip from "jszip";

/**
 * Hlavní funkce pro zpracování DOCX s generickými poli
 * @param {File} file - DOCX soubor k zpracování
 * @param {Object} fieldValues - Mapování názvů polí na hodnoty, např. { "CENA": "150000", "DATUM": "2025-01-01" }
 * @param {Boolean} keepEmptyFields - Pokud true, ponechá pole bez hodnoty nezměněná
 * @returns {Promise<Object>} { blob, xml, stats: { replacedCount, skippedCount, totalFields } }
 */
async function processDocxWithFields({ file, fieldValues = {}, keepEmptyFields = false }) {
  if (!file) return { xml: "", error: "No file provided" };

  try {
    const zip = new JSZip();
    const content = await file.arrayBuffer();
    const loadedZip = await zip.loadAsync(content);
    let documentXml = await loadedZip.file("word/document.xml").async("string");

    const parser = new window.DOMParser();
    const serializer = new window.XMLSerializer();
    const xmlDoc = parser.parseFromString(documentXml, "application/xml");

    let replacedCount = 0;
    let skippedCount = 0;

    function processNode(node) {
      if (!node || !node.childNodes) return;

      let runs = [];
      for (let i = 0; i < node.childNodes.length; i++) {
        const n = node.childNodes[i];
        if (n.nodeType === 1 && n.localName === "r") runs.push(n);
      }

      let i = 0;
      while (i < runs.length) {
        let beginIdx = -1, endIdx = -1, fieldName = null, instr = "";

        // Najdi begin fldChar
        for (let j = i; j < runs.length; j++) {
          const r = runs[j];
          for (let k = 0; k < r.childNodes.length; k++) {
            const n = r.childNodes[k];
            if (n.nodeType === 1 && n.localName === "fldChar") {
              const typ = n.getAttribute("w:fldCharType") || n.getAttribute("fldCharType");
              if (typ === "begin") {
                beginIdx = j;
                let foundEnd = false;

                // Najdi instrText a end fldChar
                for (let m = j + 1; m < runs.length; m++) {
                  const r2 = runs[m];
                  for (let n2 = 0; n2 < r2.childNodes.length; n2++) {
                    const nInstr = r2.childNodes[n2];
                    if (nInstr.nodeType === 1 && nInstr.localName === "instrText") {
                      instr += nInstr.textContent;
                    }
                    if (nInstr.nodeType === 1 && nInstr.localName === "fldChar") {
                      const typ2 = nInstr.getAttribute("w:fldCharType") || nInstr.getAttribute("fldCharType");
                      if (typ2 === "end") {
                        endIdx = m;
                        foundEnd = true;
                        break;
                      }
                    }
                  }
                  if (foundEnd) break;
                }

                // Parsuj název pole z instrText
                // ✅ Rozšířený regex - zachytí i speciální znaky: | . - /
                const m = /(DOCVARIABLE|MERGEFIELD)\s+([A-Z0-9_|.\-/]+)/i.exec(instr.replace(/\s+/g, " "));
                if (m) {
                  // OPRAVENO: Zachovej původní case z šablony místo převodu na UPPERCASE
                  fieldName = m[2].replace(/\s+/g, "");
                }
                break;
              }
            }
          }
          if (beginIdx !== -1) break;
        }

        // Pokud jsme našli field (begin + end + název)
        if (beginIdx !== -1 && endIdx !== -1 && fieldName) {
          // OPRAVENO: Zkus hledat pole jak v původním case, tak v uppercase, tak v lowercase
          let val = fieldValues[fieldName] ||
                   fieldValues[fieldName.toUpperCase()] ||
                   fieldValues[fieldName.toLowerCase()];

          // Debug výpis pouze pro první 3 pole nebo významné problémy
          if (replacedCount + skippedCount < 3 || !val) {
            console.log(`🔍 Zpracovávám pole: "${fieldName}", hodnota: "${val || 'PRÁZDNÉ'}", dostupné varianty:`, {
              original: !!fieldValues[fieldName],
              uppercase: !!fieldValues[fieldName.toUpperCase()],
              lowercase: !!fieldValues[fieldName.toLowerCase()],
              hledaneVarianty: [fieldName, fieldName.toUpperCase(), fieldName.toLowerCase()]
            });
          }

          // Rozhodnutí: nahradit nebo ponechat?
          if (!val || val.trim() === "") {
            if (keepEmptyFields) {
              // Zachovat pole beze změny
              if (replacedCount + skippedCount < 3) {
                console.log(`  ⏭️ Ponechávám prázdné pole: ${fieldName}`);
              }
              skippedCount++;
              i = endIdx + 1;
              continue;
            }
            // Jinak nahradit prázdným stringem
          }

          // Nahraď field hodnotou
          const firstR = runs[beginIdx];
          while (firstR.firstChild) firstR.removeChild(firstR.firstChild);
          const tNew = xmlDoc.createElementNS(firstR.namespaceURI, "w:t");
          tNew.textContent = val || "";
          firstR.appendChild(tNew);

          // Odstraň runs mezi begin a end
          for (let del = endIdx; del > beginIdx; del--) {
            node.removeChild(runs[del]);
          }

          if (replacedCount < 3 || val === "") {
            console.log(`  ✓ Nahrazeno pole: ${fieldName} = "${val || '(prázdné)'}"`);
          }
          replacedCount++;

          // Refresh runs list
          runs = Array.from(node.childNodes).filter(n => n.nodeType === 1 && n.localName === "r");
          i = 0;
          continue;
        }

        i++;
      }

      // Rekurzivně zpracuj potomky
      for (let i = 0; i < node.childNodes.length; i++) {
        processNode(node.childNodes[i]);
      }
    }

    processNode(xmlDoc.documentElement);
    documentXml = serializer.serializeToString(xmlDoc);

    // Ulož zpět do ZIP
    loadedZip.file("word/document.xml", documentXml);
    const newDocx = await loadedZip.generateAsync({ type: "blob" });

    console.log(`✅ DOCX zpracován - FINÁLNÍ STATISTIKY:`, {
      nahrazeno: replacedCount,
      ponechano: skippedCount,
      celkemPoli: Object.keys(fieldValues).length,
      dostupnaData: Object.keys(fieldValues).slice(0, 10),
      uspesnost: `${replacedCount}/${replacedCount + skippedCount} polí`
    });

    return {
      xml: documentXml,
      blob: newDocx,
      stats: { replacedCount, skippedCount, totalFields: Object.keys(fieldValues).length }
    };
  } catch (error) {
    console.error('❌ Chyba při zpracování DOCX:', error);
    return {
      xml: "",
      error: error.message
    };
  }
}

// Export as both named and default for flexibility
export { processDocxWithFields };
export default processDocxWithFields;
