
ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS pais text DEFAULT 'Brasil',
  ADD COLUMN IF NOT EXISTS estado_calendario text,
  ADD COLUMN IF NOT EXISTS cidade_calendario text;
