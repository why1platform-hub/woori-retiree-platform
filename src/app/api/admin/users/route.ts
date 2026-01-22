import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { json, error } from "@/lib/api";
import { getAuthFromCookies, requireRole } from "@/lib/auth";
import { z } from "zod";
import bcrypt from "bcryptjs";

export async function GET() {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  await dbConnect();
  const users = await User.find().select("-passwordHash").sort({ createdAt: -1 }).lean();
  return json({ users });
}

const Body = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["user","instructor","superadmin"]),
});

export async function POST(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid input", 400);

  await dbConnect();
  const existing = await User.findOne({ email: parsed.data.email }).lean();
  if (existing) return error("Email already exists", 409);

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const created = await User.create({ ...parsed.data, passwordHash });
  return json({ user: { _id: String(created._id), email: created.email, name: created.name, role: created.role } }, { status: 201 });
}

const PatchBody = z.object({
  userId: z.string().min(1),
  role: z.enum(["user", "instructor", "superadmin"]).optional(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  organization: z.string().optional(),
});

export async function PATCH(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid input", 400);

  await dbConnect();
  const { userId, ...updates } = parsed.data;

  // If email is being updated, check for duplicates
  if (updates.email) {
    const existing = await User.findOne({ email: updates.email, _id: { $ne: userId } }).lean();
    if (existing) return error("Email already exists", 409);
  }

  const updated = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true }).select("-passwordHash").lean();
  if (!updated) return error("Not found", 404);
  return json({ user: updated });
}

const ResetPasswordBody = z.object({
  userId: z.string().min(1),
});

export async function PUT(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const parsed = ResetPasswordBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid input", 400);

  await dbConnect();
  const user = await User.findById(parsed.data.userId);
  if (!user) return error("Not found", 404);

  const newPassword = user.name + "!";
  const passwordHash = await bcrypt.hash(newPassword, 10);
  user.passwordHash = passwordHash;
  user.passwordResetRequested = false;
  await user.save();

  return json({ ok: true, newPassword });
}
