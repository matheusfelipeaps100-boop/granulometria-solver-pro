import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analyses" element={<AnalysesPage />} />
            <Route path="/analyses/new" element={<NewAnalysisPage />} />
            <Route path="/analyses/:codigo" element={<AnalysisDetailPage />} />
            <Route path="/materials" element={<MaterialsPage />} />
            <Route path="/standard-traces" element={<StandardTracesPage />} />
            <Route path="/production" element={<ProductionPage />} />
            <Route path="/ruptures" element={<RupturesPage />} />
            <Route path="/ruptures/:scheduleId" element={<RuptureDetailPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
