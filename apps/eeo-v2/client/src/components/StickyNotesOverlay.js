import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTimes, faGripLines, faStickyNote, faEye, faEyeSlash, faTrash, faBold, faItalic, faStrikethrough, faListUl, faExclamationTriangle, faShareNodes, faUsers, faUser, faLayerGroup, faSearch } from '@fortawesome/free-solid-svg-icons';
import { bulkUpsertStickyNotes, clearAllStickyNotes, deleteStickyNote, listStickyNotes, grantStickyShare, listStickyShares, revokeStickyShare } from '../services/StickyNotesAPI';
import { fetchEmployees, fetchUseky } from '../services/api2auth';

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
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
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
  justify-self: start;
`;

const HeaderCenter = styled.div`
  pointer-events: auto;
  justify-self: center;
  min-width: 0;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  pointer-events: auto;
  justify-self: end;
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

const HeaderSearch = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.32);
  box-shadow: 0 12px 26px rgba(2, 6, 23, 0.10);
  opacity: 0.98;

  .icon {
    color: rgba(30, 41, 59, 0.62);
  }
`;

const HeaderSearchInput = styled.input`
  border: 0;
  outline: none;
  background: transparent;
  font-weight: 900;
  font-size: 13px;
  color: rgba(15, 23, 42, 0.90);
  width: min(320px, 46vw);

  &::placeholder {
    color: rgba(30, 41, 59, 0.42);
    font-weight: 600;
  }
`;

const HeaderSearchClear = styled.button`
  border: 0;
  background: rgba(15, 23, 42, 0.06);
  color: rgba(30, 41, 59, 0.78);
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.14s ease, transform 0.14s ease;

  &:hover { background: rgba(15, 23, 42, 0.10); }
  &:active { transform: scale(0.98); }
`;

const SearchCountPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 900;
  font-size: 12px;
  letter-spacing: 0.3px;
  color: rgba(120, 53, 15, 0.92);
  background: rgba(254, 243, 199, 0.78);
  border: 1px solid rgba(180, 83, 9, 0.22);
  border-radius: 999px;
  padding: 8px 10px;
  box-shadow: 0 12px 26px rgba(180, 83, 9, 0.10);
`;

const DbErrorPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 12px;
  color: #ffffff;
  background: rgba(220, 38, 38, 0.85);
  border: 1px solid rgba(127, 29, 29, 0.55);
  border-radius: 999px;
  padding: 8px 10px;
  box-shadow: 0 10px 22px rgba(220, 38, 38, 0.18);
  opacity: 0.95;
  max-width: min(520px, 70vw);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

const EmptyState = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  color: rgba(255, 255, 255, 0.92);
  font-weight: 800;
  letter-spacing: 0.2px;
  text-shadow: 0 12px 28px rgba(2, 6, 23, 0.45);

  .box {
    max-width: 720px;
    background: rgba(15, 23, 42, 0.28);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 14px;
    padding: 18px 18px;
    box-shadow: 0 18px 42px rgba(2, 6, 23, 0.25);
  }

  .title {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    margin-bottom: 8px;
  }

  .hint {
    font-weight: 700;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.85);
    line-height: 1.35;
  }
`;

const LoadingPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 900;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.95);
  background: rgba(15, 23, 42, 0.38);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  padding: 8px 10px;
  box-shadow: 0 12px 28px rgba(2, 6, 23, 0.22);
  opacity: 0.98;

  .spinner {
    width: 14px;
    height: 14px;
    border-radius: 999px;
    border: 2px solid rgba(255, 255, 255, 0.35);
    border-top-color: rgba(255, 255, 255, 0.95);
    animation: spin 0.85s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ShareDrawer = styled.div`
  position: absolute;
  top: 64px;
  right: 0;
  bottom: 0;
  width: min(420px, 92vw);
  z-index: 6;
  background: rgba(254, 240, 138, 0.88); /* sticky paper */
  border-left: 1px solid rgba(180, 83, 9, 0.22);
  box-shadow: -18px 0 40px rgba(180, 83, 9, 0.14), -22px 0 44px rgba(2, 6, 23, 0.14);
  backdrop-filter: blur(8px) saturate(1.06);
  -webkit-backdrop-filter: blur(8px) saturate(1.06);
  display: flex;
  flex-direction: column;
  pointer-events: auto;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    /* jemná „papírová“ textura (čáry) */
    background:
      repeating-linear-gradient(
        180deg,
        rgba(180, 83, 9, 0.00) 0px,
        rgba(180, 83, 9, 0.00) 18px,
        rgba(180, 83, 9, 0.06) 19px
      );
    opacity: 0.55;
    mix-blend-mode: multiply;
  }
`;

const ShareDrawerHeader = styled.div`
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px 0 14px;
  border-bottom: 1px solid rgba(180, 83, 9, 0.18);
  background: rgba(254, 243, 199, 0.78);
  position: relative;
  z-index: 1;
`;

const ShareDrawerTitle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 900;
  color: rgba(120, 53, 15, 0.92);
`;

const ShareDrawerBody = styled.div`
  padding: 14px;
  overflow: auto;
  position: relative;
  z-index: 1;
`;

const ShareSection = styled.div`
  margin-bottom: 14px;

  .label {
    font-weight: 900;
    font-size: 12px;
    letter-spacing: 0.3px;
    color: rgba(15, 23, 42, 0.72);
    text-transform: uppercase;
    margin-bottom: 8px;
  }
`;

