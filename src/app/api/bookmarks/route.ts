import { dbConnect } from "@/lib/db";
import Bookmark from "@/models/Bookmark";
import { json, error } from "@/lib/api";
import { getAuthFromCookies, requireRole } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["user","superadmin","instructor"]);
  if (!gate.ok) return error(gate.message, gate.status);

  await dbConnect();
  const items = await Bookmark.find({ userId: auth!.sub }).populate("jobId").sort({ createdAt: -1 }).lean();
  // Transform to expected format: { _id, job: {...} }
  const bookmarks = items.map((item: any) => ({
    _id: item._id,
    job: item.jobId ? String(item.jobId._id || item.jobId) : null,
    jobData: item.jobId,
    createdAt: item.createdAt,
  }));
  return json({ bookmarks });
}

const Body = z.object({ jobId: z.string().min(1) });

export async function POST(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["user","superadmin","instructor"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid input", 400);

  await dbConnect();

  // Check if already bookmarked
  const existing = await Bookmark.findOne({ userId: auth!.sub, jobId: parsed.data.jobId });
  if (existing) {
    return json({ bookmark: { _id: existing._id, job: parsed.data.jobId } }, { status: 200 });
  }

  const created = await Bookmark.create({ userId: auth!.sub, jobId: parsed.data.jobId });
  return json({ bookmark: { _id: created._id, job: parsed.data.jobId } }, { status: 201 });
}

export async function DELETE(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["user","superadmin","instructor"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id"); // bookmark _id
  const jobId = searchParams.get("jobId"); // or job _id

  if (!id && !jobId) return error("Missing id or jobId", 400);

  await dbConnect();

  if (id) {
    // Delete by bookmark _id
    await Bookmark.deleteOne({ _id: id, userId: auth!.sub });
  } else if (jobId) {
    // Delete by jobId
    await Bookmark.deleteOne({ userId: auth!.sub, jobId });
  }

  return json({ ok: true });
}
