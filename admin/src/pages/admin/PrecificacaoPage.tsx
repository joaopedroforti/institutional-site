import { useCallback, useEffect, useMemo, useState } from "react";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import type { PricingProjectSetting, PricingRuleItem, PricingSettingsResponse } from "../../types/admin";

type RuleMap = Record<string, PricingRuleItem[]>;

const PROJECT_LABELS: Record<string, string> = {
  site: "Site",
  sistema: "Sistema",
  automacao: "Automacao",
};

export default function PrecificacaoPage() {
  const { token } = useAuth();
  const [projectSettings, setProjectSettings] = useState<PricingProjectSetting[]>([]);
  const [rulesByProject, setRulesByProject] = useState<RuleMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<PricingSettingsResponse>("/api/admin/settings/pricing", {}, token);
      setProjectSettings(
        response.data.project_settings.map((item) => ({
          ...item,
          max_discount_percent: Number(item.max_discount_percent ?? 0),
        })),
      );

      const mapped: RuleMap = {};
      Object.entries(response.data.rules ?? {}).forEach(([key, value]) => {
        mapped[key] = value.map((rule) => ({
          ...rule,
          amount: Number(rule.amount ?? 0),
          sort_order: Number(rule.sort_order ?? 0),
          is_active: Boolean(rule.is_active),
        }));
      });

      setRulesByProject(mapped);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel carregar configuracoes de precificacao.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const orderedProjects = useMemo(() => {
    const order = ["site", "sistema", "automacao"];
    return [...projectSettings].sort(
      (a, b) => order.indexOf(String(a.project_type)) - order.indexOf(String(b.project_type)),
    );
  }, [projectSettings]);

  const updateProjectSetting = (projectType: string, patch: Partial<PricingProjectSetting>) => {
    setProjectSettings((prev) =>
      prev.map((item) =>
        item.project_type === projectType
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  };

  const updateRule = (projectType: string, ruleKey: string, patch: Partial<PricingRuleItem>) => {
    setRulesByProject((prev) => ({
      ...prev,
      [projectType]: (prev[projectType] ?? []).map((rule) =>
        rule.rule_key === ruleKey
          ? {
              ...rule,
              ...patch,
            }
          : rule,
      ),
    }));
  };

  const save = async () => {
    if (!token) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        project_settings: projectSettings.map((item) => ({
          project_type: item.project_type,
          max_discount_percent: Number(item.max_discount_percent),
          requires_admin_validation: Boolean(item.requires_admin_validation),
        })),
        rules: Object.entries(rulesByProject).flatMap(([projectType, rules]) =>
          rules.map((rule) => ({
            project_type: projectType,
            rule_key: rule.rule_key,
            label: rule.label,
            amount: Number(rule.amount),
            sort_order: Number(rule.sort_order ?? 0),
            is_active: Boolean(rule.is_active),
          })),
        ),
      };

      await apiRequest(
        "/api/admin/settings/pricing",
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
        token,
      );

      setSuccess("Precificacao atualizada com sucesso.");
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel salvar precificacao.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell title="Precificacao" description="Regras de valor por tipo de projeto e limite de desconto por produto/servico.">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Configuracao de precificacao</h3>
          <button
            type="button"
            onClick={() => {
              void save();
            }}
            disabled={saving || loading || projectSettings.length === 0}
            className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar precificacao"}
          </button>
        </div>

        {loading && <p className="text-sm text-slate-500">Carregando regras...</p>}

        {!loading && (
          <div className="space-y-5">
            {orderedProjects.map((setting) => {
              const projectType = String(setting.project_type);
              const rules = (rulesByProject[projectType] ?? []).sort((a, b) => a.sort_order - b.sort_order);

              return (
                <article key={projectType} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-slate-900">{PROJECT_LABELS[projectType] ?? projectType}</h4>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="text-xs text-slate-600">
                        Limite max. desconto (%)
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          value={Number(setting.max_discount_percent ?? 0)}
                          onChange={(event) =>
                            updateProjectSetting(projectType, {
                              max_discount_percent: Number(event.target.value),
                            })
                          }
                          className="mt-1 w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </label>

                      <label className="text-xs text-slate-600">
                        Exige validacao admin
                        <select
                          value={setting.requires_admin_validation ? "1" : "0"}
                          onChange={(event) =>
                            updateProjectSetting(projectType, {
                              requires_admin_validation: event.target.value === "1",
                            })
                          }
                          className="mt-1 w-36 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        >
                          <option value="0">Nao</option>
                          <option value="1">Sim</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="min-w-[760px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="px-3 py-2 font-medium">Regra</th>
                          <th className="px-3 py-2 font-medium">Valor</th>
                          <th className="px-3 py-2 font-medium">Ativa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rules.map((rule) => (
                          <tr key={`${projectType}-${rule.rule_key}`} className="border-b border-slate-100">
                            <td className="px-3 py-2">
                              <p className="text-sm font-medium text-slate-900">{rule.label}</p>
                              <p className="text-xs text-slate-500">{rule.rule_key}</p>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="0.01"
                                value={Number(rule.amount ?? 0)}
                                onChange={(event) =>
                                  updateRule(projectType, rule.rule_key, {
                                    amount: Number(event.target.value),
                                  })
                                }
                                className="w-36 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={rule.is_active ? "1" : "0"}
                                onChange={(event) =>
                                  updateRule(projectType, rule.rule_key, {
                                    is_active: event.target.value === "1",
                                  })
                                }
                                className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                              >
                                <option value="1">Sim</option>
                                <option value="0">Nao</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </PageShell>
  );
}
