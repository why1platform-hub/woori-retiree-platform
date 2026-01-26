import { dbConnect } from "@/lib/db";
import Category from "@/models/Category";
import Program from "@/models/Program";
import Course from "@/models/Course";
import Resource from "@/models/Resource";
import { json, error } from "@/lib/api";
import { getAuthFromCookies, requireRole } from "@/lib/auth";
import { z } from "zod";

const DEFAULT_CATEGORIES = [
  { name: "finance", label: "Finance", order: 0 },
  { name: "realestate", label: "Real Estate", order: 1 },
  { name: "startup", label: "Startup", order: 2 },
  { name: "social", label: "Social", order: 3 },
];

export async function GET() {
  await dbConnect();
  let categories = await Category.find().sort({ order: 1 }).lean();

  // Seed defaults if no categories exist
  if (categories.length === 0) {
    await Category.insertMany(DEFAULT_CATEGORIES);
    categories = await Category.find().sort({ order: 1 }).lean();
  }

  return json({ categories });
}

const CreateBody = z.object({
  name: z.string().min(1).regex(/^[a-z0-9]+$/, "Name must be lowercase alphanumeric"),
  label: z.string().min(1),
  order: z.number().optional().default(0),
});

export async function POST(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid input: " + parsed.error.issues.map(i => i.message).join(", "), 400);

  await dbConnect();

  const existing = await Category.findOne({ name: parsed.data.name });
  if (existing) return error("Category name already exists", 409);

  const category = await Category.create(parsed.data);
  return json({ category }, { status: 201 });
}

const PatchBody = z.object({
  id: z.string().min(1),
  name: z.string().min(1).regex(/^[a-z0-9]+$/).optional(),
  label: z.string().min(1).optional(),
  order: z.number().optional(),
});

export async function PATCH(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid input", 400);

  await dbConnect();
  const { id, ...data } = parsed.data;

  // If renaming, check uniqueness
  if (data.name) {
    const existing = await Category.findOne({ name: data.name, _id: { $ne: id } });
    if (existing) return error("Category name already exists", 409);
  }

  const updated = await Category.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
  if (!updated) return error("Not found", 404);
  return json({ category: updated });
}

export async function DELETE(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return error("Missing id", 400);

  await dbConnect();

  const category = await Category.findById(id).lean();
  if (!category) return error("Not found", 404);

  // Check if any programs, courses, or resources use this category
  const catName = (category as any).name;
  const [programCount, courseCount, resourceCount] = await Promise.all([
    Program.countDocuments({ category: catName }),
    Course.countDocuments({ category: catName }),
    Resource.countDocuments({ category: catName }),
  ]);

  if (programCount + courseCount + resourceCount > 0) {
    return error(
      `Cannot delete: category is used by ${programCount} program(s), ${courseCount} course(s), ${resourceCount} resource(s)`,
      409
    );
  }

  await Category.findByIdAndDelete(id);
  return json({ ok: true });
}
