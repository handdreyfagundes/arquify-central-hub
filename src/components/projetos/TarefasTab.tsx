import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Filter, Play, MessageSquare, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  SelectGroup, SelectLabel,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import SpecPopup from "./tarefas/SpecPopup";
import TimerPopup from "./tarefas/TimerPopup";
import ObsPopup from "./tarefas/ObsPopup";
import type { Database } from "@/integrations/supabase/types";

type Tarefa = Database["public"]["Tables"]["tarefas"]["Row"];
type TarefaInsert = Database["public"]["Tables"]["tarefas"]["Insert"];

interface Etapa {
  id: string;
  nome: string;
  ordem: number;
}

interface Subetapa {
  id: string;
  etapa_id: string;
  nome: string;
  ordem: number;
}

interface Profile {
  user_id: string;
  name: string;
}

interface TimeTotal {
  tarefa_id: string;
  total: number;
}

const STATUS_OPTIONS = [
  { value: "pendente", label: "Não iniciada", color: "bg-muted text-muted-foreground" },
  { value: "em_andamento", label: "Em andamento", color: "bg-primary text-primary-foreground" },
  { value: "concluida", label: "Concluída", color: "bg-emerald-500 text-white" },
] as const;

const SORT_OPTIONS = [
  { value: "created_at", label: "Criação" },
  { value: "etapa", label: "Etapa" },
  { value: "revisao", label: "Revisão" },
  { value: "ambiente", label: "Especificação" },
  { value: "status", label: "Status" },
  { value: "prazo_limite", label: "Prazo" },
  { value: "responsavel", label: "Responsável" },
] as const;

interface Props {
  projetoId: string;
}

