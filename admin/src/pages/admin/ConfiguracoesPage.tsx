import { useCallback, useEffect, useState } from "react";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import type { GeneralSettings, GeneralSettingsResponse } from "../../types/admin";

const DEFAULT_SETTINGS: GeneralSettings = {
  company_name: "FortiCorp",
  contact_email: "contato@forticorp.com.br",
  contact_phone: "",
  contact_whatsapp: "",
  contact_whatsapp_url: "",
};

export default function ConfiguracoesPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULT_SETTINGS);
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
      const response = await apiRequest<GeneralSettingsResponse>("/api/admin/settings/general", {}, token);
      setSettings({
        company_name: response.data.company_name ?? "",
        contact_email: response.data.contact_email ?? "",
        contact_phone: response.data.contact_phone ?? "",
        contact_whatsapp: response.data.contact_whatsapp ?? "",
        contact_whatsapp_url: response.data.contact_whatsapp_url ?? "",
      });
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel carregar configuracoes gerais.");
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
      await apiRequest<GeneralSettingsResponse>(
        "/api/admin/settings/general",
        {
          method: "PATCH",
          body: JSON.stringify(settings),
        },
        token,
      );

      setSuccess("Configuracoes gerais atualizadas com sucesso.");
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel salvar configuracoes gerais.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Configuracoes Gerais</h3>
            <p className="mt-1 text-sm text-slate-500">
              Dados publicos usados na landing de ofertas de sites e canais de contato.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void save();
            }}
            disabled={loading || saving}
            className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar configuracoes"}
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Carregando configuracoes...</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs text-slate-500">Nome da empresa</span>
              <input
                value={settings.company_name}
                onChange={(event) => setSettings((prev) => ({ ...prev, company_name: event.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs text-slate-500">E-mail de contato</span>
              <input
                type="email"
                value={settings.contact_email}
                onChange={(event) => setSettings((prev) => ({ ...prev, contact_email: event.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs text-slate-500">Telefone</span>
              <input
                value={settings.contact_phone}
                onChange={(event) => setSettings((prev) => ({ ...prev, contact_phone: event.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="(11) 4000-0000"
              />
            </label>

            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs text-slate-500">WhatsApp</span>
              <input
                value={settings.contact_whatsapp}
                onChange={(event) => setSettings((prev) => ({ ...prev, contact_whatsapp: event.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="(11) 99999-0000"
              />
            </label>

            <label className="text-sm text-slate-700 md:col-span-2">
              <span className="mb-1 block text-xs text-slate-500">Link WhatsApp (wa.me)</span>
              <input
                value={settings.contact_whatsapp_url}
                onChange={(event) => setSettings((prev) => ({ ...prev, contact_whatsapp_url: event.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="https://wa.me/5511999990000"
              />
            </label>
          </div>
        )}
      </section>
    </PageShell>
  );
}
