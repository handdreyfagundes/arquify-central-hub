-- Allow authenticated users to create workspaces (onboarding)
CREATE POLICY "Authenticated users can create workspaces"
ON public.workspaces
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to self-assign initial role during onboarding
CREATE POLICY "Users can self-assign initial role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());