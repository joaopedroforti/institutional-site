import SiteShell from "../components/site-shell";
import styles from "./cases.module.css";

type CaseCard = {
  tags: string;
  company: string;
  project: string;
  description: string;
};

const cases: CaseCard[] = [
  {
    tags: "B2B | RH",
    company: "Inperson",
    project: "Sistema de Recrutamento e Seleção",
    description:
      "Desenvolvemos uma plataforma com análise de currículo, inteligência artificial para fit de vaga e avaliação comportamental em fluxo único.",
  },
  {
    tags: "E-commerce | Varejo",
    company: "NovaCasa",
    project: "Plataforma Omnichannel de Vendas",
    description:
      "Integramos loja virtual, ERP e logística para reduzir retrabalho, aumentar ticket médio e acelerar atendimento em múltiplos canais.",
  },
  {
    tags: "Indústria | Operações",
    company: "MetalPrime",
    project: "Dashboard de Produção em Tempo Real",
    description:
      "Criamos painéis operacionais com indicadores críticos de chão de fábrica para tomada de decisão rápida e controle de gargalos.",
  },
  {
    tags: "Serviços | Financeiro",
    company: "CredFlux",
    project: "Portal de Gestão Comercial",
    description:
      "Implementamos portal web para gestão de propostas, contratos e carteira de clientes com automações de aprovação e acompanhamento.",
  },
  {
    tags: "Saúde | Atendimento",
    company: "VivaCare",
    project: "Automação de Pré-Atendimento",
    description:
      "Construímos agentes automáticos para WhatsApp e voz, reduzindo tempo de espera e qualificando solicitações antes da equipe humana.",
  },
  {
    tags: "SaaS | Educação",
    company: "SkillPath",
    project: "Plataforma de Assinaturas",
    description:
      "Desenvolvemos um SaaS escalável com gestão de planos, cobrança recorrente, área do cliente e métricas de retenção em tempo real.",
  },
];

export default function CasesPage() {
  return (
    <SiteShell>
      <section className={styles.head}>
        <p className={styles.kicker}>RESULTADOS REAIS</p>
        <h1>Não vendemos horas, vendemos performance</h1>
        <p>Conheça algumas das histórias que ajudamos a construir para empresas de diferentes segmentos.</p>
      </section>

      <section className={styles.grid}>
        {cases.map((item) => (
          <article className={styles.card} key={item.company + item.project}>
            <p className={styles.tags}>{item.tags}</p>
            <h2 className={styles.company}>{item.company}</h2>
            <h3 className={styles.project}>{item.project}</h3>
            <p className={styles.description}>{item.description}</p>
          </article>
        ))}
      </section>
    </SiteShell>
  );
}
