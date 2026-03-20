"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CSSProperties, ReactNode, useEffect, useMemo, useState } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import styles from "./site-shell.module.css";

type SiteShellProps = {
  children: ReactNode;
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

export default function SiteShell({ children }: SiteShellProps) {
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
      <div className={styles.backdropA} />
      <div className={styles.backdropB} />

      <header className={styles.header}>
        <div className={styles.progressBar} />
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand}>
            <Image
              src="/images/logo.png"
              alt="Logo FortiCorp"
              width={128}
              height={36}
              className={styles.brandLogo}
              priority
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
            <Link href="/contato" className={styles.headerCta}>
              Solicitar proposta
            </Link>
          </div>
        </div>
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <h2>Sua empresa tem potencial inexplorado.</h2>
          <p>
            Ajudamos você a tirar projetos do papel com tecnologia sob medida, execução estruturada e foco em resultado real para o negócio.
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

      <a href="https://wa.me/5519982214340" target="_blank" rel="noreferrer" aria-label="Falar no WhatsApp" className={styles.whatsappFloat}>
        <FaWhatsapp aria-hidden="true" />
      </a>
    </div>
  );
}
