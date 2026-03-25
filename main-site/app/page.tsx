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
    document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));
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
    let scrollPos = 0;
    const interval = setInterval(() => {
      scrollPos += 1;
      if (scrollPos >= carousel.scrollWidth - carousel.clientWidth) scrollPos = 0;
      carousel.scrollLeft = scrollPos;
    }, 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <SiteShell>
      <style>{`
        /* ── Reset ────────────────────────────────────────────── */
        *, *::before, *::after { box-sizing: border-box; }

        /* ── Keyframes ────────────────────────────────────────── */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-20px); }
        }

        /* ── Scroll reveal ────────────────────────────────────── */
        [data-reveal] {
          opacity: 0;
          animation: fadeInUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          animation-delay: var(--delay, 0s);
        }
        .revealed { opacity: 1 !important; }

        /* ── Shared helpers ───────────────────────────────────── */
        .hp-kicker {
          display: inline-block;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          color: #3b82f6;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .hp-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 56px; height: 56px;
          border-radius: 12px;
          font-size: 26px;
          margin-bottom: 18px;
          background: linear-gradient(135deg, rgba(59,130,246,.1), rgba(59,130,246,.05));
          color: #3b82f6;
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
          flex-shrink: 0;
        }

        /* ── CTA button ───────────────────────────────────────── */
        .hp-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 32px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s;
          box-shadow: 0 10px 30px rgba(59,130,246,.3);
        }
        .hp-cta-btn:hover { transform: translateY(-2px); box-shadow: 0 15px 40px rgba(59,130,246,.4); }

        /* ─────────────────────────────────────────────────────────
           HERO  — background ocupa 100% da largura
        ───────────────────────────────────────────────────────── */
        .hp-hero {
          position: relative;
          width: 100vw;
          margin-left: calc(50% - 50vw);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          padding: 80px 20px 60px;
        }
        .hp-hero-bg {
          position: absolute; inset: 0; z-index: 1;
          background:
            radial-gradient(circle at 20% 50%, rgba(59,130,246,.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(99,102,241,.10) 0%, transparent 50%);
        }
        .hp-hero-overlay {
          position: absolute; inset: 0; z-index: 2;
          background: linear-gradient(180deg, transparent 0%, rgba(15,23,42,.4) 100%);
        }
        .hp-hero-orb { position: absolute; border-radius: 50%; z-index: 1; }
        .hp-hero-orb-a {
          width: 300px; height: 300px; top: -100px; right: -100px;
          background: radial-gradient(circle, rgba(59,130,246,.2) 0%, transparent 70%);
          animation: float 6s ease-in-out infinite;
        }
        .hp-hero-orb-b {
          width: 250px; height: 250px; bottom: -50px; left: -50px;
          background: radial-gradient(circle, rgba(99,102,241,.15) 0%, transparent 70%);
          animation: float 8s ease-in-out infinite reverse;
        }
        /* Conteúdo centralizado, max 1280px */
        .hp-hero-inner {
          position: relative; z-index: 3;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
          max-width: 1280px;
          width: 100%;
          margin: 0 auto;
        }
        .hp-hero-text { color: white; animation: fadeInLeft 1s cubic-bezier(0.34,1.56,0.64,1) 0.2s both; }
        .hp-hero-title {
          font-size: clamp(2rem, 5vw, 3.5rem);
          font-weight: 800; line-height: 1.2;
          margin: 16px 0; letter-spacing: -0.02em;
        }
        .hp-hero-desc {
          font-size: 1.0625rem; color: rgba(255,255,255,.8);
          line-height: 1.6; margin: 16px 0 28px; max-width: 500px;
        }
        .hp-hero-img-col { animation: fadeInRight 1s cubic-bezier(0.34,1.56,0.64,1) 0.4s both; }
        .hp-hero-img-wrap {
          width: 100%; aspect-ratio: 4/3;
          border-radius: 16px; overflow: hidden;
          box-shadow: 0 20px 60px rgba(59,130,246,.2);
          animation: float 4s ease-in-out infinite;
        }

        /* ─────────────────────────────────────────────────────────
           INNER SECTIONS
        ───────────────────────────────────────────────────────── */
        .hp-section {
          padding: 80px 20px;
          max-width: 1280px;
          margin: 0 auto;
        }
        /* Wrapper de background (segments) */
        .hp-section-bg-wrap {
          width: 100%;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        }
        .hp-section-header { text-align: center; margin-bottom: 56px; }
        .hp-section-title {
          font-size: clamp(1.75rem, 4vw, 2.75rem);
          font-weight: 800; color: #0f172a;
          margin: 10px 0 16px; line-height: 1.2; letter-spacing: -0.01em;
        }
        .hp-section-desc {
          font-size: 1.0625rem; color: #475569;
          line-height: 1.6; max-width: 600px; margin: 0 auto;
        }

        /* Cards */
        .hp-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 28px;
          margin-bottom: 56px;
        }
        .hp-card {
          position: relative; overflow: hidden;
          background: white; border-radius: 12px;
          padding: 40px 30px;
          box-shadow: 0 4px 20px rgba(0,0,0,.08);
          border: 1px solid rgba(0,0,0,.05);
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s;
        }
        .hp-card::before {
          content: ''; position: absolute;
          top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #3b82f6, #06b6d4);
          transform: scaleX(0); transform-origin: left;
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .hp-card:hover { transform: translateY(-8px); box-shadow: 0 12px 40px rgba(59,130,246,.15); }
        .hp-card:hover::before { transform: scaleX(1); }
        .hp-card:hover .hp-icon { transform: scale(1.1) rotate(5deg); }
        .hp-card-title { font-size: 1.2rem; font-weight: 700; color: #0f172a; margin-bottom: 10px; }
        .hp-card-desc  { font-size: 0.9375rem; color: #64748b; line-height: 1.6; margin: 0; }

        /* Callout */
        .hp-callout {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white; border-radius: 16px; padding: 48px 40px;
          text-align: center; box-shadow: 0 20px 60px rgba(59,130,246,.2);
          border: 1px solid rgba(255,255,255,.1);
        }
        .hp-callout h3 { font-size: 1.4rem; font-weight: 700; margin: 0 0 12px; }
        .hp-callout p  { font-size: 1rem; opacity: .9; line-height: 1.6; margin: 0; }

        /* Segments */
        .hp-segments-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 24px;
        }
        .hp-segment-card {
          background: white; border-radius: 12px; padding: 35px 25px;
          box-shadow: 0 4px 15px rgba(0,0,0,.06);
          border: 1px solid rgba(0,0,0,.04);
          cursor: pointer;
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s;
        }
        .hp-segment-card:hover { transform: translateY(-6px); box-shadow: 0 10px 30px rgba(59,130,246,.12); }
        .hp-segment-card:hover .hp-icon { transform: scale(1.1) rotate(5deg); }

        /* Technologies */
        .hp-carousel-wrap { position: relative; margin: 40px 0; }
        .hp-carousel {
          display: flex; gap: 20px;
          overflow-x: auto; scroll-behavior: smooth;
          padding: 20px 0; scrollbar-width: none;
        }
        .hp-carousel::-webkit-scrollbar { display: none; }
        .hp-carousel-fade {
          position: absolute; right: 0; top: 0; bottom: 0; width: 80px;
          background: linear-gradient(90deg, transparent, #f8fafc);
          pointer-events: none;
        }
        .hp-tech-item {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 10px; min-width: 110px;
          padding: 22px 16px;
          background: white; border-radius: 12px;
          border: 1px solid rgba(0,0,0,.06);
          box-shadow: 0 2px 10px rgba(0,0,0,.04);
          font-size: 30px; color: #3b82f6;
          text-align: center; flex-shrink: 0;
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s, border-color 0.3s;
        }
        .hp-tech-item:hover { transform: translateY(-8px); box-shadow: 0 12px 30px rgba(59,130,246,.15); border-color: #3b82f6; }
        .hp-tech-label {
          font-size: 0.7rem; font-weight: 600; color: #64748b;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
        }

        /* ─────────────────────────────────────────────────────────
           CONTACT  — background ocupa 100% da largura
        ───────────────────────────────────────────────────────── */
        .hp-contact-wrap {
          width: 100vw;
          margin-left: calc(50% - 50vw);
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        }
        /* Conteúdo centralizado, max 1280px */
        .hp-contact-inner {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: start;
          max-width: 1280px;
          margin: 0 auto;
          padding: 100px 20px;
          color: white;
        }
        .hp-contact-info { animation: fadeInLeft 1s cubic-bezier(0.34,1.56,0.64,1) 0.2s both; }
        .hp-contact-title {
          font-size: clamp(1.5rem, 3vw, 2.25rem);
          font-weight: 800; margin: 14px 0 18px;
          line-height: 1.3; letter-spacing: -0.01em;
        }
        .hp-contact-desc {
          font-size: 1.0625rem; color: rgba(255,255,255,.8);
          line-height: 1.6; margin-bottom: 40px;
        }
        .hp-steps { display: flex; flex-direction: column; gap: 28px; }
        .hp-step  { display: flex; gap: 18px; align-items: flex-start; }
        .hp-step-num {
          display: flex; align-items: center; justify-content: center;
          width: 46px; height: 46px; min-width: 46px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border-radius: 50%; font-size: 1.25rem; font-weight: 700;
          box-shadow: 0 10px 30px rgba(59,130,246,.3); color: white;
        }
        .hp-step-title { font-size: 1.0625rem; font-weight: 700; margin: 0 0 6px; }
        .hp-step-desc  { font-size: 0.9375rem; color: rgba(255,255,255,.7); line-height: 1.6; margin: 0; }
        .hp-contact-form {
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 16px; padding: 40px;
          backdrop-filter: blur(10px);
          animation: fadeInRight 1s cubic-bezier(0.34,1.56,0.64,1) 0.2s both;
        }
        .hp-form-title { font-size: 1.4rem; font-weight: 700; margin-bottom: 28px; color: white; }

        /* ─────────────────────────────────────────────────────────
           RESPONSIVO  ≤ 768px
        ───────────────────────────────────────────────────────── */
        @media (max-width: 768px) {

          /* Hero */
          .hp-hero {
            min-height: auto;
            padding: 72px 16px 48px;
            align-items: flex-start;
          }
          .hp-hero-inner {
            grid-template-columns: 1fr;
            gap: 32px;
            text-align: center;
          }
          .hp-hero-text {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .hp-hero-desc { max-width: 100%; text-align: center; }
          .hp-hero-orb-a { width: 180px; height: 180px; top: -60px; right: -60px; }
          .hp-hero-orb-b { width: 150px; height: 150px; bottom: -30px; left: -30px; }
          .hp-hero-img-wrap { max-width: 320px; margin: 0 auto; }

          /* Sections */
          .hp-section { padding: 56px 16px; }
          .hp-section-header { margin-bottom: 36px; }

          /* Differentials: 1 coluna */
          .hp-cards-grid { grid-template-columns: 1fr; gap: 16px; margin-bottom: 36px; }
          .hp-card { padding: 28px 20px; }

          /* Callout */
          .hp-callout { padding: 32px 20px; }
          .hp-callout h3 { font-size: 1.2rem; }

          /* Segments: 2 colunas no tablet, 1 no mobile */
          .hp-segments-grid { grid-template-columns: 1fr 1fr; gap: 14px; }
          .hp-segment-card { padding: 22px 16px; }

          /* Tech carousel */
          .hp-tech-item { min-width: 88px; font-size: 26px; padding: 16px 10px; }

          /* Contact */
          .hp-contact-inner {
            grid-template-columns: 1fr;
            gap: 36px;
            padding: 60px 16px;
          }
          .hp-contact-form { padding: 28px 18px; }
        }

        /* ─────────────────────────────────────────────────────────
           RESPONSIVO  ≤ 480px  (telas pequenas)
        ───────────────────────────────────────────────────────── */
        @media (max-width: 480px) {
          .hp-hero { padding: 64px 14px 40px; }
          .hp-section { padding: 48px 14px; }
          .hp-contact-inner { padding: 48px 14px; }

          /* Segments cai para 1 coluna */
          .hp-segments-grid { grid-template-columns: 1fr; gap: 12px; }

          /* Ícone menor */
          .hp-icon { width: 48px; height: 48px; font-size: 22px; }

          /* Carousel mais compacto */
          .hp-carousel { gap: 12px; }
          .hp-tech-item { min-width: 76px; font-size: 22px; padding: 14px 8px; gap: 8px; }
        }
      `}</style>

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="hp-hero">
        <div className="hp-hero-bg" />
        <div className="hp-hero-overlay" />
        <div className="hp-hero-orb hp-hero-orb-a" />
        <div className="hp-hero-orb hp-hero-orb-b" />

        <div className="hp-hero-inner">
          <div className="hp-hero-text" data-reveal>
            <p className="hp-kicker">DESENVOLVIMENTO DE SISTEMAS</p>
            <h1 className="hp-hero-title">Desenvolvimento de aplicações de alta performance</h1>
            <p className="hp-hero-desc">
              Criamos soluções robustas e escaláveis, alinhadas aos objetivos do seu negócio.
            </p>
            <button className="hp-cta-btn">
              Solicitar proposta <FaArrowRight />
            </button>
          </div>

          <div className="hp-hero-img-col" data-reveal>
            <div className="hp-hero-img-wrap">
              <svg viewBox="0 0 400 300" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 10px 30px rgba(0,0,0,.2))' }}>
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

      {/* ─── DIFFERENTIALS ────────────────────────────────────────────────── */}
      <div className="hp-section">
        <div className="hp-section-header" data-reveal>
          <p className="hp-kicker">DIFERENCIAIS</p>
          <h2 className="hp-section-title">Tecnologia de ponta explicada de forma simples</h2>
          <p className="hp-section-desc">
            Você não precisa entender de programação para ter uma solução de alto nível.
            Cuidamos da parte técnica e entregamos um sistema bonito, seguro e fácil de usar pela sua equipe.
          </p>
        </div>

        <div className="hp-cards-grid">
          {differentials.map((item, index) => (
            <article
              key={index}
              className="hp-card"
              style={{ '--delay': `${index * 0.1}s` } as React.CSSProperties}
              data-reveal
            >
              <div className="hp-icon">{item.icon}</div>
              <h3 className="hp-card-title">{item.title}</h3>
              <p className="hp-card-desc">{item.description}</p>
            </article>
          ))}
        </div>

        <article className="hp-callout" data-reveal>
          <h3>Projetos personalizados e sustentação contínua</h3>
          <p>
            Nossa estrutura atende desde criação de sites institucionais até desenvolvimento
            completo de grandes projetos em múltiplas plataformas.
          </p>
        </article>
      </div>

      {/* ─── SEGMENTS ─────────────────────────────────────────────────────── */}
      <div className="hp-section-bg-wrap">
        <div className="hp-section">
          <div className="hp-section-header" data-reveal>
            <p className="hp-kicker">PARA QUEM É NOSSO TRABALHO</p>
            <h2 className="hp-section-title">Soluções digitais para operações de diferentes segmentos</h2>
          </div>

          <div className="hp-segments-grid">
            {segments.map((item, index) => (
              <article
                key={index}
                className="hp-segment-card"
                style={{ '--delay': `${index * 0.1}s` } as React.CSSProperties}
                data-reveal
              >
                <div className="hp-icon">{item.icon}</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>{item.title}</h3>
                <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* ─── TECHNOLOGIES ─────────────────────────────────────────────────── */}
      <div className="hp-section">
        <div className="hp-section-header" data-reveal>
          <p className="hp-kicker">TECNOLOGIAS</p>
          <h2 className="hp-section-title">Stack moderna para performance e escalabilidade</h2>
        </div>

        <div className="hp-carousel-wrap" data-reveal>
          <div className="hp-carousel" ref={carouselRef}>
            {loopItems.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className="hp-tech-item"
                title={item.label}
                aria-label={item.label}
              >
                {item.icon}
                <span className="hp-tech-label">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="hp-carousel-fade" />
        </div>
      </div>

      {/* ─── CONTACT ──────────────────────────────────────────────────────── */}
      <div className="hp-contact-wrap">
        <div className="hp-contact-inner">
          <article className="hp-contact-info" data-reveal>
            <p className="hp-kicker">CONTATO</p>
            <h2 className="hp-contact-title">Pronto para lançar seu sistema, aplicativo ou site com segurança?</h2>
            <p className="hp-contact-desc">
              Vamos estruturar uma solução sob medida para seu desafio atual, com escopo claro,
              tecnologia certa e execução previsível.
            </p>

            <div className="hp-steps">
              {processSteps.map((step, index) => (
                <div
                  key={step.number}
                  className="hp-step"
                  style={{ '--delay': `${index * 0.1}s` } as React.CSSProperties}
                  data-reveal
                >
                  <div className="hp-step-num">{step.number}</div>
                  <div>
                    <h4 className="hp-step-title">{step.title}</h4>
                    <p className="hp-step-desc">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="hp-contact-form" data-reveal>
            <h3 className="hp-form-title">Solicitar proposta</h3>
            <ContactLeadForm buttonLabel="Solicitar contato" source="home" />
          </article>
        </div>
      </div>
    </SiteShell>
  );
}
