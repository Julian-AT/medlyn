import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authConfigured, loginDestination } from "../session";
import { login } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const query = await searchParams;
  const configured = authConfigured();
  const message = !configured
    ? "Demo access is being configured. Please try again later."
    : query.error === "invalid"
      ? "That password did not match. Please try again."
      : null;

  return (
    <Card className="mx-auto mt-[15vh] w-[calc(100%-2rem)] max-w-sm shadow-xs">
      <CardHeader>
        <CardTitle className="text-2xl">Medlyn</CardTitle>
        <CardDescription>
          Enter the demo password to explore source-linked clinical evidence.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={login}>
          <input type="hidden" name="next" value={loginDestination(query.next)} />
          <Label htmlFor="password">Demo password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={1024}
            disabled={!configured}
            aria-invalid={query.error === "invalid"}
            aria-describedby={message ? "login-message" : undefined}
            className="mt-2"
          />
          {message && (
            <CardDescription id="login-message" role="alert" className="mt-3">
              {message}
            </CardDescription>
          )}
          <Button type="submit" disabled={!configured} className="mt-5 w-full">
            Open demo
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
