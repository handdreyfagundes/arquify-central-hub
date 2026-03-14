-- Secure onboarding bootstrap: create workspace + profile + admin role in one atomic operation
CREATE OR REPLACE FUNCTION public.bootstrap_workspace(
  _workspace_name text,
  _cidade text DEFAULT NULL,
  _estado text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _workspace_id uuid;
  _profile_name text;
  _profile_email text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF COALESCE(TRIM(_workspace_name), '') = '' THEN
    RAISE EXCEPTION 'Nome do escritório é obrigatório';
  END IF;

  -- Prevent duplicate onboarding/bootstrap for same user
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id)
     OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'Workspace já configurado para este usuário';
  END IF;

  INSERT INTO public.workspaces (name, cidade, estado)
  VALUES (
    TRIM(_workspace_name),
    NULLIF(TRIM(COALESCE(_cidade, '')), ''),
    NULLIF(TRIM(COALESCE(_estado, '')), '')
  )
  RETURNING id INTO _workspace_id;

  _profile_email := COALESCE(NULLIF(TRIM(auth.jwt() ->> 'email'), ''), _user_id::text || '@local');
  _profile_name := COALESCE(
    NULLIF(TRIM(auth.jwt() -> 'user_metadata' ->> 'name'), ''),
    split_part(_profile_email, '@', 1),
    'Usuário'
  );

  INSERT INTO public.profiles (user_id, workspace_id, name, email)
  VALUES (_user_id, _workspace_id, _profile_name, _profile_email);

  INSERT INTO public.user_roles (user_id, workspace_id, role)
  VALUES (_user_id, _workspace_id, 'admin');

  RETURN _workspace_id;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_workspace(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_workspace(text, text, text) TO authenticated;

-- Remove temporary permissive onboarding policies
DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can self-assign initial role" ON public.user_roles;