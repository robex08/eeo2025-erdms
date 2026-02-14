import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTimes, faGripLines, faStickyNote, faEye, faEyeSlash, faTrash, faBold, faItalic, faStrikethrough, faListUl } from '@fortawesome/free-solid-svg-icons';

const DEFAULT_NOTE_SIZE = { w: 240, h: 240 };

// Jednoduchá paleta "papírových" poznámek (pozadí + stín)
const NOTE_COLORS = [
  { bg: '#FEF08A', shadow: 'rgba(250, 204, 21, 0.35)' },
  { bg: '#BBF7D0', shadow: 'rgba(34, 197, 94, 0.30)' },
  { bg: '#BFDBFE', shadow: 'rgba(59, 130, 246, 0.30)' },
  { bg: '#FBCFE8', shadow: 'rgba(236, 72, 153, 0.30)' },
  { bg: '#DDD6FE', shadow: 'rgba(139, 92, 246, 0.30)' },
  { bg: '#FED7AA', shadow: 'rgba(249, 115, 22, 0.30)' },
];

const OverlayRoot = styled.div`
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 20000;
  overflow: hidden;
`;

const OverlayBackdrop = styled.div`
  position: absolute;
  inset: 0;
  /* Default: jemnější a méně "rozmazávací" – šetří oči */
  background: rgba(15, 23, 42, 0.22);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
`;

const OverlayHeader = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 3;
  pointer-events: none;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0));
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  pointer-events: auto;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  pointer-events: auto;
`;

const HeaderPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  letter-spacing: 0.4px;
  font-size: 14px;
  color: #ffffff;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: 1px solid rgba(180, 83, 9, 0.55);
  border-radius: 999px;
  padding: 8px 12px;
  box-shadow: 0 12px 28px rgba(217, 119, 6, 0.28);
  opacity: 0.95;
`;

const HeaderBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  cursor: pointer;
  border-radius: 999px;
  padding: 10px 14px;
  font-weight: 800;
  font-size: 13px;
  letter-spacing: 0.3px;
  transition: transform 0.14s ease, filter 0.14s ease, background 0.14s ease;
  user-select: none;
  opacity: 0.95;

  &:active {
    transform: scale(0.98);
  }

  &:hover {
    opacity: 1;
  }
`;

const AddBtn = styled(HeaderBtn)`
  background: linear-gradient(135deg, #16a34a, #15803d);
  color: #fef08a; /* světle žlutá */
  border: 1px solid rgba(21, 128, 61, 0.55);
  box-shadow: 0 12px 26px rgba(22, 163, 74, 0.20);

  &:hover {
    filter: brightness(1.08) saturate(1.05);
    transform: translateY(-1px);
  }
`;

const ClearAllBtn = styled(HeaderBtn)`
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #ffffff;
  border: 1px solid rgba(220, 38, 38, 0.55);
  box-shadow: 0 10px 22px rgba(220, 38, 38, 0.22);

  &:hover {
    filter: brightness(1.06);
  }
`;

const CloseBtn = styled(HeaderBtn)`
  background: rgba(255, 255, 255, 0.65);
  color: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.40);
  padding: 10px;
  width: 42px;
  height: 42px;

  &:hover {
    filter: brightness(1.05);
    transform: rotate(4deg);
  }
`;

const EffectBtn = styled(CloseBtn)`
  /* stejný vzhled jako X, jen bez rotace */
  &:hover {
    transform: none;
  }
`;

const NotesArea = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
`;

const NoteCard = styled.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  border: 1px solid rgba(2, 6, 23, 0.08);
  will-change: transform;
  /* Pozor: pin je částečně mimo kartu (negativní top) → nesmí se ořezávat */
  overflow: visible;
`;

const NotePin = styled.div`
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  pointer-events: none;

  .pin {
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: #dc2626;
    border: 2px solid #7f1d1d;
    box-shadow: 0 10px 16px rgba(2, 6, 23, 0.22);
    position: relative;
  }

  .pin::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 4px;
    height: 4px;
    background: rgba(255, 255, 255, 0.55);
    border-radius: 999px;
  }
