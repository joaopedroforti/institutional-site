"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Cpu,
  FileCheck2,
  Globe,
  MessageSquareText,
  Sparkles,
  Workflow,
} from "lucide-react";
import SiteShell from "../components/site-shell";
import { ApiError, apiFetch } from "../lib/api";
import { getPageLabel, getStoredVisitorSessionKey, trackInteraction } from "../lib/analytics";
import styles from "./onboarding.module.css";

type ProjectType = "site" | "sistema" | "automacao";
type StepId =
  | "projectType"
  | "siteObjective"
  | "sitePages"
  | "siteDeadline"
  | "siteVisual"
  | "siteAssets"
  | "siteReferences"
  | "siteNotes"
  | "systemType"
  | "systemAiNeed"
  | "systemFeatures"
  | "systemIntegrationNeed"
  | "systemAssets"
  | "automationType"
  | "automationDescription"
  | "contact";

type ScreenId = "intro" | StepId;

type ContactData = {
  name: string;
  company: string;
  email: string;
  phone: string;
  segment: string;
};

type AnswersState = {
  siteObjective: string;
  sitePages: string[];
  siteDeadline: string;
  siteVisual: string;
  siteAssets: string[];
  siteReferences: string;
  siteNotes: string;
  systemType: string;
  systemAiNeed: string;
  systemFeatures: string;
  systemIntegrationNeed: string;
  systemIntegrationDetails: string;
  systemAssets: string[];
  automationType: string;
  automationDescription: string;
};

type Option = {
  value: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
};

type ProgressResponse = {
  saved: boolean;
  identified: boolean;
};

const FLOW_STEPS: Record<ProjectType, StepId[]> = {
  site: [
    "projectType",
    "siteObjective",
    "sitePages",
    "siteDeadline",
    "siteVisual",
    "siteAssets",
    "siteReferences",
    "siteNotes",
    "contact",
  ],
  sistema: [
    "projectType",
    "systemType",
    "systemAiNeed",
    "systemFeatures",
    "systemIntegrationNeed",
    "systemAssets",
    "contact",
  ],
  automacao: ["projectType", "automationType", "automationDescription", "contact"],
};

const INITIAL_ANSWERS: AnswersState = {
  siteObjective: "",
  sitePages: [],
  siteDeadline: "",
  siteVisual: "",
  siteAssets: [],
  siteReferences: "",
  siteNotes: "",
  systemType: "",
  systemAiNeed: "",
  systemFeatures: "",
  systemIntegrationNeed: "",
  systemIntegrationDetails: "",
  systemAssets: [],
  automationType: "",
  automationDescription: "",
};

const INTRO_CARDS = [
  {
    title: "Leva cerca de 2 minutos",
    text: "Sem burocracia e com navegação simples.",
    icon: <CircleDashed size={16} />,
  },
  {
    title: "Perguntas que ajudam de verdade",
    text: "Só o que importa para começar o site certo.",
    icon: <FileCheck2 size={16} />,
  },
  {
    title: "Contato no final",
    text: "Primeiro você responde, depois deixa seus dados.",
    icon: <MessageSquareText size={16} />,
  },
];

const RIGHT_RAIL_CARDS = [
  {
    title: "Objetivo",
    text: "Entendemos o que o projeto precisa gerar para sua empresa.",
  },
  {
    title: "Estrutura",
    text: "Mapeamos páginas, conteúdo e prioridades do projeto.",
  },
  {
    title: "Contexto",
    text: "Captamos referências, materiais e urgência.",
  },
  {
    title: "O que vamos captar",
    text: "Objetivo principal, estrutura, prazo, referências e materiais disponíveis.",
  },
];

const PROJECT_TYPE_OPTIONS: Option[] = [
  {
    value: "site",
    title: "Site",
    description: "Preciso de um site para meu projeto.",
    icon: <Globe size={18} />,
  },
  {
    value: "sistema",
    title: "Sistema",
    description: "Preciso de um sistema para meu projeto.",
    icon: <Cpu size={18} />,
  },
  {
    value: "automacao",
    title: "Automação",
    description: "Preciso de uma automação para meu processo ou operação.",
    icon: <Workflow size={18} />,
  },
];

