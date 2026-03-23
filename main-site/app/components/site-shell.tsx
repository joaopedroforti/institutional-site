"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CSSProperties, ReactNode, useEffect, useMemo, useState } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import AnalyticsProvider from "./analytics-provider";
import styles from "./site-shell.module.css";

type SiteShellProps = {
  children: ReactNode;
  flushFooterGap?: boolean;
};

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/servicos", label: "Serviços" },
  { href: "/cases", label: "Cases" },
  { href: "/historia", label: "História" },
];

export default function SiteShell({ children, flushFooterGap = false }: SiteShellProps) {
  const pathname = usePathname();
  const [scrollOffset, setScrollOffset] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let frameId = 0;

    const handleScroll = () => {
      cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const doc = document.documentElement;
        const maxScroll = doc.scrollHeight - doc.clientHeight;
        setScrollOffset(window.scrollY);
        setScrollProgress(maxScroll > 0 ? window.scrollY / maxScroll : 0);
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (targets.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    targets.forEach((target) => observer.observe(target));

    return () => {
      observer.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      setPointer({ x, y });
    };

    const handlePointerLeave = () => {
      setPointer({ x: 0, y: 0 });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  const pageStyle = useMemo(
    () =>
      ({
        "--scroll-offset": scrollOffset + "px",
        "--scroll-progress": scrollProgress.toString(),
        "--pointer-x": pointer.x.toString(),
        "--pointer-y": pointer.y.toString(),
      }) as CSSProperties,
    [pointer.x, pointer.y, scrollOffset, scrollProgress],
  );

  return (
    <div className={styles.page} style={pageStyle}>
      <AnalyticsProvider />
      <div className={styles.backdropA} />
      <div className={styles.backdropB} />

      <header className={styles.header}>
        <div className={styles.progressBar} />
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand}>
            <Image
              src="/images/logo/logo.png"
              alt="Logo FortiCorp"
              width={128}
              height={36}
              className={styles.brandLogo}
              preload
            />
          </Link>
          <div className={styles.menuGroup}>
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
            <Link href="/contato" className={styles.headerCta} data-track data-track-type="cta">
              Solicitar proposta
            </Link>
          </div>
        </div>
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={`${styles.footer} ${flushFooterGap ? styles.footerFlush : ""}`}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div className={styles.footerColumn}>
              <Image
                src="/images/logo/logo_white.png"
                alt="Logo FortiCorp em branco"
                width={162}
                height={46}
                className={styles.footerLogo}
              />
              <p>
                Desenvolvemos sistemas, automações e produtos digitais sob medida para empresas que precisam de tecnologia confiável, escalável e orientada a resultado.
              </p>
            </div>

            <div className={styles.footerColumn}>
              <h3>Navegação</h3>
              <div className={styles.footerLinks}>
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    {item.label}
                  </Link>
                ))}
                <Link href="/contato">Contato</Link>
              </div>
            </div>

            <div className={styles.footerColumn}>
              <h3>Contato</h3>
              <div className={styles.footerMeta}>
                <a href="https://wa.me/5519982214340" target="_blank" rel="noreferrer" data-track data-track-type="whatsapp">
                  WhatsApp: +55 (19) 98221-4340
                </a>
                <a href="mailto:contato@forticorp.com.br">E-mail: contato@forticorp.com.br</a>
                <span>Atendimento para projetos, sustentação e evolução de sistemas.</span>
              </div>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <div className={styles.footerCta}>
              <a
                href="https://wa.me/5519982214340"
                target="_blank"
                rel="noreferrer"
                className={styles.primaryButton}
                data-track
                data-track-type="whatsapp"
              >
                Falar no WhatsApp
              </a>
              <Link href="/contato" className={styles.secondaryButton} data-track data-track-type="cta">
                Solicitar proposta
              </Link>
            </div>
            <p>© {new Date().getFullYear()} FortiCorp. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      <a
        href="https://wa.me/5519982214340"
        target="_blank"
        rel="noreferrer"
        aria-label="Falar no WhatsApp"
        className={styles.whatsappFloat}
        data-track
        data-track-type="whatsapp"
      >
        <FaWhatsapp aria-hidden="true" />
      </a>
    </div>
  );
}
