import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MessageSquare, CheckSquare, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getUserWorkspaceId } from "@/services/workspace";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CreateProjectDialog } from "@/components/projetos/CreateProjectDialog";
import { useToast } from "@/hooks/use-toast";

interface ProjetoCard {
  id: string;
  nome: string;
  cor: string | null;
  imagem_capa: string | null;
  project_type: string;
  status: string;
  clientes: { nome: string } | null;
  _task_count?: number;
  _comment_count?: number;
}

const PROJECT_COLORS = [
  "#7C3AED", "#2563EB", "#059669", "#D97706", "#DC2626",
  "#EC4899", "#0891B2", "#4F46E5", "#16A34A", "#CA8A04",
];

const STATUS_LABELS: Record<string, string> = {
  briefing: "Briefing",
  em_andamento: "Em andamento",
  pausado: "Pausado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const Projetos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projetos, setProjetos] = useState<ProjetoCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadProjetos = async () => {
    if (!user) return;
    try {
      const workspaceId = await getUserWorkspaceId(user.id);
      const { data, error } = await supabase
        .from("projetos")
        .select("id, nome, cor, imagem_capa, project_type, status, clientes(nome)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjetos((data as unknown as ProjetoCard[]) ?? []);
    } catch (e: any) {
      toast({ title: "Erro ao carregar projetos", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjetos();
  }, [user]);

  const filtered = projetos.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projetos</h1>
          <p className="text-sm text-muted-foreground">
            {projetos.length} projeto{projetos.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar projeto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-56"
            />
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Novo projeto
          </Button>
        </div>
      </div>

      {/* Board */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-medium text-foreground">Nenhum projeto encontrado</p>
          <p className="mt-1 text-sm text-muted-foreground">Crie seu primeiro projeto para começar.</p>
          <Button className="mt-4" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Criar projeto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((projeto) => (
            <ProjectCard
              key={projeto.id}
              projeto={projeto}
              onClick={() => navigate(`/projetos/${projeto.id}`)}
            />
          ))}
        </div>
      )}

      <CreateProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={() => {
          setDialogOpen(false);
          loadProjetos();
        }}
      />
    </div>
  );
};

function ProjectCard({
  projeto,
  onClick,
}: {
  projeto: ProjetoCard;
  onClick: () => void;
}) {
  const color = projeto.cor || "#7C3AED";

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Cover with color frame */}
      <div className="relative" style={{ padding: "6px 6px 0 6px", backgroundColor: `${color}22` }}>
        <div
          className="h-40 w-full rounded-t-lg bg-cover bg-center"
          style={{
            backgroundImage: projeto.imagem_capa
              ? `url(${projeto.imagem_capa})`
              : `linear-gradient(135deg, ${color}33, ${color}11)`,
            border: `3px solid ${color}55`,
            borderBottom: "none",
          }}
        />
        {/* Color indicator bar */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ backgroundColor: color }}
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {projeto.nome}
          </h3>
          <Badge variant="secondary" className="shrink-0 text-[10px] uppercase tracking-wider">
            {projeto.project_type === "interiores" ? "Int" : "Arq"}
          </Badge>
        </div>

        {projeto.clientes?.nome && (
          <p className="text-sm text-muted-foreground line-clamp-1">
            {projeto.clientes.nome}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <Badge
            variant="outline"
            className="text-xs"
            style={{ borderColor: `${color}66`, color }}
          >
            {STATUS_LABELS[projeto.status] ?? projeto.status}
          </Badge>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckSquare className="size-3" />0
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="size-3" />0
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default Projetos;
