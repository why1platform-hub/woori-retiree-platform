import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { json, error } from "@/lib/api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  // Simple protection - require a secret key
  if (secret !== "setup2024") {
    return error("Unauthorized", 401);
  }

  try {
    await dbConnect();

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: "admin@demo.com" });
    if (existingAdmin) {
      return json({ message: "Admin already exists", admin: { email: existingAdmin.email, role: existingAdmin.role } });
    }

    // Create admin user
    const passwordHash = await bcrypt.hash("Admin123!", 10);
    const admin = await User.create({
      name: "Super Admin",
      email: "admin@demo.com",
      passwordHash,
      role: "superadmin",
    });

    return json({
      message: "Admin created successfully",
      admin: {
        email: admin.email,
        password: "Admin123!",
        role: admin.role,
      },
    });
  } catch (err: any) {
    console.error("Seed error:", err);
    return error(err.message || "Failed to seed database", 500);
  }
}
