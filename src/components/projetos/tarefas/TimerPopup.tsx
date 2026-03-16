import { useState, useEffect, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Play, Pause, Square, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Profile {
  user_id: string;
  name: string;
}

interface TimeEntry {
  id: string;
  user_id: string;
  duration_minutes: number | null;
  created_at: string;
}

interface Props {
  tarefaId: string;
  projetoId: string;
  profiles: Profile[];
  open: boolean;
  onClose: () => void;
}

export default function TimerPopup({ tarefaId, projetoId, profiles, open, onClose }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [manualMinutes, setManualMinutes] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const startRef = useRef<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setSelectedUser(user.id);
    supabase.from("profiles").select("workspace_id").eq("user_id", user.id).single()
      .then(({ data }) => setWorkspaceId(data?.workspace_id ?? null));
  }, [user]);

  useEffect(() => {
    if (!open) return;
    refreshEntries();
  }, [open, tarefaId]);

  const refreshEntries = async () => {
    const { data } = await supabase
      .from("time_entries")
      .select("id, user_id, duration_minutes, created_at")
      .eq("tarefa_id", tarefaId)
      .order("created_at", { ascending: false });
    setEntries(data ?? []);
  };

  const startTimer = () => {
    if (!selectedUser) {
      toast({ title: "Selecione o responsável", variant: "destructive" });
      return;
    }
    startRef.current = new Date();
    setRunning(true);
    setElapsed(0);
    intervalRef.current = setInterval(() => {
      if (startRef.current) {
        setElapsed(Math.floor((Date.now() - startRef.current.getTime()) / 1000));
      }
    }, 1000);
  };

  const pauseTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
  };

  const stopTimer = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    if (!startRef.current || !selectedUser || !workspaceId) return;

    const endTime = new Date();
    const durationMin = Math.max(1, Math.round(elapsed / 60));

    try {
      const { error } = await supabase.from("time_entries").insert({
        tarefa_id: tarefaId,
        projeto_id: projetoId,
        user_id: selectedUser,
        workspace_id: workspaceId,
        start_time: startRef.current.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: durationMin,
      });
      if (error) throw error;
      toast({ title: `${durationMin} min registrados` });
      setElapsed(0);
      startRef.current = null;
      await refreshEntries();
    } catch (err: any) {
      toast({ title: "Erro ao registrar tempo", description: err.message, variant: "destructive" });
    }
  };

  const addManual = async () => {
    const mins = parseInt(manualMinutes);
    if (!mins || mins <= 0 || !selectedUser || !workspaceId) {
      if (!selectedUser) toast({ title: "Selecione o responsável", variant: "destructive" });
      return;
    }

    const now = new Date();
    try {
      const { error } = await supabase.from("time_entries").insert({
        tarefa_id: tarefaId,
        projeto_id: projetoId,
        user_id: selectedUser,
        workspace_id: workspaceId,
        start_time: now.toISOString(),
        end_time: now.toISOString(),
        duration_minutes: mins,
      });
      if (error) throw error;
      toast({ title: `${mins} min adicionados` });
      setManualMinutes("");
      await refreshEntries();
    } catch (err: any) {
      toast({ title: "Erro ao adicionar tempo", description: err.message, variant: "destructive" });
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await supabase.from("time_entries").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Registro excluído" });
      await refreshEntries();
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    }
    setDeleteEntryId(null);
  };

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const getProfileName = (userId: string) =>
    profiles.find((p) => p.user_id === userId)?.name ?? "—";

  const formatDuration = (mins: number | null) => {
    if (!mins) return "0 min";
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  const totalMinutes = entries.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);
  const totalDecimal = (totalMinutes / 60).toFixed(1);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <>
      <Dialog open={open} onOpenChange={() => { if (running) stopTimer(); onClose(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Time Tracker</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Responsible selector */}
            <div>
              <Label className="text-xs text-muted-foreground">Responsável</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="h-8 mt-1 text-xs">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Timer display */}
            <div className="text-center">
              <span className="text-4xl font-mono tabular-nums text-foreground">
                {formatElapsed(elapsed)}
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              {!running ? (
                <Button size="sm" onClick={startTimer} className="gap-1.5">
                  <Play className="size-4" /> Iniciar
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={pauseTimer} className="gap-1.5">
                  <Pause className="size-4" /> Pausar
                </Button>
              )}
              <Button
                size="sm"
                variant="destructive"
                onClick={stopTimer}
                disabled={elapsed === 0}
                className="gap-1.5"
              >
                <Square className="size-4" /> Parar
              </Button>
            </div>

            {/* Manual add */}
            <div className="border-t pt-4 space-y-2">
              <Label className="text-xs text-muted-foreground">Adicionar manualmente (minutos)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  placeholder="30"
                  className="h-8"
                />
                <Button size="sm" onClick={addManual} className="h-8 gap-1">
                  <Plus className="size-3" /> Adicionar
                </Button>
              </div>
            </div>

            {/* Entry history */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Histórico</Label>
                <span className="text-xs font-medium text-foreground">Total: {totalDecimal} h</span>
              </div>
              {entries.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhum registro.</p>
              ) : (
                <ScrollArea className="max-h-40">
                  <div className="space-y-1">
                    {entries.map((entry) => (
                      <div key={entry.id} className="group/entry flex items-center justify-between text-xs py-1.5 px-1 rounded hover:bg-muted">
                        <span className="text-foreground">{getProfileName(entry.user_id)}</span>
                        <span className="text-muted-foreground">{formatDuration(entry.duration_minutes)}</span>
                        <span className="text-muted-foreground">
                          {format(new Date(entry.created_at), "dd/MM/yy", { locale: ptBR })}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-5 opacity-0 group-hover/entry:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          onClick={() => setDeleteEntryId(entry.id)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete entry confirmation */}
      <AlertDialog open={!!deleteEntryId} onOpenChange={() => setDeleteEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro de tempo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteEntryId && deleteEntry(deleteEntryId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
