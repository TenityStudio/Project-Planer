import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchNeonPreise, upsertNeonPreis } from '../lib/supabase';

const PRICE_DEFS = [
  { key: 'acryl_m2',    cat: 'Material',    label: 'Acrylplatte',       desc: 'Preis pro m²',            defaultVal: 28.00, unit: '€/m²' },
  { key: 'led_m',       cat: 'Material',    label: 'LED-Neon-Schlauch', desc: 'Preis pro Laufmeter',     defaultVal: 8.50,  unit: '€/m' },
  { key: 'trafo',       cat: 'Komponenten', label: 'Trafo',             desc: 'Stückpreis',              defaultVal: 22.00, unit: '€/Stk.' },
  { key: 'dimmer',      cat: 'Komponenten', label: 'Dimmer',            desc: 'Stückpreis',              defaultVal: 18.00, unit: '€/Stk.' },
  { key: 'abstand',     cat: 'Komponenten', label: 'Abstandshalter',    desc: 'Stückpreis',              defaultVal: 0.80,  unit: '€/Stk.' },
  { key: 'stundensatz', cat: 'Arbeit',      label: 'Stundensatz',       desc: 'Netto pro Arbeitsstunde', defaultVal: 55.00, unit: '€/h' },
];

function defaultPrices() {
  const d = {};
  PRICE_DEFS.forEach(p => { d[p.key] = p.defaultVal; });
  return d;
}

function fmt(n) { return n.toFixed(2).replace('.', ',') + ' €'; }

