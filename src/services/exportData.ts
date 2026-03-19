import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserWorkspaceId } from "@/services/workspace";
import JSZip from "jszip";
import { saveAs } from "file-saver";

type TableConfig = {
  name: string;
  label: string;
  filterByWorkspace: boolean;
  workspaceColumn?: string;
};

const TABLES: TableConfig[] = [
  { name: "projetos", label: "Projetos", filterByWorkspace: true, workspaceColumn: "workspace_id" },
  { name: "clientes", label: "Clientes", filterByWorkspace: true, workspaceColumn: "workspace_id" },
  { name: "fornecedores", label: "Fornecedores", filterByWorkspace: true, workspaceColumn: "workspace_id" },
  { name: "etapas", label: "Etapas", filterByWorkspace: false },
  { name: "subetapas", label: "Subetapas", filterByWorkspace: false },
  { name: "tarefas", label: "Tarefas", filterByWorkspace: false },
  { name: "tarefa_responsaveis", label: "Tarefa_Responsaveis", filterByWorkspace: false },
  { name: "arquivos", label: "Arquivos", filterByWorkspace: true, workspaceColumn: "workspace_id" },
  { name: "comentarios", label: "Comentarios", filterByWorkspace: true, workspaceColumn: "workspace_id" },
  { name: "aprovacoes", label: "Aprovacoes", filterByWorkspace: false },
  { name: "eventos", label: "Eventos", filterByWorkspace: true, workspaceColumn: "workspace_id" },
  { name: "parcelas", label: "Parcelas", filterByWorkspace: false },
  { name: "revisoes", label: "Revisoes", filterByWorkspace: false },
  { name: "solicitacoes_fornecedores", label: "Solicitacoes_Fornecedores", filterByWorkspace: false },
  { name: "orcamentos", label: "Orcamentos", filterByWorkspace: false },
  { name: "notificacoes", label: "Notificacoes", filterByWorkspace: true, workspaceColumn: "workspace_id" },
  { name: "time_entries", label: "Time_Entries", filterByWorkspace: true, workspaceColumn: "workspace_id" },
  { name: "visitas_obra", label: "Visitas_Obra", filterByWorkspace: true, workspaceColumn: "workspace_id" },
  { name: "profiles", label: "Usuarios", filterByWorkspace: false },
  { name: "workspaces", label: "Workspace", filterByWorkspace: false },
  { name: "user_roles", label: "User_Roles", filterByWorkspace: false },
  { name: "obra_draft_media", label: "Obra_Draft_Media", filterByWorkspace: true, workspaceColumn: "workspace_id" },
];

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ];
  return lines.join("\n");
}

async function fetchTable(tableName: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.from(tableName as any).select("*");
  if (error) {
    console.warn(`Erro ao exportar ${tableName}:`, error.message);
    return [];
  }
  return (data as Record<string, unknown>[]) ?? [];
}

async function fetchStorageFiles(): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.storage.from("project-files").list("", { limit: 1000 });
  if (error) {
    console.warn("Erro ao listar storage:", error.message);
    return [];
  }
  return (data ?? []).map((f) => ({
    name: f.name,
    id: f.id,
    created_at: f.created_at,
    updated_at: f.updated_at,
    last_accessed_at: f.last_accessed_at,
    metadata: JSON.stringify(f.metadata),
  }));
}

export async function exportAllDataAsZip(onProgress?: (msg: string) => void) {
  const zip = new JSZip();
  const report = (msg: string) => onProgress?.(msg);

  report("Iniciando exportação...");

  for (const table of TABLES) {
    report(`Exportando ${table.label}...`);
    const rows = await fetchTable(table.name);
    if (rows.length > 0) {
      zip.file(`${table.label}.csv`, toCsv(rows));
    }
  }

  report("Exportando lista de arquivos do Storage...");
  const storageFiles = await fetchStorageFiles();
  if (storageFiles.length > 0) {
    zip.file("Storage_Files.csv", toCsv(storageFiles));
  }

  report("Gerando arquivo ZIP...");
  const blob = await zip.generateAsync({ type: "blob" });
  const date = new Date().toISOString().slice(0, 10);
  saveAs(blob, `arquify-export-${date}.zip`);
  report("Exportação concluída!");
}
