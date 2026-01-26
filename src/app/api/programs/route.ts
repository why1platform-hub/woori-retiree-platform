import { dbConnect } from "@/lib/db";
import Program from "@/models/Program";
import Category from "@/models/Category";
import { json, error } from "@/lib/api";
import { getAuthFromCookies, requireRole } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  await dbConnect();
  const items = await Program.find().sort({ 모집시작: -1 }).limit(50).lean();
  return json({ programs: items });
}

const Body = z.object({
  name: z.string().min(2),
  category: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  모집시작: z.string().datetime(),
  모집종료: z.string().datetime(),
  description: z.string().optional().default(""),
  status: z.enum(["upcoming","open","closed"]).optional().default("upcoming"),
});

export async function POST(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid input", 400);

  await dbConnect();

  // Validate category exists
  const categoryExists = await Category.findOne({ name: parsed.data.category });
  if (!categoryExists) return error("Invalid category", 400);

  const payload = { ...parsed.data,
    startDate: new Date(parsed.data.startDate),
    endDate: new Date(parsed.data.endDate),
    모집시작: new Date(parsed.data.모집시작),
    모집종료: new Date(parsed.data.모집종료),
  };
  const created = await Program.create(payload);
  return json({ program: created }, { status: 201 });
}

const PatchBody = z.object({
  id: z.string().min(1),
  name: z.string().min(2).optional(),
  category: z.string().min(1).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  모집시작: z.string().datetime().optional(),
  모집종료: z.string().datetime().optional(),
  description: z.string().optional(),
  status: z.enum(["upcoming","open","closed"]).optional(),
});

export async function PATCH(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid input", 400);

  await dbConnect();

  // Validate category if provided
  if (parsed.data.category) {
    const categoryExists = await Category.findOne({ name: parsed.data.category });
    if (!categoryExists) return error("Invalid category", 400);
  }

  const { id, ...data } = parsed.data;
  const updates: any = { ...data };
  if (data.startDate) updates.startDate = new Date(data.startDate);
  if (data.endDate) updates.endDate = new Date(data.endDate);
  if (data.모집시작) updates.모집시작 = new Date(data.모집시작);
  if (data.모집종료) updates.모집종료 = new Date(data.모집종료);

  const updated = await Program.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
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
  const deleted = await Program.findByIdAndDelete(id);
  if (!deleted) return error("Not found", 404);
  return json({ ok: true });
}
