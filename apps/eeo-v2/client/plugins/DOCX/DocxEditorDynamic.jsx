// Pomocná funkce pro generování náhodných hodnot podle názvu pole
function getRandomValueForField(field) {
	if (/EMAIL/i.test(field)) return field.toLowerCase() + '_hodnota@domena.cz';
	if (/TELEFON/i.test(field)) return '+420 777 123 456';
	if (/JMENO/i.test(field)) return field.startsWith('O') ? 'Jan Odběratel' : 'Petr Dodavatel';
	if (/NAZEV/i.test(field)) return 'Název společnosti s.r.o.';
	if (/ADRESA/i.test(field)) return 'Ulice 123, Město';
	if (/ICO/i.test(field)) return '12345678';
	if (/DIC/i.test(field)) return 'CZ12345678';
	if (/CISLO/i.test(field)) return 'EV-2025-001';
	if (/PREDMET/i.test(field)) return 'Dodávka služeb';
	if (/CENA_BEZDPH/i.test(field)) return '10000';
	if (/DPH/i.test(field)) return '2500';
	if (/CENA_SDPH/i.test(field)) return '12500';
	if (/DODANI_TERMIN/i.test(field)) return '31.12.2025';
	if (/DODANI_MISTO/i.test(field)) return 'Sklad Praha';
	if (/PODEPSANO_KDE/i.test(field)) return 'Praha';
	if (/DATUM_PODPISU/i.test(field)) return '7.9.2025';
	return field + '_hodnota';
}
// Mapování CSV -> DOCX pole
const csvToDocxMap = [
	{ csv: 'evidencni_c', docx: 'EVIDENCNI_CISLO' },
	{ csv: 'partner_nazev', docx: 'DNAZEV' },
	{ csv: 'partner_adresa', docx: 'DADRESA' },
	{ csv: 'partner_jmeno', docx: 'DJMENO' },
	{ csv: 'pridal', docx: 'OJMENO' },
	{ csv: 'partner_ic', docx: 'DICO' },
	{ csv: 'partner_dic', docx: 'DDIC' },
	{ csv: 'obsah', docx: 'PREDMET_OBJ' },
	{ csv: 'cena', docx: 'CENA_BEZDPH' },
	{ csv: 'cena_DPH', docx: 'CENA_SDPH' },
	// DPH a PODEPSANO_KDE nejsou v CSV, řešíme níže
	{ csv: 'datum_p', docx: 'DATUM_PODPISU' },
];

// Funkce pro převod jednoho CSV řádku na objekt pro formulář
function mapCsvRowToDocx(row) {
       const result = {};
       // Všechny klíče z CSV převedeme na malá písmena pro lookup
       const rowLower = {};
       Object.keys(row).forEach(k => { rowLower[k.toLowerCase()] = row[k]; });
       csvToDocxMap.forEach(({ csv, docx }) => {
	       const csvKey = csv.toLowerCase();
	       const docxKey = docx.toUpperCase();
	       if (rowLower[csvKey] !== undefined) {
		       let value = rowLower[csvKey];
		       if (docxKey === 'DATUM_PODPISU') {
			       // převod data yyyy-mm-dd na dd.mm.yyyy
			       const d = value?.split('-');
			       if (d && d.length === 3) {
				       value = `${d[2]}.${d[1]}.${d[0]}`;
			       }
		       }
		       // Formátování cen a DPH
		       if (docxKey.includes('CENA') || docxKey.includes('DPH')) {
			       let num = Number(String(value).replace(/\s/g, '').replace(/,/g, '.'));
			       if (!isNaN(num)) {
				       value = num.toLocaleString('cs-CZ') + ' Kč';
			       }
		       }
		       result[docxKey] = value;
	       }
       });
       // DPH = CENA_BEZDPH * 0.21, zaokrouhleno nahoru
       if (rowLower['cena']) {
	       let cena = Number(rowLower['cena'].replace(/\s/g, '').replace(/,/g, '.'));
	       if (!isNaN(cena)) {
		       let dph = Math.ceil(cena * 0.21);
		       result['DPH'] = dph.toLocaleString('cs-CZ') + ' Kč';
	       }
       }
       // PODEPSANO_KDE = 'Kladno'
       result['PODEPSANO_KDE'] = 'Kladně';
       return result;
}
	// ...existing code...
		// mapCsvRowToDocx lze použít pro převod vybraného řádku CSV na objekt pro formulář/DOCX
