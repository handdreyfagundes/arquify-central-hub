
-- Table for visits in the Obra tab
CREATE TABLE public.visitas_obra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  numero_visita integer NOT NULL DEFAULT 1,
  data_visita date NOT NULL DEFAULT now()::date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.visitas_obra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace isolation select" ON public.visitas_obra FOR SELECT TO authenticated
  USING (workspace_id = get_user_workspace_id(auth.uid()));
CREATE POLICY "Workspace isolation insert" ON public.visitas_obra FOR INSERT TO authenticated
  WITH CHECK (workspace_id = get_user_workspace_id(auth.uid()));
CREATE POLICY "Workspace isolation update" ON public.visitas_obra FOR UPDATE TO authenticated
  USING (workspace_id = get_user_workspace_id(auth.uid()));
CREATE POLICY "Workspace isolation delete" ON public.visitas_obra FOR DELETE TO authenticated
  USING (workspace_id = get_user_workspace_id(auth.uid()));

-- Table for draft media selections (to be used later in Ata de Obra)
CREATE TABLE public.obra_draft_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  arquivo_id uuid NOT NULL REFERENCES public.arquivos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.obra_draft_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace isolation select" ON public.obra_draft_media FOR SELECT TO authenticated
  USING (workspace_id = get_user_workspace_id(auth.uid()));
CREATE POLICY "Workspace isolation insert" ON public.obra_draft_media FOR INSERT TO authenticated
  WITH CHECK (workspace_id = get_user_workspace_id(auth.uid()));
CREATE POLICY "Workspace isolation delete" ON public.obra_draft_media FOR DELETE TO authenticated
  USING (workspace_id = get_user_workspace_id(auth.uid()));
