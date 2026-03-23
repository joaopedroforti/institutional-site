import { useCallback, useEffect, useState } from "react";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import type { OnboardingDeadlineSetting, ProposalSettingsResponse } from "../../types/admin";

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
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel carregar configuracoes de propostas.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

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

      setSuccess("Prazos internos atualizados com sucesso.");
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel salvar os prazos internos.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell title="Configuracoes de Propostas" description="Prazos internos do onboarding (Site).">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Prazos internos do onboarding (site)</h3>
          <button
            type="button"
            onClick={() => {
              void save();
            }}
            disabled={saving || loading || deadlines.length === 0}
            className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar prazos"}
          </button>
        </div>

        {loading && <p className="text-sm text-slate-500">Carregando prazos...</p>}

        {!loading && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {deadlines.map((item) => (
              <label key={item.option_key} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                <span className="mb-1 block text-xs text-slate-500">{item.label}</span>
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
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5"
                />
                <span className="mt-1 block text-xs text-slate-500">dias uteis internos</span>
              </label>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
