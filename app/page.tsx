import Image from "next/image";
import {
  FaArrowRight,
  FaBriefcase,
  FaCartShopping,
  FaChartLine,
  FaClock,
  FaGear,
  FaIndustry,
  FaLock,
  FaMobileScreen,
  FaStore,
} from "react-icons/fa6";
import SiteShell from "./components/site-shell";
import styles from "./home.module.css";

const partnerLogos = [
  "Vercel",
  "Laravel",
  "Next.js",
  "React",
  "Node",
  "Supabase",
  "PostgreSQL",
  "n8n",
];

const technologyItems = [
  "Laravel",
  "Bootstrap",
  "Tailwind CSS",
  "Node.js",
  "Next.js",
  "React",
  "PHP",
  "CSS",
  "WordPress",
  "PostgreSQL",
  "n8n",
  "Supabase",
  "C#",
  "TypeScript",
  "Python",
  "Docker",
];

export default function Home() {
  const loopItems = [...technologyItems, ...technologyItems];

  return (
    <SiteShell>
      <section className={styles.heroFull}>
        <video className={styles.heroVideo} autoPlay muted loop playsInline>
          <source src="/videos/herobackground.p4" type="video/mp4" />
          <source src="/videos/background.mp4" type="video/mp4" />
        </video>
        <div className={styles.heroOverlay} />
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <p className={styles.kicker}>DESENVOLVIMENTO SOB MEDIDA</p>
            <h1>Não é software genérico. É feito para o seu mercado.</h1>
            <p>
              Projetamos e desenvolvemos aplicações de alta performance com foco no seu processo real, na sua equipe e nos objetivos de crescimento do seu negócio.
            </p>
            <div className={styles.heroActions}>
              <a href="/contato" className={styles.primaryCta}>
                Falar com especialista
              </a>
              <a href="/servicos" className={styles.secondaryCta}>
                Conhecer serviços
              </a>
            </div>
            <div className={styles.heroStats}>
              <div>
                <strong>100+</strong>
                <span>Projetos entregues</span>
              </div>
              <div>
                <strong>50+</strong>
                <span>Clientes ativos</span>
              </div>
              <div>
                <strong>98%</strong>
                <span>Satisfação</span>
              </div>
            </div>
          </div>
          <div className={styles.heroImageWrap}>
            <Image
              src="/images/hero-visual.svg"
              alt="Painel de produto digital"
              width={720}
              height={520}
              className={styles.heroImage}
              priority
            />
          </div>
        </div>
      </section>

      <section className={styles.logoStrip}>
        <p>Tecnologias e ecossistemas com os quais trabalhamos</p>
        <div className={styles.logoStripTrack}>
          {partnerLogos.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <p className={styles.kicker}>DIFERENCIAIS</p>
          <h2>Tecnologia de ponta explicada de forma simples</h2>
          <p>
            Você não precisa entender de programação para ter uma solução de alto nível. Cuidamos da parte técnica e entregamos um sistema bonito, seguro e fácil de usar pela sua equipe.
          </p>
        </div>
        <div className={styles.gridThree}>
          <article className={styles.card}>
            <span className={`${styles.icon} ${styles.iconBlue}`}>
              <FaMobileScreen aria-hidden="true" />
            </span>
            <h3>Funciona em qualquer tela</h3>
            <p>Acesse do celular, tablet ou computador, sem instalar nada.</p>
          </article>
          <article className={styles.card}>
            <span className={`${styles.icon} ${styles.iconCyan}`}>
              <FaClock aria-hidden="true" />
            </span>
            <h3>Disponível 24 horas</h3>
            <p>Sistema online para sua operação continuar rodando em qualquer horário.</p>
          </article>
          <article className={styles.card}>
            <span className={`${styles.icon} ${styles.iconGreen}`}>
              <FaLock aria-hidden="true" />
            </span>
            <h3>Dados protegidos</h3>
            <p>Práticas de segurança de nível corporativo para manter informações críticas protegidas.</p>
          </article>
        </div>
        <article className={styles.callout}>
          <h3>Projetos personalizados e sustentação contínua</h3>
          <p>
            Nossa estrutura atende desde criação de sites institucionais até desenvolvimento completo de grandes projetos em múltiplas plataformas.
          </p>
        </article>
      </section>

      <section className={styles.darkSection}>
        <div className={styles.darkMedia}>
          <Image src="/images/joaopedroforti.jpeg" alt="Equipe FortiCorp" width={720} height={480} className={styles.darkImage} />
        </div>
        <div className={styles.darkText}>
          <p className={styles.darkKicker}>COMO TRABALHAMOS</p>
          <h2>Projeta. Implementa. Opera.</h2>
          <p>
            Atuamos de ponta a ponta: diagnóstico, arquitetura, desenvolvimento, integração e sustentação com acompanhamento contínuo e visão de resultado.
          </p>
          <ul>
            <li>Escopo técnico claro e alinhado ao negócio</li>
            <li>Entregas em ciclos curtos com validação contínua</li>
            <li>Suporte pós-go-live com evolução planejada</li>
          </ul>
        </div>
      </section>

      <section className={styles.sectionBlue}>
        <div className={styles.sectionHead}>
          <p className={styles.kicker}>PARA QUEM É NOSSO TRABALHO</p>
          <h2>Soluções digitais para operações de diferentes segmentos</h2>
        </div>
        <div className={styles.gridFour}>
          <article className={styles.segmentCard}>
            <span className={`${styles.icon} ${styles.iconBlue}`}>
              <FaStore aria-hidden="true" />
            </span>
            <h3>Comércios</h3>
            <p>Automação de pedidos, estoque e gestão para aumentar eficiência diária.</p>
          </article>
          <article className={styles.segmentCard}>
            <span className={`${styles.icon} ${styles.iconPurple}`}>
              <FaBriefcase aria-hidden="true" />
            </span>
            <h3>Empresas de Serviços</h3>
            <p>Fluxos, atendimento e indicadores para operações de campo e escritório.</p>
          </article>
          <article className={styles.segmentCard}>
            <span className={`${styles.icon} ${styles.iconOrange}`}>
              <FaIndustry aria-hidden="true" />
            </span>
            <h3>Indústrias</h3>
            <p>Sistemas para produção, controle de processos e tomada de decisão em tempo real.</p>
          </article>
          <article className={styles.segmentCard}>
            <span className={`${styles.icon} ${styles.iconGreen}`}>
              <FaCartShopping aria-hidden="true" />
            </span>
            <h3>Varejo e E-commerce</h3>
            <p>Integração entre vendas, catálogo, logística e atendimento multicanal.</p>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeadInline}>
          <div>
            <p className={styles.kicker}>CASES E PROJETOS</p>
            <h2>Resultados concretos em diferentes modelos de negócio</h2>
          </div>
          <a href="/cases" className={styles.linkArrow}>
            Ver todos os cases <FaArrowRight aria-hidden="true" />
          </a>
        </div>
        <div className={styles.gridThree}>
          <article className={styles.caseCard}>
            <p>B2B | Recrutamento</p>
            <h3>Plataforma de seleção com IA</h3>
            <span>+120% eficiência operacional</span>
          </article>
          <article className={styles.caseCard}>
            <p>E-commerce | Omnichannel</p>
            <h3>Integração vendas + logística</h3>
            <span>-40% retrabalho manual</span>
          </article>
          <article className={styles.caseCard}>
            <p>Serviços | Automação</p>
            <h3>Agentes em múltiplos canais</h3>
            <span>24/7 atendimento contínuo</span>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <p className={styles.kicker}>TECNOLOGIAS</p>
          <h2>Stack moderna para performance e escalabilidade</h2>
        </div>
        <div className={styles.carousel}>
          <div className={styles.track}>
            {loopItems.map((item, index) => (
              <span className={styles.logoItem} key={`${item}-${index}`}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.contactSection}>
        <div className={styles.contactGrid}>
          <article className={styles.contactCard}>
            <p className={styles.kicker}>DIAGNÓSTICO RÁPIDO</p>
            <h3>Pronto para lançar seu sistema, aplicativo ou site com segurança?</h3>
            <p>
              Vamos estruturar uma solução sob medida para seu desafio atual, com escopo claro, tecnologia certa e execução previsível.
            </p>
            <div className={styles.steps}>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>1</span>
                <div>
                  <h4>Diagnóstico</h4>
                  <p>Converse com nosso especialista para entender a melhor solução para seu projeto.</p>
                </div>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>2</span>
                <div>
                  <h4>Plano de ação</h4>
                  <p>Nós criamos um plano de ação com escopo, prioridades e cronograma de execução.</p>
                </div>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>3</span>
                <div>
                  <h4>Execução</h4>
                  <p>Desenvolvemos seu projeto com a tecnologia e o modelo de entrega ideal para o negócio.</p>
                </div>
              </div>
            </div>
          </article>

          <article className={styles.formCard}>
            <h3>Solicitar proposta</h3>
            <form className={styles.form}>
              <input type="text" className={styles.input} placeholder="Nome completo" />
              <input type="text" className={styles.input} placeholder="Celular / WhatsApp" />
              <input type="text" className={styles.input} placeholder="E-mail e nome da empresa" />
              <textarea className={styles.textarea} placeholder="Como podemos ajudar? Descreva brevemente seu desafio atual." />
              <button type="button" className={styles.submit}>
                Enviar solicitação
              </button>
            </form>
          </article>
        </div>
      </section>

      <section className={styles.bottomInsights}>
        <div className={styles.insightCard}>
          <span>
            <FaChartLine aria-hidden="true" />
          </span>
          <h4>Inovação na prática</h4>
          <p>Aplicamos tecnologia para destravar gargalos reais de operação e crescimento.</p>
        </div>
        <div className={styles.insightCard}>
          <span>
            <FaGear aria-hidden="true" />
          </span>
          <h4>Execução com método</h4>
          <p>Processo validado, entregas com previsibilidade e evolução contínua do produto.</p>
        </div>
      </section>
    </SiteShell>
  );
}
