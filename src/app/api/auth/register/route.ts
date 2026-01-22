import { z } from "zod";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { json, error } from "@/lib/api";
import { signToken, setAuthCookie } from "@/lib/auth";

const Body = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) return error("Invalid input", 400);

  const { name, email, password } = parsed.data;

  await dbConnect();
  const existing = await User.findOne({ email }).lean();
  if (existing) return error("Email already registered", 409);

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, role: "user" });

  const token = await signToken({ sub: String(user._id), email, name, role: user.role });
  setAuthCookie(token);
  return json({ ok: true, user: { id: String(user._id), email, name, role: user.role } });
}
