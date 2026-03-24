import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { ChevronDown, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { SIDEBAR_ITEMS } from "../config/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import type { WhatsAppOverviewResponse } from "../types/admin";

const EXPANDED_WIDTH = "w-64";
const COLLAPSED_WIDTH = "w-20";
const EXPANDED_WIDTH_PX = 256;
const COLLAPSED_WIDTH_PX = 80;

function isGroupActive(pathname: string, paths: string[]): boolean {
  return paths.some((path) => pathname.startsWith(path));
}

export default function AppSidebar() {
  const {
    isExpanded,
    isHovered,
    isMobileOpen,
    isMobile,
    toggleSidebar,
    closeMobileSidebar,
    setIsHovered,
  } = useSidebar();
  const { logout, token } = useAuth();
  const location = useLocation();

  const [settingsOpen, setSettingsOpen] = useState(() =>
    location.pathname.startsWith("/admin/configuracoes"),
  );
  const [whatsAppUnreadCount, setWhatsAppUnreadCount] = useState(0);
  const sidebarWidth = isExpanded || isHovered ? EXPANDED_WIDTH_PX : COLLAPSED_WIDTH_PX;

  const classes = useMemo(
    () =>
      `z-50 border-r border-blue-800/60 bg-gradient-to-b from-blue-800 via-blue-800 to-blue-900 text-white transition-[width,transform] duration-300 ${
        isExpanded || isHovered ? EXPANDED_WIDTH : COLLAPSED_WIDTH
      }`,
    [isExpanded, isHovered],
  );

  useEffect(() => {
    if (!token) {
      setWhatsAppUnreadCount(0);
      return;
    }

    let active = true;

    const loadUnread = async () => {
      try {
        const response = await apiRequest<WhatsAppOverviewResponse>("/api/admin/whatsapp/overview", {}, token);
        if (active) {
          setWhatsAppUnreadCount(response.data.totals.unread_conversations ?? 0);
        }
      } catch {
        // silencioso
      }
    };

    void loadUnread();
    const timer = window.setInterval(() => {
      void loadUnread();
    }, 10000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [token]);

  return (
    <aside
      className={`relative overflow-visible ${classes} ${isMobile ? (isMobileOpen ? "translate-x-0" : "-translate-x-full") : ""}`}
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        height: "100vh",
        width: `${sidebarWidth}px`,
      }}
      aria-label="Menu lateral"
      onMouseEnter={() => {
        if (!isMobile && !isExpanded) {
          setIsHovered(true);
        }
      }}
      onMouseLeave={() => {
        if (!isMobile && !isExpanded) {
          setIsHovered(false);
        }
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-45">
        <div className="absolute -right-16 -top-14 h-52 w-52 rounded-full bg-blue-500/25 blur-2xl" />
        <div className="absolute -left-20 top-1/3 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute -bottom-16 right-4 h-44 w-44 rounded-full bg-indigo-300/20 blur-2xl" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        />
      </div>

      {!isMobile && (
        <button
          type="button"
          onClick={toggleSidebar}
          className="absolute -right-3 top-1/2 z-[60] flex size-8 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-lg ring-4 ring-blue-100/70 transition hover:bg-blue-500"
          aria-label={isExpanded ? "Recolher menu" : "Expandir menu"}
        >
          {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      )}

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex h-20 items-center border-b border-white/20 px-4">
          <Link
            to="/admin/dashboard"
            className="flex w-full items-center justify-center"
            onClick={closeMobileSidebar}
          >
            <img
              src="/images/logo/logo_white.png"
              alt="FortiCorp"
              className={`${isExpanded || isHovered ? "h-11" : "h-8"} w-auto object-contain`}
            />
          </Link>

        </div>

        <nav className="no-scrollbar flex-1 space-y-2 overflow-y-auto px-2 py-6">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;

            if (item.children && item.children.length > 0) {
              const childPaths = item.children.map((child) => child.path);
              const active = isGroupActive(location.pathname, childPaths);

              return (
                <div key={item.label} className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setSettingsOpen((prev) => !prev)}
                    className={`flex w-full items-center rounded-2xl border px-3.5 py-3 text-[15px] font-medium transition ${
                      active
                        ? "border-white/30 bg-white/[0.22] text-white"
                        : "border-transparent text-blue-100 hover:border-white/20 hover:bg-white/[0.14] hover:text-white"
                    } ${isExpanded || isHovered ? "justify-between" : "justify-center"}`}
                    title={item.label}
                  >
                    <span className={`flex items-center ${isExpanded || isHovered ? "gap-3.5" : ""}`}>
                      <span
                        className={`flex size-8 items-center justify-center rounded-lg ${
                          active ? "bg-white/35 text-white" : "bg-white/20 text-blue-100"
                        }`}
                      >
                        <Icon size={18} />
                      </span>
                      {(isExpanded || isHovered) && <span>{item.label}</span>}
                    </span>
                    {(isExpanded || isHovered) && (
                      <ChevronDown
                        size={16}
                        className={`transition ${settingsOpen ? "rotate-180" : ""}`}
                      />
                    )}
                  </button>

                  {(isExpanded || isHovered) && settingsOpen && (
                    <div className="ml-5 space-y-1.5 border-l border-white/25 pl-3">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          onClick={closeMobileSidebar}
                          className={({ isActive }) =>
                            `block rounded-lg px-3 py-2.5 text-sm transition ${
                              isActive
                                ? "bg-white/[0.24] text-white"
                                : "text-blue-100 hover:bg-white/[0.14] hover:text-white"
                            }`
                          }
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            if (!item.path) {
              return null;
            }

            return (
              <NavLink
                key={item.label}
                to={item.path}
                onClick={closeMobileSidebar}
                className={({ isActive }) =>
                  `flex items-center rounded-2xl border px-3.5 py-3 text-[15px] font-medium transition ${
                    isActive
                      ? "border-white/30 bg-white/[0.22] text-white"
                      : "border-transparent text-blue-100 hover:border-white/20 hover:bg-white/[0.14] hover:text-white"
                  } ${isExpanded || isHovered ? "gap-3.5" : "justify-center"} relative`
                }
                title={item.label}
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex size-8 items-center justify-center rounded-lg ${
                        isActive ? "bg-white/35 text-white" : "bg-white/20 text-blue-100"
                      }`}
                    >
                      <Icon size={18} />
                    </span>
                    {(isExpanded || isHovered) && <span>{item.label}</span>}
                    {item.path === "/admin/whatsapp" && whatsAppUnreadCount > 0 && (
                      <span
                        className={`relative ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-400 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-950 shadow-[0_0_0_2px_rgba(16,185,129,0.35)] ${
                          isExpanded || isHovered ? "" : "absolute -right-1 -top-1"
                        }`}
                      >
                        <span
                          className="pointer-events-none absolute inset-0 rounded-full bg-emerald-400/60 animate-ping"
                          aria-hidden="true"
                        />
                        <span className="relative z-10">{whatsAppUnreadCount > 99 ? "99+" : whatsAppUnreadCount}</span>
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/20 p-3">
          <button
            type="button"
            onClick={() => {
              void logout();
            }}
            className={`flex w-full items-center rounded-xl px-3.5 py-3 text-[15px] font-medium text-red-100 transition hover:bg-red-500/25 hover:text-red-50 ${
              isExpanded || isHovered ? "gap-3.5" : "justify-center"
            }`}
            title="Sair"
          >
            <LogOut size={20} />
            {(isExpanded || isHovered) && <span>Sair</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
