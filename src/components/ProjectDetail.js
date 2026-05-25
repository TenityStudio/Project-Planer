import { useState, useCallback, useRef, useEffect } from 'react';
import { COLORS, UNITS, STATUSES, STATUS_COLORS, calcCost, fmtEur, applyBuffer } from '../lib/utils';
import { Btn, Inp, Sel, Card, FL, DI, ConfirmDialog } from './UI';

function MatAutoComplete({ value, onChange, catalog, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const matches = value.length > 0
    ? catalog.filter(c => c.name.toLowerCase().includes(value.toLowerCase())).slice(0, 6)
    : [];

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <Inp value={value} onChange={v => { onChange(v); setOpen(true); }} placeholder="Material" />
      {open && matches.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: `1.5px solid ${COLORS.border}`, borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', maxHeight: 200, overflow: 'auto', marginTop: 2,
        }}>
          {matches.map(c => (
            <div key={c.id}
              onClick={() => { onSelect(c); setOpen(false); }}
              style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, borderBottom: `1px solid ${COLORS.border}22`, display: 'flex', justifyContent: 'space-between' }}
              onMouseEnter={e => e.currentTarget.style.background = COLORS.accentPale}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div>
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                {c.supplier && <span style={{ fontSize: 11, color: COLORS.textMuted, marginLeft: 6 }}>· {c.supplier}</span>}
              </div>
              <span style={{ fontSize: 11, color: COLORS.textMuted }}>{c.unit}{c.price ? ` · ${c.price}€` : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MatRow({ mat, onUpdate, onDelete, catalog, buffer }) {
  const [confirm, setConfirm] = useState(false);
  const lineTotal = calcCost(mat, buffer);
  return (
    <div style={{ padding: '10px 0', borderBottom: `1px solid ${COLORS.border}18` }}>
      {confirm && <ConfirmDialog message="Material wirklich löschen?" onConfirm={onDelete} onCancel={() => setConfirm(false)} />}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 74px 90px 74px 36px', gap: 6, alignItems: 'center' }}>
        <MatAutoComplete value={mat.name} catalog={catalog}
          onChange={v => onUpdate({ ...mat, name: v })}
          onSelect={c => onUpdate({ ...mat, name: c.name, unit: c.unit, link: c.link || mat.link, pricePerUnit: c.price || mat.pricePerUnit || '' })} />
        <Inp value={mat.amount} onChange={v => onUpdate({ ...mat, amount: v })} placeholder="Menge" type="number" min="0" />
        <Sel value={mat.unit} onChange={v => onUpdate({ ...mat, unit: v })} options={UNITS} />
        <Inp value={mat.pricePerUnit || ''} onChange={v => onUpdate({ ...mat, pricePerUnit: v })} placeholder="€/Einh." type="number" min="0" />
        <button onClick={() => setConfirm(true)}
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.textMuted, padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={e => e.currentTarget.style.color = COLORS.danger}
          onMouseLeave={e => e.currentTarget.style.color = COLORS.textMuted}>🗑</button>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1 }}>
          <span style={{ fontSize: 13, color: COLORS.textMuted }}>🔗</span>
          <input value={mat.link || ''} onChange={e => onUpdate({ ...mat, link: e.target.value })}
            placeholder="Link zum Artikel"
            style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, padding: '3px 8px', border: `1px solid ${COLORS.border}44`, borderRadius: 5, outline: 'none', background: 'transparent', color: COLORS.link, flex: 1, boxSizing: 'border-box' }} />
          {mat.link && <a href={mat.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: COLORS.link, fontWeight: 600 }}>↗</a>}
        </div>
        {lineTotal > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.accent, whiteSpace: 'nowrap', marginLeft: 8 }}>{fmtEur(lineTotal)}</span>}
      </div>
    </div>
  );
}

