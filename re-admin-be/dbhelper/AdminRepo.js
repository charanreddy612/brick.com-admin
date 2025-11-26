// dbhelper/adminRepo.js
import { supabase } from "./dbclient.js";

/**
 * Fetch admin user by email from DB.
 * Returns user object with id, email, password_hash, role_id or null if not found.
 * Throws on DB errors.
 */
export async function getAdminUserByEmail(email) {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, password_hash, role_id")
    .eq("email", email)
    .single();

  if (error) {
    throw error;
  }

  return data || null;
}
