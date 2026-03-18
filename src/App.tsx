import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import AnalysesPage from "./pages/AnalysesPage";
import NewAnalysisPage from "./pages/NewAnalysisPage";
import AnalysisDetailPage from "./pages/AnalysisDetailPage";
import MaterialsPage from "./pages/MaterialsPage";
import StandardTracesPage from "./pages/StandardTracesPage";
import ProductionPage from "./pages/ProductionPage";
import RupturesPage from "./pages/RupturesPage";
import RuptureDetailPage from "./pages/RuptureDetailPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import QualityReportPage from "./pages/QualityReportPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={
              <ProtectedRoute allowedRoles={["ADMIN", "PRODUCAO", "VENDAS", "LABORATORIO"]}>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/analyses" element={
              <ProtectedRoute allowedRoles={["ADMIN", "VENDAS", "LABORATORIO"]}>
                <AnalysesPage />
              </ProtectedRoute>
            } />
            <Route path="/analyses/new" element={
              <ProtectedRoute allowedRoles={["ADMIN", "LABORATORIO"]}>
                <NewAnalysisPage />
              </ProtectedRoute>
            } />
            <Route path="/analyses/:codigo" element={
              <ProtectedRoute allowedRoles={["ADMIN", "VENDAS", "LABORATORIO"]}>
                <AnalysisDetailPage />
              </ProtectedRoute>
            } />
            <Route path="/materials" element={
              <ProtectedRoute allowedRoles={["ADMIN", "LABORATORIO"]}>
                <MaterialsPage />
              </ProtectedRoute>
            } />
            <Route path="/standard-traces" element={
              <ProtectedRoute allowedRoles={["ADMIN", "LABORATORIO"]}>
                <StandardTracesPage />
              </ProtectedRoute>
            } />
            <Route path="/production" element={
              <ProtectedRoute allowedRoles={["ADMIN", "PRODUCAO", "VENDAS"]}>
                <ProductionPage />
              </ProtectedRoute>
            } />
            <Route path="/ruptures" element={
              <ProtectedRoute allowedRoles={["ADMIN", "VENDAS", "LABORATORIO"]}>
                <RupturesPage />
              </ProtectedRoute>
            } />
            <Route path="/ruptures/:scheduleId" element={
              <ProtectedRoute allowedRoles={["ADMIN", "LABORATORIO"]}>
                <RuptureDetailPage />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute allowedRoles={["ADMIN", "VENDAS", "LABORATORIO"]}>
                <ReportsPage />
              </ProtectedRoute>
            } />
            <Route path="/reports/batch/:batchId" element={
              <ProtectedRoute allowedRoles={["ADMIN", "VENDAS", "LABORATORIO"]}>
                <QualityReportPage />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <SettingsPage />
              </ProtectedRoute>
            } />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
