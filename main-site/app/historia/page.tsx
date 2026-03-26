import Image from "next/image";
import SiteShell from "../components/site-shell";
import styles from "./historia.module.css";

const team = [
  {
    name: "Camila Souza",
    role: "Financeiro",
    description: "Responsável pelo controle financeiro, fluxo de caixa e organização de pagamentos da operação.",
    image: "/images/persons/1.png",
  },
  {
    name: "Rafael Nunes",
    role: "Desenvolvedor Sênior",
    description: "Atua no desenvolvimento e manutenção de funcionalidades, apoiando as entregas técnicas do time.",
    image: "/images/persons/2.png",
  },
  {
    name: "Francisco Oliveira",
    role: "Analista de Projetos",
    description: "Coordena cronogramas e acompanhamento das etapas para garantir entregas dentro do prazo.",
    image: "/images/persons/3.png",
  },
];

const journey = [
  {
    year: "2015",
    title: "Primeiros projetos e base técnica",
    description:
      "João Pedro Forti iniciou sua trajetória desenvolvendo soluções para pequenas empresas, priorizando aprendizado prático em cenários reais de operação.",
  },
  {
    year: "2018",
    title: "Profissionalização e metodologia",
    description:
      "A experiência acumulada evoluiu para uma atuação estruturada, com foco em processos de desenvolvimento, arquitetura escalável e entregas previsíveis.",
  },
  {
    year: "2021",
    title: "Expansão de serviços e sustentação",
    description:
      "A FortiCorp passou a atender empresas de múltiplos segmentos com desenvolvimento de sistemas, automações, integrações e suporte contínuo.",
  },
  {
    year: "Hoje",
    title: "Crescimento orientado a performance",
    description:
      "Além de projetos sob medida, a empresa avança com produtos SaaS próprios, reforçando inovação, eficiência operacional e resultados mensuráveis.",
  },
];

const principles = [
  {
    title: "Clareza estratégica",
    description:
      "Cada projeto começa com diagnóstico técnico e visão de negócio para garantir decisões corretas desde o início.",
    icon: "🎯",
  },
  {
    title: "Execução de alto padrão",
    description:
      "Aplicamos boas práticas de mercado em arquitetura, qualidade de código, segurança e performance para entregas sólidas.",
    icon: "⚡",
  },
  {
    title: "Parceria de longo prazo",
    description:
      "Atuamos com evolução contínua, suporte próximo e melhoria constante para sustentar crescimento com confiança.",
    icon: "🤝",
  },
];

export default function HistoryPage() {
  return (
    <SiteShell flushFooterGap>
      <section className={`${styles.hero} ${styles.head}`} data-reveal>
        <div className={styles.heroInner}>
          <div className={styles.heroContent} data-reveal>
            <p className={styles.kicker}>SOBRE NÓS</p>
            <h1>Uma equipe focada em transformar tecnologia em crescimento real para sua empresa</h1>
            <p>
              Combinamos visão estratégica, engenharia de software e execução contínua para entregar sistemas, automações e produtos digitais alinhados ao seu momento de negócio.
            </p>
            <div className={styles.heroMetrics}>
              <article className={styles.metric}>
                <div className={styles.metricIcon}>📅</div>
                <div>
                  <strong>11+ anos</strong>
                  <span>de experiência prática em tecnologia</span>
                </div>
              </article>
              <article className={styles.metric}>
                <div className={styles.metricIcon}>💡</div>
                <div>
                  <strong>Atuação consultiva</strong>
                  <span>com foco em desempenho e previsibilidade</span>
                </div>
              </article>
              <article className={styles.metric}>
                <div className={styles.metricIcon}>👥</div>
                <div>
                  <strong>Equipe multidisciplinar</strong>
                  <span>entre técnica, produto e operação</span>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.teamSection} data-reveal>
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>NOSSA EQUIPE</p>
          <h2>Pessoas que constroem cada entrega com estratégia, técnica e compromisso</h2>
        </div>

        <div className={styles.teamLeadRow}>
          <article className={styles.teamLeadCard} data-reveal>
            <div className={styles.teamLeadPhotoWrapper}>
              <Image
                src="/images/joaopedroforti.jpeg"
                alt="João Pedro Forti"
                width={320}
                height={320}
                className={styles.teamLeadPhoto}
              />
            </div>
            <div className={styles.teamLeadInfo}>
              <h3>João Pedro Forti</h3>
              <p className={styles.teamRole}>CEO e Desenvolvedor Sênior</p>
              <p className={styles.teamBio}>
                Especialista em arquitetura de sistemas e liderança técnica, focado em transformar desafios complexos em soluções escaláveis.
              </p>
            </div>
          </article>
        </div>

        <div className={styles.teamGrid}>
          {team.map((member) => (
            <article className={styles.teamCard} key={member.name} data-reveal>
              <div className={styles.teamPhotoWrapper}>
                <Image
                  src={member.image}
                  alt={member.name}
                  width={280}
                  height={320}
                  className={styles.teamPhoto}
                />
              </div>
              <div className={styles.teamCardInfo}>
                <h3>{member.name}</h3>
                <p className={styles.teamCardRole}>{member.role}</p>
                <p className={styles.teamCardBio}>{member.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.timelineSection} data-reveal>
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>A JORNADA</p>
          <h2>Da prática de campo a uma operação digital orientada por performance</h2>
        </div>
        <div className={styles.timeline}>
          {journey.map((step, index) => (
            <article className={styles.timelineItem} key={step.title} data-reveal>
              <div className={styles.timelineMarker}>
                <span className={styles.timelineYear}>{step.year}</span>
                <div className={styles.timelineDot}></div>
              </div>
              <div className={styles.timelineContent}>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.principlesSection} data-reveal>
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>COMO TRABALHAMOS</p>
          <h2>Princípios que sustentam cada entrega</h2>
        </div>
        <div className={styles.principlesGrid}>
          {principles.map((item) => (
            <article className={styles.principleCard} key={item.title} data-reveal>
              <div className={styles.principleIcon}>{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <article className={styles.highlight} data-reveal>
        <div className={styles.highlightInner}>
          <div className={styles.highlightContent}>
            <h2>Construímos tecnologia para virar resultado real</h2>
            <p>
              Nossa missão é transformar tecnologia em vantagem competitiva para empresas que precisam de sistemas confiáveis, processos digitais eficientes e crescimento sustentável. Cada projeto é construído com foco em estratégia, experiência do usuário e excelência técnica.
            </p>
            <a href="https://wa.me/SEU_NUMERO" className={styles.ctaButtonHighlight}>
              Iniciar um projeto agora
            </a>
          </div>
        </div>
      </article>
    </SiteShell>
  );
}
