"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CSSProperties, ReactNode, useEffect, useMemo, useState } from "react";
import styles from "./site-shell.module.css";

type SiteShellProps = {
  children: ReactNode;
};

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/", label: "Início" },
  { href: "/servicos", label: "Serviços" },
  { href: "/processo", label: "Processo" },
  { href: "/sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
];

export default function SiteShell({ children }: SiteShellProps) {
  const pathname = usePathname();
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    let frameId = 0;

    const handleScroll = () => {
      cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        setScrollOffset(window.scrollY);
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(frameId);
    };
  }, []);

  const pageStyle = useMemo(
    () => ({ "--scroll-offset": `${scrollOffset}px` }) as CSSProperties,
    [scrollOffset],
  );

  return (
    <div className={styles.page} style={pageStyle}>
      <div className={styles.backdropA} />
      <div className={styles.backdropB} />
      <div className={styles.backdropC} />

      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          * Tecnologia
        </Link>
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? styles.activeLink : styles.navLink}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <p>* Tecnologia</p>
        <p>Consultoria tecnológica e desenvolvimento de sistemas sob medida para empresas.</p>
      </footer>
    </div>
  );
}
