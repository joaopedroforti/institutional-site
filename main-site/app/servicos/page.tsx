import Link from "next/link";
import Image from "next/image";
import {
  FaArrowRight,
  FaChartLine,
  FaCloudArrowUp,
  FaCode,
  FaComments,
  FaHeadset,
  FaRobot,
  FaScrewdriverWrench,
  FaShop,
} from "react-icons/fa6";
import { ReactNode } from "react";
import SiteShell from "../components/site-shell";
import styles from "./servicos.module.css";

type ServiceCard = {
  title: string;
  description: string;
  icon: ReactNode;
  colorClass: "iconBlue" | "iconCyan" | "iconPurple" | "iconGreen" | "iconOrange";
};

const serviceCards: ServiceCard[] = [
  {
    title: "Desenvolvimento de Sistemas",
    description:
      "Transformamos ideias em aplicativos web que encantam usuários, otimizam a operação e preparam o negócio para escalar com inteligência.",
    icon: <FaCode aria-hidden="true" />,
    colorClass: "iconBlue",
  },
  {
    title: "RPA e Automação",
    description:
      "Automatizamos tarefas repetitivas para reduzir custos, acelerar processos e aumentar a produtividade da sua equipe.",
    icon: <FaRobot aria-hidden="true" />,
    colorClass: "iconCyan",
  },
  {
    title: "Projetos e Sustentação",
    description:
      "Da melhoria contínua ao desenvolvimento completo de produtos digitais em qualquer plataforma, com evolução constante.",
    icon: <FaScrewdriverWrench aria-hidden="true" />,
    colorClass: "iconPurple",
  },
  {
    title: "Suporte Técnico",
    description:
      "Assistência especializada remota e presencial para resolver falhas, minimizar tempo de inatividade e dar suporte a aplicativos existentes.",
    icon: <FaHeadset aria-hidden="true" />,
    colorClass: "iconGreen",
  },
  {
    title: "E-commerce",
    description:
      "Atuamos desde a criação e desenvolvimento da loja até cadastro de produtos, integrações e consultoria para operação comercial.",
    icon: <FaShop aria-hidden="true" />,
    colorClass: "iconOrange",
  },
  {
    title: "Data e Analytics",
    description:
      "Transforme dados em insights estratégicos com dashboards, indicadores e análises que fortalecem decisões e resultados.",
    icon: <FaChartLine aria-hidden="true" />,
    colorClass: "iconBlue",
  },
  {
    title: "Automação de Atendimento",
    description:
      "Construção de agentes automatizados para canais como WhatsApp, ligações e outros pontos de contato com o cliente.",
    icon: <FaComments aria-hidden="true" />,
    colorClass: "iconCyan",
  },
  {
    title: "SaaS",
    description:
      "Desenvolvemos seu SaaS de ponta a ponta com arquitetura escalável, experiência consistente e foco no crescimento do produto.",
    icon: <FaCloudArrowUp aria-hidden="true" />,
    colorClass: "iconPurple",
  },
];

const operatingModel = [
  {
    step: "01",
    title: "Diagnóstico técnico",
    description: "Entendemos cenário atual, gargalos e objetivos de negócio para definir prioridades reais.",
  },
  {
    step: "02",
    title: "Plano e arquitetura",
    description: "Estruturamos escopo, stack e etapas de entrega com previsibilidade de prazo e investimento.",
  },
  {
    step: "03",
    title: "Entrega e evolução",
    description: "Implementamos com qualidade, acompanhamos resultados e evoluímos o produto continuamente.",
  },
];

const outcomes = [
  {
    title: "Mais eficiência operacional",
    description: "Automação e integração para reduzir tarefas manuais e retrabalho entre áreas.",
  },
  {
    title: "Mais previsibilidade de entrega",
    description: "Planejamento técnico e acompanhamento constante para manter prazos e qualidade.",
  },
  {
    title: "Mais performance comercial",
    description: "Sistemas e canais digitais conectados para acelerar atendimento e vendas.",
  },
  {
    title: "Mais segurança e continuidade",
    description: "Sustentação ativa para manter aplicações estáveis, atualizadas e confiáveis.",
  },
];

const colorMap: Record<ServiceCard["colorClass"], string> = {
  iconBlue: "iconBlue",
  iconCyan: "iconCyan",
  iconPurple: "iconPurple",
  iconGreen: "iconGreen",
  iconOrange: "iconOrange",
};

