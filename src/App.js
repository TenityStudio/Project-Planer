import { useState } from 'react';
import { useData } from './hooks/useData';
import { COLORS } from './lib/utils';
import { Btn, Inp } from './components/UI';
import { ProjectCard } from './components/ProjectCard';
import { ProjectDetail } from './components/ProjectDetail';
import { CatalogView } from './components/CatalogView';
import { ShoppingList } from './components/ShoppingList';
import { ArchiveView } from './components/ArchiveView';

const STORAGE_KEY = 'pp_auth';
const CORRECT_PW = process.env.REACT_APP_PASSWORD;

function PasswordGate({ onUnlock }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (pw === CORRECT_PW) {
      localStorage.setItem(STORAGE_KEY, CORRECT_PW);
      onUnlock();
    } else {
      setError(true);
      setPw('');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: "'DM Sans', sans-serif", background: COLORS.bg, padding: 24 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 360, width: '100%', background: COLORS.card, borderRadius: 20, padding: 36, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <h1 style={{ margin: '0 0 4px', fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 800, color: COLORS.accent }}>Projekt Planer</h1>
        <p style={{ margin: '0 0 28px', fontSize: 13, color: COLORS.textMuted }}>Bitte Passwort eingeben</p>
        <Inp
          value={pw}
          onChange={v => { setPw(v); setError(false); }}
          placeholder="Passwort…"
          type="password"
          style={{ width: '100%', marginBottom: 10 }}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
        />
        {error && <p style={{ fontSize: 12, color: COLORS.danger, margin: '0 0 10px' }}>Falsches Passwort</p>}
        <Btn onClick={handleSubmit} style={{ width: '100%' }}>Einloggen</Btn>
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(() => localStorage.getItem(STORAGE_KEY) === CORRECT_PW);

  if (!authed) return <PasswordGate onUnlock={() => setAuthed(true)} />;

  const {
    projects, catalog, loading, error,
    addProject, saveProject, removeProject, archive, restore, duplicate,
    addCatalogItem, saveCatalogItem, removeCatalogItem,
  } = useData();

  const [view, setView] = useState('list');
  const [activeId, setActiveId] = useState(null);
  const [newName, setNewName] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: "'DM Sans', sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ color: COLORS.danger, marginBottom: 8 }}>Verbindungsfehler</h2>
        <p style={{ color: COLORS.textMuted, marginBottom: 16 }}>{error}</p>
        <p style={{ fontSize: 13, color: COLORS.textMuted }}>Erstelle eine <code>.env.local</code> Datei mit deinen Supabase-Zugangsdaten.<br />Siehe README.md für Anleitung.</p>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: "'DM Sans', sans-serif", color: COLORS.textMuted }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⏳</div>
        Verbinde mit Datenbank…
      </div>
    </div>
  );

  const handleAddProject = async () => {
    if (!newName.trim()) return;
    const p = await addProject(newName.trim());
    setNewName(''); setShowAdd(false);
    setActiveId(p.id); setView('detail');
  };

  const handleDeleteProject = async (id) => {
    await removeProject(id);
    setView('list'); setActiveId(null);
  };

  const active = projects.filter(p => !p.archived);
  const current = active.find(p => p.id === activeId);
  const archiveCount = projects.filter(p => p.archived).length;

  const sorted = [...active].sort((a, b) => {
    if (a.priority && !b.priority) return -1;
    if (!a.priority && b.priority) return 1;
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return a.name.localeCompare(b.name, 'de');
  });

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: COLORS.bg, minHeight: '100vh', paddingBottom: 60 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: COLORS.accent, padding: '28px 24px 24px', color: '#fff' }}>
        <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, letterSpacing: -.5 }}>
          Projekt Planer
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 12, opacity: .75 }}>
          Materialien · Datenbank · Bestellliste
          <span style={{ marginLeft: 12, opacity: .6, fontSize: 11 }}>● Live-Sync aktiv</span>
        </p>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '22px 18px' }}>

        {/* LIST */}
        {view === 'list' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 600 }}>
                {active.length} Projekt{active.length !== 1 ? 'e' : ''}
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Btn onClick={() => setView('archive')} variant="ghost" size="sm">📦 Archiv {archiveCount > 0 && `(${archiveCount})`}</Btn>
                <Btn onClick={() => setView('catalog')} variant="ghost" size="sm">🗄 Datenbank</Btn>
                {active.length > 0 && <Btn onClick={() => setView('shopping')} variant="secondary" size="sm">🛒 Bestellliste</Btn>}
                <Btn onClick={() => setShowAdd(true)} size="sm">+ Neues Projekt</Btn>
              </div>
            </div>

            {showAdd && (
              <div style={{ background: COLORS.highlight, border: `1.5px solid ${COLORS.highlightBorder}`, borderRadius: 14, padding: 18, marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                <Inp value={newName} onChange={setNewName} placeholder="Projektname…" style={{ flex: 1 }}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddProject(); }} />
                <Btn onClick={handleAddProject} size="sm">✓</Btn>
                <Btn onClick={() => { setShowAdd(false); setNewName(''); }} variant="ghost" size="sm">✕</Btn>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sorted.map(p => (
                <ProjectCard key={p.id} project={p}
                  onOpen={() => { setActiveId(p.id); setView('detail'); }}
                  onDuplicate={() => duplicate(p)}
                  onArchive={() => archive(p.id)} />
              ))}
            </div>

            {active.length === 0 && !showAdd && (
              <div style={{ textAlign: 'center', padding: '56px 20px', color: COLORS.textMuted }}>
                <div style={{ fontSize: 44, marginBottom: 14, opacity: .3 }}>📦</div>
                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Noch keine Projekte</p>
                <p style={{ fontSize: 13 }}>Erstelle dein erstes Projekt.</p>
              </div>
            )}
          </>
        )}

        {/* DETAIL */}
        {view === 'detail' && current && (
          <ProjectDetail
            project={current}
            catalog={catalog}
            onSave={saveProject}
            onDelete={() => handleDeleteProject(current.id)}
            onBack={() => setView('list')} />
        )}

        {/* SHOPPING */}
        {view === 'shopping' && (
          <ShoppingList projects={active} catalog={catalog} onBack={() => setView('list')} />
        )}

        {/* CATALOG */}
        {view === 'catalog' && (
          <CatalogView
            catalog={catalog}
            onAdd={addCatalogItem}
            onSave={saveCatalogItem}
            onDelete={removeCatalogItem}
            onBack={() => setView('list')} />
        )}

        {/* ARCHIVE */}
        {view === 'archive' && (
          <ArchiveView
            projects={projects}
            onRestore={restore}
            onDelete={removeProject}
            onBack={() => setView('list')} />
        )}
      </div>
    </div>
  );
}
