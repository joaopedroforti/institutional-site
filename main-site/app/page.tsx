'use client';

import { useEffect, useRef } from 'react';
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
} from 'react-icons/fa6';
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
} from 'react-icons/si';
import ContactLeadForm from './components/contact-lead-form';
import SiteShell from './components/site-shell';

const technologyItems = [
  { label: 'Laravel', icon: <SiLaravel aria-hidden="true" /> },
  { label: 'Bootstrap', icon: <FaBootstrap aria-hidden="true" /> },
  { label: 'Tailwind CSS', icon: <SiTailwindcss aria-hidden="true" /> },
  { label: 'Node.js', icon: <FaNodeJs aria-hidden="true" /> },
  { label: 'Next.js', icon: <SiNextdotjs aria-hidden="true" /> },
  { label: 'React', icon: <FaReact aria-hidden="true" /> },
  { label: 'PHP', icon: <FaPhp aria-hidden="true" /> },
  { label: 'CSS', icon: <SiCss aria-hidden="true" /> },
  { label: 'WordPress', icon: <FaWordpress aria-hidden="true" /> },
  { label: 'PostgreSQL', icon: <SiPostgresql aria-hidden="true" /> },
  { label: 'n8n', icon: <SiN8N aria-hidden="true" /> },
  { label: 'Supabase', icon: <SiSupabase aria-hidden="true" /> },
  { label: 'C#', icon: <SiSharp aria-hidden="true" /> },
  { label: 'TypeScript', icon: <SiTypescript aria-hidden="true" /> },
  { label: 'Python', icon: <FaPython aria-hidden="true" /> },
  { label: 'Docker', icon: <SiDocker aria-hidden="true" /> },
];

const differentials = [
  {
    icon: <FaMobileScreen aria-hidden="true" />,
    title: 'Funciona em qualquer tela',
    description: 'Acesse do celular, tablet ou computador, sem instalar nada.',
  },
  {
    icon: <FaClock aria-hidden="true" />,
    title: 'Disponível 24 horas',
    description: 'Sistema online para sua operação continuar rodando em qualquer horário.',
  },
  {
    icon: <FaLock aria-hidden="true" />,
    title: 'Dados protegidos',
    description: 'Práticas de segurança de nível corporativo para manter informações críticas protegidas.',
  },
];

const segments = [
  {
    icon: <FaStore aria-hidden="true" />,
    title: 'Comércios',
    description: 'Automação de pedidos, estoque e gestão para aumentar eficiência diária.',
  },
  {
    icon: <FaBriefcase aria-hidden="true" />,
    title: 'Empresas de Serviços',
    description: 'Fluxos, atendimento e indicadores para operações de campo e escritório.',
  },
  {
    icon: <FaIndustry aria-hidden="true" />,
    title: 'Indústrias',
    description: 'Sistemas para produção, controle de processos e tomada de decisão em tempo real.',
  },
  {
    icon: <FaCartShopping aria-hidden="true" />,
    title: 'Varejo e E-commerce',
    description: 'Integração entre vendas, catálogo, logística e atendimento multicanal.',
  },
];

const processSteps = [
  {
    number: 1,
    title: 'Diagnóstico',
    description: 'Converse com nosso especialista para entender a melhor solução para seu projeto.',
  },
  {
    number: 2,
    title: 'Plano de ação',
    description: 'Nós criamos um plano de ação com escopo, prioridades e cronograma de execução.',
  },
  {
    number: 3,
    title: 'Execução',
    description: 'Desenvolvemos seu projeto com a tecnologia e o modelo de entrega ideal para o negócio.',
  },
];

function useScrollReveal() {
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
}

