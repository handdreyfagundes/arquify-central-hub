import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarIcon,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import type { Subetapa, Revisao } from "@/services/subetapas";
import SubetapaRow from "./SubetapaRow";

type StageStatus = Database["public"]["Enums"]["stage_status"];
type Etapa = Database["public"]["Tables"]["etapas"]["Row"];

const STATUS_CONFIG: Record<StageStatus, { label: string; color: string; bg: string }> = {
  pendente: { label: "Não iniciada", color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted))" },
  em_andamento: { label: "Em andamento", color: "hsl(var(--primary))", bg: "hsl(var(--primary) / 0.15)" },
  concluida: { label: "Concluída", color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" },
};

interface Props {
  etapa: Etapa;
  index: number;
  total: number;
  subetapas: Subetapa[];
  revisoes: Record<string, Revisao[]>;
  onEditEtapa: (etapa: Etapa) => void;
  onDeleteEtapa: (etapa: Etapa) => void;
  onMoveEtapa: (index: number, dir: "up" | "down") => void;
  onAddSubetapa: (etapaId: string) => void;
  onEditSubetapa: (sub: Subetapa) => void;
  onDeleteSubetapa: (sub: Subetapa) => void;
  onAddRevisao: (subId: string, rev: { data_solicitacao: string; prazo_dias: number; observacoes: string }) => void;
}

export default function CronogramaEtapaCard({
  etapa,
  index,
  total,
  subetapas,
  revisoes,
  onEditEtapa,
  onDeleteEtapa,
  onMoveEtapa,
  onAddSubetapa,
  onEditSubetapa,
  onDeleteSubetapa,
  onAddRevisao,
}: Props) {
  const cfg = STATUS_CONFIG[etapa.status];
  const progresso = etapa.progresso ?? 0;

  return (
    <Card className="group">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          {/* Reorder */}
          <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
              onClick={() => onMoveEtapa(index, "up")}
              disabled={index === 0}
            >
              <ChevronUp className="size-3.5" />
            </button>
            <GripVertical className="size-3.5 text-muted-foreground/40" />
            <button
              className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
              onClick={() => onMoveEtapa(index, "down")}
              disabled={index === total - 1}
            >
              <ChevronDown className="size-3.5" />
            </button>
          </div>

          {/* Stage circle */}
          <div
            className="size-3 shrink-0 rounded-full border-2"
            style={{
              borderColor: cfg.color,
              backgroundColor: etapa.status === "pendente" ? "transparent" : cfg.color,
            }}
          />

          {/* Title + status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm text-foreground truncate">{etapa.nome}</h3>
              <Badge
                variant="outline"
                className="text-[10px] uppercase tracking-wider shrink-0"
                style={{ color: cfg.color, borderColor: cfg.color, backgroundColor: cfg.bg }}
              >
                {cfg.label}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
              {etapa.data_inicio && (
                <span className="flex items-center gap-1">
                  <CalendarIcon className="size-3" />
                  Início: {format(new Date(etapa.data_inicio + "T00:00:00"), "dd/MM/yyyy")}
                </span>
              )}
              {etapa.data_fim && (
                <span className="flex items-center gap-1">
                  <CalendarIcon className="size-3" />
                  Fim: {format(new Date(etapa.data_fim + "T00:00:00"), "dd/MM/yyyy")}
                </span>
              )}
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 w-24 shrink-0">
            <Progress value={progresso} className="h-2 flex-1" />
            <span className="text-xs text-muted-foreground w-8 text-right">{progresso}%</span>
          </div>

          {/* Actions */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" className="size-8" onClick={() => onEditEtapa(etapa)}>
              <Pencil className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => onDeleteEtapa(etapa)}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Substages */}
        {subetapas.length > 0 && (
          <div className="ml-8 border-l border-border pl-2 space-y-0">
            {subetapas.map((sub) => (
              <SubetapaRow
                key={sub.id}
                sub={sub}
                revisoes={revisoes[sub.id] || []}
                onEdit={onEditSubetapa}
                onDelete={onDeleteSubetapa}
                onAddRevisao={onAddRevisao}
              />
            ))}
          </div>
        )}

        <div className="ml-8 mt-2">
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onAddSubetapa(etapa.id)}>
            <Plus className="size-3 mr-1" />
            Adicionar subetapa
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
