
-- Add count_type to projetos (business days vs calendar days)
ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS count_type text NOT NULL DEFAULT 'uteis';

-- Add duracao_dias to etapas
ALTER TABLE public.etapas
  ADD COLUMN IF NOT EXISTS duracao_dias integer;

-- Create subetapas table
CREATE TABLE public.subetapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id uuid NOT NULL REFERENCES public.etapas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  intervalo_dias integer NOT NULL DEFAULT 0,
  data_entrega date,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subetapas ENABLE ROW LEVEL SECURITY;

-- RLS: derive workspace through etapa -> projeto
CREATE OR REPLACE FUNCTION public.get_etapa_workspace_id(_etapa_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT get_project_workspace_id(projeto_id) FROM public.etapas WHERE id = _etapa_id LIMIT 1
$$;

CREATE POLICY "Workspace select" ON public.subetapas FOR SELECT TO authenticated
  USING (get_etapa_workspace_id(etapa_id) = get_user_workspace_id(auth.uid()));
CREATE POLICY "Workspace insert" ON public.subetapas FOR INSERT TO authenticated
  WITH CHECK (get_etapa_workspace_id(etapa_id) = get_user_workspace_id(auth.uid()));
CREATE POLICY "Workspace update" ON public.subetapas FOR UPDATE TO authenticated
  USING (get_etapa_workspace_id(etapa_id) = get_user_workspace_id(auth.uid()));
CREATE POLICY "Workspace delete" ON public.subetapas FOR DELETE TO authenticated
  USING (get_etapa_workspace_id(etapa_id) = get_user_workspace_id(auth.uid()));

-- Create revisoes table
CREATE TABLE public.revisoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subetapa_id uuid NOT NULL REFERENCES public.subetapas(id) ON DELETE CASCADE,
  numero_revisao integer NOT NULL DEFAULT 1,
  data_solicitacao date NOT NULL,
  prazo_dias integer NOT NULL DEFAULT 5,
  data_nova_entrega date,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.revisoes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_subetapa_workspace_id(_subetapa_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT get_etapa_workspace_id(etapa_id) FROM public.subetapas WHERE id = _subetapa_id LIMIT 1
$$;

CREATE POLICY "Workspace select" ON public.revisoes FOR SELECT TO authenticated
  USING (get_subetapa_workspace_id(subetapa_id) = get_user_workspace_id(auth.uid()));
CREATE POLICY "Workspace insert" ON public.revisoes FOR INSERT TO authenticated
  WITH CHECK (get_subetapa_workspace_id(subetapa_id) = get_user_workspace_id(auth.uid()));
CREATE POLICY "Workspace update" ON public.revisoes FOR UPDATE TO authenticated
  USING (get_subetapa_workspace_id(subetapa_id) = get_user_workspace_id(auth.uid()));
CREATE POLICY "Workspace delete" ON public.revisoes FOR DELETE TO authenticated
  USING (get_subetapa_workspace_id(subetapa_id) = get_user_workspace_id(auth.uid()));
