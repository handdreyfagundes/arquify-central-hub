import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"workspace" | "project">("workspace");
  const [loading, setLoading] = useState(false);

  // Workspace fields
  const [workspaceName, setWorkspaceName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  // Project fields
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [projectType, setProjectType] = useState<"arquitetura" | "interiores">("arquitetura");

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const { data: newWorkspaceId, error: bootstrapError } = await supabase.rpc(
        "bootstrap_workspace",
        {
          _workspace_name: workspaceName.trim(),
          _cidade: city.trim() || null,
          _estado: state.trim() || null,
        }
      );

      if (bootstrapError) throw bootstrapError;
      if (!newWorkspaceId) throw new Error("Não foi possível criar o escritório.");

      setWorkspaceId(newWorkspaceId);
      setStep("project");
      toast({ title: "Escritório criado com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    setLoading(true);

    try {
      // Create client first
      const { data: client, error: clientError } = await supabase
        .from("clientes")
        .insert({ nome: clientName, workspace_id: workspaceId })
        .select()
        .single();

      if (clientError) throw clientError;

      // Create project
      const { error: projectError } = await supabase
        .from("projetos")
        .insert({
          nome: projectName,
          cliente_id: client.id,
          workspace_id: workspaceId,
          project_type: projectType,
        });

      if (projectError) throw projectError;

      toast({ title: "Projeto criado com sucesso!" });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSkipProject = () => {
    navigate("/dashboard");
  };

  if (step === "workspace") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Configure seu escritório</CardTitle>
            <CardDescription>
              Crie o workspace do seu escritório de arquitetura
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ws-name">Nome do escritório</Label>
                <Input
                  id="ws-name"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  required
                  placeholder="Studio Arquitetura"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ws-city">Cidade</Label>
                <Input
                  id="ws-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="São Paulo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ws-state">Estado</Label>
                <Input
                  id="ws-state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="SP"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Criando..." : "Criar escritório"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Crie seu primeiro projeto</CardTitle>
          <CardDescription>
            Configure o primeiro projeto do seu escritório
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="proj-name">Nome do projeto</Label>
              <Input
                id="proj-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
                placeholder="Residência Silva"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-name">Nome do cliente</Label>
              <Input
                id="client-name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                placeholder="João Silva"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de projeto</Label>
              <Select value={projectType} onValueChange={(v) => setProjectType(v as "arquitetura" | "interiores")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="arquitetura">Arquitetura</SelectItem>
                  <SelectItem value="interiores">Interiores</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Criando..." : "Criar projeto"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={handleSkipProject}>
              Pular por enquanto
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
