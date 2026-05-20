import { useEffect, useCallback, useState, useRef } from 'react';
import {
  supabase,
  fetchProjects,
  fetchCatalog,
  createProject,
  updateProject,
  deleteProject,
  archiveProject,
  restoreProject,
  duplicateProject,
  upsertMaterials,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
} from '../lib/supabase';

export function useData() {
  const [projects, setProjects] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const saveTimer = useRef({});

  // ─── Initial load ───────────────────────────────────────
  useEffect(() => {
    Promise.all([fetchProjects(), fetchCatalog()])
      .then(([projs, cat]) => {
        setProjects(projs);
        setCatalog(cat);
        setLoading(false);
      })
      .catch(err => {
        console.error('Load error:', err);
        setError('Verbindung zu Supabase fehlgeschlagen. Bitte .env.local prüfen.');
        setLoading(false);
      });
  }, []);

  // ─── Realtime subscriptions ──────────────────────────────
  useEffect(() => {
    // Projects channel
    const projectSub = supabase
      .channel('projects-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchProjects().then(setProjects).catch(console.error);
      })
      .subscribe();

    // Materials channel
    const materialSub = supabase
      .channel('materials-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, () => {
        fetchProjects().then(setProjects).catch(console.error);
      })
      .subscribe();

    // Catalog channel
    const catalogSub = supabase
      .channel('catalog-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'catalog' }, () => {
        fetchCatalog().then(setCatalog).catch(console.error);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(projectSub);
      supabase.removeChannel(materialSub);
      supabase.removeChannel(catalogSub);
    };
  }, []);

  // ─── Project actions ─────────────────────────────────────

  const addProject = useCallback(async (name) => {
    const p = await createProject({
      name,
      status: 'ToDo',
      priority: false,
      startDate: '',
      deadline: '',
      notes: '',
      buffer: 0,
    });
    setProjects(prev => [...prev, p]);
    return p;
  }, []);

  // Debounced save to avoid too many DB calls while typing
  const saveProject = useCallback((project) => {
    // Optimistic update
    setProjects(prev => prev.map(p => p.id === project.id ? project : p));

    // Debounce DB write per project
    clearTimeout(saveTimer.current[project.id]);
    saveTimer.current[project.id] = setTimeout(async () => {
      try {
        await updateProject(project);
        await upsertMaterials(project.id, project.materials);
      } catch (err) {
        console.error('Save error:', err);
      }
    }, 600);
  }, []);

  const removeProject = useCallback(async (id) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    await deleteProject(id);
  }, []);

  const archive = useCallback(async (id) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, archived: true } : p));
    await archiveProject(id);
  }, []);

  const restore = useCallback(async (id) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, archived: false } : p));
    await restoreProject(id);
  }, []);

  const duplicate = useCallback(async (project) => {
    const copy = await duplicateProject(project);
    setProjects(prev => [...prev, copy]);
    return copy;
  }, []);

  // ─── Catalog actions ─────────────────────────────────────

  const addCatalogItem = useCallback(async (item) => {
    const created = await createCatalogItem(item);
    setCatalog(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'de')));
    return created;
  }, []);

  const saveCatalogItem = useCallback(async (item) => {
    setCatalog(prev => prev.map(c => c.id === item.id ? item : c));
    await updateCatalogItem(item);
  }, []);

  const removeCatalogItem = useCallback(async (id) => {
    setCatalog(prev => prev.filter(c => c.id !== id));
    await deleteCatalogItem(id);
  }, []);

  return {
    projects,
    catalog,
    loading,
    error,
    addProject,
    saveProject,
    removeProject,
    archive,
    restore,
    duplicate,
    addCatalogItem,
    saveCatalogItem,
    removeCatalogItem,
  };
}
