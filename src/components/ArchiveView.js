import { useState } from 'react';
import { COLORS, formatDate } from '../lib/utils';
import { Btn, Inp, StatusBadge, ConfirmDialog } from './UI';

export function ArchiveView({ projects, onRestore, onDelete, onBack }) {
  const [search, setSearch] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const archived = projects.filter(p => p.archived);
  const filtered = search ? archived.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) : archived;

  return (
    <div>
      {confirmId && <ConfirmDialog message="Projekt endgültig löschen? Dies kann nicht rückgängig gemacht werden." onConfirm={() => { onDelete(confirmId); setConfirmId(null); }} onCancel={() => setConfirmId(null)} />}
      <button onClick={onBack} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: COLORS.textMuted, fontFamily: "'DM Sans',sans-serif", fontSize: 14, padding: '4px 0', marginBottom: 20 }}>
        ← Zurück
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: COLORS.archive, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>📦</div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.text }}>Archiv</h2>
          <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>{archived.length} archivierte Projekte</p>
        </div>
      </div>

      {archived.length > 0 && (
        <Inp value={search} onChange={setSearch} placeholder="Suchen…" style={{ marginBottom: 14 }} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: COLORS.textMuted }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: .3 }}>📦</div>
            <p style={{ fontSize: 14 }}>Noch keine archivierten Projekte.</p>
          </div>
        )}
        {filtered.map(p => (
          <div key={p.id} style={{ background: COLORS.card, borderRadius: 12, padding: 18, border: `1.5px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.textMuted }}>{p.name}</span>
                <StatusBadge status={p.status || 'ToDo'} />
              </div>
              <span style={{ fontSize: 12, color: COLORS.textMuted }}>
                {p.materials.length} Materialien{p.deadline ? ` · bis ${formatDate(p.deadline)}` : ''}
              </span>
              {p.notes && <p style={{ margin: '4px 0 0', fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic' }}>{p.notes}</p>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <Btn onClick={() => onRestore(p.id)} variant="secondary" size="sm">↩ Wiederherstellen</Btn>
              <Btn onClick={() => setConfirmId(p.id)} variant="danger" size="sm">🗑</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
