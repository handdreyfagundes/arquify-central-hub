import { useState } from "react";
import { ChevronDown, ChevronRight, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Subetapa, Revisao } from "@/services/subetapas";
import RevisionFilesPopup from "./RevisionFilesPopup";

interface Etapa {
  id: string;
  nome: string;
  ordem: number;
}

interface ProjetoSubTabProps {
  projetoId: string;
  workspaceId: string;
  etapas: Etapa[];
  subetapasMap: Record<string, Subetapa[]>;
  revisionsMap: Record<string, Revisao[]>;
  stageRevisionsMap: Record<string, Revisao[]>;
  loading: boolean;
}

const LiveSyncDot = () => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="relative flex size-2.5 cursor-help">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        Live sync com o portal do cliente
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const ProjetoSubTab = ({
  projetoId,
  workspaceId,
  etapas,
  subetapasMap,
  revisionsMap,
  stageRevisionsMap,
  loading,
}: ProjetoSubTabProps) => {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [selectedRevision, setSelectedRevision] = useState<{
    revision: Revisao;
    label: string;
    parentName: string;
  } | null>(null);
  const [approvalLabels, setApprovalLabels] = useState<Record<string, string>>({});

  const toggleStage = (id: string) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderRevisions = (revisions: Revisao[], parentName: string) => {
    if (!revisions.length) return null;
    const latestIdx = revisions.length - 1;

    return (
      <div className="flex flex-wrap items-center gap-1.5 ml-2">
        {revisions.map((rev, idx) => {
          const isLatest = idx === latestIdx;
          const label = `R${String(rev.numero_revisao).padStart(2, "0")}`;

          return (
            <div key={rev.id} className="flex items-center gap-1">
              <button
                onClick={() =>
                  setSelectedRevision({ revision: rev, label, parentName })
                }
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  isLatest
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {label}
              </button>
              {isLatest && (
                <Select
                  value={approvalLabels[rev.id] || "none"}
                  onValueChange={(val) =>
                    setApprovalLabels((prev) => ({ ...prev, [rev.id]: val }))
                  }
                >
                  <SelectTrigger className="h-6 w-auto min-w-0 text-[10px] border-dashed px-1.5 gap-1">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">—</SelectItem>
                    <SelectItem value="pendente_aprovacao" className="text-xs">
                      Pendente aprovação
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!etapas.length) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Nenhuma etapa encontrada no cronograma.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1">
        {etapas.map((etapa) => {
          const subs = subetapasMap[etapa.id] || [];
          const stageRevs = stageRevisionsMap[etapa.id] || [];
          const expanded = expandedStages.has(etapa.id);
          const hasChildren = subs.length > 0 || stageRevs.length > 0;

          return (
            <div key={etapa.id}>
              {/* Stage row */}
              <div
                className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                onClick={() => hasChildren && toggleStage(etapa.id)}
              >
                {hasChildren ? (
                  expanded ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )
                ) : (
                  <span className="size-4" />
                )}
                <span className="text-sm font-medium text-foreground flex-1">
                  {etapa.nome}
                </span>
                <LiveSyncDot />
                {/* Stage-level revisions (no substages) */}
                {stageRevs.length > 0 && renderRevisions(stageRevs, etapa.nome)}
              </div>

              {/* Substages */}
              {expanded && subs.length > 0 && (
                <div className="ml-6 border-l border-border pl-3 space-y-0.5">
                  {subs.map((sub) => {
                    const revs = revisionsMap[sub.id] || [];
                    return (
                      <div
                        key={sub.id}
                        className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/30 transition-colors"
                      >
                        <Circle className="size-2 text-muted-foreground/50" />
                        <span className="text-sm text-muted-foreground flex-1">
                          {sub.nome}
                        </span>
                        {renderRevisions(revs, `${etapa.nome} – ${sub.nome}`)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Revision files popup */}
      {selectedRevision && (
        <RevisionFilesPopup
          open={!!selectedRevision}
          onClose={() => setSelectedRevision(null)}
          projetoId={projetoId}
          workspaceId={workspaceId}
          revision={selectedRevision.revision}
          revisionLabel={selectedRevision.label}
          parentName={selectedRevision.parentName}
        />
      )}
    </>
  );
};

export default ProjetoSubTab;
