import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Mail, MapPin, PhoneCall, Save } from "lucide-react";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import type { GeneralSettings, GeneralSettingsResponse } from "../../types/admin";
import LoadingState from "../../components/common/LoadingState";

const DEFAULT_SETTINGS: GeneralSettings = {
  company_name: "FortiCorp",
  contact_email: "contato@forticorp.com.br",
  contact_phone: "",
  contact_whatsapp: "",
  contact_whatsapp_url: "",
  contact_address: "",
};

type SectionCardProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
};

function SectionCard({ icon, title, subtitle, children }: SectionCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">{icon}</span>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

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
        contact_address: response.data.contact_address ?? "",
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

  const phoneWhatsappValue = useMemo(
    () => (settings.contact_whatsapp?.trim() ? settings.contact_whatsapp : settings.contact_phone),
    [settings.contact_phone, settings.contact_whatsapp],
  );

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

      setSuccess("Informacoes gerais atualizadas com sucesso.");
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel salvar configuracoes gerais.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 p-6 text-white md:p-7">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-100">Informacoes da Empresa</p>
          <h2 className="mt-2 text-2xl font-semibold md:text-3xl">Configuracoes Gerais</h2>
          <p className="mt-2 max-w-3xl text-sm text-blue-50 md:text-base">
            Esses dados sao usados no painel administrativo e tambem nas paginas institucionais.
          </p>
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {success && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}

        {loading ? (
          <LoadingState label="Carregando configuracoes..." className="mt-5" />
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard icon={<Building2 size={18} />} title="Empresa" subtitle="Identidade principal da operacao">
              <label className="text-sm text-slate-700">
                <span className="mb-1 block text-xs text-slate-500">Nome da empresa</span>
                <input
                  value={settings.company_name}
                  onChange={(event) => setSettings((prev) => ({ ...prev, company_name: event.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
            </SectionCard>

            <SectionCard icon={<Mail size={18} />} title="Contato" subtitle="Canal de comunicacao institucional">
              <label className="text-sm text-slate-700">
                <span className="mb-1 block text-xs text-slate-500">E-mail de contato</span>
                <input
                  type="email"
                  value={settings.contact_email}
                  onChange={(event) => setSettings((prev) => ({ ...prev, contact_email: event.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
            </SectionCard>

            <SectionCard icon={<PhoneCall size={18} />} title="Telefone / WhatsApp" subtitle="Numero principal para painel e institucional">
              <label className="text-sm text-slate-700">
                <span className="mb-1 block text-xs text-slate-500">Telefone / WhatsApp</span>
                <input
                  value={phoneWhatsappValue}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSettings((prev) => ({
                      ...prev,
                      contact_phone: value,
                      contact_whatsapp: value,
                    }));
                  }}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                  placeholder="(11) 99999-0000"
                />
              </label>
            </SectionCard>

            <SectionCard icon={<MapPin size={18} />} title="Endereco" subtitle="Usado em rodape e pontos institucionais">
              <label className="text-sm text-slate-700">
                <span className="mb-1 block text-xs text-slate-500">Endereco</span>
                <input
                  value={settings.contact_address}
                  onChange={(event) => setSettings((prev) => ({ ...prev, contact_address: event.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                  placeholder="Rua, numero, bairro, cidade - UF"
                />
              </label>
            </SectionCard>
          </div>
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
            {saving ? "Salvando..." : "Salvar configuracoes"}
          </button>
        </div>
      </section>
    </PageShell>
  );
}
