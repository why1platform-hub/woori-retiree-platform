import { dbConnect } from "@/lib/db";
import Resource from "@/models/Resource";
import Category from "@/models/Category";
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

  const items = await Resource.find(query).sort({ createdAt: -1 }).limit(50).lean();
  return json({ resources: items });
}

const Body = z.object({
  title: z.string().min(2),
  category: z.string().default("finance"),
  fileUrl: z.string().url(),
  fileSize: z.string().optional().default(""),
});

export async function POST(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["instructor","superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid input", 400);

  await dbConnect();

  // Validate category exists
  const categoryExists = await Category.findOne({ name: parsed.data.category });
  if (!categoryExists) return error("Invalid category", 400);

  const created = await Resource.create({ ...parsed.data, instructorId: auth!.sub });
  return json({ resource: created }, { status: 201 });
}
