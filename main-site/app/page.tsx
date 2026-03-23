'use client';

import { useEffect } from 'react';
import Image from "next/image";
import {
  FaBootstrap,
  FaBriefcase,
  FaCartShopping,
  FaClock,
  FaIndustry,
  FaLock,
  FaMobileScreen,
  FaNodeJs,
  FaPhp,
  FaPython,
  FaReact,
  FaStore,
  FaWordpress,
  FaArrowRight,
} from "react-icons/fa6";
import {
  SiCss,
  SiDocker,
  SiLaravel,
  SiN8N,
  SiNextdotjs,
  SiPostgresql,
  SiSharp,
  SiSupabase,
  SiTailwindcss,
  SiTypescript,
} from "react-icons/si";
import ContactLeadForm from "./components/contact-lead-form";
import SiteShell from "./components/site-shell";
import styles from "./home.module.css";

const technologyItems = [
  { label: "Laravel", icon: <SiLaravel aria-hidden="true" /> },
  { label: "Bootstrap", icon: <FaBootstrap aria-hidden="true" /> },
  { label: "Tailwind CSS", icon: <SiTailwindcss aria-hidden="true" /> },
  { label: "Node.js", icon: <FaNodeJs aria-hidden="true" /> },
  { label: "Next.js", icon: <SiNextdotjs aria-hidden="true" /> },
  { label: "React", icon: <FaReact aria-hidden="true" /> },
  { label: "PHP", icon: <FaPhp aria-hidden="true" /> },
  { label: "CSS", icon: <SiCss aria-hidden="true" /> },
  { label: "WordPress", icon: <FaWordpress aria-hidden="true" /> },
  { label: "PostgreSQL", icon: <SiPostgresql aria-hidden="true" /> },
  { label: "n8n", icon: <SiN8N aria-hidden="true" /> },
  { label: "Supabase", icon: <SiSupabase aria-hidden="true" /> },
  { label: "C#", icon: <SiSharp aria-hidden="true" /> },
  { label: "TypeScript", icon: <SiTypescript aria-hidden="true" /> },
  { label: "Python", icon: <FaPython aria-hidden="true" /> },
  { label: "Docker", icon: <SiDocker aria-hidden="true" /> },
];

