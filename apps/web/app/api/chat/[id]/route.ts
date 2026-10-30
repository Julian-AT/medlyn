import { deleteChat, loadChat } from "@medlyn/engine/agent/chat/history";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const chat = await loadChat((await params).id);
    return chat
      ? Response.json(chat, { headers: { "Cache-Control": "no-store" } })
      : Response.json({ error: "Chat not found" }, { status: 404 });
  } catch (error) {
    console.warn("chat_history_unavailable", {
      reason: error instanceof Error ? error.name : "Unknown",
    });
    return Response.json({ error: "Chat history unavailable" }, { status: 503 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return (await deleteChat((await params).id))
      ? new Response(null, { status: 204 })
      : Response.json({ error: "Chat not found" }, { status: 404 });
  } catch (error) {
    console.warn("chat_delete_unavailable", {
      reason: error instanceof Error ? error.name : "Unknown",
    });
    return Response.json({ error: "Chat history unavailable" }, { status: 503 });
  }
}
