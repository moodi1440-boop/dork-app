import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAdminPassword } from "@/lib/admin-password";
import { verifyOwnerSession } from "@/lib/owner-session";

export async function middleware(req: NextRequest) {
  const path       = req.nextUrl.pathname;
  const isApi      = path.startsWith("/api");
  const isLogin    = path.startsWith("/login");
  const isOwner    = path.startsWith("/owner");
  const isOwnerApi = path.startsWith("/api/owner");
  const isAuthApi  = path === "/api/auth" || path.startsWith("/api/auth/");

  // Owner API routes manage their own session cookie/auth internally
  if (isOwnerApi) return NextResponse.next();

  // Admin login/logout API must stay reachable even with no password configured yet
  if (isAuthApi) return NextResponse.next();

  const correct = await getAdminPassword();

  // All other admin API routes: require the admin cookie, no exceptions
  if (isApi) {
    const adminCookie = req.cookies.get("dork_admin")?.value;
    const authed = correct !== null && !!adminCookie && adminCookie === correct;
    if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.next();
  }

  // Owner portal pages
  if (isOwner) {
    const ownerCookie  = req.cookies.get("dork_owner_session")?.value;
    const ownerSalonId = await verifyOwnerSession(ownerCookie);
    const isOwnerLogin = path === "/owner-login" || path === "/owner/login";
    if (!ownerSalonId && !isOwnerLogin) return NextResponse.redirect(new URL("/owner-login", req.url));
    if (ownerSalonId  &&  isOwnerLogin) return NextResponse.redirect(new URL("/owner", req.url));
    return NextResponse.next();
  }

  // Owner login page - no auth needed
  if (path === "/owner-login") return NextResponse.next();

  // Admin panel auth
  const adminCookie = req.cookies.get("dork_admin")?.value;
  const authed      = correct !== null && !!adminCookie && adminCookie === correct;

  if (!authed && !isLogin) return NextResponse.redirect(new URL("/login", req.url));
  if (authed  &&  isLogin) return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
