import { dbConnect } from "@/lib/db";
import Notice from "@/models/Notice";
import { json, error } from "@/lib/api";
import { getAuthFromCookies, requireRole } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  await dbConnect();
  const items = await Notice.find().sort({ publishedAt: -1 }).limit(20).lean();
  return json({ notices: items });
}

const Body = z.object({
  title: z.string().min(2),
  body: z.string().min(2),
  badge: z.enum(["urgent","info"]).default("info"),
});

export async function POST(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const data = Body.safeParse(await req.json().catch(() => null));
  if (!data.success) return error("Invalid input", 400);

  await dbConnect();
  const created = await Notice.create(data.data);
  return json({ notice: created }, { status: 201 });
}

const PatchBody = z.object({
  id: z.string().min(1),
  title: z.string().min(2).optional(),
  body: z.string().min(2).optional(),
  badge: z.enum(["urgent","info"]).optional(),
});

export async function PATCH(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid input", 400);

  await dbConnect();
  const { id, ...updates } = parsed.data;
  const updated = await Notice.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
  if (!updated) return error("Not found", 404);
  return json(updated);
}

export async function DELETE(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return error("Missing id", 400);

  await dbConnect();
  const deleted = await Notice.findByIdAndDelete(id);
  if (!deleted) return error("Not found", 404);
  return json({ ok: true });
}
