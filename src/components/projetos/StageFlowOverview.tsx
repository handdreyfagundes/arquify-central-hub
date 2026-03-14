import { useRef, useEffect, useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ChevronRight } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import type { Subetapa } from "@/services/subetapas";

type Etapa = Database["public"]["Tables"]["etapas"]["Row"];

interface Props {
  etapas: Etapa[];
  subetapasMap: Record<string, Subetapa[]>;
}

export default function StageFlowOverview({ etapas, subetapasMap }: Props) {
  if (etapas.length === 0) return null;

  /** Determine the end date for a stage */
  const getStageEndDate = (etapa: Etapa): string | null => {
    const subs = subetapasMap[etapa.id] ?? [];
    if (subs.length > 0) {
      const sorted = [...subs].sort((a, b) => a.ordem - b.ordem);
      const last = sorted[sorted.length - 1];
      return last.data_entrega;
    }
    return etapa.data_fim;
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "—";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const isCurrentStage = (etapa: Etapa): boolean => {
    return etapa.status === "em_andamento";
  };

  return (
    <div className="w-full overflow-hidden">
      <ScrollArea className="w-full">
        <div className="flex items-center gap-3 px-2 py-4 min-w-max">
          {etapas.map((etapa, index) => {
            const current = isCurrentStage(etapa);
            const endDate = getStageEndDate(etapa);

            return (
              <div key={etapa.id} className="flex items-center gap-3">
                {/* Stage circle + date */}
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`flex items-center justify-center rounded-full text-center transition-colors ${
                      current
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted text-muted-foreground"
                    }`}
                    style={{
                      width: 110,
                      height: 110,
                      minWidth: 110,
                      minHeight: 110,
                    }}
                  >
                    <span
                      className={`text-xs font-medium leading-tight px-3 ${
                        current ? "text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {etapa.nome}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {formatDate(endDate)}
                  </span>
                </div>

                {/* Arrow between stages */}
                {index < etapas.length - 1 && (
                  <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
