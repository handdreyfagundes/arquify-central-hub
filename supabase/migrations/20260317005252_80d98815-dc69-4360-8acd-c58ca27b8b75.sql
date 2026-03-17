
-- Create trigger function to auto-create R00 for new subetapas
CREATE OR REPLACE FUNCTION public.auto_create_r00_subetapa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.revisoes (subetapa_id, etapa_id, numero_revisao, data_solicitacao, prazo_dias, data_nova_entrega)
  VALUES (NEW.id, NULL, 0, COALESCE(NEW.data_entrega, now()::date), 0, NEW.data_entrega);
  RETURN NEW;
END;
$$;

-- Create trigger function to auto-create R00 for new etapas (stages without substages)
CREATE OR REPLACE FUNCTION public.auto_create_r00_etapa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.revisoes (etapa_id, subetapa_id, numero_revisao, data_solicitacao, prazo_dias, data_nova_entrega)
  VALUES (NEW.id, NULL, 0, COALESCE(NEW.data_inicio, now()::date), 0, NEW.data_fim);
  RETURN NEW;
END;
$$;

-- Attach triggers
CREATE TRIGGER trg_auto_r00_subetapa
AFTER INSERT ON public.subetapas
FOR EACH ROW EXECUTE FUNCTION public.auto_create_r00_subetapa();

CREATE TRIGGER trg_auto_r00_etapa
AFTER INSERT ON public.etapas
FOR EACH ROW EXECUTE FUNCTION public.auto_create_r00_etapa();
