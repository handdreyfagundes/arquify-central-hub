import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Projeto = Database["public"]["Tables"]["projetos"]["Row"];
type ProjetoInsert = Database["public"]["Tables"]["projetos"]["Insert"];
type ProjetoUpdate = Database["public"]["Tables"]["projetos"]["Update"];

export async function listProjetos(workspaceId: string) {
  const { data, error } = await supabase
    .from("projetos")
    .select("*, clientes(nome)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getProjetoById(id: string) {
  const { data, error } = await supabase
    .from("projetos")
    .select("*, clientes(nome, email, telefone)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createProjeto(projeto: ProjetoInsert) {
  const { data, error } = await supabase
    .from("projetos")
    .insert(projeto)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProjeto(id: string, updates: ProjetoUpdate) {
  const { data, error } = await supabase
    .from("projetos")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProjeto(id: string) {
  const { error } = await supabase.from("projetos").delete().eq("id", id);
  if (error) throw error;
}

/** Load full project context with all related entities */
export async function getProjetoFullContext(projetoId: string) {
  const [projeto, etapas, tarefas, arquivos, comentarios, aprovacoes, fornecedores] =
    await Promise.all([
      supabase.from("projetos").select("*, clientes(*)").eq("id", projetoId).single(),
      supabase.from("etapas").select("*").eq("projeto_id", projetoId).order("ordem"),
      supabase.from("tarefas").select("*, profiles:responsavel_id(name)").eq("projeto_id", projetoId),
      supabase.from("arquivos").select("*").eq("projeto_id", projetoId).order("created_at", { ascending: false }),
      supabase.from("comentarios").select("*, profiles:user_id(name)").eq("projeto_id", projetoId).order("created_at", { ascending: false }),
      supabase.from("aprovacoes").select("*, etapas(nome), clientes(nome)").eq("projeto_id", projetoId),
      supabase.from("solicitacoes_fornecedores").select("*, fornecedores(nome, categoria)").eq("projeto_id", projetoId),
    ]);

  if (projeto.error) throw projeto.error;

  return {
    projeto: projeto.data,
    etapas: etapas.data ?? [],
    tarefas: tarefas.data ?? [],
    arquivos: arquivos.data ?? [],
    comentarios: comentarios.data ?? [],
    aprovacoes: aprovacoes.data ?? [],
    fornecedores: fornecedores.data ?? [],
  };
}
