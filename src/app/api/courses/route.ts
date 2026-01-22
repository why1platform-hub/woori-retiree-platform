import { dbConnect } from "@/lib/db";
import Course from "@/models/Course";
import { json, error } from "@/lib/api";
import { getAuthFromCookies, requireRole } from "@/lib/auth";
import { z } from "zod";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine") === "true";

  await dbConnect();

  let query = {};
  if (mine) {
    const auth = await getAuthFromCookies();
    if (!auth) return error("Unauthorized", 401);
    query = { instructorId: auth.sub };
  }

  const items = await Course.find(query).sort({ createdAt: -1 }).limit(50).lean();
  return json({ courses: items });
}

const Body = z.object({
  title: z.string().min(2),
  category: z.enum(["finance","realestate","startup","social"]).default("finance"),
  thumbnailUrl: z.string().optional().default(""),
  videoUrl: z.string().optional().default(""),
  durationMin: z.number().int().min(1).max(600).optional().default(10),
});

export async function POST(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["instructor","superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid input", 400);

  await dbConnect();
  const created = await Course.create({ ...parsed.data, instructorId: auth!.sub });
  return json({ course: created }, { status: 201 });
}

const PatchBody = z.object({
  id: z.string().min(1),
  title: z.string().min(2).optional(),
  category: z.enum(["finance","realestate","startup","social"]).optional(),
  thumbnailUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  durationMin: z.number().int().min(1).max(600).optional(),
});

export async function PATCH(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["instructor","superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid input", 400);

  await dbConnect();
  const { id, ...updates } = parsed.data;

  const course = await Course.findById(id);
  if (!course) return error("Not found", 404);

  // Only allow instructor to edit their own courses (superadmin can edit any)
  if (auth!.role === "instructor" && String(course.instructorId) !== auth!.sub) {
    return error("Forbidden", 403);
  }

  const updated = await Course.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
  return json(updated);
}

export async function DELETE(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["instructor","superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return error("Missing id", 400);

  await dbConnect();
  const course = await Course.findById(id);
  if (!course) return error("Not found", 404);

  // Only allow instructor to delete their own courses (superadmin can delete any)
  if (auth!.role === "instructor" && String(course.instructorId) !== auth!.sub) {
    return error("Forbidden", 403);
  }

  await Course.findByIdAndDelete(id);
  return json({ ok: true });
}
