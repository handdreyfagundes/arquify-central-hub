-- Fix RLS insert policy for revisoes to reliably allow inserts by workspace
DROP POLICY IF EXISTS "Workspace insert" ON public.revisoes;

CREATE POLICY "Workspace insert"
ON public.revisoes
FOR INSERT
TO authenticated
WITH CHECK (
  (
    subetapa_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.subetapas s
      JOIN public.etapas e ON e.id = s.etapa_id
      JOIN public.projetos p ON p.id = e.projeto_id
      WHERE s.id = revisoes.subetapa_id
        AND p.workspace_id = get_user_workspace_id(auth.uid())
    )
  )
  OR
  (
    etapa_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.etapas e
      JOIN public.projetos p ON p.id = e.projeto_id
      WHERE e.id = revisoes.etapa_id
        AND p.workspace_id = get_user_workspace_id(auth.uid())
    )
  )
);