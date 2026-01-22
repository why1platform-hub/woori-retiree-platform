import { z } from "zod";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { json, error } from "@/lib/api";
import { signToken, setAuthCookie } from "@/lib/auth";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) return error("Invalid input", 400);

  const { email, password } = parsed.data;

  await dbConnect();
  const user = await User.findOne({ email });
  if (!user) return error("Invalid email or password", 401);

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return error("Invalid email or password", 401);

  const token = await signToken({ sub: String(user._id), email: user.email, name: user.name, role: user.role });
  setAuthCookie(token);
  return json({ ok: true, user: { id: String(user._id), email: user.email, name: user.name, role: user.role } });
}
