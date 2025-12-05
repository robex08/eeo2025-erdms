// Pomocná funkce pro vyparsování O* a D* polí z document.xml
function extractODFields(xml) {
  if (!xml) return [];
  // Najdi všechny DOCVARIABLE/MERGEFIELD O* a D* v <w:instrText>, včetně těch rozdělených do více <w:instrText>
  // Např. <w:instrText> DOCVARIABLE  </w:instrText><w:instrText>O</w:instrText><w:instrText>EMAIL </w:instrText>
  const results = [];
  if (!xml) return results;
  // Najdi všechny <w:p> bloky
  const pRegex = /<w:p[\s\S]*?<\/w:p>/gi;
  let pMatch;
  while ((pMatch = pRegex.exec(xml))) {
    const pXml = pMatch[0];
    // Najdi všechny <w:instrText> v rámci <w:p>
    const instrRegex = /<w:instrText[^>]*>([\s\S]*?)<\/w:instrText>/gi;
    let instrs = [];
    let im;
    while ((im = instrRegex.exec(pXml))) {
      instrs.push(im[1]);
    }
    if (instrs.length === 0) continue;
    // Slož text všech instrText v <w:p>
    const instrFull = instrs.join("").replace(/\s+/g, " ").trim();
    // Hledej DOCVARIABLE/MERGEFIELD O* a D* (např. DOCVARIABLE OJMENO, DOCVARIABLE O EMAIL, MERGEFIELD DTELEFON)
    const odRegex = /(DOCVARIABLE|MERGEFIELD)\s+([OD][A-Z0-9_ ]{2,})/gi;
    let odMatch;
    while ((odMatch = odRegex.exec(instrFull))) {
      // Název pole může být rozdělený mezerami, např. "O EMAIL" -> "OEMAIL"
      const field = odMatch[2].replace(/\s+/g, "").toUpperCase();
      // Najdi hodnotu v <w:t> mezi posledním instrText a nejbližším fldChar end
      // Najdi pozici posledního instrText v pXml
      let lastInstrIdx = -1;
      let instrCount = 0;
      instrRegex.lastIndex = 0;
      while ((im = instrRegex.exec(pXml))) {
        instrCount++;
        if (instrCount === instrs.length) {
          lastInstrIdx = im.index + im[0].length;
        }
      }
      // Hledej od lastInstrIdx dále <w:fldChar ... w:fldCharType="end"/>
      const after = pXml.slice(lastInstrIdx);
      const endMatch = /<w:fldChar[^>]*w:fldCharType="end"[^>]*\/>/i.exec(after);
      let value = "";
      if (endMatch) {
        const between = after.slice(0, endMatch.index);
        const tMatch = /<w:t[^>]*>([\s\S]*?)<\/w:t>/i.exec(between);
        if (tMatch) value = tMatch[1];
      }
      results.push({ field, value });
    }
  }
  return results;
}

