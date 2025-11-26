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

// Utility: Deduplicate array
const dedupe = (arr = []) => [...new Set(arr)];

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

// Insert -- amenities must be array of objects
export async function insert(payload) {
  const out = { ...payload };
  out.images = dedupe(Array.isArray(out.images) ? out.images : []);
  out.documents = dedupe(Array.isArray(out.documents) ? out.documents : []);
  out.amenities = Array.isArray(out.amenities)
    ? out.amenities.map((a) => ({
        title: (a?.title ?? "").toString(),
        description: (a?.description ?? "").toString(),
        imageUrl: (a?.imageUrl ?? "").toString(),
      }))
    : [];
  const { data, error } = await supabase
    .from("projects")
    .insert(out)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Update -- amenities as array of objects, always dedupe arrays
export async function update(id, patch, appendImages = [], appendDocs = []) {
  const clean = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined)
  );
  const current = await getById(id);
  if (!current) return null;

  // Handle append/replace arrays
  clean.images = dedupe([
    ...(current.images || []),
    ...(Array.isArray(clean.images) ? clean.images : []),
    ...appendImages,
  ]);
  clean.documents = dedupe([
    ...(current.documents || []),
    ...(Array.isArray(clean.documents) ? clean.documents : []),
    ...appendDocs,
  ]);

  // Amenities must be structured objects
  if (clean.amenities) {
    clean.amenities = Array.isArray(clean.amenities)
      ? clean.amenities.map((a) => ({
          title: (a?.title ?? "").toString(),
          description: (a?.description ?? "").toString(),
          imageUrl: (a?.imageUrl ?? "").toString(),
        }))
      : [];
  }

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

// Idempotent status set
export async function setStatus(id, active) {
  const { data, error } = await supabase
    .from("projects")
    .update({ status: !!active })
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

// dbhelper/ProjectRepo.js

export async function getBySlug(slug) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error) {
    console.error("Error fetching project by slug:", error);
    return null;
  }
  return data;
}
