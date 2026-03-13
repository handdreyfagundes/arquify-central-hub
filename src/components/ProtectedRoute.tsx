import { useEffect, useState, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [hasWorkspace, setHasWorkspace] = useState(false);

  useEffect(() => {
    if (!user) {
      setCheckingProfile(false);
      return;
    }

    const checkProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("workspace_id")
        .eq("user_id", user.id)
        .maybeSingle();

      setHasWorkspace(!!data?.workspace_id);
      setCheckingProfile(false);
    };

    checkProfile();
  }, [user]);

  if (loading || checkingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!hasWorkspace) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
