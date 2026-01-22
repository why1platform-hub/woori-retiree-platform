import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { json, error } from "@/lib/api";
import { getAuthFromCookies } from "@/lib/auth";

export async function POST(req: Request) {
  const auth = await getAuthFromCookies();
  if (!auth) return error("Unauthorized", 401);

  await dbConnect();
  const user = await User.findById(auth.sub);
  if (!user) return error("User not found", 404);

  // Create a notification for admins that this user requested a password reset
  // We'll store this as a simple flag on the user document for now
  // In production, you'd use a proper notification system
  user.passwordResetRequested = true;
  user.passwordResetRequestedAt = new Date();
  await user.save();

  return json({ ok: true, message: "Password reset request sent to administrators" });
}
