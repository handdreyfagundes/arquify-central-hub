import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getUserWorkspaceId } from "@/services/workspace";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const COLOR_OPTIONS = [
  "#7C3AED", "#2563EB", "#059669", "#D97706", "#DC2626",
  "#EC4899", "#0891B2", "#4F46E5", "#16A34A", "#CA8A04",
  "#8B5CF6", "#0EA5E9",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface ClienteOption {
  id: string;
  nome: string;
}

export function CreateProjectDialog({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);

  // Form state
  const [nome, setNome] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [newClienteName, setNewClienteName] = useState("");
  const [projectType, setProjectType] = useState<"arquitetura" | "interiores">("arquitetura");
  const [metragem, setMetragem] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cor, setCor] = useState(COLOR_OPTIONS[0]);
  const [valor, setValor] = useState("");
  const [prazoMacro, setPrazoMacro] = useState("");

  useEffect(() => {
    if (open && user) {
      loadClientes();
    }
  }, [open, user]);

  const loadClientes = async () => {
    if (!user) return;
    const workspaceId = await getUserWorkspaceId(user.id);
    const { data } = await supabase
      .from("clientes")
      .select("id, nome")
      .eq("workspace_id", workspaceId)
      .order("nome");
    setClientes(data ?? []);
  };

  const resetForm = () => {
    setNome("");
    setClienteId("");
    setNewClienteName("");
    setProjectType("arquitetura");
    setMetragem("");
    setEndereco("");
    setCor(COLOR_OPTIONS[0]);
    setValor("");
    setPrazoMacro("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !nome.trim()) return;

    setSaving(true);
    try {
      const workspaceId = await getUserWorkspaceId(user.id);

      // Create client if needed
      let finalClienteId = clienteId || null;
      if (!clienteId && newClienteName.trim()) {
        const { data: newClient, error: clientError } = await supabase
          .from("clientes")
          .insert({ nome: newClienteName.trim(), workspace_id: workspaceId })
          .select("id")
          .single();
        if (clientError) throw clientError;
        finalClienteId = newClient.id;
      }

      const { error } = await supabase.from("projetos").insert({
        nome: nome.trim(),
        cliente_id: finalClienteId,
        project_type: projectType,
        metragem: metragem ? parseFloat(metragem) : null,
        endereco_obra: endereco.trim() || null,
        cor,
        valor_projeto: valor ? parseFloat(valor) : null,
        prazo_macro: prazoMacro || null,
        workspace_id: workspaceId,
      });

      if (error) throw error;

      toast({ title: "Projeto criado com sucesso!" });
      resetForm();
      onCreated();
    } catch (e: any) {
      toast({ title: "Erro ao criar projeto", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Projeto</DialogTitle>
          <DialogDescription>Preencha as informações do projeto.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-nome">Nome do projeto *</Label>
            <Input id="proj-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>

          {/* Cliente */}
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            {clientes.length > 0 ? (
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new__">+ Novo cliente</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="Nome do cliente"
                value={newClienteName}
                onChange={(e) => setNewClienteName(e.target.value)}
              />
            )}
            {clienteId === "__new__" && (
              <Input
                className="mt-2"
                placeholder="Nome do novo cliente"
                value={newClienteName}
                onChange={(e) => setNewClienteName(e.target.value)}
              />
            )}
          </div>

          {/* Categoria + Metragem */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={projectType} onValueChange={(v) => setProjectType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="arquitetura">Arquitetura</SelectItem>
                  <SelectItem value="interiores">Interiores</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-metragem">Metragem (m²)</Label>
              <Input
                id="proj-metragem"
                type="number"
                step="0.01"
                value={metragem}
                onChange={(e) => setMetragem(e.target.value)}
              />
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-endereco">Endereço da obra</Label>
            <Textarea
              id="proj-endereco"
              rows={2}
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
            />
          </div>

          {/* Cor do projeto */}
          <div className="space-y-1.5">
            <Label>Cor do projeto</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className="size-8 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: cor === c ? "hsl(var(--foreground))" : "transparent",
                    transform: cor === c ? "scale(1.15)" : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Valor + Prazo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="proj-valor">Valor do projeto (R$)</Label>
              <Input
                id="proj-valor"
                type="number"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-prazo">Prazo macro</Label>
              <Input
                id="proj-prazo"
                type="date"
                value={prazoMacro}
                onChange={(e) => setPrazoMacro(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !nome.trim()}>
              {saving ? "Criando..." : "Criar projeto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
