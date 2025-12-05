import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { secureStorage, migrateFloatingPanelsToSecure } from '../utils/secureStorage.js';
import { NotesAPI } from '../services/NotesAPI';
import {
  onTabSyncMessage,
  BROADCAST_TYPES,
  broadcastTodoUpdated,
  broadcastNotesUpdated
} from '../utils/tabSync';

/**
 * Centralized state + behavior for TODO / Notes / Notifications floating panels.
 * Keeps Layout cleaner. Persists per-user panel sizes/positions & font sizes.
 * 🔒 BEZPEČNOST: Citlivý obsah (TODO, poznámky, chat) je šifrován
 * 🌐 SERVER API: Podporuje synchronizaci s novými /api.eeo/load a /api.eeo/save endpointy
 * 📡 BROADCAST: Multi-tab synchronization přes Broadcast Channel API
 */
export function useFloatingPanels(user_id, isLoggedIn, token = null, username = null) {
  // Unified storage key (fallback to 'anon' when not logged in)
  const storageId = user_id || 'anon';

  // API instance pro server komunikaci
  const [notesAPI, setNotesAPI] = useState(null);

  // Inicializace API při změně credentials
  useEffect(() => {
    if (token && username && user_id && isLoggedIn) {
      try {
        const api = new NotesAPI(token, username, user_id);
        setNotesAPI(api);
      } catch (error) {
        // console.warn('Nepodařilo se inicializovat NotesAPI:', error);
        setNotesAPI(null);
      }
    } else {
      setNotesAPI(null);
    }
  }, [token, username, user_id, isLoggedIn]);

  // 🔒 Migrace na bezpečné úložiště při prvním načtení
  useEffect(() => {
    if (user_id && isLoggedIn) {
      migrateFloatingPanelsToSecure(user_id);
    }
  }, [user_id, isLoggedIn]);

  // Helper pro načtení font velikosti s validací (DEFINICE PŘED POUŽITÍM)
  const loadFontSize = useCallback((key, defaultSize) => {
    try {
      const value = parseFloat(localStorage.getItem(`${key}_${storageId}`));
      // Validace rozumných hodnot (0.5 - 2.0)
      if (isNaN(value) || value < 0.5 || value > 2.0) {
        return defaultSize;
      }
      return value;
    } catch {
      return defaultSize;
    }
  }, [storageId]);

  // Aktualizace font velikostí při změně uživatele (storageId)
  useEffect(() => {
    // Načti font velikosti pro aktuální storageId
    const newTodoFont = loadFontSize('layout_tasks_font', 0.85);
    const newNotesFont = loadFontSize('layout_notes_font', 0.80);
    const newNotifFont = loadFontSize('layout_notif_font', 0.70);
    const newChatFont = loadFontSize('layout_chat_font', 0.80);

    setTodoFont(newTodoFont);
    setNotesFont(newNotesFont);
    setNotifFont(newNotifFont);
    setChatFont(newChatFont);
  }, [storageId, loadFontSize]);

  // Panel open flags
  const [todoOpen, setTodoOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // loadFontSize je již definováno výše

  // Panel fonts s bezpečnou inicializací
  const [todoFont, setTodoFont] = useState(() => {
    const storageKey = user_id ? `layout_tasks_font_${user_id}` : 'layout_tasks_font_anon';
    try {
      const value = parseFloat(localStorage.getItem(storageKey));
      return (isNaN(value) || value < 0.5 || value > 2.0) ? 0.85 : value;
    } catch { return 0.85; }
  });

  const [notesFont, setNotesFont] = useState(() => {
    const storageKey = user_id ? `layout_notes_font_${user_id}` : 'layout_notes_font_anon';
    try {
      const value = parseFloat(localStorage.getItem(storageKey));
      return (isNaN(value) || value < 0.5 || value > 2.0) ? 0.80 : value;
    } catch { return 0.80; }
  });

  const [notifFont, setNotifFont] = useState(() => {
    const storageKey = user_id ? `layout_notif_font_${user_id}` : 'layout_notif_font_anon';
    try {
      const value = parseFloat(localStorage.getItem(storageKey));
      return (isNaN(value) || value < 0.5 || value > 2.0) ? 0.70 : value;
    } catch { return 0.70; }
  });

  const [chatFont, setChatFont] = useState(() => {
    const storageKey = user_id ? `layout_chat_font_${user_id}` : 'layout_chat_font_anon';
    try {
      const value = parseFloat(localStorage.getItem(storageKey));
      return (isNaN(value) || value < 0.5 || value > 2.0) ? 0.80 : value;
    } catch { return 0.80; }
  });

  const clamp = (v,min,max) => Math.min(max, Math.max(min, v));
  const adjTodo = (d)=> setTodoFont(f=> clamp(parseFloat((f + d).toFixed(2)), 0.55, 1.30));
  const adjNotes = (d)=> setNotesFont(f=> clamp(parseFloat((f + d).toFixed(2)), 0.60, 1.20)); // Sn\u00ed\u017een maximum z 1.40 na 1.20
  const adjNotif = (d)=> setNotifFont(f=> clamp(parseFloat((f + d).toFixed(2)), 0.55, 1.20));
  const adjChat = (d)=> setChatFont(f=> clamp(parseFloat((f + d).toFixed(2)), 0.60, 1.40));

  // Helper sync loaders (so panel otevření hned ukáže persistovaná data)
  const loadStoredTasks = (sid) => {
    try {
      const tk = localStorage.getItem(`layout_tasks_${sid}`);
      if (!tk) return [];
      let arr = JSON.parse(tk) || [];
      let changed = false;
      arr = arr.map(t => {
        let updated = { ...t };
        // Migrace: přidat createdAt pokud chybí
        if (!updated.createdAt) {
          changed = true;
          updated.createdAt = (typeof t.id === 'number' && t.id > 1600000000000 ? t.id : Date.now());
        }
        // Migrace: přidat priority pokud chybí
        if (!updated.priority) {
          changed = true;
          updated.priority = 'normal';
        }
        return updated;
      });
      if (changed) { try { localStorage.setItem(`layout_tasks_${sid}`, JSON.stringify(arr)); } catch {} }
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  };
  const loadStoredNotes = (sid) => {
    try {
      const nk = localStorage.getItem(`layout_notes_${sid}`);
      if (!nk) return { notes: '', transcription: '' };

      // console.log('🔍 [loadStoredNotes] Raw localStorage:', nk.substring(0, 200));

      // Zkus parsovat jako JSON (nový formát)
      try {
        const parsed = JSON.parse(nk);
        if (parsed && typeof parsed === 'object' && 'notes' in parsed) {
          // console.log('✅ [loadStoredNotes] Parsed as new JSON format');

          // 🔧 MIGRACE: Zkontroluj, jestli notes content je sám JSON string (chyba v minulosti)
          if (parsed.notes && typeof parsed.notes === 'string') {
            try {
              const innerParsed = JSON.parse(parsed.notes);
              if (innerParsed && typeof innerParsed === 'object' && 'notes' in innerParsed) {
                // Dvojitě vnořený JSON! Extrahuj vnitřní
                return {
                  notes: innerParsed.notes || '',
                  transcription: innerParsed.transcription || ''
                };
              }
            } catch {
              // Není double-nested JSON, pokračuj normálně
            }
          }

          return {
            notes: parsed.notes || '',
            transcription: parsed.transcription || ''
          };
        }
      } catch (parseError) {
        // Není JSON nebo je špatně formátovaný
        // console.log('⚠️ [loadStoredNotes] Failed to parse as JSON, using fallback:', parseError.message);
      }

      // Fallback: starý formát (prostý string) - považuj za notes
      // console.log('📝 [loadStoredNotes] Using old format (plain string)');

      // 🔧 MIGRACE: Pokud starý formát vypadá jako JSON, zkus ho parsovat
      if (nk.trim().startsWith('{') && nk.includes('"notes"')) {
        try {
          const parsed = JSON.parse(nk);
          if (parsed && typeof parsed === 'object' && 'notes' in parsed) {
            return {
              notes: parsed.notes || '',
              transcription: parsed.transcription || ''
            };
          }
        } catch {
          // Není platný JSON i když vypadá jako JSON
        }
      }

      return { notes: nk, transcription: '' };
    } catch (err) {
      return { notes: '', transcription: '' };
    }
  };
  const loadStoredChatMessages = (sid) => {
    try {
      const ck = localStorage.getItem(`chat_data_${sid}`);
      if (ck) {
        return JSON.parse(ck);
      } else {
        // Default welcome message for new users
        return [{
          id: Date.now(),
          text: 'Vítejte v chatu',
          sender: 'system',
          timestamp: new Date().toISOString(),
          read: false
        }];
      }
    } catch {
      return [{
        id: Date.now(),
        text: 'Vítejte v chatu',
        sender: 'system',
        timestamp: new Date().toISOString(),
        read: false
      }];
    }
  };
  // Tasks (init sync)
  const [tasks, setTasks] = useState(() => loadStoredTasks(storageId));
  const [newTask, setNewTask] = useState('');
  // Notes (init sync)
  const [notesText, setNotesText] = useState(() => {
    const loaded = loadStoredNotes(storageId);
    // console.log('🔍 [notesText init] loaded:', loaded);
    // console.log('🔍 [notesText init] loaded.notes type:', typeof loaded.notes, loaded.notes);
    // Initialize notes from localStorage - zajisti že je to string
    const notesValue = loaded.notes;
    if (typeof notesValue !== 'string') {
      return '';
    }
    return notesValue;
  });
  const notesRef = useRef(null);
  const [showNotesColors, setShowNotesColors] = useState(false);

  // State pro Okamžitý přepis (transcription tab)
  const [transcriptionText, setTranscriptionText] = useState(() => {
    const loaded = loadStoredNotes(storageId);
    // console.log('🔍 [transcriptionText init] loaded.transcription type:', typeof loaded.transcription, loaded.transcription);
    const transcriptionValue = loaded.transcription;
    if (typeof transcriptionValue !== 'string') {
      return '';
    }
    return transcriptionValue;
  });

  // Server synchronization states
  const [serverSyncStatus, setServerSyncStatus] = useState({
    notes: { syncing: false, lastSync: null, error: null },
    todo: { syncing: false, lastSync: null, error: null }
  });

  // Status bar states pro auto-save countdown a last saved info
  const [autoSaveStatus, setAutoSaveStatus] = useState({
    notes: { countdown: 0, lastSaved: null, pendingSave: false },
    todo: { countdown: 0, lastSaved: null, pendingSave: false }
  });

  // Database IDs pro TODO a NOTES (pro UPDATE operace)
  const [todoID, setTodoID] = useState(null);
  const [notesID, setNotesID] = useState(null);

  // Flag pro potlačení auto-save během DELETE operací
  const deletingRef = useRef(false);

  // Notifications
  const [notifications, setNotifications] = useState([]);

  // Chat
  const [chatMessages, setChatMessages] = useState(() => loadStoredChatMessages(storageId));
  const [newChatMessage, setNewChatMessage] = useState('');

  // Panel positions/sizes
  const loadPanelState = useCallback((key, def) => {
    try {
      const raw = localStorage.getItem(`panel_state_${storageId}_${key}`);
      if (!raw) return def;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && typeof parsed.w === 'number') {
        // Migrace na větší velikosti - pokud je uložená velikost menší než nový default, použij default
        const needsUpdate = parsed.w < def.w || parsed.h < def.h;
        if (needsUpdate) {
          return { ...parsed, w: Math.max(parsed.w, def.w), h: Math.max(parsed.h, def.h) };
        }
        return parsed;
      }
      return def;
    } catch { return def; }
  }, [storageId]);
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1600;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
  const [todoPanelState, setTodoPanelState] = useState(() => ({
    ...loadPanelState('todo', { x: vw - 500, y: vh - 470, w: 500, h: 427 }),
    minimized: false, maximized: false, savedState: null
  }));
  const [notesPanelState, setNotesPanelState] = useState(() => ({
    ...loadPanelState('notes', { x: vw - 850, y: vh - 530, w: 550, h: 480 }),
    minimized: false, maximized: false, savedState: null
  }));
  const [notifPanelState, setNotifPanelState] = useState(() => ({
    ...loadPanelState('notif', { x: vw - 360, y: 182, w: 360, h: 340 }),
    minimized: false, maximized: false, savedState: null
  }));
  const [chatPanelState, setChatPanelState] = useState(() => ({
    ...loadPanelState('chat', { x: vw - 480, y: vh - 583, w: 480, h: 533 }),
    minimized: false, maximized: false, savedState: null
  }));

  // z-index management
  const [panelZ, setPanelZ] = useState({ todo: 4101, notes: 4102, notif: 4103, chat: 4104 });
  const zCounterRef = useRef(4104);
  const bringPanelFront = useCallback((key) => {
    setPanelZ(prev => { zCounterRef.current += 1; return { ...prev, [key]: zCounterRef.current }; });
  }, []);

  // ⚡ THROTTLED persistence - Omezeno na max 1 zápis za 500ms (fix violation spam)
  const fontSaveTimeoutRef = useRef({});
  const dataSaveTimeoutRef = useRef({});

  useEffect(()=>{
    if (fontSaveTimeoutRef.current.todo) clearTimeout(fontSaveTimeoutRef.current.todo);
    fontSaveTimeoutRef.current.todo = setTimeout(() => {
      try { localStorage.setItem(`layout_tasks_font_${storageId}`, String(todoFont)); } catch{}
    }, 500);
  }, [todoFont, storageId]);

  useEffect(()=>{
    if (fontSaveTimeoutRef.current.notes) clearTimeout(fontSaveTimeoutRef.current.notes);
    fontSaveTimeoutRef.current.notes = setTimeout(() => {
      try { localStorage.setItem(`layout_notes_font_${storageId}`, String(notesFont)); } catch{}
    }, 500);
  }, [notesFont, storageId]);

  useEffect(()=>{
    if (fontSaveTimeoutRef.current.notif) clearTimeout(fontSaveTimeoutRef.current.notif);
    fontSaveTimeoutRef.current.notif = setTimeout(() => {
      try { localStorage.setItem(`layout_notif_font_${storageId}`, String(notifFont)); } catch{}
    }, 500);
  }, [notifFont, storageId]);

  useEffect(()=>{
    if (fontSaveTimeoutRef.current.chat) clearTimeout(fontSaveTimeoutRef.current.chat);
    fontSaveTimeoutRef.current.chat = setTimeout(() => {
      try { localStorage.setItem(`layout_chat_font_${storageId}`, String(chatFont)); } catch{}
    }, 500);
  }, [chatFont, storageId]);

  useEffect(()=>{
    if (dataSaveTimeoutRef.current.notif) clearTimeout(dataSaveTimeoutRef.current.notif);
    dataSaveTimeoutRef.current.notif = setTimeout(() => {
      try { localStorage.setItem(`notif_data_${storageId}`, JSON.stringify(notifications)); } catch{}
    }, 500);
  }, [notifications, storageId]);

  useEffect(()=>{
    if (dataSaveTimeoutRef.current.chat) clearTimeout(dataSaveTimeoutRef.current.chat);
    dataSaveTimeoutRef.current.chat = setTimeout(() => {
      try { localStorage.setItem(`chat_data_${storageId}`, JSON.stringify(chatMessages)); } catch{}
    }, 500);
  }, [chatMessages, storageId]);
  // --- Notes debounced autosave (robust w/ meta + hash + error) ---
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesLastSaved, setNotesLastSaved] = useState(()=>{
    try { const metaRaw = localStorage.getItem(`layout_notes_meta_${storageId}`); if (metaRaw) { const meta = JSON.parse(metaRaw); if (meta && meta.ts) return meta.ts; } } catch {}
    return null;
  });
  const [notesSaveError, setNotesSaveError] = useState(null);
  const notesDebounceRef = useRef(null);
  const notesBroadcastDebounceRef = useRef(null); // ⏱️ Samostatný debounce pro broadcast (3-5s)

  // 📡 Debounced broadcast funkce pro NOTES (volá se až po 4 sekundách nečinnosti)
  const debouncedNotesBroadcast = useCallback((notesContent, transcriptionContent) => {
    // Zruš předchozí timeout
    if (notesBroadcastDebounceRef.current) {
      clearTimeout(notesBroadcastDebounceRef.current);
    }

    // Nastav nový timeout (4 sekundy)
    notesBroadcastDebounceRef.current = setTimeout(() => {
      if (user_id) {
        // console.log('📡 [NOTES BROADCAST] Sending after 4s of inactivity');
        broadcastNotesUpdated(user_id, notesContent, transcriptionContent);
      }
      notesBroadcastDebounceRef.current = null;
    }, 4000); // 4 sekundy nečinnosti
  }, [user_id]);

  const lastSavedContentRef = useRef(() => {
    // Načti z localStorage a zkontroluj formát
    try {
      const stored = localStorage.getItem(`layout_notes_${storageId}`);
      if (!stored) return '';

      // Zkus parsovat jako JSON - pokud se podaří, vrať to zpět jako JSON string
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && 'notes' in parsed) {
          // Je to už nový formát - vrať jako JSON string
          return stored;
        }
      } catch {
        // Není JSON - starý formát
      }

      // Starý formát (plain text) - převeď na nový JSON formát
      const combinedData = {
        notes: stored,
        transcription: '',
        lastModified: Date.now()
      };
      return JSON.stringify(combinedData);
    } catch {
      return '';
    }
  });
  // ensure ref is string not function (above pattern) -> normalize
  if (typeof lastSavedContentRef.current === 'function') {
    try { lastSavedContentRef.current = lastSavedContentRef.current(); } catch { lastSavedContentRef.current = ''; }
  }
  const computeHash = (str='') => {
    let h = 0, i = 0, len = str.length; while (i < len) { h = (h<<5) - h + str.charCodeAt(i++) | 0; } return h;
  };
  const persistNotes = useCallback(async (immediate=false, forceContent=null, forceTranscription=null) => {
    if (notesDebounceRef.current) {
      clearTimeout(notesDebounceRef.current);
      notesDebounceRef.current = null;
    }

    const exec = async () => {
      // Pokud právě probíhá DELETE operace, přeskočíme auto-save
      if (deletingRef.current) {

        return;
      }

      const notesContent = forceContent !== null ? forceContent : (notesText || '');
      const transcriptionContent = forceTranscription !== null ? forceTranscription : (transcriptionText || '');

      // Strukturovaný JSON objekt pro DB
      const combinedData = {
        notes: notesContent,
        transcription: transcriptionContent,
        lastModified: Date.now()
      };

      const combinedJSON = JSON.stringify(combinedData);

      if (combinedJSON === lastSavedContentRef.current) { // no change
        setNotesSaveError(null);
        return;
      }

      try {
        setNotesSaving(true);
        setNotesSaveError(null);

        // Vždy uložit do localStorage (fallback + rychlá cache)
        localStorage.setItem(`layout_notes_${storageId}`, combinedJSON);
        // Backup pro F5 refresh recovery
        localStorage.setItem(`layout_notes_backup_${storageId}`, combinedJSON);
        // 🔒 Timestamp pro detekci čerstvosti dat
        localStorage.setItem(`layout_notes_timestamp_${storageId}`, String(Date.now()));
        const meta = { ts: Date.now(), hash: computeHash(combinedJSON), len: combinedJSON.length };
        localStorage.setItem(`layout_notes_meta_${storageId}`, JSON.stringify(meta));

        // Pokud máme API připojení, uložit i na server
        if (notesAPI && isLoggedIn) {
          try {
            setServerSyncStatus(prev => ({
              ...prev,
              notes: { ...prev.notes, syncing: true, error: null }
            }));

            const saveResult = await notesAPI.saveNotes(combinedJSON, notesID);

            // Uložit ID z response pro budoucí UPDATE operace
            if (saveResult && saveResult.ID) {
              setNotesID(saveResult.ID);

            } else if (saveResult && saveResult.id) {
              setNotesID(saveResult.id);

            } else {

            }

            setServerSyncStatus(prev => ({
              ...prev,
              notes: { syncing: false, lastSync: Date.now(), error: null }
            }));

          } catch (serverError) {
            // console.warn('Chyba při ukládání poznámek na server:', serverError);
            setServerSyncStatus(prev => ({
              ...prev,
              notes: { syncing: false, lastSync: prev.notes.lastSync, error: serverError.message }
            }));
            // localStorage uložení proběhlo, takže není to kritická chyba
          }
        }

        lastSavedContentRef.current = combinedJSON;
        setNotesLastSaved(meta.ts);
        setNotesSaving(false);

        // Aktualizuj status bar timestamp
        setAutoSaveStatus(prev => ({
          ...prev,
          notes: { ...prev.notes, lastSaved: meta.ts }
        }));

        // 📡 BROADCAST: Notifikuj ostatní záložky o změně (DEBOUNCED - 4s delay)
        debouncedNotesBroadcast(notesContent, transcriptionContent);

      } catch (err) {
        // Lokální persist selhalo
        setNotesSaving(false);
        setNotesSaveError(err?.message || 'Nelze uložit');
        // console.error('Chyba při ukládání poznámek:', err);
      }
    };

    if (immediate) return await exec();
    notesDebounceRef.current = setTimeout(exec, 15000); // 15 sekund debounce - uložení až po odmlčení
  }, [notesText, transcriptionText, storageId, notesAPI, isLoggedIn, notesID, debouncedNotesBroadcast]);

  // Auto-save při změně notesText nebo transcriptionText
  useEffect(() => {
    persistNotes(false);
    return () => {
      if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
    };
  }, [notesText, transcriptionText, persistNotes]);
  useEffect(()=>{
    const saveTask = async () => {
      try {
        // Vždy uložit do localStorage jako backup (pro F5 refresh)
        localStorage.setItem(`layout_tasks_backup_${storageId}`, JSON.stringify(tasks));
        // 🔒 Timestamp pro detekci čerstvosti dat
        localStorage.setItem(`layout_tasks_timestamp_${storageId}`, String(Date.now()));
        await secureStorage.setItem(`layout_tasks_${storageId}`, JSON.stringify(tasks));
      } catch(e) {
        // console.warn('Nepodařilo se uložit úkoly:', e);
      }
    };
    saveTask();
  }, [tasks, storageId]);

  // Definice flush funkcí PRED useEffecty
  const flushNotesSave = useCallback(async () => {
    // Use current DOM content if available, else state
    const contentToSave = notesRef.current ? notesRef.current.innerHTML : notesText;
    await persistNotes(true, contentToSave);
  }, [persistNotes, notesText, notesRef]);

  // Reference pro kontrolu změn v TODO před ukládáním na server
  const lastSavedTasksRef = useRef(() => {
    try {
      const stored = localStorage.getItem(`layout_tasks_${storageId}`);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  // Normalize ref to actual data
  if (typeof lastSavedTasksRef.current === 'function') {
    try { lastSavedTasksRef.current = lastSavedTasksRef.current(); } catch { lastSavedTasksRef.current = []; }
  }

  const flushTasksSave = useCallback(async (forceImmediate = true) => {
    if (forceImmediate) {
      // Kontrola zda se tasks změnily před ukládáním
      const currentTasksStr = JSON.stringify(tasks || []);
      const lastSavedTasksStr = JSON.stringify(lastSavedTasksRef.current || []);

      if (currentTasksStr === lastSavedTasksStr) {

        return;
      }

      try {

        // Vždy uložit lokálně
        await secureStorage.setItem(`layout_tasks_${storageId}`, JSON.stringify(tasks));

        // Pokud máme API připojení, uložit i na server
        if (notesAPI && isLoggedIn && tasks.length > 0) {
          try {
            setServerSyncStatus(prev => ({
              ...prev,
              todo: { ...prev.todo, syncing: true, error: null }
            }));

            const saveResult = await notesAPI.saveTodo(tasks, todoID);

            // Uložit ID z response pro budoucí UPDATE operace
            if (saveResult && saveResult.ID) {
              setTodoID(saveResult.ID);

            } else if (saveResult && saveResult.id) {
              setTodoID(saveResult.id);

            } else {

            }

            setServerSyncStatus(prev => ({
              ...prev,
              todo: { syncing: false, lastSync: Date.now(), error: null }
            }));

            // Success log odstraněn
          } catch (serverError) {
            // console.warn('❌ Chyba při ukládání TODO na server:', serverError);
            setServerSyncStatus(prev => ({
              ...prev,
              todo: { syncing: false, lastSync: prev.todo.lastSync, error: serverError.message }
            }));
            // Success log odstraněn
          }
        } else {
          // Success log odstraněn
        }

        // Aktualizuj status bar timestamp
        setAutoSaveStatus(prev => ({
          ...prev,
          todo: { ...prev.todo, lastSaved: Date.now() }
        }));

        // Aktualizuj referenci pro budoucí kontroly změn
        lastSavedTasksRef.current = [...(tasks || [])];

      } catch (e) {
        // console.warn('❌ Nepodařilo se uložit TODO:', e);
      }
    }
  }, [tasks, storageId, notesAPI, isLoggedIn, todoID, setAutoSaveStatus]);

  // Pravidelné ukládání na server (každých 15 sekund pokud jsou změny)
  useEffect(() => {
    if (!notesAPI || !isLoggedIn) return;

    const interval = setInterval(async () => {
      try {
        // Kontrola jestli jsou lokální data novější než posledně uložené
        const lastServerSync = serverSyncStatus.todo.lastSync || 0;
        const lastLocalChange = tasks.length > 0 ? Math.max(...tasks.map(t => t.createdAt || 0)) : 0;

        if (lastLocalChange > lastServerSync && tasks.length > 0) {

          await flushTasksSave(true);
        }
      } catch (error) {
        // console.warn('⚠️ Chyba při pravidelném ukládání TODO:', error.message);
      }
    }, 15000); // 15 sekund - sjednocený interval

    return () => clearInterval(interval);
  }, [notesAPI, isLoggedIn, tasks, serverSyncStatus.todo.lastSync, flushTasksSave]);

  useEffect(() => {
    // Listen for external requests to add a notification programmatically
    const handler = (e) => {
      try {
        const payload = e?.detail || {};
        const id = payload.id || (Date.now() + Math.floor(Math.random()*1000));
        const ts = payload.ts || Date.now();
        const notif = {
          id,
          type: payload.type || 'info',
          message: payload.message || '',
          ts,
          read: false,
          orderId: payload.orderId || null,
          orderNumber: payload.orderNumber || null,
        };
        setNotifications(prev => [notif, ...prev]);
      } catch (err) { /* ignore */ }
    };
    window.addEventListener('appAddNotification', handler);

    const onBeforeUnload = () => {

      flushNotesSave();
      flushTasksSave(true);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {

        flushNotesSave();
        flushTasksSave(true);
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('appAddNotification', handler);
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [flushNotesSave, flushTasksSave]);

  // 📡 BROADCAST LISTENER: Real-time multi-tab sync přes Broadcast Channel API
  // Priorita: BROADCAST (real-time) > storage event (fallback)
  useEffect(() => {
    if (!user_id) return; // Pouze pro přihlášené uživatele

    const cleanup = onTabSyncMessage((message) => {
      if (!message || !message.type) return;

      // Ignoruj vlastní zprávy (ale BroadcastChannel by měl automaticky filtrovat)
      if (message.payload?.userId === user_id) {
        switch (message.type) {
          case BROADCAST_TYPES.TODO_UPDATED:
            // Jiná záložka aktualizovala TODO
            const newTasks = message.payload?.tasks;
            if (newTasks && Array.isArray(newTasks)) {
              // Deep compare - aktualizuj pouze pokud se data skutečně změnila
              if (JSON.stringify(newTasks) !== JSON.stringify(tasks)) {
                // console.log('📡 [BROADCAST] TODO updated from another tab');
                setTasks(newTasks);
              }
            }
            break;

          case BROADCAST_TYPES.NOTES_UPDATED:
            // Jiná záložka aktualizovala NOTES
            const newNotes = message.payload?.notes;
            const newTranscription = message.payload?.transcription;

            let updated = false;

            if (newNotes !== undefined && JSON.stringify(newNotes) !== JSON.stringify(notesText)) {
              // console.log('📡 [BROADCAST] Notes updated from another tab');
              setNotesText(newNotes);
              updated = true;
            }

            if (newTranscription !== undefined && JSON.stringify(newTranscription) !== JSON.stringify(transcriptionText)) {
              // console.log('📡 [BROADCAST] Transcription updated from another tab');
              setTranscriptionText(newTranscription);
              updated = true;
            }
            break;

          default:
            // Ignoruj ostatní zprávy
            break;
        }
      }
    });

    return cleanup;
  }, [user_id, tasks, notesText, transcriptionText]);

  // ⚡ CROSS-TAB SYNC: localStorage storage event listener with de-duplication
  // Only update local state if data ACTUALLY changed in another tab
  useEffect(() => {
    // De-duplication: track last storage event timestamps to prevent loops
    const lastStorageEventRef = { notes: 0, tasks: 0 };
    const DEDUPE_THRESHOLD_MS = 100; // Ignore events within 100ms of each other

    const handler = (e) => {
      if (!e.key) return;

      const now = Date.now();

      // 📝 NOTES panel sync
      if (e.key === `layout_notes_${storageId}` && !document.hidden) {
        // GUARD 1: De-duplicate rapid-fire storage events
        if (now - lastStorageEventRef.notes < DEDUPE_THRESHOLD_MS) {
          // console.log('🔄 [NOTES SYNC] Skipping duplicate storage event (<%dms)', DEDUPE_THRESHOLD_MS);
          return;
        }
        lastStorageEventRef.notes = now;

        try {
          const val = loadStoredNotes(storageId);
          // GUARD 2: Only update if data ACTUALLY changed (deep comparison)
          const notesChanged = JSON.stringify(val.notes) !== JSON.stringify(notesText);
          const transcriptionChanged = JSON.stringify(val.transcription) !== JSON.stringify(transcriptionText);

          // 🛡️ GUARD 3: Never overwrite existing data with empty values from storage
          // This prevents data loss when another tab hasn't loaded data yet
          if (notesChanged || transcriptionChanged) {
            // console.log('📥 [NOTES SYNC] Data changed in storage');

            // Only update if new value is NOT empty, OR if current value is also empty
            if (notesChanged) {
              const hasNewContent = val.notes && val.notes.trim();
              const hasCurrentContent = notesText && notesText.trim();

              if (hasNewContent || !hasCurrentContent) {
                // console.log('✅ [NOTES SYNC] Updating notes (safe to update)');
                setNotesText(val.notes);
              } else {
                // console.log('⚠️ [NOTES SYNC] Skipping notes update (would delete data)');
              }
            }

            if (transcriptionChanged) {
              const hasNewContent = val.transcription && val.transcription.trim();
              const hasCurrentContent = transcriptionText && transcriptionText.trim();

              if (hasNewContent || !hasCurrentContent) {
                // console.log('✅ [NOTES SYNC] Updating transcription (safe to update)');
                setTranscriptionText(val.transcription);
              } else {
                // console.log('⚠️ [NOTES SYNC] Skipping transcription update (would delete data)');
              }
            }
          }
        } catch {}
      }
      // ✅ TODO panel sync
      else if (e.key === `layout_tasks_${storageId}` && !document.hidden) {
        // GUARD 1: De-duplicate rapid-fire storage events
        if (now - lastStorageEventRef.tasks < DEDUPE_THRESHOLD_MS) {
          // console.log('🔄 [TODO SYNC] Skipping duplicate storage event (<%dms)', DEDUPE_THRESHOLD_MS);
          return;
        }
        lastStorageEventRef.tasks = now;

        try {
          const list = loadStoredTasks(storageId);
          // GUARD 2: Only update if data ACTUALLY changed (deep comparison)
          const tasksChanged = JSON.stringify(list) !== JSON.stringify(tasks);

          // 🛡️ GUARD 3: Never overwrite existing data with empty array from storage
          if (tasksChanged) {
            // Only update if new list is NOT empty, OR if current list is also empty
            const hasNewContent = list && list.length > 0;
            const hasCurrentContent = tasks && tasks.length > 0;

            if (hasNewContent || !hasCurrentContent) {
              // console.log('✅ [TODO SYNC] Updating tasks (safe to update)');
              setTasks(list);
            } else {
              // console.log('⚠️ [TODO SYNC] Skipping tasks update (would delete data)');
            }
          }
        } catch {}
      }
    };

    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [storageId, notesText, transcriptionText, tasks]);

    // 🔒 SECURITY FIX: Load per-user when identity changes, but ONLY if we have data
  // ⚠️ CRITICAL: VŽDY vyčistit data při změně storageId (login/logout)
  // 🔒 BEZPEČNOST: Zabraňuje úniku dat mezi uživateli!
  const prevStorageIdRef = useRef(storageId);
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    // První mount - pouze nastav ref, nenačítej data (to zajistí jiný useEffect)
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevStorageIdRef.current = storageId;
      return;
    }

    // Pouze pokud se storageId skutečně změnil
    if (prevStorageIdRef.current === storageId) {
      return;
    }

    // console.log('🔄 [STORAGE_ID_CHANGE] Detected change:', prevStorageIdRef.current, '→', storageId);
    prevStorageIdRef.current = storageId;

    // reload everything when storageId changes (login / logout)
    try {
      const freshNotes = loadStoredNotes(storageId);
      const freshTasks = loadStoredTasks(storageId);

      // � BEZPEČNOST: VŽDY přepsat state novými daty pro aktuální storageId
      // Pokud nový uživatel nemá data, musí se vyčistit state předchozího uživatele!

      // NOTES: Vždy nastav data pro aktuálního uživatele (i prázdné)
      // console.log('📥 [INIT] Loading notes for storageId:', storageId);
      setNotesText(freshNotes.notes || '');
      setTranscriptionText(freshNotes.transcription || '');

      // TODO: Vždy nastav data pro aktuálního uživatele (i prázdné pole)
      // console.log('📥 [INIT] Loading tasks for storageId:', storageId);
      setTasks(freshTasks || []);

    } catch (err) {
      // console.error('❌ [INIT] Error loading data:', err);
      // V případě chyby vyčistit state
      setNotesText('');
      setTranscriptionText('');
      setTasks([]);
    }
  }, [storageId]);

  // F5 Refresh Recovery - načte backup data při prvním načtení
  useEffect(() => {
    const recoverFromRefresh = async () => {
      try {
        // Zkontroluj jestli máme backup data z předchozí relace
        const todoBackup = localStorage.getItem(`layout_tasks_backup_${storageId}`);
        const notesBackup = localStorage.getItem(`layout_notes_backup_${storageId}`);

        if (todoBackup) {
          try {
            const parsedTodos = JSON.parse(todoBackup);
            if (Array.isArray(parsedTodos) && parsedTodos.length > 0) {
              // Porovnej s aktuálními daty
              const currentTodos = loadStoredTasks(storageId);
              if (JSON.stringify(parsedTodos) !== JSON.stringify(currentTodos)) {

                setTasks(parsedTodos);
                await secureStorage.setItem(`layout_tasks_${storageId}`, JSON.stringify(parsedTodos));
              }
            }
          } catch (e) {
            // console.warn('Chyba při recovery TODO:', e);
          }
        }

        if (notesBackup) {
          try {
            const currentNotes = loadStoredNotes(storageId);
            // notesBackup je JSON string, currentNotes je objekt { notes, transcription }
            const currentJSON = JSON.stringify({ notes: currentNotes.notes, transcription: currentNotes.transcription });

            if (notesBackup !== currentJSON && notesBackup.trim()) {
              // Parse backup a nastav oba hodnoty
              const parsed = JSON.parse(notesBackup);
              if (parsed && typeof parsed === 'object') {
                setNotesText(parsed.notes || '');
                setTranscriptionText(parsed.transcription || '');
              } else {
                // Starý formát - prostý string
                setNotesText(notesBackup);
              }

              localStorage.setItem(`layout_notes_${storageId}`, notesBackup);
              localStorage.setItem(`layout_notes_timestamp_${storageId}`, String(Date.now()));
            }
          } catch (e) {
          }
        }
      } catch (error) {
        // console.warn('Chyba při F5 recovery:', error);
      }
    };

    // Spuštění recovery s malým zpožděním
    const timeoutId = setTimeout(recoverFromRefresh, 100);
    return () => clearTimeout(timeoutId);
  }, [storageId]);

  // Globální syncFromServer funkce
  const syncFromServer = useCallback(async () => {
    if (!notesAPI || !isLoggedIn) return;

    try {
      // Synchronizace dat ze serveru

      // Načtení poznámek ze serveru
      try {
        // Volám notesAPI.loadNotes()
        const serverNotesResponse = await notesAPI.loadNotes();
        // Zpracování serverNotesResponse

        if (serverNotesResponse) {
          // Extrahuj ID z response
          if (serverNotesResponse.ID) {
            setNotesID(serverNotesResponse.ID);

          } else if (serverNotesResponse.id) {
            setNotesID(serverNotesResponse.id);
            // Notes ID načteno
          } else {

          }

            // Extrahujeme obsah podle formátu
            let serverContent = '';

            if (typeof serverNotesResponse === 'string') {
              serverContent = serverNotesResponse;
            } else if (typeof serverNotesResponse === 'object' && serverNotesResponse !== null) {
              // Nový formát s ID a data property
              if (typeof serverNotesResponse.data === 'string') {
                serverContent = serverNotesResponse.data;
              } else if (typeof serverNotesResponse.content === 'string') {
                serverContent = serverNotesResponse.content;
              } else if (typeof serverNotesResponse.data === 'object' && serverNotesResponse.data.content) {
                serverContent = serverNotesResponse.data.content;
              }
            }

            // Parsuj JSON pokud je to strukturovaný obsah
            let parsedNotes = '';
            let parsedTranscription = '';

            try {
              const parsed = JSON.parse(serverContent);
              if (parsed && typeof parsed === 'object' && 'notes' in parsed) {
                parsedNotes = parsed.notes || '';
                parsedTranscription = parsed.transcription || '';
              } else {
                // Není JSON objekt s notes/transcription - považuj za prostý notes
                parsedNotes = serverContent;
                parsedTranscription = '';
              }
            } catch {
              // Není JSON - považuj za prostý notes (starý formát)
              parsedNotes = serverContent;
              parsedTranscription = '';
            }

            // 🔒 BEZPEČNOST: Při přihlášení VŽDY preferovat DB data
            const localData = loadStoredNotes(storageId);
            if (serverContent) {
              // Máme data z DB - použij je bez ohledu na lokální
              const localChanged = parsedNotes !== localData.notes || parsedTranscription !== localData.transcription;

              if (localChanged) {
                setNotesText(parsedNotes);
                setTranscriptionText(parsedTranscription);

                // Ulož do localStorage jako JSON
                const combinedData = {
                  notes: parsedNotes,
                  transcription: parsedTranscription,
                  lastModified: Date.now()
                };
                const combinedJSON = JSON.stringify(combinedData);
                localStorage.setItem(`layout_notes_${storageId}`, combinedJSON);
                localStorage.setItem(`layout_notes_backup_${storageId}`, combinedJSON);
                localStorage.setItem(`layout_notes_timestamp_${storageId}`, String(Date.now()));
              }
              // Nastav lastSaved timestamp pro zobrazení v UI
              setAutoSaveStatus(prev => ({
                ...prev,
                notes: { ...prev.notes, lastSaved: Date.now() }
              }));
              // console.log('📥 [NOTES LOAD] Data loaded from server, lastSaved updated');
            }
        } else {
          // Server vrátil NULL/prázdno - NEMAZAT AUTOMATICKY!
          // Může to být chyba API nebo data byla skutečně smazána na jiném zařízení
          const localData = loadStoredNotes(storageId);
          if ((localData.notes && localData.notes.trim()) || (localData.transcription && localData.transcription.trim())) {
            // NEPŘEPISOVAT - uživatel si může ručně rozhodnout přes tlačítko "Vymazat vše"
          }
        }
      } catch (notesError) {
        // console.log('ℹ️ Poznámky ze serveru nejsou dostupné:', notesError.message);
      }

        // Načtení TODO ze serveru
        try {
          // Načítám TODO ze serveru
          const serverTodosResponse = await notesAPI.loadTodo();

          if (serverTodosResponse) {
            // Extrahuj ID z response
            if (serverTodosResponse.ID) {
              setTodoID(serverTodosResponse.ID);

            } else if (serverTodosResponse.id) {
              setTodoID(serverTodosResponse.id);
              // Todo ID načteno
            } else {

            }

            // Extrahujeme TODO podle formátu
            let todoList = [];

            if (Array.isArray(serverTodosResponse)) {
              todoList = serverTodosResponse;
            } else if (typeof serverTodosResponse === 'object' && serverTodosResponse !== null) {
              // Nový formát s ID a data property
              if (Array.isArray(serverTodosResponse.data)) {
                todoList = serverTodosResponse.data;
              } else if (Array.isArray(serverTodosResponse.items)) {
                todoList = serverTodosResponse.items;
              } else if (typeof serverTodosResponse.data === 'string') {
                // Pokud je data string, pokusíme se ho parsovat jako JSON
                try {
                  todoList = JSON.parse(serverTodosResponse.data);
                  if (!Array.isArray(todoList)) todoList = [];
                } catch (e) {
                  todoList = [];
                }
              }
            }

            // 🔒 BEZPEČNOST: Při přihlášení VŽDY preferovat DB data
            const localTodos = loadStoredTasks(storageId);

            if (todoList.length > 0) {
              // Máme data z DB - použij je bez ohledu na lokální
              if (JSON.stringify(todoList) !== JSON.stringify(localTodos)) {
                setTasks(todoList);
                await secureStorage.setItem(`layout_tasks_${storageId}`, JSON.stringify(todoList));
                localStorage.setItem(`layout_tasks_backup_${storageId}`, JSON.stringify(todoList));
                localStorage.setItem(`layout_tasks_timestamp_${storageId}`, String(Date.now()));
              }
              // Nastav lastSaved timestamp pro zobrazení v UI
              setAutoSaveStatus(prev => ({
                ...prev,
                todo: { ...prev.todo, lastSaved: Date.now() }
              }));
              // console.log('📥 [TODO LOAD] Data loaded from server, lastSaved updated');
            } else if (localTodos.length > 0) {
              // DB je prázdná, ale lokálně máme data - ponecháme lokální a možná je uploadneme
              // Můžeme zvážit upload lokálních dat na server:
              // await notesAPI.saveTodo(localTodos);
            }
          } else {
            // Server vrátil NULL/undefined - NEMAŽ automaticky!
            // Může to být chyba API nebo data byla skutečně smazána
            const localTodos = loadStoredTasks(storageId);
            if (localTodos.length > 0) {
              // NEPŘEPISOVAT - uživatel si může ručně rozhodnout
            }
          }
        } catch (todoError) {
          // console.log('ℹ️ TODO ze serveru nejsou dostupné:', todoError.message);
        }

      // Synchronizace dokončena

    } catch (error) {
      // console.warn('⚠️ Chyba při synchronizaci ze serveru:', error);
    }
  }, [notesAPI, isLoggedIn, storageId, setNotesID, setTodoID, setNotesText, setTasks]);

  // Server data synchronization pouze při přihlášení (ne při každé změně)
  useEffect(() => {
    if (!notesAPI || !isLoggedIn) return;

    // 🔒 BEZPEČNOST: Při přihlášení vždy preferovat data z DB
    // Ochrana proti ztrátě dat při pádu prohlížeče nebo torzo localStorage
    const safeLoginSync = async () => {
      try {
        // 1. Načti data ze serveru (DB)
        await syncFromServer();

        // 2. Zkontroluj timestamp lokalních dat
        const localTodoTimestamp = localStorage.getItem(`layout_tasks_timestamp_${storageId}`);
        const localNotesTimestamp = localStorage.getItem(`layout_notes_timestamp_${storageId}`);

        const now = Date.now();
        const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

        // 3. Pokud jsou lokální data starší než týden, preferuj DB
        if (localTodoTimestamp && parseInt(localTodoTimestamp) < oneWeekAgo) {
          // Data již načtena ze serveru v syncFromServer()
        }

        if (localNotesTimestamp && parseInt(localNotesTimestamp) < oneWeekAgo) {
          // Data již načtena ze serveru v syncFromServer()
        }

        // 4. Ulož aktuální timestamp pro budoucí kontroly
        localStorage.setItem(`layout_tasks_timestamp_${storageId}`, String(now));
        localStorage.setItem(`layout_notes_timestamp_${storageId}`, String(now));
      } catch (error) {
      }
    };

    // Malá prodleva aby se stihly načíst lokální data
    const timeoutId = setTimeout(safeLoginSync, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [notesAPI, isLoggedIn, storageId, syncFromServer]); // Pouze při změně API nebo login stavu

  // Safety: if panel otevře a máme prázdný stav ale storage obsahuje data (např. race před mount efektem), dočti.
  useEffect(() => {
    if (todoOpen && tasks.length === 0) {
      const fresh = loadStoredTasks(storageId);
      if (fresh.length) {

        setTasks(fresh);
      }
      // ODSTRANĚNO: automatický sync ze serveru při otevření panelu
      // Uživatel si může ručně načíst přes 🔄 tlačítko, pokud chce
    }
  }, [todoOpen, tasks.length, storageId]);

  useEffect(() => {
    if (notesOpen && !notesText) {
      const localNotes = loadStoredNotes(storageId);
      if (localNotes && (localNotes.notes || localNotes.transcription)) {
        // loadStoredNotes vrací objekt { notes, transcription }
        setNotesText(localNotes.notes || '');
        setTranscriptionText(localNotes.transcription || '');
      }
      // ODSTRANĚNO: automatický sync ze serveru při otevření panelu
      // Uživatel si může ručně načíst přes 🔄 tlačítko, pokud chce
    }
  }, [notesOpen, notesText, storageId]);

  // 🔄 Načtení lastSaved timestamp z localStorage při F5 refresh
  useEffect(() => {
    try {
      // Načti timestamp z localStorage pro Notes
      const notesTimestamp = localStorage.getItem(`layout_notes_timestamp_${storageId}`);
      if (notesTimestamp) {
        const ts = parseInt(notesTimestamp);
        if (!isNaN(ts)) {
          setAutoSaveStatus(prev => ({
            ...prev,
            notes: { ...prev.notes, lastSaved: ts }
          }));
          // console.log('📥 [NOTES] Loaded timestamp from localStorage:', new Date(ts).toLocaleTimeString('cs-CZ'));
        }
      }

      // Načti timestamp z localStorage pro TODO
      const tasksTimestamp = localStorage.getItem(`layout_tasks_timestamp_${storageId}`);
      if (tasksTimestamp) {
        const ts = parseInt(tasksTimestamp);
        if (!isNaN(ts)) {
          setAutoSaveStatus(prev => ({
            ...prev,
            todo: { ...prev.todo, lastSaved: ts }
          }));
          // console.log('📥 [TODO] Loaded timestamp from localStorage:', new Date(ts).toLocaleTimeString('cs-CZ'));
        }
      }
    } catch (error) {
    }
  }, [storageId]); // Pouze při změně storageId (mount/login)

  // One-time adoption: if user logs in and there is legacy 'anon' data AND no user specific data yet.
  useEffect(() => {
    if (!user_id) return; // only when logging in
    try {
      const userTasks = localStorage.getItem(`layout_tasks_${user_id}`);
      const anonTasks = localStorage.getItem('layout_tasks_anon');
      if (!userTasks && anonTasks) {
        localStorage.setItem(`layout_tasks_${user_id}`, anonTasks);
        localStorage.setItem(`layout_tasks_timestamp_${user_id}`, String(Date.now()));
      }
      const userNotes = localStorage.getItem(`layout_notes_${user_id}`);
      const anonNotes = localStorage.getItem('layout_notes_anon');
      if (!userNotes && anonNotes) {
        localStorage.setItem(`layout_notes_${user_id}`, anonNotes);
        localStorage.setItem(`layout_notes_timestamp_${user_id}`, String(Date.now()));
      }
      const userNotif = localStorage.getItem(`notif_data_${user_id}`);
      const anonNotif = localStorage.getItem('notif_data_anon');
      if (!userNotif && anonNotif) {
        localStorage.setItem(`notif_data_${user_id}`, anonNotif);
      }
      const userChat = localStorage.getItem(`chat_data_${user_id}`);
      const anonChat = localStorage.getItem('chat_data_anon');
      if (!userChat && anonChat) {
        localStorage.setItem(`chat_data_${user_id}`, anonChat);
      }
      const userFont = localStorage.getItem(`layout_tasks_font_${user_id}`);
      const anonFont = localStorage.getItem('layout_tasks_font_anon');
      if (!userFont && anonFont) {
        localStorage.setItem(`layout_tasks_font_${user_id}`, anonFont);
      }
    } catch {}
  }, [user_id]);

  // Seed demo notifications if empty after login
  const notificationsSeedDoneRef = useRef(false);

  // Reset seed flag při změně uživatele
  useEffect(() => {
    notificationsSeedDoneRef.current = false;
  }, [user_id]);

  useEffect(() => {
    if (!user_id) return; // daily tip only for authenticated user
    if (notificationsSeedDoneRef.current) return; // už jsme seedli

    if (!notifications.length) {
      try {
        const key = `notif_data_${user_id}`;
        const raw = localStorage.getItem(key);
        if (!raw) {
          const now = Date.now();
          const demo = [
            { id: now + 1, type:'new', message:'Nová objednávka #128 vytvořena', ts: now - 1000 * 60 * 4, read:false },
            { id: now + 2, type:'approved', message:'Objednávka #127 schválena', ts: now - 1000 * 60 * 20, read:false },
            { id: now + 3, type:'update', message:'Objednávka #124 změněna: přidán příznak urgent', ts: now - 1000 * 60 * 35, read:false },
            { id: now + 4, type:'reminder', message:'Připomínka: zkontrolujte rozpracované objednávky', ts: now - 1000 * 60 * 90, read:false },
            { id: now + 5, type:'info', message:'Systém: Platba zpracována pro objednávku #120', ts: now - 1000 * 60 * 130, read:false },
            { id: now + 6, type:'tip', message:'Tip: Použijte klávesové zkratky pro rychlejší práci', ts: now, read:false },
          ];
          localStorage.setItem(key, JSON.stringify(demo));
          setNotifications(demo);
          notificationsSeedDoneRef.current = true; // Označit že jsme seedli
        }
      } catch {}
    }
  }, [user_id, notifications.length]);

  // 🔒 F5 Protection: Save notes/tasks before page unload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Synchronní uložení do localStorage (async nebude fungovat při unload)
      try {
        // Notes - použij aktuální DOM content OBOU tabů
        const currentNotesContent = notesRef.current ? notesRef.current.innerHTML : notesText;
        const currentTranscriptionContent = transcriptionText; // transcriptionRef není v dependencies

        if ((currentNotesContent && currentNotesContent.trim()) ||
            (currentTranscriptionContent && currentTranscriptionContent.trim())) {
          // Ulož jako strukturovaný JSON objekt
          const combinedData = {
            notes: currentNotesContent || '',
            transcription: currentTranscriptionContent || '',
            lastModified: Date.now()
          };
          const combinedJSON = JSON.stringify(combinedData);

          localStorage.setItem(`layout_notes_${storageId}`, combinedJSON);
          localStorage.setItem(`layout_notes_backup_${storageId}`, combinedJSON);
          localStorage.setItem(`layout_notes_timestamp_${storageId}`, String(Date.now()));
        }

        // Tasks
        if (tasks && tasks.length > 0) {
          localStorage.setItem(`layout_tasks_${storageId}`, JSON.stringify(tasks));
          localStorage.setItem(`layout_tasks_timestamp_${storageId}`, String(Date.now()));
        }
      } catch (error) {
      }

      // Neptat se na potvrzení unload (nemáme unsaved changes)
      // Pokud bychom chtěli varovat uživatele:
      // e.preventDefault();
      // e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [notesText, transcriptionText, notesRef, tasks, storageId]);

  // Daily tip
  useEffect(() => {
    if (!user_id) return; // welcome only for authenticated user
    const today = new Date().toISOString().slice(0,10);
    const tipFlagKey = `notif_tip_${user_id}_${today}`;
    if (localStorage.getItem(tipFlagKey)) return;
    const tips = [
      'Nezapomeňte pravidelně kontrolovat stav rozpracovaných objednávek.',
      'Použijte rychlý filtr pro rychlé vyhledání konkrétního uživatele nebo objednávky.',
      'Ukládejte si krátké poznámky do panelu Poznámky – jsou per‑uživatel a přetrvávají.',
      'Zelená ikona obnovy seznamu spouští globální progress – sledujte horní lištu.',
      'Draft objednávky se automaticky adoptuje po přihlášení – využijte pokračování práce.',
    ];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    const tipObj = { id: Date.now() + Math.random(), type:'tip', message:`Tip dne: ${randomTip}`, ts: Date.now(), read:false };
    setNotifications(prev => [tipObj, ...prev]);
    try { localStorage.setItem(tipFlagKey, '1'); } catch{}
  }, [user_id]);

  // Helper funkce pro časové pozdravy
  const getTimeBasedGreeting = () => {
    const now = new Date();
    const hour = now.getHours();
    const today = now.toLocaleDateString('cs-CZ', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let greeting;
    if (hour >= 5 && hour < 10) {
      greeting = 'Dobré ráno';
    } else if (hour >= 10 && hour < 12) {
      greeting = 'Dobré dopoledne';
    } else if (hour >= 12 && hour < 17) {
      greeting = 'Dobré odpoledne';
    } else {
      // Od 17:00 až do 4:59 ráno se říká "Dobrý večer"
      greeting = 'Dobrý večer';
    }

    return `${greeting}! Dnes je ${today}`;
  };

  // ❌ VYPNUTO: Welcome per session - uvítání je nyní v AuthContext toast po loginu
  // useEffect(() => {
  //   if (!user_id) return;
  //   const welcomeKey = `notif_welcome_session_${user_id}`;
  //   if (sessionStorage.getItem(welcomeKey)) return;
  //   const welcomeMessage = getTimeBasedGreeting();
  //   const welcomeObj = { id: Date.now() + Math.random(), type:'greeting', message: welcomeMessage, ts: Date.now(), read:false };
  //   setNotifications(prev => [welcomeObj, ...prev]);
  //   try { sessionStorage.setItem(welcomeKey, '1'); } catch{}
  // }, [user_id]);

  // Viewport clamp
  const [viewportW, setViewportW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1600));
  const [viewportH, setViewportH] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 900));
  useEffect(() => {
    const onResize = () => { setViewportW(window.innerWidth); setViewportH(window.innerHeight); };
    window.addEventListener('resize', onResize); window.addEventListener('orientationchange', onResize);
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('orientationchange', onResize); };
  }, []);
  useEffect(() => {
    const margin = 12;
    const clampState = (st) => {
      const maxW = Math.max(260, viewportW - margin*2);
      const maxH = Math.max(160, viewportH - margin*2 - 40);
      const w = Math.min(st.w, maxW); const h = Math.min(st.h, maxH);
      let { x, y } = st;
      const completelyOff = (st.x + 40 < 0) || (st.y + 40 < 0) || (st.x > viewportW - 40) || (st.y > viewportH - 40);
      if (completelyOff) { x = Math.max(margin, viewportW - w - margin); y = Math.max(margin + 40, viewportH - h - margin - 40); }
      x = Math.min(Math.max(x, margin), viewportW - w - margin);
      y = Math.min(Math.max(y, margin + 40), viewportH - h - margin - 40);
      return { ...st, x, y, w, h };
    };
    if (todoOpen) setTodoPanelState(s => clampState(s));
    if (notesOpen) setNotesPanelState(s => clampState(s));
    if (notifOpen) setNotifPanelState(s => clampState(s));
    if (chatOpen) setChatPanelState(s => clampState(s));
  }, [viewportW, viewportH, todoOpen, notesOpen, notifOpen]);

  // Persist panel state
  useEffect(()=>{ try { localStorage.setItem(`panel_state_${storageId}_todo`, JSON.stringify(todoPanelState)); } catch{} }, [todoPanelState, storageId]);
  useEffect(()=>{ try { localStorage.setItem(`panel_state_${storageId}_notes`, JSON.stringify(notesPanelState)); } catch{} }, [notesPanelState, storageId]);
  useEffect(()=>{ try { localStorage.setItem(`panel_state_${storageId}_notif`, JSON.stringify(notifPanelState)); } catch{} }, [notifPanelState, storageId]);

  // Reload positions on user change
  useEffect(() => {
    setTodoPanelState(loadPanelState('todo', { x: vw - 500, y: vh - 470, w: 500, h: 427 }));
    setNotesPanelState(loadPanelState('notes', { x: vw - 850, y: vh - 530, w: 550, h: 480 }));
    setNotifPanelState(loadPanelState('notif', { x: vw - 360, y: 182, w: 360, h: 340 }));
    setChatPanelState(loadPanelState('chat', { x: vw - 480, y: vh - 583, w: 480, h: 533 }));
  }, [storageId, loadPanelState, vh, vw]);

  // Drag + resize
  const activeDragRef = useRef(null); // { panel, mode, startX,startY,start:{x,y,w,h} }
  const PANEL_MIN = useMemo(() => ({ w: 455, h: 160 }), []);
  const setPanelByKey = (key, updater) => {
    if (key === 'todo') setTodoPanelState(updater);
    else if (key === 'notes') setNotesPanelState(updater);
    else if (key === 'notif') setNotifPanelState(updater);
    else if (key === 'chat') setChatPanelState(updater);
  };
  const onPanelMouseMove = useCallback((e) => {
    if (!activeDragRef.current) return;
    const { panel, mode, startX, startY, start } = activeDragRef.current;
    let { x, y, w, h } = start;
    const dx = e.clientX - startX; const dy = e.clientY - startY;
    if (mode === 'move') { x = Math.min(window.innerWidth - 80, Math.max(0, start.x + dx)); y = Math.min(window.innerHeight - 60, Math.max(0, start.y + dy)); }
    else {
      if (mode.includes('right')) w = Math.max(PANEL_MIN.w, start.w + dx);
      if (mode.includes('bottom')) h = Math.max(PANEL_MIN.h, start.h + dy);
      if (mode.includes('left')) { w = Math.max(PANEL_MIN.w, start.w - dx); x = start.x + (start.w - w); }
      if (mode.includes('top')) { h = Math.max(PANEL_MIN.h, start.h - dy); y = start.y + (start.h - h); }
    }
    setPanelByKey(panel, { x, y, w, h });
  }, [PANEL_MIN]);
  const endPanelDrag = useCallback(() => {
    activeDragRef.current = null;
    window.removeEventListener('mousemove', onPanelMouseMove);
    window.removeEventListener('mouseup', endPanelDrag);
  }, [onPanelMouseMove]);
  const beginPanelDrag = (e, panel, mode) => {
    e.preventDefault(); e.stopPropagation(); bringPanelFront(panel);
    const src = panel === 'todo' ? todoPanelState : panel === 'notes' ? notesPanelState : panel === 'chat' ? chatPanelState : notifPanelState;
    activeDragRef.current = { panel, mode, startX: e.clientX, startY: e.clientY, start: { ...src } };
    window.addEventListener('mousemove', onPanelMouseMove);
    window.addEventListener('mouseup', endPanelDrag, { once: true });
  };

  // Tasks operations
  const addTask = (e) => {
    if (e) e.preventDefault();
    const trimmed = newTask.trim();
    if (!trimmed) return;

    const id = Date.now() + Math.random();
    const newTaskObj = { id, text: trimmed, done: false, createdAt: Date.now(), priority: 'normal' };

    // Přidáváme nový úkol na ZAČÁTEK seznamu (první pozice)
    setTasks(prev => {
      const updatedTasks = [newTaskObj, ...prev];

      // 📡 BROADCAST: Notifikuj ostatní záložky o změně
      if (user_id) {
        broadcastTodoUpdated(user_id, updatedTasks);
      }

      return updatedTasks;
    });
    setNewTask('');
  };
  const toggleTask = (id, onAlarmNotificationDelete) => {
    setTasks(prev => {
      const updatedTasks = prev.map(t => {
        if (t.id === id) {
          const newDone = !t.done;

          // Pokud se označuje jako hotové a má alarm, zavolej callback pro smazání notifikace
          if (newDone && t.alarm && onAlarmNotificationDelete) {
            onAlarmNotificationDelete(id);
          }

          return { ...t, done: newDone };
        }
        return t;
      });

      // 📡 BROADCAST: Notifikuj ostatní záložky o změně
      if (user_id) {
        broadcastTodoUpdated(user_id, updatedTasks);
      }

      return updatedTasks;
    });
  };
  const removeTask = (id) => {
    setTasks(prev => {
      const updatedTasks = prev.filter(t => t.id !== id);

      // 📡 BROADCAST: Notifikuj ostatní záložky o změně
      if (user_id) {
        broadcastTodoUpdated(user_id, updatedTasks);
      }

      return updatedTasks;
    });
  };

  const reorderTasks = (startIndex, endIndex) => {
    setTasks(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);

      // 📡 BROADCAST: Notifikuj ostatní záložky o změně
      if (user_id) {
        broadcastTodoUpdated(user_id, result);
      }

      return result;
    });
  };

  const updateTaskAlarm = (id, alarm) => {
    setTasks(prev => {
      const updatedTasks = prev.map(t => t.id === id ? { ...t, alarm } : t);

      // 📡 BROADCAST: Notifikuj ostatní záložky o změně
      if (user_id) {
        broadcastTodoUpdated(user_id, updatedTasks);
      }

      return updatedTasks;
    });
  };

  const updateTaskPriority = (id, priority) => {
    setTasks(prev => {
      const updatedTasks = prev.map(t => t.id === id ? { ...t, priority } : t);

      // 📡 BROADCAST: Notifikuj ostatní záložky o změně
      if (user_id) {
        broadcastTodoUpdated(user_id, updatedTasks);
      }

      return updatedTasks;
    });
  };

  const clearDone = () => {
    setTasks(prev => {
      const updatedTasks = prev.filter(t => !t.done);

      // 📡 BROADCAST: Notifikuj ostatní záložky o změně
      if (user_id) {
        broadcastTodoUpdated(user_id, updatedTasks);
      }

      return updatedTasks;
    });
  };

  const clearAllTasks = async () => {
    // Lokální smazání z React state
    setTasks([]);

    // 📡 BROADCAST: Notifikuj ostatní záložky o smazání
    if (user_id) {
      broadcastTodoUpdated(user_id, []);
    }

    // Smazání ze všech localStorage klíčů
    try {
      localStorage.removeItem(`layout_tasks_${storageId}`);
      localStorage.removeItem(`layout_tasks_backup_${storageId}`);

    } catch (lsError) {
      // console.warn('⚠️ Chyba při mazání z localStorage:', lsError);
    }

    // Smazání ze serveru pokud máme API a ID
    if (notesAPI && isLoggedIn && todoID) {
      try {

        await notesAPI.deleteTodo(todoID);
        setTodoID(null); // Reset ID po smazání
        // Success log odstraněn
      } catch (error) {
        // console.warn('⚠️ Chyba při mazání TODO ze serveru:', error);
        // Lokální smazání už proběhlo, takže pokračujeme
      }
    }
  };

  const importTasks = (importedTasks) => {
    if (!Array.isArray(importedTasks) || importedTasks.length === 0) {
      return;
    }

    setTasks(prev => {
      // Přidáme importované úkoly k existujícím
      const updatedTasks = [...prev, ...importedTasks];

      // 📡 BROADCAST: Notifikuj ostatní záložky o změně
      if (user_id) {
        broadcastTodoUpdated(user_id, updatedTasks);
      }

      return updatedTasks;
    });
  };

  const clearAllNotes = async () => {

    // Nastavíme flag pro potlačení auto-save
    deletingRef.current = true;

    try {
      // Lokální smazání z React state (OBA taby!)
      setNotesText('');
      setTranscriptionText('');

      // 📡 BROADCAST: Notifikuj ostatní záložky o smazání
      if (user_id) {
        broadcastNotesUpdated(user_id, '', '');
      }

      // Smazání ze všech localStorage klíčů
      try {
        localStorage.removeItem(`layout_notes_${storageId}`);
        localStorage.removeItem(`layout_notes_backup_${storageId}`);
        localStorage.removeItem(`layout_notes_meta_${storageId}`);

      } catch (lsError) {
        // console.warn('⚠️ Chyba při mazání z localStorage:', lsError);
      }

      // Smazání ze serveru pokud máme API a ID
      if (notesAPI && isLoggedIn && notesID) {
        try {

          await notesAPI.deleteNotes(notesID);
          setNotesID(null); // Reset ID po smazání
          // Success log odstraněn
        } catch (error) {
          // console.warn('⚠️ Chyba při mazání Notes ze serveru:', error);
          // Lokální smazání už proběhlo, takže pokračujeme
        }
      }
    } finally {
      // Vždy resetujeme flag
      deletingRef.current = false;
    }
  };

  const openNotifications = () => {
    setNotifOpen(o => !o);
    setNotifications(prev => prev.map(n => n.read ? n : { ...n, read:true }));
  };
  const clearNotifications = () => setNotifications([]);
  const markAllRead = () => setNotifications(prev => prev.map(n => n.read ? n : { ...n, read: true }));

  const unreadCount = notifications.filter(n => !n.read).length;

  // Chat functions
  const openChat = () => setChatOpen(o => !o);
  const addChatMessage = (text, sender = 'user') => {
    if (!text.trim()) return;
    const message = {
      id: Date.now(),
      text: text.trim(),
      sender,
      timestamp: new Date().toISOString(),
      read: sender === 'user' // Own messages are automatically read
    };
    setChatMessages(prev => [...prev, message]);
  };
  const markChatMessagesRead = () => {
    setChatMessages(prev => prev.map(m => m.read ? m : { ...m, read: true }));
  };
  const clearChatMessages = () => setChatMessages([]);

  const unreadChatCount = chatMessages.filter(m => !m.read).length;

  // Manuální synchronizace se serverem
  const manualServerSync = useCallback(async () => {
    if (!notesAPI || !isLoggedIn) {
      throw new Error('Server API není dostupné - nejste přihlášeni');
    }

    try {
      setServerSyncStatus(prev => ({
        notes: { ...prev.notes, syncing: true, error: null },
        todo: { ...prev.todo, syncing: true, error: null }
      }));

      // Synchronizace poznámek s použitím ID
      const notesResult = await notesAPI.saveNotes(notesText, notesID);
      if (notesResult && notesResult.ID) {
        setNotesID(notesResult.ID);
      } else if (notesResult && notesResult.id) {
        setNotesID(notesResult.id);
      }

      // Synchronizace TODO s použitím ID
      const todoResult = await notesAPI.saveTodo(tasks, todoID);

      if (todoResult && todoResult.ID) {
        setTodoID(todoResult.ID);
      } else if (todoResult && todoResult.id) {
        setTodoID(todoResult.id);
      }

      setServerSyncStatus({
        notes: {
          syncing: false,
          lastSync: Date.now(),
          error: notesResult.error || null
        },
        todo: {
          syncing: false,
          lastSync: Date.now(),
          error: todoResult.error || null
        }
      });

      return {
        success: true,
        notes: notesResult,
        todo: todoResult
      };

    } catch (error) {
      setServerSyncStatus(prev => ({
        notes: { syncing: false, lastSync: prev.notes.lastSync, error: error.message },
        todo: { syncing: false, lastSync: prev.todo.lastSync, error: error.message }
      }));

      throw error;
    }
  }, [notesAPI, isLoggedIn, notesText, tasks]);

  // Enhanced panel toggles with auto-save
  const enhancedSetTodoOpen = useCallback((newState) => {
    const willClose = typeof newState === 'function' ? !newState(todoOpen) : !newState;
    if (willClose && todoOpen) {
      // Panel se zavírá - uložit TODO

      flushTasksSave(true);
    }
    setTodoOpen(newState);
  }, [todoOpen, flushTasksSave]);

  const enhancedSetNotesOpen = useCallback(async (newState) => {
    const willClose = typeof newState === 'function' ? !newState(notesOpen) : !newState;
    if (willClose && notesOpen) {
      // Panel se zavírá - uložit poznámky
      await flushNotesSave();
    }
    setNotesOpen(newState);
  }, [notesOpen, flushNotesSave]);

  // Manuální save a refresh funkce pro status bar
  const manualSaveNotes = useCallback(async () => {

    await persistNotes(true);
    setAutoSaveStatus(prev => ({
      ...prev,
      notes: { ...prev.notes, lastSaved: Date.now() }
    }));
  }, [persistNotes]);

  const manualSaveTodo = useCallback(async () => {

    await flushTasksSave(true);
    setAutoSaveStatus(prev => ({
      ...prev,
      todo: { ...prev.todo, lastSaved: Date.now() }
    }));
  }, [flushTasksSave]);

  const refreshFromServer = useCallback(async () => {
    await syncFromServer();
  }, [syncFromServer]);

  // Format času pro status bar
  const formatTime = useCallback((timestamp) => {
    if (!timestamp) return 'nikdy';
    const date = new Date(timestamp);
    const now = new Date();

    // Kontrola, zda je timestamp ze stejného dne
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      // Dnes - zobraz pouze čas
      return date.toLocaleTimeString('cs-CZ', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } else {
      // Starší - zobraz datum i čas
      return date.toLocaleString('cs-CZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }, []);

  // Window control functions
  const minimizePanel = useCallback((panelKey) => {
    const openSetters = {
      todo: setTodoOpen,
      notes: setNotesOpen,
      notif: setNotifOpen,
      chat: setChatOpen
    };

    // Minimalizace = skrytí panelu (stejné jako close)
    openSetters[panelKey](false);
  }, []);

  const maximizePanel = useCallback((panelKey) => {
    const stateSetters = {
      todo: setTodoPanelState,
      notes: setNotesPanelState,
      notif: setNotifPanelState,
      chat: setChatPanelState
    };

    stateSetters[panelKey](prev => {
      if (prev.maximized) {
        // Restore ze saved state
        return {
          ...prev.savedState,
          maximized: false,
          minimized: false,
          savedState: null
        };
      } else {
        // Maximize - uložíme current state a nastavíme fullscreen
        const currentVw = typeof window !== 'undefined' ? window.innerWidth : 1600;
        const currentVh = typeof window !== 'undefined' ? window.innerHeight : 900;
        return {
          x: 0,
          y: 0,
          w: currentVw,
          h: currentVh,
          maximized: true,
          minimized: false,
          savedState: { x: prev.x, y: prev.y, w: prev.w, h: prev.h }
        };
      }
    });
  }, [vw, vh]);

  const restorePanel = useCallback((panelKey) => {
    maximizePanel(panelKey); // Same logic as maximize toggle
  }, [maximizePanel]);

  // 🧹 Cleanup: Zrušit pending broadcast timery při unmount
  useEffect(() => {
    return () => {
      if (notesBroadcastDebounceRef.current) {
        clearTimeout(notesBroadcastDebounceRef.current);
        notesBroadcastDebounceRef.current = null;
      }
    };
  }, []);

  return {
    // panel toggles with auto-save
    todoOpen, setTodoOpen: enhancedSetTodoOpen, notesOpen, setNotesOpen: enhancedSetNotesOpen, notifOpen, setNotifOpen, chatOpen, setChatOpen,
    // fonts & adjusters
    todoFont, notesFont, notifFont, chatFont, adjTodo, adjNotes, adjNotif, adjChat,
    // content states
    tasks, newTask, setNewTask, addTask, toggleTask, removeTask, reorderTasks, updateTaskAlarm, updateTaskPriority, clearDone, clearAllTasks, importTasks,
    notesText, setNotesText, transcriptionText, setTranscriptionText, notesRef, showNotesColors, setShowNotesColors, clearAllNotes,
    notifications, setNotifications, openNotifications, clearNotifications, markAllRead, unreadCount,
    chatMessages, setChatMessages, newChatMessage, setNewChatMessage, openChat, addChatMessage, markChatMessagesRead, clearChatMessages, unreadChatCount,
    // status bar data a funkce
    autoSaveStatus, serverSyncStatus, manualSaveNotes, manualSaveTodo, refreshFromServer, formatTime,
    // panel geometry
    todoPanelState, notesPanelState, notifPanelState, chatPanelState, beginPanelDrag, bringPanelFront, panelZ,
    // window controls
    minimizePanel, maximizePanel, restorePanel,
    // flush helpers
    flushNotesSave, flushTasksSave,
    notesSaving, notesLastSaved, notesSaveError,
    // server synchronization
    manualServerSync, hasServerAPI: !!notesAPI,
  };
}
