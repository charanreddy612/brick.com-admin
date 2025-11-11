import bcrypt from "bcrypt";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function resetUserPassword(email, newPassword) {
  try {
    // Generate bcrypt hash
    const saltRounds = 10;
    const hash = await bcrypt.hash(newPassword, saltRounds);

    // Update Supabase user
    const { data, error } = await supabase
      .from("users")
      .update({ password_hash: hash })
      .eq("email", email)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Password reset for ${email}`);
    console.log("Updated user:", data);
  } catch (err) {
    console.error("Failed to reset password:", err);
  }
}

// Usage
resetUserPassword("charanreddy@brick.com", "pichi123");
