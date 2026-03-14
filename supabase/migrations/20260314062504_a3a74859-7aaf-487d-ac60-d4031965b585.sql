-- Fix RLS policies for revisoes to handle both subetapa-level and etapa-level revisions
DROP POLICY IF EXISTS "Workspace delete" ON public.revisoes;
DROP POLICY IF EXISTS "Workspace insert" ON public.revisoes;
DROP POLICY IF EXISTS "Workspace select" ON public.revisoes;
DROP POLICY IF EXISTS "Workspace update" ON public.revisoes;

CREATE POLICY "Workspace select" ON public.revisoes
  FOR SELECT TO authenticated
  USING (
    get_revisao_workspace_id(id) = get_user_workspace_id(auth.uid())
  );

CREATE POLICY "Workspace insert" ON public.revisoes
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE(get_subetapa_workspace_id(subetapa_id), get_etapa_workspace_id(etapa_id)) = get_user_workspace_id(auth.uid())
  );

CREATE POLICY "Workspace update" ON public.revisoes
  FOR UPDATE TO authenticated
  USING (
    get_revisao_workspace_id(id) = get_user_workspace_id(auth.uid())
  );

CREATE POLICY "Workspace delete" ON public.revisoes
  FOR DELETE TO authenticated
  USING (
    get_revisao_workspace_id(id) = get_user_workspace_id(auth.uid())
  );