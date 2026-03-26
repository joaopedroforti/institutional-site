import { ArrowRight, MessageCircleMore, PlugZap } from "lucide-react";
import { Link } from "react-router";
import PageShell from "./PageShell";

export default function IntegracoesSettingsPage() {
  return (
    <PageShell>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 p-6 text-white md:p-7">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-100">Integracoes</p>
          <h2 className="mt-2 text-2xl font-semibold md:text-3xl">Central de Integracoes</h2>
          <p className="mt-2 max-w-2xl text-sm text-blue-50 md:text-base">
            Gerencie conectores externos e pixels de rastreamento em módulos dedicados.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Link
            to="/admin/configuracoes/whatsapp"
            className="group rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-sm">
                <MessageCircleMore size={20} />
              </span>
              <ArrowRight size={18} className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-700" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">WhatsApp</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Configuração da instância, assinatura de mensagens e ajustes operacionais do módulo WhatsApp.
            </p>
          </Link>

          <Link
            to="/admin/configuracoes/integracoes/meta"
            className="group rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-blue-500 text-white shadow-sm">
                <span className="text-base font-black tracking-tight">M</span>
              </span>
              <ArrowRight size={18} className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-700" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">Meta Pixel</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Ative o Pixel da Meta, configure Pixel ID e correspondência avançada automática.
            </p>
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4 text-sm text-cyan-900">
        <div className="flex items-start gap-3">
          <PlugZap size={18} className="mt-0.5 text-cyan-700" />
          <p>
            As configurações de Pixel são aplicadas automaticamente no main-site quando o módulo estiver ativo.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
