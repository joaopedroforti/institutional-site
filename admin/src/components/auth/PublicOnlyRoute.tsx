import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";
import LoadingState from "../common/LoadingState";

export default function PublicOnlyRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingState fullScreen label="Carregando ambiente administrativo..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
}
