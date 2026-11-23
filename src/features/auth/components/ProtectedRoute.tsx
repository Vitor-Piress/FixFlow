import { Navigate, Outlet, useLocation } from "react-router-dom";
import { FullPageLoader } from "@/components/ui/FullPageLoader";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function ProtectedRoute() {
  const { session, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
