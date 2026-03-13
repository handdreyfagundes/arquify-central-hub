import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type FornecedorInsert = Database["public"]["Tables"]["fornecedores"]["Insert"];
type FornecedorUpdate = Database["public"]["Tables"]["fornecedores"]["Update"];

export async function listFornecedores(workspaceId: string) {
  const { data, error } = await supabase
    .from("fornecedores")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("nome");

  if (error) throw error;
  return data;
}

export async function getFornecedorById(id: string) {
  const { data, error } = await supabase
    .from("fornecedores")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createFornecedor(fornecedor: FornecedorInsert) {
  const { data, error } = await supabase
    .from("fornecedores")
    .insert(fornecedor)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateFornecedor(id: string, updates: FornecedorUpdate) {
  const { data, error } = await supabase
    .from("fornecedores")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFornecedor(id: string) {
  const { error } = await supabase.from("fornecedores").delete().eq("id", id);
  if (error) throw error;
}
