export const UNITS = ['Stück','m','m²','m³','kg','g','Liter','ml','Packung','Rolle','Sack','Palette','Paar'];
export const STATUSES = ['ToDo','Berechnen','Bau','Abgeschlossen'];

export const STATUS_COLORS = {
  'ToDo':          { bg: '#151D2E', text: '#6A9DC8' },
  'Berechnen':     { bg: '#221A00', text: '#CCA020' },
  'Bau':           { bg: '#0A1A10', text: '#4A9A60' },
  'Abgeschlossen': { bg: '#1A1A28', text: '#8888AA' },
};

export const COLORS = {
  bg: '#0f1117', card: '#1a1a28', accent: '#2D5A3D', accentPale: '#0f1f16',
  danger: '#E05548', dangerPale: '#2A1212', text: '#E8E8F0', textMuted: '#888899',
  border: '#2a2a40', borderFocus: '#3D7A53', tagBg: '#1e1e30',
  highlight: '#1A1800', highlightBorder: '#3A2E00', prio: '#E8A020', prioBg: '#1E1600',
  link: '#5599EE', archive: '#8877AA',
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
