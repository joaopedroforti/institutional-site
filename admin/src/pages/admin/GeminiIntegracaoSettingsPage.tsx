import { useCallback, useEffect, useState } from "react";
import { BrainCircuit, Save } from "lucide-react";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import type { IntegrationsSettings, IntegrationsSettingsResponse } from "../../types/admin";
import LoadingState from "../../components/common/LoadingState";

const DEFAULT_SETTINGS: IntegrationsSettings = {
  meta_pixel: {
    enabled: false,
    pixel_id: "",
    automatic_advanced_matching: false,
    advanced_matching_fields: {
      city_state_zip: false,
      country: false,
      birth_date: false,
      email: true,
      external_id: false,
      gender: false,
      first_name_last_name: true,
      phone: true,
    },
    conversions_api_enabled: false,
    access_token: "",
    api_version: "v22.0",
    test_event_code: "",
  },
  gemini: {
    enabled: false,
    api_key: "",
    model: "gemini-1.5-flash",
    system_prompt:
      "Voce e um assistente comercial para conversas via WhatsApp. Resuma o historico e indique como abordar o contato para aumentar conversao.",
  },
};

export default function GeminiIntegracaoSettingsPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<IntegrationsSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<IntegrationsSettingsResponse>("/api/admin/settings/integrations", {}, token);
      const payload = response.data?.gemini ?? DEFAULT_SETTINGS.gemini;

      setSettings((prev) => ({
        ...prev,
        gemini: {
          enabled: Boolean(payload.enabled),
          api_key: String(payload.api_key ?? ""),
          model: String(payload.model ?? "gemini-1.5-flash") || "gemini-1.5-flash",
          system_prompt: String(payload.system_prompt ?? DEFAULT_SETTINGS.gemini.system_prompt),
        },
      }));
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel carregar integracao Gemini.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!token) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest<IntegrationsSettingsResponse>(
        "/api/admin/settings/integrations",
        {
          method: "PATCH",
          body: JSON.stringify({
            gemini: settings.gemini,
          }),
        },
        token,
      );

      setSuccess("Configuracoes do Gemini atualizadas.");
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel salvar configuracoes do Gemini.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="rounded-2xl bg-gradient-to-r from-sky-700 via-blue-700 to-indigo-700 p-6 text-white md:p-7">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-100">Integracoes</p>
          <h2 className="mt-2 text-2xl font-semibold md:text-3xl">Gemini</h2>
          <p className="mt-2 max-w-2xl text-sm text-blue-50 md:text-base">
            Configure as credenciais de IA para gerar resumo de conversa e orientacoes de abordagem no modulo WhatsApp.
          </p>
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {success && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}

        {loading ? (
          <LoadingState label="Carregando integracao Gemini..." className="mt-5" />
        ) : (
          <article className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Credenciais do Gemini</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Quando ativo, exibe o icone de cerebro na conversa do WhatsApp para gerar insights de comunicacao.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.gemini.enabled}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      gemini: { ...prev.gemini, enabled: event.target.checked },
                    }))
                  }
                  className="size-4 rounded border-slate-300 text-blue-600"
                />
                Ativo
              </label>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-sm text-slate-700">
                <span className="mb-1 block text-xs text-slate-500">API Key</span>
                <input
                  type="password"
                  value={settings.gemini.api_key}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      gemini: { ...prev.gemini, api_key: event.target.value },
                    }))
                  }
                  placeholder="AIza..."
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                />
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-1 block text-xs text-slate-500">Modelo</span>
                <input
                  value={settings.gemini.model}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      gemini: { ...prev.gemini, model: event.target.value },
                    }))
                  }
                  placeholder="gemini-1.5-flash"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                />
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-1 block text-xs text-slate-500">Instrucao base do assistente</span>
                <textarea
                  value={settings.gemini.system_prompt}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      gemini: { ...prev.gemini, system_prompt: event.target.value },
                    }))
                  }
                  rows={5}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                />
              </label>
            </div>
          </article>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => {
              void save();
            }}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:opacity-60"
          >
            <Save size={15} />
            {saving ? "Salvando..." : "Salvar configuracoes"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-indigo-900">
        <div className="flex items-start gap-3">
          <BrainCircuit size={18} className="mt-0.5 text-indigo-700" />
          <p>
            Com a integracao ativa, o botao de cerebro fica disponivel no cabeçalho da conversa do WhatsApp para gerar resumo e orientação de linguagem.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
