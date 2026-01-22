import { dbConnect } from "@/lib/db";
import Resume from "@/models/Resume";
import { json, error } from "@/lib/api";
import { getAuthFromCookies, requireRole } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["user","instructor","superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  await dbConnect();
  const item = await Resume.findOne({ userId: auth!.sub }).lean();
  return json(item ?? { userId: auth!.sub, summary: "", experience: "", skills: "" });
}

const Body = z.object({
  summary: z.string().optional().default(""),
  experience: z.string().optional().default(""),
  skills: z.string().optional().default(""),
});

export async function PUT(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["user","instructor","superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid input", 400);

  await dbConnect();
  const updated = await Resume.findOneAndUpdate(
    { userId: auth!.sub },
    { $set: parsed.data },
    { upsert: true, new: true }
  ).lean();
  return json(updated);
}
