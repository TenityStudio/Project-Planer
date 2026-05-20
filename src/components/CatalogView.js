import { useState } from 'react';
import { COLORS, UNITS } from '../lib/utils';
import { Btn, Inp, Sel } from './UI';

export function CatalogView({ catalog, onAdd, onSave, onDelete, onBack }) {
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', unit: 'Stück', link: '', price: '', supplier: '' });

  const filtered = search
    ? catalog.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.supplier?.toLowerCase().includes(search.toLowerCase()))
    : catalog;

  const startNew = () => { setForm({ name: '', unit: 'Stück', link: '', price: '', supplier: '' }); setEditId('new'); };
  const startEdit = (c) => { setForm({ name: c.name, unit: c.unit, link: c.link || '', price: c.price || '', supplier: c.supplier || '' }); setEditId(c.id); };

  const save = () => {
    if (!form.name.trim()) return;
    if (editId === 'new') onAdd(form);
    else onSave({ id: editId, ...form });
    setEditId(null);
  };

  return (
    <div>
      <button onClick={onBack} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: COLORS.textMuted, fontFamily: "'DM Sans',sans-serif", fontSize: 14, padding: '4px 0', marginBottom: 20 }}>
        ← Zurück
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>🗄</div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.text }}>Material-Datenbank</h2>
          <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>{catalog.length} Einträge</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <Inp value={search} onChange={setSearch} placeholder="Suchen…" style={{ flex: 1 }} />
        <Btn onClick={startNew} size="sm">+ Neu</Btn>
      </div>

      {editId && (
        <div style={{ background: COLORS.highlight, border: `1.5px solid ${COLORS.highlightBorder}`, borderRadius: 14, padding: 18, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <Inp value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Materialname" />
            <Sel value={form.unit} onChange={v => setForm({ ...form, unit: v })} options={UNITS} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <Inp value={form.supplier} onChange={v => setForm({ ...form, supplier: v })} placeholder="Lieferant (optional)" />
            <Inp value={form.price} onChange={v => setForm({ ...form, price: v })} placeholder="Preis €" type="number" min="0" />
          </div>
          <Inp value={form.link} onChange={v => setForm({ ...form, link: v })} placeholder="Link" style={{ marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={save} size="sm">✓ Speichern</Btn>
            <Btn onClick={() => setEditId(null)} variant="ghost" size="sm">Abbrechen</Btn>
          </div>
        </div>
      )}

      <div style={{ background: COLORS.card, borderRadius: 14, border: `1.5px solid ${COLORS.border}`, overflow: 'hidden' }}>
        {filtered.length === 0
          ? <p style={{ textAlign: 'center', color: COLORS.textMuted, padding: '36px 20px', fontSize: 14 }}>{catalog.length === 0 ? 'Noch keine Einträge.' : 'Keine Treffer.'}</p>
          : filtered.map((c, i) => (
            <div key={c.id} style={{ padding: '13px 18px', borderBottom: i < filtered.length - 1 ? `1px solid ${COLORS.border}33` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: i % 2 === 0 ? 'transparent' : COLORS.bg + '55' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: COLORS.textMuted, background: COLORS.tagBg, padding: '1px 7px', borderRadius: 10 }}>{c.unit}</span>
                  {c.supplier && <span style={{ fontSize: 11, color: COLORS.link }}>🚚 {c.supplier}</span>}
                  {c.price && <span style={{ fontSize: 11, color: COLORS.accent, fontWeight: 700 }}>{c.price}€</span>}
                </div>
                {c.link && <a href={c.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: COLORS.link, textDecoration: 'none' }}>🔗 {c.link.length > 50 ? c.link.slice(0, 50) + '…' : c.link}</a>}
              </div>
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                <button onClick={() => startEdit(c)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.textMuted, padding: 6, fontSize: 14 }}
                  onMouseEnter={e => e.currentTarget.style.color = COLORS.accent}
                  onMouseLeave={e => e.currentTarget.style.color = COLORS.textMuted}>✏️</button>
                <button onClick={() => onDelete(c.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.textMuted, padding: 6, fontSize: 14 }}
                  onMouseEnter={e => e.currentTarget.style.color = COLORS.danger}
                  onMouseLeave={e => e.currentTarget.style.color = COLORS.textMuted}>🗑</button>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}
