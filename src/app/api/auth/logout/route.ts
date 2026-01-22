import { json } from "@/lib/api";
import { clearAuthCookie } from "@/lib/auth";

export async function POST() {
  clearAuthCookie();
  return json({ ok: true });
}
