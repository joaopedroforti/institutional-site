"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import styles from "./landing-page.module.css";

type ServiceItem = {
  title: string;
  description: string;
};

type PillarItem = {
  title: string;
  description: string;
};

type ProcessItem = {
  title: string;
  description: string;
  highlight: string;
};

type BuildPhase = {
  step: string;
  title: string;
  description: string;
};

const serviceItems: ServiceItem[] = [
  {
    title: "Soluções Digitais",
    description:
      "Implementamos tecnologias personalizadas que otimizam a operação e preparam o negócio para escalar com inteligência.",
  },
  {
    title: "Desenvolvimento de Aplicativos",
    description:
      "Transformamos ideias em aplicativos web e mobile que encantam usuários, fortalecem marcas e geram resultados reais.",
  },
  {
    title: "Desenvolvimento de Software",
    description:
      "Criamos softwares sob medida para impulsionar eficiência, inovação e vantagem competitiva no seu mercado.",
  },
  {
    title: "Outsourcing Estratégico",
    description:
      "Alocamos especialistas para ampliar sua equipe com agilidade, qualidade técnica e foco em resultados.",
  },
  {
    title: "RPA e Automação de Processos",
    description:
      "Automatizamos tarefas operacionais para reduzir custos, eliminar erros e liberar seu time para o estratégico.",
  },
  {
    title: "Projetos e Sustentação",
    description:
      "Atuamos da melhoria contínua ao desenvolvimento de grandes projetos, com governança e acompanhamento próximo.",
  },
];

const pillarItems: PillarItem[] = [
  {
    title: "Funciona em Qualquer Tela",
    description:
      "Acesse do celular, tablet ou computador. Sua equipe usa de onde estiver, sem instalação.",
  },
  {
    title: "Disponível 24 Horas",
    description:
      "Sistema online, acessível pelo navegador a qualquer momento, em qualquer lugar.",
  },
  {
    title: "Seus Dados Protegidos",
    description:
      "Segurança de alto padrão com controle de acesso para proteger informações críticas.",
  },
  {
    title: "Conecta com Tudo",
    description:
      "Integrações com nota fiscal, banco, WhatsApp e outras plataformas para eliminar retrabalho.",
  },
  {
    title: "Suporte de Verdade",
    description:
      "Você fala com pessoas reais que conhecem o sistema porque participaram da construção.",
  },
  {
    title: "Números na Hora",
    description:
      "Relatórios automáticos para decisões mais rápidas e seguras, sem planilhas manuais.",
  },
];

const processItems: ProcessItem[] = [
  {
    title: "Conversa Inicial",
    description:
      "Você conta o que precisa e recebe uma visão clara do que é possível, prazo e investimento.",
    highlight: "Gratuita e sem compromisso",
  },
  {
    title: "Proposta Clara",
    description:
      "Escopo, etapas, prazos e valores documentados para você aprovar com total transparência.",
    highlight: "Tudo por escrito, sem surpresas",
  },
  {
    title: "Construção com Acompanhamento",
    description:
      "Entregas curtas semanais para você testar, validar e ajustar com velocidade.",
    highlight: "Você vê o progresso toda semana",
  },
  {
    title: "Testes e Ajustes",
    description:
      "Cada funcionalidade é validada antes do lançamento para garantir estabilidade e confiança.",
    highlight: "Tudo funciona antes de ir pro ar",
  },
  {
    title: "Entrega e Suporte",
    description:
      "Sistema no ar, equipe treinada e suporte contínuo para evolução do produto.",
    highlight: "A gente não some depois",
  },
];

const buildPhases: BuildPhase[] = [
  {
    step: "1",
    title: "Imersão e Descoberta",
    description:
      "Mergulhamos no seu negócio para entender dores, objetivos e oportunidades, definindo escopo e estratégia técnica.",
  },
  {
    step: "2",
    title: "Design e Prototipação",
    description:
      "Criamos a experiência visual e funcional para validação do fluxo antes do desenvolvimento.",
  },
  {
    step: "3",
    title: "Desenvolvimento Ágil",
    description:
      "Construímos com tecnologias modernas como Next.js, React e Node, com entregas parciais.",
  },
  {
    step: "4",
    title: "Lançamento e Evolução",
    description:
      "Publicamos com segurança, monitoramos performance e evoluímos com base em dados reais.",
  },
];

