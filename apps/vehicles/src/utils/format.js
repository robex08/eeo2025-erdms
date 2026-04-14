import React from 'react';
// Odstranění diakritiky pro porovnávání a filtrování
export function removeDiacritics(str) {
  if (!str) return '';
  return str.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\u0301/g, '');
}
// Zvýraznění shody ve fulltextu
export function highlightMatch(text, search) {
  if (!search || typeof text !== 'string') return text;
  // Diacritic-insensitive matching
  const remove = removeDiacritics;
  const searchNorm = remove(search).toLowerCase();
  const textNorm = remove(text).toLowerCase();
  const idx = textNorm.indexOf(searchNorm);
  if (idx === -1) return text;
  // Find the real indices in the original string
  let realStart = 0, realEnd = 0, normIdx = 0, i = 0;
  while (i < text.length && normIdx < idx) {
    const c = remove(text[i]);
    if (c) normIdx += c.length;
    i++;
  }
  realStart = i;
  let matchLen = 0, j = i;
  while (j < text.length && matchLen < searchNorm.length) {
    const c = remove(text[j]);
    if (c) matchLen += c.length;
    j++;
  }
  realEnd = j;
  return (
    <span>
      {text.slice(0, realStart)}
      <span style={{background:'#fff59d', borderRadius:2, padding:'0 2px'}}>{text.slice(realStart, realEnd)}</span>
      {text.slice(realEnd)}
    </span>
  );
}
// Pomocné formátovací funkce pro Vehicles a další komponenty

// Český formát data a času
export function formatCzDateTime(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return dt;
  const pad = n => n < 10 ? '0' + n : n;
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Český formát data (YYYY-MM-DD na DD.MM.YYYY)
export function formatCzDate(dateStr, withTime = false) {
  if (!dateStr) return '';
  const [date, time] = dateStr.split(' ');
  if (!date) return dateStr;
  const [y, m, d] = date.split('-');
  if (!y || !m || !d) return dateStr;
  if (withTime && time) {
    const t = time.split(':');
    if (t.length >= 2) {
      return `${d}.${m}.${y} ${t[0]}:${t[1]}${t[2] ? ':' + t[2] : ''}`;
    }
    return `${d}.${m}.${y} ${time}`;
  }
  return `${d}.${m}.${y}`;
}
