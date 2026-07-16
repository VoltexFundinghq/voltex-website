import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/lib/types/database";

/**
 * Fetches all notifications for the currently logged-in user, most recent first.
 */
export async function getMyNotifications(): Promise<Notification[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data;
}

/**
 * Marks a single notification as read. RLS ensures a user can only
 * update their own notifications, regardless of the id passed in.
 */
export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  return !error;
}