export default function LandingPage() {
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    let frameId = 0;

    const handleScroll = () => {
      cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        setScrollOffset(window.scrollY);
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
    const revealedElements = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.22,
        rootMargin: "0px 0px -60px 0px",
      },
    );

    revealedElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  const parallaxStyle = useMemo(
    () => ({ "--scroll-offset": `${scrollOffset}px` }) as CSSProperties,
    [scrollOffset],
  );

  return (
    <div className={styles.page} style={parallaxStyle}>
      <header className={styles.header}>
        <a href="#inicio" className={styles.logo}>
          * Tecnologia
        </a>
        <nav className={styles.nav}>
          <a href="#servicos">Serviços</a>
          <a href="#processo">Processo</a>
          <a href="#contato">Contato</a>
        </nav>
      </header>

      <main>
        <section id="inicio" className={styles.hero}>
          <div className={styles.heroGlow} />
          <div className={styles.heroShape} />
          <div className={styles.heroContent} data-reveal>
            <p className={styles.kicker}>CONSULTORIA TECNOLÓGICA</p>
            <h1>
              Sua empresa merece mais do que improviso.
            </h1>
            <p className={styles.heroText}>
              Apoiamos sua empresa para encontrar as melhores soluções tecnológicas diante dos desafios do mercado. Tecnologia de ponta, explicada de forma simples, com entrega real e foco em resultado.
            </p>
            <div className={styles.heroActions}>
              <a href="#contato" className={styles.primaryButton}>
                Quero começar meu projeto
              </a>
              <a href="#servicos" className={styles.secondaryButton}>
                Conhecer soluções
              </a>
            </div>
          </div>
          <aside className={styles.heroPanel} data-reveal>
            <h2>O que entregamos</h2>
            <ul>
              <li>Sistemas web sob medida</li>
              <li>Aplicativos para operação e vendas</li>
              <li>APIs e integrações com sistemas legados</li>
              <li>Manutenção e suporte contínuo</li>
            </ul>
          </aside>
        </section>

        <section className={styles.proofSection} data-reveal>
          <p>
            A maioria das pequenas e médias empresas perde tempo e dinheiro com ferramentas genéricas. Se algo no seu processo parece travado, existe um caminho melhor e mais inteligente para resolver.
          </p>
        </section>

        <section id="servicos" className={styles.section}>
          <div className={styles.sectionHead} data-reveal>
            <p className={styles.kicker}>SERVIÇOS</p>
            <h2>Desenvolvimento personalizado para atender sua empresa</h2>
          </div>
          <div className={styles.cardGrid}>
            {serviceItems.map((item) => (
              <article className={styles.card} key={item.title} data-reveal>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead} data-reveal>
            <p className={styles.kicker}>DIFERENCIAIS</p>
            <h2>Tecnologia robusta com experiência simples para sua equipe</h2>
          </div>
          <div className={styles.pillarGrid}>
            {pillarItems.map((item) => (
              <article className={styles.pillar} key={item.title} data-reveal>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="processo" className={styles.section}>
          <div className={styles.sectionHead} data-reveal>
            <p className={styles.kicker}>PROCESSO</p>
            <h2>Do primeiro contato ao sistema pronto, sem enrolação</h2>
          </div>
          <div className={styles.timeline}>
            {processItems.map((item, index) => (
              <article className={styles.timelineItem} key={item.title} data-reveal>
                <span>{`0${index + 1}`}</span>
                <div>
                  <p className={styles.timelineHighlight}>{item.highlight}</p>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead} data-reveal>
            <p className={styles.kicker}>ESTRUTURA DE ENTREGA</p>
            <h2>Metodologia completa para lançar e evoluir seu sistema</h2>
          </div>
          <div className={styles.phaseGrid}>
            {buildPhases.map((phase) => (
              <article className={styles.phaseCard} key={phase.step} data-reveal>
                <span>{phase.step}</span>
                <h3>{phase.title}</h3>
                <p>{phase.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="contato" className={styles.contactSection} data-reveal>
          <p className={styles.kicker}>CONSULTORIA E DESENVOLVIMENTO</p>
          <h2>Conte com especialistas para acelerar seu crescimento</h2>
          <p>
            Conte com uma estrutura preparada para evoluir aplicativos, sustentar operações críticas e desenvolver projetos de alto impacto em qualquer plataforma.
          </p>
          <div className={styles.contactActions}>
            <a className={styles.primaryButton} href="mailto:contato@seudominio.com">
              contato@seudominio.com
            </a>
            <a className={styles.secondaryButton} href="https://wa.me/5500000000000" target="_blank" rel="noreferrer">
              Falar no WhatsApp
            </a>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>* Tecnologia</p>
        <p>Consultoria tecnológica, desenvolvimento de sistemas e inovação para empresas.</p>
      </footer>
    </div>
  );
}
