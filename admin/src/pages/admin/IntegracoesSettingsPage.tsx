import { useEffect, useState } from "react";
import { ArrowRight, BrainCircuit, MessageCircleMore, PlugZap } from "lucide-react";
import { Link } from "react-router";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../lib/api";
import type { IntegrationsSettingsResponse, WhatsAppSettingsResponse } from "../../types/admin";

export default function IntegracoesSettingsPage() {
  const { token } = useAuth();
  const [whatsAppActive, setWhatsAppActive] = useState(true);
  const [metaActive, setMetaActive] = useState(false);
  const [geminiActive, setGeminiActive] = useState(false);

  useEffect(() => {
    if (!token) {
      setWhatsAppActive(true);
      setMetaActive(false);
      setGeminiActive(false);
      return;
    }

    let mounted = true;

    void Promise.all([
      apiRequest<IntegrationsSettingsResponse>("/api/admin/settings/integrations", {}, token),
      apiRequest<WhatsAppSettingsResponse>("/api/admin/whatsapp/settings", {}, token),
    ])
      .then(([integrationsResponse, whatsappResponse]) => {
        if (!mounted) {
          return;
        }

        setMetaActive(Boolean(integrationsResponse.data?.meta_pixel?.enabled));
        setGeminiActive(Boolean(integrationsResponse.data?.gemini?.enabled));

        const explicitActive = whatsappResponse.data?.instance?.is_active;
        if (typeof explicitActive === "boolean") {
          setWhatsAppActive(explicitActive);
        } else {
          setWhatsAppActive(true);
        }
      })
      .catch(() => {
        if (!mounted) {
          return;
        }

        setWhatsAppActive(true);
        setMetaActive(false);
        setGeminiActive(false);
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  const cardClasses = (active: boolean) =>
    active
      ? "group rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:shadow-md"
      : "group rounded-2xl border border-slate-200 bg-slate-100 p-4 opacity-80 transition hover:border-slate-300 hover:bg-slate-50";

  const arrowClasses = (active: boolean) =>
    active
      ? "text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-700"
      : "text-slate-400 transition";

  const iconClasses = (active: boolean, activeGradient: string) =>
    active
      ? `inline-flex size-11 items-center justify-center rounded-xl ${activeGradient} text-white shadow-sm`
      : "inline-flex size-11 items-center justify-center rounded-xl bg-slate-300 text-slate-600";

  const statusBadge = (active: boolean) =>
    active ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700" : "rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600";

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
            className={cardClasses(whatsAppActive)}
          >
            <div className="flex items-start justify-between gap-3">
              <span className={iconClasses(whatsAppActive, "bg-gradient-to-br from-emerald-500 to-emerald-700")}>
                <MessageCircleMore size={20} />
              </span>
              <div className="flex items-center gap-2">
                <span className={statusBadge(whatsAppActive)}>{whatsAppActive ? "Ativo" : "Inativo"}</span>
                <ArrowRight size={18} className={arrowClasses(whatsAppActive)} />
              </div>
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">WhatsApp</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Configuração da instância, assinatura de mensagens e ajustes operacionais do módulo WhatsApp.
            </p>
          </Link>

          <Link
            to="/admin/configuracoes/integracoes/meta"
            className={cardClasses(metaActive)}
          >
            <div className="flex items-start justify-between gap-3">
              <span className={iconClasses(metaActive, "bg-gradient-to-br from-blue-700 to-blue-500")}>
                <span className="text-base font-black tracking-tight">M</span>
              </span>
              <div className="flex items-center gap-2">
                <span className={statusBadge(metaActive)}>{metaActive ? "Ativo" : "Inativo"}</span>
                <ArrowRight size={18} className={arrowClasses(metaActive)} />
              </div>
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">Meta Pixel</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Ative o Pixel da Meta, configure Pixel ID e correspondência avançada automática.
            </p>
          </Link>

          <Link
            to="/admin/configuracoes/integracoes/gemini"
            className={cardClasses(geminiActive)}
          >
            <div className="flex items-start justify-between gap-3">
              <span className={iconClasses(geminiActive, "bg-gradient-to-br from-indigo-600 to-violet-700")}>
                <BrainCircuit size={20} />
              </span>
              <div className="flex items-center gap-2">
                <span className={statusBadge(geminiActive)}>{geminiActive ? "Ativo" : "Inativo"}</span>
                <ArrowRight size={18} className={arrowClasses(geminiActive)} />
              </div>
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">Gemini</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Ative IA no WhatsApp para gerar resumo da conversa e orientacoes de linguagem por contato.
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
