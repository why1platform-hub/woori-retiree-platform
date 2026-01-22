import { dbConnect } from "@/lib/db";
import EmailChangeRequest from "@/models/EmailChangeRequest";
import { json, error } from "@/lib/api";
import { getAuthFromCookies } from "@/lib/auth";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { z } from "zod";

const Body = z.object({ newEmail: z.string().email() });
export async function POST(req: Request) {
  const auth = await getAuthFromCookies();
  if (!auth) return error("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) return error("Invalid input", 400);

  await dbConnect();
  // ensure no user has that email already
  const exists = await User.findOne({ email: parsed.data.newEmail });
  if (exists) return error("Email already in use", 409);

  const reqDoc = await EmailChangeRequest.create({ userId: auth.sub, newEmail: parsed.data.newEmail });

  // notify superadmins
  const admins = await User.find({ role: 'superadmin' }).lean();
  for (const adm of admins) {
    await Notification.create({ userId: adm._id, type: 'email_request', text: `Email change request: ${auth.email} → ${parsed.data.newEmail}`, payload: { requestId: reqDoc._id, userId: auth.sub } });
  }

  return json({ request: reqDoc }, { status: 201 });
}
