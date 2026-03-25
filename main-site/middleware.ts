import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/lp-([a-z0-9-]+)$/i);
  if (!match) {
    return NextResponse.next();
  }

  const slug = match[1];
  const url = request.nextUrl.clone();
  url.pathname = `/lp/${slug}`;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/lp-:path*"],
};
