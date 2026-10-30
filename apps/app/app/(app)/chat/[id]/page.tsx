import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { LocalChat } from "@/components/chat/local-chat";

export const metadata: Metadata = { title: "Conversation · Medlyn" };

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  return <LocalChat key={id} id={id} />;
}
