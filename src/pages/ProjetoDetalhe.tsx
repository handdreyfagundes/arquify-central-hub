import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";

/**
 * PROJECT PAGE STRUCTURE
 * 
 * Header: project name, client, status, color, cover, progress %, next milestone
 * Quick Metrics: open tasks, overdue, pending approvals, tracked hours, pending invoices, active suppliers
 * Tabs: Visão Geral | Etapas | Tarefas | Arquivos | Aprovações | Comentários | Fornecedores | Financeiro | Relatórios | Portal do Cliente
 * 
 * INTERACTION MODEL:
 * Clicking tasks, files, or approvals opens a Sheet (side drawer) to keep user in project context.
 */

const PROJECT_TABS = [
  { value: "visao-geral", label: "Visão Geral" },
  { value: "etapas", label: "Etapas" },
  { value: "tarefas", label: "Tarefas" },
  { value: "arquivos", label: "Arquivos" },
  { value: "aprovacoes", label: "Aprovações" },
  { value: "comentarios", label: "Comentários" },
  { value: "fornecedores", label: "Fornecedores" },
  { value: "financeiro", label: "Financeiro" },
  { value: "relatorios", label: "Relatórios" },
  { value: "portal-cliente", label: "Portal do Cliente" },
];

const ProjetoDetalhe = () => {
  const { id } = useParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState("");

  const openDrawer = (title: string) => {
    setDrawerTitle(title);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* PROJECT HEADER */}
      <section>
        <h1 className="text-2xl font-bold">Projeto #{id}</h1>
        <p className="text-muted-foreground">Header: nome, cliente, status, cor, capa, progresso, próximo marco</p>
      </section>

      {/* QUICK METRICS */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {["Tarefas abertas", "Tarefas atrasadas", "Aprovações pendentes", "Horas registradas", "Parcelas pendentes", "Fornecedores ativos"].map((m) => (
          <div key={m} className="rounded-md border p-3 text-sm">{m}: —</div>
        ))}
      </section>

      {/* TABS */}
      <Tabs defaultValue="visao-geral">
        <TabsList className="flex flex-wrap">
          {PROJECT_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>
        {PROJECT_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <div className="py-4">
              <p className="text-muted-foreground">{tab.label} — conteúdo placeholder</p>
              {["tarefas", "arquivos", "aprovacoes"].includes(tab.value) && (
                <button
                  className="mt-2 text-sm underline"
                  onClick={() => openDrawer(tab.label)}
                >
                  Abrir detalhe (drawer)
                </button>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* SIDE PANEL (DRAWER) */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{drawerTitle}</SheetTitle>
          </SheetHeader>
          <div className="py-4 text-sm text-muted-foreground">
            Detalhe do item — painel lateral para manter contexto do projeto.
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ProjetoDetalhe;
