import { dbConnect } from "@/lib/db";
import Application from "@/models/Application";
import Program from "@/models/Program";
import User from "@/models/User";
import { json, error } from "@/lib/api";
import { getAuthFromCookies, requireRole } from "@/lib/auth";
import { z } from "zod";

export async function GET(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["user","instructor","superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const url = new URL(req.url);
  const programId = url.searchParams.get("programId");

  await dbConnect();
  
  let filter: any = {};
  if (programId) {
    // Get all applicants for a specific program (admin/instructor only)
    if (!["instructor", "superadmin"].includes(auth!.role)) {
      return error("Unauthorized", 403);
    }
    filter.programId = programId;
  } else {
    // Get user's own applications
    filter.userId = auth!.sub;
  }

  const items = await Application.find(filter)
    .populate("programId")
    .populate("userId", "name email")
    .sort({ createdAt: -1 })
    .lean();
  return json(items);
}

const Body = z.object({ programId: z.string().min(1) });

export async function POST(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["user","superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid input", 400);

  await dbConnect();
  const program = await Program.findById(parsed.data.programId).lean();
  if (!program) return error("Program not found", 404);

  const existing = await Application.findOne({ userId: auth!.sub, programId: parsed.data.programId }).lean();
  if (existing) return error("Already applied", 409);

  const created = await Application.create({ userId: auth!.sub, programId: parsed.data.programId });
  return json(created, { status: 201 });
}

const PatchBody = z.object({
  applicationId: z.string().min(1),
  status: z.enum(["pending","approved","in_progress","completed","rejected"]),
  notes: z.string().optional(),
});

export async function PATCH(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["instructor","superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid input", 400);

  await dbConnect();
  const application = await Application.findById(parsed.data.applicationId);
  if (!application) return error("Application not found", 404);

  application.status = parsed.data.status;
  if (parsed.data.notes !== undefined) {
    application.notes = parsed.data.notes;
  }
  await application.save();

  return json(application);
}
