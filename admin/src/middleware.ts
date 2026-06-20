import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAdminPassword } from "@/lib/admin-password";

export async function middleware(req: NextRequest) {
  const path       = req.nextUrl.pathname;
  const isApi      = path.startsWith("/api");
  const isLogin    = path.startsWith("/login");
  const isOwner    = path.startsWith("/owner");
  const isOwnerApi = path.startsWith("/api/owner");

  // Allow all API routes and static files to pass through
  if (isApi) return NextResponse.next();

  // Owner portal auth
  if (isOwner) {
    const ownerCookie = req.cookies.get("dork_owner_session")?.value;
    const isOwnerLogin = path === "/owner-login" || path === "/owner/login";
    if (!ownerCookie && !isOwnerLogin) return NextResponse.redirect(new URL("/owner-login", req.url));
    if (ownerCookie && isOwnerLogin)   return NextResponse.redirect(new URL("/owner", req.url));
    return NextResponse.next();
  }

  // Owner login page - no auth needed
  if (path === "/owner-login") return NextResponse.next();

  // Admin panel auth
  const adminCookie = req.cookies.get("dork_admin")?.value;
  const authed      = !!adminCookie && adminCookie === (await getAdminPassword());

  if (!authed && !isLogin) return NextResponse.redirect(new URL("/login", req.url));
  if (authed  &&  isLogin) return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
