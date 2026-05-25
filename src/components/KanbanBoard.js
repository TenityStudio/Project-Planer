import { useState } from 'react';
import { COLORS, STATUSES, STATUS_COLORS, formatDate, calcCost, fmtEur } from '../lib/utils';

function KanbanCard({ project, onOpen, onArchive, onDuplicate }) {
  const [dragging, setDragging] = useState(false);
  const totalCost = project.materials.reduce((s, m) => s + calcCost(m, project.buffer || 0), 0);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', project.id);
        e.dataTransfer.effectAllowed = 'move';
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      onClick={onOpen}
      style={{
        background: COLORS.card,
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 8,
        cursor: dragging ? 'grabbing' : 'grab',
        border: `1.5px solid ${project.priority ? COLORS.prio + '55' : COLORS.border}`,
        borderLeft: project.priority ? `4px solid ${COLORS.prio}` : undefined,
        opacity: dragging ? 0.45 : 1,
        transition: 'opacity .15s, box-shadow .15s',
        userSelect: 'none',
      }}
      onMouseEnter={e => { if (!dragging) e.currentTarget.style.boxShadow = '0 4px 12px rgba(45,90,61,.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, flex: 1 }}>
          {project.priority && <span style={{ fontSize: 12, flexShrink: 0 }}>🚩</span>}
          <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.name}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0, marginLeft: 6 }} onClick={e => e.stopPropagation()}>
          <button onClick={onDuplicate} title="Duplizieren"
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.textMuted, padding: 2, fontSize: 13 }}
            onMouseEnter={e => e.currentTarget.style.color = COLORS.accent}
            onMouseLeave={e => e.currentTarget.style.color = COLORS.textMuted}>⧉</button>
          <button onClick={onArchive} title="Archivieren"
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.textMuted, padding: 2, fontSize: 13 }}
            onMouseEnter={e => e.currentTarget.style.color = COLORS.archive}
            onMouseLeave={e => e.currentTarget.style.color = COLORS.textMuted}>📦</button>
        </div>
      </div>

      {project.kunde && (
        <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
          <span>👤</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{project.kunde}</span>
        </div>
      )}

      {project.deadline && (
        <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 3 }}>⏰ {formatDate(project.deadline)}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <span style={{ fontSize: 10, color: COLORS.textMuted }}>
          {project.materials.length} Material{project.materials.length !== 1 ? 'ien' : ''}
        </span>
        {totalCost > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.accent }}>{fmtEur(totalCost)}</span>
        )}
      </div>
      </div>
    </div>
  );
}

export function KanbanBoard({ projects, onOpen, onStatusChange, onArchive, onDuplicate }) {
  const [dragOver, setDragOver] = useState(null);

  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '4px 2px 24px', alignItems: 'flex-start' }}>
      {STATUSES.map(status => {
        const cards = projects.filter(p => p.status === status);
        const isOver = dragOver === status;
        const sc = STATUS_COLORS[status];

        return (
          <div
            key={status}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
            onDragEnter={(e) => { e.preventDefault(); setDragOver(status); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null); }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const id = e.dataTransfer.getData('text/plain');
              if (id) onStatusChange(id, status);
            }}
            style={{
              flex: '0 0 220px',
              background: isOver ? sc.bg : '#EDEAE5',
              borderRadius: 12,
              padding: 12,
              border: `2px solid ${isOver ? sc.text : COLORS.border}`,
              minHeight: 220,
              transition: 'border-color .15s, background .15s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: `1.5px solid ${COLORS.border}` }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: sc.text, background: sc.bg, padding: '3px 10px', borderRadius: 20 }}>
                {status}
              </span>
              <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600, minWidth: 16, textAlign: 'right' }}>{cards.length}</span>
            </div>

            {cards.length === 0 && (
              <div style={{ textAlign: 'center', color: COLORS.textMuted, fontSize: 12, padding: '20px 0', opacity: .5 }}>
                Keine Projekte
              </div>
            )}

            {cards.map(p => (
              <KanbanCard
                key={p.id}
                project={p}
                onOpen={() => onOpen(p.id)}
                onArchive={() => onArchive(p.id)}
                onDuplicate={() => onDuplicate(p)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
