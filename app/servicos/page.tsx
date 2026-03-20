import {
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
      <section className={`${styles.hero} ${styles.sectionHead}`} data-reveal>
        <p className={styles.kicker}>SERVIÇOS</p>
        <h1>Desenvolvimento de projetos personalizados para sua empresa</h1>
        <p>
          Profissionais especializados e altamente qualificados, alinhados aos objetivos do cliente, com melhores práticas, metodologias e processos de mercado.
        </p>
      </section>

      <section className={styles.grid}>
        {serviceCards.map((card) => (
          <article className={styles.card} key={card.title} data-reveal>
            <span className={`${styles.icon} ${getColorClass(card.colorClass)}`}>{card.icon}</span>
            <h2>{card.title}</h2>
            <p>{card.description}</p>
          </article>
        ))}
      </section>
    </SiteShell>
  );
}