import React, { useState, useRef } from "react";
import { saveAs } from "file-saver";
import PartyForm from "./PartyForm";
import DebugPanel from "./DebugPanel";
import { processDocxVzor } from "./processDocx";

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function formatXml(xml) {
  if (!xml) return "";
  let formatted = '';
  const reg = /(>)(<)(\/*)/g;
  xml = xml.replace(reg, '$1\n$2$3');
  let pad = 0;
  xml.split('\n').forEach((node) => {
    let indent = 0;
    if (node.match(/^<\//)) indent = -1;
    else if (node.match(/^<[^!?][^>]*[^\/]>/)) indent = 1;
    let line = '  '.repeat(pad) + node;
    line = escapeHtml(line);
    line = line.replace(/(&lt;\/?[\w:.-]+)/g, '<span style="color:#82aaff;">$1</span>')
      .replace(/(\s[\w:-]+)=(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;)/g, '<span style="color:#c792ea;">$1</span>=<span style="color:#c3e88d;">$2</span>')
      .replace(/(&gt;)/g, '<span style="color:#82aaff;">$1</span>');
    line = line.replace(/(?<=>)([^<]*?)(JMENO|PRIJMENI)([^<]*?)(?=<|$)/gi, (m) => m.replace(/(JMENO|PRIJMENI)/gi, '<span style="background:#ffb3b3;color:#7c1c1c;font-weight:bold;">$1</span>'));
    formatted += line + '\n';
    pad += indent;
  });
  return formatted;
}
function highlightFields(xml, search) {
  if (!xml) return "";
  let out = xml
    .replace(/(&lt;|<)w:instrText[^>]*&gt;([^<]*?(DOCVARIABLE|MERGEFIELD)[^<]*?)(&lt;|<)\/w:instrText(&gt;|>)/gi, '<span style="background: #ffe066; color: #b36b00; font-weight: bold;">$&</span>')
    .replace(/(\{(JMENO|PRIJMENI)\})/g, '<span style="background: #d0ebff; color: #1864ab; font-weight: bold;">$1</span>');
  if (search && search.length > 0) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "gi");
    out = out.replace(re, (m) => `<span style='background:#ffecb3;color:#b36b00;border-radius:2px;'>${m}</span>`);
  }
  return out;
}

function DocxEditor() {
  const [searchSrc, setSearchSrc] = useState(""); // editovaný text v inputu
  const [searchDst, setSearchDst] = useState("");
  const [activeSearchSrc, setActiveSearchSrc] = useState(""); // skutečně hledaný výraz
  const [activeSearchDst, setActiveSearchDst] = useState("");
  const [file, setFile] = useState(null);
  const [srcXml, setSrcXml] = useState("");
  const [debugXml, setDebugXml] = useState("");
  const [srcFields, setSrcFields] = useState([]);
  const [debugFields, setDebugFields] = useState([]);
  const [odberatel, setOdberatel] = useState({
    name: "Robert Holovský",
    email: "robert.holovsky@zachranka.cz",
    phone: "731 137 077"
  });
  const [dodavatel, setDodavatel] = useState({
    name: "Jan Novák",
    email: "info@novakcompany.cz",
    phone: "777 888 999"
  });
  const fileInputRef = useRef();

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    setFile(f);
    if (f) {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const content = await f.arrayBuffer();
      const loadedZip = await zip.loadAsync(content);
      let documentXml = await loadedZip.file("word/document.xml").async("string");
      setSrcXml(documentXml);
      setSrcFields(extractODFields(documentXml));
      setDebugXml("");
      setDebugFields([]);
    } else {
      setSrcXml("");
      setDebugXml("");
      setSrcFields([]);
      setDebugFields([]);
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    const { xml, blob } = await processDocxVzor({
      file,
      odberatel,
      dodavatel
    });
    setDebugXml(xml);
    setDebugFields(extractODFields(xml));
    if (blob) saveAs(blob, "upraveny_dokument.docx");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Mapování pole -> hodnota, která bude použita při nahrazení
  const fieldValueMap = [
    { field: "OJMENO", value: odberatel?.name || "" },
    { field: "OEMAIL", value: odberatel?.email || "" },
    { field: "OTELEFON", value: odberatel?.phone || "" },
    { field: "DJMENO", value: dodavatel?.name || "" },
    { field: "DEMAIL", value: dodavatel?.email || "" },
    { field: "DTELEFON", value: dodavatel?.phone || "" },
  ];

  return (
    <div>
      <h2>Úprava DOCX na klientovi</h2>
      <div style={{ display: 'flex', gap: 32, marginBottom: 24 }}>
        <PartyForm title="Odběratel" values={odberatel} onChange={setOdberatel} />
        <PartyForm title="Dodavatel" values={dodavatel} onChange={setDodavatel} />
      </div>
      {/* Tlačítko Vybrat šablonu + název souboru vlevo, tlačítko Zpracovat vpravo */}
  <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 24 }}>
        {/* Vlevo: tlačítko + název souboru */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
          <button type="button" onClick={() => fileInputRef.current && fileInputRef.current.click()} style={{ minWidth: 160, background: '#82aaff', color: '#23272e', fontWeight: 600, fontSize: 15, border: 'none', borderRadius: 6, padding: '8px 0', cursor: 'pointer', letterSpacing: 1 }}>
            Vybrat šablonu
          </button>
          <input type="file" accept=".docx" onChange={handleFileChange} ref={fileInputRef} style={{ display: 'none' }} />
          {file ? (
            <span style={{ color: '#fff', fontWeight: 400, display: 'flex', alignItems: 'center', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 13, maxWidth: '100%' }} title={file.name}>
              {file.name}
              <span onClick={() => { setFile(null); setSrcXml(""); setSrcFields([]); setDebugXml(""); setDebugFields([]); if (fileInputRef.current) fileInputRef.current.value = ""; }} style={{ color: '#ff5252', marginLeft: 8, cursor: 'pointer', fontWeight: 900, fontSize: 18 }} title="Zrušit výběr">×</span>
            </span>
          ) : (
            <span style={{ color: '#888', fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
              Šablona nebyla vybrána
            </span>
          )}
        </div>
        {/* Vpravo: tlačítko Zpracovat */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            type="button"
            style={{ background: '#b2ff59', color: '#23272e', fontWeight: 700, fontSize: 15, border: 'none', borderRadius: 4, padding: '8px 22px', cursor: 'pointer', boxShadow: '0 2px 8px #0002' }}
            onClick={handleProcess}
          >
            Zpracovat a stáhnout
          </button>
        </div>
      </div>
      <div style={{ width: '90vw', maxWidth: 'none', position: 'relative', left: '50%', right: '50%', marginLeft: '-45vw', marginRight: '-45vw', textAlign: 'left', marginTop: 32 }}>
        {/* layout dvou sloupců */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 8 }}>
          <div style={{ width: '45vw', minWidth: 0 }}>
            <div style={{ color: '#b2ff59', fontWeight: 600, fontSize: 18, marginBottom: 4 }}>Zdrojový document.xml</div>
          </div>
          <div style={{ width: '45vw', minWidth: 0 }}>
            <div style={{ color: '#b2ff59', fontWeight: 600, fontSize: 18, marginBottom: 4 }}>Zpracovaný document.xml</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {/* Levý sloupec: zdroj */}
          <div style={{ width: '45vw', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: '#181a20', color: '#c3e88d', fontSize: 13, padding: '8px 16px', borderRadius: 4, marginBottom: 8, fontFamily: 'Fira Mono,Consolas,monospace', height: 90, maxHeight: 120, overflowY: 'auto' }}>
              <b>Pole v šabloně:</b>
              {srcFields.length === 0 ? <div style={{ color: '#888', marginTop: 4 }}>Žádná pole nenalezena</div> :
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {srcFields.map(({ field, value }, i) => <li key={i}>{field} <span style={{ color: '#82aaff' }}>{value}</span></li>)}
                </ul>
              }
            </div>
            <div style={{ position: 'relative', width: '100%', marginBottom: 8 }}>
              <input
                type="text"
                value={searchSrc}
                onChange={e => setSearchSrc(e.target.value)}
                // onKeyDown={e => { if (e.key === 'Enter') setActiveSearchSrc(searchSrc); }}
                placeholder="Vyhledat ve zdrojovém XML"
                style={{ width: '100%', boxSizing: 'border-box', fontSize: 15, padding: '8px 36px 8px 12px', borderRadius: 4, border: '1px solid #333', background: '#23272e', color: '#fff', outline: 'none' }}
              />
              <span
                onClick={() => setActiveSearchSrc(searchSrc)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#b2ff59', fontSize: 18 }}
                title="Vyhledat"
              >
                🔍
              </span>
            </div>
            <div style={{ flex: 1, minHeight: 200, width: '100%', padding: 0, margin: 0 }}>
              <DebugPanel
                key={activeSearchSrc}
                title=""
                xml={highlightFields(formatXml(srcXml), activeSearchSrc)}
                style={{ width: '100%', padding: 0, margin: 0 }}
                search={activeSearchSrc}
              />
            </div>
          </div>
          {/* Pravý sloupec: výstup */}
          <div style={{ width: '45vw', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: '#181a20', color: '#c3e88d', fontSize: 13, padding: '8px 16px', borderRadius: 4, marginBottom: 8, fontFamily: 'Fira Mono,Consolas,monospace', height: 90, maxHeight: 120, overflowY: 'auto' }}>
              <b>Mapovaná pole:</b>
              {!debugXml ? (
                <div style={{ color: '#888', marginTop: 4 }}>Nejsou mapována žádná pole</div>
              ) : (
                fieldValueMap.every(({ value }) => !value) ? (
                  <div style={{ color: '#888', marginTop: 4 }}>Zatím není co mapovat</div>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {fieldValueMap.filter(({ value }) => value).map(({ field, value }, i) => (
                      <li key={i}>{field} <span style={{ color: '#82aaff' }}>{value}</span></li>
                    ))}
                  </ul>
                )
              )}
            </div>
            <div style={{ position: 'relative', width: '100%', marginBottom: 8 }}>
              <input
                type="text"
                value={searchDst}
                onChange={e => setSearchDst(e.target.value)}
                // onKeyDown={e => { if (e.key === 'Enter') setActiveSearchDst(searchDst); }}
                placeholder="Vyhledat ve výstupním XML"
                style={{ width: '100%', boxSizing: 'border-box', fontSize: 15, padding: '8px 36px 8px 12px', borderRadius: 4, border: '1px solid #333', background: '#23272e', color: '#fff', outline: 'none' }}
              />
              <span
                onClick={() => setActiveSearchDst(searchDst)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#b2ff59', fontSize: 18 }}
                title="Vyhledat"
              >
                🔍
              </span>
            </div>
            <div style={{ flex: 1, minHeight: 200, width: '100%', padding: 0, margin: 0 }}>
              <DebugPanel
                key={activeSearchDst}
                title=""
                xml={highlightFields(formatXml(debugXml), activeSearchDst)}
                style={{ width: '100%', padding: 0, margin: 0 }}
                search={activeSearchDst}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocxEditor;
