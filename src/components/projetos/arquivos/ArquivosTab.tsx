import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, Pencil, FolderPlus, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { listEtapasByProjeto } from "@/services/etapas";
import { listSubetapasByEtapa, listRevisoesBySubetapa, listRevisoesByEtapa } from "@/services/subetapas";
import type { Subetapa, Revisao } from "@/services/subetapas";
import ProjetoSubTab from "./ProjetoSubTab";
import GenericFileTab, { loadTabTemplates, saveTabTemplates, type TabTemplate } from "./GenericFileTab";
import RecebidosTab from "./RecebidosTab";
import ObraTab from "./ObraTab";

interface Etapa {
  id: string;
  nome: string;
  ordem: number;
  projeto_id: string;
}

interface ArquivosTabProps {
  projetoId: string;
}

const DEFAULT_TABS = ["Projeto", "Recebidos", "Obra"];

const ArquivosTab = ({ projetoId }: ArquivosTabProps) => {
  const [activeTab, setActiveTab] = useState("Projeto");
  const [customTabs, setCustomTabs] = useState<string[]>([]);
  const [showAddTab, setShowAddTab] = useState(false);
  const [addStep, setAddStep] = useState<"choose" | "manual" | "template">("choose");
  const [newTabName, setNewTabName] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [renamingIndex, setRenamingIndex] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [templates, setTemplates] = useState<TabTemplate[]>([]);

  // Cronograma data
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [subetapasMap, setSubetapasMap] = useState<Record<string, Subetapa[]>>({});
  const [revisionsMap, setRevisionsMap] = useState<Record<string, Revisao[]>>({});
  const [stageRevisionsMap, setStageRevisionsMap] = useState<Record<string, Revisao[]>>({});
  const [loading, setLoading] = useState(true);

  const allTabs = [...DEFAULT_TABS, ...customTabs];

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("workspace_id")
        .eq("user_id", userData.user.id)
        .single();
      if (data) setWorkspaceId(data.workspace_id);
    })();
  }, []);

  const loadCronograma = useCallback(async () => {
    setLoading(true);
    try {
      const stages = await listEtapasByProjeto(projetoId);
      setEtapas(stages);

      const subMap: Record<string, Subetapa[]> = {};
      const revMap: Record<string, Revisao[]> = {};
      const stgRevMap: Record<string, Revisao[]> = {};

      await Promise.all(
        stages.map(async (stage) => {
          const subs = await listSubetapasByEtapa(stage.id);
          subMap[stage.id] = subs;

          if (subs.length === 0) {
            const stgRevs = await listRevisoesByEtapa(stage.id);
            stgRevMap[stage.id] = stgRevs;
          } else {
            await Promise.all(
              subs.map(async (sub) => {
                const revs = await listRevisoesBySubetapa(sub.id);
                revMap[sub.id] = revs;
              })
            );
          }
        })
      );

      setSubetapasMap(subMap);
      setRevisionsMap(revMap);
      setStageRevisionsMap(stgRevMap);
    } catch (e) {
      console.error("Error loading cronograma for arquivos", e);
    } finally {
      setLoading(false);
    }
  }, [projetoId]);

  useEffect(() => {
    loadCronograma();
  }, [loadCronograma]);

  useEffect(() => {
    const stored = localStorage.getItem(`arquify-custom-tabs-${projetoId}`);
    if (stored) {
      try { setCustomTabs(JSON.parse(stored)); } catch {}
    }
  }, [projetoId]);

  const saveCustomTabs = (tabs: string[]) => {
    setCustomTabs(tabs);
    localStorage.setItem(`arquify-custom-tabs-${projetoId}`, JSON.stringify(tabs));
  };

  const handleAddTab = () => {
    const name = newTabName.trim();
    if (!name || allTabs.includes(name)) return;
    saveCustomTabs([...customTabs, name]);
    setNewTabName("");
    setShowAddTab(false);
    setAddStep("choose");
    setActiveTab(name);
  };

  const handleAddFromTemplate = (template: TabTemplate) => {
    // Use template name as tab name, dedup if needed
    let name = template.name;
    let counter = 1;
    while (allTabs.includes(name)) {
      counter++;
      name = `${template.name} (${counter})`;
    }
    saveCustomTabs([...customTabs, name]);

    // Apply template structure ONLY (sections + view mode, never files)
    const abaKey = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
    localStorage.setItem(`arquify-custom-tab-sections-${projetoId}-${abaKey}`, JSON.stringify(template.sections));
    // Ensure no file-section mapping carries over — start with empty content
    localStorage.removeItem(`arquify-custom-tab-file-sections-${projetoId}-${abaKey}`);

    setShowAddTab(false);
    setAddStep("choose");
    setActiveTab(name);
  };

  const handleDeleteTemplate = (templateId: string) => {
    const updated = templates.filter((t) => t.id !== templateId);
    setTemplates(updated);
    saveTabTemplates(updated);
  };

  const openAddDialog = () => {
    setAddStep("choose");
    setNewTabName("");
    setTemplates(loadTabTemplates());
    setShowAddTab(true);
  };

  const handleRemoveTab = async (name: string) => {
    const abaKey = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");

    // Delete files from storage and database for this tab
    const { data: files } = await supabase
      .from("arquivos")
      .select("id, storage_path")
      .eq("projeto_id", projetoId)
      .eq("aba", abaKey);

    if (files && files.length > 0) {
      const storagePaths = files.map((f) => f.storage_path).filter(Boolean) as string[];
      if (storagePaths.length > 0) {
        await supabase.storage.from("project-files").remove(storagePaths);
      }
      const ids = files.map((f) => f.id);
      await supabase.from("arquivos").delete().in("id", ids);
    }

    // Clean up localStorage
    localStorage.removeItem(`arquify-custom-tab-sections-${projetoId}-${abaKey}`);
    localStorage.removeItem(`arquify-custom-tab-file-sections-${projetoId}-${abaKey}`);

    saveCustomTabs(customTabs.filter((t) => t !== name));
    if (activeTab === name) setActiveTab("Projeto");
  };

  const startRename = (index: number) => {
    setRenamingIndex(index);
    setRenameValue(customTabs[index]);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const commitRename = () => {
    if (renamingIndex === null) return;
    const trimmed = renameValue.trim();
    const oldName = customTabs[renamingIndex];
    if (!trimmed || (trimmed !== oldName && allTabs.includes(trimmed))) {
      setRenamingIndex(null);
      return;
    }
    const updated = [...customTabs];
    updated[renamingIndex] = trimmed;
    saveCustomTabs(updated);
    if (activeTab === oldName) setActiveTab(trimmed);
    setRenamingIndex(null);
  };

  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-0">
        {allTabs.map((tab) => {
          const customIndex = customTabs.indexOf(tab);
          const isCustom = customIndex !== -1;
          const isRenaming = isCustom && renamingIndex === customIndex;

          return (
            <button
              key={tab}
              onClick={() => !isRenaming && setActiveTab(tab)}
              className={`relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors rounded-t-lg group ${
                activeTab === tab
                  ? "bg-accent text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {isRenaming ? (
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setRenamingIndex(null);
                  }}
                  className="w-20 bg-transparent border-b border-primary outline-none text-sm font-medium text-foreground"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                tab
              )}
              {isCustom && !isRenaming && (
                <>
                  <Pencil
                    className="size-3 opacity-0 group-hover:opacity-50 hover:!opacity-100 cursor-pointer transition-opacity"
                    onClick={(e) => { e.stopPropagation(); startRename(customIndex); }}
                  />
                  <X
                    className="size-3 opacity-0 group-hover:opacity-50 hover:!opacity-100 cursor-pointer transition-opacity"
                    onClick={(e) => { e.stopPropagation(); handleRemoveTab(tab); }}
                  />
                </>
              )}
            </button>
          );
        })}
        <button
          onClick={openAddDialog}
          className="flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "Projeto" ? (
        <ProjetoSubTab
          projetoId={projetoId}
          workspaceId={workspaceId}
          etapas={etapas}
          subetapasMap={subetapasMap}
          revisionsMap={revisionsMap}
          stageRevisionsMap={stageRevisionsMap}
          loading={loading}
        />
      ) : activeTab === "Recebidos" ? (
        <RecebidosTab
          projetoId={projetoId}
          workspaceId={workspaceId}
        />
      ) : activeTab === "Obra" ? (
        <ObraTab
          projetoId={projetoId}
          workspaceId={workspaceId}
        />
      ) : (
        <GenericFileTab
          projetoId={projetoId}
          workspaceId={workspaceId}
          tabName={activeTab}
        />
      )}

      {/* Add tab dialog */}
      <Dialog open={showAddTab} onOpenChange={(v) => { setShowAddTab(v); if (!v) setAddStep("choose"); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {addStep === "choose" ? "Nova aba" : addStep === "manual" ? "Criar nova aba" : "Usar modelo existente"}
            </DialogTitle>
          </DialogHeader>

          {addStep === "choose" && (
            <div className="space-y-2">
              <button
                onClick={() => setAddStep("manual")}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
              >
                <FolderPlus className="size-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Criar nova aba manualmente</p>
                  <p className="text-xs text-muted-foreground">Defina o nome e organize como quiser</p>
                </div>
              </button>
              <button
                onClick={() => setAddStep("template")}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
              >
                <Copy className="size-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Usar modelo existente</p>
                  <p className="text-xs text-muted-foreground">Crie a partir de um modelo salvo</p>
                </div>
              </button>
            </div>
          )}

          {addStep === "manual" && (
            <>
              <Input
                placeholder="Nome da aba"
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTab()}
                autoFocus
              />
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setAddStep("choose")}>Voltar</Button>
                <Button size="sm" onClick={handleAddTab} disabled={!newTabName.trim()}>Criar</Button>
              </DialogFooter>
            </>
          )}

          {addStep === "template" && (
            <>
              {templates.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">Nenhum modelo salvo ainda.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use o ícone de salvar dentro de uma aba personalizada para criar modelos.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleAddFromTemplate(tpl)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{tpl.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {tpl.sections.length} {tpl.sections.length === 1 ? "seção" : "seções"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tpl.id); }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setAddStep("choose")}>Voltar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArquivosTab;
