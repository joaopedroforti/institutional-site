import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, ExternalLink } from "lucide-react";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import type { BudgetsResponse } from "../../types/admin";

function money(value: string | number): string {
  return `R$ ${Number(value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "Rascunho",
    sent: "Publicado",
    approved: "Aprovado",
    adjustment_requested: "Ajuste solicitado",
  };

  return map[status] ?? status;
}

export default function OrcamentosPage() {
  const { token } = useAuth();
  const [budgets, setBudgets] = useState<BudgetsResponse["data"]["budgets"]>([]);
  const [notifications, setNotifications] = useState<BudgetsResponse["data"]["notifications"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<BudgetsResponse>("/api/admin/budgets", {}, token);
      setBudgets(response.data.budgets);
      setNotifications(response.data.notifications);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel carregar orcamentos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const summary = useMemo(() => {
    const approved = budgets.filter((budget) => budget.status === "approved").length;
    const adjustment = budgets.filter((budget) => budget.status === "adjustment_requested").length;

    return {
      total: budgets.length,
      approved,
      adjustment,
    };
  }, [budgets]);

  const markNotificationRead = async (id: number) => {
    if (!token) {
      return;
    }

    try {
      await apiRequest(`/api/admin/notifications/${id}/read`, { method: "PATCH" }, token);
      await load();
    } catch {
      // silencioso
    }
  };

  return (
    <PageShell title="Orcamentos" description="Orcamentos automaticos, status da proposta e ajustes solicitados.">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Aprovadas</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{summary.approved}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Com ajuste solicitado</p>
          <p className="mt-2 text-2xl font-semibold text-amber-700">{summary.adjustment}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <Bell size={16} className="text-blue-700" />
          <h3 className="text-base font-semibold text-slate-900">Notificacoes de evento</h3>
        </div>
        {notifications.length === 0 && <p className="text-sm text-slate-500">Nenhuma notificacao pendente.</p>}
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div key={notification.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-amber-900">{notification.title}</p>
                  <p className="text-sm text-amber-800">{notification.message}</p>
                  {Boolean(notification.payload?.adjustment_message) && (
                    <p className="mt-1 text-xs text-amber-900">
                      Ajuste solicitado: {String(notification.payload?.adjustment_message ?? "")}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void markNotificationRead(notification.id);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-amber-300 px-2 py-1 text-xs text-amber-800 hover:bg-amber-100"
                >
                  <CheckCircle2 size={14} />
                  Marcar lida
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        {loading && <p className="text-sm text-slate-600">Carregando orcamentos...</p>}

        {!loading && (
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-2 font-medium">Identificador</th>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">Titulo</th>
                  <th className="px-3 py-2 font-medium">Valor total</th>
                  <th className="px-3 py-2 font-medium">Entrada 50%</th>
                  <th className="px-3 py-2 font-medium">Prazo interno</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Proposta</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((budget) => (
                  <tr
                    key={budget.id}
                    className={`border-b border-slate-100 ${
                      budget.status === "approved" ? "bg-emerald-50/70" : "bg-white"
                    }`}
                  >
                    <td className="px-3 py-3 font-medium text-slate-900">{budget.identifier}</td>
                    <td className="px-3 py-3 text-slate-700">
                      <p>{budget.client_name}</p>
                      <p className="text-xs text-slate-500">{budget.client_company ?? "Sem empresa"}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{budget.title}</td>
                    <td className="px-3 py-3 text-slate-700">{money(budget.total_amount)}</td>
                    <td className="px-3 py-3 text-slate-700">{money(budget.entry_amount)}</td>
                    <td className="px-3 py-3 text-slate-700">
                      {budget.internal_deadline_days ? `${budget.internal_deadline_days} dias uteis` : "-"}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          budget.status === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : budget.status === "adjustment_requested"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {statusLabel(budget.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <a
                        href={`http://localhost:3000/proposta/${budget.slug}?internal=1`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <ExternalLink size={13} />
                        Abrir
                      </a>
                    </td>
                  </tr>
                ))}

                {!loading && budgets.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                      Nenhum orcamento gerado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageShell>
  );
}
