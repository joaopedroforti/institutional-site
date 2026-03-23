import { useEffect, useMemo, useState } from "react";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import type { DashboardResponse } from "../../types/admin";

const metricLabels: Array<{ key: keyof DashboardResponse["summary"]; label: string }> = [
  { key: "contacts_total", label: "Leads Totais" },
  { key: "contacts_pending", label: "Leads Pendentes" },
  { key: "sessions_total", label: "Sessoes" },
  { key: "sessions_identified", label: "Sessoes Identificadas" },
  { key: "page_views_total", label: "Page Views" },
  { key: "interactions_total", label: "Interacoes" },
];

export default function DashboardPage() {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await apiRequest<DashboardResponse>("/api/admin/dashboard", {}, token);
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
  }, [token]);

  const topPages = useMemo(() => data?.top_pages ?? [], [data]);
  const topEvents = useMemo(() => data?.top_events ?? [], [data]);

  return (
    <PageShell
      title="Dashboard"
      description="Visao geral de leads, sessoes e comportamento de navegacao."
    >
      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Carregando indicadores...
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {metricLabels.map((metric) => (
              <article
                key={metric.key}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{metric.label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{data.summary[metric.key]}</p>
              </article>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-900">Paginas Mais Acessadas</h3>
              <div className="mt-4 space-y-3">
                {topPages.length === 0 && <p className="text-sm text-slate-500">Sem dados ainda.</p>}
                {topPages.map((item) => (
                  <div key={item.path} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span className="truncate text-sm text-slate-700">{item.path}</span>
                    <span className="text-sm font-semibold text-slate-900">{item.total}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-900">Eventos Mais Registrados</h3>
              <div className="mt-4 space-y-3">
                {topEvents.length === 0 && <p className="text-sm text-slate-500">Sem dados ainda.</p>}
                {topEvents.map((item) => (
                  <div
                    key={item.event_type}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                  >
                    <span className="truncate text-sm text-slate-700">{item.event_type}</span>
                    <span className="text-sm font-semibold text-slate-900">{item.total}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </PageShell>
  );
}
