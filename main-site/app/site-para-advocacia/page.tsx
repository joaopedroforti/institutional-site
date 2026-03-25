'use client';
import Image from 'next/image';
import { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react';
import { FaLaravel, FaNodeJs, FaPhp, FaReact } from 'react-icons/fa6';
import {
  SiCodeigniter,
  SiCss,
  SiElementor,
  SiHtml5,
  SiJavascript,
  SiLaravel,
  SiMysql,
  SiNextdotjs,
  SiNodedotjs,
  SiPostgresql,
  SiReact,
  SiTailwindcss,
  SiTypescript,
  SiWordpress,
} from 'react-icons/si';
import { apiFetch } from '../lib/api';
import { getStoredVisitorSessionKey, trackInteraction, trackPageView } from '../lib/analytics';
import './page.css';

const DEFAULT_WA_NUMBER = '5519982214340';
const PAGE_PATH = '/site-para-advocacia';

type GeneralSettings = {
  contact_whatsapp: string;
  contact_whatsapp_url: string;
};

const WhatsappIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const faqs = [
  {
    q: 'Meu escritório vai aparecer no Google?',
    a: 'Sim. Desenvolvemos com SEO técnico para advocacia: estrutura semântica, performance, headings corretos e conteúdo orientado a intenção de busca local.',
  },
  {
    q: 'O site pode seguir a identidade do meu escritório?',
    a: 'Sim. Layout, cores, linguagem e posicionamento são personalizados para o perfil do seu escritório e das suas áreas de atuação.',
  },
  {
    q: 'Preciso pagar mensalidade?',
    a: 'Não. O investimento é único: R$ 399,90, sem assinatura e sem cobranças recorrentes. Para domínio e hospedagem (que não estão inclusos), indicamos serviços acessíveis e auxiliamos você em todo o processo de contratação. Atualizações futuras podem ser orçadas separadamente sob demanda.',
  },
  {
    q: 'Vocês ajudam com os textos das áreas do direito?',
    a: 'Sim. Estruturamos a copy com foco em clareza, autoridade e conversão, sempre respeitando o tom institucional e a comunicação profissional do setor jurídico.',
  },
  {
    q: 'Atendem escritórios iniciantes e também bancas maiores?',
    a: 'Sim. Projetamos desde páginas institucionais enxutas até estruturas mais completas com múltiplas áreas e páginas internas.',
  },
  {
    q: 'Em quanto tempo meu site fica pronto?',
    a: 'Após o briefing aprovado, entregamos em até 3 dias úteis. Em versões expressas, a publicação pode ocorrer antes, conforme escopo.',
  },
];

const TECH_STACK = [
  { icon: <SiNextdotjs />, label: 'Next.js' },
  { icon: <SiReact />, label: 'React' },
  { icon: <SiNodedotjs />, label: 'Node.js' },
  { icon: <FaPhp />, label: 'PHP' },
  { icon: <SiLaravel />, label: 'Laravel' },
  { icon: <SiCodeigniter />, label: 'CodeIgniter' },
  { icon: <SiWordpress />, label: 'WordPress' },
  { icon: <SiElementor />, label: 'Elementor' },
  { icon: <SiHtml5 />, label: 'HTML5' },
  { icon: <SiCss />, label: 'CSS3' },
  { icon: <SiJavascript />, label: 'JavaScript' },
  { icon: <SiPostgresql />, label: 'PostgreSQL' },
  { icon: <SiMysql />, label: 'MySQL' },
  { icon: <SiTypescript />, label: 'TypeScript' },
  { icon: <SiTailwindcss />, label: 'Tailwind CSS' },
  { icon: <FaReact />, label: 'React Native Web' },
  { icon: <FaLaravel />, label: 'Laravel Framework' },
  { icon: <FaNodeJs />, label: 'Node Runtime' },
];

function useIntersection(threshold = 0.15): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

type AnimatedItemProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  style?: CSSProperties;
};

