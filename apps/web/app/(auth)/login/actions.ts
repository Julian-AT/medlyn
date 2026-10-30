"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  authConfigured,
  createSession,
  loginDestination,
  passwordMatches,
  SESSION_COOKIE,
  SESSION_SECONDS,
} from "../session";

export async function login(form: FormData): Promise<void> {
  const destination = loginDestination(form.get("next"));
  const password = form.get("password");
  if (!authConfigured()) redirect("/login?error=unavailable");
  if (typeof password !== "string" || !passwordMatches(password)) {
    redirect(`/login?error=invalid&next=${encodeURIComponent(destination)}`);
  }
  (await cookies()).set(SESSION_COOKIE, createSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  redirect(destination);
}
