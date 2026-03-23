"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  LayoutTemplate,
  ShoppingCart,
  Sparkles,
  Workflow,
  X,
  Palette,
  Smartphone,
  Zap,
  TrendingUp,
  Search,
  Settings2,
  Menu,
  Phone,
  Mail,
  MessageCircle,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import { getStoredVisitorSessionKey, trackInteraction } from "../lib/analytics";

// ─── Types ────────────────────────────────────────────────────────────────────

type SourceKind = "paid" | "organic" | "direct" | "referral";
type EventKey =
  | "lp_sites_viewed"
  | "lp_sites_scroll_50"
  | "lp_sites_scroll_90"
  | "lp_sites_cta_hero_primary_clicked"
  | "lp_sites_cta_hero_secondary_clicked"
  | "lp_sites_cta_solutions_clicked"
  | "lp_sites_cta_pre_form_clicked"
  | "lp_sites_portfolio_item_clicked"
  | "lp_sites_services_card_clicked"
  | "lp_sites_form_started"
  | "lp_sites_form_field_interacted"
  | "lp_sites_form_submitted"
  | "lp_sites_exit_popup_opened"
  | "lp_sites_exit_popup_form_started"
  | "lp_sites_exit_popup_form_submitted"
  | "lp_sites_footer_cta_clicked";

type LeadOrigin = {
  leadSource: string;
  sourceKind: SourceKind;
  multiplier: number;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
};

type MainFormValues = {
  name: string;
  whatsapp: string;
  email: string;
};

type ExitFormValues = { name: string; contact: string };

type GeneralSettings = {
  company_name: string;
  contact_email: string;
  contact_phone: string;
  contact_whatsapp: string;
  contact_whatsapp_url: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SCORE_WEIGHTS: Record<EventKey, number> = {
  lp_sites_viewed: 2,
  lp_sites_scroll_50: 3,
  lp_sites_scroll_90: 5,
  lp_sites_cta_hero_primary_clicked: 12,
  lp_sites_cta_hero_secondary_clicked: 6,
  lp_sites_cta_solutions_clicked: 10,
  lp_sites_cta_pre_form_clicked: 14,
  lp_sites_portfolio_item_clicked: 5,
  lp_sites_services_card_clicked: 4,
  lp_sites_form_started: 10,
  lp_sites_form_field_interacted: 2,
  lp_sites_form_submitted: 35,
  lp_sites_exit_popup_opened: 0,
  lp_sites_exit_popup_form_started: 8,
  lp_sites_exit_popup_form_submitted: 22,
  lp_sites_footer_cta_clicked: 10,
};

const EXIT_POPUP_SESSION_KEY = "lp-sites-exit-popup-shown";
const LANDING_PATH = "/lp/ofertasites";

const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  company_name: "FortiCorp",
  contact_email: "contato@forticorp.com.br",
  contact_phone: "",
  contact_whatsapp: "",
  contact_whatsapp_url: "",
};

