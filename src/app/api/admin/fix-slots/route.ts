import { dbConnect } from "@/lib/db";
import ConsultationSlot from "@/models/ConsultationSlot";
import User from "@/models/User";
import { json, error } from "@/lib/api";

const FIX_SECRET = "setup2024";

/**
 * One-time fix: reassign all consultation slots that belong to non-instructor users
 * to the correct instructor.
 * GET /api/admin/fix-slots?secret=setup2024&instructorEmail=test1@woori.com
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const instructorEmail = searchParams.get("instructorEmail");

  if (secret !== FIX_SECRET) return error("Unauthorized", 401);
  if (!instructorEmail) return error("instructorEmail query param required", 400);

  await dbConnect();

  // Find the target instructor
  const instructor = await User.findOne({ email: instructorEmail, role: "instructor" }).lean() as any;
  if (!instructor) {
    // List all instructors to help diagnose
    const instructors = await User.find({ role: "instructor" }).select("name email").lean() as any[];
    return error(
      `No instructor found with email: ${instructorEmail}. Available instructors: ${instructors.map((i: any) => `${i.name} <${i.email}>`).join(", ") || "none"}`,
      404
    );
  }

  // Find all instructor user IDs
  const allInstructors = await User.find({ role: "instructor" }).select("_id").lean() as any[];
  const instructorIds = allInstructors.map((u: any) => String(u._id));

  // Find all slots
  const allSlots = await ConsultationSlot.find({}).lean() as any[];
  const orphanedSlots = allSlots.filter((s: any) => !instructorIds.includes(String(s.instructorId)));

  if (orphanedSlots.length === 0) {
    return json({
      message: "No orphaned slots found — all slots already have valid instructors.",
      fixed: 0,
      totalSlots: allSlots.length,
    });
  }

  // Reassign orphaned slots to the target instructor
  const orphanedIds = orphanedSlots.map((s: any) => s._id);
  const result = await ConsultationSlot.updateMany(
    { _id: { $in: orphanedIds } },
    { $set: { instructorId: instructor._id } }
  );

  return json({
    message: `Fixed ${result.modifiedCount} slot(s) — reassigned to ${instructor.name} (${instructorEmail})`,
    fixed: result.modifiedCount,
    instructorId: String(instructor._id),
    instructorName: instructor.name,
    totalSlots: allSlots.length,
  });
}
