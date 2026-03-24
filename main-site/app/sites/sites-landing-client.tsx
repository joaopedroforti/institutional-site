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
  MapPin,
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
  contact_address: string;
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
  contact_address: "",
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

                {generalSettings.contact_address && (
                  <span className="lp-footer-cta__contact-item">
                    <MapPin size={14} />
                    {generalSettings.contact_address}
                  </span>
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

    </>
  );
}