`;

const NoteHeader = styled.div`
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px 0;
  opacity: 0;
  transition: opacity 0.16s ease;
`;

const NoteGrip = styled.div`
  color: rgba(2, 6, 23, 0.25);
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const NoteDeleteBtn = styled.button`
  border: 0;
  background: transparent;
  cursor: pointer;
  color: rgba(71, 85, 105, 0.80);
  width: 26px;
  height: 26px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.14s ease, color 0.14s ease;

  &:hover {
    background: rgba(2, 6, 23, 0.05);
    color: #dc2626;
  }
`;

const NoteFormatGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const NoteFormatBtn = styled.button`
  border: 0;
  background: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  color: rgba(51, 65, 85, 0.95);
  width: 26px;
  height: 26px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1em; /* sjednotit velikost ikon */
  line-height: 1;
  transition: background 0.14s ease, filter 0.14s ease;

  .svg-inline--fa {
    width: 1em;
    height: 1em;
    font-size: 1em;
    line-height: 1;
    display: block;
  }

  &:hover {
    background: rgba(2, 6, 23, 0.06);
    filter: brightness(1.02);
  }
`;

const NoteEditor = styled.div`
  width: 100%;
  flex: 1;
  min-height: 0; /* důležité pro scroll uvnitř flex containeru */
  border: 0;
  outline: none;
  background: transparent;
  padding: 10px 12px 12px;
  font-size: 16px; /* +2px */
  font-weight: 400; /* výchozí NE tučné */
  line-height: 1.4;
  color: #0f172a;
  caret-color: #0f172a;
  font-family: "Comic Sans MS", "Chalkboard SE", "Segoe Print", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  cursor: text !important;

  /* decentní scrollbar */
  scrollbar-width: thin;
  scrollbar-color: rgba(15, 23, 42, 0.28) rgba(255, 255, 255, 0.18);
  &::-webkit-scrollbar { width: 10px; }
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.18);
    border-left: 1px solid rgba(2, 6, 23, 0.06);
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(15, 23, 42, 0.22);
    border-radius: 999px;
    border: 2px solid rgba(255, 255, 255, 0.20);
  }
  &::-webkit-scrollbar-thumb:hover { background: rgba(15, 23, 42, 0.34); }

  & > div, & > p { margin: 0; }

  /* Explicitní vykreslení základních HTML tagů */
  b, strong { font-weight: 800; }
  i, em { font-style: italic; }
  s, strike { text-decoration: line-through; }
  /* Odrážky: standardní HTML puntík + odsazení */
  ul {
    margin: 0.25rem 0;
    /* vizuálně jako: (space)(space)•(space)text */
    padding-left: 2ch;
    list-style-position: outside;
  }
  li {
    margin: 0;
    padding-left: 0;
  }
  li::marker {
    font-size: 1em;
    content: "• "; /* jedna mezera ZA puntíkem */
  }

  &::selection {
    background: rgba(37, 99, 235, 0.22);
  }
`;

const FoldCorner = styled.div`
  position: absolute;
  right: 0;
  bottom: 0;
  width: 20px;
  height: 20px;
  background: rgba(2, 6, 23, 0.06);
  border-top-left-radius: 10px;
  pointer-events: none;
  z-index: 1;
`;

const NoteFooter = styled.div`
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* vpravo bez paddingu, aby resize "roh" seděl na hranu */
  padding: 0 0 0 8px;
  background: rgba(255, 255, 255, 0.20);
  border-top: 1px solid rgba(2, 6, 23, 0.06);
  color: rgba(15, 23, 42, 0.55);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.2px;
  flex-shrink: 0;
  pointer-events: auto;
  user-select: none;
`;

const NoteFooterRight = styled.div`
  pointer-events: auto; /* allow resize handle */
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  margin-right: 0;
`;

