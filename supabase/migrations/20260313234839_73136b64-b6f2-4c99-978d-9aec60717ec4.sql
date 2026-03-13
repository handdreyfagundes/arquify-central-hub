
-- ENUMS
CREATE TYPE public.workspace_type AS ENUM ('arquitetura', 'interiores');
CREATE TYPE public.project_type AS ENUM ('arquitetura', 'interiores');
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'arquiteto', 'colaborador', 'cliente', 'fornecedor');
CREATE TYPE public.project_status AS ENUM ('briefing', 'em_andamento', 'pausado', 'concluido', 'cancelado');
CREATE TYPE public.stage_status AS ENUM ('pendente', 'em_andamento', 'concluida');
CREATE TYPE public.task_status AS ENUM ('pendente', 'em_andamento', 'em_revisao', 'concluida', 'cancelada');
CREATE TYPE public.task_priority AS ENUM ('baixa', 'media', 'alta', 'urgente');
CREATE TYPE public.approval_status AS ENUM ('pendente', 'aprovado', 'reprovado');
CREATE TYPE public.invoice_status AS ENUM ('pendente', 'pago', 'atrasado', 'cancelado');
CREATE TYPE public.supplier_request_status AS ENUM ('pendente', 'enviado', 'respondido', 'aprovado', 'recusado');
CREATE TYPE public.budget_status AS ENUM ('pendente', 'aprovado', 'recusado');
CREATE TYPE public.event_type AS ENUM ('reuniao', 'visita_obra', 'entrega', 'prazo', 'outro');
CREATE TYPE public.notification_type AS ENUM ('tarefa_atrasada', 'aprovacao_pendente', 'parcela_vencendo', 'evento_proximo', 'comentario', 'geral');