import React, { useState, useRef, useMemo, useEffect } from "react";
// Pomocná funkce pro normalizaci textu (bez diakritiky, lower case)
function normalize(str) {
	return (str || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();
}

import { saveAs } from "file-saver";
import DebugPanel from "./DebugPanel";
import { processDocxDynamic } from "./processDocx";

// Pomocná funkce pro vyparsování všech DOCVARIABLE/MERGEFIELD bez prefixu O/D
function extractDynamicFields(xml) {
	if (!xml) return [];
	const results = [];
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
			// Najdi všechny výskyty DOCVARIABLE/MERGEFIELD a jejich argumenty, i pokud jsou za sebou
			// Např. "DOCVARIABLE PODEPSANO_KDE DOCVARIABLE DATUM_PODPISU"
			const allMatches = [];
			const multiRegex = /(DOCVARIABLE|MERGEFIELD)\s+([A-Z0-9_]+)/gi;
			let m;
			while ((m = multiRegex.exec(instrFull))) {
				allMatches.push({
					type: m[1],
					field: m[2].replace(/\s+/g, "").toUpperCase(),
					index: m.index
				});
			}
			for (let i = 0; i < allMatches.length; i++) {
				const { field } = allMatches[i];
				// Najdi hodnotu v <w:t> mezi posledním instrText a nejbližším fldChar end
				let lastInstrIdx = -1;
				let instrCount = 0;
				instrRegex.lastIndex = 0;
				while ((im = instrRegex.exec(pXml))) {
					instrCount++;
					if (instrCount === instrs.length) {
						lastInstrIdx = im.index + im[0].length;
					}
				}
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
		formatted += line + '\n';
		pad += indent;
	});
	return formatted;
}
function highlightFields(xml, search) {
	if (!xml) return "";
	let out = xml
		.replace(/(&lt;|<)w:instrText[^>]*&gt;([^<]*?(DOCVARIABLE|MERGEFIELD)[^<]*?)(&lt;|<)\/w:instrText(&gt;|>)/gi, '<span style="background: #ffe066; color: #b36b00; font-weight: bold;">$&</span>');
	if (search && search.length > 0) {
		const re = new RegExp(search.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), "gi");
		out = out.replace(re, (m) => `<span style='background:#ffecb3;color:#b36b00;border-radius:2px;'>${m}</span>`);
	}
	return out;
}


