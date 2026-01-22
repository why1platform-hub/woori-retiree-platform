import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { json } from '@/lib/api';

export async function GET() {
  await dbConnect();
  const instructors = await User.find({ role: 'instructor' }).select('name email').sort({ name: 1 }).lean();
  return json({ instructors });
}