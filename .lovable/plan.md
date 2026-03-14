

## Diagnóstico

O erro "new row violates row-level security policy for table workspaces" ocorre porque a política RLS da tabela `workspaces` só permite INSERT para usuários que já são admin de um workspace. Durante o onboarding, o usuário ainda não tem workspace nem role — logo a inserção é bloqueada.

## Solução

Adicionar uma política RLS de INSERT na tabela `workspaces` que permita qualquer usuário autenticado criar um workspace (necessário para o onboarding). A segurança é mantida porque as demais operações (UPDATE, DELETE) continuam restritas a admins do workspace.

### Migração SQL

```sql
CREATE POLICY "Authenticated users can create workspaces"
ON public.workspaces
FOR INSERT
TO authenticated
WITH CHECK (true);
```

Também precisamos verificar se a inserção no `user_roles` funciona — a política atual exige que o usuário já seja admin do workspace. Precisamos de uma política de INSERT no `user_roles` para o próprio usuário durante o onboarding:

```sql
CREATE POLICY "Users can self-assign initial role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
```

### Arquivos modificados

Nenhum arquivo de código precisa ser alterado. Apenas uma migração SQL.

