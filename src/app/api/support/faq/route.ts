import { dbConnect } from "@/lib/db";
import Faq from "@/models/Faq";
import { json, error } from "@/lib/api";
import { getAuthFromCookies, requireRole } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  await dbConnect();
  const items = await Faq.find().sort({ createdAt: -1 }).limit(50).lean();
  return json({ faqs: items });
}

const Body = z.object({
  question: z.string().min(2),
  answer: z.string().min(2),
});

export async function POST(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid input", 400);

  await dbConnect();
  const created = await Faq.create(parsed.data);
  return json({ faq: created }, { status: 201 });
}

const PatchBody = z.object({
  id: z.string().min(1),
  question: z.string().min(2).optional(),
  answer: z.string().min(2).optional(),
});

export async function PATCH(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid input", 400);

  await dbConnect();
  const { id, ...updates } = parsed.data;
  const updated = await Faq.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
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
  const deleted = await Faq.findByIdAndDelete(id);
  if (!deleted) return error("Not found", 404);
  return json({ ok: true });
}
