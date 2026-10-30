import { ReviewRequest } from "@medlyn/engine/contracts";
import { activeReviews } from "@medlyn/engine/review/overlay";
import { appendReview, listReviews, resetReviews } from "@medlyn/engine/review/ledger";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  const parsed = ReviewRequest.pick({ sessionId: true }).safeParse({ sessionId });
  if (!parsed.success || !parsed.data.sessionId.trim()) return Response.json({ error: "A sessionId is required" }, { status: 400 });
  return Response.json(activeReviews(await listReviews(parsed.data.sessionId)));
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = ReviewRequest.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid review request", issues: parsed.error.issues }, { status: 400 });
  try {
    return Response.json(await appendReview(parsed.data), { status: 201 });
  } catch (error) {
    if (error instanceof Error && /Invalid review|correction needs|dismissal needs|fact has changed/.test(error.message)) return Response.json({ error: error.message }, { status: 409 });
    throw error;
  }
}

export async function DELETE(request: Request) {
  const querySession = new URL(request.url).searchParams.get("sessionId");
  const body: unknown = querySession ? { sessionId: querySession } : await request.json().catch(() => null);
  const parsed = ReviewRequest.pick({ sessionId: true }).safeParse(body);
  if (!parsed.success || !parsed.data.sessionId.trim()) return Response.json({ error: "A sessionId is required" }, { status: 400 });
  await resetReviews(parsed.data.sessionId);
  return Response.json({ entries: [] });
}
