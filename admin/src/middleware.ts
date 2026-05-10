import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const isLogin = req.nextUrl.pathname.startsWith("/login");
  const isApi   = req.nextUrl.pathname.startsWith("/api");
  const cookie  = req.cookies.get("dork_admin")?.value;
  const authed  = cookie === process.env.ADMIN_SECRET;

  if (isApi)              return NextResponse.next();
  if (!authed && !isLogin) return NextResponse.redirect(new URL("/login", req.url));
  if (authed  &&  isLogin) return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
