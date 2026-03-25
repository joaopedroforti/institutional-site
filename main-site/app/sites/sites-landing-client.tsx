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
  Star,
  Clock,
  Shield,
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
const LANDING_PATH = "/lp-ofertasites";

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
  { title: "Design que Vende", desc: "Visual profissional que transmite autoridade e gera confiança no primeiro acesso.", icon: <Palette size={22} /> },
  { title: "100% Responsivo", desc: "Experiência perfeita em qualquer dispositivo — celular, tablet ou desktop.", icon: <Smartphone size={22} /> },
  { title: "Carregamento Rápido", desc: "Sites lentos perdem clientes. Seu site vai carregar em menos de 2 segundos.", icon: <Zap size={22} /> },
  { title: "Feito para Converter", desc: "CTAs estratégicos e jornada pensada para transformar visitantes em contatos.", icon: <TrendingUp size={22} /> },
  { title: "Visível no Google", desc: "Estrutura técnica de SEO para aparecer nas buscas e atrair clientes organicamente.", icon: <Search size={22} /> },
  { title: "Fácil de Atualizar", desc: "Você tem controle do conteúdo. Sem depender de terceiros para cada mudança.", icon: <Settings2 size={22} /> },
];

const SOLUTION_ITEMS = [
  { icon: <Globe size={20} />, title: "Sites institucionais", text: "Autoridade, clareza e presença digital sólida para empresas que querem ser levadas a sério." },
  { icon: <LayoutTemplate size={20} />, title: "Landing pages", text: "Páginas de alta conversão para campanhas, lançamentos e captação de leads qualificados." },
  { icon: <ShoppingCart size={20} />, title: "E-commerces", text: "Loja online estruturada para vender com credibilidade, performance e experiência de compra." },
  { icon: <Workflow size={20} />, title: "Sistemas web", text: "Projetos digitais sob medida para automatizar processos e escalar sua operação." },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Você solicita a proposta", desc: "Preencha o formulário em menos de 1 minuto." },
  { step: "02", title: "Entendemos seu projeto", desc: "Nossa equipe analisa e entra em contato rapidamente." },
  { step: "03", title: "Planejamos juntos", desc: "Definimos escopo, prazo, entregáveis e investimento." },
  { step: "04", title: "Desenvolvemos seu site", desc: "Execução com qualidade e alinhamento em cada etapa." },
  { step: "05", title: "Publicamos e você vende", desc: "Entrega, revisão final, lançamento e suporte pós-entrega." },
];

const TESTIMONIALS = [
  {
    name: "Carlos M.",
    role: "Diretor Comercial",
    company: "Grupo Nexo",
    text: "Em 3 semanas tínhamos o site no ar. O número de contatos pelo site triplicou no primeiro mês.",
    stars: 5,
  },
  {
    name: "Ana Paula R.",
    role: "Fundadora",
    company: "Studio AR",
    text: "Finalmente um site que representa o nível do nosso trabalho. O retorno foi imediato.",
    stars: 5,
  },
  {
    name: "Roberto S.",
    role: "CEO",
    company: "TechMove",
    text: "Processo transparente do início ao fim. A equipe entende de negócio, não só de design.",
    stars: 5,
  },
];

