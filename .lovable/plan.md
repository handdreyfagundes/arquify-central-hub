
Objetivo: corrigir definitivamente o erro de onboarding (“new row violates row-level security policy for table workspaces”) sem reconstruir auth, sem refazer schema, e mantendo o fluxo atual.

Diagnóstico confirmado:
- O request de criação de workspace está indo autenticado (Bearer com role `authenticated`), mas retorna 403 RLS.
- O SQL executado pelo backend (log) é um `INSERT ... RETURNING ...` embrulhado em `WITH pgrst_source ... SELECT`, disparado por `.insert(...).select().single()`.
- Esse caminho está falhando no bootstrap inicial do tenant e o patch atual de políticas amplas não resolveu.

Plano de correção (seguro e estável):

1) Substituir bootstrap do onboarding por função backend atômica
- Criar uma função SQL `public.bootstrap_workspace(...)` com `SECURITY DEFINER` que:
  - valida `auth.uid()` (usuário autenticado),
  - impede bootstrap duplicado (se já existir profile para o usuário),
  - cria `workspace`,
  - cria `profile` do usuário no workspace,
  - cria `user_role = admin`,
  - retorna `workspace_id`.
- Tudo em uma única transação no banco (evita estado parcial).

2) Remover políticas provisórias excessivamente permissivas
- Remover:
  - `Authenticated users can create workspaces` (`WITH CHECK true`)
  - `Users can self-assign initial role` (`WITH CHECK user_id = auth.uid()`)
- Motivo: essas políticas abrem superfície de abuso (ex.: auto-atribuição fora do contexto ideal).
- Resultado: onboarding inicial passa pela função segura; operações normais seguem políticas de isolamento já existentes.

3) Ajustar apenas a chamada do Onboarding (sem redesenhar tela/fluxo)
- Em `Onboarding.tsx`, trocar os 3 inserts client-side por uma única chamada RPC para `bootstrap_workspace`.
- Manter exatamente o mesmo UX:
  - formulário atual,
  - `setStep("project")`,
  - toasts,
  - navegação.
- Não mexer no design nem na estrutura da página.

4) Garantir consistência para o passo “criar primeiro projeto”
- Continuar usando o `workspace_id` retornado pela função para criar cliente + projeto no passo seguinte.
- Sem alterações nas regras de projeto, apenas preservando o contexto correto do workspace.

Validação após implementação:
- Teste com usuário novo:
  1. cadastro/login,
  2. onboarding do escritório,
  3. avanço para passo de primeiro projeto sem erro RLS.
- Teste com usuário já onboardado:
  - função deve bloquear bootstrap duplicado com mensagem amigável.
- Verificar no log que não há novos `42501` em `workspaces` durante onboarding.

Observação técnica:
- Essa abordagem corrige o erro atual e melhora segurança multi-tenant, sem alterar autenticação existente e sem regenerar schema.
