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
  { href: "/cases", label: "Cases" },
  { href: "/historia", label: "História" },
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
    () => ({ "--scroll-offset": scrollOffset + "px" }) as CSSProperties,
    [scrollOffset],
  );

  return (
    <div className={styles.page} style={pageStyle}>
      <div className={styles.backdropA} />
      <div className={styles.backdropB} />

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand}>
            Forti Sistemas
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
        </div>
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <h2>Sua empresa tem potencial inexplorado.</h2>
          <p>
            Transformamos desafios operacionais em soluções digitais que aumentam produtividade, reduzem custos e fortalecem o crescimento do seu negócio com tecnologia sob medida.
          </p>
          <div className={styles.footerActions}>
            <a href="https://wa.me/5519982214340" target="_blank" rel="noreferrer" className={styles.primaryButton}>
              Falar no WhatsApp
            </a>
            <Link href="/contato" className={styles.secondaryButton}>
              Solicitar proposta
            </Link>
          </div>
        </div>
      </footer>

      <a href="https://wa.me/5519982214340" target="_blank" rel="noreferrer" className={styles.whatsappFloat}>
        WhatsApp
      </a>
    </div>
  );
}
