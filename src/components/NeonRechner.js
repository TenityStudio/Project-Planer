import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchNeonPreise, upsertNeonPreis } from '../lib/supabase';

const PLATE_SIZES = [
  { key: 'p2000x1000', label: '2000×1000', w: 2000, h: 1000, m2: 2.0 },
  { key: 'p2000x1500', label: '2000×1500', w: 2000, h: 1500, m2: 3.0 },
  { key: 'p2000x2000', label: '2000×2000', w: 2000, h: 2000, m2: 4.0 },
  { key: 'p3000x1000', label: '3000×1000', w: 3000, h: 1000, m2: 3.0 },
  { key: 'p3000x2000', label: '3000×2000', w: 3000, h: 2000, m2: 6.0 },
];

const PRICE_DEFS = [
  { key: 'acryl_6mm',   cat: 'Acryl (pro m²)',   label: 'Acryl 6mm',          desc: 'Preis pro m²',            defaultVal: 22.00, unit: '€/m²' },
  { key: 'acryl_8mm',   cat: 'Acryl (pro m²)',   label: 'Acryl 8mm',          desc: 'Preis pro m²',            defaultVal: 28.00, unit: '€/m²' },
  { key: 'acryl_10mm',  cat: 'Acryl (pro m²)',   label: 'Acryl 10mm',         desc: 'Preis pro m²',            defaultVal: 36.00, unit: '€/m²' },
  { key: 'p2000x1000',  cat: 'Acrylplatten',     label: '2000×1000mm',        desc: 'Preis pro Platte',        defaultVal: 45.00, unit: '€/Stk.' },
  { key: 'p2000x1500',  cat: 'Acrylplatten',     label: '2000×1500mm',        desc: 'Preis pro Platte',        defaultVal: 65.00, unit: '€/Stk.' },
  { key: 'p2000x2000',  cat: 'Acrylplatten',     label: '2000×2000mm',        desc: 'Preis pro Platte',        defaultVal: 85.00, unit: '€/Stk.' },
  { key: 'p3000x1000',  cat: 'Acrylplatten',     label: '3000×1000mm',        desc: 'Preis pro Platte',        defaultVal: 68.00, unit: '€/Stk.' },
  { key: 'p3000x2000',  cat: 'Acrylplatten',     label: '3000×2000mm',        desc: 'Preis pro Platte',        defaultVal: 130.00, unit: '€/Stk.' },
  { key: 'led_m',       cat: 'Komponenten',      label: 'LED-Neon-Schlauch',  desc: 'Preis pro Laufmeter',     defaultVal: 8.50,  unit: '€/m' },
  { key: 'trafo',       cat: 'Komponenten',      label: 'Trafo',              desc: 'Stückpreis',              defaultVal: 22.00, unit: '€/Stk.' },
  { key: 'dimmer',      cat: 'Komponenten',      label: 'Dimmer',             desc: 'Stückpreis',              defaultVal: 18.00, unit: '€/Stk.' },
  { key: 'abstand',     cat: 'Komponenten',      label: 'Abstandshalter',     desc: 'Stückpreis',              defaultVal: 0.80,  unit: '€/Stk.' },
  { key: 'stundensatz', cat: 'Arbeit',           label: 'Stundensatz',        desc: 'Netto pro Arbeitsstunde', defaultVal: 55.00, unit: '€/h' },
];

function defaultPrices() {
  const d = {};
  PRICE_DEFS.forEach(p => { d[p.key] = p.defaultVal; });
  return d;
}

function fmt(n) { return n.toFixed(2).replace('.', ',') + ' €'; }

function calcPlattenErgebnis(signW, signH, anzahl, prices) {
  if (signW <= 0 || signH <= 0 || anzahl <= 0) return [];
  return PLATE_SIZES.map(plate => {
    const o1 = Math.floor(plate.w / signW) * Math.floor(plate.h / signH);
    const o2 = Math.floor(plate.w / signH) * Math.floor(plate.h / signW);
    const fitsPerPlate = Math.max(o1, o2);
    if (fitsPerPlate === 0) return { ...plate, fitsPerPlate: 0, needed: null, verschnitt: null, cost: null };
    const needed = Math.ceil(anzahl / fitsPerPlate);
    const usedArea  = (signW / 1000) * (signH / 1000) * anzahl;
    const totalArea = needed * plate.m2;
    const verschnitt = Math.round((1 - usedArea / totalArea) * 100);
    const cost = needed * (prices[plate.key] || 0);
    return { ...plate, fitsPerPlate, needed, verschnitt, cost };
  });
}

