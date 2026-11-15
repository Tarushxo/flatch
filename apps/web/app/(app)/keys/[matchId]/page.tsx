import type { Metadata } from "next";
import { ChatScreen } from "./chat-screen";

export const metadata: Metadata = { title: "Chat" };

export default async function ChatPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  return <ChatScreen matchId={matchId} />;
}