export default function Home() {
  const loopItems = [...technologyItems, ...technologyItems];

  // Scroll reveal animation hook
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('[data-reveal]').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <SiteShell>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        [data-reveal] {
          opacity: 0;
          animation: fadeInUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          animation-delay: var(--delay, 0s);
        }

        .revealed {
          opacity: 1 !important;
        }

        .card-hover:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 40px rgba(59, 130, 246, 0.15);
        }

        .card-hover:hover .icon-wrapper {
          transform: scale(1.1) rotate(5deg);
        }

        .segment-hover:hover {
          transform: translateY(-6px);
          box-shadow: 0 10px 30px rgba(59, 130, 246, 0.12);
        }

        .tech-hover:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 30px rgba(59, 130, 246, 0.15);
          border-color: #3b82f6;
        }

        .cta-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 40px rgba(59, 130, 246, 0.4);
        }

        .card-top-bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #3b82f6, #06b6d4);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .card-hover:hover .card-top-bar {
          transform: scaleX(1);
        }
      `}</style>

      {/* HERO SECTION - Improved */}
      <section className={styles.heroFull}>
        <video className={styles.heroVideo} autoPlay muted loop playsInline>
          <source src="/videos/herobackground.p4" type="video/mp4" />
          <source src="/videos/background.mp4" type="video/mp4" />
        </video>
        <div className={styles.heroOverlay} />
        <div className={styles.heroOrbA} />
        <div className={styles.heroOrbB} />
        <div className={styles.heroInner}>
          <div className={styles.heroText} data-reveal>
            <p className={styles.kicker}>DESENVOLVIMENTO DE SISTEMAS</p>
            <h1>Desenvolvimento de aplicações de alta performance</h1>
            <p>
              Criamos soluções robustas e escaláveis, alinhadas aos objetivos do seu negócio.
            </p>
            <button 
              className={`${styles.ctaButton} cta-hover`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 32px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)',
              }}
            >
              Solicitar proposta <FaArrowRight />
            </button>
          </div>
          <div className={styles.heroImageWrap} data-reveal>
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

      {/* DIFFERENTIALS SECTION - Enhanced */}
      <section className={`${styles.section} ${styles.sectionSoftBlue}`} data-reveal>
        <div className={styles.sectionHead} data-reveal>
          <p className={styles.kicker}>DIFERENCIAIS</p>
          <h2>Tecnologia de ponta explicada de forma simples</h2>
          <p>
            Você não precisa entender de programação para ter uma solução de alto nível. Cuidamos da parte técnica e entregamos um sistema bonito, seguro e fácil de usar pela sua equipe.
          </p>
        </div>
        <div className={styles.gridThree}>
          <article 
            className={`${styles.card} card-hover`} 
            data-reveal
            style={{ 
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div className="card-top-bar" />
            <span 
              className={`${styles.icon} ${styles.iconBlue} icon-wrapper`}
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05))',
                color: '#3b82f6',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <FaMobileScreen aria-hidden="true" />
            </span>
            <h3>Funciona em qualquer tela</h3>
            <p>Acesse do celular, tablet ou computador, sem instalar nada.</p>
          </article>

          <article 
            className={`${styles.card} card-hover`} 
            data-reveal
            style={{ 
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div className="card-top-bar" />
            <span 
              className={`${styles.icon} ${styles.iconBlue} icon-wrapper`}
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05))',
                color: '#3b82f6',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <FaClock aria-hidden="true" />
            </span>
            <h3>Disponível 24 horas</h3>
            <p>Sistema online para sua operação continuar rodando em qualquer horário.</p>
          </article>

          <article 
            className={`${styles.card} card-hover`} 
            data-reveal
            style={{ 
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div className="card-top-bar" />
            <span 
              className={`${styles.icon} ${styles.iconBlue} icon-wrapper`}
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05))',
                color: '#3b82f6',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <FaLock aria-hidden="true" />
            </span>
            <h3>Dados protegidos</h3>
            <p>Práticas de segurança de nível corporativo para manter informações críticas protegidas.</p>
          </article>
        </div>
        <article className={styles.callout} data-reveal>
          <h3>Projetos personalizados e sustentação contínua</h3>
          <p>
            Nossa estrutura atende desde criação de sites institucionais até desenvolvimento completo de grandes projetos em múltiplas plataformas.
          </p>
        </article>
      </section>

      {/* SEGMENTS SECTION - Enhanced */}
      <section className={styles.sectionBlue} data-reveal>
        <div className={styles.sectionHead} data-reveal>
          <p className={styles.kicker}>PARA QUEM É NOSSO TRABALHO</p>
          <h2>Soluções digitais para operações de diferentes segmentos</h2>
        </div>
        <div className={styles.gridFour}>
          <article 
            className={`${styles.segmentCard} segment-hover`} 
            data-reveal
            style={{ 
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <span 
              className={`${styles.icon} ${styles.iconBlue} icon-wrapper`}
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05))',
                color: '#3b82f6',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <FaStore aria-hidden="true" />
            </span>
            <h3>Comércios</h3>
            <p>Automação de pedidos, estoque e gestão para aumentar eficiência diária.</p>
          </article>

          <article 
            className={`${styles.segmentCard} segment-hover`} 
            data-reveal
            style={{ 
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <span 
              className={`${styles.icon} ${styles.iconBlue} icon-wrapper`}
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05))',
                color: '#3b82f6',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <FaBriefcase aria-hidden="true" />
            </span>
            <h3>Empresas de Serviços</h3>
            <p>Fluxos, atendimento e indicadores para operações de campo e escritório.</p>
          </article>

          <article 
            className={`${styles.segmentCard} segment-hover`} 
            data-reveal
            style={{ 
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <span 
              className={`${styles.icon} ${styles.iconBlue} icon-wrapper`}
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05))',
                color: '#3b82f6',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <FaIndustry aria-hidden="true" />
            </span>
            <h3>Indústrias</h3>
            <p>Sistemas para produção, controle de processos e tomada de decisão em tempo real.</p>
          </article>

          <article 
            className={`${styles.segmentCard} segment-hover`} 
            data-reveal
            style={{ 
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <span 
              className={`${styles.icon} ${styles.iconBlue} icon-wrapper`}
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05))',
                color: '#3b82f6',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <FaCartShopping aria-hidden="true" />
            </span>
            <h3>Varejo e E-commerce</h3>
            <p>Integração entre vendas, catálogo, logística e atendimento multicanal.</p>
          </article>
        </div>
      </section>

      {/* TECHNOLOGIES SECTION - Enhanced */}
      <section className={`${styles.section} ${styles.techSection}`} data-reveal>
        <div className={styles.sectionHead} data-reveal>
          <p className={styles.kicker}>TECNOLOGIAS</p>
          <h2>Stack moderna para performance e escalabilidade</h2>
        </div>
        <div className={styles.carousel} data-reveal>
          <div className={styles.track}>
            {loopItems.map((item, index) => (
              <span 
                className={`${styles.logoItem} tech-hover`}
                key={`${item.label}-${index}`} 
                title={item.label} 
                aria-label={item.label}
                style={{
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  color: '#3b82f6',
                }}
              >
                {item.icon}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT SECTION - Enhanced */}
      <section className={styles.contactSection} data-reveal>
        <div className={styles.contactGrid}>
          <article className={styles.contactCard} data-reveal>
            <p className={styles.kicker}>CONTATO</p>
            <h3>Pronto para lançar seu sistema, aplicativo ou site com segurança?</h3>
            <p>
              Vamos estruturar uma solução sob medida para seu desafio atual, com escopo claro, tecnologia certa e execução previsível.
            </p>
            <div className={styles.steps}>
              <div className={styles.stepItem} data-reveal>
                <span className={styles.stepNumber}>1</span>
                <div>
                  <h4>Diagnóstico</h4>
                  <p>Converse com nosso especialista para entender a melhor solução para seu projeto.</p>
                </div>
              </div>
              <div className={styles.stepItem} data-reveal>
                <span className={styles.stepNumber}>2</span>
                <div>
                  <h4>Plano de ação</h4>
                  <p>Nós criamos um plano de ação com escopo, prioridades e cronograma de execução.</p>
                </div>
              </div>
              <div className={styles.stepItem} data-reveal>
                <span className={styles.stepNumber}>3</span>
                <div>
                  <h4>Execução</h4>
                  <p>Desenvolvemos seu projeto com a tecnologia e o modelo de entrega ideal para o negócio.</p>
                </div>
              </div>
            </div>
          </article>

          <article className={styles.formCard} data-reveal>
            <h3>Solicitar proposta</h3>
            <ContactLeadForm buttonLabel="Solicitar contato" source="home" />
          </article>
        </div>
      </section>
    </SiteShell>
  );
}
