import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { json, error } from "@/lib/api";
import { getAuthFromCookies, requireRole } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["user","instructor","superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  await dbConnect();
  const user = await User.findById(auth!.sub).select("-passwordHash").lean();
  if (!user) return error("User not found", 404);
  return json(user);
}

const PatchBody = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  organization: z.string().optional(),
  // Instructor-specific fields
  profileType: z.enum(["personal","company",""]).optional(),
  companyName: z.string().optional(),
  companyPosition: z.string().optional(),
  expertise: z.string().optional(),
});

export async function PATCH(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["user","instructor","superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid input", 400);

  await dbConnect();
  const updates: any = {};

  // Common fields
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
  if (parsed.data.bio !== undefined) updates.bio = parsed.data.bio;
  if (parsed.data.organization !== undefined) updates.organization = parsed.data.organization;

  // Instructor-only fields
  if (auth!.role === "instructor" || auth!.role === "superadmin") {
    if (parsed.data.profileType !== undefined) updates.profileType = parsed.data.profileType;
    if (parsed.data.companyName !== undefined) updates.companyName = parsed.data.companyName;
    if (parsed.data.companyPosition !== undefined) updates.companyPosition = parsed.data.companyPosition;
    if (parsed.data.expertise !== undefined) updates.expertise = parsed.data.expertise;
  }

  const updated = await User.findByIdAndUpdate(auth!.sub, { $set: updates }, { new: true }).select("-passwordHash").lean();
  if (!updated) return error("User not found", 404);
  return json(updated);
}
