import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, CalendarIcon, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  listEtapasByProjeto,
  createEtapa,
  updateEtapa,
  deleteEtapa,
  reorderEtapas,
} from "@/services/etapas";
import {
  listSubetapasByEtapa,
  createSubetapa,
  updateSubetapa,
  deleteSubetapa,
  bulkUpdateSubetapaDates,
  listRevisoesBySubetapa,
  listRevisoesByEtapa,
  createRevisao,
} from "@/services/subetapas";
import type { Subetapa, Revisao } from "@/services/subetapas";
import { recalcSubetapas, parseLocalDate, addDays, toDateString } from "@/lib/cronograma-utils";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import CronogramaEtapaCard from "./CronogramaEtapaCard";

type StageStatus = Database["public"]["Enums"]["stage_status"];
type Etapa = Database["public"]["Tables"]["etapas"]["Row"];

interface Props {
  projetoId: string;
}

export default function CronogramaTab({ projetoId }: Props) {
  const { toast } = useToast();
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [subetapasMap, setSubetapasMap] = useState<Record<string, Subetapa[]>>({});
  const [revisoesMap, setRevisoesMap] = useState<Record<string, Revisao[]>>({});
  const [etapaRevisoesMap, setEtapaRevisoesMap] = useState<Record<string, Revisao[]>>({});
  const [countType, setCountType] = useState<"uteis" | "corridos">("uteis");
  const [loading, setLoading] = useState(true);

  // Location settings
  const [pais, setPais] = useState("Brasil");
  const [estadoCalendario, setEstadoCalendario] = useState("");
  const [cidadeCalendario, setCidadeCalendario] = useState("");

  // Etapa dialog
  const [etapaDialogOpen, setEtapaDialogOpen] = useState(false);
  const [editingEtapa, setEditingEtapa] = useState<Etapa | null>(null);
  const [formNome, setFormNome] = useState("");
  const [formDataInicio, setFormDataInicio] = useState<Date | undefined>();
  const [formStatus, setFormStatus] = useState<StageStatus>("pendente");
  const [formProgresso, setFormProgresso] = useState(0);
  const [saving, setSaving] = useState(false);

  // Subetapa dialog
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subetapa | null>(null);
  const [subEtapaId, setSubEtapaId] = useState<string>("");
  const [subNome, setSubNome] = useState("");
  const [subIntervalo, setSubIntervalo] = useState("0");

  // Delete dialogs
  const [deleteEtapaTarget, setDeleteEtapaTarget] = useState<Etapa | null>(null);
  const [deleteSubTarget, setDeleteSubTarget] = useState<Subetapa | null>(null);

  // Settings dialog
  const [settingsOpen, setSettingsOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const etapasData = await listEtapasByProjeto(projetoId);
      setEtapas(etapasData ?? []);

      const { data: proj } = await supabase
        .from("projetos")
        .select("count_type, pais, estado_calendario, cidade_calendario")
        .eq("id", projetoId)
        .single();
      if (proj) {
        if (proj.count_type) setCountType(proj.count_type as "uteis" | "corridos");
        setPais((proj as any).pais || "Brasil");
        setEstadoCalendario((proj as any).estado_calendario || "");
        setCidadeCalendario((proj as any).cidade_calendario || "");
      }

      const subMap: Record<string, Subetapa[]> = {};
      const revMap: Record<string, Revisao[]> = {};
      const etapaRevMap: Record<string, Revisao[]> = {};

      for (const etapa of etapasData ?? []) {
        const subs = await listSubetapasByEtapa(etapa.id);
        subMap[etapa.id] = subs;
        for (const sub of subs) {
          const revs = await listRevisoesBySubetapa(sub.id);
          revMap[sub.id] = revs;
        }
        // Load stage-level revisions (for stages without substages)
        if (subs.length === 0) {
          const etapaRevs = await listRevisoesByEtapa(etapa.id);
          etapaRevMap[etapa.id] = etapaRevs;
        }
      }
      setSubetapasMap(subMap);
      setRevisoesMap(revMap);
      setEtapaRevisoesMap(etapaRevMap);
    } catch {
      toast({ title: "Erro ao carregar cronograma", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [projetoId]);

  useEffect(() => {
    load();
  }, [load]);

  // === Derive stage status from substages ===
  const deriveStageStatus = (subs: Subetapa[]): { status: StageStatus; progresso: number } => {
    if (subs.length === 0) return { status: "pendente", progresso: 0 };
    const completed = subs.filter((s) => s.status === "concluida").length;
    if (completed === subs.length) return { status: "concluida", progresso: 100 };
    if (completed > 0) return { status: "em_andamento", progresso: Math.round((completed / subs.length) * 100) };
    return { status: "pendente", progresso: 0 };
  };

  // === Etapa handlers ===
  const openNewEtapa = () => {
    setEditingEtapa(null);
    setFormNome("");
    setFormDataInicio(undefined);
    setFormStatus("pendente");
    setFormProgresso(0);
    setEtapaDialogOpen(true);
  };

  const openEditEtapa = (etapa: Etapa) => {
    setEditingEtapa(etapa);
    setFormNome(etapa.nome);
    setFormDataInicio(etapa.data_inicio ? new Date(etapa.data_inicio + "T00:00:00") : undefined);
    setFormStatus(etapa.status);
    setFormProgresso(etapa.progresso ?? 0);
    setEtapaDialogOpen(true);
  };

  const handleSaveEtapa = async () => {
    if (!formNome.trim()) return;
    setSaving(true);
    try {
      const payload = {
        nome: formNome.trim(),
        data_inicio: formDataInicio ? format(formDataInicio, "yyyy-MM-dd") : null,
        status: formStatus,
        progresso: formProgresso,
      };
      if (editingEtapa) {
        await updateEtapa(editingEtapa.id, payload);
      } else {
        await createEtapa({
          ...payload,
          projeto_id: projetoId,
          ordem: etapas.length,
        });
      }
      setEtapaDialogOpen(false);
      await load();
      await recalculateDates();
    } catch {
      toast({ title: "Erro ao salvar etapa", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEtapa = async () => {
    if (!deleteEtapaTarget) return;
    try {
      await deleteEtapa(deleteEtapaTarget.id);
      setDeleteEtapaTarget(null);
      await load();
    } catch {
      toast({ title: "Erro ao excluir etapa", variant: "destructive" });
    }
  };

  const handleMoveEtapa = async (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= etapas.length) return;
    const reordered = [...etapas];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
    setEtapas(reordered);
    try {
      await reorderEtapas(reordered.map((e, i) => ({ id: e.id, ordem: i })));
      await recalculateDates();
    } catch {
      toast({ title: "Erro ao reordenar", variant: "destructive" });
      await load();
    }
  };

  // === Toggle stage status (for stages without substages) ===
  const handleToggleEtapaStatus = async (etapa: Etapa) => {
    const newStatus: StageStatus = etapa.status === "concluida" ? "pendente" : "concluida";
    const newProg = newStatus === "concluida" ? 100 : 0;
    try {
      await updateEtapa(etapa.id, { status: newStatus, progresso: newProg });
      await load();
    } catch {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  // === Toggle substage status ===
  const handleToggleSubStatus = async (sub: Subetapa) => {
    const newStatus = sub.status === "concluida" ? "pendente" : "concluida";
    try {
      await updateSubetapa(sub.id, { status: newStatus });
      // Re-derive parent stage status
      const subs = await listSubetapasByEtapa(sub.etapa_id);
      // Apply the toggle to the local copy for calculation
      const updatedSubs = subs.map((s) => s.id === sub.id ? { ...s, status: newStatus } : s);
      const { status, progresso } = deriveStageStatus(updatedSubs);
      await updateEtapa(sub.etapa_id, { status, progresso });
      await load();
    } catch {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  // === Subetapa handlers ===
  const openNewSubetapa = (etapaId: string) => {
    setEditingSub(null);
    setSubEtapaId(etapaId);
    setSubNome("");
    setSubIntervalo("0");
    setSubDialogOpen(true);
  };

  const openEditSubetapa = (sub: Subetapa) => {
    setEditingSub(sub);
    setSubEtapaId(sub.etapa_id);
    setSubNome(sub.nome);
    setSubIntervalo(String(sub.intervalo_dias));
    setSubDialogOpen(true);
  };

  const handleSaveSubetapa = async () => {
    if (!subNome.trim()) return;
    setSaving(true);
    try {
      if (editingSub) {
        await updateSubetapa(editingSub.id, {
          nome: subNome.trim(),
          intervalo_dias: parseInt(subIntervalo) || 0,
        });
      } else {
        const existing = subetapasMap[subEtapaId] || [];
        await createSubetapa({
          etapa_id: subEtapaId,
          nome: subNome.trim(),
          ordem: existing.length,
          intervalo_dias: parseInt(subIntervalo) || 0,
        });
      }
      setSubDialogOpen(false);
      await load();
      await recalculateDates();
    } catch {
      toast({ title: "Erro ao salvar subetapa", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubetapa = async () => {
    if (!deleteSubTarget) return;
    try {
      await deleteSubetapa(deleteSubTarget.id);
      setDeleteSubTarget(null);
      await load();
      await recalculateDates();
    } catch {
      toast({ title: "Erro ao excluir subetapa", variant: "destructive" });
    }
  };

  // === Revisão handler ===
  const handleAddRevisao = async (
    subId: string,
    rev: { data_solicitacao: string; prazo_dias: number; observacoes: string }
  ) => {
    try {
      const existingRevs = revisoesMap[subId] || [];
      const numero = existingRevs.length + 1;
      const newDelivery = toDateString(
        addDays(parseLocalDate(rev.data_solicitacao), rev.prazo_dias, countType)
      );

      await createRevisao({
        subetapa_id: subId,
        numero_revisao: numero,
        data_solicitacao: rev.data_solicitacao,
        prazo_dias: rev.prazo_dias,
        data_nova_entrega: newDelivery,
        observacoes: rev.observacoes || null,
      });

      await updateSubetapa(subId, { data_entrega: newDelivery });

      await load();
      await recalculateDates();
      toast({ title: "Revisão adicionada. Datas recalculadas." });
    } catch {
      toast({ title: "Erro ao adicionar revisão", variant: "destructive" });
    }
  };

  // === Etapa-level revisão handler (for stages without substages) ===
  const handleAddEtapaRevisao = async (
    etapaId: string,
    rev: { data_solicitacao: string; prazo_dias: number; observacoes: string }
  ) => {
    try {
      const existingRevs = etapaRevisoesMap[etapaId] || [];
      const numero = existingRevs.length + 1;
      const newDelivery = toDateString(
        addDays(parseLocalDate(rev.data_solicitacao), rev.prazo_dias, countType)
      );

      await createRevisao({
        etapa_id: etapaId,
        subetapa_id: null,
        numero_revisao: numero,
        data_solicitacao: rev.data_solicitacao,
        prazo_dias: rev.prazo_dias,
        data_nova_entrega: newDelivery,
        observacoes: rev.observacoes || null,
      });

      // Update stage end date
      await updateEtapa(etapaId, { data_fim: newDelivery });

      await load();
      await recalculateDates();
      toast({ title: "Revisão adicionada. Datas recalculadas." });
    } catch {
      toast({ title: "Erro ao adicionar revisão", variant: "destructive" });
    }
  };

  // === Recalculation with stage chaining ===
  const recalculateDates = async () => {
    try {
      const freshEtapas = await listEtapasByProjeto(projetoId);
      if (!freshEtapas?.length) return;

      let previousEndDate: string | null = null;

      for (const etapa of freshEtapas) {
        // If no explicit start date, chain from previous stage end
        let startDate = etapa.data_inicio;
        if (!startDate && previousEndDate) {
          startDate = previousEndDate;
          await updateEtapa(etapa.id, { data_inicio: startDate });
        }

        if (!startDate) {
          previousEndDate = null;
          continue;
        }

        const subs = await listSubetapasByEtapa(etapa.id);
        if (!subs.length) {
          // Stage without substages: end = start + duracao_dias
          if (etapa.duracao_dias) {
            const endDate = toDateString(addDays(parseLocalDate(startDate), etapa.duracao_dias, countType));
            await updateEtapa(etapa.id, { data_fim: endDate });
            previousEndDate = endDate;
          } else {
            previousEndDate = startDate;
          }
          continue;
        }

        const subCalcs = await Promise.all(
          subs.map(async (s) => {
            const revs = await listRevisoesBySubetapa(s.id);
            const latestRev = revs.length > 0 ? revs[revs.length - 1] : null;
            return {
              id: s.id,
              ordem: s.ordem,
              intervalo_dias: s.intervalo_dias,
              ultima_revisao_entrega: latestRev?.data_nova_entrega ?? null,
            };
          })
        );

        const calculated = recalcSubetapas(
          subCalcs,
          parseLocalDate(startDate),
          countType
        );

        await bulkUpdateSubetapaDates(calculated);

        const lastDate = calculated[calculated.length - 1]?.data_entrega;
        if (lastDate) {
          await updateEtapa(etapa.id, { data_fim: lastDate });
          previousEndDate = lastDate;
        }
      }

      await load();
    } catch {
      toast({ title: "Erro ao recalcular datas", variant: "destructive" });
    }
  };

  // === Settings handler ===
  const handleSaveSettings = async () => {
    try {
      await supabase
        .from("projetos")
        .update({
          count_type: countType,
          pais,
          estado_calendario: estadoCalendario || null,
          cidade_calendario: cidadeCalendario || null,
        } as any)
        .eq("id", projetoId);
      setSettingsOpen(false);
      toast({ title: "Configuração salva" });
      await recalculateDates();
    } catch {
      toast({ title: "Erro ao salvar configuração", variant: "destructive" });
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
          <h2 className="text-lg font-semibold text-foreground">Cronograma</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie etapas, subetapas e revisões do projeto
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="size-4 mr-1" />
            Configurar
          </Button>
          <Button size="sm" onClick={openNewEtapa}>
            <Plus className="size-4 mr-1" />
            Nova etapa
          </Button>
        </div>
      </div>

      {/* Etapa cards */}
      {etapas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">Nenhuma etapa cadastrada.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={openNewEtapa}>
              <Plus className="size-4 mr-1" />
              Adicionar primeira etapa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {etapas.map((etapa, index) => (
            <CronogramaEtapaCard
              key={etapa.id}
              etapa={etapa}
              index={index}
              total={etapas.length}
              subetapas={subetapasMap[etapa.id] || []}
              revisoes={revisoesMap}
              etapaRevisoes={etapaRevisoesMap[etapa.id] || []}
              onEditEtapa={openEditEtapa}
              onDeleteEtapa={setDeleteEtapaTarget}
              onMoveEtapa={handleMoveEtapa}
              onAddSubetapa={openNewSubetapa}
              onEditSubetapa={openEditSubetapa}
              onDeleteSubetapa={setDeleteSubTarget}
              onAddRevisao={handleAddRevisao}
              onAddEtapaRevisao={handleAddEtapaRevisao}
              onToggleEtapaStatus={handleToggleEtapaStatus}
              onToggleSubStatus={handleToggleSubStatus}
            />
          ))}
        </div>
      )}

      {/* Etapa Add/Edit Dialog */}
      <Dialog open={etapaDialogOpen} onOpenChange={setEtapaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEtapa ? "Editar etapa" : "Nova etapa"}</DialogTitle>
            <DialogDescription>
              {editingEtapa ? "Altere os dados da etapa." : "Adicione uma nova etapa ao cronograma."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da etapa</Label>
              <Input value={formNome} onChange={(e) => setFormNome(e.target.value)} placeholder="Ex: Estudo preliminar…" />
            </div>
            <div className="space-y-2">
              <Label>Data de início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formDataInicio && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 size-4" />
                    {formDataInicio ? format(formDataInicio, "dd/MM/yyyy") : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={formDataInicio} onSelect={setFormDataInicio} locale={ptBR} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Se não definida, será encadeada a partir da etapa anterior.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={(v) => setFormStatus(v as StageStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Não iniciada</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Progresso: {formProgresso}%</Label>
              <Slider value={[formProgresso]} onValueChange={([v]) => setFormProgresso(v)} max={100} step={5} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEtapaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEtapa} disabled={saving || !formNome.trim()}>
              {saving ? "Salvando…" : editingEtapa ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subetapa Add/Edit Dialog */}
      <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSub ? "Editar subetapa" : "Nova subetapa"}</DialogTitle>
            <DialogDescription>
              {editingSub ? "Altere os dados da subetapa." : "Adicione uma subetapa (entregável) à etapa."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da subetapa</Label>
              <Input value={subNome} onChange={(e) => setSubNome(e.target.value)} placeholder="Ex: Layout 2D, Imagens 3D…" />
            </div>
            <div className="space-y-2">
              <Label>Prazo até a próxima (dias)</Label>
              <Input type="number" min="0" value={subIntervalo} onChange={(e) => setSubIntervalo(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Número de {countType === "uteis" ? "dias úteis" : "dias corridos"} até a próxima subetapa, ou até a próxima etapa principal caso esta seja a última subetapa da etapa atual.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveSubetapa} disabled={saving || !subNome.trim()}>
              {saving ? "Salvando…" : editingSub ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Etapa Dialog */}
      <Dialog open={!!deleteEtapaTarget} onOpenChange={(open) => !open && setDeleteEtapaTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir etapa</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir "{deleteEtapaTarget?.nome}"? Todas as subetapas e revisões serão removidas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteEtapaTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteEtapa}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Subetapa Dialog */}
      <Dialog open={!!deleteSubTarget} onOpenChange={(open) => !open && setDeleteSubTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir subetapa</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir "{deleteSubTarget?.nome}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSubTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteSubetapa}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações do cronograma</DialogTitle>
            <DialogDescription>
              Defina como os prazos são calculados e a localização do projeto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de contagem</Label>
              <Select value={countType} onValueChange={(v) => setCountType(v as "uteis" | "corridos")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="uteis">Dias úteis</SelectItem>
                  <SelectItem value="corridos">Dias corridos</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {countType === "uteis"
                  ? "Fins de semana serão ignorados nos cálculos de prazo."
                  : "Todos os dias serão contados, incluindo fins de semana."}
              </p>
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <Label className="text-sm font-medium">Localização (calendário de feriados)</Label>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">País</Label>
                <Input value={pais} onChange={(e) => setPais(e.target.value)} placeholder="Brasil" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <Input value={estadoCalendario} onChange={(e) => setEstadoCalendario(e.target.value)} placeholder="Ex: SP" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Cidade</Label>
                  <Input value={cidadeCalendario} onChange={(e) => setCidadeCalendario(e.target.value)} placeholder="Ex: São Paulo" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                A localização será usada para aplicar o calendário de feriados correto ao cálculo de dias úteis.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveSettings}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
