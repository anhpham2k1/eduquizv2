import React, { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { TooltipProvider } from "./components/ui/tooltip";
import { Toaster } from "./components/ui/sonner";
import { RootLayout } from "./components/Layout";
import { useAuthStore } from "./store/authStore";

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ExamNew = lazy(() => import("./pages/exams/ExamNew"));
const ExamDetail = lazy(() => import("./pages/exams/ExamDetail"));
const Attempt = lazy(() => import("./pages/attempts/Attempt"));
const AttemptResult = lazy(() => import("./pages/attempts/AttemptResult"));
const SettingsLayout = lazy(() => import("./pages/settings/SettingsLayout"));
const ProfileSettings = lazy(() => import("./pages/settings/ProfileSettings"));
const SecuritySettings = lazy(() => import("./pages/settings/SecuritySettings"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
}

function RouteFallback() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-sm text-muted-foreground">
      Đang tải trang...
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<RootLayout />}>
                  <Route index element={<Landing />} />
                  <Route path="auth/login" element={<Login />} />
                  <Route path="auth/register" element={<Register />} />

                  <Route
                    path="dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="exams/new"
                    element={
                      <ProtectedRoute>
                        <ExamNew />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="exams/:examId"
                    element={
                      <ProtectedRoute>
                        <ExamDetail />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="attempts/:attemptId"
                    element={
                      <ProtectedRoute>
                        <Attempt />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="attempts/:attemptId/result"
                    element={
                      <ProtectedRoute>
                        <AttemptResult />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="settings"
                    element={
                      <ProtectedRoute>
                        <SettingsLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="account" element={<ProfileSettings />} />
                    <Route path="security" element={<SecuritySettings />} />
                    <Route index element={<Navigate to="account" replace />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
            <Toaster />
          </BrowserRouter>
        </TooltipProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}
