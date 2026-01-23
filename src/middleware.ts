import { NextResponse, type NextRequest } from "next/server";
import { getAuthFromRequest } from "@/lib/auth";
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const protectedPrefixes = ["/dashboard", "/programs", "/my-activity", "/jobs", "/learning", "/support", "/admin", "/instructor", "/profile", "/consultation"];

// Create the next-intl middleware
const intlMiddleware = createMiddleware(routing);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Apply intl middleware first
  const intlResponse = intlMiddleware(req);

  // Get locale from pathname
  const locale = pathname.split('/')[1];
  const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';

  // Check auth for protected routes
  if (protectedPrefixes.some((p) => pathWithoutLocale.startsWith(p))) {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
    }

    if (pathWithoutLocale.startsWith("/admin") && auth.role !== "superadmin") {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
    }
    if (pathWithoutLocale.startsWith("/instructor") && auth.role !== "instructor" && auth.role !== "superadmin") {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
    }
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
