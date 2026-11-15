"use client";

import type { Match, Message } from "@repo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export const MATCHES_KEY = ["matches"] as const;
export const PENDING_LIKES_KEY = ["pending-likes"] as const;
export const messagesKey = (matchId: string) => ["messages", matchId] as const;

/*
 * There is no live connection to the server yet, so these ask again every few
 * seconds while the screen is open (the browser pauses this in a background
 * tab). A push connection can replace the timers later without touching the
 * screens.
 */
const MATCHES_EVERY_MS = 2500;
const MESSAGES_EVERY_MS = 2500;

/** The person's matches, kept fresh. */
export function useMatches() {
  return useQuery({
    queryKey: MATCHES_KEY,
    queryFn: () => api.getMatches(),
    refetchInterval: MATCHES_EVERY_MS,
  });
}

/** Likes that are still waiting for the lister. */
export function usePendingLikes() {
  return useQuery({
    queryKey: PENDING_LIKES_KEY,
    queryFn: () => api.getPendingLikes(),
    refetchInterval: MATCHES_EVERY_MS,
  });
}

/** The messages in one match, kept fresh while the chat is open. */
export function useMessages(matchId: string) {
  return useQuery({
    queryKey: messagesKey(matchId),
    queryFn: () => api.getMessages(matchId),
    refetchInterval: MESSAGES_EVERY_MS,
    retry: false,
  });
}

/** Send a message. It appears in the chat at once and is confirmed in the background. */
export function useSendMessage(matchId: string) {
  const queryClient = useQueryClient();
  const key = messagesKey(matchId);

  return useMutation({
    mutationFn: (body: string) => api.sendMessage(matchId, body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: key });
      const before = queryClient.getQueryData<Message[]>(key);
      const draft: Message = {
        id: `sending-${Date.now()}`,
        matchId,
        from: "me",
        body,
        sentAt: new Date().toISOString(),
      };
      queryClient.setQueryData<Message[]>(key, (current) => [...(current ?? []), draft]);
      return { before };
    },
    onError: (_error, _body, context) => {
      queryClient.setQueryData(key, context?.before);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: MATCHES_KEY });
    },
  });
}

/** Mark a match as read and refresh the unread counts. */
export function useMarkRead(matchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.markRead(matchId),
    onSuccess: () => {
      // Clear the count straight away so the badge does not linger.
      queryClient.setQueryData<Match[]>(MATCHES_KEY, (current) =>
        current?.map((match) => (match.id === matchId ? { ...match, unreadCount: 0 } : match)),
      );
    },
  });
}
