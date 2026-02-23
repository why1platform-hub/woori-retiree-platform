import { dbConnect } from "@/lib/db";
import ConsultationSlot from "@/models/ConsultationSlot";
import User from "@/models/User";
import { json, error } from "@/lib/api";
import { getAuthFromCookies, requireRole } from "@/lib/auth";

/**
 * One-time fix: reassign all consultation slots that belong to non-instructor users
 * (e.g. superadmin) to the correct instructor.
 * POST /api/admin/fix-slots
 * Body: { instructorEmail: "test1@woori.com" }  ← target instructor
 */
export async function POST(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  await dbConnect();

  const body = await req.json().catch(() => ({}));
  const { instructorEmail } = body;

  if (!instructorEmail) return error("instructorEmail required", 400);

  // Find the target instructor
  const instructor = await User.findOne({ email: instructorEmail, role: "instructor" }).lean() as any;
  if (!instructor) return error(`No instructor found with email: ${instructorEmail}`, 404);

  // Find all instructor user IDs
  const allInstructors = await User.find({ role: "instructor" }).select("_id").lean();
  const instructorIds = allInstructors.map((u: any) => String(u._id));

  // Find slots whose instructorId does NOT belong to any instructor
  const allSlots = await ConsultationSlot.find({}).lean();
  const orphanedSlots = allSlots.filter((s: any) => !instructorIds.includes(String(s.instructorId)));

  if (orphanedSlots.length === 0) {
    return json({ message: "No orphaned slots found. All slots already have valid instructors.", fixed: 0 });
  }

  // Reassign orphaned slots to the target instructor
  const orphanedIds = orphanedSlots.map((s: any) => s._id);
  const result = await ConsultationSlot.updateMany(
    { _id: { $in: orphanedIds } },
    { $set: { instructorId: instructor._id } }
  );

  return json({
    message: `Fixed ${result.modifiedCount} slot(s) → reassigned to ${instructor.name} (${instructorEmail})`,
    fixed: result.modifiedCount,
    instructorId: String(instructor._id),
    instructorName: instructor.name,
  });
}
