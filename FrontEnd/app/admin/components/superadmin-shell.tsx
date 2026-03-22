"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";
import {
  FaBars,
  FaBell,
  FaBoxArchive,
  FaChevronLeft,
  FaChevronRight,
  FaClipboardList,
  FaFileCircleCheck,
  FaGear,
  FaGripVertical,
  FaHouse,
  FaRegCircleUser,
  FaRightFromBracket,
  FaRocket,
  FaSitemap,
  FaSquarePollVertical,
  FaUsers,
  FaUserTie,
  FaXmark,
} from "react-icons/fa6";
import { SuperadminProvider, useSuperadmin } from "./superadmin-context";
import styles from "../system.module.css";

type MenuItem = {
  href: string;
  label: string;
  icon: ReactNode;
  description: string;
};

const menuItems: MenuItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: <FaHouse aria-hidden="true" />, description: "Visao geral" },
  { href: "/admin/leads", label: "Leads", icon: <FaUsers aria-hidden="true" />, description: "Fila comercial" },
  { href: "/admin/kanban-comercial", label: "Kanban Comercial", icon: <FaGripVertical aria-hidden="true" />, description: "Pipeline de vendas" },
  {
    href: "/admin/kanban-desenvolvimento",
    label: "Kanban Desenvolvimento",
    icon: <FaGripVertical aria-hidden="true" />,
    description: "Entrega de projetos",
  },
  { href: "/admin/orcamentos", label: "Orcamentos", icon: <FaClipboardList aria-hidden="true" />, description: "Valores e aprovacoes" },
  { href: "/admin/propostas", label: "Propostas", icon: <FaFileCircleCheck aria-hidden="true" />, description: "Propostas enviadas" },
  {
    href: "/admin/modelos-proposta",
    label: "Modelos de Proposta",
    icon: <FaSitemap aria-hidden="true" />,
    description: "Modelos reutilizaveis",
  },
  { href: "/admin/vendedores", label: "Vendedores", icon: <FaUserTie aria-hidden="true" />, description: "Time comercial" },
  {
    href: "/admin/score-leads",
    label: "Score de Leads",
    icon: <FaSquarePollVertical aria-hidden="true" />,
    description: "Priorizacao e fit",
  },
  { href: "/admin/rastreamento", label: "Rastreamento", icon: <FaRocket aria-hidden="true" />, description: "Jornada e eventos" },
  { href: "/admin/notificacoes", label: "Notificacoes", icon: <FaBell aria-hidden="true" />, description: "Alertas do sistema" },
  {
    href: "/admin/configuracoes-gerais",
    label: "Configuracoes",
    icon: <FaGear aria-hidden="true" />,
    description: "Preferencias globais",
  },
  { href: "/admin/perfil", label: "Perfil", icon: <FaRegCircleUser aria-hidden="true" />, description: "Conta do usuario" },
];

function getPageMeta(pathname: string) {
  const current = menuItems.find((item) => pathname === item.href) ?? menuItems[0];

  return {
    title: current.label,
    description: current.description,
    breadcrumb: ["Admin", current.label],
  };
}

function ProtectedShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { error, loading, refresh, logout, summary } = useSuperadmin();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem("forticorp-admin-sidebar-collapsed") === "true",
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const pageMeta = getPageMeta(pathname);

  const notificationCount = useMemo(() => {
    if (error) {
      return 1;
    }

    return Math.max(summary.contacts_pending, 0);
  }, [error, summary.contacts_pending]);

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("forticorp-admin-sidebar-collapsed", String(next));
      return next;
    });
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <main className={styles.page}>
      <div className={sidebarCollapsed ? styles.shellCollapsed : styles.shell}>
        <aside
          className={sidebarCollapsed ? styles.sidebarCollapsed : styles.sidebar}
          data-mobile-open={mobileMenuOpen ? "true" : "false"}
        >
          <button className={styles.sidebarToggle} type="button" onClick={toggleSidebar} aria-label="Alternar menu lateral">
            {sidebarCollapsed ? <FaChevronRight aria-hidden="true" /> : <FaChevronLeft aria-hidden="true" />}
          </button>

          <div className={styles.sidebarBrand}>
            <span className={styles.sidebarEyebrow}>FortiCorp</span>
            {!sidebarCollapsed ? (
              <>
                <strong>Painel Administrativo</strong>
                <p>Operacao, CRM e rastreamento em uma navegacao unica e consistente.</p>
              </>
            ) : null}
          </div>

          <nav className={styles.sidebarNav}>
            {menuItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isActive ? styles.sidebarItemActive : styles.sidebarItem}
                  title={item.label}
                  onClick={closeMobileMenu}
                >
                  <span className={styles.sidebarItemIcon}>{item.icon}</span>
                  <span className={sidebarCollapsed ? styles.hiddenLabel : ""}>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {!sidebarCollapsed ? (
            <div className={styles.sidebarStatus}>
              <span>Status geral</span>
              <strong>{loading ? "Sincronizando" : error ? "Atencao" : "Operacao estavel"}</strong>
              <p>{error || `${summary.contacts_pending} leads aguardando acao e ${summary.sessions_identified} visitantes identificados.`}</p>
            </div>
          ) : null}

          <button className={styles.sidebarLogout} type="button" onClick={() => void logout()}>
            <FaRightFromBracket aria-hidden="true" />
            {!sidebarCollapsed ? <span>Sair</span> : null}
          </button>
        </aside>

        <div className={styles.workspace}>
          <header className={styles.topbar}>
            <div className={styles.topbarIntro}>
              <div className={styles.breadcrumb}>
                <span>{pageMeta.breadcrumb[0]}</span>
                <i>/</i>
                <span>{pageMeta.breadcrumb[1]}</span>
              </div>
              <h1>{pageMeta.title}</h1>
              <p>{pageMeta.description}</p>
            </div>

            <div className={styles.topbarActions}>
              <button className={styles.mobileMenuButton} type="button" onClick={() => setMobileMenuOpen(true)}>
                <FaBars aria-hidden="true" />
              </button>
              <button className={styles.topIconButton} type="button" onClick={() => void refresh()} title="Atualizar painel">
                <FaBoxArchive aria-hidden="true" />
              </button>
              <button className={styles.topIconButton} type="button" title="Notificacoes">
                <FaBell aria-hidden="true" />
                {notificationCount > 0 ? <span className={styles.notificationDot}>{notificationCount > 9 ? "9+" : notificationCount}</span> : null}
              </button>

              <div className={styles.profileWrap}>
                <button className={styles.profileButton} type="button" onClick={() => setProfileMenuOpen((value) => !value)}>
                  <span className={styles.profileAvatar}>JF</span>
                  <span className={styles.profileMeta}>
                    <strong>Joao Forti</strong>
                    <small>Administrador</small>
                  </span>
                </button>
                {profileMenuOpen ? (
                  <div className={styles.profileMenu}>
                    <Link href="/admin/perfil" onClick={() => setProfileMenuOpen(false)}>
                      Meu perfil
                    </Link>
                    <Link href="/admin/configuracoes-gerais" onClick={() => setProfileMenuOpen(false)}>
                      Configuracoes
                    </Link>
                    <button type="button" onClick={() => void logout()}>
                      Sair
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          {loading ? <div className={styles.loadingPanel}>Carregando dados do painel...</div> : null}
          {error ? <div className={styles.errorPanel}>{error}</div> : null}

          {children}
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className={styles.mobileBackdrop} onClick={closeMobileMenu}>
          <button className={styles.mobileClose} type="button" onClick={closeMobileMenu} aria-label="Fechar menu">
            <FaXmark aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </main>
  );
}

export default function SuperadminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <SuperadminProvider>
      <ProtectedShell>{children}</ProtectedShell>
    </SuperadminProvider>
  );
}
