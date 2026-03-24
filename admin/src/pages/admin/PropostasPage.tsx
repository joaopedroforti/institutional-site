import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Hourglass, Leaf, Save, Siren } from "lucide-react";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import type { OnboardingDeadlineSetting, ProposalSettingsResponse } from "../../types/admin";
import LoadingState from "../../components/common/LoadingState";

type DeadlineVisual = {
  icon: typeof CalendarClock;
  stripe: string;
  card: string;
  hint: string;
};

const VISUAL_BY_KEY: Record<string, DeadlineVisual> = {
  urgente: {
    icon: Siren,
    stripe: "from-rose-500 to-rose-600",
    card: "border-rose-200 bg-rose-50/60",
    hint: "Leads com maior urgencia e expectativa de entrega acelerada.",
  },
  mes: {
    icon: CalendarClock,
    stripe: "from-amber-500 to-amber-600",
    card: "border-amber-200 bg-amber-50/60",
    hint: "Prazo para fechamento e kickoff ainda neste mes.",
  },
  "30-60": {
    icon: Hourglass,
    stripe: "from-sky-500 to-sky-600",
    card: "border-sky-200 bg-sky-50/60",
    hint: "Projetos com janela de decisao mais planejada.",
  },
  "sem-pressa": {
    icon: Leaf,
    stripe: "from-emerald-500 to-emerald-600",
    card: "border-emerald-200 bg-emerald-50/60",
    hint: "Fluxo consultivo com menor pressao de tempo.",
  },
};

export default function PropostasPage() {
  const { token } = useAuth();
  const [deadlines, setDeadlines] = useState<OnboardingDeadlineSetting[]>([]);
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
      const response = await apiRequest<ProposalSettingsResponse>("/api/admin/settings/proposals", {}, token);
      setDeadlines(response.data.onboarding_deadlines ?? []);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel carregar configuracoes de prazos.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const orderedDeadlines = useMemo(
    () => [...deadlines].sort((a, b) => Number(a.internal_days) - Number(b.internal_days)),
    [deadlines],
  );

  const save = async () => {
    if (!token) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest(
        "/api/admin/settings/proposals/deadlines",
        {
          method: "PATCH",
          body: JSON.stringify({
            deadlines: deadlines.map((item) => ({
              option_key: item.option_key,
              internal_days: Number(item.internal_days),
            })),
          }),
        },
        token,
      );

      setSuccess("Prazos atualizados com sucesso.");
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel salvar os prazos.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 p-6 text-white md:p-7">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-100">Prazos</p>
          <h2 className="mt-2 text-2xl font-semibold md:text-3xl">Configuracao de Prazos</h2>
          <p className="mt-2 max-w-3xl text-sm text-blue-50 md:text-base">
            Ajuste os dias internos por faixa de prazo. Cada secao representa um perfil de lead do onboarding.
          </p>
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {success && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              void save();
            }}
            disabled={saving || loading || deadlines.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? "Salvando..." : "Salvar prazos"}
          </button>
        </div>

        {loading && <LoadingState label="Carregando prazos..." className="mt-5" />}

        {!loading && (
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {orderedDeadlines.map((item) => {
              const visual = VISUAL_BY_KEY[item.option_key] ?? VISUAL_BY_KEY["30-60"];
              const Icon = visual.icon;

              return (
                <section key={item.option_key} className={`overflow-hidden rounded-2xl border ${visual.card}`}>
                  <div className={`h-1.5 w-full bg-gradient-to-r ${visual.stripe}`} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm">
                          <Icon size={18} />
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">{item.label}</h3>
                          <p className="mt-0.5 text-xs text-slate-500">{visual.hint}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="text-sm text-slate-700">
                        <span className="mb-1 block text-xs text-slate-500">Dias uteis internos</span>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={Number(item.internal_days)}
                          onChange={(event) =>
                            setDeadlines((prev) =>
                              prev.map((deadline) =>
                                deadline.option_key === item.option_key
                                  ? { ...deadline, internal_days: Number(event.target.value) }
                                  : deadline,
                              ),
                            )
                          }
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                        />
                      </label>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </section>
    </PageShell>
  );
}
