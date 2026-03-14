import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Pencil,
  Trash2,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Circle,
  CheckCircle2,
  Clock,
  Check,
} from "lucide-react";
import type { Subetapa, Revisao } from "@/services/subetapas";

interface Props {
  sub: Subetapa;
  revisoes: Revisao[];
  onEdit: (sub: Subetapa) => void;
  onDelete: (sub: Subetapa) => void;
  onAddRevisao: (subId: string, rev: {
    data_solicitacao: string;
    prazo_dias: number;
    observacoes: string;
  }) => void;
  onEditRevisao: (revId: string, updates: { data_solicitacao: string; prazo_dias: number; data_nova_entrega: string; observacoes: string | null }) => void;
  onDeleteRevisao: (revId: string) => void;
  onToggleStatus: (sub: Subetapa) => void;
  countType: "uteis" | "corridos";
}

export default function SubetapaRow({ sub, revisoes, onEdit, onDelete, onAddRevisao, onEditRevisao, onDeleteRevisao, onToggleStatus, countType }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [revDialogOpen, setRevDialogOpen] = useState(false);
  const [revDate, setRevDate] = useState<Date | undefined>(new Date());
  const [revPrazo, setRevPrazo] = useState("5");
  const [revObs, setRevObs] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Edit revision state
  const [editRevDialogOpen, setEditRevDialogOpen] = useState(false);
  const [editingRev, setEditingRev] = useState<Revisao | null>(null);
  const [editRevDate, setEditRevDate] = useState<Date | undefined>(new Date());
  const [editRevPrazo, setEditRevPrazo] = useState("5");
  const [editRevObs, setEditRevObs] = useState("");
  const [deleteRevTarget, setDeleteRevTarget] = useState<Revisao | null>(null);

  const isCompleted = sub.status === "concluida";
  const isInProgress = sub.status === "em_andamento";
  const hasRevisoes = revisoes.length > 0;

  const handleSaveRevisao = async () => {
    if (!revDate) return;
    setSaving(true);
    await onAddRevisao(sub.id, {
      data_solicitacao: format(revDate, "yyyy-MM-dd"),
      prazo_dias: parseInt(revPrazo) || 5,
      observacoes: revObs,
    });
    setSaving(false);
    setRevDialogOpen(false);
    setRevObs("");
    setRevPrazo("5");
  };

  const handleCircleClick = () => {
    setConfirmOpen(true);
  };

  const confirmToggle = () => {
    onToggleStatus(sub);
    setConfirmOpen(false);
  };

  return (
    <div className="group/sub">
      {/* Main row */}
      <div className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-accent/50 transition-colors">
        {/* Clickable status circle */}
        <button
          onClick={handleCircleClick}
          className="shrink-0 cursor-pointer hover:scale-110 transition-transform"
          title={isCompleted ? "Reabrir subetapa" : "Marcar como concluída"}
        >
          {isCompleted ? (
            <CheckCircle2 className="size-4 text-emerald-500" />
          ) : isInProgress ? (
            <Clock className="size-4 text-primary" />
          ) : (
            <Circle className="size-4 text-muted-foreground" />
          )}
        </button>

        <button
          onClick={() => hasRevisoes && setExpanded(!expanded)}
          className="flex items-center gap-1 min-w-0 flex-1"
        >
          <span className={cn(
            "text-sm font-medium truncate",
            isCompleted ? "text-muted-foreground line-through" : "text-foreground",
          )}>{sub.nome}</span>
          {hasRevisoes && (
            expanded
              ? <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
              : <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
          )}
        </button>

        {sub.intervalo_dias > 0 && (
          <Badge variant="secondary" className="text-[10px] shrink-0">
            +{sub.intervalo_dias}d
          </Badge>
        )}

        {sub.data_entrega && (
          <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
            <CalendarIcon className="size-3" />
            {format(new Date(sub.data_entrega + "T00:00:00"), "dd/MM/yyyy")}
          </span>
        )}

        {/* Actions */}
        <div className="flex gap-0.5 opacity-0 group-hover/sub:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" className="size-7" onClick={() => setRevDialogOpen(true)}>
            <RotateCcw className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => onEdit(sub)}>
            <Pencil className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => onDelete(sub)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Revision history */}
      {expanded && hasRevisoes && (
        <div className="ml-10 mb-2 space-y-1 border-l-2 border-dashed border-muted pl-3">
          {revisoes.map((rev) => (
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

      {/* Revision dialog */}
      <Dialog open={revDialogOpen} onOpenChange={setRevDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar revisão — {sub.nome}</DialogTitle>
            <DialogDescription>
              Registre uma revisão solicitada pelo cliente. As datas serão recalculadas automaticamente.
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
            <Button onClick={handleSaveRevisao} disabled={saving || !revDate}>
              {saving ? "Salvando…" : "Salvar revisão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Completion confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isCompleted ? "Reabrir subetapa?" : "Marcar subetapa como concluída?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isCompleted
                ? `"${sub.nome}" será reaberta e marcada como pendente.`
                : `"${sub.nome}" será marcada como concluída.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit revision dialog */}
      <Dialog open={editRevDialogOpen} onOpenChange={setEditRevDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar revisão — {sub.nome}</DialogTitle>
            <DialogDescription>Atualize os dados da revisão. As datas serão recalculadas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data da solicitação</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !editRevDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 size-4" />
                    {editRevDate ? format(editRevDate, "dd/MM/yyyy") : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={editRevDate} onSelect={setEditRevDate} locale={ptBR} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Prazo da revisão (dias)</Label>
              <Input type="number" min="1" value={editRevPrazo} onChange={(e) => setEditRevPrazo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea value={editRevObs} onChange={(e) => setEditRevObs(e.target.value)} placeholder="Detalhes da revisão…" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRevDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (!editingRev || !editRevDate) return;
                setSaving(true);
                const { addDays, parseLocalDate, toDateString } = await import("@/lib/cronograma-utils");
                const dataSol = format(editRevDate, "yyyy-MM-dd");
                const prazo = parseInt(editRevPrazo) || 5;
                const newDelivery = toDateString(addDays(parseLocalDate(dataSol), prazo, countType));
                await onEditRevisao(editingRev.id, {
                  data_solicitacao: dataSol,
                  prazo_dias: prazo,
                  data_nova_entrega: newDelivery,
                  observacoes: editRevObs || null,
                });
                setSaving(false);
                setEditRevDialogOpen(false);
                setEditingRev(null);
              }}
              disabled={saving || !editRevDate}
            >
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete revision confirmation */}
      <AlertDialog open={!!deleteRevTarget} onOpenChange={(open) => !open && setDeleteRevTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir revisão?</AlertDialogTitle>
            <AlertDialogDescription>
              A revisão será removida e as datas serão recalculadas automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (deleteRevTarget) {
                await onDeleteRevisao(deleteRevTarget.id);
                setDeleteRevTarget(null);
              }
            }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
