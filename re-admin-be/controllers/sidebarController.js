import { supabase } from "../dbhelper/dbclient.js";

export const getSidebarMenu = async (req, res) => {
  try {
    console.log("inside getSidebarMenu controller");

    const roleId = Number(req.user?.role_id); // ensure number

    if (!roleId) {
      console.warn("Missing role_id in token");
      return res.status(400).json({ message: "Missing role_id in token" });
    }

    // 1️⃣ Fetch allowed menu IDs
    const { data: roleMenu, error: roleMenuError } = await supabase
      .from("role_menu")
      .select("menu_id")
      .eq("role_id", roleId);

    if (roleMenuError) {
      console.error("Error fetching role_menu:", roleMenuError);
      throw roleMenuError;
    }


    if (!roleMenu || roleMenu.length === 0) {
      console.warn("No menu assigned for this role");
      return res.json([]);
    }

    const menuIds = roleMenu.map((rm) => Number(rm.menu_id));

    // 2️⃣ Fetch all sidebar items
    const { data: menus, error: menuError } = await supabase
      .from("sidebar_menu")
      .select("*")
      .in("id", menuIds)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (menuError) {
      console.error("Error fetching sidebar_menu:", menuError);
      throw menuError;
    }

    if (!menus || menus.length === 0) {
      console.warn("No active menus found for the role");
      return res.json([]);
    }

    // 3️⃣ Build nested menu tree
    const menuMap = {};
    const rootMenus = [];

    menus.forEach((item) => {
      menuMap[item.id] = { ...item, children: [] };
    });

    menus.forEach((item) => {
      if (item.parent_id && menuMap[item.parent_id]) {
        menuMap[item.parent_id].children.push(menuMap[item.id]);
      } else if (!item.parent_id) {
        rootMenus.push(menuMap[item.id]);
      }
    });

    res.json(rootMenus);
  } catch (err) {
    console.error("Sidebar fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
