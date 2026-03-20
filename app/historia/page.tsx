import Image from "next/image";
import SiteShell from "../components/site-shell";
import styles from "./historia.module.css";

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
  },
  {
    title: "Execução de alto padrão",
    description:
      "Aplicamos boas práticas de mercado em arquitetura, qualidade de código, segurança e performance para entregas sólidas.",
  },
  {
    title: "Parceria de longo prazo",
    description:
      "Atuamos com evolução contínua, suporte próximo e melhoria constante para sustentar crescimento com confiança.",
  },
];

export default function HistoryPage() {
  return (
    <SiteShell>
      <section className={`${styles.hero} ${styles.head}`} data-reveal>
        <div className={styles.heroInner}>
          <div className={styles.heroContent} data-reveal>
            <p className={styles.kicker}>HISTÓRIA</p>
            <h1>Uma trajetória construída com tecnologia, consistência e resultado</h1>
            <p>
              A FortiCorp nasceu da prática, evoluiu com método e hoje entrega soluções digitais que transformam operação, aceleram crescimento e fortalecem decisões de negócio.
            </p>
            <div className={styles.heroMetrics}>
              <article className={styles.metric}>
                <strong>11+ anos</strong>
                <span>de experiência prática</span>
              </article>
              <article className={styles.metric}>
                <strong>Projetos sob medida</strong>
                <span>para diferentes segmentos</span>
              </article>
              <article className={styles.metric}>
                <strong>Visão de produto</strong>
                <span>com serviços e SaaS</span>
              </article>
            </div>
          </div>

          <aside className={styles.photoCard} data-reveal>
            <Image
              src="/images/joaopedroforti.jpeg"
              alt="João Pedro Forti"
              width={680}
              height={840}
              className={styles.photo}
            />
            <p className={styles.photoCaption}>João Pedro Forti, fundador e especialista em desenvolvimento de sistemas.</p>
          </aside>
        </div>
      </section>

      <section className={styles.timelineSection} data-reveal>
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>A JORNADA</p>
          <h2>Da prática de campo a uma operação digital orientada por performance</h2>
        </div>
        <div className={styles.timeline}>
          {journey.map((step) => (
            <article className={styles.timelineItem} key={step.title} data-reveal>
              <span className={styles.timelineYear}>{step.year}</span>
              <div>
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
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <article className={styles.highlight} data-reveal>
        <div className={styles.highlightInner}>
          <h2>Construímos tecnologia para virar resultado real</h2>
          <p>
            Nossa missão é transformar tecnologia em vantagem competitiva para empresas que precisam de sistemas confiáveis, processos digitais eficientes e crescimento sustentável. Cada projeto é construído com foco em estratégia, experiência do usuário e excelência técnica.
          </p>
        </div>
      </article>
    </SiteShell>
  );
}
