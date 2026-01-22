import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { json, error } from "@/lib/api";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return error("Email is required", 400);

  await dbConnect();
  const user = await User.findOne({ email: email.toLowerCase() });

  // Always return success to prevent email enumeration
  if (!user) {
    return json({ ok: true, message: "If this email exists, a reset request has been sent to administrators." });
  }

  user.passwordResetRequested = true;
  user.passwordResetRequestedAt = new Date();
  await user.save();

  return json({ ok: true, message: "Password reset request sent. An administrator will contact you." });
}