export default function Home() {
  const loopItems = [...technologyItems, ...technologyItems];
  const carouselRef = useRef<HTMLDivElement>(null);

  useScrollReveal();

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const scrollWidth = carousel.scrollWidth;
    const clientWidth = carousel.clientWidth;
    let scrollPos = 0;

    const interval = setInterval(() => {
      scrollPos += 1;
      if (scrollPos >= scrollWidth - clientWidth) {
        scrollPos = 0;
      }
      carousel.scrollLeft = scrollPos;
    }, 30);

    return () => clearInterval(interval);
  }, []);

  const styles = {
    pageWrapper: {
      width: '100%',
      overflowX: 'hidden' as const,
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    },
    heroSection: {
      position: 'relative' as const,
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      padding: '60px 20px',
    },
    heroBackground: {
      position: 'absolute' as const,
      inset: 0,
      background:
        'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)',
      zIndex: 1,
    },
    heroOverlay: {
      position: 'absolute' as const,
      inset: 0,
      background: 'linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.4) 100%)',
      zIndex: 2,
    },
    heroOrb: {
      position: 'absolute' as const,
      borderRadius: '50%',
      zIndex: 1,
    },
    heroOrbA: {
      width: '300px',
      height: '300px',
      background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)',
      top: '-100px',
      right: '-100px',
      animation: 'float 6s ease-in-out infinite',
    },
    heroOrbB: {
      width: '250px',
      height: '250px',
      background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
      bottom: '-50px',
      left: '-50px',
      animation: 'float 8s ease-in-out infinite reverse',
    },
    heroContent: {
      position: 'relative' as const,
      zIndex: 3,
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: '60px',
      alignItems: 'center',
      maxWidth: '1280px',
      width: '100%',
      margin: '0 auto',
    },
    heroTextBlock: {
      color: 'white',
      animation: 'fadeInLeft 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both',
    },
    heroTitle: {
      fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
      fontWeight: 800,
      lineHeight: 1.2,
      margin: '20px 0',
      letterSpacing: '-0.02em',
    },
    heroDescription: {
      fontSize: '1.125rem',
      color: 'rgba(255, 255, 255, 0.8)',
      lineHeight: 1.6,
      margin: '20px 0 30px',
      maxWidth: '500px',
    },
    kicker: {
      display: 'inline-block',
      fontSize: '0.875rem',
      fontWeight: 700,
      letterSpacing: '0.15em',
      color: '#3b82f6',
      textTransform: 'uppercase' as const,
      marginBottom: '12px',
    },
    ctaButton: {
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
    },
    heroImageBlock: {
      animation: 'fadeInRight 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s both',
    },
    heroImagePlaceholder: {
      position: 'relative' as const,
      width: '100%',
      aspectRatio: '4 / 3',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(59, 130, 246, 0.2)',
      animation: 'float 4s ease-in-out infinite',
    },
    section: {
      padding: '100px 20px',
      maxWidth: '1280px',
      margin: '0 auto',
    },
    sectionDark: {
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
    },
    sectionHeader: {
      textAlign: 'center' as const,
      marginBottom: '60px',
      animation: 'fadeInUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
    sectionTitle: {
      fontSize: 'clamp(2rem, 4vw, 2.75rem)',
      fontWeight: 800,
      color: '#0f172a',
      margin: '12px 0 20px',
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
    },
    sectionDescription: {
      fontSize: '1.0625rem',
      color: '#475569',
      lineHeight: 1.6,
      maxWidth: '600px',
      margin: '0 auto',
    },
    cardsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '30px',
      marginBottom: '60px',
    },
    card: {
      background: 'white',
      borderRadius: '12px',
      padding: '40px 30px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      border: '1px solid rgba(0, 0, 0, 0.05)',
      position: 'relative' as const,
      overflow: 'hidden',
    },
    iconWrapper: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '60px',
      height: '60px',
      borderRadius: '12px',
      fontSize: '28px',
      marginBottom: '20px',
      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05))',
      color: '#3b82f6',
    },
    cardTitle: {
      fontSize: '1.25rem',
      fontWeight: 700,
      color: '#0f172a',
      marginBottom: '12px',
      lineHeight: 1.4,
    },
    cardDescription: {
      fontSize: '0.9375rem',
      color: '#64748b',
      lineHeight: 1.6,
    },
    calloutBox: {
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      color: 'white',
      borderRadius: '16px',
      padding: '50px 40px',
      textAlign: 'center' as const,
      boxShadow: '0 20px 60px rgba(59, 130, 246, 0.2)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    segmentsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '25px',
    },
    segmentCard: {
      background: 'white',
      borderRadius: '12px',
      padding: '35px 25px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.06)',
      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      border: '1px solid rgba(0, 0, 0, 0.04)',
      cursor: 'pointer',
    },
    carouselWrapper: {
      position: 'relative' as const,
      margin: '40px 0',
    },
    carousel: {
      display: 'flex',
      gap: '30px',
      overflowX: 'auto' as const,
      scrollBehavior: 'smooth',
      padding: '20px 0',
      scrollbarWidth: 'none',
    },
    techItem: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      minWidth: '120px',
      padding: '25px 20px',
      background: 'white',
      borderRadius: '12px',
      border: '1px solid rgba(0, 0, 0, 0.06)',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      fontSize: '32px',
      color: '#3b82f6',
      textAlign: 'center' as const,
    },
    techLabel: {
      fontSize: '0.75rem',
      fontWeight: 600,
      color: '#64748b',
      whiteSpace: 'nowrap' as const,
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      maxWidth: '100%',
    },
    carouselGradient: {
      position: 'absolute' as const,
      right: 0,
      top: 0,
      bottom: 0,
      width: '100px',
      background: 'linear-gradient(90deg, transparent, #f8fafc)',
      pointerEvents: 'none' as const,
      borderRadius: '0 12px 12px 0',
    },
    contactSection: {
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '100px 20px',
      color: 'white',
    },
    contactContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: '60px',
      alignItems: 'start',
      maxWidth: '1280px',
      margin: '0 auto',
    },
    contactInfo: {
      animation: 'fadeInLeft 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both',
    },
    contactTitle: {
      fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
      fontWeight: 800,
      margin: '16px 0 20px',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    contactDescription: {
      fontSize: '1.0625rem',
      color: 'rgba(255, 255, 255, 0.8)',
      lineHeight: 1.6,
      marginBottom: '40px',
    },
    stepsContainer: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '30px',
    },
    stepItem: {
      display: 'flex',
      gap: '20px',
      animation: 'fadeInUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      animationDelay: 'var(--delay, 0s)',
      opacity: 0,
    },
    stepNumber: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '50px',
      height: '50px',
      minWidth: '50px',
      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      borderRadius: '50%',
      fontSize: '1.5rem',
      fontWeight: 700,
      boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)',
    },
    stepTitle: {
      fontSize: '1.125rem',
      fontWeight: 700,
      marginBottom: '8px',
    },
    stepDescription: {
      fontSize: '0.9375rem',
      color: 'rgba(255, 255, 255, 0.7)',
      lineHeight: 1.6,
    },
    contactForm: {
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '16px',
      padding: '40px',
      backdropFilter: 'blur(10px)',
      animation: 'fadeInRight 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both',
    },
    formTitle: {
      fontSize: '1.5rem',
      fontWeight: 700,
      marginBottom: '30px',
    },
    form: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '24px',
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px',
    },
    label: {
      fontSize: '0.9375rem',
      fontWeight: 600,
      color: 'rgba(255, 255, 255, 0.9)',
    },
    input: {
      background: 'rgba(255, 255, 255, 0.08)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '8px',
      padding: '12px 16px',
      color: 'white',
      fontSize: '1rem',
      fontFamily: 'inherit',
      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
    textarea: {
      background: 'rgba(255, 255, 255, 0.08)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '8px',
      padding: '12px 16px',
      color: 'white',
      fontSize: '1rem',
      fontFamily: 'inherit',
      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      resize: 'vertical' as const,
      minHeight: '120px',
    },
    submitButton: {
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
      marginTop: '10px',
    },
  };

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

        .card {
          position: relative;
          overflow: hidden;
        }

        .card::before {
          content: '';
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

        .card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 40px rgba(59, 130, 246, 0.15);
        }

        .card:hover::before {
          transform: scaleX(1);
        }

        .card:hover .icon-wrapper {
          transform: scale(1.1) rotate(5deg);
        }

        .segment-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 10px 30px rgba(59, 130, 246, 0.12);
        }

        .tech-item:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 30px rgba(59, 130, 246, 0.15);
          border-color: #3b82f6;
        }

        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 40px rgba(59, 130, 246, 0.4);
        }

        .submit-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 40px rgba(59, 130, 246, 0.4);
        }

        .carousel {
          scrollbar-width: none;
        }

        .carousel::-webkit-scrollbar {
          display: none;
        }

        @media (max-width: 768px) {
          [style*="gridTemplateColumns: 'repeat(auto-fit"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* HERO SECTION */}
      <section style={styles.heroSection}>
        <div style={styles.heroBackground} />
        <div style={styles.heroOverlay} />
        <div style={{ ...styles.heroOrb, ...styles.heroOrbA }} />
        <div style={{ ...styles.heroOrb, ...styles.heroOrbB }} />

        <div style={styles.heroContent}>
          <div style={styles.heroTextBlock} data-reveal>
            <p style={styles.kicker}>DESENVOLVIMENTO DE SISTEMAS</p>
            <h1 style={styles.heroTitle}>Desenvolvimento de aplicações de alta performance</h1>
            <p style={styles.heroDescription}>
              Criamos soluções robustas e escaláveis, alinhadas aos objetivos do seu negócio.
            </p>
            <button style={styles.ctaButton} className="cta-button">
              Solicitar proposta <FaArrowRight />
            </button>
          </div>

          <div style={styles.heroImageBlock} data-reveal>
            <div style={styles.heroImagePlaceholder}>
              <svg viewBox="0 0 400 300" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 10px 30px rgba(0, 0, 0, 0.2))' }}>
                <defs>
                  <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1e40af" />
                  </linearGradient>
                </defs>
                <rect width="400" height="300" fill="url(#grad1)" rx="12" />
                <rect x="20" y="20" width="360" height="260" fill="#ffffff" opacity="0.1" rx="8" />
                <circle cx="200" cy="80" r="30" fill="#ffffff" opacity="0.2" />
                <rect x="80" y="140" width="240" height="100" fill="#ffffff" opacity="0.15" rx="6" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* DIFFERENTIALS SECTION */}
      <section style={styles.section}>
        <div style={styles.sectionHeader} data-reveal>
          <p style={styles.kicker}>DIFERENCIAIS</p>
          <h2 style={styles.sectionTitle}>Tecnologia de ponta explicada de forma simples</h2>
          <p style={styles.sectionDescription}>
            Você não precisa entender de programação para ter uma solução de alto nível. 
            Cuidamos da parte técnica e entregamos um sistema bonito, seguro e fácil de usar pela sua equipe.
          </p>
        </div>

        <div style={styles.cardsGrid}>
          {differentials.map((item, index) => (
            <article key={index} style={styles.card} className="card" data-reveal style={{ '--delay': `${index * 0.1}s` } as React.CSSProperties}>
              <div style={styles.iconWrapper} className="icon-wrapper">
                {item.icon}
              </div>
              <h3 style={styles.cardTitle}>{item.title}</h3>
              <p style={styles.cardDescription}>{item.description}</p>
            </article>
          ))}
        </div>

        <article style={styles.calloutBox} data-reveal>
          <h3>Projetos personalizados e sustentação contínua</h3>
          <p>
            Nossa estrutura atende desde criação de sites institucionais até desenvolvimento 
            completo de grandes projetos em múltiplas plataformas.
          </p>
        </article>
      </section>

      {/* SEGMENTS SECTION */}
      <section style={{ ...styles.section, ...styles.sectionDark }}>
        <div style={styles.sectionHeader} data-reveal>
          <p style={styles.kicker}>PARA QUEM É NOSSO TRABALHO</p>
          <h2 style={styles.sectionTitle}>Soluções digitais para operações de diferentes segmentos</h2>
        </div>

        <div style={styles.segmentsGrid}>
          {segments.map((item, index) => (
            <article key={index} style={styles.segmentCard} className="segment-card" data-reveal style={{ '--delay': `${index * 0.1}s` } as React.CSSProperties}>
              <div style={styles.iconWrapper} className="icon-wrapper">
                {item.icon}
              </div>
              <h3 style={styles.cardTitle}>{item.title}</h3>
              <p style={styles.cardDescription}>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* TECHNOLOGIES SECTION */}
      <section style={styles.section}>
        <div style={styles.sectionHeader} data-reveal>
          <p style={styles.kicker}>TECNOLOGIAS</p>
          <h2 style={styles.sectionTitle}>Stack moderna para performance e escalabilidade</h2>
        </div>

        <div style={styles.carouselWrapper} data-reveal>
          <div style={styles.carousel} className="carousel" ref={carouselRef}>
            {loopItems.map((item, index) => (
              <div key={`${item.label}-${index}`} style={styles.techItem} className="tech-item" title={item.label} aria-label={item.label}>
                {item.icon}
                <span style={styles.techLabel}>{item.label}</span>
              </div>
            ))}
          </div>
          <div style={styles.carouselGradient} />
        </div>
      </section>

      {/* CONTACT SECTION */}
      <section style={styles.contactSection}>
        <div style={styles.contactContainer}>
          <article style={styles.contactInfo} data-reveal>
            <p style={styles.kicker}>CONTATO</p>
            <h2 style={styles.contactTitle}>Pronto para lançar seu sistema, aplicativo ou site com segurança?</h2>
            <p style={styles.contactDescription}>
              Vamos estruturar uma solução sob medida para seu desafio atual, com escopo claro, 
              tecnologia certa e execução previsível.
            </p>

            <div style={styles.stepsContainer}>
              {processSteps.map((step, index) => (
                <div key={step.number} style={styles.stepItem} data-reveal style={{ '--delay': `${index * 0.1}s` } as React.CSSProperties}>
                  <div style={styles.stepNumber}>{step.number}</div>
                  <div>
                    <h4 style={styles.stepTitle}>{step.title}</h4>
                    <p style={styles.stepDescription}>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article style={styles.contactForm} data-reveal>
            <h3 style={styles.formTitle}>Solicitar proposta</h3>
            <ContactLeadForm buttonLabel="Solicitar contato" source="home" />
          </article>
        </div>
      </section>
    </SiteShell>
  );
}


//Preciso que a primeira seção e a seção de contato, o backeground tenha largura total do sistema