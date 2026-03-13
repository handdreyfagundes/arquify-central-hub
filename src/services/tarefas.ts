import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TarefaInsert = Database["public"]["Tables"]["tarefas"]["Insert"];
type TarefaUpdate = Database["public"]["Tables"]["tarefas"]["Update"];

export async function listTarefasByProjeto(projetoId: string) {
  const { data, error } = await supabase
    .from("tarefas")
    .select("*, etapas(nome)")
    .eq("projeto_id", projetoId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function listTarefasByResponsavel(userId: string) {
  const { data, error } = await supabase
    .from("tarefas")
    .select("*, projetos(nome), etapas(nome)")
    .eq("responsavel_id", userId)
    .order("prazo_limite", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createTarefa(tarefa: TarefaInsert) {
  const { data, error } = await supabase
    .from("tarefas")
    .insert(tarefa)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTarefa(id: string, updates: TarefaUpdate) {
  const { data, error } = await supabase
    .from("tarefas")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTarefa(id: string) {
  const { error } = await supabase.from("tarefas").delete().eq("id", id);
  if (error) throw error;
}