function AnimatedItem({ children, className = '', delay = 0, style = {} }: AnimatedItemProps) {
  const [ref, visible] = useIntersection(0.1);
  return (
    <div
      ref={ref}
      className={`${className} ${visible ? 'visible' : ''}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </div>
  );
}

type FaqItemProps = {
  q: string;
  a: string;
  delay: number;
};

function FaqItem({ q, a, delay }: FaqItemProps) {
  const [open, setOpen] = useState(false);
  const [ref, visible] = useIntersection(0.1);
  return (
    <div
      ref={ref}
      className={`faq-item ${visible ? 'visible' : ''} ${open ? 'open' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <button className="faq-question" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        {q}
        <svg className="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <div className="faq-answer" aria-hidden={!open}>
        <p>{a}</p>
      </div>
    </div>
  );
}

export default function Page() {
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [waUrl, setWaUrl] = useState(`https://wa.me/${DEFAULT_WA_NUMBER}?text=${encodeURIComponent('Olá! Vim pela landing page e quero um site para advocacia.')}`);

  const duplicatedTech = [...TECH_STACK, ...TECH_STACK, ...TECH_STACK];

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const progress = max > 0 ? window.scrollY / max : 0;
      setScrolled(window.scrollY > 40);
      setScrollProgress(progress);
      doc.style.setProperty('--scroll-progress', String(progress));
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    void trackPageView(PAGE_PATH);

    void (async () => {
      try {
        const response = await apiFetch<{ data?: Partial<GeneralSettings> }>('/settings/general');
        const waNumber = String(response.data?.contact_whatsapp ?? '').replace(/\D/g, '');
        const waLink = String(response.data?.contact_whatsapp_url ?? '').trim();
        const message = encodeURIComponent('Olá! Vim pela landing page e quero um site para advocacia.');

        if (waLink) {
          setWaUrl(waLink.includes('?') ? waLink : `${waLink}?text=${message}`);
          return;
        }

        if (waNumber) {
          const normalized = waNumber.startsWith('55') ? waNumber : `55${waNumber}`;
          setWaUrl(`https://wa.me/${normalized}?text=${message}`);
        }
      } catch {
        // fallback para número padrão
      }
    })();
  }, []);

  const registerWhatsappConversion = async (origin: string) => {
    const storageKey = `forticorp-lp-advocacia-conversion-${origin}`;

    if (typeof window !== 'undefined' && sessionStorage.getItem(storageKey)) {
      await trackInteraction({
        eventType: 'whatsapp_button_click',
        element: 'button',
        label: origin,
        pagePath: PAGE_PATH,
        metadata: {
          event_name: 'Clique botao WhatsApp',
          where: 'LP sites para advocacia',
        },
      });
      return;
    }

    try {
      await apiFetch('/contacts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Visitante LP Advocacia',
          phone: null,
          email: null,
          company: null,
          message: `Conversao via botao WhatsApp (${origin})`,
          session_key: getStoredVisitorSessionKey(),
          source_url: typeof window !== 'undefined' ? window.location.href : null,
          referrer: typeof document !== 'undefined' ? document.referrer || null : null,
          metadata: {
            source: 'lp-site-para-advocacia',
            capture_kind: 'submitted',
            page_name: 'LP sites para advocacia',
            origin,
          },
        }),
      });

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(storageKey, '1');
      }
    } catch {
      // não bloqueia o clique
    }

    await trackInteraction({
      eventType: 'whatsapp_button_click',
      element: 'button',
      label: origin,
      pagePath: PAGE_PATH,
      metadata: {
        event_name: 'Clique botao WhatsApp',
        where: 'LP sites para advocacia',
      },
    });
  };

  const handleWhatsappClick = (origin: string) => {
    void registerWhatsappConversion(origin);
  };

  return (
    <div className="page-wrapper advocacia-theme">
      <div className="scroll-progress" style={{ transform: `scaleX(${scrollProgress})` }} />

      {/* Floating WA */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="wa-float"
        aria-label="Falar pelo WhatsApp"
        onClick={() => handleWhatsappClick('whatsapp-float')}
      >
        <WhatsappIcon />
      </a>

      {/* Navbar */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-logo-wrap">
          <Image
            src="/images/logo/logo_white.png"
            alt="Logo FortiCorp"
            width={162}
            height={42}
            className="nav-logo-img"
            priority
          />
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-grid" />
        <div className="hero-beam" />
        <div className="glow-blob glow-blob-1" />
        <div className="glow-blob glow-blob-2" />
        <div className="hero-badge">✦ Site Profissional Para Escritórios</div>
        <h1>
          Sua Advocacia Merece um Site que{' '}
          <span className="highlight">Gera Autoridade e Novos Contatos</span>
          , 24h por Dia.
        </h1>
        <p>
          Criamos sites para advogados(as) com posicionamento estratégico, linguagem profissional e estrutura pensada para converter visitas em atendimentos.
        </p>
        <div className="hero-actions">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp"
            onClick={() => handleWhatsappClick('hero-primary')}
          >
            <WhatsappIcon />
            Quero Meu Site Jurídico
          </a>
          <a href="#como-funciona" className="btn-blue">Ver Como Funciona</a>
        </div>
        <div className="hero-disclaimer" aria-label="Diferenciais">
          <span>Presença Jurídica Forte</span>
          <span>Posicionamento Local no Google</span>
          <span>Contato Direto no WhatsApp</span>
        </div>
        <div className="hero-scroll">
          <div className="scroll-dot" />
          <span>Role para saber mais</span>
        </div>
      </section>

      {/* Social proof */}
      <div className="social-proof">
        <div className="social-proof-inner">
          {[
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 13l7 7 9-14"/>
                </svg>
              ),
              label: 'Entrega Rápida',
              value: 'Projeto publicado rapidamente para seu escritório iniciar a captação digital quanto antes.',
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="20" y1="20" x2="16.65" y2="16.65" />
                </svg>
              ),
              label: 'SEO',
              value: 'Estrutura otimizada para pesquisas orgânicas e termos jurídicos da sua região.',
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="12" rx="2" />
                  <path d="M8 20h8" />
                  <path d="M12 16v4" />
                </svg>
              ),
              label: 'Código Puro',
              value: 'Seu escritório mantém controle total do projeto, com base sólida para crescer no futuro.',
            },
          ].map((item, i) => (
            <AnimatedItem key={i} className="proof-item" delay={i * 80}>
              <span className="proof-icon" aria-hidden="true">{item.icon}</span>
              <div className="proof-copy">
                <div className="proof-label">{item.label}</div>
                <strong>{item.value}</strong>
              </div>
            </AnimatedItem>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className="features">
        <div className="section-header">
          <span className="section-tag">Por que nos escolher</span>
          <h2>Tudo Que Seu Escritório Precisa<br /><span className="accent accent-animated">em um Só Lugar</span></h2>
          <p>Do posicionamento à publicação, cuidamos de toda a presença digital para você focar na atuação jurídica.</p>
        </div>
        <div className="cards-grid">
          {[
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              ),
              title: 'Apareça nas Buscas Locais',
              desc: 'SEO técnico e estrutura jurídica para seu escritório ser encontrado por clientes da sua cidade e região.',
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                </svg>
              ),
              title: 'Experiência Mobile Profissional',
              desc: 'Seu potencial cliente acessa do celular e encontra credibilidade, clareza e contato direto sem fricção.',
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              ),
              title: 'Conversão com Autoridade',
              desc: 'Copy e arquitetura de página para transmitir confiança e conduzir o visitante até o primeiro contato.',
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              ),
              title: 'Contato Imediato',
              desc: 'Botões estratégicos de WhatsApp para facilitar agendamento e acelerar o atendimento inicial.',
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              ),
              title: 'Design Institucional Jurídico',
              desc: 'Layout elegante e alinhado ao perfil do seu escritório, sem aparência genérica de template.',
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              ),
              title: 'Suporte e Evolução',
              desc: 'Após a entrega, seguimos disponíveis para ajustes e melhorias sob demanda.',
            },
          ].map((card, i) => (
            <AnimatedItem key={i} className="card" delay={i * 90}>
              <div className="card-icon">{card.icon}</div>
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
            </AnimatedItem>
          ))}
        </div>
      </section>

      {/* Solution */}
      <section className="solution">
        <div className="solution-inner">
          <div className="solution-content full">
            <span className="section-tag">O que você recebe</span>
            <h2>Sua Solução Completa,<br /><span className="accent accent-animated">para Advocacia.</span></h2>
            <p>Uma estrutura digital profissional para gerar autoridade jurídica, confiança e novos contatos qualificados.</p>
            <div className="solution-grid">
              {[
                'Páginas institucionais com foco em autoridade jurídica',
                'Estratégia de conteúdo para áreas de atuação',
                'Design sob medida para a identidade do escritório',
                'Botões de WhatsApp para contato rápido e objetivo',
                'Site responsivo, rápido e preparado para SEO local',
                'Painel administrativo para gerir conteúdos com autonomia',
              ].map((item, i) => (
                <AnimatedItem key={i} className="solution-grid-item" delay={i * 60}>
                  <span>{item}</span>
                </AnimatedItem>
              ))}
            </div>
          </div>
          <AnimatedItem className="solution-visual" delay={180}>
            <div className="mock-browser">
              <div className="mock-bar">
                <span className="mock-dot" />
                <span className="mock-dot" />
                <span className="mock-dot" />
                <span className="mock-url">seusite.com.br</span>
              </div>
              <div className="mock-content">
                <div className="mock-hero-bar" />
                <div className="mock-line" />
                <div className="mock-line" />
                <div className="mock-btn-row">
                  <div className="mock-btn" />
                  <div className="mock-btn ghost" />
                </div>
                <div className="mock-cards">
                  <div className="mock-card" />
                  <div className="mock-card" />
                  <div className="mock-card" />
                </div>
              </div>
            </div>
          </AnimatedItem>
        </div>
      </section>

      <section className="tech-stack">
        <div className="section-header">
          <span className="section-tag">Tecnologias</span>
          <h2>Temos conhecimento nas <span className="accent accent-animated">linguagens mais atuais do mercado</span>.</h2>
          <p>Tecnologias modernas para criar sites jurídicos rápidos, escaláveis e preparados para tráfego orgânico e performance.</p>
        </div>
        <div className="tech-marquee">
          <div className="tech-marquee-track">
            {duplicatedTech.map((item, index) => (
              <article className="tech-item" key={`tech-${item.label}-${index}`} title={item.label} aria-label={item.label}>
                <span className="tech-icon" aria-hidden="true">{item.icon}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="process" id="como-funciona">
        <div className="section-header">
          <span className="section-tag">Processo simples</span>
          <h2>Ter Seu Site Jurídico É Mais Fácil <span className="accent accent-animated">doque Você Imagina.</span></h2>
          <p>Em poucos passos, seu escritório entra no digital com posicionamento profissional.</p>
        </div>
        <div className="process-steps">
          {[
            {
              n: '01',
              title: 'Briefing do Escritório',
              desc: 'Entendemos suas áreas de atuação, perfil de cliente e objetivos para definir a estrutura ideal da sua página.',
            },
            {
              n: '02',
              title: 'Criação Jurídica',
              desc: 'Desenvolvemos o site com design institucional e copy estratégica para transmitir credibilidade e facilitar o contato.',
            },
            {
              n: '03',
              title: 'Publicação & Ajustes',
              desc: 'Após sua aprovação, publicamos o projeto e deixamos seu escritório pronto para captar novas oportunidades.',
            },
          ].map((step, i) => (
            <AnimatedItem key={i} className="process-step" delay={i * 120}>
              <div className="step-number">{step.n}</div>
              <div className="step-content">
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </AnimatedItem>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp"
            onClick={() => handleWhatsappClick('process-cta')}
          >
            <WhatsappIcon />
            Falar Sobre Meu Site Jurídico
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq">
        <div className="section-header">
          <span className="section-tag">Dúvidas comuns</span>
          <h2>Resolvemos Suas Dúvidas<br /><span className="accent accent-animated">(com clareza jurídica e técnica).</span></h2>
          <p>Transparência total para seu escritório decidir com segurança.</p>
        </div>
        <div className="faq-list">
          {faqs.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} delay={i * 70} />
          ))}
        </div>
      </section>

      <section className="domain-note">
        <p>* Domínio e hospedagem não inclusos. Auxiliamos em todo o processo de contratação.</p>
      </section>

      {/* CTA Final */}
      <section className="cta-final">
        <span className="section-tag">Pronto para começar?</span>
        <h2>Seu Próximo Cliente<br />Está <span className="accent">Buscando Seu Escritório</span> Agora.</h2>
        <p>Cada dia sem presença digital profissional é oportunidade indo para outro escritório.</p>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-whatsapp"
          onClick={() => handleWhatsappClick('final-cta')}
        >
          <WhatsappIcon />
          Falar com Especialista em Sites Jurídicos
        </a>
        <p style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          Resposta imediata · Sem compromisso
        </p>
      </section>

      {/* Footer */}
      <footer>
        <p>© {new Date().getFullYear()} FortiCorp · Todos os direitos reservados · <a href={waUrl} target="_blank" rel="noopener noreferrer" onClick={() => handleWhatsappClick('footer-link')}>Contato via WhatsApp</a></p>
      </footer>
    </div>
  );
}
