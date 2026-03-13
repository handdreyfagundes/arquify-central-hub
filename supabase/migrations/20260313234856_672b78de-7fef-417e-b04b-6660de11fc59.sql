
-- Fix: recreate the view as SECURITY INVOKER (default) instead of SECURITY DEFINER
DROP VIEW IF EXISTS public.v_rentabilidade_projetos;
CREATE VIEW public.v_rentabilidade_projetos WITH (security_invoker = true) AS
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
