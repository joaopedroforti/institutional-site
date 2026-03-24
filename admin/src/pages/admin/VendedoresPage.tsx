import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, CircleDollarSign, Percent, Plus, Pencil, SlidersHorizontal, TrendingUp, Users2, X } from "lucide-react";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import type {
  DistributionSettings,
  SellerAnalyticsItem,
  SellerAnalyticsResponse,
  SellerRecord,
  SellersResponse,
} from "../../types/admin";

type SellerForm = {
  name: string;
  username: string;
  email: string;
  password: string;
  is_admin: boolean;
  is_seller: boolean;
  profile: {
    is_active: boolean;
    receives_leads: boolean;
    distribution_weight: number;
    commission_percent: number;
    participates_in_commission: boolean;
    monthly_revenue_goal: number;
    monthly_sales_goal: number;
  };
};

type SellerTab = "analytics" | "sellers" | "settings";

const initialForm: SellerForm = {
  name: "",
  username: "",
  email: "",
  password: "",
  is_admin: false,
  is_seller: true,
  profile: {
    is_active: true,
    receives_leads: true,
    distribution_weight: 1,
    commission_percent: 0,
    participates_in_commission: true,
    monthly_revenue_goal: 0,
    monthly_sales_goal: 0,
  },
};

function money(value: number): string {
  return `R$ ${Number(value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ratioPercent(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (value / max) * 100));
}

const TABS: Array<{
  key: SellerTab;
  title: string;
  subtitle: string;
  icon: typeof BarChart3;
  accent: string;
}> = [
  {
    key: "analytics",
    title: "Analitico",
    subtitle: "Indicadores de vendas e performance",
    icon: BarChart3,
    accent: "from-sky-500 to-blue-700",
  },
  {
    key: "sellers",
    title: "Vendedores",
    subtitle: "Cadastro e gestao de usuarios",
    icon: Users2,
    accent: "from-indigo-500 to-blue-700",
  },
  {
    key: "settings",
    title: "Configuracoes",
    subtitle: "Distribuicao automatica de leads",
    icon: SlidersHorizontal,
    accent: "from-cyan-500 to-blue-700",
  },
];

export default function VendedoresPage() {
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<SellerTab>("analytics");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sellers, setSellers] = useState<SellerRecord[]>([]);
  const [distDraft, setDistDraft] = useState<DistributionSettings | null>(null);

  const [analyticsItems, setAnalyticsItems] = useState<SellerAnalyticsItem[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsTotals, setAnalyticsTotals] = useState<SellerAnalyticsResponse["data"]["totals"] | null>(null);
  const [analyticsSellerId, setAnalyticsSellerId] = useState<number | "">("");
  const [analyticsFrom, setAnalyticsFrom] = useState<string>("");
  const [analyticsTo, setAnalyticsTo] = useState<string>("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSellerId, setEditingSellerId] = useState<number | null>(null);
  const [form, setForm] = useState<SellerForm>(initialForm);
  const [saving, setSaving] = useState(false);

  const [sellerDetailsModal, setSellerDetailsModal] = useState<{ seller: SellerRecord; metrics: SellerAnalyticsItem["metrics"] } | null>(null);
  const [sellerDetailsLoading, setSellerDetailsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<SellersResponse>("/api/admin/sellers", {}, token);
      setSellers(response.data.sellers);
      setDistDraft(response.data.distribution);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel carregar vendedores.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadAnalytics = useCallback(async () => {
    if (!token) {
      return;
    }

    setAnalyticsLoading(true);
    setAnalyticsError(null);

    try {
      const query = new URLSearchParams();
      if (analyticsSellerId !== "") {
        query.set("seller_id", String(analyticsSellerId));
      }
      if (analyticsFrom) {
        query.set("from", analyticsFrom);
      }
      if (analyticsTo) {
        query.set("to", analyticsTo);
      }

      const path = `/api/admin/sellers/analytics${query.toString() ? `?${query.toString()}` : ""}`;
      const response = await apiRequest<SellerAnalyticsResponse>(path, {}, token);
      setAnalyticsItems(response.data.items ?? []);
      setAnalyticsTotals(response.data.totals ?? null);
    } catch (requestError) {
      setAnalyticsError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel carregar o analitico.");
    } finally {
      setAnalyticsLoading(false);
    }
  }, [token, analyticsSellerId, analyticsFrom, analyticsTo]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingSellerId(null);
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (seller: SellerRecord) => {
    setEditingSellerId(seller.id);
    setForm({
      name: seller.name,
      username: seller.username,
      email: seller.email,
      password: "",
      is_admin: seller.is_admin,
      is_seller: seller.is_seller,
      profile: {
        is_active: Boolean(seller.profile.is_active),
        receives_leads: Boolean(seller.profile.receives_leads),
        distribution_weight: Number(seller.profile.distribution_weight ?? 0),
        commission_percent: Number(seller.profile.commission_percent ?? 0),
        participates_in_commission: Boolean(seller.profile.participates_in_commission),
        monthly_revenue_goal: Number(seller.profile.monthly_revenue_goal ?? 0),
        monthly_sales_goal: Number(seller.profile.monthly_sales_goal ?? 0),
      },
    });
    setIsModalOpen(true);
  };

  const saveSeller = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...form,
        password: form.password || undefined,
      };

      if (editingSellerId) {
        await apiRequest(
          `/api/admin/sellers/${editingSellerId}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          },
          token,
        );
      } else {
        if (!form.password) {
          setError("Senha e obrigatoria para novo vendedor.");
          setSaving(false);
          return;
        }

        await apiRequest(
          "/api/admin/sellers",
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
          token,
        );
      }

      setIsModalOpen(false);
      resetForm();
      await load();
      await loadAnalytics();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel salvar vendedor.");
    } finally {
      setSaving(false);
    }
  };

  const saveDistribution = async () => {
    if (!token || !distDraft) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await apiRequest(
        "/api/admin/sellers/distribution/settings",
        {
          method: "PATCH",
          body: JSON.stringify(distDraft),
        },
        token,
      );

      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel salvar distribuicao.");
    } finally {
      setSaving(false);
    }
  };

  const topSold = useMemo(() => {
    return [...analyticsItems].sort((a, b) => b.metrics.sold_value - a.metrics.sold_value).slice(0, 8);
  }, [analyticsItems]);

  const topConversion = useMemo(() => {
    return [...analyticsItems].sort((a, b) => b.metrics.conversion_rate - a.metrics.conversion_rate).slice(0, 8);
  }, [analyticsItems]);

  const maxSold = useMemo(() => Math.max(1, ...topSold.map((item) => item.metrics.sold_value)), [topSold]);
  const maxConversion = useMemo(() => Math.max(1, ...topConversion.map((item) => item.metrics.conversion_rate)), [topConversion]);

  const openSellerAnalyticsModal = async (seller: SellerRecord) => {
    if (!token) {
      return;
    }

    setSellerDetailsLoading(true);

    try {
      const query = new URLSearchParams({ seller_id: String(seller.id) });
      if (analyticsFrom) {
        query.set("from", analyticsFrom);
      }
      if (analyticsTo) {
        query.set("to", analyticsTo);
      }

      const response = await apiRequest<SellerAnalyticsResponse>(`/api/admin/sellers/analytics?${query.toString()}`, {}, token);
      const detailed = response.data.items[0]?.metrics;

      if (detailed) {
        setSellerDetailsModal({ seller, metrics: detailed });
      }
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel abrir analitico detalhado.");
    } finally {
      setSellerDetailsLoading(false);
    }
  };

  return (
    <PageShell>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 p-6 text-white md:p-7">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-100">Comercial</p>
          <h2 className="mt-2 text-2xl font-semibold md:text-3xl">Vendedores</h2>
          <p className="mt-2 max-w-3xl text-sm text-blue-50 md:text-base">
            Analitico gerencial, cadastro de vendedores e configuracao de distribuicao automatica em um unico modulo.
          </p>
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`text-left rounded-2xl border p-4 transition ${
                  active
                    ? "border-blue-300 bg-white shadow-md"
                    : "border-slate-200 bg-slate-50/70 hover:border-blue-200 hover:bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${tab.accent} text-white`}>
                    <Icon size={18} />
                  </span>
                  {active && <span className="text-xs font-semibold text-blue-700">Ativa</span>}
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">{tab.title}</p>
                <p className="mt-1 text-xs text-slate-500">{tab.subtitle}</p>
              </button>
            );
          })}
        </div>
      </section>

      {activeTab === "analytics" && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <label className="text-sm text-slate-700">
                Vendedor
                <select
                  value={analyticsSellerId}
                  onChange={(event) => setAnalyticsSellerId(event.target.value ? Number(event.target.value) : "")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">Todos</option>
                  {sellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-700">
                De
                <input
                  type="date"
                  value={analyticsFrom}
                  onChange={(event) => setAnalyticsFrom(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm text-slate-700">
                Ate
                <input
                  type="date"
                  value={analyticsTo}
                  onChange={(event) => setAnalyticsTo(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => void loadAnalytics()}
                  disabled={analyticsLoading}
                  className="w-full rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {analyticsLoading ? "Atualizando..." : "Aplicar filtros"}
                </button>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setAnalyticsSellerId("");
                    setAnalyticsFrom("");
                    setAnalyticsTo("");
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  Ver geral
                </button>
              </div>
            </div>

            {analyticsError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{analyticsError}</div>
            )}

            {analyticsTotals && (
              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5 xl:grid-cols-10">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Propostas criadas</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{analyticsTotals.proposals_created}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Propostas reprovadas</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{analyticsTotals.proposals_reproved}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Conversao</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{analyticsTotals.conversion_rate.toFixed(1)}%</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Valor vendido</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{money(analyticsTotals.sold_value)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Ticket medio</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{money(analyticsTotals.avg_ticket)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Desconto medio</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{analyticsTotals.avg_discount_percent.toFixed(1)}%</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Desconto total</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{money(analyticsTotals.discount_amount)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Tempo medio resposta</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {analyticsTotals.avg_response_minutes !== null ? `${analyticsTotals.avg_response_minutes.toFixed(1)} min` : "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Leads recebidos</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{analyticsTotals.leads_received}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Leads em andamento</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{analyticsTotals.leads_in_progress}</p>
                </div>
              </div>
            )}
          </section>

          <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <CircleDollarSign size={18} className="text-blue-700" />
                <h3 className="text-base font-semibold text-slate-900">Valor vendido por vendedor</h3>
              </div>

              <div className="space-y-3">
                {topSold.length === 0 && <p className="text-sm text-slate-500">Sem dados para o periodo.</p>}
                {topSold.map((item) => (
                  <div key={item.seller.id}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                      <span>{item.seller.name}</span>
                      <span className="font-semibold text-slate-800">{money(item.metrics.sold_value)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                        style={{ width: `${ratioPercent(item.metrics.sold_value, maxSold)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <Percent size={18} className="text-blue-700" />
                <h3 className="text-base font-semibold text-slate-900">Conversao por vendedor</h3>
              </div>

              <div className="space-y-3">
                {topConversion.length === 0 && <p className="text-sm text-slate-500">Sem dados para o periodo.</p>}
                {topConversion.map((item) => (
                  <div key={item.seller.id}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                      <span>{item.seller.name}</span>
                      <span className="font-semibold text-slate-800">{item.metrics.conversion_rate.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                        style={{ width: `${ratioPercent(item.metrics.conversion_rate, maxConversion)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-700" />
              <h3 className="text-base font-semibold text-slate-900">Tabela analitica por vendedor</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1300px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-2 font-medium">Vendedor</th>
                    <th className="px-3 py-2 font-medium">Prop. criadas</th>
                    <th className="px-3 py-2 font-medium">Prop. reprovadas</th>
                    <th className="px-3 py-2 font-medium">Conversao</th>
                    <th className="px-3 py-2 font-medium">Vendido</th>
                    <th className="px-3 py-2 font-medium">Ticket medio</th>
                    <th className="px-3 py-2 font-medium">Desc. medio</th>
                    <th className="px-3 py-2 font-medium">Tempo resposta</th>
                    <th className="px-3 py-2 font-medium">Leads</th>
                    <th className="px-3 py-2 font-medium">Andamento</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsLoading && (
                    <tr>
                      <td colSpan={10} className="px-3 py-6 text-center text-slate-500">
                        Carregando analitico...
                      </td>
                    </tr>
                  )}
                  {!analyticsLoading && analyticsItems.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-3 py-6 text-center text-slate-500">
                        Nenhum dado para o filtro selecionado.
                      </td>
                    </tr>
                  )}
                  {analyticsItems.map((item) => (
                    <tr key={item.seller.id} className="border-b border-slate-100 text-slate-700">
                      <td className="px-3 py-3">
                        <p className="font-medium">{item.seller.name}</p>
                        <p className="text-xs text-slate-500">@{item.seller.username}</p>
                      </td>
                      <td className="px-3 py-3">{item.metrics.proposals_created}</td>
                      <td className="px-3 py-3">{item.metrics.proposals_reproved}</td>
                      <td className="px-3 py-3">{item.metrics.conversion_rate.toFixed(1)}%</td>
                      <td className="px-3 py-3">{money(item.metrics.sold_value)}</td>
                      <td className="px-3 py-3">{money(item.metrics.avg_ticket)}</td>
                      <td className="px-3 py-3">{item.metrics.avg_discount_percent.toFixed(1)}%</td>
                      <td className="px-3 py-3">
                        {item.metrics.avg_response_minutes !== null ? `${item.metrics.avg_response_minutes.toFixed(1)} min` : "-"}
                      </td>
                      <td className="px-3 py-3">{item.metrics.leads_received}</td>
                      <td className="px-3 py-3">{item.metrics.leads_in_progress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {activeTab === "sellers" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Gestao de vendedores</h3>
              <p className="text-sm text-slate-500">Clique na linha para abrir o analitico detalhado do vendedor.</p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
            >
              <Plus size={16} />
              Adicionar vendedor
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1400px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-2 font-medium">Vendedor</th>
                  <th className="px-3 py-2 font-medium">Perfis</th>
                  <th className="px-3 py-2 font-medium">Ativo</th>
                  <th className="px-3 py-2 font-medium">Recebe Leads</th>
                  <th className="px-3 py-2 font-medium">Peso</th>
                  <th className="px-3 py-2 font-medium">Meta Fat.</th>
                  <th className="px-3 py-2 font-medium">Meta Vendas</th>
                  <th className="px-3 py-2 font-medium">Comissao %</th>
                  <th className="px-3 py-2 font-medium">Leads</th>
                  <th className="px-3 py-2 font-medium">Aprovadas</th>
                  <th className="px-3 py-2 font-medium">Vendido</th>
                  <th className="px-3 py-2 font-medium">Comissao</th>
                  <th className="px-3 py-2 font-medium">Meta %</th>
                  <th className="px-3 py-2 font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={14} className="px-3 py-6 text-center text-slate-500">
                      Carregando vendedores...
                    </td>
                  </tr>
                )}

                {!loading && sellers.length === 0 && (
                  <tr>
                    <td colSpan={14} className="px-3 py-6 text-center text-slate-500">
                      Nenhum vendedor cadastrado.
                    </td>
                  </tr>
                )}

                {sellers.map((seller) => (
                  <tr
                    key={seller.id}
                    className="cursor-pointer border-b border-slate-100 text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      void openSellerAnalyticsModal(seller);
                    }}
                  >
                    <td className="px-3 py-3">
                      <p className="font-medium">{seller.name}</p>
                      <p className="text-xs text-slate-500">@{seller.username}</p>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div className="flex flex-wrap gap-1">
                        {seller.is_admin && <span className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-700">Admin</span>}
                        {seller.is_seller && <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700">Vendedor</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3">{seller.profile.is_active ? "Sim" : "Nao"}</td>
                    <td className="px-3 py-3">{seller.profile.receives_leads ? "Sim" : "Nao"}</td>
                    <td className="px-3 py-3">{seller.profile.distribution_weight}</td>
                    <td className="px-3 py-3">{money(Number(seller.profile.monthly_revenue_goal))}</td>
                    <td className="px-3 py-3">{seller.profile.monthly_sales_goal}</td>
                    <td className="px-3 py-3">{Number(seller.profile.commission_percent)}%</td>
                    <td className="px-3 py-3">{seller.metrics.leads_received}</td>
                    <td className="px-3 py-3">{seller.metrics.approved_count}</td>
                    <td className="px-3 py-3">{money(seller.metrics.sold_value_month)}</td>
                    <td className="px-3 py-3">{money(seller.metrics.commission_accumulated)}</td>
                    <td className="px-3 py-3">{seller.metrics.goal_progress.toFixed(1)}%</td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEdit(seller);
                        }}
                        className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil size={12} />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === "settings" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Distribuicao automatica de leads</h3>
              <p className="text-sm text-slate-500">Defina se a distribuicao fica ativa e qual fallback usar quando necessario.</p>
            </div>
            <button
              type="button"
              onClick={saveDistribution}
              disabled={saving || !distDraft}
              className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Salvar distribuicao
            </button>
          </div>

          {distDraft && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                <span className="mb-1 block text-xs text-slate-500">Distribuicao ativa</span>
                <select
                  value={distDraft.is_enabled ? "1" : "0"}
                  onChange={(event) =>
                    setDistDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            is_enabled: event.target.value === "1",
                          }
                        : prev,
                    )
                  }
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5"
                >
                  <option value="1">Ativa</option>
                  <option value="0">Pausada</option>
                </select>
              </label>

              <label className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                <span className="mb-1 block text-xs text-slate-500">Fallback</span>
                <select
                  value={distDraft.fallback_rule}
                  onChange={(event) =>
                    setDistDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            fallback_rule: event.target.value as DistributionSettings["fallback_rule"],
                          }
                        : prev,
                    )
                  }
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5"
                >
                  <option value="unassigned">Sem responsavel</option>
                  <option value="default_user">Vendedor padrao</option>
                </select>
              </label>

              <label className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                <span className="mb-1 block text-xs text-slate-500">Vendedor fallback</span>
                <select
                  value={distDraft.fallback_user_id ?? ""}
                  onChange={(event) =>
                    setDistDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            fallback_user_id: event.target.value ? Number(event.target.value) : null,
                          }
                        : prev,
                    )
                  }
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5"
                >
                  <option value="">Selecione...</option>
                  {sellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </section>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={saveSeller} className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingSellerId ? "Editar vendedor" : "Novo vendedor"}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)}>
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="text-sm text-slate-700">
                Nome
                <input
                  required
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-700">
                Username
                <input
                  required
                  value={form.username}
                  onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-700">
                E-mail
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
              <label className="text-sm text-slate-700">
                Senha {editingSellerId ? "(opcional)" : ""}
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-700">
                Meta faturamento
                <input
                  type="number"
                  value={form.profile.monthly_revenue_goal}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, monthly_revenue_goal: Number(event.target.value) },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-700">
                Meta vendas
                <input
                  type="number"
                  value={form.profile.monthly_sales_goal}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, monthly_sales_goal: Number(event.target.value) },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-700">
                Comissao %
                <input
                  type="number"
                  step="0.01"
                  value={form.profile.commission_percent}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, commission_percent: Number(event.target.value) },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
              <label className="text-sm text-slate-700">
                Peso distribuicao
                <input
                  type="number"
                  min={0}
                  value={form.profile.distribution_weight}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, distribution_weight: Number(event.target.value) },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              {[
                ["is_admin", "Eh administrador"],
                ["is_seller", "Eh vendedor"],
                ["is_active", "Ativo"],
                ["receives_leads", "Recebe leads"],
                ["participates_in_commission", "Participa da comissao"],
              ].map(([field, label]) => (
                <label key={field} className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={
                      field === "is_admin"
                        ? form.is_admin
                        : field === "is_seller"
                          ? form.is_seller
                          : field === "is_active"
                            ? form.profile.is_active
                            : field === "receives_leads"
                              ? form.profile.receives_leads
                              : form.profile.participates_in_commission
                    }
                    onChange={(event) => {
                      const checked = event.target.checked;

                      setForm((prev) => {
                        if (field === "is_admin") {
                          return { ...prev, is_admin: checked };
                        }

                        if (field === "is_seller") {
                          return { ...prev, is_seller: checked };
                        }

                        if (field === "is_active") {
                          return { ...prev, profile: { ...prev.profile, is_active: checked } };
                        }

                        if (field === "receives_leads") {
                          return { ...prev, profile: { ...prev.profile, receives_leads: checked } };
                        }

                        return { ...prev, profile: { ...prev.profile, participates_in_commission: checked } };
                      });
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar vendedor"}
              </button>
            </div>
          </form>
        </div>
      )}

      {sellerDetailsModal && (
        <div className="fixed inset-0 z-[92] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Analitico detalhado: {sellerDetailsModal.seller.name}</h3>
                <p className="text-sm text-slate-500">Periodo aplicado: {analyticsFrom || "inicio"} ate {analyticsTo || "agora"}</p>
              </div>
              <button type="button" onClick={() => setSellerDetailsModal(null)}>
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            {sellerDetailsLoading ? (
              <p className="text-sm text-slate-500">Carregando analise detalhada...</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Propostas criadas</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{sellerDetailsModal.metrics.proposals_created}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Propostas aprovadas</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{sellerDetailsModal.metrics.proposals_approved}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Propostas reprovadas</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{sellerDetailsModal.metrics.proposals_reproved}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Conversao</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{sellerDetailsModal.metrics.conversion_rate.toFixed(1)}%</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Valor vendido</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{money(sellerDetailsModal.metrics.sold_value)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Ticket medio</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{money(sellerDetailsModal.metrics.avg_ticket)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Desconto medio</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{sellerDetailsModal.metrics.avg_discount_percent.toFixed(1)}%</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Tempo resp.</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {sellerDetailsModal.metrics.avg_response_minutes !== null ? `${sellerDetailsModal.metrics.avg_response_minutes.toFixed(1)} min` : "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="mb-2 text-sm font-semibold text-slate-900">Pipeline</p>
                    <div className="space-y-2 text-sm text-slate-700">
                      <p>Comercial: {sellerDetailsModal.metrics.pipeline_counts?.comercial ?? 0}</p>
                      <p>Desenvolvimento: {sellerDetailsModal.metrics.pipeline_counts?.desenvolvimento ?? 0}</p>
                      <p>FollowUp: {sellerDetailsModal.metrics.pipeline_counts?.followup ?? 0}</p>
                      <p>CS: {sellerDetailsModal.metrics.pipeline_counts?.cs ?? 0}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="mb-2 text-sm font-semibold text-slate-900">Status de propostas</p>
                    <div className="space-y-2 text-sm text-slate-700">
                      <p>Draft: {sellerDetailsModal.metrics.proposal_status_counts?.draft ?? 0}</p>
                      <p>Pendente validacao: {sellerDetailsModal.metrics.proposal_status_counts?.pending_validation ?? 0}</p>
                      <p>Enviadas: {sellerDetailsModal.metrics.proposal_status_counts?.sent ?? 0}</p>
                      <p>Aprovadas: {sellerDetailsModal.metrics.proposal_status_counts?.approved ?? 0}</p>
                      <p>Ajuste solicitado: {sellerDetailsModal.metrics.proposal_status_counts?.adjustment_requested ?? 0}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {sellerDetailsLoading && !sellerDetailsModal && (
        <div className="fixed bottom-4 right-4 z-[93] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow">
          Carregando analitico do vendedor...
        </div>
      )}
    </PageShell>
  );
}
