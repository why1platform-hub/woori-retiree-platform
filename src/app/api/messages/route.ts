import { dbConnect } from "@/lib/db";
import Message from "@/models/Message";
import Notification from "@/models/Notification";
import { json, error } from "@/lib/api";
import { getAuthFromCookies } from "@/lib/auth";
import { z } from "zod";

const Body = z.object({ recipientId: z.string().min(1), content: z.string().min(1) });
export async function POST(req: Request) {
  const auth = await getAuthFromCookies();
  if (!auth) return error("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) return error("Invalid input", 400);
  await dbConnect();
  const msg = await Message.create({ senderId: auth.sub, recipientId: parsed.data.recipientId, content: parsed.data.content });
  // create notification for recipient
  await Notification.create({ userId: parsed.data.recipientId, type: 'message', text: `New message from ${auth.name}`, payload: { messageId: msg._id, senderId: auth.sub } });
  return json({ message: msg }, { status: 201 });
}

const QueryBody = z.object({ userId: z.string().min(1).optional() });
export async function GET(req: Request) {
  const auth = await getAuthFromCookies();
  if (!auth) return error("Unauthorized", 401);
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  await dbConnect();
  if (userId) {
    // conversation with userId
    const msgs = await Message.find({ $or: [{ senderId: auth.sub, recipientId: userId }, { senderId: userId, recipientId: auth.sub }] }).sort({ createdAt: 1 }).lean();
    return json({ messages: msgs });
  }
  // list recent conversations (group by counterpart)
  const msgs = await Message.find({ $or: [{ senderId: auth.sub }, { recipientId: auth.sub }] }).sort({ createdAt: -1 }).limit(100).lean();
  return json({ messages: msgs });
}
