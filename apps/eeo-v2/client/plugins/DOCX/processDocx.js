
import JSZip from "jszip";

// VZOR: pole bez hodnoty zachovat
export async function processDocxVzor({ file, odberatel, dodavatel, dynamicFields }) {
  if (!file) return { xml: "", error: "No file" };
  const zip = new JSZip();
  const content = await file.arrayBuffer();
  const loadedZip = await zip.loadAsync(content);
  let documentXml = await loadedZip.file("word/document.xml").async("string");
  documentXml = documentXml
    .replace(/\{OJMENO\}/g, odberatel?.name || "")
    .replace(/\{OEMAIL\}/g, odberatel?.email || "")
    .replace(/\{OTELEFON\}/g, odberatel?.phone || "")
    .replace(/\{DJMENO\}/g, dodavatel?.name || "")
    .replace(/\{DEMAIL\}/g, dodavatel?.email || "")
    .replace(/\{DTELEFON\}/g, dodavatel?.phone || "");
  try {
    const parser = new window.DOMParser();
    const serializer = new window.XMLSerializer();
    const xmlDoc = parser.parseFromString(documentXml, "application/xml");
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
        for (let j = i; j < runs.length; j++) {
          const r = runs[j];
          for (let k = 0; k < r.childNodes.length; k++) {
            const n = r.childNodes[k];
            if (n.nodeType === 1 && n.localName === "fldChar") {
              const typ = n.getAttribute("w:fldCharType") || n.getAttribute("fldCharType");
              if (typ === "begin") {
                beginIdx = j;
                let foundEnd = false;
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
                const m = /(DOCVARIABLE|MERGEFIELD)\s+([A-Z0-9_ ]{1,})/i.exec(instr.replace(/\s+/g, " "));
                if (m) {
                  fieldName = m[2].replace(/\s+/g, "").toUpperCase();
                }
                break;
              }
            }
          }
          if (beginIdx !== -1) break;
        }
        if (beginIdx !== -1 && endIdx !== -1 && fieldName) {
          let val = "";
          if (dynamicFields && typeof dynamicFields === 'object' && fieldName in dynamicFields) {
            val = dynamicFields[fieldName] || "";
          } else if (fieldName === "OJMENO") val = odberatel?.name || "";
          else if (fieldName === "OEMAIL") val = odberatel?.email || "";
          else if (fieldName === "OTELEFON") val = odberatel?.phone || "";
          else if (fieldName === "DJMENO") val = dodavatel?.name || "";
          else if (fieldName === "DEMAIL") val = dodavatel?.email || "";
          else if (fieldName === "DTELEFON") val = dodavatel?.phone || "";
          // Pokud není hodnota k nahrazení, pole ponech v dokumentu beze změny
          if (!val || val.trim() === "") {
            i = endIdx + 1;
            continue;
          }
          const firstR = runs[beginIdx];
          while (firstR.firstChild) firstR.removeChild(firstR.firstChild);
          const tNew = xmlDoc.createElementNS(firstR.namespaceURI, "w:t");
          tNew.textContent = val;
          firstR.appendChild(tNew);
          for (let del = endIdx; del > beginIdx; del--) {
            node.removeChild(runs[del]);
          }
          runs = Array.from(node.childNodes).filter(n => n.nodeType === 1 && n.localName === "r");
          i = 0;
          continue;
        }
        i++;
      }
      for (let i = 0; i < node.childNodes.length; i++) {
        processNode(node.childNodes[i]);
      }
    }
    processNode(xmlDoc.documentElement);
    documentXml = serializer.serializeToString(xmlDoc);
    loadedZip.file("word/document.xml", documentXml);
    const newDocx = await loadedZip.generateAsync({ type: "blob" });
    return { xml: documentXml, blob: newDocx };
  } catch (e) {
    return { xml: documentXml, error: e.message };
  }
}

// Dynamický: pole bez hodnoty mazat
export async function processDocxDynamic({ file, odberatel, dodavatel, dynamicFields }) {
  if (!file) return { xml: "", error: "No file" };
  const zip = new JSZip();
  const content = await file.arrayBuffer();
  const loadedZip = await zip.loadAsync(content);
  let documentXml = await loadedZip.file("word/document.xml").async("string");
  documentXml = documentXml
    .replace(/\{OJMENO\}/g, odberatel?.name || "")
    .replace(/\{OEMAIL\}/g, odberatel?.email || "")
    .replace(/\{OTELEFON\}/g, odberatel?.phone || "")
    .replace(/\{DJMENO\}/g, dodavatel?.name || "")
    .replace(/\{DEMAIL\}/g, dodavatel?.email || "")
    .replace(/\{DTELEFON\}/g, dodavatel?.phone || "");
  try {
    const parser = new window.DOMParser();
    const serializer = new window.XMLSerializer();
    const xmlDoc = parser.parseFromString(documentXml, "application/xml");
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
        for (let j = i; j < runs.length; j++) {
          const r = runs[j];
          for (let k = 0; k < r.childNodes.length; k++) {
            const n = r.childNodes[k];
            if (n.nodeType === 1 && n.localName === "fldChar") {
              const typ = n.getAttribute("w:fldCharType") || n.getAttribute("fldCharType");
              if (typ === "begin") {
                beginIdx = j;
                let foundEnd = false;
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
                const m = /(DOCVARIABLE|MERGEFIELD)\s+([A-Z0-9_ ]{1,})/i.exec(instr.replace(/\s+/g, " "));
                if (m) {
                  fieldName = m[2].replace(/\s+/g, "").toUpperCase();
                }
                break;
              }
            }
          }
          if (beginIdx !== -1) break;
        }
        if (beginIdx !== -1 && endIdx !== -1 && fieldName) {
          let val = "";
          if (dynamicFields && typeof dynamicFields === 'object' && fieldName in dynamicFields) {
            val = dynamicFields[fieldName] || "";
          } else if (fieldName === "OJMENO") val = odberatel?.name || "";
          else if (fieldName === "OEMAIL") val = odberatel?.email || "";
          else if (fieldName === "OTELEFON") val = odberatel?.phone || "";
          else if (fieldName === "DJMENO") val = dodavatel?.name || "";
          else if (fieldName === "DEMAIL") val = dodavatel?.email || "";
          else if (fieldName === "DTELEFON") val = dodavatel?.phone || "";
          // V dynamickém režimu vždy nahraď mergefield hodnotou (i prázdnou)
          const firstR = runs[beginIdx];
          while (firstR.firstChild) firstR.removeChild(firstR.firstChild);
          const tNew = xmlDoc.createElementNS(firstR.namespaceURI, "w:t");
          tNew.textContent = val;
          firstR.appendChild(tNew);
          for (let del = endIdx; del > beginIdx; del--) {
            node.removeChild(runs[del]);
          }
          runs = Array.from(node.childNodes).filter(n => n.nodeType === 1 && n.localName === "r");
          i = 0;
          continue;
        }
        i++;
      }
      for (let i = 0; i < node.childNodes.length; i++) {
        processNode(node.childNodes[i]);
      }
    }
    processNode(xmlDoc.documentElement);
    documentXml = serializer.serializeToString(xmlDoc);
    loadedZip.file("word/document.xml", documentXml);
    const newDocx = await loadedZip.generateAsync({ type: "blob" });
    return { xml: documentXml, blob: newDocx };
  } catch (e) {
    return { xml: documentXml, error: e.message };
  }
}

// Pro zpětnou kompatibilitu (volání s isVzor)
export async function processDocx(opts) {
  if (opts.isVzor) return processDocxVzor(opts);
  return processDocxDynamic(opts);
}
