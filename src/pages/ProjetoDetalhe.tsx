import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CronogramaTab from "@/components/projetos/CronogramaTab";
import AndamentoResumo from "@/components/projetos/AndamentoResumo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  LayoutDashboard,
  CalendarRange,
  CheckSquare,
  FileText,
  Receipt,
  Truck,
  ThumbsUp,
  ClipboardList,
  MessageSquare,
  MapPin,
  Ruler,
  Tag,
  Users,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PROJECT_TABS = [
  { value: "visao-geral", label: "Visão geral", icon: LayoutDashboard },
  { value: "cronograma", label: "Cronograma", icon: CalendarRange },
  { value: "tarefas", label: "Tarefas", icon: CheckSquare },
  { value: "arquivos", label: "Arquivos", icon: FileText },
  { value: "orcamentos", label: "Orçamentos", icon: Receipt },
  { value: "fornecedores", label: "Fornecedores", icon: Truck },
  { value: "aprovacoes", label: "Aprovações", icon: ThumbsUp },
  { value: "atas-relatorios", label: "Atas e Relatórios", icon: ClipboardList },
  { value: "comentarios", label: "Comentários", icon: MessageSquare },
];

interface ProjetoData {
  id: string;
  nome: string;
  cor: string | null;
  imagem_capa: string | null;
  project_type: string;
  status: string;
  descricao: string | null;
  endereco_obra: string | null;
  metragem: number | null;
  valor_projeto: number | null;
  prazo_macro: string | null;
  clientes: { nome: string; email: string | null; telefone: string | null } | null;
}

const ProjetoDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projeto, setProjeto] = useState<ProjetoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("*, clientes(nome, email, telefone)")
        .eq("id", id)
        .single();

      if (error) {
        toast({ title: "Projeto não encontrado", variant: "destructive" });
        navigate("/projetos");
        return;
      }
      setProjeto(data as unknown as ProjetoData);
      setLoading(false);
    })();
  }, [id]);

  if (loading || !projeto) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const color = projeto.cor || "#7C3AED";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projetos")}>
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-3">
            <div className="size-3 rounded-full" style={{ backgroundColor: color }} />
            <h1 className="text-2xl font-bold text-foreground">{projeto.nome}</h1>
            <Badge
              className="uppercase tracking-wider text-[10px]"
              style={{ backgroundColor: `${color}22`, color, borderColor: `${color}55` }}
              variant="outline"
            >
              {projeto.project_type === "interiores" ? "Interiores" : "Arquitetura"}
            </Badge>
          </div>
          {projeto.endereco_obra && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              {projeto.endereco_obra}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="visao-geral" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
          {PROJECT_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-2 text-sm text-muted-foreground transition-all data-[state=active]:border-primary/30 data-[state=active]:bg-accent data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              <tab.icon className="size-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* VISÃO GERAL */}
        <TabsContent value="visao-geral">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Ficha do projeto */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="size-4 text-primary" />
                  Ficha do projeto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Categoria:</span>
                  <Badge variant="secondary" className="capitalize">
                    {projeto.project_type}
                  </Badge>
                </div>
                {projeto.metragem && (
                  <div className="flex items-center gap-2">
                    <Ruler className="size-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Metragem:</span>
                    <span>{projeto.metragem} m²</span>
                  </div>
                )}
                {projeto.endereco_obra && (
                  <div className="flex items-start gap-2">
                    <MapPin className="size-3.5 mt-0.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Endereço:</span>
                    <span className="flex-1">{projeto.endereco_obra}</span>
                  </div>
                )}
                {projeto.valor_projeto && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(projeto.valor_projeto)}
                    </span>
                  </div>
                )}
                {projeto.prazo_macro && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Prazo macro:</span>
                    <span>{new Date(projeto.prazo_macro).toLocaleDateString("pt-BR")}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Equipe do projeto */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  Equipe do projeto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Nenhum membro atribuído ainda.
                </p>
              </CardContent>
            </Card>

            {/* Dados do cliente */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="size-4 text-primary" />
                  Dados do cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {projeto.clientes ? (
                  <>
                    <p className="font-medium">{projeto.clientes.nome}</p>
                    {projeto.clientes.email && (
                      <p className="text-muted-foreground">{projeto.clientes.email}</p>
                    )}
                    {projeto.clientes.telefone && (
                      <p className="text-muted-foreground">{projeto.clientes.telefone}</p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">Nenhum cliente vinculado.</p>
                )}
              </CardContent>
            </Card>
            {/* Andamento geral summary */}
            <div className="md:col-span-3">
              <AndamentoResumo projetoId={projeto.id} />
            </div>
          </div>
        </TabsContent>

        {/* CRONOGRAMA (full timeline) */}
        <TabsContent value="cronograma">
          <CronogramaTab projetoId={projeto.id} />
        </TabsContent>

        {/* Placeholder tabs */}
        {PROJECT_TABS.filter((t) => t.value !== "visao-geral" && t.value !== "cronograma").map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <tab.icon className="size-10 text-muted-foreground/40" />
                <p className="mt-3 text-muted-foreground">{tab.label} — em breve</p>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default ProjetoDetalhe;
