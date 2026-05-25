import { COLORS } from '../lib/utils';
import { StatusBadge } from './UI';

export function KundenView({ projects, onOpenProject }) {
  const active = projects.filter(p => !p.archived);

  const groups = {};
  active.forEach(p => {
    const key = p.kunde?.trim() || '';
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  const sorted = Object.entries(groups).sort(([a], [b]) => {
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b, 'de');
  });

  const namedCount = Object.keys(groups).filter(k => k).length;

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <span style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 600 }}>
          {namedCount} Kunde{namedCount !== 1 ? 'n' : ''}
        </span>
      </div>

      {active.length === 0 && (
        <div style={{ textAlign: 'center', padding: '56px 20px', color: COLORS.textMuted }}>
          <div style={{ fontSize: 44, marginBottom: 14, opacity: .3 }}>👤</div>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Keine Projekte vorhanden</p>
        </div>
      )}

      {active.length > 0 && namedCount === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: COLORS.textMuted }}>
          <div style={{ fontSize: 44, marginBottom: 14, opacity: .3 }}>👤</div>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Noch keine Kundennamen</p>
          <p style={{ fontSize: 13 }}>Füge Kundennamen in den Projektdetails hinzu.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.map(([kunde, projs]) => (
          <div key={kunde || '__none__'}
            style={{ background: COLORS.card, borderRadius: 14, padding: '16px 18px', border: `1.5px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{kunde ? '👤' : '❓'}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: kunde ? COLORS.text : COLORS.textMuted, fontStyle: kunde ? 'normal' : 'italic' }}>
                  {kunde || 'Ohne Kunde'}
                </span>
              </div>
              <span style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600, background: COLORS.tagBg, padding: '3px 10px', borderRadius: 20 }}>
                {projs.length} Projekt{projs.length !== 1 ? 'e' : ''}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {projs.map(p => (
                <div key={p.id}
                  onClick={() => onOpenProject(p.id)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderRadius: 8, cursor: 'pointer', background: COLORS.bg, transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = COLORS.accentPale}
                  onMouseLeave={e => e.currentTarget.style.background = COLORS.bg}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    {p.priority && <span style={{ fontSize: 12, flexShrink: 0 }}>🚩</span>}
                    <span style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
