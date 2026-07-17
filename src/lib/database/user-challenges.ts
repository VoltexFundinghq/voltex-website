import { createClient } from "@/lib/supabase/server";
import type { UserChallenge } from "@/lib/types/database";

export async function getMyChallenges(): Promise<UserChallenge[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_challenges")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data;
}

export async function getUserChallengeById(id: string): Promise<UserChallenge | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_challenges")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data;
}
