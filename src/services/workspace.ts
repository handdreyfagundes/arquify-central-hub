import { supabase } from "@/integrations/supabase/client";

export async function getCurrentUserWorkspaceId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  return data?.workspace_id ?? null;
}

export async function getUserWorkspaceId(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("user_id", userId)
    .single();

  if (error || !data) throw new Error("Workspace não encontrado");
  return data.workspace_id;
}


export async function getCurrentUserRoles() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  return data?.map((r) => r.role) ?? [];
}
