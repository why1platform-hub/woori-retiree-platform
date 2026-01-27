import { dbConnect } from "@/lib/db";
import Job from "@/models/Job";
import { json, error } from "@/lib/api";
import { getAuthFromCookies, requireRole } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  await dbConnect();
  const items = await Job.find().sort({ createdAt: -1 }).limit(50).lean();
  return json({ jobs: items });
}

const Body = z.object({
  company: z.string().min(2),
  title: z.string().min(2),
  location: z.string().optional().default(""),
  employmentType: z.string().optional().default("Full-time"),
  salary: z.string().optional().default(""),
  requirements: z.string().optional().default(""),
  description: z.string().optional().default(""),
  companyLogo: z.string().optional().default(""),
  applyUrl: z.string().url().optional().or(z.literal("")).default(""),
});

export async function POST(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid input", 400);

  await dbConnect();
  const created = await Job.create(parsed.data);
  return json({ job: created }, { status: 201 });
}

const PatchBody = z.object({
  id: z.string().min(1),
  company: z.string().min(2).optional(),
  title: z.string().min(2).optional(),
  location: z.string().optional(),
  employmentType: z.string().optional(),
  salary: z.string().optional(),
  requirements: z.string().optional(),
  description: z.string().optional(),
  companyLogo: z.string().optional(),
  applyUrl: z.string().optional(),
});

export async function PATCH(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid input", 400);

  await dbConnect();
  const { id, ...updates } = parsed.data;
  const updated = await Job.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
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
  const deleted = await Job.findByIdAndDelete(id);
  if (!deleted) return error("Not found", 404);
  return json({ ok: true });
}