export function NeonRechner() {
  const [innerTab, setInnerTab] = useState('calc');
  const [prices, setPrices] = useState(defaultPrices);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [extras, setExtras] = useState([]);
  const [saveNotice, setSaveNotice] = useState(false);
  const saveTimers = useRef({});

  // Form state (dimensions in mm)
  const [laenge, setLaenge]               = useState('');
  const [breite, setBreite]               = useState('');
  const [anzahl, setAnzahl]               = useState('1');
  const [ledLaenge, setLedLaenge]         = useState('');
  const [arbeitsstunden, setArbeitsstunden] = useState('');
  const [abstandCb, setAbstandCb]         = useState(false);
  const [abstandInterval, setAbstandInterval] = useState('300'); // mm
  const [margePct, setMargePct]           = useState('30');
  const [dicke, setDicke]                 = useState(null); // null = auto
  const [trafoInput, setTrafoInput]       = useState('');   // '' = auto

  useEffect(() => {
    fetchNeonPreise()
      .then(saved  => setPrices(prev => ({ ...prev, ...saved })))
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

  // Computed
  const L        = parseFloat(laenge) || 0;       // mm
  const B        = parseFloat(breite) || 0;       // mm
  const anz      = parseInt(anzahl) || 1;
  const led      = parseFloat(ledLaenge) || 0;    // m
  const stunden  = parseFloat(arbeitsstunden) || 0;
  const interval = parseFloat(abstandInterval) || 300; // mm
  const marge    = parseFloat(margePct) || 0;

  const m2         = (L / 1000) * (B / 1000);
  const autoDicke  = m2 > 0 && m2 < 1 ? 6 : 8;
  const aktiveDicke = dicke ?? autoDicke;
  const acrylKey   = aktiveDicke === 6 ? 'acryl_6mm' : aktiveDicke === 8 ? 'acryl_8mm' : 'acryl_10mm';

  const autoAnz  = led > 0 ? Math.max(1, Math.ceil(led / 10)) : 1;
  const tdAnz    = trafoInput !== '' ? (parseInt(trafoInput) || 1) : autoAnz;

  const umfang     = 2 * L + 2 * B; // mm
  const abstandAnz = abstandCb && umfang > 0 ? (Math.ceil(umfang / interval) + 1) * anz : 0;

  const acrylPreis   = m2 * anz * prices[acrylKey];
  const ledPreis     = led * anz * prices['led_m'];
  const trafoPreis   = tdAnz * anz * prices['trafo'];
  const dimmerPreis  = tdAnz * anz * prices['dimmer'];
  const abstandPreis = abstandAnz * prices['abstand'];
  const arbeitPreis  = stunden * anz * prices['stundensatz'];

  const positions = [
    { label: `Acryl ${aktiveDicke}mm`,    sub: m2.toFixed(4) + ' m² × ' + anz,                                    val: acrylPreis,   show: m2 > 0 },
    { label: 'LED-Neon-Schlauch',         sub: led + ' m × ' + anz,                                                val: ledPreis,     show: led > 0 },
    { label: 'Trafo(s)',                  sub: tdAnz + ' × ' + anz + ' Stk.',                                      val: trafoPreis,   show: tdAnz > 0 },
    { label: 'Dimmer',                    sub: tdAnz + ' × ' + anz + ' Stk.',                                      val: dimmerPreis,  show: tdAnz > 0 },
    { label: 'Abstandshalter',            sub: abstandAnz + ' Stk.',                                               val: abstandPreis, show: abstandCb && abstandAnz > 0 },
    { label: 'Arbeitszeit',               sub: stunden + ' h × ' + anz + ' × ' + prices['stundensatz'].toFixed(0) + '€', val: arbeitPreis, show: stunden > 0 },
    ...extras.filter(e => e.preis > 0).map(e => ({ label: e.name || 'Extra', sub: '', val: e.preis, show: true })),
  ];

  const total   = positions.filter(p => p.show).reduce((s, p) => s + p.val, 0);
  const gewinn  = total * (marge / 100);
  const vkPreis = total + gewinn;

  // Plate calculator
  const plattenResult = calcPlattenErgebnis(L, B, anz, prices);
  const fitPlatten    = plattenResult.filter(p => p.needed !== null);
  const bestPlatte    = fitPlatten.length > 0
    ? fitPlatten.reduce((best, p) =>
        p.needed < best.needed || (p.needed === best.needed && p.verschnitt < best.verschnitt) ? p : best
      )
    : null;

  // Styles
  const s = {
    bg: '#0f1117', surface: '#1a1a28', surface2: '#141420', border: '#2a2a40',
    neonPink: '#ff2d78', neonBlue: '#00d4ff', neonYellow: '#ffe100', neonGreen: '#00ffaa',
    text: '#e8e8f0', muted: '#888899', radius: 12,
  };

  const cardStyle  = { background: s.surface, border: `1px solid ${s.border}`, borderRadius: s.radius, padding: 22 };
  const inputStyle = { width: '100%', background: s.surface2, border: `1px solid ${s.border}`, borderRadius: 8, padding: '10px 14px', color: s.text, fontFamily: "'DM Sans', sans-serif", fontSize: 15, outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: s.muted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 };
  const cTitle     = (color = s.neonBlue) => ({ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: '1.5px', color, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 });
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
              style={{ padding: '9px 24px', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, transition: 'all 0.2s', background: innerTab === key ? `linear-gradient(135deg, ${s.neonPink}, #c4006a)` : 'transparent', color: innerTab === key ? '#fff' : s.muted, boxShadow: innerTab === key ? `0 0 20px rgba(255,45,120,0.35)` : 'none' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── KALKULATION ── */}
        {innerTab === 'calc' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>

            {/* Schild Größe */}
            <div style={cardStyle}>
              <div style={cTitle()}><span style={dot()}></span> Schild Größe</div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Maße (Länge × Breite)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[{ v: laenge, set: setLaenge, ph: '1000' }, { v: breite, set: setBreite, ph: '500' }].map(({ v, set, ph }, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <input type="number" placeholder={ph} min="0" value={v} onChange={e => set(e.target.value)} style={{ ...inputStyle, paddingRight: 46 }} />
                      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: s.muted, pointerEvents: 'none' }}>mm</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Dicke</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {[6, 8, 10].map(d => (
                    <button key={d} onClick={() => setDicke(dicke === d ? null : d)}
                      style={{ padding: '7px 16px', border: `1.5px solid ${aktiveDicke === d ? s.neonPink : s.border}`, borderRadius: 8, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, background: aktiveDicke === d ? `rgba(255,45,120,0.15)` : s.surface2, color: aktiveDicke === d ? s.neonPink : s.muted, transition: 'all .15s' }}>
                      {d}mm
                    </button>
                  ))}
                  {dicke === null && m2 > 0 && (
                    <span style={{ fontSize: 11, color: s.neonGreen }}>Auto: {autoDicke}mm {m2 < 1 ? '(&lt;1m²)' : '(≥1m²)'}</span>
                  )}
                  {dicke !== null && (
                    <button onClick={() => setDicke(null)} style={{ fontSize: 11, color: s.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>↩ Auto</button>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Anzahl Schilder</label>
                <input type="number" min="1" value={anzahl} onChange={e => setAnzahl(e.target.value)} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Länge LED-Elemente gesamt</label>
                <div style={{ position: 'relative' }}>
                  <input type="number" placeholder="2.5" min="0" step="0.1" value={ledLaenge} onChange={e => setLedLaenge(e.target.value)} style={{ ...inputStyle, paddingRight: 42 }} />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: s.muted, pointerEvents: 'none' }}>m</span>
                </div>
              </div>
            </div>

            {/* Komponenten */}
            <div style={cardStyle}>
              <div style={cTitle()}><span style={dot()}></span> Komponenten</div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Geschätzte Arbeitsstunden</label>
                <div style={{ position: 'relative' }}>
                  <input type="number" placeholder="3" min="0" step="0.5" value={arbeitsstunden} onChange={e => setArbeitsstunden(e.target.value)} style={{ ...inputStyle, paddingRight: 42 }} />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: s.muted, pointerEvents: 'none' }}>h</span>
                </div>
              </div>

              <div style={{ marginBottom: 6 }}>
                <label style={labelStyle}>Trafos &amp; Dimmer (gleiche Anzahl)</label>
                <input type="number" min="1" placeholder={String(autoAnz)}
                  value={trafoInput}
                  onChange={e => setTrafoInput(e.target.value)}
                  style={inputStyle} />
                {led > 0 && (
                  <div style={{ fontSize: 12, marginTop: 5, color: trafoInput !== '' ? s.neonYellow : s.neonGreen }}>
                    {trafoInput !== ''
                      ? `Manuell: ${tdAnz} Trafo${tdAnz > 1 ? 's' : ''} + ${tdAnz} Dimmer`
                      : `Auto: ${autoAnz} Trafo${autoAnz > 1 ? 's' : ''} + ${autoAnz} Dimmer für ${led} m`
                    }
                    {trafoInput !== '' && (
                      <button onClick={() => setTrafoInput('')} style={{ marginLeft: 8, fontSize: 11, color: s.muted, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>↩ Auto</button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Abstandshalter */}
            <div style={cardStyle}>
              <div style={cTitle()}><span style={dot()}></span> Abstandshalter</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, background: s.surface2, border: `1px solid ${s.border}`, borderRadius: 8, padding: '12px 14px', cursor: 'pointer', marginBottom: 10 }}>
                <input type="checkbox" checked={abstandCb} onChange={e => setAbstandCb(e.target.checked)} style={{ width: 18, height: 18, accentColor: s.neonPink, cursor: 'pointer', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: s.text }}>Abstandshalter benötigt</div>
                  <div style={{ fontSize: 12, color: s.muted, marginTop: 2 }}>Entlang des Schildumfangs</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: s.neonYellow, whiteSpace: 'nowrap' }}>{abstandCb ? abstandAnz + ' Stk.' : '–'}</span>
              </label>
              {abstandCb && (
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Abstands-Intervall</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'end' }}>
                    <div style={{ position: 'relative' }}>
                      <input type="number" value={abstandInterval} min="100" max="1000" step="10" onChange={e => setAbstandInterval(e.target.value)} style={{ ...inputStyle, paddingRight: 46 }} />
                      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: s.muted, pointerEvents: 'none' }}>mm</span>
                    </div>
                    <span style={{ color: s.muted, fontSize: 13, paddingBottom: 2 }}>Umfang: {umfang > 0 ? umfang.toFixed(0) + (anz > 1 ? ' × ' + anz : '') : '–'} mm</span>
                  </div>
                </div>
              )}
            </div>

            {/* Extras */}
            <div style={cardStyle}>
              <div style={cTitle()}><span style={dot()}></span> Extras / Sonstiges</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                {extras.map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: s.surface2, border: `1px solid ${s.border}`, borderRadius: 8, padding: '10px 12px' }}>
                    <input type="text" placeholder="Bezeichnung…" value={e.name} onChange={ev => updateExtra(i, 'name', ev.target.value)}
                      style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: `1px solid ${s.border}`, borderRadius: 0, padding: '4px 6px', fontSize: 14, color: s.text, outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
                    <input type="number" placeholder="0.00" step="0.01" min="0" value={e.preis || ''} onChange={ev => updateExtra(i, 'preis', parseFloat(ev.target.value) || 0)}
                      style={{ width: 90, background: 'transparent', border: 'none', borderBottom: `1px solid ${s.border}`, borderRadius: 0, padding: '4px 6px', fontSize: 14, textAlign: 'right', color: s.text, outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
                    <span style={{ color: s.muted, fontSize: 13 }}>€</span>
                    <button onClick={() => removeExtra(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.muted, fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
                  </div>
                ))}
              </div>
              <button onClick={addExtra} style={{ background: s.surface2, border: `1px dashed ${s.border}`, borderRadius: 8, padding: 10, color: s.muted, fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer', width: '100%', textAlign: 'center' }}>
                + Position hinzufügen
              </button>
            </div>

            {/* Ganze Platte – full width */}
            <div style={{ gridColumn: '1 / -1', ...cardStyle, border: `1px solid rgba(0,212,255,0.25)` }}>
              <div style={cTitle(s.neonBlue)}><span style={dot(s.neonBlue)}></span> Ganze Platte</div>
              {L <= 0 || B <= 0 ? (
                <p style={{ color: s.muted, fontSize: 13 }}>Schildmaße eingeben um die optimale Plattenaufteilung zu berechnen.</p>
              ) : (
                <>
                  <p style={{ fontSize: 12, color: s.muted, marginBottom: 16 }}>
                    Schild {L}×{B} mm · {anz} Stück — Welches Plattenformat ist am effizientesten?
                  </p>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                      <thead>
                        <tr>
                          {['Format (mm)', 'Stücke / Platte', 'Platten benötigt', 'Verschnitt', 'Kosten (geschätzt)'].map(h => (
                            <th key={h} style={{ textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.7px', color: s.muted, padding: '8px 14px', borderBottom: `1px solid ${s.border}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {plattenResult.map(p => {
                          const isBest = bestPlatte && p.key === bestPlatte.key;
                          const noFit  = p.needed === null;
                          return (
                            <tr key={p.key} style={{ background: isBest ? 'rgba(0,255,170,0.06)' : 'transparent', border: isBest ? `1px solid rgba(0,255,170,0.3)` : 'none' }}>
                              <td style={{ padding: '10px 14px', borderBottom: `1px solid ${s.border}22`, fontWeight: isBest ? 700 : 400, color: isBest ? s.neonGreen : s.text }}>
                                {p.label}
                                {isBest && <span style={{ marginLeft: 8, fontSize: 10, background: 'rgba(0,255,170,0.15)', color: s.neonGreen, padding: '2px 7px', borderRadius: 20, border: `1px solid rgba(0,255,170,0.3)` }}>Empfohlen</span>}
                              </td>
                              <td style={{ padding: '10px 14px', borderBottom: `1px solid ${s.border}22`, color: noFit ? s.muted : s.text }}>{noFit ? '—' : p.fitsPerPlate}</td>
                              <td style={{ padding: '10px 14px', borderBottom: `1px solid ${s.border}22`, fontWeight: isBest ? 700 : 400, color: isBest ? s.neonGreen : s.text }}>{noFit ? <span style={{ color: '#E05548', fontSize: 12 }}>Passt nicht</span> : p.needed}</td>
                              <td style={{ padding: '10px 14px', borderBottom: `1px solid ${s.border}22`, color: noFit ? s.muted : p.verschnitt > 40 ? s.neonYellow : s.text }}>{noFit ? '—' : p.verschnitt + ' %'}</td>
                              <td style={{ padding: '10px 14px', borderBottom: `1px solid ${s.border}22`, color: noFit || !prices[p.key] ? s.muted : s.text }}>{noFit ? '—' : prices[p.key] ? fmt(p.cost) : <span style={{ fontSize: 12 }}>kein Preis</span>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {plattenResult.every(p => p.needed === null) && (
                    <p style={{ color: '#E05548', fontSize: 13, marginTop: 12 }}>⚠ Schild passt auf keine der Standardplatten. Maße prüfen.</p>
                  )}
                </>
              )}
            </div>

            {/* Gewinnmarge – full width */}
            <div style={{ gridColumn: '1 / -1', background: s.surface, border: `1px solid rgba(0,255,170,0.25)`, borderRadius: s.radius, padding: 22 }}>
              <div style={cTitle(s.neonGreen)}><span style={dot(s.neonGreen)}></span> Gewinnmarge</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, alignItems: 'end' }}>
                <div>
                  <label style={labelStyle}>Marge in %</label>
                  <div style={{ position: 'relative' }}>
                    <input type="number" value={margePct} min="0" max="500" step="1" onChange={e => setMargePct(e.target.value)} style={{ ...inputStyle, paddingRight: 42 }} />
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: s.muted, pointerEvents: 'none' }}>%</span>
                  </div>
                </div>
                {[{ label: 'Gewinn (netto)', val: gewinn }, { label: 'Verkaufspreis (netto)', val: vkPreis }].map(({ label, val }) => (
                  <div key={label} style={{ background: 'rgba(0,255,170,0.07)', border: '1px solid rgba(0,255,170,0.2)', borderRadius: 10, padding: '16px 20px' }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: s.neonGreen, opacity: 0.7, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, letterSpacing: 1, color: s.neonGreen }}>{fmt(val)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Kostenübersicht – full width */}
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
                <div style={{ background: `linear-gradient(135deg, ${s.neonPink}, #c4006a)`, boxShadow: `0 0 36px rgba(255,45,120,0.35)`, borderRadius: 12, padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
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

        {/* ── PREISLISTE ── */}
        {innerTab === 'prices' && (
          <div style={{ ...cardStyle, maxWidth: 800 }}>
            <div style={cTitle()}><span style={dot()}></span> Materialpreise &amp; Stundensätze</div>
            <p style={{ fontSize: 12, color: s.muted, marginBottom: 18 }}>
              Preise werden in der Datenbank gespeichert und sind für alle Nutzer sichtbar.
              {pricesLoading && <span style={{ color: s.neonYellow, marginLeft: 8 }}>Lade…</span>}
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  {['Position', 'Preis', 'Einheit'].map((h, i) => (
                    <th key={h} style={{ textAlign: i === 1 ? 'right' : 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: s.muted, padding: '8px 12px', borderBottom: `1px solid ${s.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const rows = [];
                  let lastCat = '';
                  PRICE_DEFS.forEach(d => {
                    if (d.cat !== lastCat) {
                      rows.push(
                        <tr key={'cat-' + d.cat}><td colSpan={3} style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 1, color: s.neonBlue, padding: '18px 12px 8px', borderBottom: `1px solid ${s.border}` }}>{d.cat}</td></tr>
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
                            key={pricesLoading ? 'loading' : d.key}
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
