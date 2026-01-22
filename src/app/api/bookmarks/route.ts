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
  return json(items);
}

const Body = z.object({ jobId: z.string().min(1) });

export async function POST(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["user","superadmin","instructor"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid input", 400);

  await dbConnect();
  const created = await Bookmark.create({ userId: auth!.sub, jobId: parsed.data.jobId }).catch((e:any) => {
    if (String(e?.code) === "11000") return null;
    throw e;
  });
  return json({ ok: true, created: Boolean(created) }, { status: 201 });
}

export async function DELETE(req: Request) {
  const auth = await getAuthFromCookies();
  const gate = requireRole(auth, ["user","superadmin","instructor"]);
  if (!gate.ok) return error(gate.message, gate.status);

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  if (!jobId) return error("Missing jobId", 400);

  await dbConnect();
  await Bookmark.deleteOne({ userId: auth!.sub, jobId });
  return json({ ok: true });
}
