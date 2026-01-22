import { dbConnect } from "@/lib/db";
import Inquiry from "@/models/Inquiry";
import { json, error } from "@/lib/api";
import { getAuthFromCookies, requireRole } from "@/lib/auth";
import { z } from "zod";

export async function GET(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["user", "superadmin", "instructor"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "true";

  await dbConnect();

  // Superadmin can see all inquiries with ?all=true, others see only their own
  const filter = (auth!.role === "superadmin" && all) ? {} : { userId: auth!.sub };
  const items = await Inquiry.find(filter)
    .populate("userId", "name email")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return json({ inquiries: items });
}

const Body = z.object({
  subject: z.string().min(2),
  message: z.string().min(2),
});

export async function POST(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["user","instructor","superadmin"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid input", 400);

  await dbConnect();
  const created = await Inquiry.create({ ...parsed.data, userId: auth!.sub });
  return json({ inquiry: created }, { status: 201 });
}

const ReplyBody = z.object({
  inquiryId: z.string().min(1),
  reply: z.string().min(1),
});

export async function PATCH(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["instructor","superadmin"]);
  if (!gate.ok) { console.error('PATCH /api/support/inquiries unauthorized', { auth, gate }); return error(gate.message, gate.status); }

  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    const txt = await req.text().catch(() => null);
    console.error('PATCH /api/support/inquiries parse error - invalid JSON body', { err: e, text: txt });
    return error('Invalid JSON body', 400);
  }
  const parsed = ReplyBody.safeParse(body);
  if (!parsed.success) {
    console.error('PATCH /api/support/inquiries validation error', parsed.error);
    return error('Invalid input: ' + parsed.error.message, 400);
  }

  await dbConnect();
  const inquiry = await Inquiry.findById(parsed.data.inquiryId);
  if (!inquiry) return error("Inquiry not found", 404);

  inquiry.reply = parsed.data.reply;
  inquiry.status = "answered";
  await inquiry.save();

  return json({ inquiry });
}
