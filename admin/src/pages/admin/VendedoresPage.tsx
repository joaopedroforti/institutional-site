import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, X } from "lucide-react";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import type {
  DistributionSettings,
  OnboardingDeadlineSetting,
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

export default function VendedoresPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sellers, setSellers] = useState<SellerRecord[]>([]);
  const [distDraft, setDistDraft] = useState<DistributionSettings | null>(null);
  const [onboardingDeadlineDraft, setOnboardingDeadlineDraft] = useState<OnboardingDeadlineSetting[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSellerId, setEditingSellerId] = useState<number | null>(null);
  const [form, setForm] = useState<SellerForm>(initialForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<SellersResponse>("/api/admin/sellers", {}, token);
      setSellers(response.data.sellers);
      setDistDraft(response.data.distribution);
      setOnboardingDeadlineDraft(response.data.onboarding_deadlines ?? []);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel carregar vendedores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

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

  const saveOnboardingDeadlines = async () => {
    if (!token || onboardingDeadlineDraft.length === 0) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await apiRequest(
        "/api/admin/sellers/onboarding/deadlines",
        {
          method: "PATCH",
          body: JSON.stringify({
            deadlines: onboardingDeadlineDraft.map((item) => ({
              option_key: item.option_key,
              internal_days: Number(item.internal_days),
            })),
          }),
        },
        token,
      );

      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel salvar prazos internos.");
    } finally {
      setSaving(false);
    }
  };

  const consolidated = useMemo(() => {
    const totalLeads = sellers.reduce((acc, seller) => acc + seller.metrics.leads_received, 0);
    const totalSold = sellers.reduce((acc, seller) => acc + seller.metrics.sold_value_month, 0);
    const totalCommission = sellers.reduce((acc, seller) => acc + seller.metrics.commission_accumulated, 0);

    return { totalLeads, totalSold, totalCommission };
  }, [sellers]);

  return (
    <PageShell
      title="Vendedores"
      description="Cadastro, metas, comissao e distribuicao automatica de leads."
      actions={
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
        >
          <Plus size={16} />
          Novo vendedor
        </button>
      }
    >
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Leads distribuidos (mes)</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{consolidated.totalLeads}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Vendido no mes</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{money(consolidated.totalSold)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Comissao acumulada</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{money(consolidated.totalCommission)}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Distribuicao automatica de leads</h3>
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

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Prazos internos do onboarding (site)</h3>
          <button
            type="button"
            onClick={saveOnboardingDeadlines}
            disabled={saving || onboardingDeadlineDraft.length === 0}
            className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Salvar prazos
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {onboardingDeadlineDraft.map((item) => (
            <label key={item.option_key} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
              <span className="mb-1 block text-xs text-slate-500">{item.label}</span>
              <input
                type="number"
                min={1}
                max={365}
                value={Number(item.internal_days)}
                onChange={(event) =>
                  setOnboardingDeadlineDraft((prev) =>
                    prev.map((deadline) =>
                      deadline.option_key === item.option_key
                        ? { ...deadline, internal_days: Number(event.target.value) }
                        : deadline,
                    ),
                  )
                }
                className="w-full rounded-md border border-slate-300 px-2 py-1.5"
              />
              <span className="mt-1 block text-xs text-slate-500">dias uteis internos</span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
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
                <tr key={seller.id} className="border-b border-slate-100 text-slate-700">
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
                      onClick={() => openEdit(seller)}
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
    </PageShell>
  );
}
