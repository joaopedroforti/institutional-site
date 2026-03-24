import { FormEvent, useEffect, useState } from "react";
import { Gauge, Save } from "lucide-react";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import type { ScoreRulesResponse, ScoreRulesSettings } from "../../types/admin";

const DEFAULT_RULES: ScoreRulesSettings = {
  utm_source_bonus: 10,
  page_view_weight: 2,
  page_view_cap: 20,
  contact_page_bonus: 15,
  proposal_access_weight: 15,
  proposal_access_cap: 30,
  returned_after_proposal_bonus: 10,
  form_submit_weight: 10,
  form_submit_cap: 20,
  whatsapp_click_weight: 8,
  whatsapp_click_cap: 16,
  cta_click_weight: 4,
  cta_click_cap: 12,
  whatsapp_form_weight: 10,
  whatsapp_form_cap: 20,
  onboarding_deadline_bonus_cap: 20,
  low_activity_penalty: 5,
  hot_min_score: 70,
  warm_min_score: 35,
  draft_max_score: 12,
  draft_score_band: "cold",
  inbound_whatsapp_score: 80,
  inbound_whatsapp_band: "hot",
};

const BAND_OPTIONS = ["hot", "warm", "cold"];

type NumericRuleField = Exclude<keyof ScoreRulesSettings, "draft_score_band" | "inbound_whatsapp_band">;

export default function ScoreRulesSettingsPage() {
  const { token } = useAuth();
  const [rules, setRules] = useState<ScoreRulesSettings>(DEFAULT_RULES);
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
        const response = await apiRequest<ScoreRulesResponse>("/api/admin/settings/score-rules", {}, token);
        if (!active) {
          return;
        }

        setRules(response.data);
      } catch (requestError) {
        if (!active) {
          return;
        }
        setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel carregar as regras de score.");
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

  const updateNumericRule = (field: NumericRuleField, value: number) => {
    setRules((prev) => ({
      ...prev,
      [field]: Number.isFinite(value) ? value : 0,
    }));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest<ScoreRulesResponse>(
        "/api/admin/settings/score-rules",
        {
          method: "PATCH",
          body: JSON.stringify(rules),
        },
        token,
      );
      setSuccess("Regras de score atualizadas com sucesso.");
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel salvar as regras de score.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 p-6 text-white md:p-7">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-100">Lead Intelligence</p>
          <h2 className="mt-2 text-2xl font-semibold md:text-3xl">Regras de Score</h2>
          <p className="mt-2 max-w-3xl text-sm text-blue-50 md:text-base">
            Ajuste pesos, limites, faixas e comportamento de score dos leads sem alterar codigo.
          </p>
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {success && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}

        <form className="mt-5 space-y-4" onSubmit={save}>
          <section className="rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Pesos Base</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                ["utm_source_bonus", "Bonus UTM Source"],
                ["page_view_weight", "Peso por visualizacao de pagina"],
                ["page_view_cap", "Teto visualizacoes"],
                ["contact_page_bonus", "Bonus pagina de contato"],
                ["proposal_access_weight", "Peso por acesso de proposta"],
                ["proposal_access_cap", "Teto proposta"],
                ["returned_after_proposal_bonus", "Bonus retorno apos proposta"],
                ["onboarding_deadline_bonus_cap", "Teto bonus prazo onboarding"],
                ["low_activity_penalty", "Penalidade baixa atividade"],
              ].map(([field, label]) => (
                <label key={field} className="text-sm text-slate-700">
                  {label}
                  <input
                    type="number"
                    value={rules[field as NumericRuleField]}
                    onChange={(event) => updateNumericRule(field as NumericRuleField, Number(event.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    disabled={loading || saving}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Eventos</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
              {[
                ["form_submit_weight", "Peso form submit"],
                ["form_submit_cap", "Teto form submit"],
                ["whatsapp_click_weight", "Peso clique WhatsApp"],
                ["whatsapp_click_cap", "Teto clique WhatsApp"],
                ["cta_click_weight", "Peso CTA"],
                ["cta_click_cap", "Teto CTA"],
                ["whatsapp_form_weight", "Peso form WhatsApp"],
                ["whatsapp_form_cap", "Teto form WhatsApp"],
              ].map(([field, label]) => (
                <label key={field} className="text-sm text-slate-700">
                  {label}
                  <input
                    type="number"
                    value={rules[field as NumericRuleField]}
                    onChange={(event) => updateNumericRule(field as NumericRuleField, Number(event.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    disabled={loading || saving}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Bandas e Fluxos</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="text-sm text-slate-700">
                Score minimo Hot
                <input
                  type="number"
                  value={rules.hot_min_score}
                  onChange={(event) => updateNumericRule("hot_min_score", Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  disabled={loading || saving}
                />
              </label>
              <label className="text-sm text-slate-700">
                Score minimo Warm
                <input
                  type="number"
                  value={rules.warm_min_score}
                  onChange={(event) => updateNumericRule("warm_min_score", Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  disabled={loading || saving}
                />
              </label>
              <label className="text-sm text-slate-700">
                Draft: score maximo
                <input
                  type="number"
                  value={rules.draft_max_score}
                  onChange={(event) => updateNumericRule("draft_max_score", Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  disabled={loading || saving}
                />
              </label>
              <label className="text-sm text-slate-700">
                Draft: banda
                <select
                  value={rules.draft_score_band}
                  onChange={(event) => setRules((prev) => ({ ...prev, draft_score_band: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  disabled={loading || saving}
                >
                  {BAND_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-700">
                WhatsApp inbound: score inicial
                <input
                  type="number"
                  value={rules.inbound_whatsapp_score}
                  onChange={(event) => updateNumericRule("inbound_whatsapp_score", Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  disabled={loading || saving}
                />
              </label>
              <label className="text-sm text-slate-700">
                WhatsApp inbound: banda
                <select
                  value={rules.inbound_whatsapp_band}
                  onChange={(event) => setRules((prev) => ({ ...prev, inbound_whatsapp_band: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  disabled={loading || saving}
                >
                  {BAND_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? "Salvando..." : "Salvar regras"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <div className="flex items-start gap-3">
          <Gauge size={18} className="mt-0.5 text-blue-700" />
          <p>
            Essas regras alimentam o score operacional de leads e os comportamentos padrao de captura em rascunho e WhatsApp inbound.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
