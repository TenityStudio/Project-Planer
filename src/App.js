import { useState } from 'react';
import { useData } from './hooks/useData';
import { COLORS } from './lib/utils';
import { Btn } from './components/UI';
import { ProjectCard } from './components/ProjectCard';
import { ProjectDetail } from './components/ProjectDetail';
import { CatalogView } from './components/CatalogView';
import { ShoppingList } from './components/ShoppingList';
import { ArchiveView } from './components/ArchiveView';
import { KanbanBoard } from './components/KanbanBoard';
import { KundenView } from './components/KundenView';

export default function App() {
  const {
    projects, catalog, loading, error,
    addProject, saveProject, removeProject, archive, restore, duplicate,
    addCatalogItem, saveCatalogItem, removeCatalogItem,
  } = useData();

  const [topNav, setTopNav] = useState('projekte');
  const [view, setView] = useState('list');
  const [listView, setListView] = useState('kanban');
  const [activeId, setActiveId] = useState(null);
  const [freshProject, setFreshProject] = useState(false);

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
    const p = await addProject('Neues Projekt');
    setActiveId(p.id);
    setFreshProject(true);
    setView('detail');
  };

  const handleDeleteProject = async (id) => {
    await removeProject(id);
    setView('list'); setActiveId(null);
  };

  const handleStatusChange = (id, newStatus) => {
    const project = projects.find(p => p.id === id);
    if (project) saveProject({ ...project, status: newStatus });
  };

  const handleOpenProject = (id) => {
    setTopNav('projekte');
    setActiveId(id);
    setView('detail');
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

  const isKanban = topNav === 'projekte' && view === 'list' && listView === 'kanban';

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: COLORS.bg, minHeight: '100vh', paddingBottom: 60 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: COLORS.accent, padding: '24px 24px 0', color: '#fff' }}>
        <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, letterSpacing: -.5 }}>
          Projekt Planer
        </h1>
        <p style={{ margin: '4px 0 16px', fontSize: 12, opacity: .75 }}>
          Materialien · Datenbank · Bestellliste
          <span style={{ marginLeft: 12, opacity: .6, fontSize: 11 }}>● Live-Sync aktiv</span>
        </p>

        {/* Top navigation tabs */}
        <div style={{ display: 'flex', gap: 2 }}>
          {[
            { key: 'projekte', label: '📋 Projekte' },
            { key: 'kunden',   label: '👤 Kunden'   },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setTopNav(key); if (key === 'projekte') setView('list'); }}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13, fontWeight: 700,
                padding: '8px 18px',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                background: topNav === key ? COLORS.bg : 'transparent',
                color: topNav === key ? COLORS.accent : 'rgba(255,255,255,.7)',
                transition: 'all .15s',
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: isKanban ? 1100 : 680, margin: '0 auto', padding: '22px 18px' }}>

        {/* KUNDEN */}
        {topNav === 'kunden' && (
          <KundenView projects={projects} onOpenProject={handleOpenProject} />
        )}

        {/* PROJEKTE */}
        {topNav === 'projekte' && (
          <>
            {/* LIST / KANBAN */}
            {view === 'list' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 600 }}>
                      {active.length} Projekt{active.length !== 1 ? 'e' : ''}
                    </span>
                    <div style={{ display: 'flex', gap: 2, background: COLORS.card, borderRadius: 8, padding: 3, border: `1.5px solid ${COLORS.border}` }}>
                      {[
                        { key: 'list',   icon: '☰' },
                        { key: 'kanban', icon: '⬛' },
                      ].map(({ key, icon }) => (
                        <button key={key} onClick={() => setListView(key)}
                          title={key === 'list' ? 'Listenansicht' : 'Kanban-Ansicht'}
                          style={{
                            border: 'none', borderRadius: 6, cursor: 'pointer',
                            padding: '4px 10px', fontSize: 13,
                            background: listView === key ? COLORS.accent : 'transparent',
                            color: listView === key ? '#fff' : COLORS.textMuted,
                            transition: 'all .15s',
                          }}>
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Btn onClick={() => setView('archive')} variant="ghost" size="sm">📦 Archiv {archiveCount > 0 && `(${archiveCount})`}</Btn>
                    <Btn onClick={() => setView('catalog')} variant="ghost" size="sm">🗄 Datenbank</Btn>
                    {active.length > 0 && <Btn onClick={() => setView('shopping')} variant="secondary" size="sm">🛒 Bestellliste</Btn>}
                    <Btn onClick={handleAddProject} size="sm">+ Neues Projekt</Btn>
                  </div>
                </div>

                {/* Kanban */}
                {listView === 'kanban' && (
                  <KanbanBoard
                    projects={active}
                    onOpen={id => { setActiveId(id); setView('detail'); }}
                    onStatusChange={handleStatusChange}
                    onArchive={id => archive(id)}
                    onDuplicate={duplicate}
                  />
                )}

                {/* Liste */}
                {listView === 'list' && (
                  <>
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
              </>
            )}

            {/* DETAIL */}
            {view === 'detail' && current && (
              <ProjectDetail
                project={current}
                catalog={catalog}
                onSave={saveProject}
                onDelete={() => handleDeleteProject(current.id)}
                onBack={() => setView('list')}
                autoEditName={freshProject}
                onNameEdited={() => setFreshProject(false)} />
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
          </>
        )}
      </div>
    </div>
  );
}
