import { useState, useEffect, useCallback } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { listEtapasByProjeto } from "@/services/etapas";
import { listSubetapasByEtapa, listRevisoesBySubetapa, listRevisoesByEtapa } from "@/services/subetapas";
import type { Subetapa, Revisao } from "@/services/subetapas";
import ProjetoSubTab from "./ProjetoSubTab";
import GenericFileTab from "./GenericFileTab";

interface Etapa {
  id: string;
  nome: string;
  ordem: number;
  projeto_id: string;
}

interface ArquivosTabProps {
  projetoId: string;
}

const DEFAULT_TABS = ["Projeto", "Externos", "Obra"];

const ArquivosTab = ({ projetoId }: ArquivosTabProps) => {
  const [activeTab, setActiveTab] = useState("Projeto");
  const [customTabs, setCustomTabs] = useState<string[]>([]);
  const [showAddTab, setShowAddTab] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Cronograma data
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [subetapasMap, setSubetapasMap] = useState<Record<string, Subetapa[]>>({});
  const [revisionsMap, setRevisionsMap] = useState<Record<string, Revisao[]>>({});
  const [stageRevisionsMap, setStageRevisionsMap] = useState<Record<string, Revisao[]>>({});
  const [loading, setLoading] = useState(true);

  const allTabs = [...DEFAULT_TABS, ...customTabs];

  // Fetch workspace_id from profile
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

  // Load custom tabs from localStorage
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
    setActiveTab(name);
  };

  const handleRemoveTab = (name: string) => {
    saveCustomTabs(customTabs.filter((t) => t !== name));
    if (activeTab === name) setActiveTab("Projeto");
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
        {allTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${
              activeTab === tab
                ? "bg-accent text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {tab}
            {customTabs.includes(tab) && (
              <X
                className="size-3 opacity-50 hover:opacity-100 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); handleRemoveTab(tab); }}
              />
            )}
          </button>
        ))}
        <button
          onClick={() => setShowAddTab(true)}
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
      ) : (
        <GenericFileTab
          projetoId={projetoId}
          workspaceId={workspaceId}
          tabName={activeTab}
        />
      )}

      {/* Add tab dialog */}
      <Dialog open={showAddTab} onOpenChange={setShowAddTab}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Nova aba</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nome da aba"
            value={newTabName}
            onChange={(e) => setNewTabName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTab()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddTab(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleAddTab} disabled={!newTabName.trim()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArquivosTab;
