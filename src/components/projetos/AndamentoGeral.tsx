import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  CalendarIcon,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  listEtapasByProjeto,
  createEtapa,
  updateEtapa,
  deleteEtapa,
  reorderEtapas,
} from "@/services/etapas";
import type { Database } from "@/integrations/supabase/types";

type StageStatus = Database["public"]["Enums"]["stage_status"];
type Etapa = Database["public"]["Tables"]["etapas"]["Row"] & { progresso: number };

interface Props {
  projetoId: string;
}

const STATUS_CONFIG: Record<StageStatus, { label: string; color: string; bg: string }> = {
  pendente: { label: "Não iniciada", color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted))" },
  em_andamento: { label: "Em andamento", color: "hsl(var(--primary))", bg: "hsl(var(--primary) / 0.15)" },
  concluida: { label: "Concluída", color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" },
};

export default function AndamentoGeral({ projetoId }: Props) {
  const { toast } = useToast();
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [loading, setLoading] = useState(true);

  // dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Etapa | null>(null);
  const [formNome, setFormNome] = useState("");
  const [formDeadline, setFormDeadline] = useState<Date | undefined>();
  const [formStatus, setFormStatus] = useState<StageStatus>("pendente");
  const [formProgresso, setFormProgresso] = useState(0);
  const [saving, setSaving] = useState(false);

  // delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Etapa | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await listEtapasByProjeto(projetoId);
      setEtapas((data as Etapa[]) ?? []);
    } catch {
      toast({ title: "Erro ao carregar etapas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [projetoId]);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setFormNome("");
    setFormDeadline(undefined);
    setFormStatus("pendente");
    setFormProgresso(0);
    setDialogOpen(true);
  };

  const openEdit = (etapa: Etapa) => {
    setEditing(etapa);
    setFormNome(etapa.nome);
    setFormDeadline(etapa.data_fim ? new Date(etapa.data_fim + "T00:00:00") : undefined);
    setFormStatus(etapa.status);
    setFormProgresso(etapa.progresso ?? 0);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formNome.trim()) return;
    setSaving(true);
    try {
      const payload = {
        nome: formNome.trim(),
        data_fim: formDeadline ? format(formDeadline, "yyyy-MM-dd") : null,
        status: formStatus,
        progresso: formProgresso,
      };

      if (editing) {
        await updateEtapa(editing.id, payload);
      } else {
        await createEtapa({
          ...payload,
          projeto_id: projetoId,
          ordem: etapas.length,
        });
      }
      setDialogOpen(false);
      await load();
    } catch {
      toast({ title: "Erro ao salvar etapa", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteEtapa(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch {
      toast({ title: "Erro ao excluir etapa", variant: "destructive" });
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= etapas.length) return;

    const reordered = [...etapas];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];

    // optimistic
    setEtapas(reordered);

    try {
      await reorderEtapas(
        reordered.map((e, i) => ({ id: e.id, ordem: i }))
      );
    } catch {
      toast({ title: "Erro ao reordenar", variant: "destructive" });
      await load();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="size-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Andamento geral</h2>
          <p className="text-sm text-muted-foreground">Linha do tempo completa do projeto</p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="size-4 mr-1" />
          Nova etapa
        </Button>
      </div>

      {/* Timeline */}
      {etapas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">Nenhuma etapa cadastrada.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={openNew}>
              <Plus className="size-4 mr-1" />
              Adicionar primeira etapa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="relative ml-4">
          {/* vertical line */}
          <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-border" />

          <div className="space-y-1">
            {etapas.map((etapa, index) => {
              const cfg = STATUS_CONFIG[etapa.status];
              const progresso = etapa.progresso ?? 0;

              return (
                <div key={etapa.id} className="relative flex items-start gap-4 pl-2">
                  {/* circle */}
                  <div
                    className="relative z-10 mt-4 size-3 shrink-0 rounded-full border-2"
                    style={{
                      borderColor: cfg.color,
                      backgroundColor: etapa.status === "pendente" ? "transparent" : cfg.color,
                    }}
                  />

                  {/* card */}
                  <Card className="flex-1 group">
                    <CardContent className="flex items-center gap-4 py-3 px-4">
                      {/* reorder */}
                      <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          onClick={() => handleMove(index, "up")}
                          disabled={index === 0}
                        >
                          <ChevronUp className="size-3.5" />
                        </button>
                        <GripVertical className="size-3.5 text-muted-foreground/40" />
                        <button
                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          onClick={() => handleMove(index, "down")}
                          disabled={index === etapas.length - 1}
                        >
                          <ChevronDown className="size-3.5" />
                        </button>
                      </div>

                      {/* info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-foreground truncate">
                            {etapa.nome}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase tracking-wider shrink-0"
                            style={{ color: cfg.color, borderColor: cfg.color, backgroundColor: cfg.bg }}
                          >
                            {cfg.label}
                          </Badge>
                        </div>

                        {/* progress bar */}
                        <div className="flex items-center gap-3">
                          <Progress value={progresso} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground w-8 text-right">{progresso}%</span>
                        </div>

                        {etapa.data_fim && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <CalendarIcon className="size-3" />
                            Prazo: {format(new Date(etapa.data_fim + "T00:00:00"), "dd/MM/yyyy")}
                          </p>
                        )}
                      </div>

                      {/* actions */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(etapa)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setDeleteTarget(etapa)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar etapa" : "Nova etapa"}</DialogTitle>
            <DialogDescription>
              {editing ? "Altere os dados da etapa." : "Adicione uma nova etapa ao cronograma."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da etapa</Label>
              <Input
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Ex: Briefing, Estudo preliminar…"
              />
            </div>

            <div className="space-y-2">
              <Label>Prazo (data final)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !formDeadline && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 size-4" />
                    {formDeadline ? format(formDeadline, "dd/MM/yyyy") : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formDeadline}
                    onSelect={setFormDeadline}
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={(v) => setFormStatus(v as StageStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Não iniciada</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Progresso: {formProgresso}%</Label>
              <Slider
                value={[formProgresso]}
                onValueChange={([v]) => setFormProgresso(v)}
                max={100}
                step={5}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !formNome.trim()}>
              {saving ? "Salvando…" : editing ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir etapa</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a etapa "{deleteTarget?.nome}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
