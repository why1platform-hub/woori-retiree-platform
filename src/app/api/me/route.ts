import { json, error } from "@/lib/api";
import { getAuthFromCookies } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { z } from "zod";

export async function GET() {
  const auth = await getAuthFromCookies();
  if (!auth) return error("Unauthenticated", 401);
  await dbConnect();
  const user = await User.findById(auth.sub).select("-passwordHash").lean();
  if (!user) return json({ id: auth.sub, email: auth.email, name: auth.name, role: auth.role });
  return json({ ...user, id: auth.sub });
}

const PutBody = z.object({ name: z.string().min(1).optional(), phone: z.string().optional(), bio: z.string().optional(), organization: z.string().optional() });
export async function PUT(req: Request) {
  const auth = await getAuthFromCookies();
  if (!auth) return error("Unauthenticated", 401);
  const body = await req.json().catch(() => null);
  const parsed = PutBody.safeParse(body);
  if (!parsed.success) return error("Invalid input", 400);
  await dbConnect();
  const user = await User.findById(auth.sub);
  if (!user) return error("User not found", 404);
  if (typeof parsed.data.name === 'string') user.name = parsed.data.name;
  if (typeof parsed.data.phone === 'string') user.phone = parsed.data.phone;
  if (typeof parsed.data.bio === 'string') user.bio = parsed.data.bio;
  if (typeof parsed.data.organization === 'string') user.organization = parsed.data.organization;
  await user.save();
  return json({ user });
}