const ResizeHandle = styled.div`
  position: relative;
  width: 22px;
  height: 22px;
  cursor: nwse-resize;
  z-index: 10;
  background: transparent;

  /* jemná "mřížka" do rohu jako indikace resize */
  &::after {
    content: '';
    position: absolute;
    right: 4px;
    bottom: 4px;
    width: 12px;
    height: 12px;
    border-right: 2px solid rgba(2, 6, 23, 0.18);
    border-bottom: 2px solid rgba(2, 6, 23, 0.18);
    border-radius: 2px;
    transform: rotate(0deg);
  }
`;

const ConfirmBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.35);
  z-index: 25000;
`;

const ConfirmCard = styled.div`
  position: fixed;
  left: 50%;
  top: 96px;
  transform: translateX(-50%);
  width: min(520px, calc(100vw - 32px));
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 14px;
  box-shadow: 0 24px 60px rgba(2, 6, 23, 0.30);
  z-index: 25001;
  padding: 14px 14px 12px;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
`;

const ConfirmTitle = styled.div`
  font-weight: 900;
  font-size: 15px;
  letter-spacing: 0.2px;
  color: rgba(15, 23, 42, 0.92);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
`;

const ConfirmText = styled.div`
  font-size: 13px;
  line-height: 1.45;
  color: rgba(30, 41, 59, 0.85);
  margin-bottom: 12px;
  white-space: pre-wrap;
`;

const ConfirmActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

const ConfirmBtn = styled.button`
  border: 0;
  cursor: pointer;
  border-radius: 10px;
  padding: 10px 12px;
  font-weight: 900;
  font-size: 13px;
  letter-spacing: 0.2px;
  transition: transform 0.12s ease, filter 0.12s ease, background 0.12s ease;
  user-select: none;
  &:active { transform: scale(0.99); }
`;

const ConfirmCancel = styled(ConfirmBtn)`
  background: rgba(148, 163, 184, 0.18);
  color: rgba(15, 23, 42, 0.9);
  &:hover { filter: brightness(1.03); }
