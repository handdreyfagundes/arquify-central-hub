import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Check,
  RotateCcw,
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
  etapaRevisoes?: Revisao[];
  onEditEtapa: (etapa: Etapa) => void;
  onDeleteEtapa: (etapa: Etapa) => void;
  onMoveEtapa: (index: number, dir: "up" | "down") => void;
  onAddSubetapa: (etapaId: string) => void;
  onEditSubetapa: (sub: Subetapa) => void;
  onDeleteSubetapa: (sub: Subetapa) => void;
  onAddRevisao: (subId: string, rev: { data_solicitacao: string; prazo_dias: number; observacoes: string }) => void;
  onEditRevisao: (revId: string, updates: { data_solicitacao: string; prazo_dias: number; data_nova_entrega: string; observacoes: string | null }) => void;
  onDeleteRevisao: (revId: string) => void;
  onAddEtapaRevisao?: (etapaId: string, rev: { data_solicitacao: string; prazo_dias: number; observacoes: string }) => void;
  onToggleEtapaStatus: (etapa: Etapa) => void;
  onToggleSubStatus: (sub: Subetapa) => void;
  countType: "uteis" | "corridos";
}

export default function CronogramaEtapaCard({
  etapa,
  index,
  total,
  subetapas,
  revisoes,
  etapaRevisoes = [],
  onEditEtapa,
  onDeleteEtapa,
  onMoveEtapa,
  onAddSubetapa,
  onEditSubetapa,
  onDeleteSubetapa,
  onAddRevisao,
  onEditRevisao,
  onDeleteRevisao,
  onAddEtapaRevisao,
  onToggleEtapaStatus,
  onToggleSubStatus,
  countType,
}: Props) {
  const cfg = STATUS_CONFIG[etapa.status];
  const progresso = etapa.progresso ?? 0;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [revDialogOpen, setRevDialogOpen] = useState(false);
  const [revDate, setRevDate] = useState<Date | undefined>(new Date());
  const [revPrazo, setRevPrazo] = useState("5");
  const [revObs, setRevObs] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit revision state
  const [editRevDialogOpen, setEditRevDialogOpen] = useState(false);
  const [editingRev, setEditingRev] = useState<Revisao | null>(null);
  const [editRevDate, setEditRevDate] = useState<Date | undefined>(new Date());
  const [editRevPrazo, setEditRevPrazo] = useState("5");
  const [editRevObs, setEditRevObs] = useState("");
  const [deleteRevTarget, setDeleteRevTarget] = useState<Revisao | null>(null);

  const handleCircleClick = () => {
    if (subetapas.length === 0) {
      setConfirmOpen(true);
    }
  };

  const confirmToggle = () => {
    onToggleEtapaStatus(etapa);
    setConfirmOpen(false);
  };

  const handleSaveEtapaRevisao = async () => {
    if (!revDate || !onAddEtapaRevisao) return;
    setSaving(true);
    await onAddEtapaRevisao(etapa.id, {
      data_solicitacao: format(revDate, "yyyy-MM-dd"),
      prazo_dias: parseInt(revPrazo) || 5,
      observacoes: revObs,
    });
    setSaving(false);
    setRevDialogOpen(false);
    setRevObs("");
    setRevPrazo("5");
  };
  const isCompleted = etapa.status === "concluida";

  return (
    <>
      <Card className="group">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            {/* Large order number */}
            <span className="text-2xl font-bold text-muted-foreground/40 w-8 text-center tabular-nums select-none shrink-0">
              {index + 1}
            </span>

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

            {/* Stage circle – clickable only when no substages */}
            <button
              onClick={handleCircleClick}
              disabled={subetapas.length > 0}
              className={cn(
                "size-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors",
                subetapas.length === 0 && "cursor-pointer hover:scale-110",
                subetapas.length > 0 && "cursor-default",
              )}
              style={{
                borderColor: cfg.color,
                backgroundColor: isCompleted ? cfg.color : etapa.status === "em_andamento" ? cfg.bg : "transparent",
              }}
              title={subetapas.length > 0 ? "Status calculado pelas subetapas" : "Clique para alterar status"}
            >
              {isCompleted && <Check className="size-3.5 text-white" />}
            </button>

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
              {subetapas.length === 0 && onAddEtapaRevisao && (
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setRevDialogOpen(true)} title="Adicionar revisão">
                  <RotateCcw className="size-3.5" />
                </Button>
              )}
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
          {/* Stage-level revision history (for stages without substages) */}
          {subetapas.length === 0 && etapaRevisoes.length > 0 && (
            <div className="ml-14 mb-2 space-y-1 border-l-2 border-dashed border-muted pl-3">
              {etapaRevisoes.map((rev) => (
                <div key={rev.id} className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                  <Badge variant="outline" className="text-[9px] shrink-0">
                    Rev {String(rev.numero_revisao).padStart(2, "0")}
                  </Badge>
                  <span>Solicitada {format(new Date(rev.data_solicitacao + "T00:00:00"), "dd/MM")}</span>
                  <span>→ +{rev.prazo_dias}d</span>
                  {rev.data_nova_entrega && (
                    <span className="font-medium text-foreground">
                      Nova entrega: {format(new Date(rev.data_nova_entrega + "T00:00:00"), "dd/MM/yyyy")}
                    </span>
                  )}
                  {rev.observacoes && (
                    <span className="truncate italic">"{rev.observacoes}"</span>
                  )}
                  <div className="flex gap-0.5 ml-auto shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-5"
                      onClick={() => {
                        setEditingRev(rev);
                        setEditRevDate(new Date(rev.data_solicitacao + "T00:00:00"));
                        setEditRevPrazo(String(rev.prazo_dias));
                        setEditRevObs(rev.observacoes || "");
                        setEditRevDialogOpen(true);
                      }}
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-5 text-destructive"
                      onClick={() => setDeleteRevTarget(rev)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Substages */}
          {subetapas.length > 0 && (
            <div className="ml-14 border-l border-border pl-2 space-y-0">
              {subetapas.map((sub) => (
                <SubetapaRow
                  key={sub.id}
                  sub={sub}
                  revisoes={revisoes[sub.id] || []}
                  onEdit={onEditSubetapa}
                  onDelete={onDeleteSubetapa}
                  onAddRevisao={onAddRevisao}
                  onToggleStatus={onToggleSubStatus}
                />
              ))}
            </div>
          )}

          <div className="ml-14 mt-2">
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onAddSubetapa(etapa.id)}>
              <Plus className="size-3 mr-1" />
              Adicionar subetapa
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation dialog for stages without substages */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isCompleted ? "Reabrir etapa?" : "Marcar etapa como concluída?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isCompleted
                ? `A etapa "${etapa.nome}" será reaberta.`
                : `A etapa "${etapa.nome}" será marcada como concluída.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stage revision dialog (for stages without substages) */}
      <Dialog open={revDialogOpen} onOpenChange={setRevDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar revisão — {etapa.nome}</DialogTitle>
            <DialogDescription>
              Registre uma revisão para esta etapa. As datas serão recalculadas automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data da solicitação</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !revDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 size-4" />
                    {revDate ? format(revDate, "dd/MM/yyyy") : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={revDate}
                    onSelect={setRevDate}
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Prazo da revisão (dias)</Label>
              <Input
                type="number"
                min="1"
                value={revPrazo}
                onChange={(e) => setRevPrazo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={revObs}
                onChange={(e) => setRevObs(e.target.value)}
                placeholder="Detalhes da revisão…"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEtapaRevisao} disabled={saving || !revDate}>
              {saving ? "Salvando…" : "Salvar revisão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