export function ProjectDetail({ project, onSave, onDelete, onBack, catalog }) {
  const [local, setLocal] = useState(project);
  const [confirmProject, setConfirmProject] = useState(false);
  const saveTimer = useRef(null);

  // Sync when project changes from outside (realtime)
  useEffect(() => { setLocal(project); }, [project.id]);

  const update = useCallback((patch) => {
    const updated = { ...local, ...patch };
    setLocal(updated);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onSave(updated), 500);
  }, [local, onSave]);

  const [editName, setEditName] = useState(false);
  const [nameVal, setNameVal] = useState(local.name);

  const addMat = () => {
    const mats = [...local.materials, { id: crypto.randomUUID(), name: '', amount: '', unit: 'Stück', pricePerUnit: '', link: '' }];
    update({ materials: mats });
  };
  const updMat = (i, m) => { const mats = [...local.materials]; mats[i] = m; update({ materials: mats }); };
  const delMat = (i) => update({ materials: local.materials.filter((_, j) => j !== i) });

  const total = local.materials.reduce((s, m) => s + calcCost(m, local.buffer || 0), 0);
  const base  = local.materials.reduce((s, m) => s + (parseFloat(m.amount) || 0) * (parseFloat(m.pricePerUnit) || 0), 0);
  const hasPrice = local.materials.some(m => parseFloat(m.pricePerUnit) > 0);
  const hasBuf = parseFloat(local.buffer) > 0;

  return (
    <div>
      {confirmProject && <ConfirmDialog message="Projekt wirklich löschen? Alle Materialien werden ebenfalls gelöscht." onConfirm={onDelete} onCancel={() => setConfirmProject(false)} />}
      <button onClick={onBack} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: COLORS.textMuted, fontFamily: "'DM Sans',sans-serif", fontSize: 14, padding: '4px 0', marginBottom: 20 }}>
        ← Zurück
      </button>

      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <button onClick={() => { const v = !local.priority; update({ priority: v }); }}
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, fontSize: 18 }}
          title={local.priority ? 'Priorität entfernen' : 'Als Priorität markieren'}>
          {local.priority ? '🚩' : '🏳'}
        </button>
        {editName
          ? <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
              <Inp value={nameVal} onChange={setNameVal} style={{ fontSize: 20, fontWeight: 700 }} />
              <Btn onClick={() => { setEditName(false); update({ name: nameVal }); }} size="sm">✓</Btn>
            </div>
          : <>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: COLORS.text, flex: 1 }}>{local.name}</h2>
              <button onClick={() => { setNameVal(local.name); setEditName(true); }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.textMuted, padding: 4 }}>✏️</button>
            </>
        }
      </div>

      {/* Meta card */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={FL}>Kundenname</div>
          <Inp value={local.kunde || ''} onChange={v => update({ kunde: v })} placeholder="z.B. Müller GmbH" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <div style={FL}>Startdatum</div>
            <input type="date" value={local.startDate || ''} onChange={e => update({ startDate: e.target.value })} style={DI} />
          </div>
          <div>
            <div style={FL}>Fertig bis</div>
            <input type="date" value={local.deadline || ''} onChange={e => update({ deadline: e.target.value })} style={DI} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <div style={FL}>Status</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {STATUSES.map(s => {
                const a = local.status === s;
                const c = STATUS_COLORS[s];
                return (
                  <button key={s} onClick={() => update({ status: s })}
                    style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20, cursor: 'pointer', border: a ? `2px solid ${c.text}` : `1.5px solid ${COLORS.border}`, background: a ? c.bg : 'transparent', color: a ? c.text : COLORS.textMuted, transition: 'all .15s' }}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div style={FL}>Verschnitt / Puffer</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Inp value={local.buffer || ''} onChange={v => update({ buffer: v })} type="number" min="0" style={{ width: 80 }} placeholder="0" />
              <span style={{ fontSize: 14, color: COLORS.textMuted, fontWeight: 600 }}>%</span>
              {local.buffer > 0 && <span style={{ fontSize: 11, color: COLORS.prio, fontWeight: 700 }}>+{local.buffer}%</span>}
            </div>
          </div>
        </div>
        <div>
          <div style={FL}>Notizen</div>
          <Inp value={local.notes || ''} onChange={v => update({ notes: v })} placeholder="Kundenname, Adresse, Anmerkungen…" rows={2} />
        </div>
      </Card>

      {/* Materials */}
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 74px 90px 74px 36px', gap: 6, padding: '0 0 10px', borderBottom: `2px solid ${COLORS.border}`, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8, color: COLORS.textMuted }}>
          <span>Material</span><span>Menge</span><span>Einheit</span><span>€/Einh.</span><span></span>
        </div>
        {local.materials.map((m, i) => (
          <MatRow key={m.id} mat={m} catalog={catalog} buffer={local.buffer || 0}
            onUpdate={u => updMat(i, u)} onDelete={() => delMat(i)} />
        ))}
        {local.materials.length === 0 && (
          <p style={{ textAlign: 'center', color: COLORS.textMuted, padding: '28px 0', fontSize: 14 }}>Noch keine Materialien</p>
        )}
        {hasPrice && (
          <div style={{ marginTop: 14, padding: '12px 16px', background: COLORS.accentPale, borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 600 }}>
              {hasBuf ? `Gesamt (inkl. ${local.buffer}% Puffer)` : 'Gesamt Materialkosten'}
            </span>
            <div style={{ textAlign: 'right' }}>
              {hasBuf && <div style={{ fontSize: 11, color: COLORS.textMuted }}>Netto: {fmtEur(base)}</div>}
              <span style={{ fontSize: 16, fontWeight: 800, color: COLORS.accent }}>{fmtEur(total)}</span>
            </div>
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <Btn onClick={addMat} variant="secondary" size="sm">+ Material hinzufügen</Btn>
        </div>
      </Card>

      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
        <Btn onClick={() => setConfirmProject(true)} variant="danger" size="sm">🗑 Projekt löschen</Btn>
      </div>
    </div>
  );
}