`;

const ConfirmDanger = styled(ConfirmBtn)`
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  &:hover { filter: brightness(1.05); }
`;

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function stripHtmlToText(html) {
  try {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(String(html), 'text/html');
    return (doc.body?.textContent || '').replace(/\s+/g, ' ').trim();
  } catch {
    return String(html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

// Jednoduché sanitizování – povolit jen pár tagů (zbytek převést na text)
function sanitizeNoteHtml(html) {
  try {
    const allowed = new Set(['B', 'I', 'S', 'STRIKE', 'UL', 'LI', 'BR', 'DIV', 'P']);
    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');

    const cleanNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return;
      if (node.nodeType === Node.COMMENT_NODE) { node.remove(); return; }
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const el = node;
      const tag = el.tagName;

      // Kill dangerous elements entirely
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'IFRAME' || tag === 'OBJECT' || tag === 'EMBED') {
        el.remove();
        return;
      }

      // Strip all attributes (including on* handlers)
      [...el.attributes].forEach((attr) => el.removeAttribute(attr.name));

      // Normalize strong/em -> b/i
      if (tag === 'STRONG') {
        const b = doc.createElement('b');
        b.innerHTML = el.innerHTML;
        el.replaceWith(b);
        cleanNode(b);
        return;
      }
      if (tag === 'EM') {
        const i = doc.createElement('i');
        i.innerHTML = el.innerHTML;
        el.replaceWith(i);
        cleanNode(i);
        return;
      }

      if (!allowed.has(tag)) {
        const text = doc.createTextNode(el.textContent || '');
        el.replaceWith(text);
        return;
      }

      [...el.childNodes].forEach(cleanNode);
    };

    [...doc.body.childNodes].forEach(cleanNode);
    return doc.body.innerHTML;
  } catch {
    return String(html || '')
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '');
  }
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function StickyNotesOverlay({ open, onClose, storageKey }) {
  const resolvedStorageKey = storageKey || 'eeo_v2_sticky_notes_overlay_v1';
  const prefsKey = `${resolvedStorageKey}__prefs`;
  const [notes, setNotes] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const [focusedId, setFocusedId] = useState(null);
  const [resizingId, setResizingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [zIndexCounter, setZIndexCounter] = useState(1);
  const zRef = useRef(1);
  const notesRef = useRef(notes);
  const editorRefs = useRef(new Map());

  // Eye-friendly backdrop settings (persisted)
  const [blurEnabled, setBlurEnabled] = useState(true);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    zRef.current = zIndexCounter;
  }, [zIndexCounter]);

  const loadNotes = useCallback(() => {
    try {
      const saved = localStorage.getItem(resolvedStorageKey);
      if (!saved) {
        setNotes([]);
        setZIndexCounter(1);
        return;
      }
      const parsed = safeParse(saved);
      if (!Array.isArray(parsed)) {
        setNotes([]);
        setZIndexCounter(1);
        return;
      }
      // Migrace: doplnit createdAt pro staré záznamy
      const migrated = parsed.map((n) => {
        const idNum = (typeof n?.id === 'number' && Number.isFinite(n.id)) ? n.id : Date.now();
        const createdAt = (typeof n?.createdAt === 'number' && Number.isFinite(n.createdAt))
          ? n.createdAt
          : idNum;
        return { ...n, createdAt };
      });

      setNotes(migrated);
      if (migrated.length > 0) {
        const maxZ = Math.max(...migrated.map((n) => Number(n?.zIndex || 1)));
        setZIndexCounter((Number.isFinite(maxZ) ? maxZ : 1) + 1);
      } else {
        setZIndexCounter(1);
      }
    } catch {
      setNotes([]);
      setZIndexCounter(1);
    }
  }, [resolvedStorageKey]);

  // Načti prefs (blur)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(prefsKey);
      const parsed = safeParse(raw);
      if (parsed && typeof parsed === 'object' && typeof parsed.blurEnabled === 'boolean') {
        setBlurEnabled(parsed.blurEnabled);
      } else {
        setBlurEnabled(true);
      }
    } catch {
      setBlurEnabled(true);
    }
  }, [prefsKey]);

  // Ulož prefs (blur)
  useEffect(() => {
    try {
      localStorage.setItem(prefsKey, JSON.stringify({ blurEnabled }));
    } catch {
      // ignore
    }
  }, [prefsKey, blurEnabled]);

  // Načti při mountu + při změně storageKey
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Persist do LS
  useEffect(() => {
    try {
      localStorage.setItem(resolvedStorageKey, JSON.stringify(notes));
    } catch {
      // ignore
    }
  }, [notes, resolvedStorageKey]);

  // Zamknout scroll pod overlay
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // ESC zavře
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        // Pokud je otevřený potvrzovací dialog, zavři jen dialog
        if (confirmDelete?.open) {
          setConfirmDelete({ open: false, id: null });
          return;
        }
        if (confirmClearAll) {
          setConfirmClearAll(false);
          return;
        }
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, confirmDelete?.open, confirmClearAll]);

  const addNote = useCallback((x, y, content = '') => {
    const randomRotation = Math.random() * 4 - 2;
    const colorIdx = Math.floor(Math.random() * NOTE_COLORS.length);

    const currentZ = zRef.current || 1;

    const vw = window.innerWidth || 1200;
    const vh = window.innerHeight || 800;

    const finalX = (typeof x === 'number') ? x : (vw / 2 - DEFAULT_NOTE_SIZE.w / 2);
    const finalY = (typeof y === 'number') ? y : (vh / 3 - DEFAULT_NOTE_SIZE.h / 2);

    const id = Date.now() + Math.floor(Math.random() * 1000);
    const newNote = {
      id,
      x: clamp(finalX, 8, Math.max(8, vw - DEFAULT_NOTE_SIZE.w - 8)),
      y: clamp(finalY, 80, Math.max(80, vh - DEFAULT_NOTE_SIZE.h - 64)),
      content,
      colorIdx,
      rotation: randomRotation,
      zIndex: currentZ,
      width: DEFAULT_NOTE_SIZE.w,
      height: DEFAULT_NOTE_SIZE.h,
      createdAt: Date.now(),
    };

    setNotes((prev) => [...prev, newNote]);
    zRef.current = currentZ + 1;
    setZIndexCounter(zRef.current);
  }, []);

  // Pokud uživatel nemá nic uloženého, přidat úvodní poznámku (jen jednou)
  useEffect(() => {
    if (!open) return;
    if (notesRef.current.length > 0) return;
    addNote(undefined, undefined, 'Poznámky (SUPERADMIN)\n\n• Přidej další lístečky tlačítkem „Nová“\n• Ukládá se zatím jen do LocalStorage');
  }, [open, addNote]);

  const bringToFront = useCallback((id) => {
    const currentZ = zRef.current || 1;
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, zIndex: currentZ } : n)));
    zRef.current = currentZ + 1;
    setZIndexCounter(zRef.current);
  }, []);

  const updateContent = useCallback((id, content) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, content } : n)));
  }, []);

  const removeNote = useCallback((id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAllNotes = useCallback(() => {
    setNotes([]);
    zRef.current = 1;
    setZIndexCounter(1);
  }, []);

  const requestDeleteNote = useCallback((id) => {
    setConfirmDelete({ open: true, id });
  }, []);

  const focusEditor = useCallback((id) => {
    const el = editorRefs.current.get(id);
    if (!el) return false;
    try { el.focus(); return true; } catch { return false; }
  }, []);

  const execEditorCommand = useCallback((id, cmd) => {
    if (!focusEditor(id)) return;
    try { document.execCommand(cmd, false); } catch {}
    window.requestAnimationFrame(() => {
      try {
        const el = editorRefs.current.get(id);
        if (!el) return;
        updateContent(id, sanitizeNoteHtml(el.innerHTML));
      } catch {}
    });
  }, [focusEditor, updateContent]);

  

  // Sync editor DOM (jen pro nefokusované poznámky, aby kurzor neskákal)
  useEffect(() => {
    if (!open) return;
    for (const n of notes) {
      if (n.id === focusedId) continue;
      const el = editorRefs.current.get(n.id);
      if (!el) continue;
      const desired = sanitizeNoteHtml(n.content || '');
      if (el.innerHTML !== desired) el.innerHTML = desired;
    }
  }, [open, notes, focusedId]);

  const onPointerDown = useCallback((e, id) => {
    // Nech textarea/btn dělat svoje
    const t = e.target;
    // Resize handle má vlastní pointerdown
    if (t?.closest?.('[data-resize-handle]')) return;
    if (t?.closest?.('[data-note-editor]') || t?.closest?.('button')) return;

    const note = notesRef.current.find((n) => n.id === id);
    if (!note) return;

    bringToFront(id);
    setDraggingId(id);
    setDragOffset({ x: e.clientX - note.x, y: e.clientY - note.y });
  }, [bringToFront]);

  const onResizePointerDown = useCallback((e, id) => {
    e.preventDefault();
    e.stopPropagation();

    const note = notesRef.current.find((n) => n.id === id);
    if (!note) return;

    bringToFront(id);
    setResizingId(id);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      w: Number(note.width || DEFAULT_NOTE_SIZE.w),
      h: Number(note.height || DEFAULT_NOTE_SIZE.h),
    });
  }, [bringToFront]);

  useEffect(() => {
    if (!open) return;
    if (!draggingId) return;

    const onMove = (e) => {
      const vw = window.innerWidth || 1200;
      const vh = window.innerHeight || 800;
      setNotes((prev) => prev.map((n) => {
        if (n.id !== draggingId) return n;
        const nx = clamp(e.clientX - dragOffset.x, 8, Math.max(8, vw - (n.width || DEFAULT_NOTE_SIZE.w) - 8));
        const ny = clamp(e.clientY - dragOffset.y, 80, Math.max(80, vh - (n.height || DEFAULT_NOTE_SIZE.h) - 64));
        return { ...n, x: nx, y: ny };
      }));
    };

    const onUp = () => setDraggingId(null);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [open, draggingId, dragOffset]);

  useEffect(() => {
    if (!open) return;
    if (!resizingId) return;

    const onMove = (e) => {
      const note = notesRef.current.find((n) => n.id === resizingId);
      if (!note) return;

      const vw = window.innerWidth || 1200;
      const vh = window.innerHeight || 800;

      const minW = 160;
      const minH = 140;
      const maxW = Math.max(minW, (vw - (note.x || 0) - 12));
      const maxH = Math.max(minH, (vh - (note.y || 0) - 12));

      const dw = e.clientX - resizeStart.x;
      const dh = e.clientY - resizeStart.y;

      const nextW = clamp(resizeStart.w + dw, minW, maxW);
      const nextH = clamp(resizeStart.h + dh, minH, maxH);

      setNotes((prev) => prev.map((n) => (
        n.id === resizingId ? { ...n, width: nextW, height: nextH } : n
      )));
    };

    const onUp = () => setResizingId(null);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [open, resizingId, resizeStart]);

  const portalNode = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return document.body;
  }, []);

  if (!open || !portalNode) return null;

  const formatCreatedAt = (ts) => {
    try {
      if (!ts) return '';
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const confirmNote = confirmDelete?.open
    ? notes.find((n) => n.id === confirmDelete.id)
    : null;
  const notesCount = notes?.length || 0;

  return createPortal(
    <OverlayRoot role="dialog" aria-label="Sticky NOTES" aria-modal="true">
      <OverlayBackdrop
        style={blurEnabled
          ? undefined
          : {
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none',
              background: 'rgba(15, 23, 42, 0.30)',
            }
        }
      />

      <OverlayHeader>
        <HeaderLeft>
          <HeaderPill>
            <FontAwesomeIcon icon={faStickyNote} /> Tabule poznámek
          </HeaderPill>
          <AddBtn type="button" onClick={() => addNote()}>
            <FontAwesomeIcon icon={faPlus} /> Nová
          </AddBtn>
          <ClearAllBtn
            type="button"
            onClick={() => setConfirmClearAll(true)}
            title="Smazat všechny poznámky"
          >
            <FontAwesomeIcon icon={faTrash} /> Smazat vše
          </ClearAllBtn>
        </HeaderLeft>

        <HeaderRight>
          <EffectBtn
            type="button"
            onClick={() => setBlurEnabled((v) => !v)}
            title={blurEnabled ? 'Efekt pozadí: jemný blur (klik pro vypnutí)' : 'Efekt pozadí: bez blur (klik pro zapnutí)'}
            aria-label={blurEnabled ? 'Vypnout rozmazání pozadí' : 'Zapnout rozmazání pozadí'}
          >
            <FontAwesomeIcon icon={blurEnabled ? faEye : faEyeSlash} />
          </EffectBtn>
          <CloseBtn type="button" onClick={() => onClose?.()} title="Zavřít (Esc)">
            <FontAwesomeIcon icon={faTimes} />
          </CloseBtn>
        </HeaderRight>
      </OverlayHeader>

      <NotesArea>
        {notes.map((note) => {
          const palette = NOTE_COLORS[note.colorIdx] || NOTE_COLORS[0];
          const isDragging = draggingId === note.id;
          const isFocused = focusedId === note.id;
          return (
            <NoteCard
              key={note.id}
              onPointerDown={(e) => onPointerDown(e, note.id)}
              style={{
                left: note.x,
                top: note.y,
                width: note.width || DEFAULT_NOTE_SIZE.w,
                height: note.height || DEFAULT_NOTE_SIZE.h,
                zIndex: note.zIndex || 1,
                background: palette.bg,
                boxShadow: isDragging
                  ? `0 22px 44px rgba(2, 6, 23, 0.25)`
                  : `0 10px 26px ${palette.shadow}`,
                // ⚠️ Workaround: caret kurzor může zmizet v transformovaných prvcích.
                // Když je editor focusnutý, dočasně vypneme rotaci/transform.
                transform: isFocused
                  ? `scale(${isDragging ? 1.04 : 1.02})`
                  : `rotate(${note.rotation || 0}deg) ${isDragging ? 'scale(1.04)' : ''}`,
                cursor: isDragging ? 'grabbing' : (isFocused ? 'default' : 'grab'),
                transition: isDragging ? 'none' : 'box-shadow 0.16s ease, transform 0.16s ease',
              }}
              onClick={() => bringToFront(note.id)}
              onMouseEnter={(e) => {
                const header = e.currentTarget.querySelector('[data-note-header="1"]');
                if (header) header.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                const header = e.currentTarget.querySelector('[data-note-header="1"]');
                if (header) header.style.opacity = '0';
              }}
            >
              <NotePin><div className="pin" /></NotePin>
              <NoteHeader data-note-header="1">
                <NoteGrip title="Přetáhni"><FontAwesomeIcon icon={faGripLines} /></NoteGrip>
                <NoteFormatGroup>
                  <NoteFormatBtn
                    type="button"
                    title="Tučné: <b>…</b>"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onClick={(e) => {
                      e.preventDefault(); e.stopPropagation();
                      bringToFront(note.id);
                      setFocusedId(note.id);
                      execEditorCommand(note.id, 'bold');
                    }}
                  >
                    <FontAwesomeIcon icon={faBold} />
                  </NoteFormatBtn>
                  <NoteFormatBtn
                    type="button"
                    title="Kurzíva: <i>…</i>"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onClick={(e) => {
                      e.preventDefault(); e.stopPropagation();
                      bringToFront(note.id);
                      setFocusedId(note.id);
                      execEditorCommand(note.id, 'italic');
                    }}
                  >
                    <FontAwesomeIcon icon={faItalic} />
                  </NoteFormatBtn>
                  <NoteFormatBtn
                    type="button"
                    title="Přeškrtnuté: <s>…</s>"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onClick={(e) => {
                      e.preventDefault(); e.stopPropagation();
                      bringToFront(note.id);
                      setFocusedId(note.id);
                      execEditorCommand(note.id, 'strikeThrough');
                    }}
                  >
                    <FontAwesomeIcon icon={faStrikethrough} />
                  </NoteFormatBtn>
                  <NoteFormatBtn
                    type="button"
                    title="Odrážky: <ul><li>…</li></ul>"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onClick={(e) => {
                      e.preventDefault(); e.stopPropagation();
                      bringToFront(note.id);
                      setFocusedId(note.id);
                      execEditorCommand(note.id, 'insertUnorderedList');
                    }}
                  >
                    <FontAwesomeIcon icon={faListUl} />
                  </NoteFormatBtn>
                  <NoteDeleteBtn
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      requestDeleteNote(note.id);
                    }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    title="Smazat"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </NoteDeleteBtn>
                </NoteFormatGroup>
              </NoteHeader>
              <NoteEditor
                contentEditable
                suppressContentEditableWarning
                data-note-editor
                ref={(el) => {
                  if (el) {
                    editorRefs.current.set(note.id, el);
                    // initial sync (u focused poznámky DOM nepřepisuj)
                    if (focusedId !== note.id) {
                      const desired = sanitizeNoteHtml(note.content || '');
                      if (el.innerHTML !== desired) el.innerHTML = desired;
                    }
                  } else {
                    editorRefs.current.delete(note.id);
                  }
                }}
                onFocus={(e) => {
                  setFocusedId(note.id);
                  bringToFront(note.id);
                  // při focusu ještě projdi sanitize (ale nech caret)
                  try {
                    const html = sanitizeNoteHtml(e.currentTarget.innerHTML);
                    updateContent(note.id, html);
                  } catch {}
                }}
                onBlur={(e) => {
                  try {
                    const html = sanitizeNoteHtml(e.currentTarget.innerHTML);
                    updateContent(note.id, html);
                    e.currentTarget.innerHTML = html;
                  } catch {}
                  setFocusedId((prev) => (prev === note.id ? null : prev));
                }}
                onInput={(e) => {
                  try {
                    const html = sanitizeNoteHtml(e.currentTarget.innerHTML);
                    updateContent(note.id, html);
                  } catch {}
                }}
                onPaste={(e) => {
                  // vlož jen plain text
                  try {
                    e.preventDefault();
                    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
                    document.execCommand('insertText', false, text);
                  } catch {}
                }}
                role="textbox"
                aria-label="Poznámka"
              />
              <NoteFooter>
                <span>{formatCreatedAt(note.createdAt)}</span>
                <NoteFooterRight>
                  <ResizeHandle
                    data-resize-handle
                    onPointerDown={(e) => onResizePointerDown(e, note.id)}
                    title="Změnit velikost"
                  />
                </NoteFooterRight>
              </NoteFooter>
              <FoldCorner />
            </NoteCard>
          );
        })}
      </NotesArea>

      {/* Confirm delete (portál) */}
      {confirmDelete?.open && createPortal(
        <>
          <ConfirmBackdrop
            onMouseDown={(e) => {
              e.preventDefault();
              setConfirmDelete({ open: false, id: null });
            }}
          />
          <ConfirmCard
            role="dialog"
            aria-modal="true"
            aria-label="Potvrzení smazání poznámky"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ConfirmTitle>
              Smazat poznámku?
              <CloseBtn
                type="button"
                onClick={() => setConfirmDelete({ open: false, id: null })}
                title="Zavřít"
                style={{ width: 38, height: 38 }}
              >
                <FontAwesomeIcon icon={faTimes} />
              </CloseBtn>
            </ConfirmTitle>
            <ConfirmText>
              Opravdu chcete tuto poznámku smazat? Akce je nevratná.
              {confirmNote?.content ? `\n\nObsah (náhled):\n${stripHtmlToText(confirmNote.content).slice(0, 180)}${stripHtmlToText(confirmNote.content).length > 180 ? '…' : ''}` : ''}
            </ConfirmText>
            <ConfirmActions>
              <ConfirmCancel type="button" onClick={() => setConfirmDelete({ open: false, id: null })}>
                Zrušit
              </ConfirmCancel>
              <ConfirmDanger
                type="button"
                onClick={() => {
                  const id = confirmDelete.id;
                  setConfirmDelete({ open: false, id: null });
                  if (id != null) removeNote(id);
                }}
              >
                Smazat
              </ConfirmDanger>
            </ConfirmActions>
          </ConfirmCard>
        </>,
        portalNode
      )}

      {/* Confirm clear all (portál) */}
      {confirmClearAll && createPortal(
        <>
          <ConfirmBackdrop
            onMouseDown={(e) => {
              e.preventDefault();
              setConfirmClearAll(false);
            }}
          />
          <ConfirmCard
            role="dialog"
            aria-modal="true"
            aria-label="Potvrzení smazání všech poznámek"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ConfirmTitle>
              Smazat všechny poznámky?
              <CloseBtn
                type="button"
                onClick={() => setConfirmClearAll(false)}
                title="Zavřít"
                style={{ width: 38, height: 38 }}
              >
                <FontAwesomeIcon icon={faTimes} />
              </CloseBtn>
            </ConfirmTitle>
            <ConfirmText>
              {`Pozor: smažete všechny poznámky (${notesCount}).\n\nTato akce je nevratná.`}
            </ConfirmText>
            <ConfirmActions>
              <ConfirmCancel type="button" onClick={() => setConfirmClearAll(false)}>
                Zrušit
              </ConfirmCancel>
              <ConfirmDanger
                type="button"
                onClick={() => {
                  setConfirmClearAll(false);
                  clearAllNotes();
                }}
              >
                Smazat vše
              </ConfirmDanger>
            </ConfirmActions>
          </ConfirmCard>
        </>,
        portalNode
      )}
    </OverlayRoot>,
    portalNode
  );
}
