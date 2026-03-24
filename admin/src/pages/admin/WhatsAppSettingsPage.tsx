import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, Save, Unplug } from "lucide-react";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import type { WhatsAppProfileResponse, WhatsAppSettingsResponse } from "../../types/admin";
import LoadingState from "../../components/common/LoadingState";

type ProfileForm = {
  profile_name: string;
  profile_status: string;
  profile_picture_base64: string;
};

const DEFAULT_PROFILE_FORM: ProfileForm = {
  profile_name: "",
  profile_status: "",
  profile_picture_base64: "",
};

export default function WhatsAppSettingsPage() {
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshingProfile, setRefreshingProfile] = useState(false);
  const [registeringWebhook, setRegisteringWebhook] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [settingsData, setSettingsData] = useState<WhatsAppSettingsResponse["data"] | null>(null);
  const [profileData, setProfileData] = useState<WhatsAppProfileResponse["data"] | null>(null);
  const [signMessages, setSignMessages] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileForm>(DEFAULT_PROFILE_FORM);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [settingsResponse, profileResponse] = await Promise.all([
        apiRequest<WhatsAppSettingsResponse>("/api/admin/whatsapp/settings", {}, token),
        apiRequest<WhatsAppProfileResponse>("/api/admin/whatsapp/instance/profile", {}, token),
      ]);

      setSettingsData(settingsResponse.data);
      setProfileData(profileResponse.data);
      setSignMessages(Boolean(settingsResponse.data.settings.sign_messages));
      setProfileForm({
        profile_name: settingsResponse.data.instance.profile_name ?? "",
        profile_status: settingsResponse.data.instance.profile_status ?? "",
        profile_picture_base64: "",
      });
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel carregar configuracoes de WhatsApp.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveSettings = async () => {
    if (!token) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest<{ message: string }>(
        "/api/admin/whatsapp/settings",
        {
          method: "PUT",
          body: JSON.stringify({
            sign_messages: signMessages,
            config_json: settingsData?.settings.config_json ?? {},
          }),
        },
        token,
      );

      const payload: Record<string, string> = {};
      if (profileForm.profile_name.trim()) {
        payload.profile_name = profileForm.profile_name.trim();
      }
      if (profileForm.profile_status.trim()) {
        payload.profile_status = profileForm.profile_status.trim();
      }
      if (profileForm.profile_picture_base64.trim()) {
        payload.profile_picture_base64 = profileForm.profile_picture_base64.trim();
      }

      if (Object.keys(payload).length > 0) {
        await apiRequest<{ message: string }>(
          "/api/admin/whatsapp/instance/profile",
          {
            method: "PUT",
            body: JSON.stringify(payload),
          },
          token,
        );
      }

      setSuccess("Configuracoes de WhatsApp salvas com sucesso.");
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel salvar configuracoes.");
    } finally {
      setSaving(false);
    }
  };

  const refreshProfile = async () => {
    if (!token) {
      return;
    }

    setRefreshingProfile(true);
    setError(null);

    try {
      const response = await apiRequest<WhatsAppProfileResponse>("/api/admin/whatsapp/instance/profile", {}, token);
      setProfileData(response.data);
      setSuccess("Perfil e status atualizados com sucesso.");
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel atualizar status remoto.");
    } finally {
      setRefreshingProfile(false);
    }
  };

  const registerWebhook = async () => {
    if (!token) {
      return;
    }

    setRegisteringWebhook(true);
    setError(null);

    try {
      await apiRequest<{ message: string }>(
        "/api/admin/whatsapp/webhook/register",
        {
          method: "POST",
        },
        token,
      );

      setSuccess("Webhook registrado com sucesso na Evolution API.");
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel registrar webhook.");
    } finally {
      setRegisteringWebhook(false);
    }
  };

  const status = settingsData?.instance.status ?? profileData?.instance.status ?? "unknown";
  const online = ["open", "connected", "online"].includes(status.toLowerCase());

  return (
    <PageShell>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Instancia FortiCorp</h3>
            <p className="mt-1 text-sm text-slate-500">Gerencie perfil, assinatura e conexao da instancia existente.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void refreshProfile();
              }}
              disabled={refreshingProfile}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshingProfile ? "animate-spin" : ""} />
              Atualizar status
            </button>

            <button
              type="button"
              onClick={() => {
                void saveSettings();
              }}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Salvar
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingState label="Carregando configuracoes de WhatsApp..." className="p-4" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Status da conexao</p>
                <p className={`mt-1 inline-flex items-center gap-1 text-sm font-semibold ${online ? "text-emerald-700" : "text-amber-700"}`}>
                  {online ? <CheckCircle2 size={14} /> : <Unplug size={14} />}
                  {status}
                </p>
                <p className="mt-1 text-xs text-slate-500">Ultimo sincronismo: {settingsData?.instance.last_synced_at ?? "-"}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Webhook / realtime</p>
                <p className="mt-1 text-sm font-medium text-slate-800 break-all">{settingsData?.evolution.webhook_url || "Nao configurado"}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Modo: {settingsData?.evolution.realtime_mode ?? "polling"} • Polling: {settingsData?.evolution.polling_interval ?? 10}s
                </p>
                <button
                  type="button"
                  onClick={() => {
                    void registerWebhook();
                  }}
                  disabled={registeringWebhook}
                  className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                >
                  {registeringWebhook ? "Registrando..." : "Registrar webhook na Evolution"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-700">
                <span className="mb-1 block text-xs text-slate-500">Nome do perfil</span>
                <input
                  value={profileForm.profile_name}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, profile_name: event.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                  placeholder="FortiCorp"
                />
              </label>

              <label className="text-sm text-slate-700">
                <span className="mb-1 block text-xs text-slate-500">Status do perfil</span>
                <input
                  value={profileForm.profile_status}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, profile_status: event.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                  placeholder="Atendimento comercial"
                />
              </label>

              <label className="text-sm text-slate-700 md:col-span-2">
                <span className="mb-1 block text-xs text-slate-500">Foto de perfil (base64, opcional)</span>
                <textarea
                  value={profileForm.profile_picture_base64}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, profile_picture_base64: event.target.value }))}
                  rows={3}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                  placeholder="data:image/png;base64,..."
                />
              </label>

              <label className="text-sm text-slate-700 md:col-span-2">
                <span className="mb-1 block text-xs text-slate-500">Assinar mensagem manual</span>
                <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-2">
                  <input
                    id="wa-sign-messages"
                    type="checkbox"
                    checked={signMessages}
                    onChange={(event) => setSignMessages(event.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="wa-sign-messages" className="text-sm text-slate-700">
                    Se ativo, envia no formato *Nome do Usuario* + quebra de linha + mensagem.
                  </label>
                </div>
              </label>
            </div>
          </div>
        )}
      </section>
    </PageShell>
  );
}