const SITE_OBJECTIVE_OPTIONS: Option[] = [
  { value: "apresentar", title: "Apresentar minha empresa", description: "Presença profissional e credibilidade." },
  { value: "leads", title: "Gerar leads", description: "Receber contatos e pedidos de orçamento." },
  { value: "vender", title: "Vender online", description: "Levar o visitante para compra ou pedido." },
  { value: "portfolio", title: "Mostrar portfólio", description: "Exibir cases, projetos ou trabalhos." },
  { value: "agendamento", title: "Receber agendamentos", description: "Facilitar marcações e solicitações." },
];

const SITE_PAGE_OPTIONS = [
  "Home",
  "Sobre",
  "Serviços",
  "Portfólio ou Cases",
  "Depoimentos",
  "Blog ou Conteúdo",
  "FAQ",
  "Contato",
];

const SITE_DEADLINE_OPTIONS: Option[] = [
  { value: "urgente", title: "Urgente", description: "Preciso começar o quanto antes." },
  { value: "mes", title: "Ainda este mês", description: "Quero publicar nas próximas semanas." },
  { value: "30-60", title: "Entre 30 e 60 dias", description: "Tenho uma janela mais confortável." },
  { value: "sem-pressa", title: "Sem pressa", description: "Quero planejar bem antes de lançar." },
];

const SITE_VISUAL_OPTIONS: Option[] = [
  { value: "minimalista", title: "Moderna e minimalista", description: "Visual limpo e direto." },
  { value: "premium", title: "Sofisticada e premium", description: "Visual refinado e elegante." },
  { value: "comercial", title: "Direta e comercial", description: "Foco em conversão e resultado." },
  { value: "criativa", title: "Criativa e marcante", description: "Visual forte e memorável." },
];

const SITE_ASSETS_OPTIONS = ["Logo", "Identidade visual", "Textos", "Fotos", "Vídeos", "Sites de referência", "Ainda não tenho nada"];

const SYSTEM_TYPE_OPTIONS: Option[] = [
  { value: "web", title: "Sistema Web", description: "Acessa de qualquer dispositivo e de qualquer local." },
  { value: "local", title: "Sistema local", description: "Roda apenas em seu computador." },
];

const SYSTEM_AI_OPTIONS: Option[] = [
  { value: "sim", title: "Preciso", description: "Quero IA no sistema." },
  { value: "nao", title: "Não preciso", description: "Sem uso de IA por enquanto." },
  { value: "talvez", title: "Não tenho certeza", description: "Quero avaliar durante o projeto." },
];

const SYSTEM_INTEGRATION_OPTIONS: Option[] = [
  { value: "sim", title: "Sim", description: "Preciso integrar com outro sistema." },
  { value: "nao", title: "Não", description: "Não preciso de integração agora." },
];

const SYSTEM_ASSETS_OPTIONS = ["Logo", "Identidade visual", "Conteúdo das páginas", "Fotos", "Vídeos", "Sistemas de referência", "Ainda não tenho nada"];

const AUTOMATION_TYPE_OPTIONS: Option[] = [
  { value: "sistema-sistema", title: "Sistema x Sistema", description: "Sincronizar ferramentas internas." },
  { value: "whatsapp", title: "WhatsApp", description: "Automatizar fluxos de conversa." },
  { value: "webhooks", title: "Webhooks", description: "Integrar eventos entre plataformas." },
  { value: "outro", title: "Outro tipo", description: "Tenho outra automação em mente." },
];

const SEGMENT_SUGGESTIONS = [
  "Tecnologia",
  "Saúde",
  "Jurídico",
  "Educação",
  "Imobiliário",
  "Varejo",
  "Indústria",
  "Serviços",
  "Consultoria",
];

