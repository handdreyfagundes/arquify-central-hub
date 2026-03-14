ALTER TABLE public.revisoes
  ALTER COLUMN subetapa_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS etapa_id uuid REFERENCES public.etapas(id) ON DELETE CASCADE;

-- Add constraint: must have either subetapa_id or etapa_id
ALTER TABLE public.revisoes
  ADD CONSTRAINT revisoes_must_have_parent
  CHECK (subetapa_id IS NOT NULL OR etapa_id IS NOT NULL);

-- RLS for etapa-level revisions
CREATE OR REPLACE FUNCTION public.get_revisao_workspace_id(_revisao_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    get_subetapa_workspace_id(subetapa_id),
    get_etapa_workspace_id(etapa_id)
  ) FROM public.revisoes WHERE id = _revisao_id LIMIT 1
$$;