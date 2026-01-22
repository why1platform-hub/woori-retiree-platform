import { dbConnect } from '@/lib/db';
import Follow from '@/models/Follow';
import { json, error } from '@/lib/api';
import { getAuthFromCookies } from '@/lib/auth';
import { z } from 'zod';

const Body = z.object({ userId: z.string().min(1) });
export async function POST(req: Request) {
  const auth = await getAuthFromCookies();
  if (!auth) return error('Unauthorized', 401);
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) return error('Invalid input', 400);
  await dbConnect();
  const existing = await Follow.findOne({ followerId: auth.sub, followeeId: parsed.data.userId });
  if (existing) {
    await Follow.findByIdAndDelete(existing._id);
    return json({ ok: true, following: false });
  } else {
    await Follow.create({ followerId: auth.sub, followeeId: parsed.data.userId });
    // notify followee
    const Notification = (await import('@/models/Notification')).default;
    await Notification.create({ userId: parsed.data.userId, type: 'follow', text: `${auth.name} started following you`, payload: { followerId: auth.sub } });
    return json({ ok: true, following: true });
  }
}