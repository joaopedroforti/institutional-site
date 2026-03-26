import { useCallback, useEffect, useState } from "react";
import { Save } from "lucide-react";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import type { IntegrationsSettings, IntegrationsSettingsResponse, MetaAdvancedMatchingFields } from "../../types/admin";
import LoadingState from "../../components/common/LoadingState";

const DEFAULT_ADVANCED_FIELDS: MetaAdvancedMatchingFields = {
  city_state_zip: false,
  country: false,
  birth_date: false,
  email: true,
  external_id: false,
  gender: false,
  first_name_last_name: true,
  phone: true,
};

const DEFAULT_SETTINGS: IntegrationsSettings = {
  meta_pixel: {
    enabled: false,
    pixel_id: "",
    automatic_advanced_matching: false,
    advanced_matching_fields: { ...DEFAULT_ADVANCED_FIELDS },
    conversions_api_enabled: false,
    access_token: "",
    api_version: "v22.0",
    test_event_code: "",
  },
};

const FIELD_LABELS: Array<{ key: keyof MetaAdvancedMatchingFields; label: string }> = [
  { key: "city_state_zip", label: "Cidade, estado e código postal" },
  { key: "country", label: "País" },
  { key: "birth_date", label: "Data de nascimento" },
  { key: "email", label: "Email" },
  { key: "external_id", label: "Identificação externa" },
  { key: "gender", label: "Gênero" },
  { key: "first_name_last_name", label: "Nome e sobrenome" },
  { key: "phone", label: "Número de telefone" },
];

export default function MetaIntegracaoSettingsPage() {
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
      const payload = response.data?.meta_pixel ?? DEFAULT_SETTINGS.meta_pixel;
      setSettings({
        meta_pixel: {
          enabled: Boolean(payload.enabled),
          pixel_id: String(payload.pixel_id ?? ""),
          automatic_advanced_matching: Boolean(payload.automatic_advanced_matching),
          advanced_matching_fields: {
            ...DEFAULT_ADVANCED_FIELDS,
            ...(payload.advanced_matching_fields ?? {}),
          },
          conversions_api_enabled: Boolean(payload.conversions_api_enabled),
          access_token: String(payload.access_token ?? ""),
          api_version: String(payload.api_version ?? "v22.0"),
          test_event_code: String(payload.test_event_code ?? ""),
        },
      });
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel carregar as integracoes.");
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
          body: JSON.stringify(settings),
        },
        token,
      );
      setSuccess("Configurações do Meta Pixel atualizadas.");
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel salvar as configuracoes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 p-6 text-white md:p-7">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-100">Integrações</p>
          <h2 className="mt-2 text-2xl font-semibold md:text-3xl">Meta Pixel</h2>
          <p className="mt-2 max-w-2xl text-sm text-blue-50 md:text-base">
            Configure o Pixel da Meta para rastrear PageView e melhorar campanhas de remarketing e atribuição.
          </p>
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {success && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}

        {loading ? (
          <LoadingState label="Carregando Meta Pixel..." className="mt-5" />
        ) : (
          <article className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Configuração do Pixel</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Habilite a integração e informe o ID do Pixel para ativar a injeção automática no main-site.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.meta_pixel.enabled}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      meta_pixel: { ...prev.meta_pixel, enabled: event.target.checked },
                    }))
                  }
                  className="size-4 rounded border-slate-300 text-blue-600"
                />
                Ativo
              </label>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-sm text-slate-700">
                <span className="mb-1 block text-xs text-slate-500">Pixel ID</span>
                <input
                  value={settings.meta_pixel.pixel_id}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      meta_pixel: { ...prev.meta_pixel, pixel_id: event.target.value },
                    }))
                  }
                  placeholder="1634106054280952"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                />
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.meta_pixel.automatic_advanced_matching}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      meta_pixel: { ...prev.meta_pixel, automatic_advanced_matching: event.target.checked },
                    }))
                  }
                  className="size-4 rounded border-slate-300 text-blue-600"
                />
                Ativar correspondência avançada automática
              </label>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={settings.meta_pixel.conversions_api_enabled}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        meta_pixel: { ...prev.meta_pixel, conversions_api_enabled: event.target.checked },
                      }))
                    }
                    className="size-4 rounded border-slate-300 text-blue-600"
                  />
                  Ativar API de Conversões (CAPI)
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  Envia eventos direto do backend para aumentar confiabilidade de mensuração.
                </p>
              </div>

              <label className="block text-sm text-slate-700">
                <span className="mb-1 block text-xs text-slate-500">Access Token da Conversions API</span>
                <input
                  type="password"
                  value={settings.meta_pixel.access_token}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      meta_pixel: { ...prev.meta_pixel, access_token: event.target.value },
                    }))
                  }
                  placeholder="EAAX..."
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                />
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-sm text-slate-700">
                  <span className="mb-1 block text-xs text-slate-500">API Version</span>
                  <input
                    value={settings.meta_pixel.api_version}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        meta_pixel: { ...prev.meta_pixel, api_version: event.target.value },
                      }))
                    }
                    placeholder="v22.0"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                  />
                </label>

                <label className="block text-sm text-slate-700">
                  <span className="mb-1 block text-xs text-slate-500">Test Event Code (opcional)</span>
                  <input
                    value={settings.meta_pixel.test_event_code}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        meta_pixel: { ...prev.meta_pixel, test_event_code: event.target.value },
                      }))
                    }
                    placeholder="TEST12345"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                  />
                </label>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Campos de correspondência</p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {FIELD_LABELS.map((field) => (
                    <label key={field.key} className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={settings.meta_pixel.advanced_matching_fields[field.key]}
                        onChange={(event) =>
                          setSettings((prev) => ({
                            ...prev,
                            meta_pixel: {
                              ...prev.meta_pixel,
                              advanced_matching_fields: {
                                ...prev.meta_pixel.advanced_matching_fields,
                                [field.key]: event.target.checked,
                              },
                            },
                          }))
                        }
                        className="size-4 rounded border-slate-300 text-blue-600"
                      />
                      {field.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </article>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => {
              void save();
            }}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? "Salvando..." : "Salvar configurações"}
          </button>
        </div>
      </section>
    </PageShell>
  );
}
