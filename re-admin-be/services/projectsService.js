// services/projectService.js (new file)
import { supabase } from "../dbhelper/dbclient.js";

export async function listProjectsData({
  status,
  limit = 20,
  page = 1,
  title = "",
} = {}) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const selectCols = `
    id, title, slug, description, category_id, location,
    start_date, end_date, status, amenities, meta,
    hero_image, images, documents, created_at, updated_at
  `;

  let countQuery = supabase
    .from("projects")
    .select("id", { count: "exact", head: true });

  if (title) countQuery = countQuery.ilike("title", `%${title}%`);
  if (status !== undefined) countQuery = countQuery.eq("status", status);

  const { count, error: countErr } = await countQuery;
  if (countErr) throw countErr;

  let query = supabase
    .from("projects")
    .select(selectCols)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (title) query = query.ilike("title", `%${title}%`);
  if (status !== undefined) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;

  return { rows: data || [], total: count || 0 };
}
