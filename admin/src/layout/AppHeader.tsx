import { useMemo, useState } from "react";
import { Bell, ChevronDown, Menu, Settings, User, LogOut, Home } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";

const TITLES: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/pipes": "Pipes",
  "/admin/negocios": "Pipes",
  "/admin/orcamentos": "Propostas",
  "/admin/propostas": "Propostas",
  "/admin/whatsapp": "WhatsApp",
  "/admin/configuracoes": "Configuracoes",
  "/admin/configuracoes/vendedores": "Vendedores",
  "/admin/configuracoes/propostas": "Prazos",
  "/admin/configuracoes/gerais": "Geral",
  "/admin/configuracoes/empresa": "Informacoes da Empresa",
  "/admin/configuracoes/precificacao": "Precificacao",
  "/admin/configuracoes/whatsapp": "WhatsApp",
  "/admin/configuracoes/integracoes": "Integracoes",
  "/admin/configuracoes/regras-score": "Regras de Score",
  "/admin/configuracoes/origens-tags": "Mapeamento de Origem e Tags",
};

export default function AppHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { toggleMobileSidebar, isMobile } = useSidebar();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const title = useMemo(() => {
    if (location.pathname === "/admin/pipes") {
      const params = new URLSearchParams(location.search);
      const pipe = params.get("pipe") ?? "comercial";
      const labels: Record<string, string> = {
        comercial: "Comercial",
        desenvolvimento: "Desenvolvimento",
        followup: "FollowUp",
        cs: "CS",
      };

      return `Pipe ${labels[pipe] ?? "Comercial"}`;
    }

    return TITLES[location.pathname] ?? "Painel Administrativo";
  }, [location.pathname, location.search]);
  const breadcrumbs = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    const items = parts.map((part, index) => {
      const path = `/${parts.slice(0, index + 1).join("/")}`;
      const label = TITLES[path] ?? part.charAt(0).toUpperCase() + part.slice(1);
      return { path, label };
    });

    return items;
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-sm">
      <div className="flex h-[64px] items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          {isMobile && (
            <button
              type="button"
              onClick={toggleMobileSidebar}
              className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              aria-label="Abrir menu"
            >
              <Menu size={18} />
            </button>
          )}
          <h1 className="text-lg font-semibold text-slate-900 md:text-xl">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            aria-label="Notificacoes"
          >
            <Bell size={18} />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-1.5 transition hover:bg-slate-50"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-blue-700 text-sm font-semibold text-white">
                {(user?.name ?? "U").slice(0, 2).toUpperCase()}
              </span>
              <span className="hidden text-left md:block">
                <span className="block text-sm font-semibold text-slate-900">{user?.name ?? "Usuario"}</span>
                <span className="block text-xs text-slate-500">{user?.role ?? "Perfil"}</span>
              </span>
              <ChevronDown size={16} className="text-slate-500" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/admin/configuracoes/gerais");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  <User size={16} />
                  Perfil
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/admin/configuracoes");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  <Settings size={16} />
                  Configuracoes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
                >
                  <LogOut size={16} />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-10 items-center border-t border-slate-200 px-4 md:px-6">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Home size={13} />
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.path} className="flex items-center gap-2">
              {index > 0 && <span>/</span>}
              <span>{crumb.label}</span>
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
