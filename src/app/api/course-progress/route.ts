import { dbConnect } from "@/lib/db";
import CourseProgress from "@/models/CourseProgress";
import Course from "@/models/Course";
import { json, error } from "@/lib/api";
import { getAuthFromCookies, requireRole } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["user","instructor","superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  await dbConnect();
  const items = await CourseProgress.find({ userId: auth!.sub })
    .populate("courseId")
    .sort({ updatedAt: -1 })
    .lean();
  return json(items);
}

const Body = z.object({
  courseId: z.string().min(1),
  action: z.enum(["subscribe","unsubscribe","watch"]),
});

export async function POST(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["user","instructor","superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid input", 400);

  await dbConnect();
  const course = await Course.findById(parsed.data.courseId);
  if (!course) return error("Course not found", 404);

  let progress = await CourseProgress.findOne({ userId: auth!.sub, courseId: parsed.data.courseId });

  if (!progress) {
    progress = new CourseProgress({
      userId: auth!.sub,
      courseId: parsed.data.courseId,
      subscribed: false,
      watched: false,
    });
  }

  if (parsed.data.action === "subscribe") {
    progress.subscribed = true;
    progress.subscribedAt = new Date();
  } else if (parsed.data.action === "unsubscribe") {
    progress.subscribed = false;
  } else if (parsed.data.action === "watch") {
    progress.watched = true;
    progress.watchedAt = new Date();
  }

  await progress.save();
  return json(progress, { status: 201 });
}
