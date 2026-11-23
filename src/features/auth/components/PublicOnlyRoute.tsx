import { Navigate, Outlet } from "react-router-dom";
import { FullPageLoader } from "@/components/ui/FullPageLoader";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function PublicOnlyRoute() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (session) {
    return <Navigate to="/quotes" replace />;
  }

  return <Outlet />;
}
