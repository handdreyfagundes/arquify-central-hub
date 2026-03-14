import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type EtapaInsert = Database["public"]["Tables"]["etapas"]["Insert"];
type EtapaUpdate = Database["public"]["Tables"]["etapas"]["Update"];

export async function listEtapasByProjeto(projetoId: string) {
  const { data, error } = await supabase
    .from("etapas")
    .select("*")
    .eq("projeto_id", projetoId)
    .order("ordem");

  if (error) throw error;
  return data;
}

export async function createEtapa(etapa: EtapaInsert) {
  const { data, error } = await supabase
    .from("etapas")
    .insert(etapa)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEtapa(id: string, updates: EtapaUpdate) {
  const { data, error } = await supabase
    .from("etapas")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEtapa(id: string) {
  const { error } = await supabase.from("etapas").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderEtapas(items: { id: string; ordem: number }[]) {
  const promises = items.map(({ id, ordem }) =>
    supabase.from("etapas").update({ ordem }).eq("id", id)
  );
  const results = await Promise.all(promises);
  const err = results.find((r) => r.error);
  if (err?.error) throw err.error;
}
