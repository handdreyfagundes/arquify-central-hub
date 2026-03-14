import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CalendarRange } from "lucide-react";
import { listEtapasByProjeto } from "@/services/etapas";
import type { Database } from "@/integrations/supabase/types";

type StageStatus = Database["public"]["Enums"]["stage_status"];
type Etapa = Database["public"]["Tables"]["etapas"]["Row"] & { progresso: number };

const STATUS_CONFIG: Record<StageStatus, { label: string; color: string; bg: string }> = {
  pendente: { label: "Não iniciada", color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted))" },
  em_andamento: { label: "Em andamento", color: "hsl(var(--primary))", bg: "hsl(var(--primary) / 0.15)" },
  concluida: { label: "Concluída", color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" },
};

export default function AndamentoResumo({ projetoId }: { projetoId: string }) {
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await listEtapasByProjeto(projetoId);
      setEtapas((data as Etapa[]) ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [projetoId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarRange className="size-4 text-primary" />
            Andamento geral
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarRange className="size-4 text-primary" />
          Andamento geral
        </CardTitle>
      </CardHeader>
      <CardContent>
        {etapas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma etapa cadastrada.</p>
        ) : (
          <div className="relative ml-2 space-y-0">
            <div className="absolute left-[5px] top-2 bottom-2 w-0.5 bg-border" />
            {etapas.map((etapa) => {
              const cfg = STATUS_CONFIG[etapa.status];
              const progresso = etapa.progresso ?? 0;
              return (
                <div key={etapa.id} className="relative flex items-center gap-3 py-2 pl-1">
                  <div
                    className="relative z-10 size-3 shrink-0 rounded-full border-2"
                    style={{
                      borderColor: cfg.color,
                      backgroundColor: etapa.status === "pendente" ? "transparent" : cfg.color,
                    }}
                  />
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{etapa.nome}</span>
                    <Badge
                      variant="outline"
                      className="text-[9px] uppercase tracking-wider shrink-0"
                      style={{ color: cfg.color, borderColor: cfg.color, backgroundColor: cfg.bg }}
                    >
                      {cfg.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 w-28 shrink-0">
                    <Progress value={progresso} className="h-1.5 flex-1" />
                    <span className="text-[10px] text-muted-foreground w-7 text-right">{progresso}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
