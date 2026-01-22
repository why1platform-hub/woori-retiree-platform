import { dbConnect } from "@/lib/db";
import EmailChangeRequest from "@/models/EmailChangeRequest";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { json, error } from "@/lib/api";
import { getAuthFromCookies, requireRole } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ['superadmin']);
  if (!gate.ok) return error(gate.message, gate.status);
  await dbConnect();
  const items = await EmailChangeRequest.find().sort({ createdAt: -1 }).lean();
  return json({ requests: items });
}

const PatchBody = z.object({ id: z.string().min(1), action: z.enum(['approve','reject']) });
export async function PATCH(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ['superadmin']);
  if (!gate.ok) return error(gate.message, gate.status);
  const body = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) return error('Invalid input', 400);
  await dbConnect();
  const reqDoc = await EmailChangeRequest.findById(parsed.data.id);
  if (!reqDoc) return error('Not found', 404);
  if (parsed.data.action === 'approve') {
    // set user email
    const user = await User.findById(reqDoc.userId);
    if (!user) return error('User not found', 404);
    user.email = reqDoc.newEmail;
    await user.save();
    reqDoc.status = 'approved'; reqDoc.processedBy = auth!.sub as any; reqDoc.processedAt = new Date(); await reqDoc.save();
    // notify user
    await Notification.create({ userId: user._id, type: 'email_change', text: `Your email change request has been approved. New email: ${user.email}`, payload: { requestId: reqDoc._id } });
    return json({ ok: true, request: reqDoc });
  } else {
    reqDoc.status = 'rejected'; reqDoc.processedBy = auth!.sub as any; reqDoc.processedAt = new Date(); await reqDoc.save();
    await Notification.create({ userId: reqDoc.userId, type: 'email_change', text: `Your email change request was rejected.`, payload: { requestId: reqDoc._id } });
    return json({ ok: true, request: reqDoc });
  }
}
