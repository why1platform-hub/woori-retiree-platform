import { dbConnect } from "@/lib/db";
import Notification from "@/models/Notification";
import { json, error } from "@/lib/api";
import { getAuthFromCookies } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  const auth = await getAuthFromCookies();
  if (!auth) return error("Unauthorized", 401);
  await dbConnect();
  const items = await Notification.find({ userId: auth.sub }).sort({ createdAt: -1 }).limit(50).lean();
  return json({ notifications: items });
}

const PatchBody = z.object({ id: z.string().min(1) });
export async function PATCH(req: Request) {
  const auth = await getAuthFromCookies();
  if (!auth) return error("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) return error("Invalid input", 400);
  await dbConnect();
  const doc = await Notification.findById(parsed.data.id);
  if (!doc) return error('Not found', 404);
  doc.read = !doc.read;
  await doc.save();
  return json({ ok: true, read: doc.read });
}
