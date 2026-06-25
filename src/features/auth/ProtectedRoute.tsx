import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

function AuthRouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="rounded-card border border-line bg-panel px-4 py-3 text-sm font-semibold text-subtext shadow-soft">
        Đang kiểm tra phiên đăng nhập...
      </div>
    </div>
  );
}

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthRouteFallback />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}

export function AdminRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthRouteFallback />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
