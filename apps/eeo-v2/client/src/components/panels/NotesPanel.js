import React, { useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStickyNote, faTasks, faListUl, faIndent, faOutdent, faTrash, faLanguage, faLink, faCode, faSync, faSave, faClock, faMinus, faSquare, faWindowRestore, faTable, faUndo, faRedo, faBorderAll, faMicrophone, faStop } from '@fortawesome/free-solid-svg-icons';
import { PanelBase, PanelHeader, TinyBtn, edgeHandles } from './PanelPrimitives';
import styled from '@emotion/styled';
import order25DraftStorageService from '../../services/order25DraftStorageService';

const RichNotesWrapper = styled.div`display:flex; flex-direction:column; gap:.4rem; flex:1; min-height:0;`;

const EditorsContainer = styled.div`
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	position: relative;
`;

const TabsContainer = styled.div`
	display: flex;
	gap: 0.25rem;
	background: #fef3c7;
	padding: 0.3rem 0.5rem;
	border: 1px solid #fbbf24;
	border-radius: 6px 6px 0 0;
`;

const TabButton = styled.button`
	background: ${props => props.active ? '#fde68a' : '#fff8e1'};
	border: 1px solid ${props => props.active ? '#f4c542' : 'transparent'};
	color: ${props => props.active ? '#92400e' : '#7c4a02'};
	padding: 0.4rem 0.8rem;
	border-radius: 5px;
	font-size: 0.7rem;
	font-weight: ${props => props.active ? '700' : '600'};
	letter-spacing: 0.5px;
	cursor: pointer;
	transition: all 0.2s;
	display: flex;
	align-items: center;
	gap: 0.3rem;

	&:hover {
		background: ${props => props.active ? '#fde68a' : '#fef3c7'};
		border-color: #f4c542;
	}

	&:focus {
		outline: none;
		box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.3);
	}
`;

const NotesToolbar = styled.div`display:grid; grid-template-columns: auto 1fr; gap:.3rem; background:#fde68a; padding:.35rem .45rem; border:1px solid #fbbf24; border-radius:6px;`;
const ToolbarMainArea = styled.div`display:flex; flex-wrap:wrap; gap:.3rem;`;
const MicrophoneButton = styled.button`
	background: ${props => props.isRecording ? '#fee2e2' : '#dbeafe'};
	border: 2px solid ${props => props.isRecording ? '#ef4444' : '#3b82f6'};
	color: ${props => props.isRecording ? '#b91c1c' : '#1e40af'};
	padding: 0.5rem;
	border-radius: 8px;
	font-size: 1.5rem;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	grid-row: span 2;
	min-height: 100%;
	transition: all 0.2s;
	&:hover {
		background: ${props => props.isRecording ? '#fecaca' : '#bfdbfe'};
		transform: scale(1.05);
	}
	&:active {
		transform: scale(0.95);
	}
	${props => props.isRecording && `
		animation: pulse 1.5s ease-in-out infinite;
		@keyframes pulse {
			0%, 100% { opacity: 1; }
			50% { opacity: 0.7; }
		}
	`}
`;
const NotesTbBtn = styled.button`
	background:#fff8e1; border:1px solid #f4c542; color:#7c4a02; padding:0.28rem 0.5rem; border-radius:5px; font-size:.55rem; letter-spacing:.5px; cursor:pointer; display:inline-flex; align-items:center; gap:.25rem; font-weight:600;
	&:hover{background:#fef3c7;}
	&:active{background:#fde68a;}
	&:focus{outline:none;}
`;
const ToolbarSep = styled.span`
  display:inline-flex; align-items:center; justify-content:center; padding:0 .25rem; color:#a16207; opacity:.55; font-weight:600; user-select:none; pointer-events:none; font-size:.55rem; line-height:1; position:relative;
  &:after { content:""; position:absolute; left:50%; top:15%; bottom:15%; width:1px; background:#f4c542; opacity:.7; transform:translateX(-50%); }
`;
const NotesEditable = styled.div`
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	overflow: auto;
	border: 1px solid #f4c542;
	background: #fefce8;
	color: #1f2937;
	padding: .6rem .7rem;
	border-radius: 8px;
	font-size: .8rem;
	line-height: 1.45;
	outline: none;
	user-select: text;
	cursor: text;
	white-space: pre-wrap;
	word-break: break-word;
	font-family: var(--app-font-family, Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, 'Inter', 'Helvetica Neue', Arial, sans-serif);
	h1,h2,h3,h4,h5 { font-weight:600; line-height:1.2; margin:.7em 0 .4em; color:#92400e; }
	p { margin:.4em 0; }
	ul,ol { padding-left:1.25em; margin:.4em 0 .55em; }
	code { background:#fff1cc; padding:2px 5px; border-radius:4px; font-family:monospace; font-size:.75em; border:1px solid #f4c542; }
	b,strong { color:#b45309; }
	i,em { color:#9a3412; }
	u { text-decoration-color:#d97706; }
	blockquote { margin:.65em 0; padding:.5em .7em; background:#fff4d6; border-left:4px solid #f4c542; border-radius:4px; font-size:.9em; color:#7c4a02; }
	a { color:#2563eb; text-decoration:underline; }
	hr { border:none; border-top:1px solid #f4c542; margin:.8em 0; }
	&:empty:before { content: attr(data-placeholder); position:absolute; left:.7rem; top:.55rem; color:#7c4a02; opacity:.45; pointer-events:none; font-weight:400; }
	scrollbar-width: thin; scrollbar-color:#f4c542 #fefce8;
	&::-webkit-scrollbar { width:10px; }
	&::-webkit-scrollbar-track { background:#fefce8; border-radius:6px; }
	&::-webkit-scrollbar-thumb { background:#f4c542; border-radius:6px; border:2px solid #fefce8; }
	&::-webkit-scrollbar-thumb:hover { background:#eab308; }
`;

const StatusBar = styled.div`
	display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0.6rem;
	background: rgba(254, 240, 138, 0.8); border-top: 1px solid #f4c542; font-size: 0.65rem;
	color: #7c4a02; border-radius: 0 0 6px 6px; gap: 0.5rem;
`;

const StatusItem = styled.div`
	display: flex; align-items: center; gap: 0.3rem; opacity: 0.85;
`;

const StatusButton = styled.button`
	background: none; border: none; color: #7c4a02; cursor: pointer; padding: 0.2rem;
	border-radius: 3px; display: flex; align-items: center; transition: background 0.2s;
	&:hover { background: rgba(244, 197, 66, 0.3); }
	&:disabled { opacity: 0.5; cursor: not-allowed; }
`;

// Confirm Dialog styled components
const ConfirmOverlay = styled.div`
	position: fixed; top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
	display: flex; justify-content: center; align-items: center; z-index: 10000;
	animation: fadeIn 0.2s ease-out;
	@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
`;

const ConfirmDialogBox = styled.div`
	background: white; border-radius: 12px; padding: 2rem; max-width: 450px; width: 90%;
	box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
	animation: slideIn 0.3s ease-out;
	@keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`;

const ConfirmHeader = styled.div`
	display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;
`;

const ConfirmIcon = styled.div`
	width: 48px; height: 48px; border-radius: 50%;
	background: #fecaca;
	display: flex; align-items: center; justify-content: center;
	color: #dc2626;
	font-size: 1.5rem;
`;

const ConfirmTitle = styled.h3`
	font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0;
`;

const ConfirmContent = styled.div`
	margin-bottom: 2rem; line-height: 1.6; color: #475569;
`;

const ConfirmActions = styled.div`
	display: flex; gap: 0.75rem; justify-content: flex-end;
`;

