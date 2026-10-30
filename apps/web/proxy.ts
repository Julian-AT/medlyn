import { type NextRequest, NextResponse } from "next/server";
import { authConfigured, SESSION_COOKIE, validSession } from "./app/(auth)/session";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/login") return NextResponse.next();
  // Local development stays open when no demo password is set; production always fails closed.
  if (!authConfigured() && process.env.NODE_ENV !== "production") return NextResponse.next();
  if (!authConfigured()) {
    return NextResponse.json(
      { error: "Demo access is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!validSession(request.cookies.get(SESSION_COOKIE)?.value)) {
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Sign in to access the demo." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    const response = NextResponse.redirect(login, 303);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
  if (process.env.NODE_ENV === "production") {
    if (pathname === "/api/research" || pathname.startsWith("/api/research/")) {
      return NextResponse.json({ error: "Research reports are local only." }, { status: 404 });
    }
    if (
      process.env.MEDLYN_MOCK === "1" ||
      ["local", "cascade"].includes(process.env.MEDLYN_VERIFIER ?? "") ||
      process.env.OPENAI_BASE_URL !== "https://api.openai.com/v1"
    ) {
      return NextResponse.json(
        { error: "Production services are not configured." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
  }
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static/|_next/image|favicon.ico$|icon.png$|apple-icon.png$).*)"],
};
