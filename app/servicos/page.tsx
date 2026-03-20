import Link from "next/link";
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
      "Assistência especializada remota e presencial para resolver falhas, minimizar tempo de inatividade e dar suporte a aplicativos já existentes da empresa.",
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
    title: "Diagnóstico técnico",
    description: "Entendemos cenário atual, gargalos e objetivos de negócio para definir prioridades reais.",
  },
  {
    title: "Plano e arquitetura",
    description: "Estruturamos escopo, stack e etapas de entrega com previsibilidade de prazo e investimento.",
  },
  {
    title: "Entrega e evolução",
    description: "Implementamos com qualidade, acompanhamos resultados e evoluímos o produto continuamente.",
  },
];

export default function ServicesPage() {
  const getColorClass = (colorClass: ServiceCard["colorClass"]) => {
    switch (colorClass) {
      case "iconBlue":
        return styles.iconBlue;
      case "iconCyan":
        return styles.iconCyan;
      case "iconPurple":
        return styles.iconPurple;
      case "iconGreen":
        return styles.iconGreen;
      case "iconOrange":
        return styles.iconOrange;
      default:
        return styles.iconBlue;
    }
  };

  return (
    <SiteShell>
      <section className={styles.hero} data-reveal>
        <div className={styles.heroInner}>
          <article className={styles.heroContent} data-reveal>
            <p className={styles.kicker}>SERVIÇOS</p>
            <h1>Desenvolvimento de projetos personalizados para sua empresa</h1>
            <p>
              Profissionais especializados e altamente qualificados, alinhados aos objetivos do cliente, com melhores práticas, metodologias e processos de mercado.
            </p>
            <div className={styles.heroActions}>
              <Link href="/contato" className={styles.primaryButton}>
                Solicitar proposta
                <FaArrowRight aria-hidden="true" />
              </Link>
              <Link href="/cases" className={styles.secondaryButton}>
                Ver cases
              </Link>
            </div>
          </article>

          <aside className={styles.heroPanel} data-reveal>
            <h2>Entrega técnica com visão de negócio</h2>
            <ul>
              <li>Escopo claro e orientado a resultado.</li>
              <li>Arquitetura preparada para escala e manutenção.</li>
              <li>Acompanhamento próximo durante toda a execução.</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className={styles.capabilities} data-reveal>
        <article className={styles.capabilityCard} data-reveal>
          <h3>Projetos sob medida</h3>
          <p>Criamos soluções alinhadas à sua operação, com tecnologia adequada ao momento do negócio.</p>
        </article>
        <article className={styles.capabilityCard} data-reveal>
          <h3>Integração de ponta a ponta</h3>
          <p>Conectamos sistemas, APIs e ferramentas para eliminar retrabalho e aumentar produtividade.</p>
        </article>
        <article className={styles.capabilityCard} data-reveal>
          <h3>Sustentação contínua</h3>
          <p>Mantemos sua solução estável, segura e evoluindo com suporte técnico especializado.</p>
        </article>
      </section>

      <section className={styles.servicesSection}>
        <div className={styles.sectionHead} data-reveal>
          <p className={styles.kicker}>PORTFÓLIO DE SERVIÇOS</p>
          <h2>Soluções completas para evoluir seu ambiente digital</h2>
        </div>

        <div className={styles.grid}>
          {serviceCards.map((card) => (
            <article className={styles.card} key={card.title} data-reveal>
              <span className={`${styles.icon} ${getColorClass(card.colorClass)}`}>{card.icon}</span>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.modelSection} data-reveal>
        <div className={styles.sectionHead} data-reveal>
          <p className={styles.kicker}>COMO TRABALHAMOS</p>
          <h2>Modelo de execução para garantir previsibilidade e qualidade</h2>
        </div>

        <div className={styles.modelGrid}>
          {operatingModel.map((step, index) => (
            <article className={styles.modelItem} key={step.title} data-reveal>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
