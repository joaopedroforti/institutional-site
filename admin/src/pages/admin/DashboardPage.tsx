import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, CalendarDays, Eye, LineChart, MousePointerClick, Users } from "lucide-react";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import type { DashboardResponse } from "../../types/admin";
import LoadingState from "../../components/common/LoadingState";

type SummaryCard = {
  label: string;
  value: number;
  icon: typeof Users;
  accent: string;
};

function ratio(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (value / max) * 100));
}

function formatDateLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 29);
    return date.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const load = async () => {
      if (!token) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const query = new URLSearchParams({ from, to });
        const response = await apiRequest<DashboardResponse>(`/api/admin/dashboard?${query.toString()}`, {}, token);
        setData(response);
      } catch (requestError) {
        const message =
          requestError instanceof ApiError
            ? requestError.message
            : "Nao foi possivel carregar o dashboard.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token, from, to]);

  const summaryCards: SummaryCard[] = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      {
        label: "Leads Totais",
        value: data.summary.contacts_total,
        icon: Users,
        accent: "from-blue-500 to-blue-700",
      },
      {
        label: "Sessoes",
        value: data.summary.sessions_total,
        icon: Activity,
        accent: "from-cyan-500 to-blue-700",
      },
      {
        label: "Page Views",
        value: data.summary.page_views_total,
        icon: Eye,
        accent: "from-indigo-500 to-blue-700",
      },
      {
        label: "Interacoes",
        value: data.summary.interactions_total,
        icon: MousePointerClick,
        accent: "from-sky-500 to-indigo-700",
      },
      {
        label: "Acessos de Proposta",
        value: data.summary.proposal_accesses_total,
        icon: LineChart,
        accent: "from-emerald-500 to-cyan-700",
      },
      {
        label: "Leads Pendentes",
        value: data.summary.contacts_pending,
        icon: CalendarDays,
        accent: "from-amber-500 to-orange-600",
      },
    ];
  }, [data]);

  const dailySessions = useMemo(() => data?.daily_sessions ?? [], [data]);
  const dailyPageViews = useMemo(() => data?.daily_page_views ?? [], [data]);
  const dailyInteractions = useMemo(() => data?.daily_interactions ?? [], [data]);

  const maxDailySessions = useMemo(() => Math.max(1, ...dailySessions.map((item) => item.total)), [dailySessions]);
  const maxDailyPageViews = useMemo(() => Math.max(1, ...dailyPageViews.map((item) => item.total)), [dailyPageViews]);
  const maxDailyInteractions = useMemo(() => Math.max(1, ...dailyInteractions.map((item) => item.total)), [dailyInteractions]);

  return (
    <PageShell>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 p-6 text-white md:p-7">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-100">Dashboard</p>
          <h2 className="mt-2 text-2xl font-semibold md:text-3xl">Analitico Completo</h2>
          <p className="mt-2 max-w-3xl text-sm text-blue-50 md:text-base">
            Visao consolidada de acessos, leads e comportamento de navegacao com filtros por periodo.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="text-sm text-slate-700">
            De
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            Ate
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const start = new Date();
                start.setDate(today.getDate() - 29);
                setFrom(start.toISOString().slice(0, 10));
                setTo(today.toISOString().slice(0, 10));
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              Ultimos 30 dias
            </button>
          </div>
        </div>
      </section>

      {loading && <LoadingState label="Carregando indicadores..." />}

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>}

      {!loading && !error && data && (
        <>
          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
                      <p className="mt-2 text-3xl font-semibold text-slate-900">{card.value}</p>
                    </div>
                    <span className={`inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.accent} text-white`}>
                      <Icon size={18} />
                    </span>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-700" />
                <h3 className="text-base font-semibold text-slate-900">Acessos por dia (sessoes)</h3>
              </div>
              <div className="space-y-2">
                {dailySessions.length === 0 && <p className="text-sm text-slate-500">Sem dados no periodo.</p>}
                {dailySessions.slice(-14).map((item) => (
                  <div key={`session-${item.date}`}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                      <span>{formatDateLabel(item.date)}</span>
                      <span className="font-semibold text-slate-800">{item.total}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: `${ratio(item.total, maxDailySessions)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <Eye size={18} className="text-blue-700" />
                <h3 className="text-base font-semibold text-slate-900">Page views por dia</h3>
              </div>
              <div className="space-y-2">
                {dailyPageViews.length === 0 && <p className="text-sm text-slate-500">Sem dados no periodo.</p>}
                {dailyPageViews.slice(-14).map((item) => (
                  <div key={`views-${item.date}`}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                      <span>{formatDateLabel(item.date)}</span>
                      <span className="font-semibold text-slate-800">{item.total}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500" style={{ width: `${ratio(item.total, maxDailyPageViews)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <MousePointerClick size={18} className="text-blue-700" />
                <h3 className="text-base font-semibold text-slate-900">Interacoes por dia</h3>
              </div>
              <div className="space-y-2">
                {dailyInteractions.length === 0 && <p className="text-sm text-slate-500">Sem dados no periodo.</p>}
                {dailyInteractions.slice(-14).map((item) => (
                  <div key={`interactions-${item.date}`}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                      <span>{formatDateLabel(item.date)}</span>
                      <span className="font-semibold text-slate-800">{item.total}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: `${ratio(item.total, maxDailyInteractions)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-900">Paginas Mais Acessadas</h3>
              <div className="mt-4 space-y-2">
                {data.top_pages.length === 0 && <p className="text-sm text-slate-500">Sem dados no periodo.</p>}
                {data.top_pages.map((item) => (
                  <div key={item.path} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span className="truncate text-sm text-slate-700">{item.path}</span>
                    <span className="text-sm font-semibold text-slate-900">{item.total}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-900">Eventos Mais Registrados</h3>
              <div className="mt-4 space-y-2">
                {data.top_events.length === 0 && <p className="text-sm text-slate-500">Sem dados no periodo.</p>}
                {data.top_events.map((item) => (
                  <div key={item.event_type} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span className="truncate text-sm text-slate-700">{item.event_type}</span>
                    <span className="text-sm font-semibold text-slate-900">{item.total}</span>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-900">Leads por Status</h3>
              <div className="mt-4 space-y-2">
                {data.leads_by_status.length === 0 && <p className="text-sm text-slate-500">Sem dados no periodo.</p>}
                {data.leads_by_status.map((item) => (
                  <div key={item.status} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span className="truncate text-sm text-slate-700">{item.status}</span>
                    <span className="text-sm font-semibold text-slate-900">{item.total}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-900">Top Origens</h3>
              <div className="mt-4 space-y-2">
                {data.top_sources.length === 0 && <p className="text-sm text-slate-500">Sem dados no periodo.</p>}
                {data.top_sources.map((item) => (
                  <div key={item.source} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span className="truncate text-sm text-slate-700">{item.source}</span>
                    <span className="text-sm font-semibold text-slate-900">{item.total}</span>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      )}
    </PageShell>
  );
}
