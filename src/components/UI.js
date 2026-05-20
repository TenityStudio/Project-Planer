import { COLORS, STATUS_COLORS } from '../lib/utils';

export function Btn({ children, onClick, variant = 'primary', size = 'md', style, disabled, title }) {
  const base = {
    border: 'none', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
    display: 'inline-flex', alignItems: 'center', gap: 5,
    transition: 'all .15s', opacity: disabled ? .5 : 1, whiteSpace: 'nowrap',
  };
  const v = {
    primary:   { background: COLORS.accent,     color: '#fff',          padding: size === 'sm' ? '5px 13px' : '10px 20px', fontSize: size === 'sm' ? 12 : 14 },
    secondary: { background: 'transparent',      color: COLORS.accent,   border: `1.5px solid ${COLORS.accent}`, padding: size === 'sm' ? '4px 12px' : '9px 19px', fontSize: size === 'sm' ? 12 : 14 },
    ghost:     { background: 'transparent',      color: COLORS.textMuted,padding: '5px 9px',  fontSize: 12 },
    danger:    { background: COLORS.dangerPale,  color: COLORS.danger,   padding: '5px 11px', fontSize: 12 },
    orange:    { background: COLORS.prioBg,      color: COLORS.prio,     border: `1.5px solid ${COLORS.prio}44`, padding: size === 'sm' ? '4px 12px' : '9px 19px', fontSize: size === 'sm' ? 12 : 14 },
  };
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      style={{ ...base, ...v[variant], ...style }}
      onMouseEnter={e => { if (!disabled && e.currentTarget) e.currentTarget.style.opacity = '.82'; }}
      onMouseLeave={e => { if (e.currentTarget) e.currentTarget.style.opacity = '1'; }}>
      {children}
    </button>
  );
}

export function Inp({ value, onChange, placeholder, style, type = 'text', min, rows }) {
  const base = {
    fontFamily: "'DM Sans', sans-serif", fontSize: 14, padding: '9px 14px',
    border: `1.5px solid ${COLORS.border}`, borderRadius: 8, outline: 'none',
    background: '#fff', color: COLORS.text, transition: 'border-color .15s',
    width: '100%', boxSizing: 'border-box',
  };
  if (rows) return (
    <textarea value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      style={{ ...base, resize: 'vertical', ...style }}
      onFocus={e => (e.target.style.borderColor = COLORS.borderFocus)}
      onBlur={e => (e.target.style.borderColor = COLORS.border)} />
  );
  return (
    <input type={type} min={min} value={value}
      onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ ...base, ...style }}
      onFocus={e => (e.target.style.borderColor = COLORS.borderFocus)}
      onBlur={e => (e.target.style.borderColor = COLORS.border)} />
  );
}

export function Sel({ value, onChange, options, style }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 14, padding: '9px 14px',
        border: `1.5px solid ${COLORS.border}`, borderRadius: 8, outline: 'none',
        background: '#fff', color: COLORS.text, cursor: 'pointer',
        width: '100%', boxSizing: 'border-box', ...style,
      }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export function Tag({ children, color }) {
  const bg = color ? color + '22' : COLORS.accentPale;
  const c  = color || COLORS.accent;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, background: bg, color: c,
    }}>{children}</span>
  );
}

export function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS['ToDo'];
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, background: c.bg, color: c.text,
    }}>{status}</span>
  );
}

export function DeadlineHint({ deadline }) {
  if (!deadline) return null;
  const d = Math.ceil((new Date(deadline) - new Date()) / 86400000);
  const color = d < 0 ? COLORS.danger : d <= 7 ? COLORS.prio : COLORS.textMuted;
  const label = d < 0 ? `${Math.abs(d)}T überfällig` : d === 0 ? 'Heute' : d === 1 ? 'Morgen' : `${d}T`;
  return (
    <span style={{ fontSize: 11, color, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      ⏱ {label}
    </span>
  );
}

export function Card({ children, style }) {
  return (
    <div style={{
      background: COLORS.card, borderRadius: 14, padding: 22,
      border: `1.5px solid ${COLORS.border}`, ...style,
    }}>{children}</div>
  );
}

export const FL = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8, color: COLORS.textMuted, marginBottom: 5 };
export const DI = { fontFamily: "'DM Sans', sans-serif", fontSize: 14, padding: '9px 14px', border: `1.5px solid ${COLORS.border}`, borderRadius: 8, outline: 'none', background: '#fff', color: COLORS.text, width: '100%', boxSizing: 'border-box' };
