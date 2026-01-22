import * as jose from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export type Role = "user" | "instructor" | "superadmin";

export type TokenPayload = {
  sub: string; // user id
  email: string;
  name: string;
  role: Role;
};

const COOKIE_NAME = "token";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: TokenPayload): Promise<string> {
  const secret = getSecret();
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const secret = getSecret();
  const { payload } = await jose.jwtVerify(token, secret);
  return payload as unknown as TokenPayload;
}

export function setAuthCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearAuthCookie() {
  cookies().set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export async function getAuthFromCookies(): Promise<TokenPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try { return await verifyToken(token); } catch { return null; }
}

export async function getAuthFromRequest(req: NextRequest): Promise<TokenPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try { return await verifyToken(token); } catch { return null; }
}

export function requireRole(auth: TokenPayload | null, roles: Role[]) {
  if (!auth) return { ok: false, status: 401 as const, message: "Unauthenticated" };
  if (!roles.includes(auth.role)) return { ok: false, status: 403 as const, message: "Forbidden" };
  return { ok: true as const };
}