export default function DocxEditorDynamic() {
	// === STATE HOOKS ===
	const [batchProgress, setBatchProgress] = useState({ running: false, current: 0, total: 0, done: false, error: null });
	const [csvRows, setCsvRows] = useState([]);
	const [csvSelected, setCsvSelected] = useState([]);
	const [csvHeaders, setCsvHeaders] = useState([]);
	const [csvName, setCsvName] = useState("");
	const csvInputRef = useRef();
	const [fields, setFields] = useState([]); // dynamická pole
	const [fieldValues, setFieldValues] = useState({});
	// Fulltext filter state
	const [csvFilter, setCsvFilter] = useState("");

	// Pomocná funkce pro normalizaci textu (bez diakritiky, lower case)
	function normalize(str) {
		return (str || "")
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase();
	}

	// Filtrované řádky (indexy v csvRows)
	const filteredRowIdxs = useMemo(() =>
		csvRows
			.map((row, idx) => ({ row, idx }))
			.filter(({ row }) => {
				if (!csvFilter) return true;
				const normFilter = normalize(csvFilter);
				return csvHeaders.some(h => normalize(row[h]).includes(normFilter));
			})
			.map(({ idx }) => idx),
		[csvRows, csvHeaders, csvFilter]
	);

	// Checkbox v záhlaví: true pokud jsou všechny viditelné vybrané, false pokud žádný, indeterminate pokud část
	const visibleSelectedCount = filteredRowIdxs.filter(idx => csvSelected.includes(idx)).length;
	const allVisibleSelected = filteredRowIdxs.length > 0 && visibleSelectedCount === filteredRowIdxs.length;
	const someVisibleSelected = visibleSelectedCount > 0 && visibleSelectedCount < filteredRowIdxs.length;

	// Handler pro záhlaví checkboxu: označí/odznačí pouze viditelné (filtrované) řádky
	const toggleVisible = () => {
		setCsvSelected(sel => {
			const selSet = new Set(sel);
			if (allVisibleSelected) {
				// Odznačit všechny viditelné
				filteredRowIdxs.forEach(idx => selSet.delete(idx));
			} else {
				// Označit všechny viditelné
				filteredRowIdxs.forEach(idx => selSet.add(idx));
			}
			return Array.from(selSet);
		});
	};
	const [docxName, setDocxName] = useState("");
	const [file, setFile] = useState(null);
	const [srcXml, setSrcXml] = useState("");
	const [debugXml, setDebugXml] = useState("");
	const [searchSrc, setSearchSrc] = useState("");

	// Clear DOCX selection
	const handleClearDocx = () => {
		setDocxName("");
		setFile(null);
		setSrcXml("");
		setFields([]);
		setFieldValues({});
		setDebugXml("");
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	// Funkce pro načtení a zpracování CSV
	function parseCsv(text) {
		const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
		if (lines.length === 0) return { headers: [], rows: [] };
		const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''));
		const rows = lines.slice(1).map(line => {
			const cols = line.split(';');
			const obj = {};
			headers.forEach((h, i) => {
				let val = (cols[i] || '').trim();
				if (val.length >= 2 && val[0] === '"' && val[val.length-1] === '"') {
					val = val.slice(1, -1);
				} else if (val === '"') {
					val = '';
				}
				obj[h] = val;
			});
			return obj;
		});
		return { headers, rows };
	}

	const handleCsvChange = (e) => {
		const f = e.target.files[0];
		setCsvName(f ? f.name : "");
		if (!f) return;
		const reader = new FileReader();
		reader.onload = ev => {
			const { headers, rows } = parseCsv(ev.target.result);
			setCsvHeaders(headers);
			setCsvRows(rows);
			setCsvSelected([]);
		};
		reader.readAsText(f, 'utf-8');
	};

	const handleClearCsv = () => {
		setCsvName("");
		setCsvRows([]);
		setCsvHeaders([]);
		setCsvSelected([]);
		if (csvInputRef.current) csvInputRef.current.value = "";
	};

	// Checkbox logika
	const allSelected = csvRows.length > 0 && csvSelected.length === csvRows.length;
	const toggleAll = () => setCsvSelected(allSelected ? [] : csvRows.map((_, i) => i));
	const toggleRow = idx => setCsvSelected(sel => sel.includes(idx) ? sel.filter(i => i !== idx) : [...sel, idx]);
	// === VŠECHNY HOOKY MUSÍ BÝT NA ZAČÁTKU ===

	// Funkce pro zpracování vybraných položek do DOCX šablony
	async function handleProcessSelectedToDocx() {
	       if (!file || !csvRows.length || !csvSelected.length) return;
	       setBatchProgress({ running: true, current: 0, total: csvSelected.length, done: false, error: null });
	       let dirHandle = null;
	       if (window.showDirectoryPicker) {
		       try {
			       dirHandle = await window.showDirectoryPicker();
		       } catch (e) {
			       setBatchProgress({ running: false, current: 0, total: 0, done: false, error: 'Výběr adresáře byl zrušen.' });
			       return;
		       }
	       } else {
		       setBatchProgress({ running: true, current: 0, total: csvSelected.length, done: false, error: 'Váš prohlížeč nepodporuje výběr adresáře (File System Access API). Soubor(y) budou staženy standardně.' });
	       }
	       let error = null;
	       for (let i = 0; i < csvSelected.length; i++) {
		       const idx = csvSelected[i];
		       const row = csvRows[idx];
		       const data = mapCsvRowToDocx(row);
		       let fileName = (row['EVC'] || row['evc']) ? String(row['EVC'] || row['evc']) + '.docx' : 'objednavka.docx';
		       // Rozpoznání VZOR dokumentu podle názvu souboru
		       const isVzor = fileName.toLowerCase().includes('vzor');
		       try {
								 const { blob: docxBlob } = isVzor
									 ? await import("./processDocx").then(m => m.processDocxVzor({ file, dynamicFields: data }))
									 : await processDocxDynamic({ file, dynamicFields: data });
			       if (dirHandle) {
				       const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
				       const writable = await fileHandle.createWritable();
				       await writable.write({ type: 'write', data: docxBlob });
				       await writable.close();
			       } else {
				       saveAs(docxBlob, fileName);
			       }
		       } catch (e) {
			       error = 'Chyba při generování objednávky: ' + fileName + '\n' + e.message;
			       break;
		       }
		       setBatchProgress({ running: true, current: i + 1, total: csvSelected.length, done: false, error: null });
	       }
	       setBatchProgress({ running: false, current: csvSelected.length, total: csvSelected.length, done: !error, error });
	}

	// ...existing code...
	// JSX blok s tabulkou CSV musí být uvnitř return (...)
					{csvSelected.length > 0 && (
						<div style={{ margin: '16px 0 0 0', display: 'flex', justifyContent: 'flex-end' }}>
							<button
								type="button"
								style={{ background: '#b2ff59', color: '#23272e', fontWeight: 700, fontSize: 15, border: 'none', borderRadius: 4, padding: '8px 22px', cursor: 'pointer', boxShadow: '0 2px 8px #0002' }}
								onClick={handleProcessSelectedToDocx}
							>
								Zpracovat vybrané položky do DOCX šablony
							</button>
						</div>
					)}
					// ...

	const [activeSearchSrc, setActiveSearchSrc] = useState("");
	const [searchDst, setSearchDst] = useState("");
	const [activeSearchDst, setActiveSearchDst] = useState("");
	const fileInputRef = useRef();

	// Unikátní pole pro generování vstupů (duplicitní názvy jen jednou)
	const uniqueFields = useMemo(() => {
		const seen = new Set();
		return fields.filter(({ field }) => {
			if (seen.has(field)) return false;
			seen.add(field);
			return true;
		});
	}, [fields]);

	// Synchronizace fieldValues s fields (při změně fields přidat chybějící klíče)
	useEffect(() => {
		setFieldValues(prev => {
			const newVals = { ...prev };
			fields.forEach(({ field }) => {
				if (!(field in newVals)) newVals[field] = "";
			});
			// Odstranit klíče, které už ve fields nejsou
			Object.keys(newVals).forEach(f => {
				if (!fields.find(ff => ff.field === f)) delete newVals[f];
			});
			return newVals;
		});
	}, [fields]);

	// Funkce pro naplnění všech polí náhodnými hodnotami
	const handleFillRandom = () => {
		const newVals = {};
		fields.forEach(({ field }) => {
			newVals[field] = getRandomValueForField(field);
		});
		setFieldValues(newVals);
	};

	// Memoizace formátovaného XML pro debug okna
	const formattedSrcXml = useMemo(() => formatXml(srcXml), [srcXml]);
	const formattedDebugXml = useMemo(() => formatXml(debugXml), [debugXml]);
	const highlightedSrcXml = useMemo(() => highlightFields(formattedSrcXml, activeSearchSrc), [formattedSrcXml, activeSearchSrc]);
	const highlightedDebugXml = useMemo(() => highlightFields(formattedDebugXml, activeSearchDst), [formattedDebugXml, activeSearchDst]);

	const handleFileChange = async (e) => {
		const f = e.target.files[0];
		setFile(f);
		setDocxName(f ? f.name : "");
		if (f) {
			const JSZip = (await import("jszip")).default;
			const zip = new JSZip();
			const content = await f.arrayBuffer();
			const loadedZip = await zip.loadAsync(content);
			let documentXml = await loadedZip.file("word/document.xml").async("string");
			setSrcXml(documentXml);
			const dynFields = extractDynamicFields(documentXml);
			setFields(dynFields);
			// předvyplň hodnoty z XML pokud existují
			const initialValues = {};
			dynFields.forEach(({ field, value }) => {
				initialValues[field] = value || "";
			});
			setFieldValues(initialValues);
			setDebugXml("");
		} else {
			setSrcXml("");
			setFields([]);
			setFieldValues({});
			setDebugXml("");
		}
	};

	const handleFieldChange = (field, value) => {
		setFieldValues((prev) => ({ ...prev, [field]: value }));
	};

	const handleProcess = async () => {
	       if (!file) return;
	       // Rozpoznání VZOR dokumentu podle názvu souboru
	       const isVzor = docxName && docxName.toLowerCase().includes('vzor');
	       const { xml, blob } = await processDocx({
		       file,
		       dynamicFields: fieldValues,
		       isVzor
	       });
	       setDebugXml(xml);
	       if (blob) saveAs(blob, "upraveny_dokument.docx");
	       // Nečisti file ani fileInputRef, aby šlo dokument zpracovat opakovaně a zůstal vybraný
	};

       return (
	       <div>
		       {/* Notifikační dialog pro hromadné generování */}
		       {batchProgress.running && (
			       <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', background: '#23272e', color: '#b2ff59', zIndex: 9999, padding: 12, textAlign: 'center', fontWeight: 600, fontSize: 17, boxShadow: '0 2px 8px #0006' }}>
				       Generování objednávek: {batchProgress.current} / {batchProgress.total}
				       <div style={{ width: 320, margin: '8px auto 0 auto', background: '#181a20', borderRadius: 4, height: 10, overflow: 'hidden', border: '1px solid #333' }}>
					       <div style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%`, height: '100%', background: '#b2ff59', transition: 'width 0.2s' }} />
				       </div>
				       {batchProgress.error && <div style={{ color: '#ff5252', marginTop: 8 }}>{batchProgress.error}</div>}
			       </div>
		       )}
			   {batchProgress.done && (
				   <div
					   style={{ position: 'fixed', top: 0, left: 0, width: '100vw', background: '#23272e', color: '#b2ff59', zIndex: 9999, padding: 12, textAlign: 'center', fontWeight: 600, fontSize: 17, boxShadow: '0 2px 8px #0006', cursor: 'pointer' }}
					   onClick={() => setBatchProgress({ running: false, current: 0, total: 0, done: false, error: null })}
				   >
					   <span style={{ pointerEvents: 'none' }}>Všechny vybrané objednávky byly vygenerovány.</span>
					   <span
						   style={{ marginLeft: 24, color: '#fff', cursor: 'pointer', fontWeight: 400, fontSize: 18, pointerEvents: 'auto' }}
						   onClick={e => { e.stopPropagation(); setBatchProgress({ running: false, current: 0, total: 0, done: false, error: null }); }}
					   >[Zavřít]</span>
				   </div>
			   )}
			<h2>Dynamický editor DOCX</h2>
			   <div style={{ marginBottom: 12, display: 'flex', gap: 32, alignItems: 'center', maxWidth: 520, flexDirection: 'row' }}>
				   <button type="button" onClick={() => fileInputRef.current && fileInputRef.current.click()} style={{ minWidth: 160, background: '#82aaff', color: '#23272e', fontWeight: 600, fontSize: 15, border: 'none', borderRadius: 6, padding: '8px 0', cursor: 'pointer', letterSpacing: 1 }}>
					   Vybrat šablonu
				   </button>
				   <input type="file" accept=".docx" onChange={handleFileChange} ref={fileInputRef} style={{ display: 'none' }} />
				   <div style={{ color: '#b2ff59', fontWeight: 500, fontSize: 15, minWidth: 220, whiteSpace: 'nowrap', paddingLeft: 16, display: 'flex', alignItems: 'center' }}>
					   Vyber šablonu pro naplnění (DOCX):
					   {docxName && (
						   <span style={{ color: '#fff', marginLeft: 10, fontWeight: 400, display: 'flex', alignItems: 'center' }} title={docxName}>
							   : {docxName}
							   <span onClick={handleClearDocx} style={{ color: '#ff5252', marginLeft: 8, cursor: 'pointer', fontWeight: 900, fontSize: 18 }} title="Zrušit výběr">×</span>
						   </span>
					   )}
				   </div>
			   </div>
			<div style={{ marginBottom: 24, display: 'flex', gap: 32, alignItems: 'center', maxWidth: 520, flexDirection: 'row' }}>
				<button type="button" onClick={() => csvInputRef.current && csvInputRef.current.click()} style={{ minWidth: 160, background: '#82aaff', color: '#23272e', fontWeight: 600, fontSize: 15, border: 'none', borderRadius: 6, padding: '8px 0', cursor: 'pointer', letterSpacing: 1 }}>
					Vybrat CSV
				</button>
				<input type="file" accept=".csv" onChange={handleCsvChange} ref={csvInputRef} style={{ display: 'none' }} />
				<div style={{ color: '#b2ff59', fontWeight: 500, fontSize: 15, minWidth: 220, whiteSpace: 'nowrap', paddingLeft: 16, display: 'flex', alignItems: 'center' }}>
					Vyber soubor pro import (CSV):
					{csvName && (
						<span style={{ color: '#fff', marginLeft: 10, fontWeight: 400, display: 'flex', alignItems: 'center' }} title={csvName}>
							: {csvName}
							<span onClick={handleClearCsv} style={{ color: '#ff5252', marginLeft: 8, cursor: 'pointer', fontWeight: 900, fontSize: 18 }} title="Zrušit výběr">×</span>
						</span>
					)}
				</div>
			</div>

	       {/* Tabulka s CSV */}
	       {csvRows.length > 0 && (
		       <div style={{ background: '#23272e', borderRadius: 6, marginBottom: 24, padding: 12, maxWidth: 'none', minWidth: 0, overflowX: 'auto' }}>
			       <div style={{ fontWeight: 600, color: '#b2ff59', marginBottom: 8 }}>
				       CSV data (vyberte řádky pro import):
				       <span style={{ color: '#82aaff', fontWeight: 400, marginLeft: 12 }}>[Vybráno: {csvSelected.length} / {csvRows.length}]</span>
			       </div>
			       {/* Fulltext filter */}
			       <div style={{ width: '100%', margin: '12px 0 18px 0', display: 'flex', alignItems: 'center', position: 'relative' }}>
				       <input
					       type="text"
					       value={csvFilter}
					       onChange={e => setCsvFilter(e.target.value)}
					       placeholder="Rychlé vyhledávání ve všech sloupcích..."
					       style={{ width: '100%', fontSize: 16, padding: '10px 38px 10px 14px', borderRadius: 5, border: '1.5px solid #82aaff', background: '#181a20', color: '#fff', outline: 'none', fontWeight: 500, boxSizing: 'border-box' }}
					       autoComplete="off"
				       />
				       {csvFilter && (
					       <span
						       onClick={() => setCsvFilter("")}
						       style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#ff5252', fontSize: 22, cursor: 'pointer', fontWeight: 900 }}
						       title="Smazat filtr"
					       >×</span>
				       )}
			       </div>
			       <div style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid #333', borderRadius: 4, minWidth: 0, overflowX: 'auto' }}>
				       <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, tableLayout: 'auto', minWidth: 0 }}>
					       <thead style={{ position: 'sticky', top: 0, background: '#263238', zIndex: 3 }}>
						       <tr>
						       <th style={{ padding: '6px 8px', borderBottom: '2px solid #82aaff', background: '#263238', position: 'sticky', left: 0, zIndex: 4, whiteSpace: 'nowrap' }}>
							       <input
								       type="checkbox"
								       ref={el => {
									       if (el) el.indeterminate = someVisibleSelected;
								       }}
								       checked={allVisibleSelected}
								       onChange={toggleVisible}
							       />
						       </th>
							       {csvHeaders.map((h, i) => (
								       <th key={h + i} style={{ padding: '6px 12px', borderBottom: '2px solid #82aaff', color: '#b2ff59', background: '#263238', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
							       ))}
						       </tr>
					       </thead>
			       <tbody>
				   {filteredRowIdxs.map(idx => {
					   const row = csvRows[idx];
					   return (
						   <tr key={idx} style={{ background: csvSelected.includes(idx) ? '#37474f' : (idx % 2 === 0 ? '#23272e' : '#1a1d22') }}>
							   <td style={{ padding: '4px 8px', textAlign: 'center', background: '#263238', position: 'sticky', left: 0, zIndex: 2, whiteSpace: 'nowrap' }}>
								   <input type="checkbox" checked={csvSelected.includes(idx)} onChange={() => toggleRow(idx)} />
							   </td>
							   {csvHeaders.map((h, i) => {
								   // Zarovnání podle názvu sloupce
								   let align = 'left';
								   const lower = h.toLowerCase();
								   let value = row[h];
								   if (lower === 'id' || lower === 'garant' || value?.toLowerCase() === 'ano' || value?.toLowerCase() === 'ne') {
									   align = 'center';
								   } else if (lower.startsWith('cena')) {
									   align = 'right';
									   // Formátování čísla s oddělením tisíců a Kč
									   if (value && !isNaN(Number(value.replace(/\s/g, '').replace(/,/g, '.')))) {
										   let num = Number(value.replace(/\s/g, '').replace(/,/g, '.'));
										   value = num.toLocaleString('cs-CZ') + ' Kč';
									   }
								   }
								   return (
									   <td key={h + i} style={{ padding: '4px 12px', borderBottom: '1px solid #333', color: '#fff', whiteSpace: 'nowrap', textAlign: align }}>{value}</td>
								   );
							   })}
						   </tr>
					   );
				   })}
					       </tbody>
				       </table>
				       {csvRows.length > 10 && (
					       <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
						       ...další řádky nejsou zobrazeny, rolujte pro více
					       </div>
				       )}
			       </div>
			       {/* Tlačítko pro hromadné zpracování vybraných položek */}
			       {csvSelected.length > 0 && (
				       <div style={{ margin: '16px 0 0 0', display: 'flex', justifyContent: 'flex-end' }}>
					       <button
						       type="button"
						       style={{ background: '#b2ff59', color: '#23272e', fontWeight: 700, fontSize: 15, border: 'none', borderRadius: 4, padding: '8px 22px', cursor: 'pointer', boxShadow: '0 2px 8px #0002' }}
						       onClick={handleProcessSelectedToDocx}
					       >
						       Zpracovat vybrané položky do DOCX šablony
					       </button>
				       </div>
			       )}
		       </div>
	       )}
									{!srcXml ? (
										<div style={{ background: '#181a20', color: '#888', fontSize: 18, padding: '24px 16px', borderRadius: 4, marginBottom: 24, fontFamily: 'Fira Mono,Consolas,monospace', minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
											Nejsou definované vstupní a výstupní pole a hodnoty. Nahrajte šablonu DOCX.
										</div>
									) : csvRows.length > 0 ? null : (
										<div style={{ background: '#181a20', color: '#c3e88d', fontSize: 15, padding: '24px 16px', borderRadius: 4, marginBottom: 24, fontFamily: 'Fira Mono,Consolas,monospace', minHeight: 60 }}>
											<form style={{ display: 'flex', flexDirection: 'column', gap: 16 }} onSubmit={e => { e.preventDefault(); handleProcess(); }}>
																		<div style={{
																			display: 'grid',
																			gridTemplateColumns: '1fr 1fr',
																			gap: 18,
																			marginBottom: 8
																		}}>
																			{uniqueFields.length === 0 ? null : (
																				uniqueFields.map(({ field }, i) => (
																					<div key={field} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
																						<label style={{ color: '#b2ff59', fontWeight: 600, minWidth: 110, fontSize: 16 }}>{field}:</label>
																						<input
																							type="text"
																							value={fieldValues[field] || ""}
																							onChange={e => handleFieldChange(field, e.target.value)}
																							style={{ flex: '1 1 180px', fontSize: 16, padding: '8px 12px', borderRadius: 4, border: '1.5px solid #82aaff', background: '#23272e', color: '#fff', outline: 'none', fontWeight: 500 }}
																						/>
																					</div>
																				))
																			)}
																		</div>
																					<div style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: 24, marginTop: 24 }}>
																						<button type="submit" style={{ minWidth: 240, background: '#b2ff59', color: '#23272e', fontWeight: 700, fontSize: 18, border: 'none', borderRadius: 6, boxShadow: '0 2px 8px #0002', padding: '12px 0', cursor: 'pointer', letterSpacing: 1 }}>Zpracovat a stáhnout</button>
																						<button type="button" onClick={handleFillRandom} style={{ minWidth: 180, background: '#82aaff', color: '#23272e', fontWeight: 600, fontSize: 16, border: 'none', borderRadius: 6, boxShadow: '0 2px 8px #0002', padding: '10px 0', cursor: 'pointer', letterSpacing: 1 }}>Náhodně vyplnit</button>
																					</div>
											</form>
										</div>
									)}
			<div style={{ width: '90vw', maxWidth: 'none', position: 'relative', left: '50%', right: '50%', marginLeft: '-45vw', marginRight: '-45vw', textAlign: 'left', marginTop: 32 }}>
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
							{fields.length === 0 ? <div style={{ color: '#888', marginTop: 4 }}>Žádná pole nenalezena</div> :
								<ul style={{ margin: 0, paddingLeft: 18, columns: 2 }}>
									{fields.map(({ field }, i) => <li key={i}>{field} <span style={{ color: '#82aaff' }}>{fieldValues[field]}</span></li>)}
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
												xml={highlightedSrcXml}
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
								Object.keys(fieldValues).length === 0 ? (
									<div style={{ color: '#888', marginTop: 4 }}>Zatím není co mapovat</div>
								) : (
									<ul style={{ margin: 0, paddingLeft: 18, columns: 2 }}>
										{Object.entries(fieldValues).map(([field, value], i) => (
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
												xml={highlightedDebugXml}
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
