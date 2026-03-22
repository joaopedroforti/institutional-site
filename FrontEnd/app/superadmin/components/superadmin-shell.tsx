"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import {
  FaBolt,
  FaChartColumn,
  FaChevronLeft,
  FaChevronRight,
  FaGripVertical,
  FaClockRotateLeft,
  FaDoorOpen,
  FaEnvelopeOpenText,
  FaFolderTree,
  FaInbox,
  FaMagnifyingGlass,
  FaPenRuler,
  FaSignal,
  FaUserGroup,
} from "react-icons/fa6";
import { SuperadminProvider, useSuperadmin } from "./superadmin-context";
import styles from "../system.module.css";

const menuItems = [
  { href: "/superadmin/dashboard", label: "Dashboard", icon: <FaChartColumn aria-hidden="true" /> },
  { href: "/superadmin/analytics", label: "Analytics", icon: <FaSignal aria-hidden="true" /> },
  { href: "/superadmin/kanban", label: "Kanban", icon: <FaGripVertical aria-hidden="true" /> },
  { href: "/superadmin/crm", label: "CRM", icon: <FaInbox aria-hidden="true" /> },
  { href: "/superadmin/cms", label: "CMS", icon: <FaPenRuler aria-hidden="true" /> },
  { href: "/superadmin/sessions", label: "Sessions", icon: <FaUserGroup aria-hidden="true" /> },
];

function ProtectedShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { error, loading, refresh, logout, summary } = useSuperadmin();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem("forticorp-superadmin-sidebar-collapsed") === "true",
  );

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("forticorp-superadmin-sidebar-collapsed", String(next));
      return next;
    });
  }

  return (
    <main className={styles.page}>
      <div className={sidebarCollapsed ? styles.shellCollapsed : styles.shell}>
        <aside className={sidebarCollapsed ? styles.sidebarCollapsed : styles.sidebar}>
          <button className={styles.sidebarToggle} type="button" onClick={toggleSidebar}>
            {sidebarCollapsed ? <FaChevronRight aria-hidden="true" /> : <FaChevronLeft aria-hidden="true" />}
          </button>

          {!sidebarCollapsed ? (
            <div className={styles.sidebarBrand}>
              <span className={styles.sidebarEyebrow}>FortiCorp</span>
              <strong>Superadmin CMS + CRM</strong>
              <p>Conteudo, leads, metricas, analytics e jornada em uma nav fixa de sistema.</p>
            </div>
          ) : null}

          <nav className={styles.sidebarNav}>
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={pathname === item.href ? styles.sidebarItemActive : styles.sidebarItem}
                title={item.label}
              >
                <span className={styles.sidebarItemIcon}>{item.icon}</span>
                <span className={sidebarCollapsed ? styles.hiddenLabel : ""}>{item.label}</span>
              </Link>
            ))}
          </nav>

          {!sidebarCollapsed ? (
            <>
              <div className={styles.sidebarStatus}>
                <span>Status da operacao</span>
                <strong>{loading ? "Sincronizando" : error ? "Atencao" : "Sistema pronto"}</strong>
                <p>{error || `${summary.contacts_pending} leads novos e ${summary.sessions_identified} sessoes identificadas.`}</p>
              </div>

              <div className={styles.quickGrid}>
                <div className={styles.quickItem}>
                  <FaEnvelopeOpenText aria-hidden="true" />
                  <div>
                    <strong>{summary.contacts_total}</strong>
                    <span>Leads</span>
                  </div>
                </div>
                <div className={styles.quickItem}>
                  <FaFolderTree aria-hidden="true" />
                  <div>
                    <strong>{summary.page_views_total}</strong>
                    <span>Page views</span>
                  </div>
                </div>
                <div className={styles.quickItem}>
                  <FaBolt aria-hidden="true" />
                  <div>
                    <strong>{summary.interactions_total}</strong>
                    <span>Interacoes</span>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          <button className={styles.sidebarLogout} type="button" onClick={() => void logout()}>
            <FaDoorOpen aria-hidden="true" />
            {!sidebarCollapsed ? <span>Sair</span> : null}
          </button>
        </aside>

        <div className={styles.workspace}>
          <header className={styles.topbar}>
            <div className={styles.topbarIntro}>
              <span className={styles.kicker}>Superadmin</span>
              <h1>FortiCorp Control Center</h1>
              <p>Layout persistente com menu lateral fixo, navegação por módulos e áreas separadas como um sistema real.</p>
            </div>

            <div className={styles.topbarActions}>
              <label className={styles.searchBox}>
                <FaMagnifyingGlass aria-hidden="true" />
                <input type="text" placeholder="Buscar lead, modulo ou sessao" />
              </label>
              <button className={styles.secondaryButton} type="button" onClick={() => void refresh()}>
                <FaClockRotateLeft aria-hidden="true" />
                <span>Atualizar</span>
              </button>
            </div>
          </header>

          <nav className={styles.topnav}>
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={pathname === item.href ? styles.topnavItemActive : styles.topnavItem}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {loading ? <div className={styles.loadingPanel}>Carregando modulo do superadmin...</div> : null}
          {error ? <div className={styles.errorPanel}>{error}</div> : null}

          {children}
        </div>
      </div>
    </main>
  );
}

export default function SuperadminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/superadmin/login") {
    return <>{children}</>;
  }

  return (
    <SuperadminProvider>
      <ProtectedShell>{children}</ProtectedShell>
    </SuperadminProvider>
  );
}
