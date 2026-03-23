"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, FileText, Target } from "lucide-react";
import SiteShell from "../../components/site-shell";
import { ApiError, apiBaseUrl } from "../../lib/api";
import styles from "./proposal.module.css";

type ProposalData = {
  id: number;
  slug: string;
  status: string;
  title: string;
  client_name: string;
  client_company: string | null;
  objective: string | null;
  visual_direction: string | null;
  selected_pages: string[] | null;
  onboarding_answers: Record<string, unknown> | null;
  total_amount: string | number;
  entry_amount: string | number;
  internal_deadline_days: number | null;
  adjustment_message: string | null;
};

function money(value: string | number): string {
  return `R$ ${Number(value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function fetchProposal(slug: string, isInternal: boolean): Promise<ProposalData> {
  const query = isInternal ? "?internal=1" : "";
  const response = await fetch(`${apiBaseUrl}/proposals/${slug}${query}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError("Nao foi possivel carregar a proposta.", response.status);
  }

  const payload = (await response.json()) as { data: ProposalData };
  return payload.data;
}

export default function ProposalPublicClient({ slug }: { slug: string }) {
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjustMode, setAdjustMode] = useState(false);
  const [adjustText, setAdjustText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const isInternal = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("internal") === "1";
    void fetchProposal(slug, isInternal)
      .then((data) => {
        setProposal(data);
      })
      .catch((requestError) => {
        setError(requestError instanceof ApiError ? requestError.message : "Falha ao carregar proposta.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  const onboarding = (proposal?.onboarding_answers ?? {}) as Record<string, unknown>;
  const pages = useMemo(() => (Array.isArray(proposal?.selected_pages) ? proposal?.selected_pages : []), [proposal?.selected_pages]);
  const objective = proposal?.objective || String(onboarding.siteObjective ?? "-");
  const visual = proposal?.visual_direction || String(onboarding.siteVisual ?? "-");
  const assets = Array.isArray(onboarding.siteAssets) ? onboarding.siteAssets.map((item) => String(item)).join(", ") : "-";
  const notes = String(onboarding.siteNotes ?? "");

  const approveProposal = async () => {
    if (!proposal) {
      return;
    }

    setActionLoading(true);
    setFeedback(null);

    try {
      const response = await fetch(`${apiBaseUrl}/proposals/${proposal.slug}/approve`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new ApiError("Nao foi possivel aprovar agora.", response.status);
      }

      setFeedback("Proposta aprovada com sucesso.");
      setProposal((prev) => (prev ? { ...prev, status: "approved" } : prev));
    } catch (requestError) {
      setFeedback(requestError instanceof ApiError ? requestError.message : "Falha ao aprovar proposta.");
    } finally {
      setActionLoading(false);
    }
  };

  const requestAdjustments = async () => {
    if (!proposal || !adjustText.trim()) {
      setFeedback("Escreva os ajustes desejados.");
      return;
    }

    setActionLoading(true);
    setFeedback(null);

    try {
      const response = await fetch(`${apiBaseUrl}/proposals/${proposal.slug}/request-adjustment`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: adjustText,
        }),
      });

      if (!response.ok) {
        throw new ApiError("Nao foi possivel enviar os ajustes.", response.status);
      }

      setFeedback("Ajustes enviados com sucesso.");
      setProposal((prev) =>
        prev
          ? {
              ...prev,
              status: "adjustment_requested",
              adjustment_message: adjustText.trim(),
            }
          : prev,
      );
      setAdjustMode(false);
      setAdjustText("");
    } catch (requestError) {
      setFeedback(requestError instanceof ApiError ? requestError.message : "Falha ao enviar ajustes.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <SiteShell>
      <section className={styles.wrapper}>
        {loading && <p className={styles.loading}>Carregando proposta...</p>}
        {error && <p className={styles.error}>{error}</p>}

        {!loading && proposal && (
          <div className={styles.stack}>
            <article className={styles.heroCard}>
              <div>
                <span className={styles.tag}>Proposta pronta para analise</span>
                <h1>Resumo</h1>
                <p>
                  Aqui estao o escopo, o investimento e as condicoes sugeridas para este projeto, ja organizados para facilitar sua analise interna.
                </p>
              </div>
              <div className={styles.heroMetrics}>
                <div className={styles.metricCard}>
                  <p>Investimento</p>
                  <strong>{money(proposal.total_amount)}</strong>
                </div>
                <div className={styles.metricCard}>
                  <p>Prazo</p>
                  <strong>Entrega em {proposal.internal_deadline_days ?? "-"} dias uteis</strong>
                </div>
              </div>
            </article>

            <article className={styles.block}>
              <span className={styles.tag}>Proposta comercial</span>
              <h2>
                Proposta Comercial {proposal.client_company || proposal.client_name}
              </h2>
              <p className={styles.legend}>
                Proposta preparada para {proposal.client_company || proposal.client_name}, com escopo, investimento e condicoes comerciais definidos para viabilizar o inicio do projeto.
              </p>

              <div className={styles.gridCards}>
                <div className={styles.infoCard}>
                  <p>Objetivo do projeto</p>
                  <strong>{objective}</strong>
                </div>
                <div className={styles.infoCard}>
                  <p>Direcao visual</p>
                  <strong>{visual}</strong>
                </div>
                <div className={styles.infoCard}>
                  <p>Investimento total</p>
                  <strong>{money(proposal.total_amount)}</strong>
                </div>
                <div className={styles.infoCard}>
                  <p>Entrada sugerida</p>
                  <strong>{money(proposal.entry_amount)}</strong>
                </div>
              </div>
            </article>

            <article className={styles.block}>
              <h3>Entregaveis principais</h3>
              <p>O que voce vai receber</p>
              <div className={styles.deliverables}>
                <div><Target size={15} /> Arquitetura focada em posicionamento e credibilidade da marca.</div>
                <div><CheckCircle2 size={15} /> Design responsivo com blocos institucionais e CTAs estrategicos.</div>
                <div><FileText size={15} /> Configuracao de formulario principal para novos contatos.</div>
                <div><Clock3 size={15} /> Paginas previstas nesta proposta: {pages.join(", ") || "Home, Sobre, Servicos, Contato"}.</div>
                <div><CheckCircle2 size={15} /> Orientacao comercial para organizacao de textos e materiais criticos.</div>
              </div>
            </article>

            <article className={styles.block}>
              <h3>Investimento explicado</h3>
              <p>Investimento final da proposta: {money(proposal.total_amount)}</p>
              <p>Entrada de {money(proposal.entry_amount)} + saldo em ate 10x.</p>
            </article>

            <article className={styles.block}>
              <h3>Premissas e direcionamentos</h3>
              <p>Direcao visual considerada: {visual}.</p>
              <p>Materiais disponiveis: {assets}.</p>
              <p>Observacao do cliente: {notes || "Sem observacoes adicionais."}</p>
            </article>

            <article className={styles.block}>
              <h3>Proximos passos</h3>
              <ul className={styles.steps}>
                <li>Aprovacao da proposta e confirmacao de inicio do projeto.</li>
                <li>Alinhamento final dos detalhes e organizacao de materiais essenciais.</li>
                <li>Kickoff, inicio da producao e acompanhamento ate a publicacao.</li>
              </ul>
            </article>

            <article className={styles.finalCard}>
              <div>
                <h3>Revise com calma e responda no momento certo</h3>
                <p>Voce pode aprovar agora, pedir ajustes ou baixar via impressao do navegador.</p>
                <p className={styles.finalMeta}>
                  Investimento: <strong>{money(proposal.total_amount)}</strong> | Cronograma:{" "}
                  <strong>{proposal.internal_deadline_days ?? "-"} dias uteis</strong>
                </p>
              </div>
              <div className={styles.finalActions}>
                <button type="button" onClick={() => void approveProposal()} disabled={actionLoading}>
                  Aprovar proposta
                </button>
                <button type="button" onClick={() => setAdjustMode((prev) => !prev)} disabled={actionLoading}>
                  Solicitar ajustes
                </button>
                <button type="button" onClick={() => window.print()}>
                  Baixar PDF
                </button>
              </div>

              {adjustMode && (
                <div className={styles.adjustBox}>
                  <textarea
                    value={adjustText}
                    onChange={(event) => setAdjustText(event.target.value)}
                    placeholder="Descreva os ajustes desejados..."
                    rows={4}
                  />
                  <button type="button" onClick={() => void requestAdjustments()} disabled={actionLoading}>
                    Enviar ajustes
                  </button>
                </div>
              )}

              {proposal.adjustment_message && (
                <p className={styles.feedback}>Ultimo ajuste solicitado: {proposal.adjustment_message}</p>
              )}

              {feedback && <p className={styles.feedback}>{feedback}</p>}
            </article>
          </div>
        )}
      </section>
    </SiteShell>
  );
}
