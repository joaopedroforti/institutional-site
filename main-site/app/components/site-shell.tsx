"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CSSProperties, ReactNode, useEffect, useMemo, useState } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import { apiFetch } from "../lib/api";
import { getPageLabel, getStoredVisitorSessionKey, trackInteraction } from "../lib/analytics";
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
  const [whatsModalOpen, setWhatsModalOpen] = useState(false);
  const [whatsName, setWhatsName] = useState("");
  const [whatsPhone, setWhatsPhone] = useState("");
  const [whatsLoading, setWhatsLoading] = useState(false);
  const [whatsError, setWhatsError] = useState<string | null>(null);

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

  const openWhatsModal = () => {
    setWhatsError(null);
    setWhatsModalOpen(true);
  };

  const submitWhatsModal = async () => {
    const cleanPhone = whatsPhone.replace(/\D/g, "");
    if (!whatsName.trim() || cleanPhone.length < 10) {
      setWhatsError("Informe nome e WhatsApp valido para continuar.");
      return;
    }

    setWhatsLoading(true);
    setWhatsError(null);

    try {
      await apiFetch("/contacts", {
        method: "POST",
        body: JSON.stringify({
          name: whatsName.trim(),
          phone: whatsPhone.trim(),
          email: null,
          company: null,
          message: "Lead originado via botao do WhatsApp no site.",
          session_key: getStoredVisitorSessionKey(),
          source_url: window.location.href,
          referrer: document.referrer || null,
          metadata: {
            source: "whatsapp-float",
            capture_kind: "submitted",
            page_name: getPageLabel(pathname),
          },
        }),
      });

      await trackInteraction({
        eventType: "whatsapp_form_submitted",
        element: "modal",
        label: "whatsapp-float",
        pagePath: pathname,
        metadata: {
          event_name: "Formulario botao do WhatsApp",
          where: getPageLabel(pathname),
        },
      });

      await trackInteraction({
        eventType: "whatsapp_button_click",
        element: "button",
        label: "whatsapp-float",
        pagePath: pathname,
        metadata: {
          event_name: "Clique botao WhatsApp",
          where: getPageLabel(pathname),
        },
      });

      const url = `https://wa.me/5519982214340?text=${encodeURIComponent(
        `Olá, sou ${whatsName.trim()} e meu WhatsApp é ${whatsPhone.trim()}.`,
      )}`;
      window.open(url, "_blank", "noopener,noreferrer");
      setWhatsModalOpen(false);
      setWhatsName("");
      setWhatsPhone("");
    } catch (requestError) {
      setWhatsError(requestError instanceof Error ? requestError.message : "Nao foi possivel registrar o contato.");
    } finally {
      setWhatsLoading(false);
    }
  };

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
        href="#"
        aria-label="Falar no WhatsApp"
        className={styles.whatsappFloat}
        data-track
        data-track-type="whatsapp"
        onClick={(event) => {
          event.preventDefault();
          openWhatsModal();
        }}
      >
        <FaWhatsapp aria-hidden="true" />
      </a>

      {whatsModalOpen && (
        <div className={styles.whatsModalWrap}>
          <div className={styles.whatsModal}>
            <div className={styles.whatsHeader}>
              <p>Continuar no WhatsApp</p>
              <button
                type="button"
                onClick={() => setWhatsModalOpen(false)}
                className={styles.whatsClose}
              >
                ×
              </button>
            </div>
            <p className={styles.whatsSub}>Antes de abrir, confirme seus dados:</p>
            <input
              type="text"
              placeholder="Seu nome"
              value={whatsName}
              onChange={(event) => setWhatsName(event.target.value)}
              className={styles.whatsInput}
            />
            <input
              type="text"
              placeholder="Seu WhatsApp"
              value={whatsPhone}
              onChange={(event) => setWhatsPhone(event.target.value)}
              className={styles.whatsInput}
            />
            {whatsError && <p className={styles.whatsError}>{whatsError}</p>}
            <button
              type="button"
              onClick={() => {
                void submitWhatsModal();
              }}
              disabled={whatsLoading}
              className={styles.whatsSubmit}
            >
              {whatsLoading ? "Abrindo..." : "Abrir WhatsApp"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
