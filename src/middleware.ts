import { NextResponse, type NextRequest } from "next/server";

// Middleware работает в Edge runtime — не можем импортировать node:crypto.
// Здесь только базовая защита: если cookie нет — редирект.
// Проверка подписи и срока — на сервере в getAdminSession().
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();
  if (pathname === "/admin/login") return NextResponse.next();

  const cookie = req.cookies.get("gade_admin");
  if (!cookie?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
