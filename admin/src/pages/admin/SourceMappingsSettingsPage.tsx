import { FormEvent, useEffect, useState } from "react";
import { Plus, Save, Trash2, Tags } from "lucide-react";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import type { SourceMappingsResponse, SourceTagMappingRule } from "../../types/admin";

const DEFAULT_RULES: SourceTagMappingRule[] = [
  {
    contains: "whatsapp:inbound",
    label: "WhatsApp Direto",
    priority: 100,
    is_active: true,
  },
  {
    contains: "whatsapp",
    label: "Botao WhatsApp",
    priority: 80,
    is_active: true,
  },
  {
    contains: "contato",
    label: "Formulario de contato",
    priority: 70,
    is_active: true,
  },
  {
    contains: "onboarding",
    label: "Formulario onboarding",
    priority: 60,
    is_active: true,
  },
];

export default function SourceMappingsSettingsPage() {
  const { token } = useAuth();
  const [rules, setRules] = useState<SourceTagMappingRule[]>(DEFAULT_RULES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiRequest<SourceMappingsResponse>("/api/admin/settings/source-mappings", {}, token);
        if (!active) {
          return;
        }

        setRules(response.data.rules);
      } catch (requestError) {
        if (!active) {
          return;
        }
        setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel carregar mapeamentos.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [token]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest<SourceMappingsResponse>(
        "/api/admin/settings/source-mappings",
        {
          method: "PATCH",
          body: JSON.stringify({ rules }),
        },
        token,
      );
      setSuccess("Mapeamentos atualizados com sucesso.");
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel salvar mapeamentos.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 p-6 text-white md:p-7">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-100">Classificacao Comercial</p>
          <h2 className="mt-2 text-2xl font-semibold md:text-3xl">Mapeamento de Origem, Rotulos e Tags</h2>
          <p className="mt-2 max-w-3xl text-sm text-blue-50 md:text-base">
            Controle como as origens dos leads viram rotulos no painel, com prioridade e regras de ativacao.
          </p>
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {success && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}

        <form className="mt-5 space-y-4" onSubmit={save}>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={loading || saving}
              onClick={() =>
                setRules((prev) => [
                  ...prev,
                  { contains: "", label: "", priority: 50, is_active: true },
                ])
              }
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Plus size={16} />
              Nova regra
            </button>
          </div>

          <div className="space-y-3">
            {rules.map((rule, index) => (
              <div key={`${rule.contains}-${rule.label}-${index}`} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-12">
                <label className="text-sm text-slate-700 md:col-span-4">
                  Contem (filtro)
                  <input
                    value={rule.contains}
                    onChange={(event) =>
                      setRules((prev) =>
                        prev.map((item, itemIndex) => (itemIndex === index ? { ...item, contains: event.target.value } : item)),
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    disabled={loading || saving}
                  />
                </label>

                <label className="text-sm text-slate-700 md:col-span-4">
                  Rotulo / Tag
                  <input
                    value={rule.label}
                    onChange={(event) =>
                      setRules((prev) =>
                        prev.map((item, itemIndex) => (itemIndex === index ? { ...item, label: event.target.value } : item)),
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    disabled={loading || saving}
                  />
                </label>

                <label className="text-sm text-slate-700 md:col-span-2">
                  Prioridade
                  <input
                    type="number"
                    value={rule.priority}
                    onChange={(event) =>
                      setRules((prev) =>
                        prev.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                priority: Number(event.target.value),
                              }
                            : item,
                        ),
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    disabled={loading || saving}
                  />
                </label>

                <div className="flex items-end gap-2 md:col-span-2">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={rule.is_active}
                      onChange={(event) =>
                        setRules((prev) =>
                          prev.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  is_active: event.target.checked,
                                }
                              : item,
                          ),
                        )
                      }
                      disabled={loading || saving}
                    />
                    Ativa
                  </label>

                  <button
                    type="button"
                    onClick={() => setRules((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-2 text-xs text-red-700 transition hover:bg-red-50"
                    disabled={loading || saving}
                  >
                    <Trash2 size={14} />
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? "Salvando..." : "Salvar mapeamentos"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <div className="flex items-start gap-3">
          <Tags size={18} className="mt-0.5 text-blue-700" />
          <p>
            Regras com maior prioridade tem precedencia. O valor em "contem" e comparado com a origem do lead para gerar rotulos automaticos.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
