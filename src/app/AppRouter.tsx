import { lazy, ReactElement, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";
import { AdminRoute, ProtectedRoute } from "../features/auth/ProtectedRoute";

const LandingPage = lazy(() => import("../pages/LandingPage").then((module) => ({ default: module.LandingPage })));
const AdminPage = lazy(() => import("../pages/AdminPage").then((module) => ({ default: module.AdminPage })));
const AppHomePage = lazy(() => import("../pages/AppHomePage").then((module) => ({ default: module.AppHomePage })));
const ForgotPasswordPage = lazy(() =>
  import("../pages/auth/ForgotPasswordPage").then((module) => ({ default: module.ForgotPasswordPage }))
);
const LoginPage = lazy(() => import("../pages/auth/LoginPage").then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("../pages/auth/RegisterPage").then((module) => ({ default: module.RegisterPage })));
const ResetPasswordPage = lazy(() =>
  import("../pages/auth/ResetPasswordPage").then((module) => ({ default: module.ResetPasswordPage }))
);

function PublicOnlyRoute({ children }: { children: ReactElement }) {
  const { user } = useAuth();
  if (user) {
    return <Navigate to="/app" replace />;
  }
  return children;
}

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="rounded-card border border-line bg-panel px-4 py-3 text-sm font-semibold text-subtext shadow-soft">
        Đang tải giao diện...
      </div>
    </div>
  );
}

export function AppRouter() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicOnlyRoute>
              <ForgotPasswordPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicOnlyRoute>
              <ResetPasswordPage />
            </PublicOnlyRoute>
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppHomePage />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
