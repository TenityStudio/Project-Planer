export const UNITS = ['Stück','m','m²','m³','kg','g','Liter','ml','Packung','Rolle','Sack','Palette','Paar'];
export const STATUSES = ['ToDo','Berechnen','Bau','Abgeschlossen'];

export const STATUS_COLORS = {
  'ToDo':        { bg: '#E8EDF3', text: '#4A6180' },
  'Berechnen':   { bg: '#FFF3E0', text: '#B8760C' },
  'Bau':         { bg: '#E8F0EB', text: '#2D5A3D' },
  'Abgeschlossen':{ bg: '#E8E8E8', text: '#6B6B6B' },
};

export const COLORS = {
  bg: '#F5F0EB', card: '#FFFFFF', accent: '#2D5A3D', accentPale: '#E8F0EB',
  danger: '#C44536', dangerPale: '#FCEAE8', text: '#1A1A1A', textMuted: '#6B6B6B',
  border: '#E0DAD3', borderFocus: '#2D5A3D', tagBg: '#EDE7E0',
  highlight: '#FFF8E7', highlightBorder: '#E8D5A3', prio: '#D4820E', prioBg: '#FFF3E0',
  link: '#2563EB', archive: '#7C6F5E',
};

export function formatDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
}

export function daysUntil(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / 86400000);
}

export function applyBuffer(amount, buffer) {
  return amount * (1 + (parseFloat(buffer) || 0) / 100);
}

export function calcCost(mat, buffer = 0) {
  const amt = applyBuffer(parseFloat(mat.amount) || 0, buffer);
  return amt * (parseFloat(mat.pricePerUnit) || 0);
}

export function fmtEur(n) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
