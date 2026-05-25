import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ Supabase-Zugangsdaten fehlen! Bitte .env.local einrichten.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Projects ───────────────────────────────────────────────

export async function fetchProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select(`*, materials(*)`)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data.map(normalizeProject);
}

export async function createProject(project) {
  const { data, error } = await supabase
    .from('projects')
    .insert([toDbProject(project)])
    .select()
    .single();
  if (error) throw error;
  return normalizeProject({ ...data, materials: [] });
}

export async function updateProject(project) {
  const { error } = await supabase
    .from('projects')
    .update(toDbProject(project))
    .eq('id', project.id);
  if (error) throw error;
}

export async function deleteProject(id) {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

export async function archiveProject(id) {
  const { error } = await supabase
    .from('projects')
    .update({ archived: true, archived_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function restoreProject(id) {
  const { error } = await supabase
    .from('projects')
    .update({ archived: false, archived_at: null })
    .eq('id', id);
  if (error) throw error;
}

export async function duplicateProject(project) {
  // Insert project copy
  const { data: newProject, error: pe } = await supabase
    .from('projects')
    .insert([{ ...toDbProject(project), name: project.name + ' (Kopie)', status: 'ToDo', priority: false, archived: false }])
    .select()
    .single();
  if (pe) throw pe;

  // Copy materials
  if (project.materials?.length > 0) {
    const mats = project.materials.map(m => ({
      ...toDbMaterial(m),
      project_id: newProject.id,
    }));
    const { error: me } = await supabase.from('materials').insert(mats);
    if (me) throw me;
  }

  const { data: full, error: fe } = await supabase
    .from('projects')
    .select('*, materials(*)')
    .eq('id', newProject.id)
    .single();
  if (fe) throw fe;
  return normalizeProject(full);
}

// ─── Materials ──────────────────────────────────────────────

export async function upsertMaterials(projectId, materials) {
  // Delete existing, then re-insert (simple replace strategy)
  await supabase.from('materials').delete().eq('project_id', projectId);
  if (materials.length === 0) return;
  const rows = materials.map((m, i) => ({
    ...toDbMaterial(m),
    project_id: projectId,
    sort_order: i,
  }));
  const { error } = await supabase.from('materials').insert(rows);
  if (error) throw error;
}

// ─── Catalog ────────────────────────────────────────────────

export async function fetchCatalog() {
  const { data, error } = await supabase
    .from('catalog')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data.map(normalizeCatalog);
}

export async function createCatalogItem(item) {
  const { data, error } = await supabase
    .from('catalog')
    .insert([toDbCatalog(item)])
    .select()
    .single();
  if (error) throw error;
  return normalizeCatalog(data);
}

export async function updateCatalogItem(item) {
  const { error } = await supabase
    .from('catalog')
    .update(toDbCatalog(item))
    .eq('id', item.id);
  if (error) throw error;
}

export async function deleteCatalogItem(id) {
  const { error } = await supabase.from('catalog').delete().eq('id', id);
  if (error) throw error;
}

// ─── Normalizers (DB → App) ─────────────────────────────────

function normalizeProject(p) {
  return {
    id: p.id,
    name: p.name,
    status: p.status || 'ToDo',
    priority: p.priority || false,
    startDate: p.start_date || '',
    deadline: p.deadline || '',
    notes: p.notes || '',
    buffer: p.buffer || 0,
    archived: p.archived || false,
    archivedAt: p.archived_at || null,
    createdAt: p.created_at,
    kunde: p.kunde || '',
    bildUrl: p.bild_url || '',
    materials: (p.materials || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(normalizeMaterial),
  };
}

function normalizeMaterial(m) {
  return {
    id: m.id,
    name: m.name || '',
    amount: m.amount != null ? String(m.amount) : '',
    unit: m.unit || 'Stück',
    pricePerUnit: m.price_per_unit != null ? String(m.price_per_unit) : '',
    link: m.link || '',
  };
}

function normalizeCatalog(c) {
  return {
    id: c.id,
    name: c.name,
    unit: c.unit || 'Stück',
    price: c.price != null ? String(c.price) : '',
    link: c.link || '',
    supplier: c.supplier || '',
  };
}

// ─── Serializers (App → DB) ─────────────────────────────────

function toDbProject(p) {
  return {
    name: p.name,
    status: p.status || 'ToDo',
    priority: p.priority || false,
    start_date: p.startDate || null,
    deadline: p.deadline || null,
    notes: p.notes || '',
    buffer: parseFloat(p.buffer) || 0,
    archived: p.archived || false,
    archived_at: p.archivedAt || null,
    kunde: p.kunde || '',
    bild_url: p.bildUrl || '',
  };
}

// ─── Storage ────────────────────────────────────────────────

export async function uploadBild(projectId, file) {
  const { error } = await supabase.storage
    .from('projekt-bilder')
    .upload(`${projectId}`, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from('projekt-bilder').getPublicUrl(`${projectId}`);
  return data.publicUrl + `?t=${Date.now()}`;
}

export async function deleteBild(projectId) {
  await supabase.storage.from('projekt-bilder').remove([`${projectId}`]);
}

function toDbMaterial(m) {
  return {
    name: m.name || '',
    amount: parseFloat(m.amount) || 0,
    unit: m.unit || 'Stück',
    price_per_unit: parseFloat(m.pricePerUnit) || 0,
    link: m.link || '',
  };
}

function toDbCatalog(c) {
  return {
    name: c.name,
    unit: c.unit || 'Stück',
    price: parseFloat(c.price) || 0,
    link: c.link || '',
    supplier: c.supplier || '',
  };
}
