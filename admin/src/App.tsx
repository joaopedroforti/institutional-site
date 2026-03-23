import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router";
import AppLayout from "./layout/AppLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicOnlyRoute from "./components/auth/PublicOnlyRoute";
import { ScrollToTop } from "./components/common/ScrollToTop";
import LoginPage from "./pages/admin/LoginPage";
import DashboardPage from "./pages/admin/DashboardPage";
import PipesPage from "./pages/admin/PipesPage";
import OrcamentosPage from "./pages/admin/OrcamentosPage";
import PropostasPage from "./pages/admin/PropostasPage";
import AnaliticoPage from "./pages/admin/AnaliticoPage";
import VendedoresPage from "./pages/admin/VendedoresPage";

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-8 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">404</h1>
        <p className="mt-2 text-sm text-slate-600">Pagina nao encontrada.</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />

        <Route element={<PublicOnlyRoute />}>
          <Route path="/admin/login" element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<DashboardPage />} />
            <Route path="/admin/pipes" element={<PipesPage />} />
            <Route path="/admin/negocios" element={<Navigate to="/admin/pipes" replace />} />
            <Route path="/admin/orcamentos" element={<OrcamentosPage />} />
            <Route path="/admin/propostas" element={<PropostasPage />} />
            <Route path="/admin/analitico" element={<AnaliticoPage />} />
            <Route path="/admin/configuracoes" element={<VendedoresPage />} />
            <Route path="/admin/configuracoes/vendedores" element={<Navigate to="/admin/configuracoes" replace />} />
            <Route path="/admin/configuracoes/geral" element={<Navigate to="/admin/configuracoes" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}
