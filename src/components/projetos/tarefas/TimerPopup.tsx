import { useState, useEffect, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Pause, Square, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Props {
  tarefaId: string;
  projetoId: string;
  open: boolean;
  onClose: () => void;
}

export default function TimerPopup({ tarefaId, projetoId, open, onClose }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [manualMinutes, setManualMinutes] = useState("");
  const startRef = useRef<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch workspace_id
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("workspace_id").eq("user_id", user.id).single()
      .then(({ data }) => setWorkspaceId(data?.workspace_id ?? null));
  }, [user]);

  const startTimer = () => {
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
    if (!startRef.current || !user || !workspaceId) return;

    const endTime = new Date();
    const durationMin = Math.max(1, Math.round(elapsed / 60));

    try {
      const { error } = await supabase.from("time_entries").insert({
        tarefa_id: tarefaId,
        projeto_id: projetoId,
        user_id: user.id,
        workspace_id: workspaceId,
        start_time: startRef.current.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: durationMin,
      });
      if (error) throw error;
      toast({ title: `${durationMin} min registrados` });
      setElapsed(0);
      startRef.current = null;
    } catch (err: any) {
      toast({ title: "Erro ao registrar tempo", description: err.message, variant: "destructive" });
    }
  };

  const addManual = async () => {
    const mins = parseInt(manualMinutes);
    if (!mins || mins <= 0 || !user || !workspaceId) return;

    const now = new Date();
    try {
      const { error } = await supabase.from("time_entries").insert({
        tarefa_id: tarefaId,
        projeto_id: projetoId,
        user_id: user.id,
        workspace_id: workspaceId,
        start_time: now.toISOString(),
        end_time: now.toISOString(),
        duration_minutes: mins,
      });
      if (error) throw error;
      toast({ title: `${mins} min adicionados` });
      setManualMinutes("");
    } catch (err: any) {
      toast({ title: "Erro ao adicionar tempo", description: err.message, variant: "destructive" });
    }
  };

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  // Cleanup on close
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={() => { stopTimer(); onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Time Tracker</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
