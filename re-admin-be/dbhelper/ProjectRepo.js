// src/dbhelper/ProjectRepo.js
import { supabase } from "../dbhelper/dbclient.js";

// Normalize slug
const toSlug = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Ensure unique slug on create
export async function ensureUniqueSlug(base) {
  const seed = toSlug(base || "project");
  let slug = seed;
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", slug)
      .limit(1);
    if (error) throw error;
    if (!data || data.length === 0) return slug;
    slug = `${seed}-${i + 1}`;
  }
  return `${seed}-${Date.now()}`;
}

// Ensure unique slug on update (exclude current id)
export async function ensureUniqueSlugOnUpdate(id, proposed) {
  const seed = toSlug(proposed || "project");
  let slug = seed;
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", slug)
      .neq("id", id)
      .limit(1);
    if (error) throw error;
    if (!data || data.length === 0) return slug;
    slug = `${seed}-${i + 1}`;
  }
  return `${seed}-${Date.now()}`;
}

// List with filters + pagination
export async function list({ title = "", page = 1, limit = 20 } = {}) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const selectCols = `
    id, title, slug, description, category_id, location,
    start_date, end_date, status, amenities, meta,
    hero_image, images, documents, created_at, updated_at
  `;

  // Count total
  let countQuery = supabase
    .from("projects")
    .select("id", { count: "exact", head: true });
  if (title) countQuery = countQuery.ilike("title", `%${title}%`);
  const { count, error: countErr } = await countQuery;
  if (countErr) throw countErr;

  // Fetch data
  let query = supabase
    .from("projects")
    .select(selectCols)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (title) query = query.ilike("title", `%${title}%`);
  const { data, error } = await query;
  if (error) throw error;

  return { rows: data || [], total: count || 0 };
}

// Get by ID
export async function getById(id) {
  const selectCols = `
    id, title, slug, description, category_id, location,
    start_date, end_date, status, amenities, meta,
    hero_image, images, documents, created_at, updated_at
  `;
  const { data, error } = await supabase
    .from("projects")
    .select(selectCols)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

// Insert
export async function insert(payload) {
  const { data, error } = await supabase
    .from("projects")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Update (append images/docs if provided)
export async function update(id, patch, appendImages = [], appendDocs = []) {
  const clean = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined)
  );

  // Fetch current project to append images/docs
  const current = await getById(id);
  if (!current) return null;

  if (appendImages.length)
    clean.images = [...(current.images || []), ...appendImages];
  if (appendDocs.length)
    clean.documents = [...(current.documents || []), ...appendDocs];

  if (Object.keys(clean).length === 0) return current;

  const { data, error } = await supabase
    .from("projects")
    .update(clean)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Toggle status
export async function toggleStatus(id) {
  const { data: cur, error: ge } = await supabase
    .from("projects")
    .select("status")
    .eq("id", id)
    .single();
  if (ge) throw ge;
  const next = !cur?.status;
  const { data, error } = await supabase
    .from("projects")
    .update({ status: next })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Remove row
export async function remove(id) {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
  return true;
}

// Count
export async function count() {
  const { count, error } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}