const NAV_LINKS = [
  { label: "O que você recebe", href: "#servicos" },
  { label: "Soluções", href: "#solucoes" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Proposta", href: "#proposal-form" },
];

const SERVICE_CARDS = [
  { title: "Design Profissional", desc: "Interface moderna com posicionamento comercial da sua marca.", icon: <Palette size={22} /> },
  { title: "Site Responsivo", desc: "Experiência impecável em desktop, tablet e mobile.", icon: <Smartphone size={22} /> },
  { title: "Alta Performance", desc: "Carregamento rápido para reduzir abandono e melhorar conversão.", icon: <Zap size={22} /> },
  { title: "Estrutura para Conversão", desc: "CTAs estratégicos e jornada pensada para geração de leads.", icon: <TrendingUp size={22} /> },
  { title: "SEO Avançado", desc: "Base técnica para indexação e visibilidade orgânica no Google.", icon: <Search size={22} /> },
  { title: "Gestão Facilitada", desc: "Estrutura clara para evoluir conteúdo e escalar seu projeto.", icon: <Settings2 size={22} /> },
];

const SOLUTION_ITEMS = [
  { icon: <Globe size={20} />, title: "Sites institucionais", text: "Autoridade, clareza e presença digital para empresas." },
  { icon: <LayoutTemplate size={20} />, title: "Landing pages", text: "Páginas focadas em campanha e captação de leads." },
  { icon: <ShoppingCart size={20} />, title: "E-commerces", text: "Estrutura para vender produtos com performance e confiança." },
  { icon: <Workflow size={20} />, title: "Sistemas", text: "Projetos digitais sob medida para operação e escala." },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Você solicita a proposta", desc: "Preencha o formulário com os dados do projeto." },
  { step: "02", title: "Entendemos sua necessidade", desc: "Nossa equipe analisa e entra em contato." },
  { step: "03", title: "Planejamos o projeto", desc: "Definimos escopo, prazo e entregáveis." },
  { step: "04", title: "Desenvolvemos seu site", desc: "Execução com qualidade e alinhamento contínuo." },
  { step: "05", title: "Publicamos e colocamos no ar", desc: "Entrega, revisão final e lançamento." },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeLeadSource(): LeadOrigin {
  const hasWindow = typeof window !== "undefined";
  const params = hasWindow ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const utmSource = params.get("utm_source");
  const utmMedium = params.get("utm_medium");
  const utmCampaign = params.get("utm_campaign");
  const utmContent = params.get("utm_content");
  const utmTerm = params.get("utm_term");
  const referrer = hasWindow ? document.referrer || null : null;
  const source = (utmSource ?? "").toLowerCase();
  const medium = (utmMedium ?? "").toLowerCase();
  const isPaidMedium = ["cpc", "paid", "ads", "ppc", "paid_social"].some((i) => medium.includes(i));
  const isGoogle = ["google", "googleads", "gads"].some((i) => source.includes(i));
  const isInstagram = ["instagram", "ig"].some((i) => source.includes(i));
  const isFacebook = ["facebook", "fb", "meta"].some((i) => source.includes(i));
  if ((isGoogle || isInstagram || isFacebook) && (isPaidMedium || source.includes("ads") || source.includes("meta"))) {
    const leadSource = isGoogle ? "LP-site-google" : isInstagram ? "LP-site-instagram" : "LP-site-facebook";
    return { leadSource, sourceKind: "paid", multiplier: 1.6, utm_source: utmSource, utm_medium: utmMedium, utm_campaign: utmCampaign, utm_content: utmContent, utm_term: utmTerm, referrer };
  }
  if (utmSource || utmMedium || utmCampaign)
    return { leadSource: "LP-site-organico", sourceKind: "organic", multiplier: 1, utm_source: utmSource, utm_medium: utmMedium, utm_campaign: utmCampaign, utm_content: utmContent, utm_term: utmTerm, referrer };
  if (referrer)
    return { leadSource: "LP-site-referencia", sourceKind: "referral", multiplier: 1.1, utm_source: utmSource, utm_medium: utmMedium, utm_campaign: utmCampaign, utm_content: utmContent, utm_term: utmTerm, referrer };
  return { leadSource: "LP-site-direto", sourceKind: "direct", multiplier: 1, utm_source: utmSource, utm_medium: utmMedium, utm_campaign: utmCampaign, utm_content: utmContent, utm_term: utmTerm, referrer };
}

function safeRound(v: number) { return Number(v.toFixed(2)); }

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function isValidEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

function formatWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SitesLandingPage() {
  const origin = useMemo(() => normalizeLeadSource(), []);
  const initialScore = useMemo(() => safeRound((SCORE_WEIGHTS.lp_sites_viewed ?? 0) * origin.multiplier), [origin.multiplier]);

  const [scoreTotal, setScoreTotal] = useState(initialScore);
  const [scoreBreakdown, setScoreBreakdown] = useState<Partial<Record<EventKey, number>>>({ lp_sites_viewed: initialScore });
  const [trackedEvents, setTrackedEvents] = useState<Record<string, boolean>>({ lp_sites_viewed: true });

  const [mainForm, setMainForm] = useState<MainFormValues>({ name: "", whatsapp: "", email: "" });
  const [mainStatus, setMainStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [mainFeedback, setMainFeedback] = useState("");

  const [exitPopupOpen, setExitPopupOpen] = useState(false);
  const [exitForm, setExitForm] = useState<ExitFormValues>({ name: "", contact: "" });
  const [exitStatus, setExitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [exitFeedback, setExitFeedback] = useState("");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);

  const trackedFieldsRef = useRef<Record<string, boolean>>({});
  const mainStartedRef = useRef(false);
  const exitStartedRef = useRef(false);

  const onceEvent = useCallback((k: EventKey) => trackedEvents[k] === true, [trackedEvents]);

  const registerEvent = useCallback(
    async (eventKey: EventKey, opts?: { score?: boolean; force?: boolean }) => {
      const scoreEnabled = opts?.score ?? true;
      const force = opts?.force ?? false;
      if (!force && onceEvent(eventKey)) return { added: 0, nextScore: scoreTotal, nextBreakdown: scoreBreakdown };
      const weight = SCORE_WEIGHTS[eventKey] ?? 0;
      const added = scoreEnabled ? safeRound(weight * origin.multiplier) : 0;
      const nextBreakdown = { ...scoreBreakdown, [eventKey]: safeRound((scoreBreakdown[eventKey] ?? 0) + added) };
      const nextScore = safeRound(scoreTotal + added);
      setTrackedEvents((p) => ({ ...p, [eventKey]: true }));
      if (scoreEnabled && added > 0) { setScoreBreakdown(nextBreakdown); setScoreTotal(nextScore); }
      await trackInteraction({ eventType: eventKey, element: "landing", label: LANDING_PATH, pagePath: LANDING_PATH, metadata: { lead_source: origin.leadSource, lead_score: nextScore, utm_source: origin.utm_source, utm_medium: origin.utm_medium, utm_campaign: origin.utm_campaign } }).catch(() => {});
      return { added, nextScore, nextBreakdown };
    },
    [onceEvent, origin, scoreBreakdown, scoreTotal],
  );

  // Initial view tracking
  useEffect(() => {
    void trackInteraction({ eventType: "lp_sites_viewed", element: "landing", label: LANDING_PATH, pagePath: LANDING_PATH, metadata: { lead_source: origin.leadSource, lead_score: initialScore, utm_source: origin.utm_source, utm_medium: origin.utm_medium, utm_campaign: origin.utm_campaign } }).catch(() => {});
  }, [initialScore, origin]);

  useEffect(() => {
    let isMounted = true;

    const loadGeneralSettings = async () => {
      try {
        const response = await apiFetch<{ data?: Partial<GeneralSettings> }>("/settings/general");
        if (!isMounted || !response?.data) {
          return;
        }

        setGeneralSettings((prev) => ({
          ...prev,
          ...response.data,
        }));
      } catch {
        // Keep defaults when backend settings are unavailable.
      }
    };

    void loadGeneralSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  // Reveal on scroll
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!targets.length) return;
    const obs = new IntersectionObserver((entries) => { entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("is-visible"); }); }, { threshold: 0.1, rootMargin: "0px 0px -5% 0px" });
    targets.forEach((t) => obs.observe(t));
    return () => obs.disconnect();
  }, []);

  // Scroll depth tracking + header state
  useEffect(() => {
    const onScroll = () => {
      setHeaderScrolled(window.scrollY > 20);
      const pct = (window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (pct >= 50 && !onceEvent("lp_sites_scroll_50")) void registerEvent("lp_sites_scroll_50");
      if (pct >= 90 && !onceEvent("lp_sites_scroll_90")) void registerEvent("lp_sites_scroll_90");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onceEvent, registerEvent]);

  // Exit intent
  useEffect(() => {
    if (typeof window === "undefined" || window.sessionStorage.getItem(EXIT_POPUP_SESSION_KEY) === "1") return;
    const isMobile = window.matchMedia("(max-width: 900px)").matches;
    const openPopup = async () => {
      if (window.sessionStorage.getItem(EXIT_POPUP_SESSION_KEY) === "1") return;
      window.sessionStorage.setItem(EXIT_POPUP_SESSION_KEY, "1");
      setExitPopupOpen(true);
      await registerEvent("lp_sites_exit_popup_opened", { score: false, force: true });
    };
    if (!isMobile) {
      const onMouseOut = (e: MouseEvent) => { if (e.clientY <= 20) void openPopup(); };
      document.addEventListener("mouseout", onMouseOut);
      return () => document.removeEventListener("mouseout", onMouseOut);
    }
    const marker = { lpSitesExitGuard: true };
    window.history.pushState(marker, "", window.location.href);
    const onPop = () => { if (!exitPopupOpen) void openPopup(); window.history.pushState(marker, "", window.location.href); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [exitPopupOpen, registerEvent]);

  const submitContact = async (
    formName: "lp_sites_main_proposal_form" | "lp_sites_exit_capture_form",
    conversionType: "proposal_request_main" | "proposal_request_exit_popup",
    payload: { name: string; email?: string; phone?: string; message: string; metadata: Record<string, unknown> },
  ) => {
    await apiFetch("/contacts", {
      method: "POST",
      body: JSON.stringify({
        name: payload.name, email: payload.email ?? null, phone: payload.phone ?? null, company: null,
        message: payload.message, session_key: getStoredVisitorSessionKey(), source_url: window.location.href,
        referrer: origin.referrer,
        metadata: { source: "lp-sites", capture_kind: "submitted", form_name: formName, conversion_type: conversionType, lead_source: origin.leadSource, utm_source: origin.utm_source, utm_medium: origin.utm_medium, utm_campaign: origin.utm_campaign, utm_content: origin.utm_content, utm_term: origin.utm_term, referrer: origin.referrer, page_path: LANDING_PATH, page_url: window.location.href, ...payload.metadata },
      }),
    });
  };

  const handleMainFieldFocus = (field: string) => {
    if (!mainStartedRef.current) { mainStartedRef.current = true; void registerEvent("lp_sites_form_started"); }
    if (!trackedFieldsRef.current[field]) { trackedFieldsRef.current[field] = true; void registerEvent("lp_sites_form_field_interacted", { force: true }); }
  };

  const handleMainSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMainStatus("loading"); setMainFeedback("");
    if (!mainForm.name.trim()) { setMainStatus("error"); setMainFeedback("Informe seu nome para continuar."); return; }
    const email = mainForm.email.trim();
    const phone = mainForm.whatsapp.trim();
    if (email && !isValidEmail(email)) { setMainStatus("error"); setMainFeedback("Se informar e-mail, ele precisa ser válido."); return; }
    if (phone.replace(/\D/g, "").length < 10) { setMainStatus("error"); setMainFeedback("Informe um WhatsApp válido."); return; }
    const evt = await registerEvent("lp_sites_form_submitted", { force: true });
    try {
      await submitContact("lp_sites_main_proposal_form", "proposal_request_main", {
        name: mainForm.name.trim(),
        email: email || undefined,
        phone,
        message: "Solicitação de proposta via landing /lp/ofertasites.",
        metadata: {
          lead_score: evt.nextScore,
          lead_score_breakdown: evt.nextBreakdown,
          timestamp: new Date().toISOString(),
          form_payload: { project_type: "site" },
        },
      });

      const params = new URLSearchParams({
        project_type: "site",
        step: "siteObjective",
        name: mainForm.name.trim(),
        phone,
      });

      if (email) {
        params.set("email", email);
      }

      window.location.href = `/onboarding?${params.toString()}`;
    } catch (err) { setMainStatus("error"); setMainFeedback(err instanceof Error ? err.message : "Não foi possível enviar agora."); }
  };

  const handleExitStart = () => {
    if (exitStartedRef.current) return;
    exitStartedRef.current = true;
    void registerEvent("lp_sites_exit_popup_form_started");
  };

  const handleExitSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setExitStatus("loading"); setExitFeedback("");
    const name = exitForm.name.trim(); const contact = exitForm.contact.trim();
    if (!name || !contact) { setExitStatus("error"); setExitFeedback("Preencha nome e contato para continuar."); return; }
    const asEmail = contact.includes("@") ? contact : "";
    const asPhone = asEmail ? "" : contact;
    if (asEmail && !isValidEmail(asEmail)) { setExitStatus("error"); setExitFeedback("Informe um e-mail válido."); return; }
    if (!asEmail && asPhone.replace(/\D/g, "").length < 10) { setExitStatus("error"); setExitFeedback("Informe um WhatsApp válido."); return; }
    const evt = await registerEvent("lp_sites_exit_popup_form_submitted", { force: true });
    try {
      await submitContact("lp_sites_exit_capture_form", "proposal_request_exit_popup", { name, email: asEmail || undefined, phone: asPhone || undefined, message: "Lead capturado pelo popup de saída da landing /sites.", metadata: { lead_score: evt.nextScore, lead_score_breakdown: evt.nextBreakdown, timestamp: new Date().toISOString() } });
      setExitStatus("success");
      setExitFeedback("Perfeito. Nosso time vai entrar em contato com uma proposta personalizada.");
      setTimeout(() => setExitPopupOpen(false), 1300);
    } catch (err) { setExitStatus("error"); setExitFeedback(err instanceof Error ? err.message : "Falha ao enviar no momento."); }
  };

  const ctaTo = async (eventKey: EventKey, targetId: string) => {
    await registerEvent(eventKey, { force: true });
    scrollTo(targetId);
  };

  const navClick = (href: string) => {
    setMobileMenuOpen(false);
    const id = href.replace("#", "");
    scrollTo(id);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <div className="lp-root">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <header className={`lp-header${headerScrolled ? " lp-header--scrolled" : ""}`}>
          <div className="lp-header__inner">

            <a href={LANDING_PATH} className="lp-header__logo" aria-label="Início">
              <Image src="/images/logo/logo.png" alt="Logo" width={120} height={36} className="lp-header__logo-img" />
            </a>

            <nav className="lp-header__nav" aria-label="Navegação principal">
              {NAV_LINKS.map((l) => (
                <button key={l.href} type="button" className="lp-header__nav-link" onClick={() => navClick(l.href)}>
                  {l.label}
                </button>
              ))}
            </nav>

            <div className="lp-header__actions">
              <button
                type="button"
                className="lp-btn lp-btn--primary lp-btn--sm"
                onClick={() => void ctaTo("lp_sites_cta_hero_primary_clicked", "proposal-form")}
              >
                Solicitar Proposta
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                className="lp-header__menu-btn"
                aria-label="Menu"
                onClick={() => setMobileMenuOpen((p) => !p)}
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile nav */}
          {mobileMenuOpen && (
            <div className="lp-header__mobile-nav">
              {NAV_LINKS.map((l) => (
                <button key={l.href} type="button" className="lp-header__mobile-link" onClick={() => navClick(l.href)}>
                  {l.label}
                </button>
              ))}
              <button
                type="button"
                className="lp-btn lp-btn--primary"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => { setMobileMenuOpen(false); void ctaTo("lp_sites_cta_hero_primary_clicked", "proposal-form"); }}
              >
                Solicitar Proposta
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </header>

        {/* ── HERO ────────────────────────────────────────────────────────── */}
        <section className="lp-hero" data-reveal>
          <div className="lp-hero__bg" aria-hidden>
            <div className="lp-hero__mesh" />
            <div className="lp-hero__grid" />
            <div className="lp-hero__orb lp-hero__orb--1" />
            <div className="lp-hero__orb lp-hero__orb--2" />
            <div className="lp-hero__orb lp-hero__orb--3" />
            <div className="lp-hero__beam" />
            <div className="lp-hero__scanline" />
          </div>

          <div className="lp-container lp-hero__inner">
            <div className="lp-hero__content">
              <span className="lp-badge">
                <span className="lp-badge__dot" />
                Criação de Sites &amp; Desenvolvimento Web
              </span>
              <h1 className="lp-hero__title">
                Sites que convertem.<br />
                <em>Resultados de verdade.</em>
              </h1>
              <p className="lp-hero__sub">
                Desenvolvemos <strong>sites profissionais</strong>, landing pages, e-commerces e sistemas pensados para transformar visitantes em clientes.
              </p>
              <ul className="lp-hero__pills">
                {["Design moderno e responsivo", "Performance otimizada", "SEO avançado", "Estrutura para conversão"].map((b) => (
                  <li key={b} className="lp-pill"><CheckCircle2 size={14} />{b}</li>
                ))}
              </ul>
              <div className="lp-hero__ctas">
                <button type="button" className="lp-btn lp-btn--primary" onClick={() => void ctaTo("lp_sites_cta_hero_primary_clicked", "proposal-form")}>
                  Solicitar Proposta Gratuita <ArrowRight size={16} />
                </button>
                <button type="button" className="lp-btn lp-btn--ghost-light" onClick={() => void ctaTo("lp_sites_cta_hero_secondary_clicked", "como-funciona")}>
                  Como funciona
                </button>
              </div>
            </div>

            <div className="lp-hero__card">
              <div className="lp-hero__card-inner">
                <Image src="/images/logo/logo.png" alt="Mockup de site profissional" width={800} height={460} className="lp-hero__img" />
                <div className="lp-hero__card-tags">
                  <div className="lp-tag lp-tag--blue">
                    <span className="lp-tag__label">Estratégia</span>
                    <span className="lp-tag__text">Arquitetura focada em conversão.</span>
                  </div>
                  <div className="lp-tag lp-tag--green">
                    <span className="lp-tag__label">Execução</span>
                    <span className="lp-tag__text">Desenvolvimento rápido e preciso.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PROBLEMA ────────────────────────────────────────────────────── */}
        <section className="lp-problem" data-reveal>
          <div className="lp-container">
            <div className="lp-problem__inner">
              <div className="lp-problem__text">
                <p className="lp-eyebrow">O problema</p>
                <h2 className="lp-h2">Seu site não está trazendo resultados?</h2>
                <p className="lp-body">Se sua empresa já tem presença online, mas o site não gera contatos, não transmite confiança e não representa a qualidade do negócio, você está perdendo oportunidades todos os dias.</p>
              </div>
              <div className="lp-problem__cards">
                {["Baixa geração de contatos", "Percepção visual abaixo do nível da empresa", "Ausência de estrutura para conversão"].map((item) => (
                  <div key={item} className="lp-problem__card">
                    <span className="lp-problem__icon">✕</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── SERVIÇOS ────────────────────────────────────────────────────── */}
        <section id="servicos" className="lp-services" data-reveal>
          <div className="lp-container">
            <div className="lp-section-header">
              <p className="lp-eyebrow">O que você recebe</p>
              <h2 className="lp-h2">Mais do que design bonito</h2>
              <p className="lp-body lp-body--center">Estrutura digital para performance, posicionamento e crescimento comercial.</p>
            </div>
            <div className="lp-services__grid">
              {SERVICE_CARDS.map((card) => (
                <button key={card.title} type="button" className="lp-service-card" onClick={() => void registerEvent("lp_sites_services_card_clicked", { force: true })}>
                  <div className="lp-service-card__icon">{card.icon}</div>
                  <h3 className="lp-service-card__title">{card.title}</h3>
                  <p className="lp-service-card__desc">{card.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── SOLUÇÕES ────────────────────────────────────────────────────── */}
        <section id="solucoes" className="lp-solutions" data-reveal>
          <div className="lp-container">
            <div className="lp-solutions__inner">
              <div className="lp-solutions__left">
                <p className="lp-eyebrow lp-eyebrow--light">Soluções</p>
                <h2 className="lp-h2 lp-h2--light">O que desenvolvemos</h2>
                <p className="lp-body lp-body--light">Cada projeto é construído com foco em performance, usabilidade e resultado comercial.</p>
                <div className="lp-solutions__ctaWrap">
                  <button type="button" className="lp-btn lp-btn--white lp-solutions__ctaBtn" onClick={() => void ctaTo("lp_sites_cta_solutions_clicked", "proposal-form")}>
                    Quero um site para meu projeto <ArrowRight size={16} />
                  </button>
                </div>
              </div>
              <div className="lp-solutions__right">
                {SOLUTION_ITEMS.map((item) => (
                  <article key={item.title} className="lp-solution-card">
                    <div className="lp-solution-card__icon">{item.icon}</div>
                    <div>
                      <h3 className="lp-solution-card__title">{item.title}</h3>
                      <p className="lp-solution-card__text">{item.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── POR QUE NÓS ─────────────────────────────────────────────────── */}
        <section className="lp-split" data-reveal>
          <div className="lp-container">
            <div className="lp-section-header lp-section-header--left">
              <p className="lp-eyebrow">Diferenciais</p>
              <h2 className="lp-h2">Por que escolher nossa empresa</h2>
            </div>
            <ul className="lp-why__list">
              {["Atendimento próximo e consultivo em cada etapa.", "Entendimento real do momento do seu negócio.", "Foco em resultado comercial e não apenas estética.", "Visual moderno com usabilidade e clareza.", "Estrutura preparada para crescer com a empresa.", "Comunicação objetiva com visão de negócio."].map((item) => (
                <li key={item} className="lp-why__item">
                  <Sparkles size={14} className="lp-why__icon" />{item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── COMO FUNCIONA ────────────────────────────────────────────────── */}
        <section id="como-funciona" className="lp-how" data-reveal>
          <div className="lp-container">
            <div className="lp-section-header">
              <p className="lp-eyebrow">Processo</p>
              <h2 className="lp-h2">Como funciona</h2>
            </div>
            <div className="lp-how__steps">
              {HOW_IT_WORKS.map((item, i) => (
                <div key={item.step} className="lp-how__step">
                  <div className="lp-how__step-num">{item.step}</div>
                  {i < HOW_IT_WORKS.length - 1 && <div className="lp-how__connector" aria-hidden />}
                  <h3 className="lp-how__step-title">{item.title}</h3>
                  <p className="lp-how__step-desc">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="lp-how__cta">
              <button type="button" className="lp-btn lp-btn--primary" onClick={() => void ctaTo("lp_sites_cta_pre_form_clicked", "proposal-form")}>
                Solicitar Proposta Agora <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* ── PRÉ-FORM BANNER ─────────────────────────────────────────────── */}
        <section className="lp-prebook" data-reveal>
          <div className="lp-container lp-prebook__inner">
            <div>
              <h2 className="lp-h2 lp-h2--light">Vamos tirar sua ideia do papel?</h2>
              <p className="lp-body lp-body--light">Receba um direcionamento claro para desenvolver um site alinhado ao seu objetivo.</p>
            </div>
            <div className="lp-prebook__tags">
              <span className="lp-prebook__tag">Sem compromisso</span>
              <span className="lp-prebook__tag">Atendimento rápido</span>
              <span className="lp-prebook__tag">Proposta personalizada</span>
            </div>
          </div>
        </section>

        {/* ── FORMULÁRIO ──────────────────────────────────────────────────── */}
        <section id="proposal-form" className="lp-form-section" data-reveal>
          <div className="lp-container">
            <div className="lp-form-wrap">
              <div className="lp-form-wrap__header">
                <p className="lp-eyebrow">Proposta</p>
                <h2 className="lp-h2">Solicite sua proposta gratuita</h2>
                <p className="lp-body">Preencha as informações abaixo e entraremos em contato com um direcionamento para seu projeto.</p>
              </div>
              <form onSubmit={handleMainSubmit} className="lp-form" noValidate>
                <div className="lp-form__row">
                  <label className="lp-field"><span className="lp-field__label">Nome</span><input required value={mainForm.name} onFocus={() => handleMainFieldFocus("name")} onChange={(e) => setMainForm((p) => ({ ...p, name: e.target.value }))} className="lp-field__input" placeholder="Seu nome completo" /></label>
                  <label className="lp-field"><span className="lp-field__label">WhatsApp</span><input required value={mainForm.whatsapp} onFocus={() => handleMainFieldFocus("whatsapp")} onChange={(e) => setMainForm((p) => ({ ...p, whatsapp: formatWhatsapp(e.target.value) }))} className="lp-field__input" placeholder="(00) 00000-0000" /></label>
                </div>
                <label className="lp-field">
                  <span className="lp-field__label">E-mail <span className="lp-field__optional">(opcional)</span></span>
                  <input type="email" value={mainForm.email} onFocus={() => handleMainFieldFocus("email")} onChange={(e) => setMainForm((p) => ({ ...p, email: e.target.value }))} className="lp-field__input" placeholder="seu@email.com" />
                </label>
                {mainStatus === "error" && <p className="lp-form__feedback lp-form__feedback--error">{mainFeedback}</p>}
                <div className="lp-form__footer">
                  <button type="submit" disabled={mainStatus === "loading"} className="lp-btn lp-btn--primary lp-btn--lg">
                    {mainStatus === "loading" ? "Redirecionando..." : "Continuar para Onboarding"}
                    {mainStatus !== "loading" && <ArrowRight size={16} />}
                  </button>
                  <p className="lp-form__note">WhatsApp obrigatório.</p>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* ── FOOTER CTA ──────────────────────────────────────────────────── */}
        <section className="lp-footer-cta" data-reveal>
          <div className="lp-container lp-footer-cta__inner">
            <div className="lp-footer-cta__content">
              <h2 className="lp-h2 lp-h2--light">Seu próximo projeto merece uma presença digital à altura.</h2>
              <p className="lp-body lp-body--light">Site profissional, moderno e estratégico para vender melhor e fortalecer sua marca.</p>
              <div className="lp-footer-cta__contacts">
                {generalSettings.contact_phone && (
                  <a href={`tel:${onlyDigits(generalSettings.contact_phone)}`} className="lp-footer-cta__contact-item">
                    <Phone size={14} />
                    {generalSettings.contact_phone}
                  </a>
                )}

                {generalSettings.contact_whatsapp && (
                  <a
                    href={generalSettings.contact_whatsapp_url || `https://wa.me/55${onlyDigits(generalSettings.contact_whatsapp)}`}
                    className="lp-footer-cta__contact-item"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle size={14} />
                    {generalSettings.contact_whatsapp}
                  </a>
                )}

                {generalSettings.contact_email && (
                  <a href={`mailto:${generalSettings.contact_email}`} className="lp-footer-cta__contact-item">
                    <Mail size={14} />
                    {generalSettings.contact_email}
                  </a>
                )}
              </div>
            </div>
            <button type="button" className="lp-btn lp-btn--white" onClick={() => void ctaTo("lp_sites_footer_cta_clicked", "proposal-form")}>
              Solicitar Proposta Gratuita <ArrowRight size={16} />
            </button>
          </div>
        </section>

        {/* ── EXIT POPUP ──────────────────────────────────────────────────── */}
        {exitPopupOpen && (
          <div className="lp-popup-overlay" role="dialog" aria-modal="true">
            <div className="lp-popup">
              <button type="button" className="lp-popup__close" onClick={() => setExitPopupOpen(false)} aria-label="Fechar"><X size={18} /></button>
              <div className="lp-popup__badge">Espere</div>
              <h3 className="lp-popup__title">Não saia ainda.</h3>
              <p className="lp-popup__sub">Nossa equipe pode montar uma proposta muito boa para o seu projeto. Deixe seus dados e entraremos em contato.</p>
              <form className="lp-popup__form" onSubmit={handleExitSubmit}>
                <label className="lp-field"><span className="lp-field__label">Nome</span><input value={exitForm.name} onFocus={handleExitStart} onChange={(e) => setExitForm((p) => ({ ...p, name: e.target.value }))} className="lp-field__input" required placeholder="Seu nome" /></label>
                <label className="lp-field"><span className="lp-field__label">WhatsApp ou e-mail</span><input value={exitForm.contact} onFocus={handleExitStart} onChange={(e) => setExitForm((p) => ({ ...p, contact: e.target.value }))} className="lp-field__input" required placeholder="(00) 00000-0000 ou email@..." /></label>
                {exitStatus === "error" && <p className="lp-form__feedback lp-form__feedback--error">{exitFeedback}</p>}
                {exitStatus === "success" && <p className="lp-form__feedback lp-form__feedback--success">{exitFeedback}</p>}
                <div className="lp-popup__actions">
                  <button type="submit" disabled={exitStatus === "loading"} className="lp-btn lp-btn--primary">{exitStatus === "loading" ? "Enviando..." : "Quero receber uma proposta"}</button>
                  <button type="button" className="lp-btn lp-btn--ghost" onClick={() => setExitPopupOpen(false)}>Fechar</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ── STYLES ────────────────────────────────────────────────────────── */}
      <style jsx global>{`
        /* ── Tokens ──────────────────────────────────────────────────── */
        :root {
          --blue-900: #0d1f4e; --blue-800: #1035a0; --blue-700: #1547c8;
          --blue-600: #2563eb; --blue-500: #3b82f6; --blue-400: #60a5fa;
          --blue-100: #dbeafe; --blue-50: #eff6ff;
          --slate-900: #0f172a; --slate-800: #1e293b; --slate-700: #334155;
          --slate-600: #475569; --slate-400: #94a3b8; --slate-200: #e2e8f0;
          --slate-100: #f1f5f9; --slate-50: #f8fafc; --white: #ffffff;
          --red-500: #ef4444;
          --radius-sm: 8px; --radius-md: 14px; --radius-lg: 20px; --radius-full: 999px;
          --shadow-sm: 0 1px 3px rgba(0,0,0,.07),0 1px 2px rgba(0,0,0,.05);
          --shadow-md: 0 4px 16px rgba(0,0,0,.08),0 1px 4px rgba(0,0,0,.06);
          --shadow-lg: 0 12px 40px rgba(0,0,0,.10),0 2px 8px rgba(0,0,0,.06);
          --shadow-blue: 0 8px 32px rgba(21,71,200,.28);
          --header-h: 68px;
        }

        /* ── Base reset ──────────────────────────────────────────────── */
        *, *::before, *::after { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { margin: 0; font-family: 'Geist','Inter',system-ui,sans-serif; background: var(--white); color: var(--slate-900); overflow-x: hidden; }

        /* ── Root ────────────────────────────────────────────────────── */
        .lp-root { min-height: 100vh; display: flex; flex-direction: column; }

        /* ── Container ───────────────────────────────────────────────── */
        .lp-container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 40px; }
        @media (max-width: 768px) { .lp-container { padding: 0 20px; } }

        /* ── Reveal ──────────────────────────────────────────────────── */
        [data-reveal] { opacity: 0; transform: translateY(22px); transition: opacity 540ms ease, transform 540ms ease; }
        [data-reveal].is-visible { opacity: 1; transform: translateY(0); }

        /* ── Typography ──────────────────────────────────────────────── */
        .lp-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--blue-600); margin-bottom: 10px; display: block; }
        .lp-eyebrow--light { color: rgba(255,255,255,.6); }
        .lp-h2 { font-size: clamp(1.6rem,3vw,2.2rem); font-weight: 700; line-height: 1.2; color: var(--slate-900); margin: 0 0 16px; }
        .lp-h2--light { color: var(--white); }
        .lp-body { font-size: .975rem; line-height: 1.7; color: var(--slate-600); margin: 0; }
        .lp-body--center { text-align: center; }
        .lp-body--light { color: rgba(255,255,255,.72); }
        .lp-section-header { text-align: center; max-width: 600px; margin: 0 auto 56px; }
        .lp-section-header--left { text-align: left; max-width: 100%; margin: 0 0 36px; }

        /* ── Buttons ─────────────────────────────────────────────────── */
        .lp-btn { display: inline-flex; align-items: center; gap: 8px; border: none; cursor: pointer; font-weight: 600; font-size: .9rem; border-radius: var(--radius-full); transition: transform .15s,box-shadow .15s,background .15s; white-space: nowrap; text-decoration: none; }
        .lp-btn:active { transform: scale(.98) !important; }
        .lp-btn--primary { background: var(--blue-700); color: var(--white); padding: 13px 26px; box-shadow: var(--shadow-blue); }
        .lp-btn--primary:hover { background: var(--blue-600); transform: translateY(-2px); box-shadow: 0 12px 40px rgba(21,71,200,.36); }
        .lp-btn--primary:disabled { opacity: .65; transform: none; cursor: not-allowed; }
        .lp-btn--sm { padding: 10px 18px; font-size: .825rem; }
        .lp-btn--lg { padding: 15px 32px; font-size: .975rem; }
        .lp-btn--ghost { background: transparent; color: var(--slate-700); padding: 12px 22px; border: 1.5px solid var(--slate-200); }
        .lp-btn--ghost:hover { background: var(--slate-100); transform: translateY(-1px); }
        .lp-btn--ghost-light { background: rgba(255,255,255,.08); color: rgba(255,255,255,.85); padding: 12px 22px; border: 1.5px solid rgba(255,255,255,.18); backdrop-filter: blur(6px); }
        .lp-btn--ghost-light:hover { background: rgba(255,255,255,.14); transform: translateY(-1px); }
        .lp-btn--white { background: var(--white); color: var(--blue-700); padding: 13px 26px; box-shadow: var(--shadow-md); }
        .lp-btn--white:hover { background: var(--blue-50); transform: translateY(-2px); }

        /* ── HEADER ──────────────────────────────────────────────────── */
        .lp-header { position: fixed; top: 0; left: 0; right: 0; z-index: 100; height: var(--header-h); transition: background .25s, box-shadow .25s, backdrop-filter .25s; }
        .lp-header--scrolled { background: rgba(6,14,36,.88); backdrop-filter: blur(16px); box-shadow: 0 1px 0 rgba(255,255,255,.07); }
        .lp-header__inner { max-width: 1200px; margin: 0 auto; padding: 0 40px; height: 100%; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
        @media (max-width: 768px) { .lp-header__inner { padding: 0 20px; } }
        .lp-header__logo { display: flex; align-items: center; flex-shrink: 0; }
        .lp-header__logo-img { height: 32px; width: auto; object-fit: contain; }
        .lp-header__nav { display: flex; align-items: center; gap: 4px; }
        @media (max-width: 860px) { .lp-header__nav { display: none; } }
        .lp-header__nav-link { background: none; border: none; cursor: pointer; font-size: .85rem; font-weight: 500; color: rgba(255,255,255,.7); padding: 7px 12px; border-radius: var(--radius-full); transition: color .15s, background .15s; }
        .lp-header__nav-link:hover { color: var(--white); background: rgba(255,255,255,.08); }
        .lp-header__actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .lp-header__menu-btn { display: none; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14); color: rgba(255,255,255,.8); width: 38px; height: 38px; border-radius: var(--radius-md); cursor: pointer; align-items: center; justify-content: center; }
        @media (max-width: 860px) { .lp-header__menu-btn { display: flex; } }
        .lp-header__mobile-nav { background: rgba(6,14,36,.97); backdrop-filter: blur(20px); border-top: 1px solid rgba(255,255,255,.08); padding: 16px 20px 20px; display: flex; flex-direction: column; gap: 4px; }
        .lp-header__mobile-link { background: none; border: none; cursor: pointer; font-size: .9rem; font-weight: 500; color: rgba(255,255,255,.75); padding: 12px 14px; border-radius: var(--radius-md); text-align: left; transition: background .15s, color .15s; }
        .lp-header__mobile-link:hover { background: rgba(255,255,255,.07); color: var(--white); }

        /* ── Badge / Pill ────────────────────────────────────────────── */
        .lp-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(37,99,235,.2); border: 1px solid rgba(96,165,250,.3); color: #93c5fd; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; padding: 7px 14px; border-radius: var(--radius-full); margin-bottom: 24px; backdrop-filter: blur(8px); }
        .lp-badge__dot { width: 6px; height: 6px; border-radius: 50%; background: #60a5fa; animation: pulse-dot 2s ease-in-out infinite; }
        @keyframes pulse-dot { 0%,100% { opacity:1;transform:scale(1);box-shadow:0 0 0 0 rgba(96,165,250,.5); } 50% { opacity:.8;transform:scale(.8);box-shadow:0 0 0 4px rgba(96,165,250,0); } }
        .lp-hero__pills { list-style: none; padding: 0; margin: 0 0 32px; display: flex; flex-wrap: wrap; gap: 10px; }
        .lp-pill { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12); border-radius: var(--radius-full); padding: 7px 14px; font-size: .825rem; font-weight: 500; color: rgba(255,255,255,.8); backdrop-filter: blur(8px); }
        .lp-pill svg { color: #60a5fa; }

        /* ── HERO ────────────────────────────────────────────────────── */
        .lp-hero { position: relative; padding: calc(var(--header-h) + 72px) 0 112px; overflow: hidden; background: #060e24; }
        .lp-hero__bg { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
        .lp-hero__mesh { position: absolute; inset: 0; animation: mesh-shift 14s ease-in-out infinite alternate; }
        @keyframes mesh-shift {
          0%   { background: radial-gradient(ellipse 80% 60% at 20% 40%,rgba(37,99,235,.35) 0%,transparent 60%), radial-gradient(ellipse 60% 50% at 80% 20%,rgba(96,165,250,.2) 0%,transparent 55%), radial-gradient(ellipse 50% 70% at 60% 90%,rgba(13,31,78,.8) 0%,transparent 60%); }
          100% { background: radial-gradient(ellipse 70% 70% at 40% 30%,rgba(21,71,200,.4) 0%,transparent 60%), radial-gradient(ellipse 80% 40% at 70% 60%,rgba(59,130,246,.18) 0%,transparent 55%), radial-gradient(ellipse 60% 80% at 20% 80%,rgba(13,31,78,.7) 0%,transparent 60%); }
        }
        .lp-hero__grid { position: absolute; inset: 0; background-image: radial-gradient(circle at 1px 1px,rgba(255,255,255,.06) 1px,transparent 0); background-size: 32px 32px; }
        .lp-hero__orb { position: absolute; border-radius: 50%; }
        .lp-hero__orb--1 { width: 600px; height: 600px; top: -200px; left: -100px; background: radial-gradient(circle,rgba(37,99,235,.3) 0%,transparent 65%); filter: blur(40px); animation: orb-float-1 20s ease-in-out infinite; }
        .lp-hero__orb--2 { width: 500px; height: 500px; bottom: -150px; right: -80px; background: radial-gradient(circle,rgba(96,165,250,.2) 0%,transparent 65%); filter: blur(50px); animation: orb-float-2 25s ease-in-out infinite; }
        .lp-hero__orb--3 { width: 200px; height: 200px; top: 30%; left: 55%; background: radial-gradient(circle,rgba(147,197,253,.15) 0%,transparent 65%); filter: blur(20px); animation: orb-float-3 12s ease-in-out infinite; }
        @keyframes orb-float-1 { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(30px,-20px) scale(1.05);} 66%{transform:translate(-15px,25px) scale(.97);} }
        @keyframes orb-float-2 { 0%,100%{transform:translate(0,0) scale(1);} 40%{transform:translate(-25px,15px) scale(1.08);} 70%{transform:translate(20px,-30px) scale(.95);} }
        @keyframes orb-float-3 { 0%,100%{transform:translate(0,0);opacity:.6;} 50%{transform:translate(-20px,10px);opacity:1;} }
        .lp-hero__beam { position: absolute; top: 0; left: 50%; width: 2px; height: 100%; background: linear-gradient(180deg,transparent 0%,rgba(96,165,250,.5) 30%,rgba(37,99,235,.8) 55%,rgba(96,165,250,.3) 80%,transparent 100%); filter: blur(6px); animation: beam-slide 8s ease-in-out infinite; }
        @keyframes beam-slide { 0%,100%{opacity:0;transform:translateX(-300px) scaleY(.8);} 30%,70%{opacity:1;} 50%{transform:translateX(300px) scaleY(1);opacity:.6;} }
        .lp-hero__scanline { position: absolute; inset: 0; background: repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,.012) 3px,rgba(255,255,255,.012) 4px); pointer-events: none; }
        .lp-hero__inner { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 72px; align-items: center; }
        @media (max-width: 900px) { .lp-hero__inner { grid-template-columns: 1fr; gap: 48px; } }
        .lp-hero__title { font-size: clamp(2.2rem,4.8vw,3.4rem); font-weight: 800; line-height: 1.08; letter-spacing: -.025em; color: var(--white); margin: 0 0 20px; }
        .lp-hero__title em { font-style: normal; background: linear-gradient(135deg,#60a5fa,#93c5fd,#3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: gradient-text 4s ease infinite alternate; background-size: 200% 200%; }
        @keyframes gradient-text { 0%{background-position:0% 50%;} 100%{background-position:100% 50%;} }
        .lp-hero__sub { font-size: 1.05rem; line-height: 1.7; color: rgba(255,255,255,.7); margin: 0 0 28px; max-width: 480px; }
        .lp-hero__sub strong { color: rgba(255,255,255,.95); }
        .lp-hero__ctas { display: flex; flex-wrap: wrap; gap: 12px; }
        .lp-hero__card { position: relative; }
        .lp-hero__card::before { content:''; position: absolute; inset: -12px; border-radius: 32px; background: radial-gradient(ellipse at center,rgba(37,99,235,.25),transparent 70%); animation: card-glow 4s ease-in-out infinite alternate; }
        @keyframes card-glow { 0%{opacity:.6;transform:scale(1);} 100%{opacity:1;transform:scale(1.03);} }
        .lp-hero__card-inner { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); border-radius: 22px; padding: 16px; backdrop-filter: blur(16px); box-shadow: 0 24px 80px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.1); }
        .lp-hero__img { width: 100%; height: auto; border-radius: 12px; display: block; opacity: .92; }
        .lp-hero__card-tags { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
        .lp-tag { border-radius: var(--radius-md); padding: 12px 14px; }
        .lp-tag--blue { background: rgba(37,99,235,.2); border: 1px solid rgba(96,165,250,.25); }
        .lp-tag--green { background: rgba(34,197,94,.15); border: 1px solid rgba(34,197,94,.25); }
        .lp-tag__label { display: block; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 3px; }
        .lp-tag--blue .lp-tag__label { color: #93c5fd; }
        .lp-tag--green .lp-tag__label { color: #86efac; }
        .lp-tag__text { font-size: .8rem; color: rgba(255,255,255,.6); line-height: 1.4; }

        /* ── PROBLEM ─────────────────────────────────────────────────── */
        .lp-problem { padding: 88px 0; background: var(--slate-50); position: relative; overflow: hidden; }
        .lp-problem::before { content:''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg,var(--blue-700),var(--blue-400),var(--blue-700)); background-size: 200% 100%; animation: shimmer-bar 4s linear infinite; }
        @keyframes shimmer-bar { 0%{background-position:200% 0;} 100%{background-position:-200% 0;} }
        .lp-problem__inner { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
        @media (max-width: 860px) { .lp-problem__inner { grid-template-columns: 1fr; gap: 32px; } }
        .lp-problem__cards { display: flex; flex-direction: column; gap: 12px; }
        .lp-problem__card { display: flex; align-items: center; gap: 14px; background: var(--white); border: 1px solid var(--slate-200); border-radius: var(--radius-md); padding: 16px 20px; font-size: .9rem; font-weight: 500; color: var(--slate-700); box-shadow: var(--shadow-sm); transition: transform .2s,box-shadow .2s; }
        .lp-problem__card:hover { transform: translateX(4px); box-shadow: var(--shadow-md); }
        .lp-problem__icon { width: 28px; height: 28px; border-radius: 50%; background: #fef2f2; color: var(--red-500); display: grid; place-items: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }

        /* ── SERVICES ────────────────────────────────────────────────── */
        .lp-services { padding: 104px 0; background: var(--white); }
        .lp-services__grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
        @media (max-width: 900px) { .lp-services__grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 540px) { .lp-services__grid { grid-template-columns: 1fr; } }
        .lp-service-card { background: var(--white); border: 1px solid var(--slate-200); border-radius: var(--radius-lg); padding: 28px 24px; text-align: left; cursor: pointer; transition: transform .25s,box-shadow .25s,border-color .25s; box-shadow: var(--shadow-sm); position: relative; overflow: hidden; }
        .lp-service-card::after { content:''; position: absolute; inset: 0; background: linear-gradient(135deg,rgba(37,99,235,.04),transparent); opacity: 0; transition: opacity .25s; }
        .lp-service-card:hover { transform: translateY(-6px); box-shadow: 0 20px 60px rgba(37,99,235,.12),var(--shadow-md); border-color: #bfdbfe; }
        .lp-service-card:hover::after { opacity: 1; }
        .lp-service-card:hover .lp-service-card__icon { background: var(--blue-700); color: var(--white); transform: scale(1.08); }
        .lp-service-card__icon { width: 48px; height: 48px; border-radius: var(--radius-md); background: var(--blue-50); border: 1px solid var(--blue-100); color: var(--blue-700); display: grid; place-items: center; margin-bottom: 18px; transition: background .25s,color .25s,transform .25s; }
        .lp-service-card__title { font-size: 1.05rem; font-weight: 700; color: var(--slate-900); margin: 0 0 8px; }
        .lp-service-card__desc { font-size: .875rem; line-height: 1.6; color: var(--slate-600); margin: 0; }

        /* ── SOLUTIONS ───────────────────────────────────────────────── */
        .lp-solutions { padding: 104px 0; background: linear-gradient(160deg,#060e24 0%,#0d1f4e 50%,#1035a0 100%); position: relative; overflow: hidden; }
        .lp-solutions::before { content:''; position: absolute; inset: 0; background-image: radial-gradient(circle at 1px 1px,rgba(255,255,255,.04) 1px,transparent 0); background-size: 28px 28px; }
        .lp-solutions::after { content:''; position: absolute; top: -200px; right: -100px; width: 700px; height: 700px; border-radius: 50%; background: radial-gradient(circle,rgba(37,99,235,.2) 0%,transparent 65%); filter: blur(60px); animation: orb-float-1 20s ease-in-out infinite; pointer-events: none; }
        .lp-solutions__inner { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
        @media (max-width: 860px) { .lp-solutions__inner { grid-template-columns: 1fr; gap: 48px; } }
        .lp-solutions__ctaWrap { margin-top: 20px; display: flex; justify-content: flex-start; }
        .lp-solutions__ctaBtn { min-height: 46px; }
        @media (max-width: 860px) {
          .lp-solutions__ctaWrap { justify-content: center; }
        }
        .lp-solutions__right { display: flex; flex-direction: column; gap: 16px; }
        .lp-solution-card { display: flex; align-items: flex-start; gap: 16px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.09); border-radius: var(--radius-lg); padding: 22px 24px; transition: background .25s,transform .25s,border-color .25s; }
        .lp-solution-card:hover { background: rgba(255,255,255,.1); transform: translateX(4px); border-color: rgba(96,165,250,.3); }
        .lp-solution-card__icon { width: 44px; height: 44px; border-radius: var(--radius-md); background: rgba(37,99,235,.35); border: 1px solid rgba(96,165,250,.25); color: #93c5fd; display: grid; place-items: center; flex-shrink: 0; }
        .lp-solution-card__title { font-size: 1rem; font-weight: 700; color: var(--white); margin: 0 0 4px; }
        .lp-solution-card__text { font-size: .875rem; color: rgba(255,255,255,.6); margin: 0; }

        /* ── WHY US ──────────────────────────────────────────────────── */
        .lp-split { padding: 104px 0; background: var(--slate-50); }
        .lp-why__list { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; }
        @media (max-width: 860px) { .lp-why__list { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 540px) { .lp-why__list { grid-template-columns: 1fr; } }
        .lp-why__item { display: flex; align-items: flex-start; gap: 10px; font-size: .9rem; color: var(--slate-700); line-height: 1.5; padding: 16px 18px; background: var(--white); border: 1px solid var(--slate-200); border-radius: var(--radius-md); transition: border-color .2s,transform .2s,box-shadow .2s; }
        .lp-why__item:hover { border-color: #bfdbfe; transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .lp-why__icon { color: var(--blue-600); margin-top: 2px; flex-shrink: 0; }

        /* ── HOW IT WORKS ────────────────────────────────────────────── */
        .lp-how { padding: 104px 0; background: var(--white); }
        .lp-how__steps { display: grid; grid-template-columns: repeat(5,1fr); position: relative; }
        @media (max-width: 900px) { .lp-how__steps { grid-template-columns: 1fr; gap: 24px; } }
        .lp-how__step { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 0 12px; position: relative; }
        .lp-how__step-num { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg,var(--blue-700),var(--blue-500)); color: var(--white); font-size: .875rem; font-weight: 800; display: grid; place-items: center; box-shadow: var(--shadow-blue); margin-bottom: 18px; position: relative; z-index: 1; transition: transform .2s,box-shadow .2s; }
        .lp-how__step:hover .lp-how__step-num { transform: scale(1.1); box-shadow: 0 12px 40px rgba(21,71,200,.4); }
        .lp-how__connector { position: absolute; top: 28px; left: calc(50% + 28px); right: calc(-50% + 28px); height: 1px; background: linear-gradient(90deg,#93c5fd,#bfdbfe); z-index: 0; }
        @media (max-width: 900px) { .lp-how__connector { display: none; } }
        .lp-how__step-title { font-size: .9rem; font-weight: 700; color: var(--slate-900); margin: 0 0 6px; }
        .lp-how__step-desc { font-size: .8rem; color: var(--slate-500); line-height: 1.5; }
        .lp-how__cta { text-align: center; margin-top: 52px; }

        /* ── PREBOOK ─────────────────────────────────────────────────── */
        .lp-prebook { padding: 72px 0; background: linear-gradient(135deg,#0d1f4e,var(--blue-700)); position: relative; overflow: hidden; }
        .lp-prebook::before { content:''; position: absolute; inset: 0; background-image: radial-gradient(circle at 1px 1px,rgba(255,255,255,.05) 1px,transparent 0); background-size: 24px 24px; }
        .lp-prebook::after { content:''; position: absolute; bottom: -80px; left: 40%; width: 400px; height: 400px; border-radius: 50%; background: radial-gradient(circle,rgba(96,165,250,.15) 0%,transparent 65%); filter: blur(40px); animation: orb-float-2 18s ease-in-out infinite; pointer-events: none; }
        .lp-prebook__inner { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 40px; flex-wrap: wrap; }
        .lp-prebook__tags { display: flex; flex-wrap: wrap; gap: 10px; }
        .lp-prebook__tag { background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.18); color: rgba(255,255,255,.9); border-radius: var(--radius-full); padding: 7px 16px; font-size: .825rem; font-weight: 500; backdrop-filter: blur(6px); }

        /* ── FORM ────────────────────────────────────────────────────── */
        .lp-form-section { padding: 104px 0; background: var(--slate-50); position: relative; }
        .lp-form-section::before { content:''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg,transparent,var(--blue-200,#bfdbfe),transparent); }
        .lp-form-wrap { max-width: 800px; margin: 0 auto; background: var(--white); border: 1px solid var(--slate-200); border-radius: 28px; padding: 56px; box-shadow: 0 24px 80px rgba(0,0,0,.06); }
        @media (max-width: 720px) { .lp-form-wrap { padding: 32px 24px; } }
        .lp-form-wrap__header { margin-bottom: 40px; padding-bottom: 32px; border-bottom: 1px solid var(--slate-100); }
        .lp-form { display: flex; flex-direction: column; gap: 20px; }
        .lp-form__row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .lp-form__row--3 { grid-template-columns: 1fr 1fr 1fr; }
        @media (max-width: 720px) { .lp-form__row,.lp-form__row--3 { grid-template-columns: 1fr; } }
        .lp-form__footer { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; padding-top: 8px; }
        .lp-form__note { font-size: .825rem; color: var(--slate-400); margin: 0; }
        .lp-form__feedback { padding: 12px 16px; border-radius: var(--radius-md); font-size: .875rem; font-weight: 500; margin: 0; }
        .lp-form__feedback--error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
        .lp-form__feedback--success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
        .lp-field { display: flex; flex-direction: column; gap: 6px; }
        .lp-field__label { font-size: .825rem; font-weight: 600; color: var(--slate-700); }
        .lp-field__optional { font-weight: 400; color: var(--slate-400); }
        .lp-field__input { width: 100%; border: 1.5px solid var(--slate-200); border-radius: var(--radius-md); padding: 13px 16px; font-size: .925rem; color: var(--slate-900); background: var(--slate-50); outline: none; transition: border-color .15s,box-shadow .15s,background .15s; font-family: inherit; }
        .lp-field__input::placeholder { color: var(--slate-400); }
        .lp-field__input:focus { border-color: var(--blue-500); box-shadow: 0 0 0 4px rgba(59,130,246,.12); background: var(--white); }
        .lp-field__select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px; cursor: pointer; }
        .lp-field__textarea { resize: vertical; min-height: 100px; line-height: 1.6; }
        .lp-field__count { font-size: .75rem; color: var(--slate-400); text-align: right; }

        /* ── FOOTER CTA ──────────────────────────────────────────────── */
        .lp-footer-cta { padding: 96px 0; background: #060e24; position: relative; overflow: hidden; }
        .lp-footer-cta::before { content:''; position: absolute; inset: 0; background: radial-gradient(ellipse 70% 80% at 50% 50%,rgba(37,99,235,.18),transparent 70%); animation: mesh-shift 12s ease-in-out infinite alternate; }
        .lp-footer-cta::after { content:''; position: absolute; inset: 0; background-image: radial-gradient(circle at 1px 1px,rgba(255,255,255,.04) 1px,transparent 0); background-size: 28px 28px; }
        .lp-footer-cta__inner { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 40px; flex-wrap: wrap; }
        .lp-footer-cta__content { display: flex; flex-direction: column; gap: 14px; max-width: 680px; }
        .lp-footer-cta__contacts { display: flex; flex-wrap: wrap; gap: 10px; }
        .lp-footer-cta__contact-item { display: inline-flex; align-items: center; gap: 8px; color: rgba(255,255,255,.86); font-size: .82rem; font-weight: 500; padding: 8px 14px; border-radius: var(--radius-full); border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.08); text-decoration: none; transition: background .15s, border-color .15s; }
        .lp-footer-cta__contact-item:hover { background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.3); }

        /* ── POPUP ───────────────────────────────────────────────────── */
        .lp-popup-overlay { position: fixed; inset: 0; z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(6,14,36,.7); backdrop-filter: blur(8px); }
        .lp-popup { background: var(--white); border-radius: 24px; padding: 40px; max-width: 480px; width: 100%; position: relative; box-shadow: 0 40px 100px rgba(0,0,0,.3); border: 1px solid var(--slate-200); animation: popup-in .35s cubic-bezier(.34,1.56,.64,1); }
        @keyframes popup-in { from{opacity:0;transform:scale(.88) translateY(24px);} to{opacity:1;transform:scale(1) translateY(0);} }
        .lp-popup__close { position: absolute; top: 16px; right: 16px; width: 32px; height: 32px; border-radius: 50%; background: var(--slate-100); border: none; cursor: pointer; display: grid; place-items: center; color: var(--slate-600); transition: background .15s,transform .15s; }
        .lp-popup__close:hover { background: var(--slate-200); transform: rotate(90deg); }
        .lp-popup__badge { display: inline-block; background: var(--blue-50); color: var(--blue-700); font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; padding: 5px 12px; border-radius: var(--radius-full); border: 1px solid var(--blue-100); margin-bottom: 14px; }
        .lp-popup__title { font-size: 1.7rem; font-weight: 800; color: var(--slate-900); margin: 0 0 10px; letter-spacing: -.02em; }
        .lp-popup__sub { font-size: .9rem; color: var(--slate-600); line-height: 1.6; margin: 0 0 28px; }
        .lp-popup__form { display: flex; flex-direction: column; gap: 14px; }
        .lp-popup__actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
      `}</style>
    </>
  );
}
