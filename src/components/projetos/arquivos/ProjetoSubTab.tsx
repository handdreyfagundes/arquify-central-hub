import { useState } from "react";
import { ChevronDown, ChevronRight, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

const ProjetoSubTab = ({
  projetoId,
  workspaceId,
  etapas,
  subetapasMap,
  revisionsMap,
  stageRevisionsMap,
  loading,
}: ProjetoSubTabProps) => {
  const { toast } = useToast();
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [selectedRevision, setSelectedRevision] = useState<{
    revision: Revisao;
    label: string;
    parentName: string;
  } | null>(null);
  // Local mirror of approval_status for optimistic UI
  const [localApproval, setLocalApproval] = useState<Record<string, string | null>>({});

  const toggleStage = (id: string) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getApproval = (rev: Revisao): string | null => {
    if (rev.id in localApproval) return localApproval[rev.id];
    return rev.approval_status ?? null;
  };

  const handleApprovalChange = async (rev: Revisao, value: string) => {
    const newStatus = value === "none" ? null : value;
    setLocalApproval((prev) => ({ ...prev, [rev.id]: newStatus }));

    const { error } = await supabase
      .from("revisoes")
      .update({ approval_status: newStatus } as any)
      .eq("id", rev.id);

    if (error) {
      toast({ title: "Erro ao salvar status", variant: "destructive" });
      setLocalApproval((prev) => {
        const next = { ...prev };
        delete next[rev.id];
        return next;
      });
    }
  };

  const renderRevisions = (revisions: Revisao[], parentName: string) => {
    if (!revisions.length) return null;
    const latestIdx = revisions.length - 1;

    return (
      <div className="ml-6 space-y-0.5 mt-0.5">
        {revisions.map((rev, idx) => {
          const isLatest = idx === latestIdx;
          const label = `R${String(rev.numero_revisao).padStart(2, "0")}`;
          const approval = getApproval(rev);

          return (
            <div key={rev.id} className="flex items-center gap-2 py-0.5">
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

              {/* Approved state — green label, no dropdown */}
              {approval === "approved" && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-400 bg-emerald-50 text-emerald-700 gap-1">
                  <Check className="size-3" />
                  Aprovado
                </Badge>
              )}

              {/* Pending state — yellow label with remove button */}
              {approval === "pending" && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 border-yellow-400 bg-yellow-50 text-yellow-700 gap-1 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApprovalChange(rev, "none");
                  }}
                >
                  Pendente aprovação
                  <X className="size-3 hover:text-yellow-900" />
                </Badge>
              )}

              {/* No status yet & is latest & not R00 — show dropdown */}
              {isLatest && !approval && rev.numero_revisao > 0 && (
                <Select
                  value="none"
                  onValueChange={(val) => handleApprovalChange(rev, val)}
                >
                  <SelectTrigger className="h-6 w-auto min-w-0 text-[10px] border-dashed px-1.5 gap-1">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">—</SelectItem>
                    <SelectItem value="pending" className="text-xs">
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
          const hasSubs = subs.length > 0;

          if (hasSubs) {
            return subs.map((sub) => {
              const revs = revisionsMap[sub.id] || [];
              const hasRevs = revs.length > 0;
              const expanded = expandedStages.has(sub.id);
              return (
                <div key={sub.id}>
                  <div
                    className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => hasRevs && toggleStage(sub.id)}
                  >
                    {hasRevs ? (
                      expanded ? (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      )
                    ) : (
                      <span className="size-4" />
                    )}
                    <span className="text-sm font-medium text-foreground flex-1">
                      {sub.nome}
                    </span>
                  </div>
                  {expanded && hasRevs && (
                    <div className="ml-9">
                      {renderRevisions(revs, sub.nome)}
                    </div>
                  )}
                </div>
              );
            });
          }

          const expanded = expandedStages.has(etapa.id);
          const hasRevs = stageRevs.length > 0;
          return (
            <div key={etapa.id}>
              <div
                className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => hasRevs && toggleStage(etapa.id)}
              >
                {hasRevs ? (
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
              </div>
              {expanded && hasRevs && (
                <div className="ml-9">
                  {renderRevisions(stageRevs, etapa.nome)}
                </div>
              )}
            </div>
          );
        })}
      </div>

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