const STEP_META: Record<ScreenId, { title: string; subtitle: string }> = {
  intro: {
    title: "Vamos transformar sua ideia em uma solução clara desde o início.",
    subtitle:
      "Responda o essencial, sem formulário cansativo. Usamos esse briefing para entender objetivo, estrutura, prazo e identidade do seu projeto.",
  },
  projectType: {
    title: "Qual a finalidade do seu projeto?",
    subtitle: "Selecione uma opção para iniciar o fluxo ideal.",
  },
  siteObjective: {
    title: "Qual é o principal objetivo do seu site?",
    subtitle: "Escolha a opção que melhor representa o que você precisa agora.",
  },
  sitePages: {
    title: "Quais páginas você imagina no seu site?",
    subtitle: "Pode marcar mais de uma para montarmos a estrutura ideal.",
  },
  siteDeadline: {
    title: "Quando você gostaria de colocar o site no ar?",
    subtitle: "Isso ajuda a gente a entender urgência e prioridade do projeto.",
  },
  siteVisual: {
    title: "Qual direção visual combina mais com sua marca?",
    subtitle: "Escolha a estética que mais se aproxima do que você imagina.",
  },
  siteAssets: {
    title: "O que você já tem pronto para o projeto?",
    subtitle: "Marque tudo o que já existe para acelerar a criação.",
  },
  siteReferences: {
    title: "Tem referências, concorrentes ou links que você gosta?",
    subtitle: "Opcional. Pode colar exemplos que ajudem a traduzir o estilo desejado.",
  },
  siteNotes: {
    title: "Tem algo importante que precisamos saber?",
    subtitle: "Opcional. Use esse espaço para contexto extra, diferenciais ou expectativas.",
  },
  systemType: {
    title: "Qual tipo de sistema você precisa?",
    subtitle: "Selecione a opção que descreve melhor o seu cenário.",
  },
  systemAiNeed: {
    title: "Você precisa de inteligência artificial no sistema?",
    subtitle: "Essa decisão impacta arquitetura e escopo do projeto.",
  },
  systemFeatures: {
    title: "Quais funcionalidades você espera no seu sistema?",
    subtitle: "Descreva o que ele precisa fazer no dia a dia.",
  },
  systemIntegrationNeed: {
    title: "Seu sistema precisa integrar com outro sistema?",
    subtitle: "Se sim, descreva qual integração você precisa.",
  },
  systemAssets: {
    title: "O que você já tem pronto para o projeto?",
    subtitle: "Marque tudo o que já existe para acelerar a criação.",
  },
  automationType: {
    title: "Qual tipo de automação você precisa?",
    subtitle: "Selecione a opção mais próxima do seu objetivo.",
  },
  automationDescription: {
    title: "Descreva resumidamente o que você gostaria de automatizar.",
    subtitle: "Conte o fluxo atual e o resultado esperado da automação.",
  },
  contact: {
    title: "",
    subtitle: "",
  },
};

function limit500(value: string): string {
  return value.slice(0, 500);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10;
}

