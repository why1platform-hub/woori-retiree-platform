import { getAuthFromCookies } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { json, error } from "@/lib/api";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const auth = await getAuthFromCookies();
  if (!auth) return error("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const { currentPassword, newPassword } = body || {};

  if (!currentPassword || !newPassword) return error("Missing parameters", 400);
  if (typeof newPassword !== "string" || newPassword.length < 8) return error("New password must be at least 8 characters", 400);

  await dbConnect();
  const user = await User.findById(auth.sub);
  if (!user) return error("User not found", 404);

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) return error("Current password incorrect", 400);

  const passwordHash = await bcrypt.hash(newPassword, 10);
  user.passwordHash = passwordHash;
  await user.save();

  return json({ ok: true, message: "Password updated" });
}