const ShareModeRow = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  border-radius: 12px;
  border: 1px solid rgba(180, 83, 9, 0.16);
  background: rgba(255, 255, 255, 0.46);
  margin-bottom: 8px;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.58);
    border-color: rgba(180, 83, 9, 0.22);
  }

  input {
    transform: translateY(0.5px);
  }

  .title {
    font-weight: 900;
    color: rgba(120, 53, 15, 0.92);
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .desc {
    margin-left: auto;
    font-weight: 800;
    font-size: 12px;
    color: rgba(120, 53, 15, 0.68);
  }
`;

const ShareSelect = styled.select`
  width: 100%;
  margin-top: 8px;
  padding: 10px 10px;
  border-radius: 12px;
  border: 1px solid rgba(180, 83, 9, 0.18);
  background: rgba(255, 255, 255, 0.62);
  font-weight: 800;
  color: rgba(120, 53, 15, 0.92);
`;

const ShareInput = styled.input`
  width: 100%;
  margin-top: 8px;
  padding: 10px 10px;
  border-radius: 12px;
  border: 1px solid rgba(180, 83, 9, 0.18);
  background: rgba(255, 255, 255, 0.62);
  font-weight: 800;
  color: rgba(120, 53, 15, 0.92);

  &::placeholder {
    color: rgba(120, 53, 15, 0.55);
  }
`;

const ShareCandidates = styled.div`
  margin-top: 8px;
  border: 1px solid rgba(180, 83, 9, 0.16);
  border-radius: 12px;
  overflow: hidden;
`;

const ShareCandidate = styled.button`
  width: 100%;
  text-align: left;
  padding: 10px 10px;
  border: 0;
  background: rgba(255, 255, 255, 0.52);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  &:hover {
    background: rgba(217, 119, 6, 0.14);
  }

  .name {
    font-weight: 900;
    color: rgba(120, 53, 15, 0.92);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .meta {
    font-weight: 800;
    font-size: 12px;
    color: rgba(120, 53, 15, 0.60);
    white-space: nowrap;
  }
`;

const ShareRightsRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;

  label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 900;
    font-size: 12px;
    color: rgba(120, 53, 15, 0.88);
    padding: 8px 10px;
    border-radius: 999px;
    border: 1px solid rgba(180, 83, 9, 0.16);
    background: rgba(255, 255, 255, 0.46);
  }

  label[aria-disabled='true'] {
    opacity: 0.55;
  }
`;

const ShareApplyBtn = styled.button`
  width: 100%;
  border: 0;
  cursor: pointer;
  border-radius: 14px;
  padding: 12px 12px;
  font-weight: 900;
  letter-spacing: 0.3px;
  color: #ffffff;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  box-shadow: 0 16px 34px rgba(217, 119, 6, 0.24);
  transition: filter 0.14s ease, transform 0.14s ease;

  &:hover { filter: brightness(1.05); transform: translateY(-1px); }
  &:active { transform: scale(0.99); }
  &:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
`;

const NoteCard = styled.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  border: ${props => props.$searchMatch ? '2px solid rgba(245, 158, 11, 0.95)' : '1px solid rgba(2, 6, 23, 0.08)'};
  box-shadow: ${props => props.$searchMatch ? '0 0 0 2px rgba(245, 158, 11, 0.25), 0 12px 26px rgba(2, 6, 23, 0.14)' : 'none'};
  will-change: transform;
  /* Pozor: pin je částečně mimo kartu (negativní top) → nesmí se ořezávat */
  overflow: visible;

  /* Pulsující "glow" při hledání (jen pár sekund) */
  &::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 12px;
    pointer-events: none;
    opacity: ${props => props.$searchMatch ? 1 : 0};
    transition: opacity 0.16s ease;

    border: 2px solid rgba(245, 158, 11, 0.65);
    box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.22), 0 0 22px rgba(245, 158, 11, 0.18);

    animation: ${props => (props.$searchMatch && props.$searchPulse) ? 'stickySearchPulse 1.15s ease-in-out 0s 3' : 'none'};
  }

  @keyframes stickySearchPulse {
    0% {
      opacity: 0.50;
      filter: saturate(1.00);
    }
    50% {
      opacity: 1.00;
      filter: saturate(1.18);
    }
    100% {
      opacity: 0.55;
      filter: saturate(1.00);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &::after { animation: none; }
  }
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

const NoteShareBtn = styled(NoteDeleteBtn)`
  &:hover {
    background: rgba(2, 6, 23, 0.05);
    color: rgba(30, 64, 175, 0.95);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
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

const NoteFooterLeft = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

const NoteSharedIndicator = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 8px;
  color: rgba(30, 64, 175, 0.75);
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(30, 64, 175, 0.22);
  cursor: default;
  flex: 0 0 18px;

  .svg-inline--fa {
    width: 12px;
    height: 12px;
  }
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

function getPlainTextFromHtml(html) {
  try {
    const s = String(html || '');
    return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

function foldCzForSearch(s) {
  try {
    // NFD rozloží diakritiku do combining marks; ty odstraníme.
    // Výsledek je case-insensitive a bez diakritiky.
    return String(s || '')
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '')
      .toLowerCase();
  } catch {
    // fallback (bez unicode property escapes)
    return String(s || '')
      .toLowerCase();
  }
}

function findFoldedMatchRanges(originalText, query) {
  try {
    const qRaw = String(query || '').trim();
    if (!qRaw) return [];

    const foldedQuery = foldCzForSearch(qRaw);
    if (!foldedQuery) return [];

    const text = String(originalText || '');
    if (!text) return [];

    // postav "folded" string a mapování foldedIndex -> originalIndex
    let folded = '';
    const map = [];
    for (let oi = 0; oi < text.length; oi += 1) {
      const ch = text[oi];
      const f = foldCzForSearch(ch);
      if (!f) continue;
      for (let k = 0; k < f.length; k += 1) {
        folded += f[k];
        map.push(oi);
      }
    }

    if (!folded) return [];

    const ranges = [];
    let pos = 0;
    while (pos < folded.length) {
      const idx = folded.indexOf(foldedQuery, pos);
      if (idx === -1) break;
      const endFold = idx + foldedQuery.length;
      const startOrig = map[idx];
      const endOrig = (map[endFold - 1] ?? startOrig) + 1;

      // ochrana: jen validní rozsahy
      if (Number.isFinite(startOrig) && Number.isFinite(endOrig) && endOrig > startOrig) {
        ranges.push([startOrig, endOrig]);
      }
      pos = endFold;
    }

    // merge překryvy / adjacency
    if (ranges.length <= 1) return ranges;
    ranges.sort((a, b) => a[0] - b[0]);
    const merged = [ranges[0]];
    for (let i = 1; i < ranges.length; i += 1) {
      const last = merged[merged.length - 1];
      const cur = ranges[i];
      if (cur[0] <= last[1]) {
        last[1] = Math.max(last[1], cur[1]);
      } else {
        merged.push(cur);
      }
    }
    return merged;
  } catch {
    return [];
  }
}

function applySearchHighlightHtml(html, query) {
  try {
    const qRaw = String(query || '').trim();
    if (!qRaw) return String(html || '');

    const doc = new DOMParser().parseFromString(`<div>${String(html || '')}</div>`, 'text/html');
    const root = doc.body?.firstChild || doc.body;
    if (!root) return String(html || '');

    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node = walker.nextNode();
    while (node) {
      const val = String(node.nodeValue || '');
      if (val && foldCzForSearch(val).includes(foldCzForSearch(qRaw))) {
        textNodes.push(node);
      }
      node = walker.nextNode();
    }

    for (const textNode of textNodes) {
      const text = String(textNode.nodeValue || '');
      const ranges = findFoldedMatchRanges(text, qRaw);
      if (!ranges.length) continue;

      const frag = doc.createDocumentFragment();
      let cursor = 0;
      for (const [a, b] of ranges) {
        if (a > cursor) frag.appendChild(doc.createTextNode(text.slice(cursor, a)));

        const span = doc.createElement('span');
        span.textContent = text.slice(a, b);
        // Podbarvení bez CSS tříd/atributů (sanitizace by je stejně odstranila)
        span.style.background = 'rgba(254, 243, 199, 0.92)';
        span.style.boxShadow = '0 0 0 1px rgba(180, 83, 9, 0.14)';
        span.style.borderRadius = '4px';
        span.style.padding = '0 1px';
        span.style.margin = '0 -1px';
        frag.appendChild(span);

        cursor = b;
      }
      if (cursor < text.length) frag.appendChild(doc.createTextNode(text.slice(cursor)));

      textNode.parentNode?.replaceChild(frag, textNode);
    }

    return root.innerHTML;
  } catch {
    return String(html || '');
  }
}

export default function StickyNotesOverlay({ open, onClose, storageKey, apiAuth }) {
  const resolvedStorageKey = storageKey || 'eeo_v2_sticky_notes_overlay_v1';
  const prefsKey = `${resolvedStorageKey}__prefs`;
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPulseOn, setSearchPulseOn] = useState(false);
  const [dbHydratedOnce, setDbHydratedOnce] = useState(false);
  const [dbLastError, setDbLastError] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [focusedId, setFocusedId] = useState(null);
  const focusedIdRef = useRef(focusedId);
  const searchQueryRef = useRef(searchQuery);
  const [resizingId, setResizingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [zIndexCounter, setZIndexCounter] = useState(1);
  const zRef = useRef(1);
  const notesRef = useRef(notes);
  const editorRefs = useRef(new Map());
  const dirtyIdsRef = useRef(new Set());
  const saveTimerRef = useRef(null);
  const savingRef = useRef(false);
  const refreshCooldownRef = useRef(new Map()); // dbId -> last refresh ts

  const apiAuthRef = useRef(apiAuth);

  useEffect(() => {
    apiAuthRef.current = apiAuth;
  }, [apiAuth]);

  useEffect(() => {
    focusedIdRef.current = focusedId;
  }, [focusedId]);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      prefetchedShareIdsRef.current = new Set();
      shareLookupsLoadedRef.current = false;
    }
  }, [open]);

  // Po změně hledání krátce "pulzni" zvýraznění nalezených poznámek
  useEffect(() => {
    const q = String(searchQuery || '').trim();
    if (!q) {
      setSearchPulseOn(false);
      return;
    }

    setSearchPulseOn(true);
    const t = window.setTimeout(() => setSearchPulseOn(false), 3600);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  // Eye-friendly backdrop settings (persisted)
  const [blurEnabled, setBlurEnabled] = useState(true);

  // Sdílení - drawer (varianta B)
  const [shareDrawerOpen, setShareDrawerOpen] = useState(false);
  const [shareNoteId, setShareNoteId] = useState(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareMode, setShareMode] = useState('PRIVATE'); // PRIVATE | VSICHNI | USEK | UZIVATEL
  const [shareRights, setShareRights] = useState({ read: true, write: true, comment: false });
  const [useky, setUseky] = useState([]);
  const [selectedUsekId, setSelectedUsekId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [shareExisting, setShareExisting] = useState([]);

  // cache sdílení per poznámka (dbId) – pro ikonu/tooltip u patičky
  const [sharesByStickyId, setSharesByStickyId] = useState({});
  const sharesByStickyIdRef = useRef(sharesByStickyId);
  const prefetchedShareIdsRef = useRef(new Set());
  const shareLookupsLoadedRef = useRef(false);

  useEffect(() => {
    sharesByStickyIdRef.current = sharesByStickyId;
  }, [sharesByStickyId]);

  const ensureShareLookupsLoaded = useCallback(async () => {
    try {
      if (shareLookupsLoadedRef.current) return;
      const auth = apiAuthRef.current;
      if (!auth?.token || !auth?.username) return;

      const [usekyRes, empRes] = await Promise.all([
        fetchUseky({ token: auth.token, username: auth.username }).catch(() => []),
        fetchEmployees({ token: auth.token, username: auth.username }).catch(() => []),
      ]);

      const usekyArr = Array.isArray(usekyRes) ? usekyRes : (usekyRes?.data || []);
      setUseky(Array.isArray(usekyArr) ? usekyArr : []);

      const empArr = Array.isArray(empRes) ? empRes : [];
      setEmployees(empArr.filter((u) => Number(u?.aktivni) === 1));

      shareLookupsLoadedRef.current = true;
    } catch {
      // ignore
    }
  }, []);

  const rightsMaskToLabel = useCallback((mask) => {
    const m = Number(mask || 0);
    const parts = [];
    if ((m & 1) === 1) parts.push('čtení');
    if ((m & 2) === 2) parts.push('zápis');
    if ((m & 4) === 4) parts.push('komentáře');
    return parts.length ? parts.join(', ') : '—';
  }, []);

  const formatShareTargetsTooltip = useCallback((shares) => {
    try {
      const normalized = Array.isArray(shares) ? shares : [];
      if (!normalized.length) return '';

      const lines = ['Sdíleno:'];
      for (const s of normalized) {
        const t = String(s?.target_type || '').toUpperCase();
        const tid = s?.target_id != null ? Number(s.target_id) : null;
        const prava = rightsMaskToLabel(s?.prava_mask);

        if (t === 'VSICHNI') {
          lines.push(`• Všem (${prava})`);
          continue;
        }
        if (t === 'USEK') {
          const u = (useky || []).find((x) => Number(x?.id) === tid);
          const label = u
            ? `${u.usek_zkr ? `${u.usek_zkr} — ` : ''}${u.usek_nazev || `Úsek #${u.id}`}`
            : `Úsek #${tid || '?'}`;
          lines.push(`• Úsek: ${label} (${prava})`);
          continue;
        }
        if (t === 'UZIVATEL') {
          const emp = (employees || []).find((x) => Number(x?.id) === tid);
          const label = emp
            ? `${emp.full_name || `${emp.jmeno || ''} ${emp.prijmeni || ''}`.trim() || `Uživatel #${emp.id}`}${emp.email ? ` <${emp.email}>` : ''}`
            : `Uživatel #${tid || '?'}`;
          lines.push(`• Uživatel: ${label} (${prava})`);
          continue;
        }

        lines.push(`• ${t || 'Cíl'}: ${tid != null ? tid : '?'} (${prava})`);
      }

      return lines.join('\n');
    } catch {
      return '';
    }
  }, [employees, rightsMaskToLabel, useky]);

  const ensureSharesLoadedForStickyDbId = useCallback(async (stickyDbId) => {
    const dbIdNum = Number(stickyDbId);
    if (!Number.isFinite(dbIdNum) || dbIdNum <= 0) return;

    const key = String(dbIdNum);
    const current = sharesByStickyIdRef.current?.[key];
    if (current?.loading || current?.loaded) return;

    const auth = apiAuthRef.current;
    if (!auth?.token || !auth?.username) return;

    setSharesByStickyId((prev) => ({
      ...prev,
      [key]: { loading: true, loaded: false, entries: [], error: null },
    }));

    try {
      const res = await listStickyShares({ token: auth.token, username: auth.username, sticky_id: dbIdNum });
      const arr = Array.isArray(res) ? res : [];
      setSharesByStickyId((prev) => ({
        ...prev,
        [key]: { loading: false, loaded: true, entries: arr, error: null },
      }));
    } catch (e) {
      setSharesByStickyId((prev) => ({
        ...prev,
        [key]: { loading: false, loaded: true, entries: [], error: e?.message || 'Načtení sdílení selhalo' },
      }));
    }
  }, []);

  // Prefetch sdílení pro vlastní poznámky (aby se ikona zobrazila automaticky)
  useEffect(() => {
    if (!open) return;
    if (!dbHydratedOnce) return;
    if (!apiAuth?.token || !apiAuth?.username || !apiAuth?.userId) return;

    ensureShareLookupsLoaded();

    const owned = (notesRef.current || [])
      .filter((n) => n?.dbId && n?.ownerUserId != null && n.ownerUserId === apiAuth.userId)
      .map((n) => Number(n.dbId))
      .filter((id) => Number.isFinite(id) && id > 0);

    for (const id of owned.slice(0, 80)) {
      if (prefetchedShareIdsRef.current.has(id)) continue;
      prefetchedShareIdsRef.current.add(id);
      ensureSharesLoadedForStickyDbId(id);
    }
  }, [open, dbHydratedOnce, apiAuth, ensureShareLookupsLoaded, ensureSharesLoadedForStickyDbId]);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    zRef.current = zIndexCounter;
  }, [zIndexCounter]);

  const loadNotesFromLocalStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem(resolvedStorageKey);
      if (!saved) {
        return [];
      }
      const parsed = safeParse(saved);
      if (!Array.isArray(parsed)) {
        return [];
      }
      // Migrace: doplnit createdAt pro staré záznamy
      const migrated = parsed.map((n) => {
        const idNum = (typeof n?.id === 'number' && Number.isFinite(n.id)) ? n.id : Date.now();
        const createdAt = (typeof n?.createdAt === 'number' && Number.isFinite(n.createdAt))
          ? n.createdAt
          : idNum;
        return { ...n, createdAt };
      });

      return migrated;
    } catch {
      return [];
    }
  }, [resolvedStorageKey]);

  const normalizeNoteFromDb = useCallback((row) => {
    try {
      const vw = window.innerWidth || 1200;
      const vh = window.innerHeight || 800;

      const clientUid = String(row?.client_uid || row?.clientUid || '').trim();
      const dbId = row?.id != null ? Number(row.id) : null;
      const version = row?.version != null ? Number(row.version) : null;
      const ownerUserId = row?.owner_user_id != null ? Number(row.owner_user_id) : null;
      const pravaMask = row?.prava_mask != null ? Number(row.prava_mask) : 0;

      const data = (row && typeof row.data === 'object' && row.data) ? row.data : {};

      let internalId = null;
      const m = /^n_(\d+)$/.exec(clientUid);
      if (m && m[1]) internalId = Number(m[1]);
      if (!internalId || !Number.isFinite(internalId)) internalId = Date.now() + Math.floor(Math.random() * 1000);

      const baseW = Number(data?.viewport?.w || 0);
      const baseH = Number(data?.viewport?.h || 0);
      const sx = (baseW > 0) ? (vw / baseW) : 1;
      const sy = (baseH > 0) ? (vh / baseH) : 1;

      const x = Number(data?.x);
      const y = Number(data?.y);
      const width = Number(data?.width);
      const height = Number(data?.height);

      const finalW = clamp(Number.isFinite(width) ? width * sx : DEFAULT_NOTE_SIZE.w, 160, Math.max(160, vw - 20));
      const finalH = clamp(Number.isFinite(height) ? height * sy : DEFAULT_NOTE_SIZE.h, 140, Math.max(140, vh - 80));
      const finalX = clamp(Number.isFinite(x) ? x * sx : (vw / 2 - finalW / 2), 8, Math.max(8, vw - finalW - 8));
      const finalY = clamp(Number.isFinite(y) ? y * sy : (vh / 3 - finalH / 2), 80, Math.max(80, vh - finalH - 64));

      const createdAt = (typeof data?.createdAt === 'number' && Number.isFinite(data.createdAt)) ? data.createdAt : Date.now();

      return {
        id: internalId,
        clientUid: clientUid || `n_${internalId}`,
        dbId,
        version,
        ownerUserId,
        pravaMask,
        x: finalX,
        y: finalY,
        width: finalW,
        height: finalH,
        rotation: Number.isFinite(Number(data?.rotation)) ? Number(data.rotation) : 0,
        colorIdx: Number.isFinite(Number(data?.colorIdx)) ? Number(data.colorIdx) : 0,
        zIndex: Number.isFinite(Number(data?.zIndex)) ? Number(data.zIndex) : 1,
        content: sanitizeNoteHtml(String(data?.content || '')),
        createdAt,
      };
    } catch {
      return null;
    }
  }, []);

  // Načíst aktuální verzi poznámky z DB (použije existující sticky/list) –
  // spouštět jen když poznámka není lokálně změněná (dirty), aby se nepřepisoval obsah.
  const refreshSingleNoteFromDb = useCallback(async (noteId, editorEl) => {
    try {
      if (!open) return;
      const auth = apiAuthRef.current;
      if (!auth?.token || !auth?.username || !auth?.userId) return;

      const note = notesRef.current?.find?.((n) => n?.id === noteId);
      if (!note?.dbId) return;

      // nepřepisuj lokální změny
      if (dirtyIdsRef.current?.has?.(noteId)) return;

      const dbIdNum = Number(note.dbId);
      if (!Number.isFinite(dbIdNum) || dbIdNum <= 0) return;

      const lastTs = Number(refreshCooldownRef.current?.get?.(dbIdNum) || 0);
      if (lastTs && (Date.now() - lastTs) < 15000) return; // max 1× za 15s
      refreshCooldownRef.current.set(dbIdNum, Date.now());

      const rows = await listStickyNotes({ token: auth.token, username: auth.username });
      const row = (Array.isArray(rows) ? rows : []).find((r) => Number(r?.id) === dbIdNum);
      if (!row) return;

      const normalized = normalizeNoteFromDb(row);
      if (!normalized) return;

      // Aktualizuj jen „serverové“ věci – nepolohuj/přeměřuj během práce.
      setNotes((prev) => (prev || []).map((n) => {
        if (n?.id !== noteId) return n;
        return {
          ...n,
          dbId: normalized.dbId,
          version: normalized.version,
          ownerUserId: normalized.ownerUserId,
          pravaMask: normalized.pravaMask,
          content: normalized.content,
        };
      }));

      // Pokud máme přímo DOM editor (na focusu), jemně ho srovnejme s DB.
      try {
        if (editorEl && typeof editorEl.innerHTML === 'string') {
          const desired = sanitizeNoteHtml(normalized.content || '');
          if (editorEl.innerHTML !== desired) {
            editorEl.innerHTML = desired;
          }
        }
      } catch {}
    } catch {
      // tichý fail – jde jen o "best effort" refresh
    }
  }, [open, normalizeNoteFromDb]);

  const markDirty = useCallback((id) => {
    try { if (id != null) dirtyIdsRef.current.add(id); } catch {}
  }, []);

  const scheduleDbSave = useCallback(() => {
    try {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        if (savingRef.current) return;
        const auth = apiAuthRef.current;
        if (!auth?.token || !auth?.username || !auth?.userId) return;

        const dirtyIds = Array.from(dirtyIdsRef.current || []);
        if (dirtyIds.length === 0) return;

        const currentNotes = notesRef.current || [];
        const dirtyNotes = currentNotes.filter((n) => {
          if (!dirtyIds.includes(n.id)) return false;
          // owner vždy může zapisovat
          if (n?.ownerUserId === auth.userId) return true;
          // sdílené: zapisovat jen pokud práva obsahují WRITE
          const mask = Number(n?.pravaMask || 0);
          const canWriteShared = Number.isFinite(mask) && (mask & 2) === 2;
          return canWriteShared && !!n?.dbId;
        });
        if (dirtyNotes.length === 0) {
          dirtyIdsRef.current = new Set();
          return;
        }

        savingRef.current = true;
        setDbLastError(null);

        const vw = window.innerWidth || 1200;
        const vh = window.innerHeight || 800;

        const payloadNotes = dirtyNotes.map((n) => ({
          id: n.dbId || null,
          client_uid: n.clientUid || `n_${n.id}`,
          version: (n.version != null ? n.version : null),
          data: {
            x: n.x,
            y: n.y,
            width: n.width,
            height: n.height,
            rotation: n.rotation,
            colorIdx: n.colorIdx,
            zIndex: n.zIndex,
            content: n.content,
            createdAt: n.createdAt,
            viewport: { w: vw, h: vh },
            updatedAt: Date.now(),
          }
        }));

        try {
          const res = await bulkUpsertStickyNotes({ token: auth.token, username: auth.username, notes: payloadNotes });

          // Pokud nastal konflikt verze, stáhnout aktuální verzi z DB a srovnat.
          // (zabrání opakovanému konfliktu a uživatel uvidí poslední uložený stav)
          const conflictClientUidsArr = res
            .filter((r) => r && r.ok === false && r.status === 'conflict')
            .map((r) => String(r.client_uid || ''));
          const conflictClientUidsSet = new Set(conflictClientUidsArr);
          if (conflictClientUidsSet.size > 0) {
            try {
              const rows = await listStickyNotes({ token: auth.token, username: auth.username });
              const rowsArr = Array.isArray(rows) ? rows : [];

              // Připravit mapu pro okamžitý DOM sync (contentEditable) –
              // jinak u fokusované poznámky zůstane na obrazovce lokální kopie.
              const domSync = [];

              setNotes((prev) => (prev || []).map((n) => {
                const cu = String(n?.clientUid || `n_${n?.id}`);
                if (!conflictClientUidsSet.has(cu)) return n;

                const dbIdNum = Number(n?.dbId);
                const row = rowsArr.find((rr) => Number(rr?.id) === dbIdNum);
                if (!row) return n;
                const normalized = normalizeNoteFromDb(row);
                if (!normalized) return n;

                try {
                  domSync.push({
                    noteId: n.id,
                    html: sanitizeNoteHtml(normalized.content || '')
                  });
                } catch {}

                // nepřepisuj layout při refreshi; jen "server" data
                return {
                  ...n,
                  version: normalized.version,
                  ownerUserId: normalized.ownerUserId,
                  pravaMask: normalized.pravaMask,
                  content: normalized.content,
                };
              }));

              // Okamžitě přepiš DOM (včetně fokusované poznámky)
              try {
                if (domSync.length > 0) {
                  window.requestAnimationFrame(() => {
                    try {
                      for (const it of domSync) {
                        const el = editorRefs.current?.get?.(it.noteId);
                        if (!el) continue;
                        try {
                          const isFocusedNow = focusedIdRef.current === it.noteId;
                          const q = String(searchQueryRef.current || '').trim();
                          const useHighlight = Boolean(!isFocusedNow && q);
                          const nextHtml = useHighlight
                            ? applySearchHighlightHtml(it.html, q)
                            : it.html;
                          if (typeof el.innerHTML === 'string' && el.innerHTML !== nextHtml) {
                            el.innerHTML = nextHtml;
                          }
                        } catch {
                          if (typeof el.innerHTML === 'string' && el.innerHTML !== it.html) {
                            el.innerHTML = it.html;
                          }
                        }
                      }
                    } catch {}
                  });
                }
              } catch {}

              // Konfliktní poznámky přestaň zkoušet ukládat dokola – už jsou syncnuté na DB verzi.
              const nextDirty = new Set(dirtyIdsRef.current || []);
              for (const n of dirtyNotes) {
                const cu = String(n?.clientUid || `n_${n?.id}`);
                if (conflictClientUidsSet.has(cu)) nextDirty.delete(n.id);
              }
              dirtyIdsRef.current = nextDirty;

              setDbLastError('Konflikt synchronizace: načetl jsem novější verzi z databáze.');
            } catch {
              setDbLastError('Konflikt synchronizace: nepodařilo se načíst novější verzi z databáze.');
            }
          }

          // vyčistit dirty jen pro úspěšné
          const okClientUids = new Set(res.filter((r) => r?.ok).map((r) => String(r.client_uid || '')));
          const conflictClientUids = new Set(res.filter((r) => r && r.ok === false && r.status === 'conflict').map((r) => String(r.client_uid || '')));

          setNotes((prev) => prev.map((n) => {
            const cu = String(n.clientUid || `n_${n.id}`);
            const r = res.find((x) => String(x?.client_uid || '') === cu);
            if (!r) return n;
            if (r.ok && r.id) {
              const nextVersion = (typeof r.version === 'number' && Number.isFinite(r.version))
                ? r.version
                : (n.version != null ? (n.version + 1) : n.version);
              return { ...n, dbId: r.id, version: nextVersion };
            }
            return n;
          }));

          // dirty set update
          const nextDirty = new Set(dirtyIdsRef.current || []);
          for (const n of dirtyNotes) {
            const cu = String(n.clientUid || `n_${n.id}`);
            if (okClientUids.has(cu)) nextDirty.delete(n.id);
            // konflikt – řešíme refresh z DB výše, tady už jen jistota
            if (conflictClientUids.has(cu)) nextDirty.delete(n.id);
          }
          dirtyIdsRef.current = nextDirty;
        } catch (e) {
          setDbLastError(e?.message || 'Synchronizace do databáze selhala');
        } finally {
          savingRef.current = false;
        }
      }, 900);
    } catch {
      // ignore
    }
  }, [normalizeNoteFromDb]);

  const openShareDrawerFor = useCallback(async (noteId) => {
    const canUseDb = Boolean(apiAuth?.token && apiAuth?.username && apiAuth?.userId);
    const note = notesRef.current?.find?.((n) => n.id === noteId);
    if (!note) return;

    // sdílení jen pro vlastní poznámky
    if (!canUseDb || note?.ownerUserId !== apiAuth.userId || !note?.dbId) {
      setDbLastError('Sdílení je dostupné jen pro vlastní poznámky uložené v databázi.');
      return;
    }

    setShareDrawerOpen(true);
    setShareNoteId(noteId);
    setShareLoading(true);
    setDbLastError(null);

    try {
      const [usekyRes, empRes, sharesRes] = await Promise.all([
        fetchUseky({ token: apiAuth.token, username: apiAuth.username }).catch(() => []),
        fetchEmployees({ token: apiAuth.token, username: apiAuth.username }).catch(() => []),
        listStickyShares({ token: apiAuth.token, username: apiAuth.username, sticky_id: note.dbId }).catch(() => [])
      ]);

      const usekyArr = Array.isArray(usekyRes) ? usekyRes : (usekyRes?.data || []);
      setUseky(Array.isArray(usekyArr) ? usekyArr : []);
      // Nabízet pouze aktivní uživatele při sdílení
      const empArr = Array.isArray(empRes) ? empRes : [];
      setEmployees(empArr.filter((u) => Number(u?.aktivni) === 1));

      const normalized = Array.isArray(sharesRes) ? sharesRes : [];
      setShareExisting(normalized);
      try {
        const key = String(Number(note.dbId));
        if (key && key !== 'NaN') {
          setSharesByStickyId((prev) => ({
            ...prev,
            [key]: { loading: false, loaded: true, entries: normalized, error: null },
          }));
        }
      } catch {}

      const hasAll = normalized.some((s) => String(s?.target_type || '').toUpperCase() === 'VSICHNI');
      const usekEntry = normalized.find((s) => String(s?.target_type || '').toUpperCase() === 'USEK');
      const userEntry = normalized.find((s) => String(s?.target_type || '').toUpperCase() === 'UZIVATEL');

      if (hasAll) {
        setShareMode('VSICHNI');
      } else if (usekEntry?.target_id) {
        setShareMode('USEK');
        setSelectedUsekId(String(usekEntry.target_id));
      } else if (userEntry?.target_id) {
        setShareMode('UZIVATEL');
        const uid = Number(userEntry.target_id);
        const found = (Array.isArray(empRes) ? empRes : []).find((u) => Number(u?.id) === uid);
        setSelectedUser(found || { id: uid, full_name: `Uživatel #${uid}` });
      } else {
        setShareMode('PRIVATE');
      }

      const firstMask = normalized.length > 0 ? Number(normalized[0]?.prava_mask || 0) : 3;
      const mask = Number.isFinite(firstMask) && firstMask > 0 ? firstMask : 3;
      setShareRights({
        read: (mask & 1) === 1,
        write: (mask & 2) === 2,
        comment: (mask & 4) === 4,
      });
    } catch (e) {
      setDbLastError(e?.message || 'Načtení sdílení selhalo');
      setShareDrawerOpen(false);
      setShareNoteId(null);
    } finally {
      setShareLoading(false);
    }
  }, [apiAuth]);

  const applySharePreset = useCallback(async () => {
    if (!shareNoteId) return;
    const note = notesRef.current?.find?.((n) => n.id === shareNoteId);
    const canUseDb = Boolean(apiAuth?.token && apiAuth?.username && apiAuth?.userId);
    if (!note || !canUseDb || note?.ownerUserId !== apiAuth.userId || !note?.dbId) {
      setDbLastError('Sdílení lze upravit jen u vlastní poznámky.');
      return;
    }

    const prava_mask =
      (shareRights.read ? 1 : 0) |
      (shareRights.write ? 2 : 0) |
      (shareRights.comment ? 4 : 0);

    if (prava_mask < 1) {
      setDbLastError('Musí být povoleno alespoň právo Čtení.');
      return;
    }

    setShareLoading(true);
    setDbLastError(null);

    try {
      // Nejprve zrušit existující sdílení (preset = 1 režim)
      for (const s of (shareExisting || [])) {
        await revokeStickyShare({
          token: apiAuth.token,
          username: apiAuth.username,
          sticky_id: note.dbId,
          target_type: s.target_type,
          target_id: s.target_id ?? null,
        });
      }

      if (shareMode === 'PRIVATE') {
        setShareExisting([]);
        try {
          const key = String(Number(note.dbId));
          if (key && key !== 'NaN') {
            setSharesByStickyId((prev) => ({
              ...prev,
              [key]: { loading: false, loaded: true, entries: [], error: null },
            }));
          }
        } catch {}
        return;
      }

      if (shareMode === 'VSICHNI') {
        await grantStickyShare({
          token: apiAuth.token,
          username: apiAuth.username,
          sticky_id: note.dbId,
          target_type: 'VSICHNI',
          target_id: null,
          prava_mask,
        });
      } else if (shareMode === 'USEK') {
        const uid = Number(selectedUsekId);
        if (!uid) {
          setDbLastError('Vyberte úsek.');
          return;
        }
        await grantStickyShare({
          token: apiAuth.token,
          username: apiAuth.username,
          sticky_id: note.dbId,
          target_type: 'USEK',
          target_id: uid,
          prava_mask,
        });
      } else if (shareMode === 'UZIVATEL') {
        const uid = Number(selectedUser?.id);
        if (!uid) {
          setDbLastError('Vyberte uživatele.');
          return;
        }
        await grantStickyShare({
          token: apiAuth.token,
          username: apiAuth.username,
          sticky_id: note.dbId,
          target_type: 'UZIVATEL',
          target_id: uid,
          prava_mask,
        });
      }

      const shares = await listStickyShares({ token: apiAuth.token, username: apiAuth.username, sticky_id: note.dbId });
      const arr = Array.isArray(shares) ? shares : [];
      setShareExisting(arr);
      try {
        const key = String(Number(note.dbId));
        if (key && key !== 'NaN') {
          setSharesByStickyId((prev) => ({
            ...prev,
            [key]: { loading: false, loaded: true, entries: arr, error: null },
          }));
        }
      } catch {}
    } catch (e) {
      setDbLastError(e?.message || 'Uložení sdílení selhalo');
    } finally {
      setShareLoading(false);
    }
  }, [apiAuth, shareExisting, shareMode, shareNoteId, shareRights, selectedUsekId, selectedUser]);

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

  // Načti data při otevření overlay (DB → fallback/migrace z LS)
  useEffect(() => {
    if (!open) return;

    // Loading gate pro DB hydraci
    setDbHydratedOnce(false);
    setDbLastError(null);

    let cancelled = false;
    const run = async () => {
      const localRaw = loadNotesFromLocalStorage();
      const local = (Array.isArray(localRaw) ? localRaw : []).map((n) => ({
        ...n,
        clientUid: n?.clientUid || `n_${n?.id}`,
        ownerUserId: (n?.ownerUserId != null) ? n.ownerUserId : (apiAuth?.userId ?? null)
      }));

      const canUseDb = Boolean(apiAuth?.token && apiAuth?.username && apiAuth?.userId);

      if (!canUseDb) {
        if (cancelled) return;
        setNotes(local);
        if (local.length > 0) {
          const maxZ = Math.max(...local.map((n) => Number(n?.zIndex || 1)));
          setZIndexCounter((Number.isFinite(maxZ) ? maxZ : 1) + 1);
        } else {
          setZIndexCounter(1);
        }
        setDbHydratedOnce(true);
        return;
      }

      try {
        const rows = await listStickyNotes({ token: apiAuth.token, username: apiAuth.username });
        if (cancelled) return;

        const normalized = (rows || [])
          .map(normalizeNoteFromDb)
          .filter(Boolean);

        if (normalized.length > 0) {
          setNotes(normalized);
          const maxZ = Math.max(...normalized.map((n) => Number(n?.zIndex || 1)));
          setZIndexCounter((Number.isFinite(maxZ) ? maxZ : 1) + 1);
          setDbHydratedOnce(true);
          return;
        }

        // DB prázdná → zkus migraci z LS
        if (Array.isArray(local) && local.length > 0) {
          const vw = window.innerWidth || 1200;
          const vh = window.innerHeight || 800;

          const payloadNotes = local.map((n) => ({
            id: null,
            client_uid: n.clientUid || `n_${n.id}`,
            version: null,
            data: {
              x: n.x,
              y: n.y,
              width: n.width,
              height: n.height,
              rotation: n.rotation,
              colorIdx: n.colorIdx,
              zIndex: n.zIndex,
              content: n.content,
              createdAt: n.createdAt,
              viewport: { w: vw, h: vh },
              updatedAt: Date.now(),
            }
          }));

          await bulkUpsertStickyNotes({ token: apiAuth.token, username: apiAuth.username, notes: payloadNotes });
          const rows2 = await listStickyNotes({ token: apiAuth.token, username: apiAuth.username });
          if (cancelled) return;
          const normalized2 = (rows2 || []).map(normalizeNoteFromDb).filter(Boolean);
          setNotes(normalized2);
          const maxZ = normalized2.length > 0 ? Math.max(...normalized2.map((n) => Number(n?.zIndex || 1))) : 1;
          setZIndexCounter((Number.isFinite(maxZ) ? maxZ : 1) + 1);
          setDbHydratedOnce(true);
          return;
        }

        // nic v DB ani LS
        setNotes([]);
        setZIndexCounter(1);
        setDbHydratedOnce(true);
      } catch (e) {
        setDbLastError(e?.message || 'Načtení sticky poznámek z databáze selhalo');
        // fallback na LS
        setNotes(local);
        if (local.length > 0) {
          const maxZ = Math.max(...local.map((n) => Number(n?.zIndex || 1)));
          setZIndexCounter((Number.isFinite(maxZ) ? maxZ : 1) + 1);
        } else {
          setZIndexCounter(1);
        }
        setDbHydratedOnce(true);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [open, apiAuth, loadNotesFromLocalStorage, normalizeNoteFromDb]);

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
        if (shareDrawerOpen) {
          setShareDrawerOpen(false);
          setShareNoteId(null);
          return;
        }
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
  }, [open, onClose, confirmDelete?.open, confirmClearAll, shareDrawerOpen]);

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
      clientUid: `n_${id}`,
      x: clamp(finalX, 8, Math.max(8, vw - DEFAULT_NOTE_SIZE.w - 8)),
      y: clamp(finalY, 80, Math.max(80, vh - DEFAULT_NOTE_SIZE.h - 64)),
      content,
      colorIdx,
      rotation: randomRotation,
      zIndex: currentZ,
      width: DEFAULT_NOTE_SIZE.w,
      height: DEFAULT_NOTE_SIZE.h,
      createdAt: Date.now(),
      ownerUserId: apiAuthRef.current?.userId ?? null,
    };

    setNotes((prev) => [...prev, newNote]);
    markDirty(id);
    scheduleDbSave();
    zRef.current = currentZ + 1;
    setZIndexCounter(zRef.current);
  }, [markDirty, scheduleDbSave]);

  // Pozn.: dříve jsme sem dávali auto-úvodní poznámku, ale při DB loadu to problikávalo.
  // Místo toho ukazujeme prázdný stav v UI.

  const bringToFront = useCallback((id) => {
    const currentZ = zRef.current || 1;
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, zIndex: currentZ } : n)));
    markDirty(id);
    scheduleDbSave();
    zRef.current = currentZ + 1;
    setZIndexCounter(zRef.current);
  }, [markDirty, scheduleDbSave]);

  const updateContent = useCallback((id, content) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, content } : n)));
    markDirty(id);
    scheduleDbSave();
  }, [markDirty, scheduleDbSave]);

  const removeNote = useCallback((id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try { dirtyIdsRef.current.delete(id); } catch {}
  }, []);

  const clearAllNotes = useCallback(() => {
    setNotes([]);
    zRef.current = 1;
    setZIndexCounter(1);
    try { dirtyIdsRef.current = new Set(); } catch {}
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

    const onUp = () => {
      const id = draggingId;
      setDraggingId(null);
      if (id != null) {
        markDirty(id);
        scheduleDbSave();
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [open, draggingId, dragOffset, markDirty, scheduleDbSave]);

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

    const onUp = () => {
      const id = resizingId;
      setResizingId(null);
      if (id != null) {
        markDirty(id);
        scheduleDbSave();
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [open, resizingId, resizeStart, markDirty, scheduleDbSave]);

  const portalNode = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return document.body;
  }, []);

  const searchMatches = useMemo(() => {
    const q = String(searchQuery || '').trim();
    const qFold = foldCzForSearch(q);
    if (!qFold) return { ids: new Set(), count: 0 };
    const ids = new Set();
    for (const n of (notes || [])) {
      const text = foldCzForSearch(getPlainTextFromHtml(n?.content || ''));
      if (text.includes(qFold)) ids.add(n.id);
    }
    return { ids, count: ids.size };
  }, [notes, searchQuery]);

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
    <OverlayRoot role="dialog" aria-label="Sticky deska" aria-modal="true">
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
            <FontAwesomeIcon icon={faStickyNote} /> Sticky deska
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

        <HeaderCenter>
          <HeaderSearch>
            <FontAwesomeIcon className="icon" icon={faSearch} />
            <HeaderSearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hledat v poznámkách…"
              aria-label="Hledat v poznámkách"
            />
            {!!String(searchQuery || '').trim() && (
              <HeaderSearchClear type="button" onClick={() => setSearchQuery('')} title="Vymazat hledání">
                <FontAwesomeIcon icon={faTimes} />
              </HeaderSearchClear>
            )}
          </HeaderSearch>
        </HeaderCenter>

        <HeaderRight>
          {!!String(searchQuery || '').trim() && (
            <SearchCountPill title="Počet poznámek, kde se našel text">
              Nalezeno: {searchMatches.count}
            </SearchCountPill>
          )}
          {!dbHydratedOnce && (
            <LoadingPill title="Načítám data z databáze">
              <span className="spinner" />
              Načítám…
            </LoadingPill>
          )}
          {!!dbLastError && (
            <DbErrorPill title={dbLastError}>
              <FontAwesomeIcon icon={faExclamationTriangle} />
              {dbLastError}
            </DbErrorPill>
          )}
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
        {dbHydratedOnce && notesCount === 0 && (
          <EmptyState>
            <div className="box">
              <div className="title">
                <FontAwesomeIcon icon={faStickyNote} />
                Sticky deska je prázdná
              </div>
              <div className="hint">
                Klikni na <b>„Nová“</b> pro vytvoření lístečku. Ukládání probíhá do databáze (a zároveň se cacheuje do LocalStorage).
              </div>
            </div>
          </EmptyState>
        )}
        {notes.map((note) => {
          const palette = NOTE_COLORS[note.colorIdx] || NOTE_COLORS[0];
          const isDragging = draggingId === note.id;
          const isFocused = focusedId === note.id;
          const isMatch = searchMatches.ids.has(note.id);
          return (
            <NoteCard
              key={note.id}
              $searchMatch={isMatch}
              $searchPulse={searchPulseOn}
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
                  : `${isMatch ? '0 0 0 2px rgba(245, 158, 11, 0.18), ' : ''}0 10px 26px ${palette.shadow}`,
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
                  <NoteShareBtn
                    type="button"
                    title="Sdílet"
                    disabled={!(apiAuth?.token && apiAuth?.username && apiAuth?.userId) || note?.ownerUserId !== apiAuth?.userId || !note?.dbId}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openShareDrawerFor(note.id);
                    }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <FontAwesomeIcon icon={faShareNodes} />
                  </NoteShareBtn>
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
                      const q = String(searchQuery || '').trim();
                      const desiredDisplay = (q && isMatch)
                        ? applySearchHighlightHtml(desired, q)
                        : desired;
                      if (el.innerHTML !== desiredDisplay) el.innerHTML = desiredDisplay;
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
                    // Neoznačuj jako dirty jen při focusu, pokud se nic nezměnilo.
                    if (html !== String(note.content || '')) {
                      updateContent(note.id, html);
                    }
                  } catch {}

                  // "Soft" reload z DB – pomůže při práci na více PC / sdílení.
                  // Provede se jen když poznámka není dirty.
                  refreshSingleNoteFromDb(note.id, e.currentTarget);
                }}
                onBlur={(e) => {
                  try {
                    const html = sanitizeNoteHtml(e.currentTarget.innerHTML);
                    updateContent(note.id, html);
                    // Po blur (konec editace) vrať do DOM zvýraznění hledání (pokud je aktivní)
                    const q = String(searchQuery || '').trim();
                    if (q && searchMatches?.ids?.has?.(note.id)) {
                      e.currentTarget.innerHTML = applySearchHighlightHtml(html, q);
                    } else {
                      e.currentTarget.innerHTML = html;
                    }
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
                <NoteFooterLeft>
                  <span>{formatCreatedAt(note.createdAt)}</span>
                  {(() => {
                    const isAuthed = Boolean(apiAuth?.userId);
                    const isOwner = isAuthed && (note?.ownerUserId != null) && (note.ownerUserId === apiAuth.userId);
                    const isSharedToMe = isAuthed && (note?.ownerUserId != null) && (note.ownerUserId !== apiAuth.userId);

                    const dbIdNum = note?.dbId != null ? Number(note.dbId) : null;
                    const key = (dbIdNum != null && Number.isFinite(dbIdNum)) ? String(dbIdNum) : null;
                    const shareState = key ? sharesByStickyId?.[key] : null;
                    const sharedOut = Boolean(isOwner && shareState?.loaded && Array.isArray(shareState?.entries) && shareState.entries.length > 0);

                    if (!isSharedToMe && !sharedOut) return null;

                    let title = 'Sdílená poznámka';
                    if (isSharedToMe) {
                      title = `Sdíleno vám\nPráva: ${rightsMaskToLabel(note?.pravaMask)}`;
                    } else if (sharedOut) {
                      title = formatShareTargetsTooltip(shareState?.entries);
                    }

                    return (
                      <NoteSharedIndicator
                        title={title}
                        onMouseEnter={() => {
                          // best-effort: když je poznámka vlastní a ještě nemáme data, dočti
                          if (isOwner && dbIdNum != null && Number.isFinite(dbIdNum)) {
                            ensureShareLookupsLoaded();
                            ensureSharesLoadedForStickyDbId(dbIdNum);
                          }
                        }}
                      >
                        <FontAwesomeIcon icon={faShareNodes} />
                      </NoteSharedIndicator>
                    );
                  })()}
                </NoteFooterLeft>
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

      {/* Sdílení poznámky (pravý drawer) */}
      {shareDrawerOpen && (
        <ShareDrawer role="complementary" aria-label="Sdílení poznámky">
          <ShareDrawerHeader>
            <ShareDrawerTitle>
              <FontAwesomeIcon icon={faLayerGroup} /> Sdílení poznámky
            </ShareDrawerTitle>
            <CloseBtn
              type="button"
              onClick={() => { setShareDrawerOpen(false); setShareNoteId(null); }}
              title="Zavřít"
              style={{ width: 40, height: 40 }}
            >
              <FontAwesomeIcon icon={faTimes} />
            </CloseBtn>
          </ShareDrawerHeader>

          <ShareDrawerBody>
            <ShareSection>
              <div className="label">Komu</div>

              <ShareModeRow>
                <input type="radio" name="share_mode" checked={shareMode === 'PRIVATE'} onChange={() => setShareMode('PRIVATE')} />
                <div className="title"><FontAwesomeIcon icon={faUser} /> Soukromé</div>
                <div className="desc">jen vy</div>
              </ShareModeRow>

              <ShareModeRow>
                <input type="radio" name="share_mode" checked={shareMode === 'VSICHNI'} onChange={() => setShareMode('VSICHNI')} />
                <div className="title"><FontAwesomeIcon icon={faUsers} /> Všem</div>
                <div className="desc">všichni uživatelé</div>
              </ShareModeRow>

              <ShareModeRow>
                <input type="radio" name="share_mode" checked={shareMode === 'USEK'} onChange={() => setShareMode('USEK')} />
                <div className="title"><FontAwesomeIcon icon={faLayerGroup} /> Úsek</div>
                <div className="desc">vybraný úsek</div>
              </ShareModeRow>
              {shareMode === 'USEK' && (
                <ShareSelect value={selectedUsekId} onChange={(e) => setSelectedUsekId(e.target.value)}>
                  <option value="">— vyber úsek —</option>
                  {(useky || []).map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.usek_zkr ? `${u.usek_zkr} — ` : ''}{u.usek_nazev || `Úsek #${u.id}`}
                    </option>
                  ))}
                </ShareSelect>
              )}

              <ShareModeRow>
                <input type="radio" name="share_mode" checked={shareMode === 'UZIVATEL'} onChange={() => setShareMode('UZIVATEL')} />
                <div className="title"><FontAwesomeIcon icon={faUser} /> Uživatel</div>
                <div className="desc">konkrétní osoba</div>
              </ShareModeRow>
              {shareMode === 'UZIVATEL' && (
                <>
                  <ShareInput
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Hledej jméno / e-mail…"
                  />

                  {!!selectedUser && (
                    <div style={{ marginTop: 8, fontWeight: 900, color: 'rgba(120,53,15,0.92)' }}>
                      Vybráno: {selectedUser.full_name || `${selectedUser.jmeno || ''} ${selectedUser.prijmeni || ''}` || `Uživatel #${selectedUser.id}`}
                    </div>
                  )}

                  {String(userSearch || '').trim().length >= 2 && (
                    <ShareCandidates>
                      {(employees || [])
                        .filter((u) => {
                          if (Number(u?.aktivni) !== 1) return false;
                          const q = String(userSearch || '').toLowerCase();
                          const name = String(u.full_name || '').toLowerCase();
                          const mail = String(u.email || '').toLowerCase();
                          return name.includes(q) || mail.includes(q);
                        })
                        .slice(0, 8)
                        .map((u) => (
                          <ShareCandidate key={u.id} type="button" onClick={() => { setSelectedUser(u); }}>
                            <span className="name">{u.full_name || `${u.jmeno || ''} ${u.prijmeni || ''}`}</span>
                            <span className="meta">{u.usek_zkr || ''}</span>
                          </ShareCandidate>
                        ))}
                    </ShareCandidates>
                  )}
                </>
              )}
            </ShareSection>

            <ShareSection>
              <div className="label">Oprávnění</div>
              <ShareRightsRow>
                <label>
                  <input
                    type="checkbox"
                    checked={shareRights.read}
                    onChange={(e) => setShareRights((p) => ({ ...p, read: e.target.checked }))}
                  />
                  Čtení
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={shareRights.write}
                    onChange={(e) => setShareRights((p) => ({ ...p, write: e.target.checked }))}
                  />
                  Zápis
                </label>
                <label aria-disabled="true" title="Komentáře jsou připravené v DB/API, UI doděláme později.">
                  <input type="checkbox" checked={shareRights.comment} disabled />
                  Komentář
                </label>
              </ShareRightsRow>
            </ShareSection>

            <ShareApplyBtn
              type="button"
              onClick={applySharePreset}
              disabled={shareLoading || !shareNoteId}
              title="Uložit sdílení"
            >
              {shareLoading ? 'Ukládám…' : 'Použít sdílení'}
            </ShareApplyBtn>
          </ShareDrawerBody>
        </ShareDrawer>
      )}

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
                  if (id == null) return;

                  const note = notesRef.current?.find?.((n) => n.id === id);
                  const canUseDb = Boolean(apiAuth?.token && apiAuth?.username && apiAuth?.userId);
                  const isOwner = (note?.ownerUserId != null && apiAuth?.userId != null)
                    ? (note.ownerUserId === apiAuth.userId)
                    : true;

                  // DB delete (jen vlastní poznámky). Sdílené se na UI zatím nemažou.
                  if (canUseDb && !isOwner) {
                    setDbLastError('Sdílenou poznámku nelze smazat (může ji smazat jen vlastník).');
                    return;
                  }

                  if (canUseDb && isOwner && note?.dbId) {
                    (async () => {
                      try {
                        await deleteStickyNote({ token: apiAuth.token, username: apiAuth.username, id: note.dbId });
                        removeNote(id);
                      } catch (e) {
                        // fallback: nesmaž v UI, ať se neztratí
                        console.error('Sticky DB delete failed:', e);
                        setDbLastError(e?.message || 'Smazání poznámky v databázi selhalo');
                      }
                    })();
                    return;
                  }

                  // Fallback: jen lokálně
                  removeNote(id);
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

                  const canUseDb = Boolean(apiAuth?.token && apiAuth?.username && apiAuth?.userId);
                  if (canUseDb) {
                    (async () => {
                      try {
                        await clearAllStickyNotes({ token: apiAuth.token, username: apiAuth.username });
                        // DB clear maže jen vlastní poznámky → sdílené ponecháme
                        setNotes((prev) => {
                          const keepShared = (prev || []).filter((n) => n?.ownerUserId != null && n.ownerUserId !== apiAuth.userId);
                          return keepShared;
                        });
                        // z-index counter přepočítat
                        window.requestAnimationFrame(() => {
                          try {
                            const arr = notesRef.current || [];
                            const maxZ = arr.length > 0 ? Math.max(...arr.map((n) => Number(n?.zIndex || 1))) : 1;
                            zRef.current = (Number.isFinite(maxZ) ? maxZ : 1) + 1;
                            setZIndexCounter(zRef.current);
                          } catch {}
                        });
                      } catch (e) {
                        console.error('Sticky DB clear failed:', e);
                        setDbLastError(e?.message || 'Smazání všech poznámek v databázi selhalo');
                      }
                    })();
                    return;
                  }

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