export default function ServicesPage() {
  return (
    <SiteShell>
      {/* ── HERO ─────────────────────────────────────────── */}
      <section className={styles.hero} data-reveal>
        <div className={styles.heroInner}>
          <div className={styles.heroContent} data-reveal>
            <p className={styles.kicker}>Serviços</p>
            <h1>Soluções tecnológicas sob medida para escalar sua operação</h1>
            <p className={styles.heroLead}>
              Planejamos, desenvolvemos e sustentamos projetos digitais com foco em resultado,
              prazo realista e evolução contínua do negócio.
            </p>

            <ul className={styles.heroChecks}>
              {[
                "Time técnico Sênior",
                "Arquiterura Preparada",
                "Padrões de Segurança e LGPD",
              ].map((item) => (
                <li key={item}>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className={styles.heroActions}>
              <Link href="/contato" className={styles.primaryButton}>
                Solicitar proposta
                <FaArrowRight aria-hidden="true" />
              </Link>
              <Link href="/cases" className={styles.secondaryButton}>
                Ver cases
              </Link>
            </div>
          </div>

          <aside className={styles.heroVisual} data-reveal>
            <div className={styles.heroImageOnly}>
              <Image
                src="/images/servicos.png"
                alt="Serviços digitais para empresas"
                width={720}
                height={520}
                className={styles.heroImageOnlyImg}
                priority
              />
            </div>
          </aside>
        </div>
      </section>

      {/* ── CAPABILITIES ─────────────────────────────────── */}
      <section className={styles.capabilities}>
        <article className={styles.capabilityCard}>
          <h3>Projetos sob medida</h3>
          <p>Criamos soluções alinhadas à sua operação, com tecnologia adequada ao momento do negócio.</p>
        </article>
        <article className={styles.capabilityCard}>
          <h3>Integração de ponta a ponta</h3>
          <p>Conectamos sistemas, APIs e ferramentas para eliminar retrabalho e aumentar produtividade.</p>
        </article>
        <article className={styles.capabilityCard}>
          <h3>Sustentação contínua</h3>
          <p>Mantemos sua solução estável, segura e evoluindo com suporte técnico especializado.</p>
        </article>
      </section>

      {/* ── SERVICES GRID ────────────────────────────────── */}
      <section className={styles.servicesSection}>
        <div className={styles.sectionHead} data-reveal>
          <p className={styles.kicker}>Portfólio de serviços</p>
          <h2>Soluções completas para evoluir seu ambiente digital</h2>
        </div>

        <div className={styles.grid}>
          {serviceCards.map((card) => (
            <article className={styles.card} key={card.title} data-reveal>
              <span className={`${styles.icon} ${styles[colorMap[card.colorClass]]}`}>
                {card.icon}
              </span>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── HOW WE WORK ──────────────────────────────────── */}
      <section className={styles.modelSection} data-reveal>
        <div className={styles.sectionHead} data-reveal>
          <p className={styles.kicker}>Como trabalhamos</p>
          <h2>Modelo de execução para garantir previsibilidade e qualidade</h2>
        </div>

        <div className={styles.modelGrid}>
          {operatingModel.map((item) => (
            <article className={styles.modelItem} key={item.step} data-reveal data-step={item.step}>
              <span className={styles.stepBadge}>{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── OUTCOMES ─────────────────────────────────────── */}
      <section className={styles.outcomesSection} data-reveal>
        <div className={styles.sectionHead} data-reveal>
          <p className={styles.kicker}>Resultados esperados</p>
          <h2>O que sua empresa ganha ao evoluir com a FortiCorp</h2>
        </div>

        <div className={styles.outcomesGrid}>
          {outcomes.map((item) => (
            <article className={styles.outcomeCard} key={item.title} data-reveal>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className={styles.ctaSection} data-reveal>
        <div className={styles.ctaInner}>
          <div className={styles.ctaText}>
            <p className={styles.kicker}>Próximo passo</p>
            <h2>Vamos estruturar o plano ideal para o seu projeto?</h2>
            <p>Converse com nosso time para mapear prioridades e receber uma proposta técnica personalizada.</p>
          </div>
          <div className={styles.ctaActions}>
            <Link href="/contato" className={styles.primaryButton}>
              Solicitar proposta
              <FaArrowRight aria-hidden="true" />
            </Link>
            <Link href="/cases" className={styles.secondaryButton}>
              Conhecer resultados
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