export function NeonRechner() {
  const [innerTab, setInnerTab] = useState('calc');
  const [prices, setPrices] = useState(defaultPrices);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [extras, setExtras] = useState([]);
  const [saveNotice, setSaveNotice] = useState(false);
  const saveTimers = useRef({});

  const [laenge, setLaenge] = useState('');
  const [breite, setBreite] = useState('');
  const [anzahl, setAnzahl] = useState('1');
  const [ledLaenge, setLedLaenge] = useState('');
  const [arbeitsstunden, setArbeitsstunden] = useState('');
  const [abstandCb, setAbstandCb] = useState(false);
  const [abstandInterval, setAbstandInterval] = useState('30');
  const [margePct, setMargePct] = useState('30');

  useEffect(() => {
    fetchNeonPreise()
      .then(saved => {
        setPrices(prev => ({ ...prev, ...saved }));
      })
      .catch(() => {})
      .finally(() => setPricesLoading(false));
  }, []);

  useEffect(() => {
    if (!document.getElementById('bebas-neue-font')) {
      const link = document.createElement('link');
      link.id = 'bebas-neue-font';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  const updatePrice = useCallback((key, val) => {
    const num = parseFloat(val) || 0;
    setPrices(prev => ({ ...prev, [key]: num }));
    clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(() => {
      upsertNeonPreis(key, num)
        .then(() => { setSaveNotice(true); setTimeout(() => setSaveNotice(false), 1500); })
        .catch(() => {});
    }, 600);
  }, []);

  const addExtra    = () => setExtras(prev => [...prev, { name: '', preis: 0 }]);
  const removeExtra = (i) => setExtras(prev => prev.filter((_, idx) => idx !== i));
  const updateExtra = (i, field, val) => setExtras(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));

  const L       = parseFloat(laenge) || 0;
  const B       = parseFloat(breite) || 0;
  const anz     = parseInt(anzahl) || 1;
  const led     = parseFloat(ledLaenge) || 0;
  const stunden = parseFloat(arbeitsstunden) || 0;
  const interval = parseFloat(abstandInterval) || 30;
  const marge   = parseFloat(margePct) || 0;

  const autoAnz    = led > 0 ? Math.max(1, Math.ceil(led / 10)) : 1;
  const m2         = (L / 100) * (B / 100);
  const umfang     = 2 * L + 2 * B;
  const abstandAnz = abstandCb && umfang > 0 ? (Math.ceil(umfang / interval) + 1) * anz : 0;

  const acrylPreis   = m2 * anz * prices['acryl_m2'];
  const ledPreis     = led * anz * prices['led_m'];
  const trafoPreis   = autoAnz * anz * prices['trafo'];
  const dimmerPreis  = autoAnz * anz * prices['dimmer'];
  const abstandPreis = abstandAnz * prices['abstand'];
  const arbeitPreis  = stunden * anz * prices['stundensatz'];

  const positions = [
    { label: 'Acrylplatte',       sub: m2.toFixed(3) + ' m² × ' + anz,                                           val: acrylPreis,   show: m2 > 0 },
    { label: 'LED-Neon-Schlauch', sub: led + ' m × ' + anz,                                                       val: ledPreis,     show: led > 0 },
    { label: 'Trafo(s)',          sub: autoAnz + ' × ' + anz + ' Stk.',                                           val: trafoPreis,   show: autoAnz > 0 },
    { label: 'Dimmer',            sub: autoAnz + ' × ' + anz + ' Stk.',                                           val: dimmerPreis,  show: autoAnz > 0 },
    { label: 'Abstandshalter',    sub: abstandAnz + ' Stk.',                                                      val: abstandPreis, show: abstandCb && abstandAnz > 0 },
    { label: 'Arbeitszeit',       sub: stunden + ' h × ' + anz + ' × ' + prices['stundensatz'].toFixed(0) + '€',  val: arbeitPreis,  show: stunden > 0 },
    ...extras.filter(e => e.preis > 0).map(e => ({ label: e.name || 'Extra', sub: '', val: e.preis, show: true })),
  ];

  const total   = positions.filter(p => p.show).reduce((s, p) => s + p.val, 0);
  const gewinn  = total * (marge / 100);
  const vkPreis = total + gewinn;

  const s = {
    bg: '#0a0a0f', surface: '#13131c', surface2: '#1c1c2a', border: '#2a2a3d',
    neonPink: '#ff2d78', neonBlue: '#00d4ff', neonYellow: '#ffe100', neonGreen: '#00ffaa',
    text: '#e8e8f0', muted: '#6b6b8a', radius: 12,
  };

  const cardStyle  = { background: s.surface, border: `1px solid ${s.border}`, borderRadius: s.radius, padding: 22 };
  const inputStyle = { width: '100%', background: s.surface2, border: `1px solid ${s.border}`, borderRadius: 8, padding: '10px 14px', color: s.text, fontFamily: "'DM Sans', sans-serif", fontSize: 15, outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: s.muted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 };
  const cardTitle  = (color = s.neonBlue) => ({ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: '1.5px', color, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 });
  const dot        = (color = s.neonPink) => ({ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0 });

  return (
    <div style={{ background: s.bg, minHeight: '100vh', color: s.text, fontFamily: "'DM Sans', sans-serif", fontSize: 15, paddingBottom: 60, marginTop: -22, marginLeft: -18, marginRight: -18 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '30px 20px 60px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(36px, 7vw, 72px)', letterSpacing: 3, background: `linear-gradient(135deg, ${s.neonPink}, ${s.neonBlue})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1, margin: 0 }}>
            LED NEON ACRYL RECHNER
          </h1>
          <p style={{ color: s.muted, marginTop: 8, fontSize: 14, letterSpacing: 1, textTransform: 'uppercase' }}>Preiskalkulation für individuelle Schilder</p>
        </div>

        {/* Inner Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: s.surface, padding: 5, borderRadius: s.radius, border: `1px solid ${s.border}`, width: 'fit-content' }}>
          {[{ key: 'calc', label: '⚡ Kalkulation' }, { key: 'prices', label: '💰 Preisliste' }].map(({ key, label }) => (
            <button key={key} onClick={() => setInnerTab(key)}
              style={{ padding: '9px 24px', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, transition: 'all 0.2s', letterSpacing: '0.3px', background: innerTab === key ? `linear-gradient(135deg, ${s.neonPink}, #c4006a)` : 'transparent', color: innerTab === key ? '#fff' : s.muted, boxShadow: innerTab === key ? `0 0 20px rgba(255,45,120,0.35)` : 'none' }}>
              {label}
            </button>
          ))}
        </div>

        {/* KALKULATION */}
        {innerTab === 'calc' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>

            {/* Schild Größe */}
            <div style={cardStyle}>
              <div style={cardTitle()}><span style={dot()}></span> Schild Größe</div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Maße (Länge × Breite)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[{ v: laenge, set: setLaenge, ph: '100' }, { v: breite, set: setBreite, ph: '50' }].map(({ v, set, ph }, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <input type="number" placeholder={ph} min="0" value={v} onChange={e => set(e.target.value)} style={{ ...inputStyle, paddingRight: 42 }} />
                      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: s.muted, pointerEvents: 'none' }}>cm</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Anzahl Schilder</label>
                <input type="number" min="1" value={anzahl} onChange={e => setAnzahl(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Länge der LED-Elemente gesamt</label>
                <div style={{ position: 'relative' }}>
                  <input type="number" placeholder="2.5" min="0" step="0.1" value={ledLaenge} onChange={e => setLedLaenge(e.target.value)} style={{ ...inputStyle, paddingRight: 42 }} />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: s.muted, pointerEvents: 'none' }}>m</span>
                </div>
              </div>
            </div>

            {/* Komponenten */}
            <div style={cardStyle}>
              <div style={cardTitle()}><span style={dot()}></span> Komponenten</div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Geschätzte Arbeitsstunden</label>
                <div style={{ position: 'relative' }}>
                  <input type="number" placeholder="3" min="0" step="0.5" value={arbeitsstunden} onChange={e => setArbeitsstunden(e.target.value)} style={{ ...inputStyle, paddingRight: 42 }} />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: s.muted, pointerEvents: 'none' }}>h</span>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Trafos &amp; Dimmer (gleiche Anzahl)</label>
                <input type="number" value={autoAnz} readOnly style={{ ...inputStyle, opacity: 0.6 }} />
                {led > 0 && (
                  <div style={{ fontSize: 12, marginTop: 5, color: autoAnz > 1 ? s.neonYellow : s.neonGreen }}>
                    ⚡ {autoAnz} Trafo{autoAnz > 1 ? 's' : ''} + {autoAnz} Dimmer für {led} m
                  </div>
                )}
              </div>
            </div>

            {/* Abstandshalter */}
            <div style={cardStyle}>
              <div style={cardTitle()}><span style={dot()}></span> Abstandshalter</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, background: s.surface2, border: `1px solid ${s.border}`, borderRadius: 8, padding: '12px 14px', cursor: 'pointer', marginBottom: 10 }}>
                <input type="checkbox" checked={abstandCb} onChange={e => setAbstandCb(e.target.checked)} style={{ width: 18, height: 18, accentColor: s.neonPink, cursor: 'pointer', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: s.text }}>Abstandshalter benötigt</div>
                  <div style={{ fontSize: 12, color: s.muted, marginTop: 2 }}>Alle 30 cm entlang des Schildumfangs</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: s.neonYellow, whiteSpace: 'nowrap' }}>{abstandCb ? abstandAnz + ' Stk.' : '–'}</span>
              </label>
              {abstandCb && (
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Abstands-Intervall</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'end' }}>
                    <div style={{ position: 'relative' }}>
                      <input type="number" value={abstandInterval} min="10" max="50" onChange={e => setAbstandInterval(e.target.value)} style={{ ...inputStyle, paddingRight: 42 }} />
                      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: s.muted, pointerEvents: 'none' }}>cm</span>
                    </div>
                    <span style={{ color: s.muted, fontSize: 13, paddingBottom: 2 }}>Umfang: {umfang > 0 ? umfang.toFixed(0) + (anz > 1 ? ' × ' + anz : '') : '–'} cm</span>
                  </div>
                </div>
              )}
            </div>

            {/* Extras */}
            <div style={cardStyle}>
              <div style={cardTitle()}><span style={dot()}></span> Extras / Sonstiges</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                {extras.map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: s.surface2, border: `1px solid ${s.border}`, borderRadius: 8, padding: '10px 12px' }}>
                    <input type="text" placeholder="Bezeichnung…" value={e.name} onChange={ev => updateExtra(i, 'name', ev.target.value)}
                      style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: `1px solid ${s.border}`, borderRadius: 0, padding: '4px 6px', fontSize: 14, color: s.text, outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
                    <input type="number" placeholder="0.00" step="0.01" min="0" value={e.preis || ''} onChange={ev => updateExtra(i, 'preis', parseFloat(ev.target.value) || 0)}
                      style={{ width: 100, background: 'transparent', border: 'none', borderBottom: `1px solid ${s.border}`, borderRadius: 0, padding: '4px 6px', fontSize: 14, textAlign: 'right', color: s.text, outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
                    <span style={{ color: s.muted, fontSize: 13 }}>€</span>
                    <button onClick={() => removeExtra(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.muted, fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
                  </div>
                ))}
              </div>
              <button onClick={addExtra} style={{ background: s.surface2, border: `1px dashed ${s.border}`, borderRadius: 8, padding: 10, color: s.muted, fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer', width: '100%', textAlign: 'center' }}>
                + Position hinzufügen
              </button>
            </div>

            {/* Gewinnmarge */}
            <div style={{ gridColumn: '1 / -1', background: s.surface, border: `1px solid rgba(0,255,170,0.25)`, borderRadius: s.radius, padding: 22 }}>
              <div style={cardTitle(s.neonGreen)}><span style={dot(s.neonGreen)}></span> Gewinnmarge</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, alignItems: 'end' }}>
                <div>
                  <label style={labelStyle}>Marge in %</label>
                  <div style={{ position: 'relative' }}>
                    <input type="number" value={margePct} min="0" max="500" step="1" onChange={e => setMargePct(e.target.value)} style={{ ...inputStyle, paddingRight: 42 }} />
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: s.muted, pointerEvents: 'none' }}>%</span>
                  </div>
                </div>
                <div style={{ background: 'rgba(0,255,170,0.07)', border: '1px solid rgba(0,255,170,0.2)', borderRadius: 10, padding: '16px 20px' }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: s.neonGreen, opacity: 0.7, marginBottom: 4 }}>Gewinn (netto)</div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, letterSpacing: 1, color: s.neonGreen }}>{fmt(gewinn)}</div>
                </div>
                <div style={{ background: 'rgba(0,255,170,0.07)', border: '1px solid rgba(0,255,170,0.2)', borderRadius: 10, padding: '16px 20px' }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: s.neonGreen, opacity: 0.7, marginBottom: 4 }}>Verkaufspreis (netto)</div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, letterSpacing: 1, color: s.neonGreen }}>{fmt(vkPreis)}</div>
                </div>
              </div>
            </div>

            {/* Ergebnis */}
            <div style={{ gridColumn: '1 / -1', background: `linear-gradient(135deg, rgba(255,45,120,0.08), rgba(0,212,255,0.05))`, border: `1px solid rgba(255,45,120,0.3)`, borderRadius: s.radius, padding: 28 }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 2, color: s.neonPink, marginBottom: 20 }}>⚡ Kostenübersicht</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
                {positions.filter(p => p.show).map((p, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${s.border}`, borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: s.muted, marginBottom: 6 }}>{p.label}{p.sub ? ' · ' + p.sub : ''}</div>
                    <div style={{ fontSize: 17, fontWeight: 600, color: s.text }}>{fmt(p.val)}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                <div style={{ background: `linear-gradient(135deg, ${s.neonPink}, #c4006a)`, boxShadow: `0 0 36px rgba(255,45,120,0.35)`, borderRadius: 12, padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 2, color: 'rgba(255,255,255,0.75)', marginBottom: 4 }}>Materialkosten</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Selbstkosten · netto</div>
                  </div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, letterSpacing: 2, color: '#fff', textShadow: '0 0 24px rgba(255,255,255,0.3)', lineHeight: 1 }}>{fmt(total)}</div>
                </div>
                <div style={{ background: 'rgba(0,255,170,0.07)', border: '1px solid rgba(0,255,170,0.25)', borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: s.neonGreen, opacity: 0.7 }}>Verkaufspreis</div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: '1.5px', color: s.neonGreen }}>{fmt(vkPreis)}</div>
                  <div style={{ fontSize: 11, color: 'rgba(0,255,170,0.4)' }}>inkl. {marge}% Marge · netto</div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* PREISLISTE */}
        {innerTab === 'prices' && (
          <div style={{ ...cardStyle, maxWidth: 750, position: 'relative' }}>
            <div style={cardTitle()}><span style={dot()}></span> Materialpreise &amp; Stundensätze</div>
            <p style={{ fontSize: 12, color: s.muted, marginBottom: 18 }}>
              Preise werden in der Datenbank gespeichert und sind für alle Nutzer sichtbar.
              {pricesLoading && <span style={{ color: s.neonYellow, marginLeft: 8 }}>Lade…</span>}
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: s.muted, padding: '8px 12px', borderBottom: `1px solid ${s.border}` }}>Position</th>
                  <th style={{ textAlign: 'right', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: s.muted, padding: '8px 12px', borderBottom: `1px solid ${s.border}` }}>Preis</th>
                  <th style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: s.muted, padding: '8px 12px', borderBottom: `1px solid ${s.border}` }}>Einheit</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const rows = [];
                  let lastCat = '';
                  PRICE_DEFS.forEach(d => {
                    if (d.cat !== lastCat) {
                      rows.push(
                        <tr key={'cat-' + d.cat}>
                          <td colSpan={3} style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 1, color: s.neonBlue, padding: '18px 12px 8px', borderBottom: `1px solid ${s.border}` }}>{d.cat}</td>
                        </tr>
                      );
                      lastCat = d.cat;
                    }
                    rows.push(
                      <tr key={d.key}>
                        <td style={{ padding: '8px 12px', borderBottom: `1px solid rgba(255,255,255,0.04)`, verticalAlign: 'middle' }}>
                          <div>{d.label}</div>
                          <div style={{ color: s.muted, fontSize: 12, marginTop: 2 }}>{d.desc}</div>
                        </td>
                        <td style={{ padding: '8px 12px', borderBottom: `1px solid rgba(255,255,255,0.04)`, textAlign: 'right' }}>
                          <input type="number" step="0.01" min="0"
                            key={pricesLoading ? 'loading' : 'loaded'}
                            defaultValue={prices[d.key].toFixed(2)}
                            onChange={e => updatePrice(d.key, e.target.value)}
                            style={{ width: 110, background: s.surface2, border: `1px solid ${s.border}`, borderRadius: 6, padding: '7px 10px', color: s.text, fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: 'none', textAlign: 'right' }} />
                        </td>
                        <td style={{ padding: '8px 12px', borderBottom: `1px solid rgba(255,255,255,0.04)`, color: s.muted, fontSize: 13 }}>{d.unit}</td>
                      </tr>
                    );
                  });
                  return rows;
                })()}
              </tbody>
            </table>
            {saveNotice && <div style={{ fontSize: 12, color: s.neonYellow, marginTop: 10 }}>✓ In Datenbank gespeichert</div>}
          </div>
        )}

      </div>
    </div>
  );
}
