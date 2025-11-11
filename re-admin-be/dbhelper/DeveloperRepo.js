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
  const seed = toSlug(base || "developer");
  let slug = seed;
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabase
      .from("developers")
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
  const seed = toSlug(proposed || "developer");
  let slug = seed;
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabase
      .from("developers")
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
export async function list({
  name = "",
  city = "",
  page = 1,
  limit = 20,
} = {}) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const selectCols = `
    id,
    name,
    slug,
    email,
    phone,
    cities,
    active,
    photo_url,
    created_at,
    updated_at
  `;

  // Count total
  let countQuery = supabase
    .from("developers")
    .select("id", { count: "exact", head: true });
  if (name) countQuery = countQuery.ilike("name", `%${name}%`);
  if (city) countQuery = countQuery.cs("cities", [city]); // Supabase array contains
  const { count, error: countErr } = await countQuery;
  if (countErr) throw countErr;

  // Fetch data
  let query = supabase
    .from("developers")
    .select(selectCols)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (name) query = query.ilike("name", `%${name}%`);
  if (city) query = query.cs("cities", [city]);

  const { data, error } = await query;
  if (error) throw error;

  return { rows: data || [], total: count || 0 };
}

// Get by ID
export async function getById(id) {
  const selectCols = `
    id,
    name,
    slug,
    email,
    phone,
    cities,
    active,
    photo_url,
    created_at,
    updated_at
  `;
  const { data, error } = await supabase
    .from("developers")
    .select(selectCols)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

// Insert
export async function insert(payload) {
  const { data, error } = await supabase
    .from("developers")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Update (drops undefined keys)
export async function update(id, patch) {
  const clean = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined)
  );
  if (Object.keys(clean).length === 0) return await getById(id);
  const { data, error } = await supabase
    .from("developers")
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
    .from("developers")
    .select("active")
    .eq("id", id)
    .single();
  if (ge) throw ge;
  const next = !cur?.active;
  const { data, error } = await supabase
    .from("developers")
    .update({ active: next })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Remove row
export async function remove(id) {
  const { error } = await supabase.from("developers").delete().eq("id", id);
  if (error) throw error;
  return true;
}

// Count
export async function count() {
  const { count, error } = await supabase
    .from("developers")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}
