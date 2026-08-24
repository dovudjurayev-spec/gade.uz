import { NextResponse, type NextRequest } from "next/server";

// Middleware работает в Edge runtime — не можем импортировать node:crypto.
// Здесь только базовая защита: если cookie нет — редирект.
// Проверка подписи и срока — на сервере в getAdminSession().
const MOBILE_UA = /iphone|ipod|android.*mobile|windows phone|blackberry|bb10|iemobile|opera mini|mobile safari/i;
const TABLET_UA = /ipad|android(?!.*mobile)|tablet/i;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const ua = req.headers.get("user-agent") ?? "";
  if (MOBILE_UA.test(ua) || TABLET_UA.test(ua)) {
    if (pathname !== "/admin/blocked") {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/blocked";
      url.search = "";
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

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
