import { COLORS, formatDate, calcCost, fmtEur } from '../lib/utils';
import { Tag, StatusBadge, DeadlineHint } from './UI';

export function ProjectCard({ project, onOpen, onDuplicate, onArchive }) {
  const count = project.materials.length;
  const status = project.status || 'ToDo';
  const prio = project.priority || false;
  const totalCost = project.materials.reduce((s, m) => s + calcCost(m, project.buffer || 0), 0);

  return (
    <div
      onClick={onOpen}
      style={{
        background: COLORS.card, borderRadius: 14, padding: 20, cursor: 'pointer',
        border: `1.5px solid ${prio ? COLORS.prio + '55' : COLORS.border}`,
        borderLeft: prio ? `4px solid ${COLORS.prio}` : undefined,
        transition: 'all .2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(45,90,61,.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {prio && <span title="Priorität">🚩</span>}
          <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <StatusBadge status={status} />
          <button title="Duplizieren" onClick={onDuplicate}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.textMuted, padding: 4, fontSize: 15 }}
            onMouseEnter={e => e.currentTarget.style.color = COLORS.accent}
            onMouseLeave={e => e.currentTarget.style.color = COLORS.textMuted}>⧉</button>
          <button title="Archivieren" onClick={onArchive}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.textMuted, padding: 4, fontSize: 15 }}
            onMouseEnter={e => e.currentTarget.style.color = COLORS.archive}
            onMouseLeave={e => e.currentTarget.style.color = COLORS.textMuted}>📦</button>
        </div>
      </div>

      {/* Notes */}
      {project.notes && (
        <p style={{ margin: '0 0 8px', fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {project.notes}
        </p>
      )}

      {/* Dates + cost */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 12, color: COLORS.textMuted, flexWrap: 'wrap', alignItems: 'center' }}>
        {project.startDate && <span>📅 {formatDate(project.startDate)}</span>}
        {project.deadline  && <span>⏰ {formatDate(project.deadline)}</span>}
        {project.deadline  && status !== 'Abgeschlossen' && <DeadlineHint deadline={project.deadline} />}
        {totalCost > 0 && (
          <span style={{ marginLeft: 'auto', fontWeight: 700, color: COLORS.accent }}>{fmtEur(totalCost)}</span>
        )}
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Tag>{count} Material{count !== 1 ? 'ien' : ''}</Tag>
        {project.buffer > 0 && <Tag color={COLORS.prio}>+{project.buffer}% Puffer</Tag>}
        {project.materials.slice(0, 2).map((m, i) => m.name && <Tag key={i} color={COLORS.textMuted}>{m.name}</Tag>)}
        {count > 2 && <Tag color={COLORS.textMuted}>+{count - 2}</Tag>}
      </div>
    </div>
  );
}