const STATS = [
  { value: "120+", label: "Projetos entregues" },
  { value: "97%", label: "Clientes satisfeitos" },
  { value: "3×", label: "Mais leads em média" },
  { value: "72h", label: "Primeiro contato" },
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

  useEffect(() => {
    void trackInteraction({ eventType: "lp_sites_viewed", element: "landing", label: LANDING_PATH, pagePath: LANDING_PATH, metadata: { lead_source: origin.leadSource, lead_score: initialScore, utm_source: origin.utm_source, utm_medium: origin.utm_medium, utm_campaign: origin.utm_campaign } }).catch(() => {});
  }, [initialScore, origin]);

  useEffect(() => {
    let isMounted = true;
    const loadGeneralSettings = async () => {
      try {
        const response = await apiFetch<{ data?: Partial<GeneralSettings> }>("/settings/general");
        if (!isMounted || !response?.data) return;
        setGeneralSettings((prev) => ({ ...prev, ...response.data }));
      } catch { /* Keep defaults */ }
    };
    void loadGeneralSettings();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!targets.length) return;
    const obs = new IntersectionObserver((entries) => { entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("is-visible"); }); }, { threshold: 0.08, rootMargin: "0px 0px -4% 0px" });
    targets.forEach((t) => obs.observe(t));
    return () => obs.disconnect();
  }, []);

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
    if (phone.replace(/\D/g, "").length < 10) { setMainStatus("error"); setMainFeedback("Informe um WhatsApp válido com DDD."); return; }
    const evt = await registerEvent("lp_sites_form_submitted", { force: true });
    try {
      await submitContact("lp_sites_main_proposal_form", "proposal_request_main", {
        name: mainForm.name.trim(),
        email: email || undefined,
        phone,
        message: "Solicitacao de proposta via landing /lp-ofertasites.",
        metadata: { lead_score: evt.nextScore, lead_score_breakdown: evt.nextBreakdown, timestamp: new Date().toISOString(), form_payload: { project_type: "site" } },
      });
      const params = new URLSearchParams({ project_type: "site", step: "siteObjective", name: mainForm.name.trim(), phone });
      if (email) params.set("email", email);
      window.location.href = `/onboarding?${params.toString()}`;
    } catch (err) { setMainStatus("error"); setMainFeedback(err instanceof Error ? err.message : "Não foi possível enviar agora. Tente novamente."); }
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
    if (!asEmail && asPhone.replace(/\D/g, "").length < 10) { setExitStatus("error"); setExitFeedback("Informe um WhatsApp válido com DDD."); return; }
    const evt = await registerEvent("lp_sites_exit_popup_form_submitted", { force: true });
    try {
      await submitContact("lp_sites_exit_capture_form", "proposal_request_exit_popup", { name, email: asEmail || undefined, phone: asPhone || undefined, message: "Lead capturado pelo popup de saída da landing /sites.", metadata: { lead_score: evt.nextScore, lead_score_breakdown: evt.nextBreakdown, timestamp: new Date().toISOString() } });
      setExitStatus("success");
      setExitFeedback("Recebemos! Nossa equipe vai entrar em contato com uma proposta personalizada.");
      setTimeout(() => setExitPopupOpen(false), 1800);
    } catch (err) { setExitStatus("error"); setExitFeedback(err instanceof Error ? err.message : "Falha ao enviar. Tente novamente."); }
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

          {mobileMenuOpen && (
            <div className="lp-header__mobile-nav">
              {NAV_LINKS.map((l) => (
                <button key={l.href} type="button" className="lp-header__mobile-link" onClick={() => navClick(l.href)}>
                  {l.label}
                </button>
              ))}
              <button
                type="button"
                className="lp-btn lp-btn--primary lp-btn--mobile-full"
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
                Seu site atual está<br />
                <em>te custando clientes.</em>
              </h1>
              <p className="lp-hero__sub">
                Criamos sites profissionais que <strong>geram contatos, transmitem confiança</strong> e representam o verdadeiro nível do seu negócio — com entrega em semanas, não meses.
              </p>
              <ul className="lp-hero__pills">
                {["Design moderno e responsivo", "Carregamento rápido", "SEO incluído", "Foco em conversão"].map((b) => (
                  <li key={b} className="lp-pill"><CheckCircle2 size={14} />{b}</li>
                ))}
              </ul>
              <div className="lp-hero__ctas">
                <button type="button" className="lp-btn lp-btn--primary lp-btn--lg" onClick={() => void ctaTo("lp_sites_cta_hero_primary_clicked", "proposal-form")}>
                  Quero minha proposta gratuita <ArrowRight size={16} />
                </button>
                <button type="button" className="lp-btn lp-btn--ghost-light" onClick={() => void ctaTo("lp_sites_cta_hero_secondary_clicked", "como-funciona")}>
                  Ver como funciona
                </button>
              </div>
              <p className="lp-hero__reassurance">
                <Shield size={13} /> Sem compromisso &nbsp;·&nbsp; <Clock size={13} /> Resposta em até 24h
              </p>
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
                    <span className="lp-tag__label">Resultado</span>
                    <span className="lp-tag__text">3× mais leads em média.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS BAR ───────────────────────────────────────────────────── */}
        <section className="lp-stats" data-reveal>
          <div className="lp-container">
            <div className="lp-stats__grid">
              {STATS.map((s) => (
                <div key={s.label} className="lp-stats__item">
                  <span className="lp-stats__value">{s.value}</span>
                  <span className="lp-stats__label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PROBLEMA ────────────────────────────────────────────────────── */}
        <section className="lp-problem" data-reveal>
          <div className="lp-container">
            <div className="lp-problem__inner">
              <div className="lp-problem__text">
                <p className="lp-eyebrow">Reconhece alguma dessas situações?</p>
                <h2 className="lp-h2">Seu site está trabalhando <em style={{ fontStyle: "normal", color: "var(--red-500)" }}>contra</em> você</h2>
                <p className="lp-body">Cada dia com um site ruim é um dia perdendo clientes para a concorrência. Visitantes chegam, não confiam no que veem, e vão embora sem entrar em contato.</p>
                <p className="lp-body" style={{ marginTop: 12 }}>Se você já ouviu alguém dizer que não encontrou seu site, ou que "o site não pareceu profissional", o problema está custando dinheiro real.</p>
              </div>
              <div className="lp-problem__cards">
                {[
                  "Site não aparece no Google",
                  "Visual desatualizado afasta clientes",
                  "Não gera contatos nem pedidos",
                  "Abre mal no celular",
                  "Não transmite confiança e profissionalismo",
                ].map((item) => (
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
              <h2 className="lp-h2">Tudo que seu site precisa para vender</h2>
              <p className="lp-body lp-body--center">Não entregamos só design bonito. Entregamos uma estrutura digital completa para performance, posicionamento e crescimento.</p>
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
                <p className="lp-body lp-body--light">Cada projeto nasce de uma conversa real sobre o seu negócio. Não usamos templates prontos — construímos do zero para o seu objetivo.</p>
                <div className="lp-solutions__ctaWrap">
                  <button type="button" className="lp-btn lp-btn--white lp-solutions__ctaBtn" onClick={() => void ctaTo("lp_sites_cta_solutions_clicked", "proposal-form")}>
                    Quero um site para o meu negócio <ArrowRight size={16} />
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

        {/* ── DEPOIMENTOS ─────────────────────────────────────────────────── */}
        <section className="lp-testimonials" data-reveal>
          <div className="lp-container">
            <div className="lp-section-header">
              <p className="lp-eyebrow">Depoimentos</p>
              <h2 className="lp-h2">O que nossos clientes dizem</h2>
            </div>
            <div className="lp-testimonials__grid">
              {TESTIMONIALS.map((t) => (
                <div key={t.name} className="lp-testimonial-card">
                  <div className="lp-testimonial-card__stars">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} size={14} fill="currentColor" />
                    ))}
                  </div>
                  <p className="lp-testimonial-card__text">"{t.text}"</p>
                  <div className="lp-testimonial-card__author">
                    <div className="lp-testimonial-card__avatar">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="lp-testimonial-card__name">{t.name}</p>
                      <p className="lp-testimonial-card__role">{t.role}, {t.company}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── POR QUE NÓS ─────────────────────────────────────────────────── */}
        <section className="lp-split" data-reveal>
          <div className="lp-container">
            <div className="lp-section-header lp-section-header--left">
              <p className="lp-eyebrow">Diferenciais</p>
              <h2 className="lp-h2">Por que trabalhar com a gente</h2>
              <p className="lp-body">Agências grandes te tratam como número. Freelancers somem na entrega. A gente é diferente.</p>
            </div>
            <ul className="lp-why__list">
              {[
                "Atendimento próximo e consultivo — você fala direto com quem executa.",
                "Entendemos o seu negócio antes de escrever uma linha de código.",
                "Foco total em resultado comercial, não apenas em visual bonito.",
                "Prazos cumpridos. Sem enrolação, sem sumiços.",
                "Estrutura preparada para crescer junto com a empresa.",
                "Comunicação clara, objetiva e sem jargão técnico.",
              ].map((item) => (
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
              <h2 className="lp-h2">Do zero ao ar em semanas</h2>
              <p className="lp-body lp-body--center">Processo transparente, sem surpresas. Você sabe o que acontece em cada etapa.</p>
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
              <button type="button" className="lp-btn lp-btn--primary lp-btn--lg" onClick={() => void ctaTo("lp_sites_cta_pre_form_clicked", "proposal-form")}>
                Quero começar agora <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* ── PRÉ-FORM BANNER ─────────────────────────────────────────────── */}
        <section className="lp-prebook" data-reveal>
          <div className="lp-container lp-prebook__inner">
            <div>
              <h2 className="lp-h2 lp-h2--light">Pronto para ter um site que trabalha por você?</h2>
              <p className="lp-body lp-body--light">Solicite uma proposta gratuita e receba um plano personalizado para o seu projeto em até 24 horas.</p>
            </div>
            <div className="lp-prebook__right">
              <div className="lp-prebook__tags">
                <span className="lp-prebook__tag">Sem compromisso</span>
                <span className="lp-prebook__tag">Resposta em 24h</span>
                <span className="lp-prebook__tag">Proposta personalizada</span>
              </div>
              <button
                type="button"
                className="lp-btn lp-btn--white lp-prebook__btn"
                onClick={() => void ctaTo("lp_sites_cta_pre_form_clicked", "proposal-form")}
              >
                Solicitar proposta gratuita <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* ── FORMULÁRIO ──────────────────────────────────────────────────── */}
        <section id="proposal-form" className="lp-form-section" data-reveal>
          <div className="lp-container">
            <div className="lp-form-wrap">
              <div className="lp-form-wrap__header">
                <p className="lp-eyebrow">Proposta gratuita</p>
                <h2 className="lp-h2">Vamos conversar sobre o seu projeto</h2>
                <p className="lp-body">Preencha abaixo e nossa equipe retorna em até 24h com um diagnóstico e direcionamento para o seu site.</p>
                <div className="lp-form-trust">
                  <span className="lp-form-trust__item"><Shield size={13} /> Sem spam</span>
                  <span className="lp-form-trust__item"><Clock size={13} /> Resposta em até 24h</span>
                  <span className="lp-form-trust__item"><CheckCircle2 size={13} /> Sem compromisso</span>
                </div>
              </div>
              <form onSubmit={handleMainSubmit} className="lp-form" noValidate>
                <div className="lp-form__row">
                  <label className="lp-field">
                    <span className="lp-field__label">Seu nome</span>
                    <input required value={mainForm.name} onFocus={() => handleMainFieldFocus("name")} onChange={(e) => setMainForm((p) => ({ ...p, name: e.target.value }))} className="lp-field__input" placeholder="Como podemos te chamar?" />
                  </label>
                  <label className="lp-field">
                    <span className="lp-field__label">WhatsApp <span className="lp-field__required">*</span></span>
                    <input required value={mainForm.whatsapp} onFocus={() => handleMainFieldFocus("whatsapp")} onChange={(e) => setMainForm((p) => ({ ...p, whatsapp: formatWhatsapp(e.target.value) }))} className="lp-field__input" placeholder="(00) 00000-0000" />
                  </label>
                </div>
                <label className="lp-field">
                  <span className="lp-field__label">E-mail <span className="lp-field__optional">(opcional)</span></span>
                  <input type="email" value={mainForm.email} onFocus={() => handleMainFieldFocus("email")} onChange={(e) => setMainForm((p) => ({ ...p, email: e.target.value }))} className="lp-field__input" placeholder="seu@email.com" />
                </label>
                {mainStatus === "error" && <p className="lp-form__feedback lp-form__feedback--error">{mainFeedback}</p>}
                <div className="lp-form__footer">
                  <button type="submit" disabled={mainStatus === "loading"} className="lp-btn lp-btn--primary lp-btn--lg lp-btn--submit-full">
                    {mainStatus === "loading" ? "Enviando..." : "Quero minha proposta gratuita"}
                    {mainStatus !== "loading" && <ArrowRight size={16} />}
                  </button>
                  <p className="lp-form__note">
                    <Shield size={12} /> Seus dados são 100% seguros e não serão compartilhados.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* ── FOOTER CTA ──────────────────────────────────────────────────── */}
        <section className="lp-footer-cta" data-reveal>
          <div className="lp-container lp-footer-cta__inner">
            <div className="lp-footer-cta__content">
              <h2 className="lp-h2 lp-h2--light">Seu negócio merece uma presença digital à altura.</h2>
              <p className="lp-body lp-body--light">Site profissional, moderno e estratégico — para vender mais e ser lembrado.</p>
              <div className="lp-footer-cta__contacts">
                {generalSettings.contact_phone && (
                  <a href={`tel:${onlyDigits(generalSettings.contact_phone)}`} className="lp-footer-cta__contact-item">
                    <Phone size={14} />
                    {generalSettings.contact_phone}
                  </a>
                )}
                {generalSettings.contact_whatsapp && (
                  <a href={generalSettings.contact_whatsapp_url || `https://wa.me/55${onlyDigits(generalSettings.contact_whatsapp)}`} className="lp-footer-cta__contact-item" target="_blank" rel="noreferrer">
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
            <button type="button" className="lp-btn lp-btn--white lp-footer-cta__btn" onClick={() => void ctaTo("lp_sites_footer_cta_clicked", "proposal-form")}>
              Solicitar Proposta Gratuita <ArrowRight size={16} />
            </button>
          </div>
        </section>

        {/* ── EXIT POPUP ──────────────────────────────────────────────────── */}
        {exitPopupOpen && (
          <div className="lp-popup-overlay" role="dialog" aria-modal="true">
            <div className="lp-popup">
              <button type="button" className="lp-popup__close" onClick={() => setExitPopupOpen(false)} aria-label="Fechar"><X size={18} /></button>
              <div className="lp-popup__badge">Espera um segundo</div>
              <h3 className="lp-popup__title">Não perca essa oportunidade.</h3>
              <p className="lp-popup__sub">Deixa seus dados e nossa equipe monta uma proposta personalizada para o seu projeto — sem custo e sem compromisso.</p>
              <form className="lp-popup__form" onSubmit={handleExitSubmit}>
                <label className="lp-field">
                  <span className="lp-field__label">Nome</span>
                  <input value={exitForm.name} onFocus={handleExitStart} onChange={(e) => setExitForm((p) => ({ ...p, name: e.target.value }))} className="lp-field__input" required placeholder="Seu nome" />
                </label>
                <label className="lp-field">
                  <span className="lp-field__label">WhatsApp ou e-mail</span>
                  <input value={exitForm.contact} onFocus={handleExitStart} onChange={(e) => setExitForm((p) => ({ ...p, contact: e.target.value }))} className="lp-field__input" required placeholder="(00) 00000-0000 ou email@..." />
                </label>
                {exitStatus === "error" && <p className="lp-form__feedback lp-form__feedback--error">{exitFeedback}</p>}
                {exitStatus === "success" && <p className="lp-form__feedback lp-form__feedback--success">{exitFeedback}</p>}
                <div className="lp-popup__actions">
                  <button type="submit" disabled={exitStatus === "loading"} className="lp-btn lp-btn--primary lp-btn--popup-full">
                    {exitStatus === "loading" ? "Enviando..." : "Quero receber uma proposta"}
                    {exitStatus !== "loading" && <ArrowRight size={15} />}
                  </button>
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