const ConfirmButton = styled.button`
	padding: 0.75rem 1.5rem; border: 2px solid; border-radius: 8px;
	font-weight: 600; cursor: pointer; transition: all 0.2s ease;
	${props => props.$variant === 'primary' ? `
		background: #dc2626; color: white; border-color: #dc2626;
		&:hover { background: #b91c1c; border-color: #b91c1c; transform: translateY(-1px);
			box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25); }
	` : `
		background: white; color: #6b7280; border-color: #d1d5db;
		&:hover { background: #f9fafb; border-color: #9ca3af; color: #374151; }
	`}
`;

// 🎤 Voice Recognition Browser Support Dialog - styled components
const VoiceUnsupportedOverlay = styled.div`
	position: fixed; top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(8px);
	display: flex; align-items: center; justify-content: center; z-index: 10000;
	animation: fadeIn 0.2s ease-out;
	@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
`;

const VoiceUnsupportedDialog = styled.div`
	background: white; border-radius: 16px; padding: 2rem; max-width: 500px; width: 90%;
	box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
	animation: slideUp 0.3s ease-out;
	@keyframes slideUp {
		from { opacity: 0; transform: translateY(20px); }
		to { opacity: 1; transform: translateY(0); }
	}
`;

const VoiceUnsupportedHeader = styled.div`
	display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;
`;

const VoiceUnsupportedIcon = styled.div`
	width: 56px; height: 56px; border-radius: 50%;
	background: linear-gradient(135deg, #fef3c7, #fde68a);
	display: flex; align-items: center; justify-content: center;
	color: #d97706; font-size: 1.75rem; flex-shrink: 0;
`;

const VoiceUnsupportedTitle = styled.h3`
	margin: 0; font-size: 1.35rem; font-weight: 700; color: #1e293b; line-height: 1.3;
`;

const VoiceUnsupportedContent = styled.div`
	margin-bottom: 2rem; color: #475569; line-height: 1.7;
	p { margin: 0 0 1rem 0; &:last-child { margin-bottom: 0; } }
	strong { color: #1e293b; font-weight: 600; }
	ul { margin: 0.75rem 0; padding-left: 1.5rem; li { margin: 0.4rem 0; } }
`;

const VoiceUnsupportedActions = styled.div`
	display: flex; gap: 0.75rem; justify-content: flex-end;
`;

const VoiceUnsupportedButton = styled.button`
	padding: 0.75rem 1.5rem; border: 2px solid; border-radius: 10px;
	font-weight: 600; font-size: 0.9375rem; cursor: pointer; transition: all 0.2s ease;
	${props => props.$primary ? `
		background: linear-gradient(135deg, #3b82f6, #2563eb);
		color: white; border-color: transparent;
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
		&:hover {
			background: linear-gradient(135deg, #2563eb, #1d4ed8);
			transform: translateY(-2px);
			box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
		}
		&:active { transform: translateY(0); }
	` : `
		background: white; color: #64748b; border-color: #cbd5e1;
		&:hover { background: #f8fafc; border-color: #94a3b8; color: #475569; }
	`}
`;

export const NotesPanel = ({state, font, notesRef, notesText, transcriptionText, setTranscriptionText, onInput, onPaste, onClose, adjustFont, translateToCz, setNotesText, tasks, showColors, setShowColors, NOTES_COLOR_PALETTE, bringFront, beginDrag, panelZ, isActive, hovered, opacityConfig, onHoverEnter, onHoverLeave, onEngage, storageId, saving, lastSaved, saveError, autoSaveStatus, serverSyncStatus, manualSaveNotes, refreshFromServer, formatTime, minimizePanel, maximizePanel, clearAllNotes, onRecordingChange, onExternalInsert, globalVoiceRecognition}) => {
  const isSyncingRef = useRef(false);

  // State pro confirm dialog
  const [showConfirmClear, setShowConfirmClear] = React.useState(false);

  // 🎤 State pro unsupported browser dialog
  const [showVoiceUnsupportedDialog, setShowVoiceUnsupportedDialog] = React.useState(false);

  // Použít globální voice recognition místo lokálního
  // isRecording stav je nyní řízen globálně
  const isRecording = globalVoiceRecognition?.isRecording || false;
  const isSupported = globalVoiceRecognition?.isSupported || false; // ✅ Kontrola podpory API

  // State pro tabbed interface
  const [activeTab, setActiveTab] = React.useState('notes'); // 'notes' nebo 'transcription'
  const transcriptionRef = useRef(null);

  // LOKÁLNÍ Speech Recognition ODSTRANĚN - používáme globální
  // Globální recognition automaticky detekuje, kam vkládat text

  // Handler pro externí vkládání textu (z globálního voice recognition)
  // Vytvořit stabilní callback pomocí useCallback
  const insertHandler = useCallback((htmlText) => {
    //
    if (activeTab === 'transcription' && transcriptionRef.current) {
      // Vložit do Okamžitého přepisu
      //
      transcriptionRef.current.focus();
      document.execCommand('insertHTML', false, htmlText);
      setTranscriptionText(transcriptionRef.current.innerHTML);
    } else if (activeTab === 'notes' && notesRef.current) {
      // Vložit do Poznámky
      //
      notesRef.current.focus();
      document.execCommand('insertHTML', false, htmlText);
      setNotesText(notesRef.current.innerHTML);
    } else {
    }
  }, [activeTab, transcriptionRef, notesRef, setNotesText, setTranscriptionText]);

  // Zaregistrovat callback při změně
  useEffect(() => {
    //
    if (onExternalInsert && typeof onExternalInsert === 'function') {
      onExternalInsert(insertHandler);
      //
    }
  }, [onExternalInsert, insertHandler]);

  // Handler pro otevření confirm dialogu
  const handleClearAllClick = () => {
    // Zkontroluj, zda jsou nějaké poznámky
    const hasContent = notesText && notesText.trim().length > 0;
    if (!hasContent) {
      return; // Nic nedělej, žádné poznámky
    }
    setShowConfirmClear(true);
  };

  // Handler pro potvrzení smazání
  const handleConfirmClear = async () => {
    await clearAllNotes();
    setShowConfirmClear(false);
  };

  // Handlers pro nahrávání zvuku - používají globální recognition
  const startRecording = async () => {
    // ✅ PRVNÍ KONTROLA: Je API podporováno?
    if (!isSupported) {
      setShowVoiceUnsupportedDialog(true);
      return; // ❌ STOP - nezačínej nahrávání!
    }

    if (!globalVoiceRecognition) {
      setShowVoiceUnsupportedDialog(true);
      return;
    }

    try {
      // Ujisti se, že panel je otevřený a má focus
      if (notesRef.current || transcriptionRef.current) {
        const targetRef = activeTab === 'transcription' ? transcriptionRef : notesRef;
        if (targetRef.current) {
          targetRef.current.focus();
        }
      }

      globalVoiceRecognition.startRecording(null); // null = cíl je NotesPanel
      onRecordingChange && onRecordingChange(true);
    } catch (error) {
      setShowVoiceUnsupportedDialog(true);
    }
  };

  const stopRecording = () => {
    if (globalVoiceRecognition) {
      globalVoiceRecognition.stopRecording();
      onRecordingChange && onRecordingChange(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const clearAndStartRecording = async () => {
    // Vymazat JEN okamžitý přepis (ne poznámky!)
    if (transcriptionRef.current) {
      transcriptionRef.current.innerHTML = '';
      setTranscriptionText('');
    }

    // Přepnout na tab Okamžitého přepisu
    setActiveTab('transcription');

    // Spustit nahrávání
    if (!isRecording) {
      startRecording();
    }
  };

  // Globální klávesové zkratky (pouze pro panel-specifické zkratky)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Shift+Mezerník - Vymazat a začít nový přepis
      // (pouze když je panel aktivní)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'Space') {
        e.preventDefault();
        clearAndStartRecording();
        return;
      }

      // CTRL+Space je nyní řešen globálně v useGlobalVoiceRecognition hooku
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync DOM with notesText
  useEffect(() => {
    if (notesRef.current && notesRef.current.innerHTML !== notesText) {
      isSyncingRef.current = true;

      // Debug: zkontroluj typ
      if (typeof notesText !== 'string') {
        notesRef.current.innerHTML = '';
      } else {
        notesRef.current.innerHTML = notesText || '';
      }

      // Use setTimeout to reset after DOM update
      setTimeout(() => { isSyncingRef.current = false; }, 0);
    }
  }, [notesText, notesRef]);

  // Sync DOM with transcriptionText
  useEffect(() => {
    if (transcriptionRef.current && transcriptionRef.current.innerHTML !== transcriptionText) {
      const wasSyncing = isSyncingRef.current;
      isSyncingRef.current = true;

      // Debug: zkontroluj typ
      if (typeof transcriptionText !== 'string') {
        transcriptionRef.current.innerHTML = '';
      } else {
        transcriptionRef.current.innerHTML = transcriptionText || '';
      }

      setTimeout(() => { isSyncingRef.current = wasSyncing; }, 0);
    }
  }, [transcriptionText]);

  // Fallback: use MutationObserver to catch changes not captured by onInput (NOTES tab)
  useEffect(() => {
    if (!notesRef.current || activeTab !== 'notes') return;
    const observer = new MutationObserver(() => {
      if (isSyncingRef.current) return; // ignore changes caused by sync
      if (!notesRef.current) return; // Check again inside callback
      const currentHtml = notesRef.current.innerHTML;
      if (currentHtml !== notesText) {
        setNotesText(currentHtml);
      }
    });
    observer.observe(notesRef.current, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [notesRef, notesText, setNotesText, activeTab]);

  // Fallback: MutationObserver for TRANSCRIPTION tab
  useEffect(() => {
    if (!transcriptionRef.current || activeTab !== 'transcription') return;
    const observer = new MutationObserver(() => {
      if (isSyncingRef.current) return;
      if (!transcriptionRef.current) return;
      const currentHtml = transcriptionRef.current.innerHTML;
      if (currentHtml !== transcriptionText) {
        setTranscriptionText(currentHtml);
      }
    });
    observer.observe(transcriptionRef.current, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [transcriptionRef, transcriptionText, activeTab]);
	const buildTodoHtml = useCallback(() => {
		const escapeHtml = (s='') => s.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch] || ch));
		const ts = new Date();
		const remaining = tasks.filter(t=>!t.done).length;
		const items = tasks && tasks.length ? tasks.map(t => `<li style="opacity:${t.done?0.6:1};">${t.done ? '[x]' : '[ ]'} ${escapeHtml(t.text)}</li>`).join('') : '<li><em>(Žádné úkoly)</em></li>';
		return `<div class="todo-sync-header" style="font-weight:600; letter-spacing:.5px; margin:.3em 0 .35em; color:#92400e; font-size:.85em;">TODO (${remaining}/${tasks.length}) – ${ts.toLocaleDateString('cs-CZ')} ${ts.toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit'})}</div><ul style="margin:0 0 .6em .9em; padding-left:.9em;">${items}</ul>`;
	}, [tasks]);

	// Funkce pro vytěžení rozpracovaného formuláře do HTML tabulky (bez JavaScript kódu)
	const buildFormDataHtml = useCallback(async () => {
		const escapeHtml = (s='') => String(s || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch] || ch));

		// Mapování ID na jména/hodnoty podle různých cache mechanismů v aplikaci
		const resolveIdToName = (key, value, formData) => {
			if (!value || value === '') return value;

			// Debug log
			//

			// Příkazce PO - PRIORITA: dictionaries z draftu
			if (['prikazce_id', 'po_kod', 'po'].includes(key)) {
				//

				// 1. Zkus dictionaries z draftu (PRIORITA!)
				if (dictionaries.approvers && Array.isArray(dictionaries.approvers)) {
					const found = dictionaries.approvers.find(item =>
						String(item.id || item.value) === String(value)
					);
					if (found) {
						const name = found.label || found.displayName || found.name || found.jmeno;
						if (name) {
							//
							return `${name} (${value})`;
						}
					}
				}

				// 2. Fallback na localStorage cache (pro starší drafty)
				const cacheKeys = [
					'cached_approvers', 'approvers_cache', 'po_options',
					'cached_users', 'users_cache', 'userCache',
					'po_approvers', 'approvers'
				];

				for (const cacheKey of cacheKeys) {
					try {
						const cache = localStorage.getItem(cacheKey);
						if (cache) {
							const data = JSON.parse(cache);
							//  ? `array[${data.length}]` : typeof data);

							let found = null;

							// Pro pole objektů
							if (Array.isArray(data)) {
								found = data.find(item =>
									String(item.id) === String(value) ||
									String(item.value) === String(value) ||
									String(item.code) === String(value) ||
									String(item.kod) === String(value) ||
									String(item.po_kod) === String(value) ||
									String(item.prikazce_id) === String(value) ||
									item === value
								);
							}
							// Pro objekty s klíči
							else if (typeof data === 'object' && data[value]) {
								found = data[value];
							}

							if (found) {
								const name = found.label || found.name || found.jmeno || found.nazev ||
											(found.prijmeni && found.jmeno ? (() => {
												const titul_pred_str = found.titul_pred ? found.titul_pred + ' ' : '';
												const titul_za_str = found.titul_za ? ', ' + found.titul_za : '';
												return `${titul_pred_str}${found.jmeno} ${found.prijmeni}${titul_za_str}`.replace(/\s+/g, ' ').trim();
											})() : '') ||
											found;
								//
								return `${name} (${value})`;
							}
						}
					} catch(e) {  }
				}

				// 3. Zkusíme najít přímo ve formData
				if (formData.approvers && Array.isArray(formData.approvers)) {
					const approver = formData.approvers.find(a => String(a.id) === String(value) || String(a.value) === String(value));
					if (approver) {
						//
						return `${approver.label || approver.name || approver.jmeno} (${value})`;
					}
				}

				// 4. Žádné fallback mapování
				//
			}

			// Objednatel a Garant - PRIORITA: dictionaries z draftu
			if (['objednatel_id', 'garant_uzivatel_id', 'guarantUserId'].includes(key)) {
				//

				// 1. Zkus dictionaries.users z draftu (PRIORITA!)
				if (dictionaries.users && Array.isArray(dictionaries.users)) {
					const found = dictionaries.users.find(item =>
						String(item.id || item.user_id || item.value) === String(value)
					);
					if (found) {
						const name = found.label || found.displayName || found.name ||
							(found.jmeno && found.prijmeni ?
								`${found.titul_pred ? found.titul_pred + ' ' : ''}${found.jmeno} ${found.prijmeni}${found.titul_za ? ', ' + found.titul_za : ''}`.trim()
								: found.jmeno);
						if (name) {
							//
							return `${name} (${value})`;
						}
					}
				}

				// 2. Fallback na localStorage cache
				const userCacheKeys = ['cached_users', 'users_cache', 'userCache', 'cached_garants'];
				for (const cacheKey of userCacheKeys) {
					try {
						const cache = localStorage.getItem(cacheKey);
						if (cache) {
							const data = JSON.parse(cache);
							if (Array.isArray(data)) {
								const found = data.find(item =>
									String(item.id || item.user_id) === String(value)
								);
								if (found) {
									const name = found.label || found.name ||
										(found.jmeno && found.prijmeni ?
											`${found.titul_pred ? found.titul_pred + ' ' : ''}${found.jmeno} ${found.prijmeni}${found.titul_za ? ', ' + found.titul_za : ''}`.trim()
											: found.jmeno);
									if (name) {
										//
										return `${name} (${value})`;
									}
								}
							}
						}
					} catch(e) {  }
				}

				//
			}

			// Střediska - PRIORITA: dictionaries z draftu
			if (['strediska', 'strediska_kod', 'center'].includes(key) && Array.isArray(value)) {
				//

				// 1. Zkus dictionaries z draftu (PRIORITA!)
				if (dictionaries.strediska && Array.isArray(dictionaries.strediska)) {
					const resolvedCenters = value.map(centerId => {
						const center = dictionaries.strediska.find(c =>
							String(c.id || c.value || c.kod) === String(centerId)
						);
						const resolved = center
							? `${center.name || center.nazev || center.label} (${centerId})`
							: centerId;
						//
						return resolved;
					});
					return resolvedCenters.join(', ');
				}

				// 2. Fallback na localStorage cache
				try {
					let centersData = null;
					const centersCacheKeys = [
						'cached_centers', 'locations_cache', 'centers_cache',
						'center_options', 'strediska_cache', 'cached_locations'
					];

					for (const cacheKey of centersCacheKeys) {
						const cache = localStorage.getItem(cacheKey);
						if (cache) {
							centersData = JSON.parse(cache);
							//  ? `array[${centersData.length}]` : typeof centersData);
							break;
						}
					}

					if (centersData && Array.isArray(centersData)) {
						const resolvedCenters = value.map(centerId => {
							const center = centersData.find(c =>
								String(c.id) === String(centerId) ||
								String(c.value) === String(centerId) ||
								String(c.kod) === String(centerId) ||
								String(c.code) === String(centerId) ||
								c === centerId
							);
							const resolved = center ? `${center.name || center.nazev || center.label || center} (${centerId})` : centerId;
							//
							return resolved;
						});
						return resolvedCenters.join(', ');
					}
				} catch(e) {  }

				// 3. Základní mapování (bez vymyšlených názvů)
				return value.map(c => {
					// `);
					return c;
				}).join(', ');
			}

			// Dodavatel - pokud máme IČO, zkusíme najít název z různých zdrojů
			if (key === 'dodavatel_ico' || key === 'supplierIco') {
				// 1. Z formData
				const supplierName = formData.dodavatel_nazev || formData.supplierName;
				if (supplierName) {
					return `${supplierName} (${value})`;
				}

				// 2. Ze suppliers cache
				try {
					const suppliersCache = localStorage.getItem('suppliers_cache');
					if (suppliersCache) {
						const suppliers = JSON.parse(suppliersCache);
						const supplier = suppliers.find(s =>
							String(s.ico) === String(value) ||
							String(s.id) === String(value)
						);
						if (supplier) return `${supplier.nazev || supplier.name} (${value})`;
					}
				} catch {}
			}

			// Garant - pokusíme se najít jméno v garants cache nebo userCache
			if (['garant_uzivatel_id', 'guarantUserId', 'garant'].includes(key)) {
				//

				// Zkusíme všechny možné cache klíče pro garanti/uživatele
				const cacheKeys = [
					'cached_garants', 'garants_cache', 'userCache', 'users_cache',
					'cached_users', 'cached_approvers', 'approvers_cache',
					'garant_options', 'guarantors'
				];

				for (const cacheKey of cacheKeys) {
					try {
						const cache = localStorage.getItem(cacheKey);
						if (cache) {
							const data = JSON.parse(cache);
							//  ? `array[${data.length}]` : typeof data);

							let found = null;

							if (Array.isArray(data)) {
								// Pro pole uživatelů - zkusíme různé ID fieldy
								found = data.find(u =>
									String(u.id) === String(value) ||
									String(u.user_id) === String(value) ||
									String(u.uzivatel_id) === String(value) ||
									String(u.garant_id) === String(value) ||
									String(u.value) === String(value)
								);
							} else if (typeof data === 'object' && data[value]) {
								// Pro objekt s uživateli (userCache)
								found = data[value];
							}

							if (found) {
								// Zkusíme různé kombinace jméno/příjmení
								let name = found.label || found.name || found.nazev;

								if (!name && (found.jmeno || found.prijmeni)) {
									name = `${found.jmeno || ''} ${found.prijmeni || ''}`.trim();
								}

								if (!name && (found.firstName || found.lastName)) {
									name = `${found.firstName || ''} ${found.lastName || ''}`.trim();
								}

								if (!name) name = found.toString();

								//
								return `${name} (${value})`;
							}
						}
					} catch(e) {  }
				}

				// Bez vymyšlených fallback jmen - používáme jen skutečná cache data
				//

				//
			}

			// Typ objednávky - zkusíme orderTypes cache
			if (['druh_objednavky', 'orderType'].includes(key)) {
				try {
					const orderTypesCache = localStorage.getItem('orderTypes_cache');
					if (orderTypesCache) {
						const orderTypes = JSON.parse(orderTypesCache);
						const orderType = orderTypes.find(ot =>
							String(ot.id) === String(value) ||
							String(ot.kod) === String(value)
						);
						if (orderType) return `${orderType.nazev || orderType.name} (${value})`;
					}
				} catch {}
			}

			// Zdroj financování
			if (['zdroj_financovani', 'financingSource'].includes(key)) {
				try {
					const financingCache = localStorage.getItem('financing_cache');
					if (financingCache) {
						const financing = JSON.parse(financingCache);
						const source = financing.find(f =>
							String(f.id) === String(value) ||
							String(f.kod) === String(value)
						);
						if (source) return `${source.nazev || source.name} (${value})`;
					}
				} catch {}
			}

			// Vracíme původní hodnotu pouze pokud se nepodařilo mapování
			//
			return value;
		};

		// Pokus o načtení aktuálního rozpracovaného formuláře pomocí centralizované funkce
		let formData = null;
		let dictionaries = {};
		let sourceInfo = '';

		try {
			// 🔥 Použij centralizovanou funkci pro načtení dat (dešifrované!)
			const result = await getFormDataForExport();

			if (result) {
				// Rozbal result na formData a dictionaries
				formData = result.formData || result;
				dictionaries = result.dictionaries || {};
				sourceInfo = 'Order25 formulář';
				//
				// );
			}
		} catch (error) {
			return `<div style="color:#dc2626; font-style:italic; margin:.5em 0;">❌ Nepodařilo se načíst data formuláře</div>`;
		}

		if (!formData || typeof formData !== 'object') {
			return `<div style="color:#6b7280; font-style:italic; margin:.5em 0;">📝 Žádný rozpracovaný formulář nenalezen<br><small>Tip: Otevřete formulář objednávky a vyplňte nějaká pole</small></div>`;
		}

		const ts = new Date();

		// Rozšířené definice polí s lepším mapováním
		const fieldMappings = [
			// Základní identifikace
			{ key: 'predmet', label: 'Předmět', type: 'text', priority: 1 },
			{ key: 'subject', label: 'Předmět', type: 'text', priority: 1 },
			{ key: 'cislo_objednavky', label: 'Číslo objednávky', type: 'text', priority: 1 },
			{ key: 'orderNumber', label: 'Číslo objednávky', type: 'text', priority: 1 },

			// Příkazce, Objednatel, Garant
			{ key: 'prikazce_id', label: 'Příkazce PO', type: 'user', priority: 2 },
			{ key: 'po_kod', label: 'Příkazce PO', type: 'user', priority: 2 },
			{ key: 'po', label: 'Příkazce PO', type: 'user', priority: 2 },
			{ key: 'objednatel_id', label: 'Objednatel', type: 'user', priority: 2.1 },
			{ key: 'garant_uzivatel_id', label: 'Garant', type: 'user', priority: 2.2 },
			{ key: 'guarantUserId', label: 'Garant', type: 'user', priority: 2.2 },

			// Dodavatel
			{ key: 'dodavatel_nazev', label: 'Dodavatel název', type: 'text', priority: 3 },
			{ key: 'supplierName', label: 'Dodavatel název', type: 'text', priority: 3 },
			{ key: 'dodavatel_adresa', label: 'Dodavatel adresa', type: 'text', priority: 3 },
			{ key: 'supplierAddress', label: 'Dodavatel adresa', type: 'text', priority: 3 },
			{ key: 'dodavatel_ico', label: 'Dodavatel IČO', type: 'text', priority: 3 },
			{ key: 'supplierIco', label: 'Dodavatel IČO', type: 'text', priority: 3 },
			{ key: 'dodavatel_dic', label: 'Dodavatel DIČ', type: 'text', priority: 3 },
			{ key: 'supplierDic', label: 'Dodavatel DIČ', type: 'text', priority: 3 },

			// Druh a typ
			{ key: 'druh_objednavky', label: 'Druh objednávky', type: 'text', priority: 4 },
			{ key: 'orderType', label: 'Druh objednávky', type: 'text', priority: 4 },

			// Ceny
			{ key: 'max_cena_s_dph', label: 'Max. cena s DPH', type: 'price', priority: 5 },
			{ key: 'maxPriceInclVat', label: 'Max. cena s DPH', type: 'price', priority: 5 },
			{ key: 'cena_s_dph', label: 'Cena s DPH', type: 'price', priority: 5 },
			{ key: 'priceInclVat', label: 'Cena s DPH', type: 'price', priority: 5 },
			{ key: 'cena_bez_dph', label: 'Cena bez DPH', type: 'price', priority: 5 },
			{ key: 'priceExclVat', label: 'Cena bez DPH', type: 'price', priority: 5 },

			// Financování
			{ key: 'zdroj_financovani', label: 'Zdroj financování', type: 'text', priority: 6 },
			{ key: 'financingSource', label: 'Zdroj financování', type: 'text', priority: 6 },
			{ key: 'cislo_smlouvy', label: 'Číslo smlouvy', type: 'text', priority: 6 },
			{ key: 'contractNumber', label: 'Číslo smlouvy', type: 'text', priority: 6 },

			// Dodání
			{ key: 'predpokladany_termin_dodani', label: 'Termín dodání', type: 'date', priority: 7 },
			{ key: 'expectedDeliveryDate', label: 'Termín dodání', type: 'date', priority: 7 },
			{ key: 'misto_dodani', label: 'Místo dodání', type: 'text', priority: 7 },
			{ key: 'deliveryLocation', label: 'Místo dodání', type: 'text', priority: 7 },

			// Ostatní
			{ key: 'zaruka', label: 'Záruka', type: 'text', priority: 8 },
			{ key: 'warranty', label: 'Záruka', type: 'text', priority: 8 },
			{ key: 'poznamka', label: 'Poznámka', type: 'text', priority: 9 },
			{ key: 'notes', label: 'Poznámka', type: 'text', priority: 9 },
			{ key: 'description', label: 'Popis', type: 'text', priority: 9 }
		];

		// Extrakce středisek
		const getCenters = (data) => {
			if (Array.isArray(data.strediska) && data.strediska.length > 0) return data.strediska.join(', ');
			if (Array.isArray(data.center) && data.center.length > 0) return data.center.join(', ');
			return '';
		};

		// Extrakce položek s lepším formátováním
		const getItems = (data) => {
			const items = data.polozky || data.items || [];
			if (!Array.isArray(items) || items.length === 0) return '';

			const formattedItems = items.map((item, idx) => {
				const popis = item.popis || item.description || `Položka ${idx + 1}`;
				const cenaBezDph = item.cena_bez_dph || item.priceExclVat || '';
				const cenaSdph = item.cena_s_dph || item.priceInclVat || '';
				const sazba = item.sazba_dph || item.vatRate || '';

				let cenaPart = '';
				if (cenaSdph) {
					cenaPart = ` - ${cenaSdph} Kč s DPH`;
					if (cenaBezDph && cenaBezDph !== cenaSdph) {
						cenaPart += ` (${cenaBezDph} Kč bez DPH)`;
					}
				} else if (cenaBezDph) {
					cenaPart = ` - ${cenaBezDph} Kč bez DPH`;
				}

				if (sazba && sazba !== 21) {
					cenaPart += ` DPH ${sazba}%`;
				}

				return `<strong>${idx + 1}.</strong> ${escapeHtml(popis)}${cenaPart}`;
			});

			return formattedItems.join('<br>');
		};

		// Sestavení tabulky s prioritami
		const rows = [];
		const usedLabels = new Set();

		// Seřadíme podle priority a zpracujeme
		const sortedMappings = fieldMappings.sort((a, b) => a.priority - b.priority);

		for (const mapping of sortedMappings) {
			const value = formData[mapping.key];
			if (value !== undefined && value !== null && String(value).trim() !== '' && !usedLabels.has(mapping.label)) {
				// Pokusíme se vyřešit ID na jméno
				const resolvedValue = resolveIdToName(mapping.key, value, formData);

			// Použijeme RESOLVED hodnotu (ne původní value)
			const formattedValue = mapping.type === 'price'
				? `${String(resolvedValue).trim().replace(/\s+/g, '')} Kč`
				: mapping.type === 'date' && resolvedValue
					? (() => {
						try {
							const date = new Date(resolvedValue);
							return date.toLocaleDateString('cs-CZ');
						} catch {
							return escapeHtml(String(resolvedValue).trim());
						}
					})()
					: escapeHtml(String(resolvedValue).trim());				rows.push({
					label: mapping.label,
					value: formattedValue,
					rawValue: String(resolvedValue).replace(/<[^>]*>/g, ''), // Pro CSV export
					priority: mapping.priority
				});
				usedLabels.add(mapping.label);
			}
		}

		// Přidání středisek s POVINNÝM mapováním ID
		const centerValues = formData.strediska_kod || formData.strediska || formData.center;
		if (centerValues && (Array.isArray(centerValues) ? centerValues.length > 0 : centerValues)) {
			//
			const resolvedCenters = resolveIdToName('strediska', centerValues, formData);
			//

			// VŽDY používáme resolved hodnotu
			const finalCenters = resolvedCenters || (Array.isArray(centerValues) ? centerValues.join(', ') : centerValues);

			rows.push({
				label: 'Střediska',
				value: escapeHtml(String(finalCenters)),
				rawValue: String(finalCenters).replace(/<[^>]*>/g, ''),
				priority: 2.5
			});
		}

		// Přidání položek
		const items = getItems(formData);
		if (items) {
			rows.push({
				label: 'Položky',
				value: items,
				rawValue: items.replace(/<[^>]*>/g, '').replace(/<br>/g, ', '),
				priority: 10
			});
		}

		if (rows.length === 0) {
			return `<div style="color:#6b7280; font-style:italic; margin:.5em 0;">📝 Formulář neobsahuje žádná vyplněná pole<br><small>Zdroj: ${sourceInfo}</small></div>`;
		}

		// Seřadíme finální řádky podle priority
		rows.sort((a, b) => a.priority - b.priority);

		// Generování HTML pro zobrazení - PŮVODNÍ VERTIKÁLNÍ FORMÁT
		const tableRows = rows.map(row => {
			return `<tr><td style="font-weight:600; color:#374151; padding:.25rem .5rem; border-bottom:1px solid #e5e7eb; background:#f9fafb;">${escapeHtml(row.label)}:</td><td style="padding:.25rem .5rem; border-bottom:1px solid #e5e7eb; color:#1f2937;">${row.value}</td></tr>`;
		}).join('');

		// Horizontální HTML tabulka pro kopírování
		const headers = rows.map(row => escapeHtml(row.label)).join('</th><th style="font-weight:600; color:#374151; padding:.5rem; border:1px solid #d1d5db; background:#f9fafb; text-align:center;">');
		const values = rows.map(row => row.value).join('</td><td style="padding:.5rem; border:1px solid #d1d5db; color:#1f2937; text-align:center;">');
		const horizontalHTML = `<table style="width:100%; border-collapse:collapse;"><tr><th style="font-weight:600; color:#374151; padding:.5rem; border:1px solid #d1d5db; background:#f9fafb; text-align:center;">${headers}</th></tr><tr><td style="padding:.5rem; border:1px solid #d1d5db; color:#1f2937; text-align:center;">${values}</td></tr></table>`;

		return `<div style="font-family:system-ui,-apple-system,sans-serif; margin:.5em 0; border:1px solid #d1d5db; border-radius:6px; overflow:hidden;">
			<div style="background:#f3f4f6; padding:.5rem .75rem; font-weight:600; color:#374151; font-size:.875rem; border-bottom:1px solid #d1d5db; display:flex; justify-content:space-between; align-items:center;">
				<span>📋 Rozpracovaný formulář (${sourceInfo} – ${ts.toLocaleDateString('cs-CZ')} ${ts.toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit'})})</span>
				<div style="display:flex; gap:.5rem;">
					<button onclick="navigator.clipboard.writeText(this.nextElementSibling.textContent).then(()=>{const t=document.createElement('div');t.textContent='✅ HTML tabulka zkopírována do schránky';t.style.cssText='position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:12px 16px;border-radius:8px;font-size:14px;z-index:10000;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-family:system-ui';document.body.appendChild(t);setTimeout(()=>document.body.removeChild(t),3000);}).catch(console.error)" style="background:#10b981; color:white; border:none; padding:.375rem .25rem; border-radius:4px; font-size:.75rem; cursor:pointer; display:flex; align-items:center; gap:.25rem; min-height:28px; width:50px;" title="Kopírovat HTML tabulku">
						📋 HTML
					</button>
					<textarea readonly style="position:absolute; left:-9999px; opacity:0;">${horizontalHTML}</textarea>
					<button onclick="navigator.clipboard.writeText(this.nextElementSibling.textContent).then(()=>{const t=document.createElement('div');t.textContent='✅ CSV data zkopírována do schránky';t.style.cssText='position:fixed;top:20px;right:20px;background:#3b82f6;color:white;padding:12px 16px;border-radius:8px;font-size:14px;z-index:10000;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-family:system-ui';document.body.appendChild(t);setTimeout(()=>document.body.removeChild(t),3000);}).catch(console.error)" style="background:#3b82f6; color:white; border:none; padding:.375rem .25rem; border-radius:4px; font-size:.75rem; cursor:pointer; display:flex; align-items:center; gap:.25rem; min-height:28px; width:45px;" title="Kopírovat CSV">
						📈 CSV
					</button>
					<textarea readonly style="position:absolute; left:-9999px; opacity:0;">${generateFormCSV(getFormDataForExport())}</textarea>
				</div>
			</div>
			<table style="width:100%; border-collapse:collapse;">
				${tableRows}
			</table>
		</div>`;
	}, [storageId]);

	// Pomocné funkce pro CSV export bez HTML
	const getFormDataForExport = useCallback(async () => {
		try {
			// 🆕 PRIORITA 1: Nový order25 draft systém (šifrovaný!)
			if (storageId && storageId !== 'anon') {
				//
				try {
					// Použij order25DraftStorageService pro dešifrování
					const draftData = await order25DraftStorageService.loadDraft(storageId, null, null);
					if (draftData && draftData.formData) {
						//
						// );

						// 📦 Extrahuj dictionaries z metadata
						const dictionaries = draftData.dictionaries || {};
						// );

						return {
							formData: draftData.formData,
							dictionaries
						};
					} else if (draftData && typeof draftData === 'object') {
						// Možná je to přímo formData bez obalu
						//
						// );
						return {
							formData: draftData,
							dictionaries: {}
						};
					} else {
						//
					}
				} catch (draftError) {
					// Pokračuj na starší klíče
				}
			}

			// PRIORITA 2: Zkus user-specific draft (starý systém, nešifrovaný)
			const userDraftKey = storageId && storageId !== 'anon' ? `order_draft_${storageId}` : null;
			if (userDraftKey) {
				const userDraft = localStorage.getItem(userDraftKey);
				if (userDraft) {
					//
					return {
						formData: JSON.parse(userDraft),
						dictionaries: {}
					};
				}
			}

			// PRIORITA 3: Fallback na generic draft
			const genericDraft = localStorage.getItem('order_draft');
			if (genericDraft) {
				//
				return {
					formData: JSON.parse(genericDraft),
					dictionaries: {}
				};
			}

			// PRIORITA 4: Další možné zdroje
			//
			const allKeys = Object.keys(localStorage);
			const orderKeys = allKeys.filter(key => key.includes('order_') && key.includes('formData'));
			for (const key of orderKeys) {
				try {
					const data = localStorage.getItem(key);
					if (data) {
						const parsed = JSON.parse(data);
						if (parsed && typeof parsed === 'object') {
							//
							return {
								formData: parsed,
								dictionaries: {}
							};
						}
					}
				} catch {}
			}

			return null;
		} catch (error) {
			return null;
		}
	}, [storageId]);

	const generateFormCSV = useCallback((formData) => {
		if (!formData) return '';

		// Použijeme stejnou resolveIdToName funkci jako v buildFormDataHtml
		const resolveIdToName = (key, value, formData) => {
			if (!value || value === '') return value;

			// Příkazce PO
			if (['prikazce_id', 'po_kod', 'po'].includes(key)) {
				const cacheKeys = ['cached_approvers', 'cached_users'];
				for (const cacheKey of cacheKeys) {
					try {
						const cache = localStorage.getItem(cacheKey);
						if (cache) {
							const data = JSON.parse(cache);
							if (Array.isArray(data)) {
								const found = data.find(item => String(item.id) === String(value));
								if (found) return found.label || found.name || found;
							}
						}
					} catch {}
				}
			}

			// Garant
			if (['garant_uzivatel_id', 'guarantUserId'].includes(key)) {
				const cacheKeys = ['cached_garants', 'cached_users'];
				for (const cacheKey of cacheKeys) {
					try {
						const cache = localStorage.getItem(cacheKey);
						if (cache) {
							const data = JSON.parse(cache);
							if (Array.isArray(data)) {
								const found = data.find(item => String(item.id) === String(value));
								if (found) return found.label || found.name || found;
							}
						}
					} catch {}
				}
			}

			// Střediska
			if (['strediska', 'center'].includes(key) && Array.isArray(value)) {
				const centerMap = { '1': 'Middle střediska' }; // Známá mapování
				return value.map(c => centerMap[c] || c).join(', ');
			}

			return value;
		};

		// Sesbíránání dat pro CSV - hlavičky a hodnoty oddělěně
		const headers = [];
		const values = [];
		const usedLabels = new Set();

		// Základní pole
		const basicFields = [
			{ key: 'predmet', label: 'Předmět' },
			{ key: 'subject', label: 'Předmět' },
			{ key: 'strediska', label: 'Střediska' },
			{ key: 'center', label: 'Střediska' },
			{ key: 'prikazce_id', label: 'Příkazce PO' },
			{ key: 'po_kod', label: 'Příkazce PO' },
			{ key: 'po', label: 'Příkazce PO' },
			{ key: 'max_cena_s_dph', label: 'Max. cena s DPH' },
			{ key: 'maxPriceInclVat', label: 'Max. cena s DPH' },
			{ key: 'garant_uzivatel_id', label: 'Garant' },
			{ key: 'guarantUserId', label: 'Garant' }
		];

		// Přidej základní pole
		basicFields.forEach(field => {
			const value = formData[field.key];
			if (value !== undefined && value !== null && String(value).trim() !== '' && !usedLabels.has(field.label)) {
				const resolvedValue = resolveIdToName(field.key, value, formData);
				headers.push(field.label);
				values.push(String(resolvedValue).trim());
				usedLabels.add(field.label);
			}
		});

		// Speciální handling položek - pokud je varianta pokladna
		const items = formData.polozky || formData.items || [];
		if (Array.isArray(items) && items.length > 0) {
			// Přidej hlavičky pro položky
			headers.push('Popis', 'Cena bez DPH', 'Cena s DPH');

			// Položky oddělí čárkou v jednom sloupci
			const popisy = items.map(item => item.popis || item.description || '').filter(Boolean).join(', ');
			const cenyBezDph = items.map(item => item.cena_bez_dph || item.priceExclVat || '').filter(Boolean).join(', ');
			const cenySdph = items.map(item => item.cena_s_dph || item.priceInclVat || '').filter(Boolean).join(', ');

			values.push(popisy, cenyBezDph, cenySdph);
		}

		// Generování CSV ve správném formátu
		const headerRow = headers.map(h => `"${h}"`).join(';');
		const valueRow = values.map(v => `"${v}"`).join(';');

		return `${headerRow}\n${valueRow}`;
	}, []);

	const toggleInlineCode = useCallback(() => {
		try {
			if (!notesRef.current) return;
			const sel = window.getSelection();
			if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
			const range = sel.getRangeAt(0);
			if (!notesRef.current.contains(range.startContainer)) return;
			let container = range.commonAncestorContainer;
			if (container.nodeType === 3) container = container.parentElement;
			const codeAncestor = container && container.closest ? container.closest('code') : null;
			if (codeAncestor && notesRef.current.contains(codeAncestor)) {
				const textNode = document.createTextNode(codeAncestor.textContent || '');
				codeAncestor.parentNode.replaceChild(textNode, codeAncestor);
				const newRange = document.createRange();
				newRange.setStart(textNode, 0); newRange.setEnd(textNode, textNode.nodeValue.length);
				sel.removeAllRanges(); sel.addRange(newRange);
			} else {
				const frag = range.extractContents();
				const codeEl = document.createElement('code');
				codeEl.appendChild(frag);
				range.insertNode(codeEl);
				const newRange = document.createRange(); newRange.selectNodeContents(codeEl);
				sel.removeAllRanges(); sel.addRange(newRange);
			}
			setNotesText(notesRef.current.innerHTML);
			notesRef.current.focus();
		} catch(_e) {}
	}, [notesRef, setNotesText]);

	const insertOrEditLink = useCallback(() => {
		try {
			if (!notesRef.current) return;
			const sel = window.getSelection();
			let selectedText = '';
			if (sel && sel.rangeCount && !sel.isCollapsed) selectedText = sel.toString();
			const url = window.prompt('Vložit URL (https://...)', 'https://');
			if (!url || !/^https?:\/\//i.test(url)) return;
			if (!selectedText) selectedText = url.replace(/^https?:\/\//i,'');
			const safeUrl = url.replace(/"/g, '&quot;');
			const safeText = selectedText.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch] || ch));
			document.execCommand('insertHTML', false, `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeText}</a>`);
			setNotesText(notesRef.current.innerHTML);
			notesRef.current.focus();
		} catch(_e) {}
	}, [notesRef, setNotesText]);

	const adjustSelectionInlineFont = useCallback((delta) => {
		try {
			if (!notesRef.current) return;
			const sel = window.getSelection();
			if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return; // nothing selected
			const range = sel.getRangeAt(0);
			if (!notesRef.current.contains(range.startContainer) || !notesRef.current.contains(range.endContainer)) return;
			// If selection inside existing span with data-fsz and selection fully covers its contents, adjust that span
			let targetSpan = null;
			if (range.startContainer === range.endContainer) {
				const parentEl = range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer;
				if (parentEl && parentEl.hasAttribute && parentEl.hasAttribute('data-fsz')) {
					targetSpan = parentEl;
				}
			}
			if (!targetSpan) {
				// wrap selection
				const wrapper = document.createElement('span');
				wrapper.setAttribute('data-fsz', '1.00');
				wrapper.style.display = 'inline';
				wrapper.style.lineHeight = 'inherit';
				wrapper.appendChild(range.extractContents());
				range.insertNode(wrapper);
				// reselect wrapper contents
				const newRange = document.createRange();
				newRange.selectNodeContents(wrapper);
				sel.removeAllRanges();
				sel.addRange(newRange);
				targetSpan = wrapper;
			}
			const cur = parseFloat(targetSpan.getAttribute('data-fsz') || '1');
			let next = +(cur + delta).toFixed(2);
			if (next < 0.50) next = 0.50;
			if (next > 2.50) next = 2.50;
			targetSpan.setAttribute('data-fsz', String(next));
			targetSpan.style.fontSize = next + 'em';
			setNotesText(notesRef.current.innerHTML);
			notesRef.current.focus();
		} catch(_e) { /* noop */ }
	}, [notesRef, setNotesText]);

	// Funkce pro vytvoření základní tabulky
	const insertTable = useCallback(() => {
		try {
			if (!notesRef.current) return;

			// Vytvoříme základní 3x2 tabulku s contentEditable buňkami + prázdné řádky před a za
			const tableHtml = `
				<p><br></p>
				<table style="border-collapse: collapse; width: 100%; margin: 10px 0; border: 2px solid #374151;">
					<tbody>
						<tr>
							<td contenteditable="true" style="border: 1px solid #6b7280; padding: 8px; background: #f9fafb; min-width: 120px; min-height: 30px;">Záhlaví 1</td>
							<td contenteditable="true" style="border: 1px solid #6b7280; padding: 8px; background: #f9fafb; min-width: 120px; min-height: 30px;">Záhlaví 2</td>
							<td contenteditable="true" style="border: 1px solid #6b7280; padding: 8px; background: #f9fafb; min-width: 120px; min-height: 30px;">Záhlaví 3</td>
						</tr>
						<tr>
							<td contenteditable="true" style="border: 1px solid #6b7280; padding: 8px; background: #ffffff; min-width: 120px; min-height: 30px;">Buňka 1</td>
							<td contenteditable="true" style="border: 1px solid #6b7280; padding: 8px; background: #ffffff; min-width: 120px; min-height: 30px;">Buňka 2</td>
							<td contenteditable="true" style="border: 1px solid #6b7280; padding: 8px; background: #ffffff; min-width: 120px; min-height: 30px;">Buňka 3</td>
						</tr>
					</tbody>
				</table>
				<div style="font-size: 0.75rem; color: #6b7280; margin-bottom: 10px;">
					<em>💡 Tip: Klikněte pravým tlačítkem na tabulku pro přidání/odebrání řádků a sloupců</em>
				</div>
				<p><br></p>
			`;

			document.execCommand('insertHTML', false, tableHtml);
			setNotesText(notesRef.current.innerHTML);
			notesRef.current.focus();
		} catch(e) {
		}
	}, [notesRef, setNotesText]);

	// Přidání kontextového menu pro tabulky
	useEffect(() => {
		if (!notesRef.current) return;

		let activeMenu = null; // Track active menu

		const handleContextMenu = (e) => {
			// Zkontroluj, jestli je pravý klik na tabulce
			const table = e.target.closest('table');
			if (!table) return;

			e.preventDefault();
			e.stopPropagation();

			const cell = e.target.closest('td');
			if (!cell) return;

			// Vytvoř kontextové menu
			const menu = document.createElement('div');
			menu.style.cssText = `
				position: fixed;
				z-index: 10000;
				background: white;
				border: 1px solid #ccc;
				border-radius: 4px;
				padding: 4px 0;
				box-shadow: 0 4px 12px rgba(0,0,0,0.15);
				font-size: 12px;
				min-width: 160px;
			`;
			menu.style.left = e.clientX + 'px';
			menu.style.top = e.clientY + 'px';

			const menuItems = [
				{ text: '➕ Přidat řádek výše', action: () => addRowAbove(cell) },
				{ text: '➕ Přidat řádek níže', action: () => addRowBelow(cell) },
				{ text: '➕ Přidat sloupec vlevo', action: () => addColumnLeft(cell) },
				{ text: '➕ Přidat sloupec vpravo', action: () => addColumnRight(cell) },
				{ text: '🗑️ Smazat řádek', action: () => deleteRow(cell) },
				{ text: '🗑️ Smazat sloupec', action: () => deleteColumn(cell) }
			];

			// Bezpečná funkce pro zavření menu
			const safeCloseMenu = () => {
				if (activeMenu && activeMenu.parentNode) {
					try {
						document.body.removeChild(activeMenu);
						activeMenu = null;
					} catch (e) {
						// Menu už bylo odstraněno
					}
				}
			};

			menuItems.forEach(item => {
				const menuItem = document.createElement('div');
				menuItem.textContent = item.text;
				menuItem.style.cssText = `
					padding: 6px 12px;
					cursor: pointer;
					color: #374151;
				`;
				menuItem.onmouseover = () => menuItem.style.background = '#f3f4f6';
				menuItem.onmouseout = () => menuItem.style.background = 'transparent';
				menuItem.onclick = (clickEvent) => {
					clickEvent.stopPropagation();
					item.action();
					safeCloseMenu();
					document.removeEventListener('click', closeMenu);
					setNotesText(notesRef.current.innerHTML);
				};
				menu.appendChild(menuItem);
			});

			document.body.appendChild(menu);

			// Zavři menu při kliknutí mimo
			const closeMenu = (clickEvent) => {
				if (activeMenu && !activeMenu.contains(clickEvent.target)) {
					safeCloseMenu();
					document.removeEventListener('click', closeMenu);
					activeMenu = null;
				}
			};

			activeMenu = menu; // Track the menu
			setTimeout(() => document.addEventListener('click', closeMenu), 0);
		};

		// Helper funkce pro manipulaci s tabulkou
		const addRowAbove = (cell) => {
			const row = cell.closest('tr');
			const newRow = row.cloneNode(true);
			newRow.querySelectorAll('td').forEach(td => {
				td.textContent = '';
				td.setAttribute('contenteditable', 'true');
			});
			row.parentNode.insertBefore(newRow, row);
		};

		const addRowBelow = (cell) => {
			const row = cell.closest('tr');
			const newRow = row.cloneNode(true);
			newRow.querySelectorAll('td').forEach(td => {
				td.textContent = '';
				td.setAttribute('contenteditable', 'true');
			});
			row.parentNode.insertBefore(newRow, row.nextSibling);
		};

		const addColumnLeft = (cell) => {
			const table = cell.closest('table');
			const cellIndex = Array.from(cell.parentNode.children).indexOf(cell);
			table.querySelectorAll('tr').forEach(row => {
				const newCell = document.createElement('td');
				newCell.setAttribute('contenteditable', 'true');
				newCell.style.cssText = cell.style.cssText;
				newCell.textContent = '';
				row.insertBefore(newCell, row.children[cellIndex]);
			});
		};

		const addColumnRight = (cell) => {
			const table = cell.closest('table');
			const cellIndex = Array.from(cell.parentNode.children).indexOf(cell);
			table.querySelectorAll('tr').forEach(row => {
				const newCell = document.createElement('td');
				newCell.setAttribute('contenteditable', 'true');
				newCell.style.cssText = cell.style.cssText;
				newCell.textContent = '';
				row.insertBefore(newCell, row.children[cellIndex + 1]);
			});
		};

		const deleteRow = (cell) => {
			const row = cell.closest('tr');
			const table = row.closest('table');
			if (table.querySelectorAll('tr').length > 1) {
				row.remove();
			}
		};

		const deleteColumn = (cell) => {
			const table = cell.closest('table');
			const cellIndex = Array.from(cell.parentNode.children).indexOf(cell);
			const rows = table.querySelectorAll('tr');
			if (rows[0] && rows[0].children.length > 1) {
				rows.forEach(row => {
					if (row.children[cellIndex]) {
						row.children[cellIndex].remove();
					}
				});
			}
		};

		notesRef.current.addEventListener('contextmenu', handleContextMenu);

		return () => {
			// Cleanup při unmount
			if (activeMenu && activeMenu.parentNode) {
				try {
					document.body.removeChild(activeMenu);
				} catch (e) {
					// Už bylo odstraněno
				}
			}
			if (notesRef.current) {
				notesRef.current.removeEventListener('contextmenu', handleContextMenu);
			}
		};
	}, [notesRef, setNotesText]);

	// (sync disabled) — previously auto-updated inserted TODO block; now snapshots remain static
	return (
		<PanelBase
			data-floating-panel="true"
			style={{ left: state.x, top: state.y, width: state.w, height: state.h, maxWidth: state.maximized ? 'none' : '94vw', maxHeight: state.maximized ? 'none' : '75vh', background:'linear-gradient(145deg, rgba(255,251,235,0.97), rgba(254,243,199,0.95))', border:'1px solid #facc15', color:'#3f3f0e', cursor:'default', zIndex: panelZ, boxShadow:'0 8px 24px rgba(146,64,14,0.25)', opacity: (isActive ? (opacityConfig?.engaged||0.95) : (hovered ? (opacityConfig?.hover||0.65) : (opacityConfig?.base||0.35))), transition:'opacity .22s ease' }}
			onMouseEnter={()=>onHoverEnter && onHoverEnter()}
			onMouseLeave={()=>onHoverLeave && onHoverLeave()}
			onMouseDown={(e)=> { if(!e.target.closest('button') && !e.target.closest('input') && !e.target.closest('textarea')) { if(!isActive) { onEngage && onEngage(); } else { bringFront(); } } }}
		>
			{edgeHandles(beginDrag,'notes')}
			<PanelHeader onMouseDown={(e)=> { if(e.target.closest('button')) return; beginDrag(e,'notes','move'); }} style={{cursor:'move', userSelect:'none', color:'#92400e'}}>
				<span style={{display:'inline-flex', alignItems:'center', gap:'.35rem', fontWeight:600}}>
					<FontAwesomeIcon icon={faStickyNote} style={{color:'#d97706'}} />
					<span style={{letterSpacing:'1px'}}>POZNÁMKY</span>
				</span>
				<div style={{display:'flex',gap:'.35rem'}}>
					<TinyBtn type="button" onMouseDown={e=>e.preventDefault()} onClick={() => { try { const sel = window.getSelection(); const hasSelection = sel && sel.rangeCount > 0 && !sel.isCollapsed && notesRef.current && notesRef.current.contains(sel.anchorNode); if (hasSelection) { const text = sel.toString(); const translated = translateToCz(text); if (translated && translated !== text) document.execCommand('insertText', false, translated); } else if (notesRef.current) { const walker = document.createTreeWalker(notesRef.current, NodeFilter.SHOW_TEXT, null); const toChange = []; while (walker.nextNode()) { toChange.push(walker.currentNode); } toChange.forEach(node => { const orig = node.nodeValue; const tr = translateToCz(orig); if (tr !== orig) node.nodeValue = tr; }); setNotesText(notesRef.current.innerHTML); } } catch {} }} title="Přeložit (EN→CZ)" style={{background:'#fef3c7', color:'#92400e', borderColor:'#fbbf24'}}><FontAwesomeIcon icon={faLanguage}/></TinyBtn>
					<TinyBtn type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>adjustFont(0.05)} disabled={font>=1.40} title="Zvětšit písmo" style={{background:'#fef3c7', color:'#92400e', borderColor:'#fbbf24', fontWeight:700, fontSize:'.55rem'}}>A+</TinyBtn>
					<TinyBtn type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>adjustFont(-0.05)} disabled={font<=0.60} title="Zmenšit písmo" style={{background:'#fef3c7', color:'#92400e', borderColor:'#fbbf24', fontWeight:700, fontSize:'.55rem'}}>A-</TinyBtn>
					<TinyBtn type="button" onMouseDown={e=>e.preventDefault()} onClick={handleClearAllClick} title="Vymazat vše" style={{background:'#fee2e2', color:'#b91c1c', borderColor:'#ef4444'}}><FontAwesomeIcon icon={faTrash}/></TinyBtn>
					{/* Window Controls */}
					<TinyBtn type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>minimizePanel('notes')} title="Minimalizovat" style={{background:'#e0e7ff', color:'#3730a3', borderColor:'#6366f1'}}><FontAwesomeIcon icon={faMinus} /></TinyBtn>
					<TinyBtn type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>maximizePanel('notes')} title={state.maximized ? "Obnovit" : "Maximalizovat"} style={{background:'#dcfce7', color:'#166534', borderColor:'#22c55e'}}><FontAwesomeIcon icon={state.maximized ? faWindowRestore : faSquare} /></TinyBtn>
					<TinyBtn type="button" onMouseDown={e=>e.preventDefault()} onClick={onClose} title="Zavřít" style={{background:'#fef3c7', color:'#92400e', borderColor:'#fbbf24', fontSize:'.9rem', fontWeight:700, lineHeight:'1', padding:'0 .45rem'}}>×</TinyBtn>
				</div>
			</PanelHeader>
			<RichNotesWrapper>
				{/* Tab navigation */}
				<TabsContainer>
					<TabButton
						active={activeTab === 'notes'}
						onClick={() => setActiveTab('notes')}
					>
						<FontAwesomeIcon icon={faStickyNote} />
						Poznámka
					</TabButton>
					<TabButton
						active={activeTab === 'transcription'}
						onClick={() => setActiveTab('transcription')}
					>
						<FontAwesomeIcon icon={faMicrophone} />
						Okamžitý přepis
					</TabButton>
				</TabsContainer>

				<NotesToolbar style={{background:'#fde68a', borderColor:'#fbbf24'}}>
					{/* Mikrofon - přes dva řádky */}
					<MicrophoneButton
						type="button"
						onClick={toggleRecording}
						isRecording={isRecording}
						title={isRecording
							? "Zastavit přepis řeči (Ctrl+Mezerník)\nVymazat a nový přepis (Ctrl+Shift+Mezerník)"
							: "Spustit přepis řeči na text (Ctrl+Mezerník)\nVymazat a nový přepis (Ctrl+Shift+Mezerník)"}
					>
						<FontAwesomeIcon icon={isRecording ? faStop : faMicrophone} />
					</MicrophoneButton>

					{/* Hlavní toolbar oblast */}
					<ToolbarMainArea>
						{/* UNDO/REDO na začátku */}
						<NotesTbBtn type="button" onMouseDown={e=>e.preventDefault()} title="Zpět (Ctrl+Z)" onClick={()=>document.execCommand('undo')}><FontAwesomeIcon icon={faUndo} /></NotesTbBtn>
						<NotesTbBtn type="button" onMouseDown={e=>e.preventDefault()} title="Znovu (Ctrl+Y)" onClick={()=>document.execCommand('redo')}><FontAwesomeIcon icon={faRedo} /></NotesTbBtn>
						<ToolbarSep aria-hidden="true" />
						{/* Local size first */}
						<NotesTbBtn type="button" onMouseDown={e=>e.preventDefault()} title="Zvětšit vybraný text (lokálně)" onClick={()=>adjustSelectionInlineFont(0.10)}>A+</NotesTbBtn>
						<NotesTbBtn type="button" onMouseDown={e=>e.preventDefault()} title="Zmenšit vybraný text (lokálně)" onClick={()=>adjustSelectionInlineFont(-0.10)}>A-</NotesTbBtn>
						<ToolbarSep aria-hidden="true" />
						{/* Text style + code + link */}
						<NotesTbBtn type="button" onMouseDown={e=>e.preventDefault()} title="Tučně (Ctrl+B)" onClick={()=>document.execCommand('bold')}>B</NotesTbBtn>
						<NotesTbBtn type="button" onMouseDown={e=>e.preventDefault()} title="Kurzíva (Ctrl+I)" onClick={()=>document.execCommand('italic')}>I</NotesTbBtn>
						<NotesTbBtn type="button" onMouseDown={e=>e.preventDefault()} title="Podtržení (Ctrl+U)" onClick={()=>document.execCommand('underline')}>U</NotesTbBtn>
						<NotesTbBtn type="button" onMouseDown={e=>e.preventDefault()} title="Inline kód" onClick={toggleInlineCode}><FontAwesomeIcon icon={faCode} /></NotesTbBtn>
						<NotesTbBtn type="button" onMouseDown={e=>e.preventDefault()} title="Vložit odkaz" onClick={insertOrEditLink}><FontAwesomeIcon icon={faLink} /></NotesTbBtn>
						<ToolbarSep aria-hidden="true" />
						{/* Table creation + Lists + indent combined */}
						<NotesTbBtn type="button" onMouseDown={e=>e.preventDefault()} title="Vložit tabulku (3x2)" onClick={insertTable}><FontAwesomeIcon icon={faBorderAll} /></NotesTbBtn>
						<NotesTbBtn type="button" onMouseDown={e=>e.preventDefault()} title="Odrážkový seznam" onClick={()=>document.execCommand('insertUnorderedList')}><FontAwesomeIcon icon={faListUl} /></NotesTbBtn>
					<NotesTbBtn type="button" onMouseDown={e=>e.preventDefault()} title="Číslovaný seznam" onClick={()=>document.execCommand('insertOrderedList')}>1.</NotesTbBtn>
					<NotesTbBtn type="button" onMouseDown={e=>e.preventDefault()} title="Odsadit (indent)" onClick={()=>document.execCommand('indent')}><FontAwesomeIcon icon={faIndent} /></NotesTbBtn>
					<NotesTbBtn type="button" onMouseDown={e=>e.preventDefault()} title="Zpět odsazení (outdent)" onClick={()=>document.execCommand('outdent')}><FontAwesomeIcon icon={faOutdent} /></NotesTbBtn>
					<ToolbarSep aria-hidden="true" />
					{/* Structure incl. clear */}
					<NotesTbBtn type="button" onMouseDown={e=>e.preventDefault()} title="Citace" onClick={()=>document.execCommand('formatBlock', false, 'blockquote')}>❝</NotesTbBtn>
					<NotesTbBtn type="button" onMouseDown={e=>e.preventDefault()} title="Odstavec" onClick={()=>document.execCommand('formatBlock', false, 'p')}>¶</NotesTbBtn>
					<NotesTbBtn type="button" onMouseDown={e=>e.preventDefault()} title="Malé nadpis" onClick={()=>document.execCommand('formatBlock', false, 'h3')}>H3</NotesTbBtn>
					<NotesTbBtn type="button" onMouseDown={e=>e.preventDefault()} title="Čára" onClick={()=>document.execCommand('insertHorizontalRule')}>─</NotesTbBtn>
					<NotesTbBtn type="button" onMouseDown={e=>e.preventDefault()} title="Vymazat formátování (výběr / blok)" onClick={()=>document.execCommand('removeFormat')}>FX</NotesTbBtn>
					<ToolbarSep aria-hidden="true" />
					{/* Tasks group at end (no forced break) */}
					<NotesTbBtn type="button" onMouseDown={e=>e.preventDefault()} title="Vložit šablonu úkolů" onClick={() => { const tmpl = `<h3>Úkoly</h3><ul><li>[ ] První úkol</li><li>[ ] Druhý úkol</li><li>[ ] Třetí úkol</li></ul><p><em>Pozn.: nahraďte text v hranatých závorkách za ✔ po dokončení.</em></p>`; document.execCommand('insertHTML', false, tmpl); }}>T+</NotesTbBtn>
					<NotesTbBtn type="button" onMouseDown={e=>e.preventDefault()} title="Vložit aktuální TODO snapshot (statické)" onClick={() => { try { if (!notesRef.current) return; const sel = window.getSelection(); let range = sel && sel.rangeCount ? sel.getRangeAt(0) : null; const selectionInside = range && notesRef.current.contains(range.startContainer);
						if (!selectionInside) { notesRef.current.focus(); const r = document.createRange(); r.selectNodeContents(notesRef.current); r.collapse(false); if (sel) { sel.removeAllRanges(); sel.addRange(r); } }
						const html = `<div class=\"todo-snapshot\" data-inserted-ts=\"${Date.now()}\">${buildTodoHtml()}</div>`; document.execCommand('insertHTML', false, html); setNotesText(notesRef.current.innerHTML); notesRef.current.focus(); } catch(err) { /* noop */ } }}><FontAwesomeIcon icon={faTasks} /></NotesTbBtn>
					<NotesTbBtn type="button" onMouseDown={e=>e.preventDefault()} title="Vytěžit rozpracovaný formulář do poznámky (HTML tabulka)" onClick={async () => { try { if (!notesRef.current) return; const sel = window.getSelection(); let range = sel && sel.rangeCount ? sel.getRangeAt(0) : null; const selectionInside = range && notesRef.current.contains(range.startContainer);
						if (!selectionInside) { notesRef.current.focus(); const r = document.createRange(); r.selectNodeContents(notesRef.current); r.collapse(false); if (sel) { sel.removeAllRanges(); sel.addRange(r); } }
						const html = `<p><br></p><div class=\"form-export-snapshot\" data-inserted-ts=\"${Date.now()}\">${await buildFormDataHtml()}</div><p><br></p>`; document.execCommand('insertHTML', false, html); setNotesText(notesRef.current.innerHTML); notesRef.current.focus(); } catch(err) {  } }}><FontAwesomeIcon icon={faTable} /></NotesTbBtn>
					<div style={{position:'relative'}}>
						<button type="button" title="Barvy / zvýraznění" onClick={()=> setShowColors(v=>!v)} style={{width:'32px', height:'28px', fontSize:'0.55rem', border:'1px solid #f4c542', background: showColors ? '#fef3c7' : '#fff8e1', color:'#92400e', borderRadius:'6px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600}}>🎨</button>
						{showColors && (
							<div style={{position:'absolute', top:'110%', left:0, zIndex:50, background:'#fffef6', border:'1px solid #f4c542', padding:'.45rem .5rem .55rem', borderRadius:'8px', display:'flex', flexDirection:'column', gap:'.45rem', boxShadow:'0 6px 18px rgba(146,64,14,0.25)', minWidth:'220px'}}>
								<div style={{display:'flex', flexWrap:'wrap', gap:'.3rem'}}>
									{NOTES_COLOR_PALETTE.slice(0,12).map(c => (
										<button key={c} type="button" title={"Barva textu " + c} onClick={()=>{ document.execCommand('foreColor', false, c); setShowColors(false); }} style={{width:'18px', height:'18px', border:'1px solid #f4c542', borderRadius:'4px', background:c, cursor:'pointer', padding:0}} />
									))}
								</div>
								<div style={{display:'flex', flexWrap:'wrap', gap:'.3rem'}}>
									{NOTES_COLOR_PALETTE.slice(12,24).map(c => (
										<button key={c} type="button" title={"Zvýraznění " + c} onClick={()=>{ document.execCommand('hiliteColor', false, c); setShowColors(false); }} style={{width:'18px', height:'18px', border:'1px solid #f4c542', borderRadius:'4px', background:c, cursor:'pointer', padding:0, boxShadow:'0 0 0 1px rgba(0,0,0,0.15) inset'}} />
									))}
								</div>
								<div style={{display:'flex', gap:'.35rem', flexWrap:'wrap'}}>
									<button type="button" title="Vlastní barva textu" onClick={()=>{ const inp = document.createElement('input'); inp.type='color'; inp.style.position='fixed'; inp.style.left='-9999px'; document.body.appendChild(inp); inp.addEventListener('input', ()=>{ document.execCommand('foreColor', false, inp.value); }); inp.click(); setTimeout(()=>inp.remove(), 4000); }} style={{flex:'1 1 auto', minWidth:'80px', fontSize:'0.55rem', border:'1px solid #f4c542', background:'#fff8e1', color:'#92400e', borderRadius:'5px', cursor:'pointer', padding:'.3rem .4rem'}}>Text…</button>
									<button type="button" title="Vlastní zvýraznění" onClick={()=>{ const inp = document.createElement('input'); inp.type='color'; inp.style.position='fixed'; inp.style.left='-9999px'; document.body.appendChild(inp); inp.addEventListener('input', ()=>{ document.execCommand('hiliteColor', false, inp.value); }); inp.click(); setTimeout(()=>inp.remove(), 4000); }} style={{flex:'1 1 auto', minWidth:'80px', fontSize:'0.55rem', border:'1px solid #f4c542', background:'#fff8e1', color:'#92400e', borderRadius:'5px', cursor:'pointer', padding:'.3rem .4rem'}}>Zvýraznit…</button>
									<button type="button" title="Reset barev" onClick={()=>{ document.execCommand('foreColor', false, '#1f2937'); document.execCommand('hiliteColor', false, 'transparent'); setShowColors(false); }} style={{flex:'0 0 auto', fontSize:'0.55rem', border:'1px solid #f4c542', background:'#fef3c7', color:'#92400e', borderRadius:'5px', cursor:'pointer', padding:'.3rem .5rem'}}>Reset</button>
								</div>
							</div>
						)}
					</div>
					</ToolbarMainArea>
				</NotesToolbar>

				{/* OBA editory vždy v DOM, skryté pomocí display:none */}
				<EditorsContainer>
					<NotesEditable
						data-placeholder="Rychlé poznámky..."
						contentEditable
						suppressContentEditableWarning
						style={{
							fontSize:`${font}rem`,
							color:'#0b1730',
							display: activeTab === 'notes' ? 'block' : 'none'
						}}
						ref={notesRef}
						onInput={onInput}
						onPaste={onPaste}
					/>
					<NotesEditable
						data-placeholder="Mluvte do mikrofonu pro okamžitý přepis..."
						contentEditable
						suppressContentEditableWarning
						style={{
							fontSize:`${font}rem`,
							color:'#0b1730',
							display: activeTab === 'transcription' ? 'block' : 'none'
						}}
						ref={transcriptionRef}
						onInput={(e) => {
							if (transcriptionRef.current) {
								setTranscriptionText(transcriptionRef.current.innerHTML);
							}
						}}
						onPaste={(e) => {
							e.preventDefault();
							const text = e.clipboardData.getData('text/plain');
							document.execCommand('insertText', false, text);
						}}
					/>
				</EditorsContainer>
			</RichNotesWrapper>
				<StatusBar>
					<StatusItem>
						<FontAwesomeIcon icon={faClock} />
						<span>Auto save: 15s</span>
					</StatusItem>
					<StatusItem>
						<span>Uloženo: {formatTime(autoSaveStatus?.notes?.lastSaved)}</span>
					</StatusItem>
					<div style={{display: 'flex', gap: '0.3rem'}}>
						<StatusButton
							onClick={refreshFromServer}
							disabled={serverSyncStatus?.notes?.syncing}
							title="Aktualizovat z databáze"
						>
							<FontAwesomeIcon icon={faSync} spin={serverSyncStatus?.notes?.syncing} />
						</StatusButton>
						<StatusButton
							onClick={manualSaveNotes}
							title="Uložit do databáze"
						>
							<FontAwesomeIcon icon={faSave} />
						</StatusButton>
					</div>
				</StatusBar>

			{/* Confirm Dialog pro smazání poznámek */}
			{showConfirmClear && ReactDOM.createPortal(
				<ConfirmOverlay onClick={() => setShowConfirmClear(false)}>
					<ConfirmDialogBox onClick={e => e.stopPropagation()}>
						<ConfirmHeader>
							<ConfirmIcon>
								<FontAwesomeIcon icon={faTrash} />
							</ConfirmIcon>
							<ConfirmTitle>Smazat všechny poznámky</ConfirmTitle>
						</ConfirmHeader>

						<ConfirmContent>
							<p style={{ marginBottom: '1rem' }}>
								<strong style={{ color: '#dc2626' }}>⚠️ POZOR!</strong>
							</p>
							<p>
								Opravdu chcete smazat <strong>VŠECHNY poznámky</strong>?
							</p>
							<p style={{ marginTop: '1rem', fontWeight: 600, color: '#dc2626' }}>
								Tato akce je nevratná!
							</p>
						</ConfirmContent>

						<ConfirmActions>
							<ConfirmButton onClick={() => setShowConfirmClear(false)}>
								Zrušit
							</ConfirmButton>
							<ConfirmButton $variant="primary" onClick={handleConfirmClear}>
								Ano, smazat vše
							</ConfirmButton>
						</ConfirmActions>
					</ConfirmDialogBox>
				</ConfirmOverlay>,
				document.body
			)}

			{/* 🎤 Voice Recognition Browser Support Dialog */}
			{showVoiceUnsupportedDialog && ReactDOM.createPortal(
				<VoiceUnsupportedOverlay onClick={() => setShowVoiceUnsupportedDialog(false)}>
					<VoiceUnsupportedDialog onClick={e => e.stopPropagation()}>
						<VoiceUnsupportedHeader>
							<VoiceUnsupportedIcon>
								<FontAwesomeIcon icon={faMicrophone} />
							</VoiceUnsupportedIcon>
							<VoiceUnsupportedTitle>
								Hlasové ovládání není podporováno
							</VoiceUnsupportedTitle>
						</VoiceUnsupportedHeader>

						<VoiceUnsupportedContent>
							<p>
								<strong>Váš prohlížeč bohužel nepodporuje Web Speech API</strong>, které je potřebné
								pro hlasový přepis poznámek.
							</p>

							<p>
								Tato funkce je v současnosti dostupná pouze v některých prohlížečích:
							</p>

							<ul>
								<li><strong>Google Chrome</strong> (doporučeno)</li>
								<li><strong>Microsoft Edge</strong></li>
								<li><strong>Opera</strong></li>
							</ul>

							<p>
								Pokud chcete používat hlasový přepis do poznámek,
								prosím přepněte na jeden z podporovaných prohlížečů.
							</p>

							<p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '1.5rem' }}>
								💡 <strong>Tip:</strong> Všechny ostatní funkce aplikace fungují bez omezení
								i v aktuálním prohlížeči.
							</p>
						</VoiceUnsupportedContent>

						<VoiceUnsupportedActions>
							<VoiceUnsupportedButton
								onClick={() => setShowVoiceUnsupportedDialog(false)}
								$primary
							>
								Rozumím
							</VoiceUnsupportedButton>
						</VoiceUnsupportedActions>
					</VoiceUnsupportedDialog>
				</VoiceUnsupportedOverlay>,
				document.body
			)}
		</PanelBase>
	);
};
