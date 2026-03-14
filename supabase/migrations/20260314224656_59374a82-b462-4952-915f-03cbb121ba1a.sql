
CREATE TABLE public.tarefa_responsaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tarefa_id, user_id)
);

ALTER TABLE public.tarefa_responsaveis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project workspace select" ON public.tarefa_responsaveis
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tarefas t
      WHERE t.id = tarefa_responsaveis.tarefa_id
      AND get_project_workspace_id(t.projeto_id) = get_user_workspace_id(auth.uid())
    )
  );

CREATE POLICY "Project workspace insert" ON public.tarefa_responsaveis
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tarefas t
      WHERE t.id = tarefa_responsaveis.tarefa_id
      AND get_project_workspace_id(t.projeto_id) = get_user_workspace_id(auth.uid())
    )
  );

CREATE POLICY "Project workspace delete" ON public.tarefa_responsaveis
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tarefas t
      WHERE t.id = tarefa_responsaveis.tarefa_id
      AND get_project_workspace_id(t.projeto_id) = get_user_workspace_id(auth.uid())
    )
  );
