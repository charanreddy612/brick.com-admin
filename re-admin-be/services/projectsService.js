import { supabase } from "../dbhelper/dbclient.js";

export async function listProjectsData({
  status,
  limit = 20,
  page = 1,
  title = "",
} = {}) {
  const from = (Number(page) - 1) * Number(limit);
  const to = from + Number(limit) - 1;

  const selectCols = `
    id, title, slug, description, category_id, location,
    start_date, end_date, status, amenities, meta,
    hero_image, images, documents, created_at, updated_at
  `;

  // COUNT QUERY
  let countQuery = supabase
    .from("projects")
    .select("id", { count: "exact", head: true });

  if (title && title.trim() !== "") {
    countQuery = countQuery.ilike("title", `%${title}%`);
  }
  if (status !== undefined && status !== null && status !== "") {
    countQuery = countQuery.eq("status", status);
  }

  const { count, error: countErr } = await countQuery;
  if (countErr) throw countErr;

  // DATA QUERY
  let query = supabase
    .from("projects")
    .select(selectCols)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (title && title.trim() !== "") {
    query = query.ilike("title", `%${title}%`);
  }
  if (status !== undefined && status !== null && status !== "") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return { rows: data || [], total: count || 0 };
}
