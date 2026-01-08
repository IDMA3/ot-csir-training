import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Eager load critical pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy load non-critical pages for better performance
const Courses = lazy(() => import("./pages/Courses"));
const CoursePreview = lazy(() => import("./pages/CoursePreview"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Certificate = lazy(() => import("./pages/Certificate"));
const Verify = lazy(() => import("./pages/Verify"));
const Admin = lazy(() => import("./pages/Admin"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Loading fallback for lazy-loaded pages
function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/verify" element={<Verify />} />
                <Route
                  path="/courses"
                  element={
                    <ProtectedRoute requireOrganization>
                      <Courses />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/courses/:courseId/preview"
                  element={<CoursePreview />}
                />
                <Route
                  path="/courses/:courseId"
                  element={
                    <ProtectedRoute requireOrganization>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/courses/:courseId/certificate"
                  element={
                    <ProtectedRoute requireOrganization>
                      <Certificate />
                    </ProtectedRoute>
                  }
                />
                {/* Legacy routes - redirect to new structure */}
                <Route path="/dashboard" element={<Navigate to="/" replace />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </HashRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
