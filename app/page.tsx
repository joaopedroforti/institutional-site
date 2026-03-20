import Image from "next/image";
import {
  FaBriefcase,
  FaCartShopping,
  FaClock,
  FaIndustry,
  FaLock,
  FaMobileScreen,
  FaStore,
} from "react-icons/fa6";
import SiteShell from "./components/site-shell";
import styles from "./home.module.css";

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
            <p className={styles.kicker}>DESENVOLVIMENTO DE SISTEMAS</p>
            <h1>Desenvolvimento de aplicações de alta performance</h1>
            <p>
              Criamos soluções robustas e escaláveis, alinhadas aos objetivos do seu negócio.
            </p>
          </div>
          <div className={styles.heroImageWrap}>
            <Image
              src="/images/hero-visual.svg"
              alt="Ilustração de plataforma digital"
              width={720}
              height={520}
              className={styles.heroImage}
              priority
            />
          </div>
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

      <section className={`${styles.section} ${styles.sectionBlue}`}>
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

      <section className={styles.section}>
        <div className={styles.contactGrid}>
          <article className={styles.contactCard}>
            <p className={styles.kicker}>CONTATO</p>
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
    </SiteShell>
  );
}