function toggleInArray(list: string[], value: string): string[] {
  if (list.includes(value)) {
    return list.filter((item) => item !== value);
  }

  return [...list, value];
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState<ScreenId>("intro");
  const [projectType, setProjectType] = useState<ProjectType | null>(null);
  const [answers, setAnswers] = useState<AnswersState>(INITIAL_ANSWERS);
  const [contact, setContact] = useState<ContactData>({
    name: "",
    company: "",
    email: "",
    phone: "",
    segment: "",
  });

  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [identifiedByTracking, setIdentifiedByTracking] = useState<boolean | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [leadIdParam, setLeadIdParam] = useState<number | null>(null);

  const activeFlow = useMemo<StepId[]>(() => {
    if (projectType) {
      return FLOW_STEPS[projectType];
    }

    return ["projectType"];
  }, [projectType]);

  const flowSequence = useMemo<ScreenId[]>(() => ["intro", ...activeFlow], [activeFlow]);

  const currentPosition = useMemo(() => {
    const index = flowSequence.indexOf(currentStep);
    return index >= 0 ? index : 0;
  }, [currentStep, flowSequence]);

  const totalSteps = Math.max(1, flowSequence.length - 1);
  const progress = currentStep === "intro" ? 0 : Math.min(100, Math.round((currentPosition / totalSteps) * 100));

  const persistProgress = useCallback(
    async (nextStep: ScreenId, forcedType?: ProjectType | null) => {
      if (!sessionKey || identifiedByTracking === false || nextStep === "intro") {
        return;
      }

      const resolvedType = forcedType ?? projectType;
      if (!resolvedType) {
        return;
      }

      setSavingDraft(true);
      try {
        const response = await apiFetch<ProgressResponse>("/onboarding/progress", {
          method: "POST",
          body: JSON.stringify({
            session_key: sessionKey,
            step: nextStep,
            project_type: resolvedType,
            answers,
          }),
        });

        setIdentifiedByTracking(response.identified);
      } catch {
        // nao bloqueia fluxo
      } finally {
        setSavingDraft(false);
      }
    },
    [answers, identifiedByTracking, projectType, sessionKey],
  );

  useEffect(() => {
    setSessionKey(getStoredVisitorSessionKey());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const leadId = params.get("lead_id");
    const parsedLeadId = leadId ? Number(leadId) : null;
    setLeadIdParam(parsedLeadId && !Number.isNaN(parsedLeadId) ? parsedLeadId : null);

    setContact((prev) => ({
      ...prev,
      name: params.get("name") ?? prev.name,
      company: params.get("company") ?? prev.company,
      email: params.get("email") ?? prev.email,
      phone: params.get("phone") ?? prev.phone,
    }));

    const projectTypeParam = params.get("project_type");
    if (projectTypeParam === "site" || projectTypeParam === "sistema" || projectTypeParam === "automacao") {
      const forcedType = projectTypeParam as ProjectType;
      setProjectType(forcedType);

      const forcedStep = params.get("step");
      if (forcedStep && FLOW_STEPS[forcedType].includes(forcedStep as StepId)) {
        setCurrentStep(forcedStep as ScreenId);
      }
    }
  }, []);

  const goToStep = useCallback(
    (step: ScreenId, typeOverride?: ProjectType | null) => {
      setCurrentStep(step);
      void persistProgress(step, typeOverride);
    },
    [persistProgress],
  );

  const goBack = () => {
    if (currentStep === "intro") {
      return;
    }

    if (currentStep === "projectType") {
      setCurrentStep("intro");
      return;
    }

    const index = activeFlow.indexOf(currentStep as StepId);
    if (index <= 0) {
      setCurrentStep("projectType");
      return;
    }

    setCurrentStep(activeFlow[index - 1]);
  };

  const goForward = () => {
    if (currentStep === "intro") {
      goToStep("projectType", projectType);
      return;
    }

    if (currentStep === "projectType") {
      if (!projectType) {
        setError("Selecione a finalidade do projeto para continuar.");
        return;
      }

      goToStep(FLOW_STEPS[projectType][1], projectType);
      return;
    }

    const index = activeFlow.indexOf(currentStep as StepId);
    if (index < 0) {
      return;
    }

    const next = activeFlow[index + 1];
    if (next) {
      goToStep(next);
    }
  };

  const handleProjectTypeSelect = (value: ProjectType) => {
    setError(null);
    setProjectType(value);
    goToStep(FLOW_STEPS[value][1], value);
  };

  const handleSingleSelect = (field: keyof AnswersState, value: string) => {
    setError(null);
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const handleContinue = () => {
    setError(null);

    if (currentStep === "projectType" && !projectType) {
      setError("Selecione a finalidade do projeto.");
      return;
    }

    if (currentStep === "siteObjective" && !answers.siteObjective) {
      setError("Selecione o objetivo principal.");
      return;
    }

    if (currentStep === "sitePages" && answers.sitePages.length === 0) {
      setError("Selecione pelo menos uma página.");
      return;
    }

    if (currentStep === "siteDeadline" && !answers.siteDeadline) {
      setError("Selecione o prazo estimado.");
      return;
    }

    if (currentStep === "siteVisual" && !answers.siteVisual) {
      setError("Selecione a direção visual.");
      return;
    }

    if (currentStep === "siteAssets" && answers.siteAssets.length === 0) {
      setError("Selecione ao menos um item.");
      return;
    }

    if (currentStep === "systemType" && !answers.systemType) {
      setError("Selecione o tipo de sistema.");
      return;
    }

    if (currentStep === "systemAiNeed" && !answers.systemAiNeed) {
      setError("Selecione uma opção para IA.");
      return;
    }

    if (currentStep === "systemFeatures" && !answers.systemFeatures.trim()) {
      setError("Descreva as funcionalidades esperadas.");
      return;
    }

    if (currentStep === "systemIntegrationNeed") {
      if (!answers.systemIntegrationNeed) {
        setError("Informe se precisa de integração.");
        return;
      }

      if (answers.systemIntegrationNeed === "sim" && !answers.systemIntegrationDetails.trim()) {
        setError("Descreva qual sistema deseja integrar.");
        return;
      }
    }

    if (currentStep === "systemAssets" && answers.systemAssets.length === 0) {
      setError("Selecione ao menos um item.");
      return;
    }

    if (currentStep === "automationType" && !answers.automationType) {
      setError("Selecione o tipo de automação.");
      return;
    }

    if (currentStep === "automationDescription" && !answers.automationDescription.trim()) {
      setError("Descreva o que deseja automatizar.");
      return;
    }

    goForward();
  };

  const submitBriefing = async () => {
    if (!projectType) {
      setError("Selecione o tipo de projeto.");
      return;
    }

    if (!contact.name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }

    if (!contact.email.trim() || !isValidEmail(contact.email.trim())) {
      setError("Informe um e-mail válido.");
      return;
    }

    if (!contact.phone.trim() || !isValidPhone(contact.phone.trim())) {
      setError("Informe um WhatsApp válido.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiFetch("/onboarding/submit", {
        method: "POST",
        body: JSON.stringify({
          lead_id: leadIdParam,
          session_key: sessionKey,
          project_type: projectType,
          answers,
          contact,
          source_url: typeof window !== "undefined" ? window.location.href : null,
          referrer: typeof document !== "undefined" ? document.referrer || null : null,
        }),
      });

      await trackInteraction({
        eventType: "onboarding_form_submit",
        element: "form",
        label: projectType,
        pagePath: "/onboarding",
        metadata: {
          event_name: "Enviou formulario onboarding",
          where: getPageLabel("/onboarding"),
        },
      });

      setSubmitted(true);
      setFeedback("Briefing enviado com sucesso. Nosso time vai continuar com você pelos contatos informados.");
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Não foi possível enviar o briefing agora.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderOptionGrid = (
    options: Option[],
    selectedValue: string,
    onSelect: (value: string) => void,
    columnsClassName = styles.options,
  ) => {
    return (
      <div className={columnsClassName}>
        {options.map((option) => {
          const active = selectedValue === option.value;

          return (
            <button
              key={option.value}
              type="button"
              className={`${styles.optionCard} ${active ? styles.optionCardActive : ""}`}
              onClick={() => onSelect(option.value)}
            >
              <span className={styles.optionTop}>
                {option.icon ? <span className={styles.optionIcon}>{option.icon}</span> : null}
                <span className={styles.optionLabel}>{option.title}</span>
              </span>
              <span className={styles.optionHelp}>{option.description}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderContent = () => {
    if (submitted) {
      return (
        <div className={styles.successWrap}>
          <CheckCircle2 size={34} className={styles.successIcon} />
          <h2>Briefing enviado</h2>
          <p>{feedback}</p>
          <div className={styles.successActions}>
            <Link href="/contato" className={styles.buttonPrimary}>
              Falar com o time
            </Link>
            <Link href="/" className={styles.buttonGhost}>
              Voltar para home
            </Link>
          </div>
        </div>
      );
    }

    if (currentStep === "intro") {
      return (
        <div className={styles.content}>
          <div className={styles.introCards}>
            {INTRO_CARDS.map((card) => (
              <article key={card.title} className={styles.introCard}>
                <span className={styles.introIcon}>{card.icon}</span>
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </div>
              </article>
            ))}
          </div>

          <div className={styles.actionsRight}>
            <button type="button" className={styles.buttonPrimary} onClick={() => goForward()}>
              Começar Onboarding <ArrowRight size={16} />
            </button>
          </div>
        </div>
      );
    }

    if (currentStep === "projectType") {
      return renderOptionGrid(PROJECT_TYPE_OPTIONS, projectType ?? "", (value) => handleProjectTypeSelect(value as ProjectType));
    }

    if (currentStep === "siteObjective") {
      return renderOptionGrid(SITE_OBJECTIVE_OPTIONS, answers.siteObjective, (value) => handleSingleSelect("siteObjective", value));
    }

    if (currentStep === "sitePages") {
      return (
        <div className={styles.content}>
          <div className={styles.options}>
            {SITE_PAGE_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                className={`${styles.optionCard} ${answers.sitePages.includes(value) ? styles.optionCardActive : ""}`}
                onClick={() => setAnswers((prev) => ({ ...prev, sitePages: toggleInArray(prev.sitePages, value) }))}
              >
                <span className={styles.optionLabel}>{value}</span>
              </button>
            ))}
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.buttonGhost} onClick={goBack}>
              <ArrowLeft size={16} /> Voltar
            </button>
            <button type="button" className={styles.buttonPrimary} onClick={handleContinue}>
              Continuar <ArrowRight size={16} />
            </button>
          </div>
        </div>
      );
    }

    if (currentStep === "siteDeadline") {
      return renderOptionGrid(SITE_DEADLINE_OPTIONS, answers.siteDeadline, (value) => handleSingleSelect("siteDeadline", value));
    }

    if (currentStep === "siteVisual") {
      return renderOptionGrid(SITE_VISUAL_OPTIONS, answers.siteVisual, (value) => handleSingleSelect("siteVisual", value));
    }

    if (currentStep === "siteAssets") {
      return (
        <div className={styles.content}>
          <div className={styles.options}>
            {SITE_ASSETS_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                className={`${styles.optionCard} ${answers.siteAssets.includes(value) ? styles.optionCardActive : ""}`}
                onClick={() => setAnswers((prev) => ({ ...prev, siteAssets: toggleInArray(prev.siteAssets, value) }))}
              >
                <span className={styles.optionLabel}>{value}</span>
              </button>
            ))}
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.buttonGhost} onClick={goBack}>
              <ArrowLeft size={16} /> Voltar
            </button>
            <button type="button" className={styles.buttonPrimary} onClick={handleContinue}>
              Continuar <ArrowRight size={16} />
            </button>
          </div>
        </div>
      );
    }

    if (currentStep === "siteReferences") {
      return (
        <div className={styles.content}>
          <textarea
            value={answers.siteReferences}
            onChange={(event) => setAnswers((prev) => ({ ...prev, siteReferences: limit500(event.target.value) }))}
            className={styles.textarea}
            maxLength={500}
            placeholder="Ex.: gosto do site da empresa X, quero algo limpo e direto, meus concorrentes são..."
          />
          <p className={styles.counter}>{answers.siteReferences.length}/500</p>
          <div className={styles.actions}>
            <button type="button" className={styles.buttonGhost} onClick={goBack}>
              <ArrowLeft size={16} /> Voltar
            </button>
            <button type="button" className={styles.buttonPrimary} onClick={handleContinue}>
              Continuar <ArrowRight size={16} />
            </button>
          </div>
        </div>
      );
    }

    if (currentStep === "siteNotes") {
      return (
        <div className={styles.content}>
          <textarea
            value={answers.siteNotes}
            onChange={(event) => setAnswers((prev) => ({ ...prev, siteNotes: limit500(event.target.value) }))}
            className={styles.textarea}
            maxLength={500}
            placeholder="Ex.: quero integrar WhatsApp, destacar um serviço específico, reforçar autoridade da marca..."
          />
          <p className={styles.counter}>{answers.siteNotes.length}/500</p>
          <div className={styles.actions}>
            <button type="button" className={styles.buttonGhost} onClick={goBack}>
              <ArrowLeft size={16} /> Voltar
            </button>
            <button type="button" className={styles.buttonPrimary} onClick={handleContinue}>
              Continuar <ArrowRight size={16} />
            </button>
          </div>
        </div>
      );
    }

    if (currentStep === "systemType") {
      return renderOptionGrid(SYSTEM_TYPE_OPTIONS, answers.systemType, (value) => handleSingleSelect("systemType", value));
    }

    if (currentStep === "systemAiNeed") {
      return renderOptionGrid(SYSTEM_AI_OPTIONS, answers.systemAiNeed, (value) => handleSingleSelect("systemAiNeed", value));
    }

    if (currentStep === "systemFeatures") {
      return (
        <div className={styles.content}>
          <textarea
            value={answers.systemFeatures}
            onChange={(event) => setAnswers((prev) => ({ ...prev, systemFeatures: limit500(event.target.value) }))}
            className={styles.textarea}
            maxLength={500}
            placeholder="Descreva as funcionalidades principais do seu sistema..."
          />
          <p className={styles.counter}>{answers.systemFeatures.length}/500</p>
          <div className={styles.actions}>
            <button type="button" className={styles.buttonGhost} onClick={goBack}>
              <ArrowLeft size={16} /> Voltar
            </button>
            <button type="button" className={styles.buttonPrimary} onClick={handleContinue}>
              Continuar <ArrowRight size={16} />
            </button>
          </div>
        </div>
      );
    }

    if (currentStep === "systemIntegrationNeed") {
      return (
        <div className={styles.content}>
          {renderOptionGrid(SYSTEM_INTEGRATION_OPTIONS, answers.systemIntegrationNeed, (value) =>
            handleSingleSelect("systemIntegrationNeed", value),
          )}

          {answers.systemIntegrationNeed === "sim" && (
            <>
              <textarea
                value={answers.systemIntegrationDetails}
                onChange={(event) =>
                  setAnswers((prev) => ({ ...prev, systemIntegrationDetails: limit500(event.target.value) }))
                }
                className={styles.textarea}
                maxLength={500}
                placeholder="Qual sistema e qual funcionalidade deseja integrar?"
              />
              <p className={styles.counter}>{answers.systemIntegrationDetails.length}/500</p>
            </>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.buttonGhost} onClick={goBack}>
              <ArrowLeft size={16} /> Voltar
            </button>
            <button type="button" className={styles.buttonPrimary} onClick={handleContinue}>
              Continuar <ArrowRight size={16} />
            </button>
          </div>
        </div>
      );
    }

    if (currentStep === "systemAssets") {
      return (
        <div className={styles.content}>
          <div className={styles.options}>
            {SYSTEM_ASSETS_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                className={`${styles.optionCard} ${answers.systemAssets.includes(value) ? styles.optionCardActive : ""}`}
                onClick={() => setAnswers((prev) => ({ ...prev, systemAssets: toggleInArray(prev.systemAssets, value) }))}
              >
                <span className={styles.optionLabel}>{value}</span>
              </button>
            ))}
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.buttonGhost} onClick={goBack}>
              <ArrowLeft size={16} /> Voltar
            </button>
            <button type="button" className={styles.buttonPrimary} onClick={handleContinue}>
              Continuar <ArrowRight size={16} />
            </button>
          </div>
        </div>
      );
    }

    if (currentStep === "automationType") {
      return renderOptionGrid(AUTOMATION_TYPE_OPTIONS, answers.automationType, (value) => handleSingleSelect("automationType", value));
    }

    if (currentStep === "automationDescription") {
      return (
        <div className={styles.content}>
          <textarea
            value={answers.automationDescription}
            onChange={(event) =>
              setAnswers((prev) => ({ ...prev, automationDescription: limit500(event.target.value) }))
            }
            className={styles.textarea}
            maxLength={500}
            placeholder="Descreva o processo atual e o que você quer automatizar..."
          />
          <p className={styles.counter}>{answers.automationDescription.length}/500</p>
          <div className={styles.actions}>
            <button type="button" className={styles.buttonGhost} onClick={goBack}>
              <ArrowLeft size={16} /> Voltar
            </button>
            <button type="button" className={styles.buttonPrimary} onClick={handleContinue}>
              Continuar <ArrowRight size={16} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.content}>
        <div className={styles.inputs}>
          <label>
            Nome *
            <input
              className={styles.input}
              value={contact.name}
              onChange={(event) => setContact((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Seu nome"
            />
          </label>

          <label>
            Empresa ou marca
            <input
              className={styles.input}
              value={contact.company}
              onChange={(event) => setContact((prev) => ({ ...prev, company: event.target.value }))}
              placeholder="Nome da empresa"
            />
          </label>

          <label>
            Email *
            <input
              type="email"
              className={styles.input}
              value={contact.email}
              onChange={(event) => setContact((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="voce@empresa.com"
            />
          </label>

          <label>
            WhatsApp *
            <input
              className={styles.input}
              value={contact.phone}
              onChange={(event) => setContact((prev) => ({ ...prev, phone: event.target.value }))}
              placeholder="(DDD) 99999-9999"
            />
          </label>

          <label className={styles.fullWidth}>
            Segmento
            <input
              list="segment-suggestions"
              className={styles.input}
              value={contact.segment}
              onChange={(event) => setContact((prev) => ({ ...prev, segment: event.target.value }))}
              placeholder="Ex.: Tecnologia, Saúde, Serviços..."
            />
            <datalist id="segment-suggestions">
              {SEGMENT_SUGGESTIONS.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.buttonGhost} onClick={goBack}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <button type="button" className={styles.buttonPrimary} onClick={submitBriefing} disabled={submitting}>
            {submitting ? "Enviando..." : "Enviar briefing"}
            {!submitting && <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    );
  };

  const title = STEP_META[currentStep].title;
  const subtitle = STEP_META[currentStep].subtitle;

  return (
    <SiteShell>
      <section className={styles.wrapper}>
        <div className={styles.layout}>
          <article className={styles.mainCard} data-reveal>
            <div className={styles.progressWrap}>
              <div className={styles.progressMeta}>
                <span>
                  Etapa {Math.max(0, currentPosition)}/{totalSteps}
                </span>
                <span>{progress}%</span>
              </div>
              <div className={styles.progressBar}>
                <span className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
              {(savingDraft || submitting) && (
                <p className={styles.loadingText}>{savingDraft ? "Salvando progresso..." : "Enviando briefing..."}</p>
              )}
            </div>

            {(title || subtitle) && (
              <header className={styles.head}>
                <h1 className={styles.title}>{title}</h1>
                <p className={styles.subtitle}>{subtitle}</p>
              </header>
            )}

            {renderContent()}

            {!submitted && currentStep !== "intro" && currentStep !== "contact" && currentStep !== "sitePages" && currentStep !== "siteAssets" && currentStep !== "siteReferences" && currentStep !== "siteNotes" && currentStep !== "systemFeatures" && currentStep !== "systemIntegrationNeed" && currentStep !== "systemAssets" && currentStep !== "automationDescription" && (
              <div className={styles.actions}>
                <button type="button" className={styles.buttonGhost} onClick={goBack}>
                  <ArrowLeft size={16} /> Voltar
                </button>
                <button type="button" className={styles.buttonPrimary} onClick={handleContinue}>
                  Continuar <ArrowRight size={16} />
                </button>
              </div>
            )}

            {error && <p className={styles.error}>{error}</p>}
            {!error && feedback && !submitted && <p className={styles.feedback}>{feedback}</p>}
          </article>

          <aside className={styles.aside} data-reveal>
            {RIGHT_RAIL_CARDS.map((card) => (
              <article key={card.title} className={styles.asideCard}>
                <h3 className={styles.asideTitle}>{card.title}</h3>
                <p className={styles.asideText}>{card.text}</p>
              </article>
            ))}

            <article className={styles.asideHighlight}>
              <div className={styles.asideHighlightHead}>
                <Sparkles size={16} />
                <h3>Fluxo leve e objetivo</h3>
              </div>
              <p>Você pode voltar etapas, ajustar respostas e concluir no seu ritmo.</p>
              <div className={styles.asideMeta}>
                <span>
                  <CalendarClock size={14} />
                  cerca de 2 minutos
                </span>
                <span>
                  <CheckCircle2 size={14} />
                  briefing inteligente
                </span>
              </div>
            </article>
          </aside>
        </div>
      </section>
    </SiteShell>
  );
}
