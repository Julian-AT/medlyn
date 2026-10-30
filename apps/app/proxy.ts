import { NextResponse } from "next/server";

export function proxy() {
  if (process.env.NODE_ENV === "production") {
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
