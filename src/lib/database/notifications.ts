import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Notification } from "@/lib/types/database";

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

export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await (supabase.from("notifications") as any)
    .update({ is_read: true })
    .eq("id", notificationId);

  return !error;
}

export async function createNotification(params: {
  userId: string;
  title: string;
  message: string;
}): Promise<boolean> {
  const serviceClient = createServiceClient();
  const { error } = await (serviceClient.from("notifications") as any).insert({
    user_id: params.userId,
    title: params.title,
    message: params.message,
    is_read: false,
  });

  return !error;
}
