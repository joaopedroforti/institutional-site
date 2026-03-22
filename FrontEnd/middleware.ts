import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const adminTokenCookieName = "forticorp-admin-token";
const adminLoginPath = "/admin/login";
const adminDashboardPath = "/admin/dashboard";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(adminTokenCookieName)?.value;

  if (pathname.startsWith("/admin")) {
    if (!token && pathname !== adminLoginPath) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = adminLoginPath;
      redirectUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (token && pathname === adminLoginPath) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = adminDashboardPath;
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