-- WORKSPACES
CREATE TABLE public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  workspace_type public.workspace_type NOT NULL DEFAULT 'arquitetura',
  responsavel_nome TEXT,
  email_principal TEXT,
  tamanho_equipe INTEGER,
  cidade TEXT,
  estado TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- PROFILES (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES (separate table per security guidelines)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, workspace_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER FUNCTION for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_workspace_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT workspace_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- CLIENTES
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  cpf TEXT,
  endereco_atual TEXT,
  endereco_obra TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- FORNECEDORES
CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  categoria TEXT,
  telefone TEXT,
  email TEXT,
  cidade TEXT,
  avaliacao NUMERIC(2,1) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

-- PROJETOS
CREATE TABLE public.projetos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  project_type public.project_type NOT NULL DEFAULT 'arquitetura',
  cor TEXT DEFAULT '#6366f1',
  imagem_capa TEXT,
  endereco_obra TEXT,
  valor_projeto NUMERIC(12,2),
  prazo_macro DATE,
  status public.project_status NOT NULL DEFAULT 'briefing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;

-- ETAPAS
CREATE TABLE public.etapas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  status public.stage_status NOT NULL DEFAULT 'pendente',
  data_inicio DATE,
  data_fim DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.etapas ENABLE ROW LEVEL SECURITY;

-- TAREFAS
CREATE TABLE public.tarefas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE NOT NULL,
  etapa_id UUID REFERENCES public.etapas(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  ambiente TEXT,
  item TEXT,
  revisao INTEGER DEFAULT 0,
  responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.task_status NOT NULL DEFAULT 'pendente',
  prioridade public.task_priority NOT NULL DEFAULT 'media',
  prazo_limite DATE,
  prazo_interno DATE,
  horas_estimadas NUMERIC(6,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

-- TIME ENTRIES
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE NOT NULL,
  tarefa_id UUID REFERENCES public.tarefas(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- ARQUIVOS
CREATE TABLE public.arquivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE NOT NULL,
  etapa_id UUID REFERENCES public.etapas(id) ON DELETE SET NULL,
  tarefa_id UUID REFERENCES public.tarefas(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  file_url TEXT NOT NULL,
  visivel_cliente BOOLEAN DEFAULT false,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.arquivos ENABLE ROW LEVEL SECURITY;

-- COMENTARIOS
CREATE TABLE public.comentarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE NOT NULL,
  tarefa_id UUID REFERENCES public.tarefas(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  conteudo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;

-- APROVACOES
CREATE TABLE public.aprovacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE NOT NULL,
  etapa_id UUID REFERENCES public.etapas(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  status public.approval_status NOT NULL DEFAULT 'pendente',
  comentario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.aprovacoes ENABLE ROW LEVEL SECURITY;

-- SOLICITACOES_FORNECEDORES
CREATE TABLE public.solicitacoes_fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE NOT NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE CASCADE NOT NULL,
  descricao TEXT,
  status public.supplier_request_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.solicitacoes_fornecedores ENABLE ROW LEVEL SECURITY;

-- ORCAMENTOS
CREATE TABLE public.orcamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_id UUID REFERENCES public.solicitacoes_fornecedores(id) ON DELETE CASCADE NOT NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE CASCADE NOT NULL,
  valor NUMERIC(12,2),
  descricao TEXT,
  arquivo_url TEXT,
  status public.budget_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;

-- PARCELAS
CREATE TABLE public.parcelas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE NOT NULL,
  numero_parcela INTEGER NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  status public.invoice_status NOT NULL DEFAULT 'pendente',
  data_recebimento DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.parcelas ENABLE ROW LEVEL SECURITY;

-- EVENTOS
CREATE TABLE public.eventos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  projeto_id UUID REFERENCES public.projetos(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  tipo_evento public.event_type NOT NULL DEFAULT 'outro',
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ,
  local TEXT,
  responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

-- NOTIFICACOES
CREATE TABLE public.notificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tipo public.notification_type NOT NULL DEFAULT 'geral',
  titulo TEXT NOT NULL,
  mensagem TEXT,
  lida BOOLEAN DEFAULT false,
  projeto_id UUID REFERENCES public.projetos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- RENTABILIDADE VIEW
CREATE OR REPLACE VIEW public.v_rentabilidade_projetos AS
SELECT
  p.id AS projeto_id,
  p.workspace_id,
  p.nome,
  p.valor_projeto,
  COALESCE(SUM(te.duration_minutes), 0) AS total_minutos,
  ROUND(COALESCE(SUM(te.duration_minutes), 0) / 60.0, 2) AS total_horas,
  CASE WHEN COALESCE(SUM(te.duration_minutes), 0) > 0
    THEN ROUND(p.valor_projeto / (SUM(te.duration_minutes) / 60.0), 2)
    ELSE NULL
  END AS valor_hora
FROM public.projetos p
LEFT JOIN public.time_entries te ON te.projeto_id = p.id
GROUP BY p.id, p.workspace_id, p.nome, p.valor_projeto;

-- RLS POLICIES (workspace isolation)

-- Workspaces: users can see their own workspace
CREATE POLICY "Users see own workspace" ON public.workspaces
  FOR SELECT TO authenticated
  USING (id = public.get_user_workspace_id(auth.uid()));

CREATE POLICY "Admins manage workspace" ON public.workspaces
  FOR ALL TO authenticated
  USING (id = public.get_user_workspace_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE POLICY "Users see workspace profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (workspace_id = public.get_user_workspace_id(auth.uid()));

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- User roles
CREATE POLICY "Users see workspace roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (workspace_id = public.get_user_workspace_id(auth.uid()));

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (workspace_id = public.get_user_workspace_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Macro policy for workspace-scoped tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'clientes', 'fornecedores', 'projetos', 'time_entries',
    'arquivos', 'comentarios', 'eventos', 'notificacoes'
  ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "Workspace isolation select" ON public.%I FOR SELECT TO authenticated USING (workspace_id = public.get_user_workspace_id(auth.uid()))',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Workspace isolation insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (workspace_id = public.get_user_workspace_id(auth.uid()))',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Workspace isolation update" ON public.%I FOR UPDATE TO authenticated USING (workspace_id = public.get_user_workspace_id(auth.uid()))',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Workspace isolation delete" ON public.%I FOR DELETE TO authenticated USING (workspace_id = public.get_user_workspace_id(auth.uid()))',
      tbl
    );
  END LOOP;
END $$;

-- Project-child tables (use projeto_id → workspace via join)
CREATE OR REPLACE FUNCTION public.get_project_workspace_id(_projeto_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT workspace_id FROM public.projetos WHERE id = _projeto_id LIMIT 1
$$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'etapas', 'tarefas', 'aprovacoes', 'parcelas'
  ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "Project workspace select" ON public.%I FOR SELECT TO authenticated USING (public.get_project_workspace_id(projeto_id) = public.get_user_workspace_id(auth.uid()))',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Project workspace insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.get_project_workspace_id(projeto_id) = public.get_user_workspace_id(auth.uid()))',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Project workspace update" ON public.%I FOR UPDATE TO authenticated USING (public.get_project_workspace_id(projeto_id) = public.get_user_workspace_id(auth.uid()))',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Project workspace delete" ON public.%I FOR DELETE TO authenticated USING (public.get_project_workspace_id(projeto_id) = public.get_user_workspace_id(auth.uid()))',
      tbl
    );
  END LOOP;
END $$;

-- Solicitacoes & Orcamentos (via projeto_id on solicitacoes)
CREATE POLICY "Workspace select" ON public.solicitacoes_fornecedores
  FOR SELECT TO authenticated
  USING (public.get_project_workspace_id(projeto_id) = public.get_user_workspace_id(auth.uid()));
CREATE POLICY "Workspace insert" ON public.solicitacoes_fornecedores
  FOR INSERT TO authenticated
  WITH CHECK (public.get_project_workspace_id(projeto_id) = public.get_user_workspace_id(auth.uid()));
CREATE POLICY "Workspace update" ON public.solicitacoes_fornecedores
  FOR UPDATE TO authenticated
  USING (public.get_project_workspace_id(projeto_id) = public.get_user_workspace_id(auth.uid()));
CREATE POLICY "Workspace delete" ON public.solicitacoes_fornecedores
  FOR DELETE TO authenticated
  USING (public.get_project_workspace_id(projeto_id) = public.get_user_workspace_id(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_solicitacao_workspace_id(_solicitacao_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.get_project_workspace_id(projeto_id) FROM public.solicitacoes_fornecedores WHERE id = _solicitacao_id LIMIT 1
$$;

CREATE POLICY "Workspace select" ON public.orcamentos
  FOR SELECT TO authenticated
  USING (public.get_solicitacao_workspace_id(solicitacao_id) = public.get_user_workspace_id(auth.uid()));
CREATE POLICY "Workspace insert" ON public.orcamentos
  FOR INSERT TO authenticated
  WITH CHECK (public.get_solicitacao_workspace_id(solicitacao_id) = public.get_user_workspace_id(auth.uid()));
CREATE POLICY "Workspace update" ON public.orcamentos
  FOR UPDATE TO authenticated
  USING (public.get_solicitacao_workspace_id(solicitacao_id) = public.get_user_workspace_id(auth.uid()));
CREATE POLICY "Workspace delete" ON public.orcamentos
  FOR DELETE TO authenticated
  USING (public.get_solicitacao_workspace_id(solicitacao_id) = public.get_user_workspace_id(auth.uid()));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'workspaces', 'profiles', 'clientes', 'fornecedores', 'projetos',
    'tarefas', 'aprovacoes', 'solicitacoes_fornecedores', 'orcamentos'
  ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      tbl, tbl
    );
  END LOOP;
END $$;

-- Indexes for performance
CREATE INDEX idx_profiles_workspace ON public.profiles(workspace_id);
CREATE INDEX idx_profiles_user ON public.profiles(user_id);
CREATE INDEX idx_projetos_workspace ON public.projetos(workspace_id);
CREATE INDEX idx_projetos_cliente ON public.projetos(cliente_id);
CREATE INDEX idx_etapas_projeto ON public.etapas(projeto_id);
CREATE INDEX idx_tarefas_projeto ON public.tarefas(projeto_id);
CREATE INDEX idx_tarefas_etapa ON public.tarefas(etapa_id);
CREATE INDEX idx_tarefas_responsavel ON public.tarefas(responsavel_id);
CREATE INDEX idx_time_entries_projeto ON public.time_entries(projeto_id);
CREATE INDEX idx_arquivos_projeto ON public.arquivos(projeto_id);
CREATE INDEX idx_comentarios_projeto ON public.comentarios(projeto_id);
CREATE INDEX idx_aprovacoes_projeto ON public.aprovacoes(projeto_id);
CREATE INDEX idx_parcelas_projeto ON public.parcelas(projeto_id);
CREATE INDEX idx_eventos_workspace ON public.eventos(workspace_id);
CREATE INDEX idx_notificacoes_user ON public.notificacoes(user_id);
CREATE INDEX idx_clientes_workspace ON public.clientes(workspace_id);
CREATE INDEX idx_fornecedores_workspace ON public.fornecedores(workspace_id);
