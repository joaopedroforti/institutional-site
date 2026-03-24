import { ArrowRight, Building2, Clock3, Percent, Settings2, Tags, UserCog, Workflow } from "lucide-react";
import { Link } from "react-router";
import PageShell from "./PageShell";

type SettingsCard = {
  title: string;
  description: string;
  icon: typeof Settings2;
  to: string;
  accent: string;
};

const SETTINGS_CARDS: SettingsCard[] = [
  {
    title: "Vendedores",
    description: "Cadastro, distribuicao de leads, metas e analitico por vendedor com filtros de periodo.",
    icon: UserCog,
    to: "/admin/configuracoes/vendedores",
    accent: "from-sky-500 to-blue-700",
  },
  {
    title: "Geral",
    description: "Ajustes centrais do sistema e configuracoes que afetam todo o fluxo comercial.",
    icon: Settings2,
    to: "/admin/configuracoes/gerais",
    accent: "from-indigo-500 to-blue-700",
  },
  {
    title: "Prazos",
    description: "Defina os prazos internos usados nos fluxos de onboarding e propostas.",
    icon: Clock3,
    to: "/admin/configuracoes/propostas",
    accent: "from-cyan-500 to-sky-700",
  },
  {
    title: "Informacoes da Empresa",
    description: "Dados institucionais exibidos no sistema e em pontos de contato com cliente.",
    icon: Building2,
    to: "/admin/configuracoes/empresa",
    accent: "from-blue-600 to-indigo-700",
  },
  {
    title: "Precificacao",
    description: "Regras, validacoes e parametros de proposta com tela mais organizada.",
    icon: Percent,
    to: "/admin/configuracoes/precificacao",
    accent: "from-blue-500 to-cyan-700",
  },
  {
    title: "Integracoes",
    description: "Central de integracoes. Conecte e gerencie os modulos externos do sistema.",
    icon: Workflow,
    to: "/admin/configuracoes/integracoes",
    accent: "from-sky-500 to-indigo-700",
  },
  {
    title: "Regras de Score",
    description: "Pesos, limites e faixas de score dos leads para priorizacao comercial.",
    icon: Settings2,
    to: "/admin/configuracoes/regras-score",
    accent: "from-cyan-500 to-blue-700",
  },
  {
    title: "Origens, Rotulos e Tags",
    description: "Mapeie origem dos leads em rotulos e tags de forma centralizada.",
    icon: Tags,
    to: "/admin/configuracoes/origens-tags",
    accent: "from-indigo-500 to-sky-700",
  },
];

export default function SettingsHomePage() {
  return (
    <PageShell>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 p-6 text-white md:p-7">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-100">Modulo Unificado</p>
          <h2 className="mt-2 text-2xl font-semibold md:text-3xl">Configuracoes do Sistema</h2>
          <p className="mt-2 max-w-3xl text-sm text-blue-50 md:text-base">
            Uma central unica para gerenciar vendedores, prazos, empresa, precificacao, integracoes e inteligencia comercial.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SETTINGS_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.to}
                to={card.to}
                className="group rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`inline-flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${card.accent} text-white shadow-sm`}
                  >
                    <Icon size={20} />
                  </span>
                  <ArrowRight size={18} className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-700" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{card.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{card.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

    </PageShell>
  );
}
