import { supabase } from "@/integrations/supabase/client";

export interface Subetapa {
  id: string;
  etapa_id: string;
  nome: string;
  ordem: number;
  intervalo_dias: number;
  data_entrega: string | null;
  status: string;
  created_at: string;
}

export interface Revisao {
  id: string;
  subetapa_id: string;
  numero_revisao: number;
  data_solicitacao: string;
  prazo_dias: number;
  data_nova_entrega: string | null;
  observacoes: string | null;
  approval_status: string | null;
  created_at: string;
}

export async function listSubetapasByEtapa(etapaId: string): Promise<Subetapa[]> {
  const { data, error } = await supabase
    .from("subetapas")
    .select("*")
    .eq("etapa_id", etapaId)
    .order("ordem");
  if (error) throw error;
  return (data ?? []) as Subetapa[];
}

export async function createSubetapa(sub: {
  etapa_id: string;
  nome: string;
  ordem: number;
  intervalo_dias: number;
  data_entrega?: string | null;
  status?: string;
}): Promise<Subetapa> {
  const { data, error } = await supabase
    .from("subetapas")
    .insert(sub)
    .select()
    .single();
  if (error) throw error;
  return data as Subetapa;
}

export async function updateSubetapa(
  id: string,
  updates: Partial<Pick<Subetapa, "nome" | "ordem" | "intervalo_dias" | "data_entrega" | "status">>
): Promise<Subetapa> {
  const { data, error } = await supabase
    .from("subetapas")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Subetapa;
}

export async function deleteSubetapa(id: string) {
  const { error } = await supabase.from("subetapas").delete().eq("id", id);
  if (error) throw error;
}

export async function bulkUpdateSubetapaDates(items: { id: string; data_entrega: string }[]) {
  const promises = items.map(({ id, data_entrega }) =>
    supabase.from("subetapas").update({ data_entrega }).eq("id", id)
  );
  const results = await Promise.all(promises);
  const err = results.find((r) => r.error);
  if (err?.error) throw err.error;
}

// Revisoes
export async function listRevisoesBySubetapa(subetapaId: string): Promise<Revisao[]> {
  const { data, error } = await supabase
    .from("revisoes")
    .select("*")
    .eq("subetapa_id", subetapaId)
    .order("numero_revisao");
  if (error) throw error;
  return (data ?? []) as Revisao[];
}

export async function listRevisoesByEtapa(etapaId: string): Promise<Revisao[]> {
  const { data, error } = await supabase
    .from("revisoes")
    .select("*")
    .eq("etapa_id", etapaId)
    .is("subetapa_id", null)
    .order("numero_revisao");
  if (error) throw error;
  return (data ?? []) as Revisao[];
}

export async function createRevisao(rev: {
  subetapa_id?: string | null;
  etapa_id?: string | null;
  numero_revisao: number;
  data_solicitacao: string;
  prazo_dias: number;
  data_nova_entrega: string;
  observacoes?: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from("revisoes")
    .insert(rev);
  if (error) throw error;
}

export async function updateRevisao(
  id: string,
  updates: Partial<Pick<Revisao, "data_solicitacao" | "prazo_dias" | "data_nova_entrega" | "observacoes">>
): Promise<Revisao> {
  const { data, error } = await supabase
    .from("revisoes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Revisao;
}

export async function deleteRevisao(id: string) {
  const { error } = await supabase.from("revisoes").delete().eq("id", id);
  if (error) throw error;
}
