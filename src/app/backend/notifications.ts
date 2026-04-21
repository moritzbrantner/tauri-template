import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { callBackend } from "./errors";

export const notificationEvents = {
  created: "notification://created",
  updated: "notification://updated",
  outboxFlushed: "outbox://flushed",
} as const;

export type Notification = {
  id: string;
  title: string;
  body: string;
  kind: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateNotificationInput = {
  title: string;
  body: string;
  kind?: string;
};

export type QueueMessageInput = {
  channel: string;
  payload: unknown;
};

export type QueuedMessage = {
  id: string;
  channel: string;
  payload: unknown;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type FlushResult = {
  queued: number;
  sent: number;
};

export function listNotifications(): Promise<Notification[]> {
  return callBackend<Notification[]>("list_notifications");
}

export function createNotification(
  input: CreateNotificationInput,
): Promise<Notification> {
  return callBackend<Notification>("create_notification", { input });
}

export function markNotificationRead(id: string): Promise<boolean> {
  return callBackend<boolean>("mark_notification_read", { id });
}

export function markAllNotificationsRead(): Promise<number> {
  return callBackend<number>("mark_all_notifications_read");
}

export function deleteNotification(id: string): Promise<boolean> {
  return callBackend<boolean>("delete_notification", { id });
}

export function queueMessage(input: QueueMessageInput): Promise<QueuedMessage> {
  return callBackend<QueuedMessage>("queue_message", { input });
}

export function flushOutbox(): Promise<FlushResult> {
  return callBackend<FlushResult>("flush_outbox");
}

export function onNotificationCreated(
  handler: (notification: Notification) => void,
): Promise<UnlistenFn> {
  return listen<Notification>(notificationEvents.created, (event) =>
    handler(event.payload),
  );
}
