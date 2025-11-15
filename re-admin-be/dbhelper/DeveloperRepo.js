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

// List developers with optional name and city filters + pagination
export async function list({
  name = "",
  city = "",
  page = 1,
  limit = 20,
} = {}) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    // 1️⃣ Filter developer IDs by city if city filter is provided
    let developerIdsByCity = null;
    if (city) {
      const { data: devCities, error: devCitiesErr } = await supabase
        .from("developer_cities")
        .select("developer_id")
        .eq("city", city);
      if (devCitiesErr) throw devCitiesErr;
      developerIdsByCity = devCities.map((dc) => dc.developer_id);
      if (!developerIdsByCity.length) {
        // No developers match this city
        return { rows: [], total: 0 };
      }
    }

    // 2️⃣ Count total developers matching filters
    let countQuery = supabase
      .from("developers")
      .select("id", { count: "exact", head: true });
    if (name) countQuery = countQuery.ilike("name", `%${name}%`);
    if (developerIdsByCity)
      countQuery = countQuery.in("id", developerIdsByCity);

    const { count, error: countErr } = await countQuery;
    if (countErr) throw countErr;

    // 3️⃣ Fetch developer data
    let query = supabase
      .from("developers")
      .select(
        `
        id,
        name,
        slug,
        email,
        phone,
        active,
        logo_url,
        created_at,
        updated_at,
        developer_cities (city)
      `
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (name) query = query.ilike("name", `%${name}%`);
    if (developerIdsByCity) query = query.in("id", developerIdsByCity);

    const { data, error } = await query;
    if (error) throw error;

    // 4️⃣ Map cities to array for each developer
    const rows = (data || []).map((dev) => ({
      ...dev,
      cities: dev.developer_cities
        ? dev.developer_cities.map((dc) => dc.city)
        : [],
    }));

    return { rows, total: count || 0 };
  } catch (err) {
    console.error("Developer list fetch error:", err);
    throw err;
  }
}

// Get by ID (with cities from developer_cities)
export async function getById(id) {
  // fetch developer
  const { data: dev, error } = await supabase
    .from("developers")
    .select(
      `
      id,
      name,
      slug,
      email,
      phone,
      website,
      about,
      country,
      active,
      logo_url,
      created_at,
      updated_at
    `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  if (!dev) return null;

  // fetch linked cities
  const { data: cities } = await supabase
    .from("developer_cities")
    .select(`city_id , name: c.cities?.name || ""`)
    .eq("developer_id", id);

  dev.cities = cities?.map((c) => c.city_id) ?? [];

  return dev;
}

// Insert
export async function insert(payload) {
  const slug = await ensureUniqueSlug(payload.name);
  const base = {
    name: payload.name,
    slug,
    email: payload.email || null,
    phone: payload.phone || null,
    website: payload.website || null,
    logo_url: payload.logo_url || null,
    about: payload.about || null,
    active: payload.active ?? true,
  };
  const { data, error } = await supabase
    .from("developers")
    .insert(base)
    .select()
    .single();
  if (error) throw error;

  // insert city relations
  if (payload.cities?.length) {
    const cityRows = payload.cities.map((c) => ({
      developer_id: data.id,
      city: c,
    }));
    const { error: cityErr } = await supabase
      .from("developer_cities")
      .insert(cityRows);
    if (cityErr) console.error("City insert failed:", cityErr);
  }

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

export async function linkCities(developer_id, cities = []) {
  if (!cities.length) return;
  const rows = cities.map((city) => ({ developer_id, city }));
  const { error } = await supabase.from("developer_cities").insert(rows);
  if (error) throw error;
}

async function deleteCities(devId) {
  return db("developer_cities").where({ developer_id: devId }).del();
}
