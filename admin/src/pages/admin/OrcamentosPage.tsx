import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, ExternalLink, FileText, Mail, Phone, UserCircle2 } from "lucide-react";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import type { BudgetsResponse } from "../../types/admin";
import { Modal } from "../../components/ui/modal";

function money(value: string | number): string {
  return `R$ ${Number(value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "Rascunho",
    sent: "Publicado",
    pending_validation: "Pendente validacao",
    approved: "Aprovado",
    adjustment_requested: "Ajuste solicitado",
  };

  return map[status] ?? status;
}

export default function OrcamentosPage() {
  const { token, user } = useAuth();
  const [budgets, setBudgets] = useState<BudgetsResponse["data"]["budgets"]>([]);
  const [notifications, setNotifications] = useState<BudgetsResponse["data"]["notifications"]>([]);
  const [discountDrafts, setDiscountDrafts] = useState<Record<number, string>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
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
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel carregar propostas.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const approved = budgets.filter((budget) => budget.status === "approved").length;
    const adjustment = budgets.filter((budget) => budget.status === "adjustment_requested").length;
    const pendingValidation = budgets.filter((budget) => budget.status === "pending_validation").length;

    return {
      total: budgets.length,
      approved,
      adjustment,
      pendingValidation,
    };
  }, [budgets]);

  const isAdmin = Boolean(user?.roles?.includes("admin"));
  const selectedBudget = useMemo(
    () => budgets.find((budget) => budget.id === selectedBudgetId) ?? null,
    [budgets, selectedBudgetId],
  );
  const selectedBudgetLocked = selectedBudget?.status === "approved";

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

  const validateBudget = async (id: number) => {
    if (!token) {
      return;
    }

    setError(null);
    try {
      await apiRequest(`/api/admin/budgets/${id}/validate`, { method: "PATCH" }, token);
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel validar a proposta.");
    }
  };

  const applyDiscount = async (id: number) => {
    if (!token) {
      return;
    }

    const draft = Number(discountDrafts[id] ?? 0);
    if (Number.isNaN(draft) || draft < 0) {
      setError("Informe uma porcentagem de desconto valida.");
      return;
    }

    setError(null);
    try {
      await apiRequest(
        `/api/admin/budgets/${id}/discount`,
        {
          method: "PATCH",
          body: JSON.stringify({
            discount_percent: draft,
          }),
        },
        token,
      );

      await load();
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        const rawMessage = requestError.message.toLowerCase();
        if (rawMessage.includes("aprovada")) {
          setError("Proposta aprovada nao pode mais ser alterada.");
          return;
        }
        if (rawMessage.includes("max") || rawMessage.includes("limite") || rawMessage.includes("desconto")) {
          setError("Percentual de desconto nao autorizado para este orcamento.");
          return;
        }
        setError(requestError.message);
        return;
      }
      setError("Nao foi possivel aplicar o desconto.");
    }
  };

  const filteredBudgets = useMemo(() => {
    const query = search.trim().toLowerCase();

    return budgets.filter((budget) => {
      const statusMatches = statusFilter === "all" ? true : budget.status === statusFilter;
      if (!statusMatches) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        budget.identifier,
        budget.title,
        budget.client_name,
        budget.client_company ?? "",
        budget.client_email ?? "",
        budget.client_phone ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [budgets, search, statusFilter]);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(filteredBudgets.length / pageSize)), [filteredBudgets.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount]);

  const visibleBudgets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBudgets.slice(start, start + pageSize);
  }, [currentPage, filteredBudgets]);

  return (
    <PageShell title="Propostas" description="Listagem de propostas, status comercial e ajustes solicitados.">
      {error && (
        <div className="pointer-events-none fixed right-4 top-4 z-[100100]">
          <div className="pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg">
            <div className="mt-0.5 size-2 rounded-full bg-red-500" />
            <p className="flex-1">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="rounded px-1 text-red-500 transition hover:bg-red-100 hover:text-red-700"
              aria-label="Fechar alerta"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Pendentes de validacao</p>
          <p className="mt-2 text-2xl font-semibold text-orange-700">{summary.pendingValidation}</p>
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
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Tabela de propostas</h3>
            <p className="text-xs text-slate-500">Busca, filtro e visualizacao detalhada em largura total.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por cliente, titulo, identificador..."
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-blue-200 placeholder:text-slate-400 focus:ring-2 sm:w-80"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none ring-blue-200 focus:ring-2"
            >
              <option value="all">Todos os status</option>
              <option value="pending_validation">Pendente validacao</option>
              <option value="sent">Publicado</option>
              <option value="approved">Aprovado</option>
              <option value="adjustment_requested">Ajuste solicitado</option>
              <option value="draft">Rascunho</option>
            </select>
          </div>
        </div>

        {loading && <p className="text-sm text-slate-600">Carregando propostas...</p>}

        {!loading && (
          <div className="w-full overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full table-fixed text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <th className="px-3 py-2 font-medium">Identificador</th>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">Titulo</th>
                  <th className="px-3 py-2 font-medium">Valor total</th>
                  <th className="px-3 py-2 font-medium">Entrada 50%</th>
                  <th className="px-3 py-2 font-medium">Prazo interno</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Proposta</th>
                  <th className="px-3 py-2 font-medium">Acao</th>
                </tr>
              </thead>
              <tbody>
                {visibleBudgets.map((budget) => (
                  <tr
                    key={budget.id}
                    className={`border-b border-slate-100 ${
                      budget.status === "approved" ? "bg-emerald-50/70" : "bg-white"
                    }`}
                  >
                    <td className="px-3 py-3 font-medium text-slate-900">{budget.identifier}</td>
                    <td className="px-3 py-3 text-slate-700">
                      <p className="truncate font-medium">{budget.client_name}</p>
                      <p className="truncate text-xs text-slate-500">{budget.client_company ?? "Sem empresa"}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      <p className="truncate">{budget.title}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      <p>{money(budget.total_amount)}</p>
                      {Number(budget.discount_percent ?? 0) > 0 && (
                        <p className="mt-0.5 text-[11px] text-emerald-700">
                          Desconto aplicado: {Number(budget.discount_percent ?? 0).toFixed(2)}% (
                          {money(budget.discount_amount ?? 0)})
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{money(budget.entry_amount)}</td>
                    <td className="px-3 py-3 text-slate-700">
                      {budget.internal_deadline_days ? `${budget.internal_deadline_days} dias uteis` : "-"}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          budget.status === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : budget.status === "pending_validation"
                              ? "bg-orange-100 text-orange-800"
                            : budget.status === "adjustment_requested"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {statusLabel(budget.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {budget.slug ? (
                        <a
                          href={`http://localhost:3000/proposta/${budget.slug}?internal=1`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <ExternalLink size={13} />
                          Abrir
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500">Sem link</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBudgetId(budget.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <FileText size={13} />
                        Ver detalhes
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && filteredBudgets.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-slate-500">
                      Nenhuma proposta encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredBudgets.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Exibindo {(currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, filteredBudgets.length)} de {filteredBudgets.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-xs text-slate-600">
                Pagina {currentPage} de {pageCount}
              </span>
              <button
                type="button"
                disabled={currentPage >= pageCount}
                onClick={() => setCurrentPage((prev) => Math.min(pageCount, prev + 1))}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Proxima
              </button>
            </div>
          </div>
        )}
      </section>

      <Modal
        isOpen={Boolean(selectedBudget)}
        onClose={() => {
          setSelectedBudgetId(null);
        }}
        className="mx-4 w-full max-w-4xl p-0"
      >
        {selectedBudget && (
          <div className="max-h-[88vh] overflow-y-auto">
            <div className="rounded-t-3xl border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Proposta</p>
                  <h3 className="mt-1 text-xl font-semibold text-slate-900">{selectedBudget.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedBudget.identifier} • {selectedBudget.project_type.toUpperCase()}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    selectedBudget.status === "approved"
                      ? "bg-emerald-100 text-emerald-800"
                      : selectedBudget.status === "pending_validation"
                        ? "bg-orange-100 text-orange-800"
                        : selectedBudget.status === "adjustment_requested"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {statusLabel(selectedBudget.status)}
                </span>
              </div>
            </div>

            <div className="space-y-5 px-6 py-5">
              <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Valor total</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{money(selectedBudget.total_amount)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Entrada sugerida</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{money(selectedBudget.entry_amount)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Desconto atual</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {Number(selectedBudget.discount_percent ?? 0).toFixed(2)}%
                  </p>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-slate-900">Visao interna (vendedor/administrador)</h4>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-2 text-sm text-slate-700">
                    <p className="inline-flex items-center gap-2">
                      <UserCircle2 size={15} className="text-slate-500" />
                      {selectedBudget.client_name}
                    </p>
                    {selectedBudget.client_email && (
                      <p className="inline-flex items-center gap-2">
                        <Mail size={15} className="text-slate-500" />
                        {selectedBudget.client_email}
                      </p>
                    )}
                    {selectedBudget.client_phone && (
                      <p className="inline-flex items-center gap-2">
                        <Phone size={15} className="text-slate-500" />
                        {selectedBudget.client_phone}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1 text-sm text-slate-700">
                    <p>
                      <span className="text-slate-500">Empresa:</span> {selectedBudget.client_company ?? "Sem empresa"}
                    </p>
                    <p>
                      <span className="text-slate-500">Prazo interno:</span>{" "}
                      {selectedBudget.internal_deadline_days ? `${selectedBudget.internal_deadline_days} dias uteis` : "-"}
                    </p>
                    <p>
                      <span className="text-slate-500">Validade:</span> {selectedBudget.valid_until ?? "-"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-slate-900">Acoes comerciais</h4>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {selectedBudget.slug ? (
                    <a
                      href={`http://localhost:3000/proposta/${selectedBudget.slug}?internal=1`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <ExternalLink size={13} />
                      Abrir proposta publica
                    </a>
                  ) : (
                    <span className="text-xs text-slate-500">Sem link de proposta</span>
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-slate-900">Aplicar desconto</h4>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedBudgetLocked
                    ? "Proposta aprovada: descontos e alteracoes estao bloqueados."
                    : "Informe o percentual desejado. O sistema valida automaticamente a permissao para este tipo de projeto."}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={discountDrafts[selectedBudget.id] ?? ""}
                    disabled={selectedBudgetLocked}
                    onChange={(event) =>
                      setDiscountDrafts((prev) => ({
                        ...prev,
                        [selectedBudget.id]: event.target.value,
                      }))
                    }
                    placeholder="Desconto (%)"
                    className="w-36 rounded-md border border-slate-300 px-2.5 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <button
                    type="button"
                    disabled={selectedBudgetLocked}
                    onClick={() => {
                      void applyDiscount(selectedBudget.id);
                    }}
                    className="rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    Aplicar desconto
                  </button>
                </div>
              </section>

              {isAdmin && (
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <h4 className="text-sm font-semibold text-slate-900">Validacao administrativa</h4>
                  <div className="mt-3">
                    {selectedBudget.status === "pending_validation" ? (
                      <button
                        type="button"
                        onClick={() => {
                          void validateBudget(selectedBudget.id);
                        }}
                        className="rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-medium text-orange-700 hover:bg-orange-100"
                      >
                        Validar e liberar para vendedor
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">Esta proposta ja esta validada ou nao exige validacao.</span>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