export default function TarefasTab({ projetoId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [subetapas, setSubetapas] = useState<Subetapa[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [timeTotals, setTimeTotals] = useState<TimeTotal[]>([]);
  const [tarefaResponsaveis, setTarefaResponsaveis] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  // Edit states
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Popup states
  const [specOpen, setSpecOpen] = useState<string | null>(null);
  const [timerOpen, setTimerOpen] = useState<string | null>(null);
  const [obsOpen, setObsOpen] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Completed section
  const [completedOpen, setCompletedOpen] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const etapaIdsRes = await supabase.from("etapas").select("id").eq("projeto_id", projetoId);
      const etapaIds = etapaIdsRes.data?.map((e) => e.id) ?? [];

      const [tarefasRes, etapasRes, subetapasRes, profilesRes, timeRes, respRes] = await Promise.all([
        supabase.from("tarefas").select("*").eq("projeto_id", projetoId).order("created_at", { ascending: false }),
        supabase.from("etapas").select("id, nome, ordem").eq("projeto_id", projetoId).order("ordem"),
        etapaIds.length > 0
          ? supabase.from("subetapas").select("id, etapa_id, nome, ordem").in("etapa_id", etapaIds).order("ordem")
          : Promise.resolve({ data: [], error: null }),
        supabase.from("profiles").select("user_id, name"),
        supabase.from("time_entries").select("tarefa_id, duration_minutes").eq("projeto_id", projetoId).not("tarefa_id", "is", null),
        supabase.from("tarefa_responsaveis" as any).select("tarefa_id, user_id"),
      ]);

      if (tarefasRes.error) throw tarefasRes.error;
      setTarefas(tarefasRes.data ?? []);
      setEtapas(etapasRes.data ?? []);
      setSubetapas(subetapasRes.data ?? []);
      setProfiles(profilesRes.data ?? []);

      // Aggregate time per task
      const timeMap = new Map<string, number>();
      (timeRes.data ?? []).forEach((entry: any) => {
        if (entry.tarefa_id) {
          timeMap.set(entry.tarefa_id, (timeMap.get(entry.tarefa_id) ?? 0) + (entry.duration_minutes ?? 0));
        }
      });
      setTimeTotals(Array.from(timeMap.entries()).map(([tarefa_id, total]) => ({ tarefa_id, total })));

      // Aggregate responsaveis per task
      const respMap: Record<string, string[]> = {};
      ((respRes.data ?? []) as any[]).forEach((r: any) => {
        if (!respMap[r.tarefa_id]) respMap[r.tarefa_id] = [];
        respMap[r.tarefa_id].push(r.user_id);
      });
      setTarefaResponsaveis(respMap);
    } catch (err: any) {
      toast({ title: "Erro ao carregar tarefas", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [projetoId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getDecimalHours = (taskId: string) => {
    const entry = timeTotals.find((t) => t.tarefa_id === taskId);
    const mins = entry?.total ?? 0;
    if (mins === 0) return "0 h";
    const decimal = Math.round((mins / 60) * 1000) / 1000;
    return `${decimal} h`;
  };

  const getEtapaDisplayName = (tarefa: Tarefa) => {
    const subId = (tarefa as any).subetapa_id as string | null;
    if (subId) {
      const sub = subetapas.find((s) => s.id === subId);
      if (sub) {
        const parent = etapas.find((e) => e.id === sub.etapa_id);
        return parent ? `${parent.nome} › ${sub.nome}` : sub.nome;
      }
    }
    if (tarefa.etapa_id) {
      const etapa = etapas.find((e) => e.id === tarefa.etapa_id);
      return etapa?.nome ?? "—";
    }
    return "—";
  };

  const getProfileName = (userId: string | null) => {
    if (!userId) return "—";
    return profiles.find((p) => p.user_id === userId)?.name ?? "—";
  };

  const getResponsaveisNames = (tarefaId: string) => {
    const ids = tarefaResponsaveis[tarefaId] ?? [];
    if (ids.length === 0) return "—";
    return ids.map((id) => profiles.find((p) => p.user_id === id)?.name ?? "?").join(", ");
  };

  const toggleResponsavel = async (tarefaId: string, userId: string) => {
    const current = tarefaResponsaveis[tarefaId] ?? [];
    try {
      if (current.includes(userId)) {
        await supabase.from("tarefa_responsaveis" as any).delete().eq("tarefa_id", tarefaId).eq("user_id", userId);
        setTarefaResponsaveis((prev) => ({
          ...prev,
          [tarefaId]: (prev[tarefaId] ?? []).filter((id) => id !== userId),
        }));
      } else {
        await supabase.from("tarefa_responsaveis" as any).insert({ tarefa_id: tarefaId, user_id: userId } as any);
        setTarefaResponsaveis((prev) => ({
          ...prev,
          [tarefaId]: [...(prev[tarefaId] ?? []), userId],
        }));
      }
    } catch (err: any) {
      toast({ title: "Erro ao atualizar responsável", description: err.message, variant: "destructive" });
    }
  };

  const formatRevision = (rev: number | null) => {
    if (rev === null || rev === undefined) return "—";
    return `R${String(rev).padStart(2, "0")}`;
  };

  const addTask = async () => {
    try {
      const newTask: TarefaInsert = {
        projeto_id: projetoId,
        titulo: "",
        status: "pendente",
        prioridade: "media",
      };
      const { error } = await supabase.from("tarefas").insert(newTask);
      if (error) throw error;
      await fetchAll();
    } catch (err: any) {
      toast({ title: "Erro ao criar tarefa", description: err.message, variant: "destructive" });
    }
  };

  const updateField = async (id: string, field: string, value: any) => {
    try {
      const { error } = await supabase.from("tarefas").update({ [field]: value }).eq("id", id);
      if (error) throw error;
      setTarefas((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
    } catch (err: any) {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    }
  };

  const deleteTarefa = async (id: string) => {
    try {
      const { error } = await supabase.from("tarefas").delete().eq("id", id);
      if (error) throw error;
      setTarefas((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Tarefa excluída" });
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    }
    setDeleteConfirm(null);
  };

  const toggleComplete = async (tarefa: Tarefa) => {
    const newStatus = tarefa.status === "concluida" ? "pendente" : "concluida";
    await updateField(tarefa.id, "status", newStatus);
  };

  const handleInlineBlur = (id: string, field: string) => {
    if (editingCell?.id === id && editingCell?.field === field) {
      updateField(id, field, editValue);
      setEditingCell(null);
    }
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent, id: string, field: string) => {
    if (e.key === "Enter") {
      handleInlineBlur(id, field);
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  // Split active vs completed
  const activeTarefas = tarefas.filter((t) => t.status !== "concluida");
  const completedTarefas = tarefas.filter((t) => t.status === "concluida");

  // Sorting & filtering (active only)
  const sorted = [...activeTarefas]
    .filter((t) => !filterStatus || t.status === filterStatus)
    .sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "etapa": {
          const na = getEtapaDisplayName(a);
          const nb = getEtapaDisplayName(b);
          cmp = na.localeCompare(nb);
          break;
        }
        case "revisao":
          cmp = (a.revisao ?? 0) - (b.revisao ?? 0);
          break;
        case "ambiente":
          cmp = (a.ambiente ?? "").localeCompare(b.ambiente ?? "");
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "prazo_limite":
          cmp = (a.prazo_limite ?? "9999").localeCompare(b.prazo_limite ?? "9999");
          break;
        case "responsavel":
          cmp = getResponsaveisNames(a.id).localeCompare(getResponsaveisNames(b.id));
          break;
        default:
          cmp = (a.created_at ?? "").localeCompare(b.created_at ?? "");
      }
      return sortAsc ? cmp : -cmp;
    });

  const statusInfo = (status: string) =>
    STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];

  const renderRow = (tarefa: Tarefa, isCompleted = false) => {
    const si = statusInfo(tarefa.status);
    const respIds = tarefaResponsaveis[tarefa.id] ?? [];

    return (
      <TableRow key={tarefa.id} className={cn("group", isCompleted && "opacity-60")}>
        {/* CHECKBOX + TRASH + TASK */}
        <TableCell className="py-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={tarefa.status === "concluida"}
              onCheckedChange={() => toggleComplete(tarefa)}
              className="shrink-0"
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
              onClick={() => setDeleteConfirm(tarefa.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
            {editingCell?.id === tarefa.id && editingCell.field === "titulo" ? (
              <Input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleInlineBlur(tarefa.id, "titulo")}
                onKeyDown={(e) => handleInlineKeyDown(e, tarefa.id, "titulo")}
                className="h-7 text-sm border-primary/30"
              />
            ) : (
              <span
                className="cursor-text text-sm hover:text-primary transition-colors truncate"
                onClick={() => {
                  setEditingCell({ id: tarefa.id, field: "titulo" });
                  setEditValue(tarefa.titulo ?? "");
                }}
              >
                {tarefa.titulo || <span className="text-muted-foreground italic">Sem título</span>}
              </span>
            )}
          </div>
        </TableCell>

        {/* STAGE */}
        <TableCell className="py-2">
          <Select
            value={(tarefa as any).subetapa_id ?? tarefa.etapa_id ?? "none"}
            onValueChange={async (v) => {
              if (v === "none") {
                try {
                  const { error } = await supabase.from("tarefas").update({ etapa_id: null, subetapa_id: null } as any).eq("id", tarefa.id);
                  if (error) throw error;
                  setTarefas((prev) => prev.map((t) => t.id === tarefa.id ? { ...t, etapa_id: null, subetapa_id: null } as any : t));
                } catch (err: any) {
                  toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
                }
                return;
              }
              const sub = subetapas.find((s) => s.id === v);
              if (sub) {
                // Substage selected: save parent etapa_id + subetapa_id
                try {
                  const { error } = await supabase.from("tarefas").update({ etapa_id: sub.etapa_id, subetapa_id: v } as any).eq("id", tarefa.id);
                  if (error) throw error;
                  setTarefas((prev) => prev.map((t) => t.id === tarefa.id ? { ...t, etapa_id: sub.etapa_id, subetapa_id: v } as any : t));
                } catch (err: any) {
                  toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
                }
              } else {
                // Main stage selected: save etapa_id, clear subetapa_id
                try {
                  const { error } = await supabase.from("tarefas").update({ etapa_id: v, subetapa_id: null } as any).eq("id", tarefa.id);
                  if (error) throw error;
                  setTarefas((prev) => prev.map((t) => t.id === tarefa.id ? { ...t, etapa_id: v, subetapa_id: null } as any : t));
                } catch (err: any) {
                  toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
                }
              }
            }}
          >
            <SelectTrigger className="h-7 text-xs border-none shadow-none bg-transparent hover:bg-muted px-1">
              <SelectValue>{getEtapaDisplayName(tarefa)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {etapas.map((etapa) => {
                const subs = subetapas.filter((s) => s.etapa_id === etapa.id);
                return (
                  <SelectGroup key={etapa.id}>
                    <SelectItem value={etapa.id} className="font-medium">
                      {etapa.nome}
                    </SelectItem>
                    {subs.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id} className="pl-8 text-xs text-muted-foreground">
                        ↳ {sub.nome}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                );
              })}
            </SelectContent>
          </Select>
        </TableCell>

        {/* REVISION */}
        <TableCell className="py-2">
          {editingCell?.id === tarefa.id && editingCell.field === "revisao" ? (
            <Input
              autoFocus
              type="number"
              min={0}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => {
                updateField(tarefa.id, "revisao", parseInt(editValue) || 0);
                setEditingCell(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateField(tarefa.id, "revisao", parseInt(editValue) || 0);
                  setEditingCell(null);
                } else if (e.key === "Escape") setEditingCell(null);
              }}
              className="h-7 w-16 text-xs border-primary/30"
            />
          ) : (
            <span
              className="cursor-text text-xs text-muted-foreground hover:text-primary transition-colors"
              onClick={() => {
                setEditingCell({ id: tarefa.id, field: "revisao" });
                setEditValue(String(tarefa.revisao ?? 0));
              }}
            >
              {formatRevision(tarefa.revisao)}
            </span>
          )}
        </TableCell>

        {/* SPECIFICATION */}
        <TableCell className="py-2">
          <button
            onClick={() => setSpecOpen(tarefa.id)}
            className="text-xs text-muted-foreground hover:text-primary transition-colors text-left"
          >
            {tarefa.ambiente && tarefa.item
              ? `${tarefa.ambiente}: ${tarefa.item}`
              : tarefa.ambiente || tarefa.item || <span className="italic">Definir</span>}
          </button>
        </TableCell>

        {/* STATUS */}
        <TableCell className="py-2">
          <Select
            value={tarefa.status}
            onValueChange={(v) => updateField(tarefa.id, "status", v)}
          >
            <SelectTrigger className="h-7 border-none shadow-none bg-transparent px-0">
              <Badge className={cn("text-[10px] font-medium", si.color)}>
                {si.label}
              </Badge>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  <span className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", s.color)} />
                    {s.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>

        {/* DEADLINE */}
        <TableCell className="py-2">
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-xs text-muted-foreground hover:text-primary transition-colors">
                {tarefa.prazo_limite
                  ? format(new Date(tarefa.prazo_limite + "T00:00:00"), "dd/MM/yyyy")
                  : <span className="italic">Definir</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                locale={ptBR}
                selected={tarefa.prazo_limite ? new Date(tarefa.prazo_limite + "T00:00:00") : undefined}
                onSelect={(date) => {
                  if (date) updateField(tarefa.id, "prazo_limite", format(date, "yyyy-MM-dd"));
                }}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </TableCell>

        {/* RESPONSIBLE (multi-select) */}
        <TableCell className="py-2">
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-xs text-muted-foreground hover:text-primary transition-colors text-left max-w-[140px] truncate">
                {getResponsaveisNames(tarefa.id)}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1">
                {profiles.map((p) => (
                  <label
                    key={p.user_id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-xs"
                  >
                    <Checkbox
                      checked={respIds.includes(p.user_id)}
                      onCheckedChange={() => toggleResponsavel(tarefa.id, p.user_id)}
                    />
                    {p.name}
                  </label>
                ))}
                {profiles.length === 0 && (
                  <span className="text-xs text-muted-foreground px-2">Nenhum membro</span>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </TableCell>

        {/* HOURS (decimal) */}
        <TableCell className="py-2 text-center">
          <span className="text-xs tabular-nums text-muted-foreground">
            {getDecimalHours(tarefa.id)}
          </span>
        </TableCell>

        {/* TIMER */}
        <TableCell className="py-2 text-center">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setTimerOpen(tarefa.id)}
          >
            <Play className="size-3.5 text-primary" />
          </Button>
        </TableCell>

        {/* OBS */}
        <TableCell className="py-2 text-center">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setObsOpen(tarefa.id)}
          >
            <MessageSquare className="size-3.5 text-muted-foreground" />
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <Button size="sm" onClick={addTask} className="gap-1.5">
          <Plus className="size-4" />
          Nova tarefa
        </Button>

        <div className="flex items-center gap-2">
          <Select value={filterStatus ?? "all"} onValueChange={(v) => setFilterStatus(v === "all" ? null : v)}>
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Filter className="size-3.5" />
                Ordenar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs">Ordenar por</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => {
                    if (sortBy === opt.value) {
                      setSortAsc(!sortAsc);
                    } else {
                      setSortBy(opt.value);
                      setSortAsc(true);
                    }
                  }}
                  className={cn("text-xs", sortBy === opt.value && "font-semibold")}
                >
                  {opt.label}
                  {sortBy === opt.value && (sortAsc ? " ↑" : " ↓")}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Active tasks table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[220px]">Tarefa</TableHead>
              <TableHead className="min-w-[160px]">Etapa</TableHead>
              <TableHead className="w-[80px]">Revisão</TableHead>
              <TableHead className="min-w-[140px]">Especificação</TableHead>
              <TableHead className="w-[130px]">Status</TableHead>
              <TableHead className="w-[120px]">Prazo</TableHead>
              <TableHead className="min-w-[120px]">Responsável</TableHead>
              <TableHead className="w-[70px] text-center">Horas</TableHead>
              <TableHead className="w-[50px] text-center">Timer</TableHead>
              <TableHead className="w-[50px] text-center">Obs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                  Nenhuma tarefa ainda. Clique em "Nova tarefa" para começar.
                </TableCell>
              </TableRow>
            )}
            {sorted.map((tarefa) => renderRow(tarefa))}
          </TableBody>
        </Table>
      </div>

      {/* Completed tasks collapsible section */}
      {completedTarefas.length > 0 && (
        <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-xs text-muted-foreground">
              <ChevronDown className={cn("size-4 transition-transform", !completedOpen && "-rotate-90")} />
              Tarefas concluídas ({completedTarefas.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="rounded-lg border bg-card mt-2">
              <Table>
                <TableBody>
                  {completedTarefas.map((tarefa) => renderRow(tarefa, true))}
                </TableBody>
              </Table>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && deleteTarefa(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Popups */}
      {specOpen && (
        <SpecPopup
          tarefa={tarefas.find((t) => t.id === specOpen)!}
          open={!!specOpen}
          onClose={() => setSpecOpen(null)}
          onSave={(ambiente, item) => {
            updateField(specOpen, "ambiente", ambiente);
            updateField(specOpen, "item", item);
            setSpecOpen(null);
          }}
        />
      )}
      {timerOpen && (
        <TimerPopup
          tarefaId={timerOpen}
          projetoId={projetoId}
          profiles={profiles}
          open={!!timerOpen}
          onClose={() => { setTimerOpen(null); fetchAll(); }}
        />
      )}
      {obsOpen && (
        <ObsPopup
          tarefa={tarefas.find((t) => t.id === obsOpen)!}
          open={!!obsOpen}
          onClose={() => setObsOpen(null)}
          onSave={(desc) => {
            updateField(obsOpen, "descricao", desc);
            setObsOpen(null);
          }}
        />
      )}
    </div>
  );
}
