import { deleteChat, loadChat } from "@medlyn/engine/agent/chat/history";
import { patientIdFromRequest } from "../../../../lib/active-patient.ts";
import { visibleChatMessages } from "../history-view";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const chat = await loadChat((await params).id, patientIdFromRequest(request));
    return chat
      ? Response.json(
          { ...chat, messages: visibleChatMessages(chat.messages) },
          { headers: { "Cache-Control": "no-store" } },
        )
      : Response.json({ error: "Chat not found" }, { status: 404 });
  } catch (error) {
    console.warn("chat_history_unavailable", {
      reason: error instanceof Error ? error.name : "Unknown",
    });
    return Response.json({ error: "Chat history unavailable" }, { status: 503 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return (await deleteChat((await params).id, patientIdFromRequest(request)))
      ? new Response(null, { status: 204 })
      : Response.json({ error: "Chat not found" }, { status: 404 });
  } catch (error) {
    console.warn("chat_delete_unavailable", {
      reason: error instanceof Error ? error.name : "Unknown",
    });
    return Response.json({ error: "Chat history unavailable" }, { status: 503 });
  }
}
