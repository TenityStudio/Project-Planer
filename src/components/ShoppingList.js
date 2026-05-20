import { useState } from 'react';
import * as XLSX from 'xlsx';
import { COLORS, applyBuffer, fmtEur } from '../lib/utils';
import { Btn } from './UI';

export function ShoppingList({ projects, catalog, onBack }) {
  const [copied, setCopied] = useState(false);
  const [checks, setChecks] = useState({});
  const [groupBySupplier, setGroupBySupplier] = useState(false);

  const toggle = (key, field) => setChecks(p => ({ ...p, [key]: { ...p[key], [field]: !p[key]?.[field] } }));

  // Only active projects
  const active = projects.filter(p => p.status !== 'Bau' && p.status !== 'Abgeschlossen' && !p.archived);
  const skipped = projects.filter(p => !p.archived).length - active.length;

  // Aggregate materials
  const agg = {};
  const srcMap = {};
  active.forEach(p => {
    const buf = parseFloat(p.buffer) || 0;
    p.materials.forEach(m => {
      if (!m.name.trim()) return;
      const key = `${m.name.trim().toLowerCase()}|||${m.unit}`;
      if (!agg[key]) {
        const cat = catalog.find(c => c.name.toLowerCase() === m.name.trim().toLowerCase());
        agg[key] = { name: m.name.trim(), unit: m.unit, amount: 0, cost: 0, pricePerUnit: parseFloat(m.pricePerUnit) || parseFloat(cat?.price) || 0, link: m.link || cat?.link || '', supplier: cat?.supplier || '' };
        srcMap[key] = [];
      }
      const raw = parseFloat(m.amount) || 0;
      const amt = applyBuffer(raw, buf);
      const price = parseFloat(m.pricePerUnit) || parseFloat(catalog.find(c => c.name.toLowerCase() === m.name.trim().toLowerCase())?.price) || 0;
      if (price > 0 && agg[key].pricePerUnit === 0) agg[key].pricePerUnit = price;
      agg[key].amount += amt;
      agg[key].cost += amt * price;
      if (!agg[key].link && m.link) agg[key].link = m.link;
      if (raw > 0) srcMap[key].push({ project: p.name, amount: raw, buffered: amt, buffer: buf });
    });
  });

  const items = Object.entries(agg)
    .map(([key, val]) => ({ ...val, key, sources: srcMap[key] }))
    .filter(i => i.amount > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));

  const totalCost = items.reduce((s, i) => s + i.cost, 0);
  const suppliers = [...new Set(items.map(i => i.supplier || 'Kein Lieferant'))].sort((a, b) => a === 'Kein Lieferant' ? 1 : b === 'Kein Lieferant' ? -1 : a.localeCompare(b, 'de'));
  const bySupplier = {};
  items.forEach(i => { const s = i.supplier || 'Kein Lieferant'; if (!bySupplier[s]) bySupplier[s] = []; bySupplier[s].push(i); });

  const copyList = () => {
    const text = items.map(i => `${i.amount % 1 === 0 ? i.amount : i.amount.toFixed(2)} ${i.unit}  ${i.name}${i.link ? '  ' + i.link : ''}`).join('\n');
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const exportExcel = () => {
    const rows = items.map(i => ({
      Material: i.name,
      Menge: parseFloat(i.amount % 1 === 0 ? i.amount : i.amount.toFixed(2)),
      Einheit: i.unit,
      '€/Einheit': i.pricePerUnit || '',
      'Gesamt €': i.cost > 0 ? parseFloat(i.cost.toFixed(2)) : '',
      Lieferant: i.supplier || '',
      Link: i.link || '',
      Projekte: i.sources.map(s => `${s.project} (${s.amount}${s.buffer > 0 ? ` +${s.buffer}%` : ''})`).join(', '),
    }));
    if (totalCost > 0) rows.push({ Material: 'GESAMT', Menge: '', Einheit: '', '€/Einheit': '', 'Gesamt €': parseFloat(totalCost.toFixed(2)), Lieferant: '', Link: '', Projekte: '' });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 28 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 40 }, { wch: 36 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bestellliste');
    XLSX.writeFile(wb, `Bestellliste_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPdf = () => {
    const today = new Date().toLocaleDateString('de-DE');
    const renderRow = (it, idx) => {
      const bg = idx % 2 === 0 ? '#fff' : '#f7f5f2';
      const l = it.link ? `<a href="${it.link}" style="color:#2563EB;font-size:11px">${it.link.length > 35 ? it.link.slice(0, 35) + '…' : it.link}</a>` : '—';
      return `<tr style="background:${bg}">
        <td style="padding:7px 9px;border-bottom:1px solid #e0dad3;font-weight:600">${it.name}</td>
        <td style="padding:7px 9px;border-bottom:1px solid #e0dad3;text-align:right;font-weight:700;color:#2D5A3D">${it.amount % 1 === 0 ? it.amount : it.amount.toFixed(2)}</td>
        <td style="padding:7px 9px;border-bottom:1px solid #e0dad3">${it.unit}</td>
        <td style="padding:7px 9px;border-bottom:1px solid #e0dad3;text-align:right">${it.pricePerUnit ? parseFloat(it.pricePerUnit).toFixed(2) + ' €' : '—'}</td>
        <td style="padding:7px 9px;border-bottom:1px solid #e0dad3;text-align:right;font-weight:700;color:#2D5A3D">${it.cost > 0 ? fmtEur(it.cost) : '—'}</td>
        <td style="padding:7px 9px;border-bottom:1px solid #e0dad3">${l}</td>
        <td style="padding:7px 9px;border-bottom:1px solid #e0dad3;font-size:11px;color:#6B6B6B">${it.sources.map(s => `${s.project}(${s.amount})`).join(', ')}</td>
      </tr>`;
    };
    const sections = groupBySupplier
      ? suppliers.map(s => `<tr style="background:#2D5A3D"><td colspan="7" style="padding:7px 9px;color:#fff;font-weight:700;font-size:12px">${s}</td></tr>` + bySupplier[s].map(renderRow).join('')).join('')
      : items.map(renderRow).join('');
    const totalRow = totalCost > 0
      ? `<tr style="background:#E8F0EB"><td colspan="4" style="padding:8px 9px;font-weight:800;color:#2D5A3D">GESAMT</td><td style="padding:8px 9px;text-align:right;font-weight:800;font-size:14px;color:#2D5A3D">${fmtEur(totalCost)}</td><td colspan="2"></td></tr>`
      : '';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bestellliste ${today}</title>
    <style>@page{size:A4 landscape;margin:15mm}body{font-family:Arial,sans-serif;color:#1A1A1A;margin:0;padding:20px}h1{font-size:20px;color:#2D5A3D;margin:0 0 4px}.sub{font-size:12px;color:#6B6B6B;margin-bottom:18px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#2D5A3D;color:#fff;padding:8px 9px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px}th:nth-child(2),th:nth-child(4),th:nth-child(5){text-align:right}</style>
    </head><body>
    <h1>Bestellliste</h1>
    <div class="sub">${items.length} Positionen · ${today}${totalCost > 0 ? ' · Gesamt: ' + fmtEur(totalCost) : ''}</div>
    <table><thead><tr><th>Material</th><th>Menge</th><th>Einheit</th><th>€/Einh.</th><th>Gesamt</th><th>Link</th><th>Projekte</th></tr></thead>
    <tbody>${sections}${totalRow}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Bestellliste_${new Date().toISOString().slice(0, 10)}.html`;
    a.click(); URL.revokeObjectURL(url);
  };

  const renderItem = (item, idx, arr) => {
    const c = checks[item.key] || {};
    const ordered = !!c.ordered, arrived = !!c.arrived;
    const bg = arrived ? '#F0FAF4' : ordered ? COLORS.highlight : idx % 2 === 0 ? 'transparent' : COLORS.bg + '55';
    return (
      <div key={item.key} style={{ padding: '13px 20px', borderBottom: idx < arr.length - 1 ? `1px solid ${COLORS.border}33` : 'none', background: bg, display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', transition: 'background .2s' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: arrived ? COLORS.accent : COLORS.text, textDecoration: arrived ? 'line-through' : 'none', opacity: arrived ? .65 : 1 }}>{item.name}</span>
            {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.link, fontSize: 13 }} title="Shop öffnen">🔗</a>}
            <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.accent }}>{item.amount % 1 === 0 ? item.amount : item.amount.toFixed(2)} {item.unit}</span>
            {item.sources.some(s => s.buffer > 0) && <span style={{ fontSize: 10, color: COLORS.prio, fontWeight: 700 }}>inkl. Puffer</span>}
            {item.cost > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.accent, opacity: .75 }}>{fmtEur(item.cost)}</span>}
          </div>
          {item.sources.length > 1 && (
            <div style={{ marginTop: 3, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {item.sources.map((s, i) => <span key={i} style={{ fontSize: 11, color: COLORS.textMuted, background: COLORS.tagBg, padding: '1px 7px', borderRadius: 10 }}>{s.project}: {s.amount}{s.buffer > 0 ? ` (+${s.buffer}%)` : ''}</span>)}
            </div>
          )}
        </div>
        <div style={{ width: 80, display: 'flex', justifyContent: 'center' }}>
          <button onClick={() => toggle(item.key, 'ordered')} style={{ width: 30, height: 30, borderRadius: 8, border: `2px solid ${ordered ? COLORS.prio : COLORS.border}`, background: ordered ? COLORS.prioBg : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s', fontSize: 14 }}>
            {ordered ? '✓' : ''}
          </button>
        </div>
        <div style={{ width: 72, display: 'flex', justifyContent: 'center' }}>
          <button onClick={() => toggle(item.key, 'arrived')} style={{ width: 30, height: 30, borderRadius: 8, border: `2px solid ${arrived ? COLORS.accent : COLORS.border}`, background: arrived ? COLORS.accentPale : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s', fontSize: 14 }}>
            {arrived ? '✓' : ''}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <button onClick={onBack} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: COLORS.textMuted, fontFamily: "'DM Sans',sans-serif", fontSize: 14, padding: '4px 0', marginBottom: 20 }}>
        ← Zurück
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>🛒</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.text }}>Bestellliste</h2>
            <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>
              {items.length} Positionen · {active.length} Projekte
              {skipped > 0 && <span> · {skipped} ausgeblendet</span>}
            </p>
          </div>
        </div>
        {items.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Btn onClick={() => setGroupBySupplier(g => !g)} variant={groupBySupplier ? 'orange' : 'ghost'} size="sm">🚚 Lieferant</Btn>
            <Btn onClick={exportPdf} variant="secondary" size="sm">📄 PDF</Btn>
            <Btn onClick={exportExcel} variant="primary" size="sm">📥 Excel</Btn>
            <Btn onClick={copyList} variant="ghost" size="sm">{copied ? '✓ Kopiert' : '📋 Kopieren'}</Btn>
          </div>
        )}
      </div>

      {items.length === 0
        ? <div style={{ background: COLORS.card, borderRadius: 14, padding: 40, border: `1.5px solid ${COLORS.border}`, textAlign: 'center' }}>
            <p style={{ color: COLORS.textMuted, fontSize: 14 }}>Keine offenen Materialien.</p>
          </div>
        : <div style={{ background: COLORS.card, borderRadius: 14, border: `1.5px solid ${COLORS.border}`, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', padding: '8px 20px', borderBottom: `2px solid ${COLORS.border}`, background: COLORS.bg }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8, color: COLORS.textMuted }}>Material</span>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8, color: COLORS.prio, width: 80, textAlign: 'center' }}>Bestellt</span>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8, color: COLORS.accent, width: 72, textAlign: 'center' }}>Da</span>
            </div>
            {groupBySupplier
              ? suppliers.map(s => (
                <div key={s}>
                  <div style={{ padding: '8px 20px', background: COLORS.accentPale, borderBottom: `1px solid ${COLORS.border}33`, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.accent }}>🚚 {s}</span>
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>({bySupplier[s].length} Positionen)</span>
                  </div>
                  {bySupplier[s].map((item, idx) => renderItem(item, idx, bySupplier[s]))}
                </div>
              ))
              : items.map((item, idx) => renderItem(item, idx, items))
            }
            <div style={{ padding: '10px 20px', background: COLORS.accentPale, borderTop: `2px solid ${COLORS.border}`, display: 'flex', gap: 20, fontSize: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: COLORS.prio, fontWeight: 700 }}>✓ Bestellt: {items.filter(i => checks[i.key]?.ordered).length}/{items.length}</span>
              <span style={{ color: COLORS.accent, fontWeight: 700 }}>✓ Da: {items.filter(i => checks[i.key]?.arrived).length}/{items.length}</span>
              {totalCost > 0 && <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 14, color: COLORS.accent }}>Gesamt: {fmtEur(totalCost)}</span>}
            </div>
          </div>
      }
    </div>
  );
}
