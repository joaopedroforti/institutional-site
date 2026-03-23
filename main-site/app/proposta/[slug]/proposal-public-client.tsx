"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Layers3,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
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
  base_amount?: string | number | null;
  total_amount: string | number;
  entry_amount: string | number;
  discount_percent?: string | number | null;
  discount_amount?: string | number | null;
  internal_deadline_days: number | null;
  approved_at?: string | null;
  approved_person_name?: string | null;
  approved_person_cpf?: string | null;
  approved_person_birth_date?: string | null;
  adjustment_message: string | null;
};

function money(value: string | number): string {
  return `R$ ${Number(value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function textValue(value: unknown, fallback = "-"): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return fallback;
}

function capitalizeFirst(value: string): string {
  if (!value || value === "-") {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function maskCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function maskCpfForPublic(value?: string | null): string {
  const digits = onlyDigits(value ?? "");
  if (digits.length !== 11) {
    return "***.***.***-**";
  }

  return `${digits.slice(0, 3)}.***.***-**`;
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("pt-BR");
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
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveForm, setApproveForm] = useState({
    personName: "",
    personCpf: "",
    personBirthDate: "",
  });

  useEffect(() => {
    const isInternal = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("internal") === "1";
    void fetchProposal(slug, isInternal)
      .then((data) => {
        setProposal(data);
        setApproveForm((prev) => ({
          ...prev,
          personName: data.approved_person_name || data.client_name || "",
        }));
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
  const objective = capitalizeFirst(proposal?.objective || textValue(onboarding.siteObjective));
  const visual = capitalizeFirst(proposal?.visual_direction || textValue(onboarding.siteVisual));
  const assets = Array.isArray(onboarding.siteAssets)
    ? onboarding.siteAssets.map((item) => capitalizeFirst(String(item))).join(", ")
    : "-";
  const notes = textValue(onboarding.siteNotes, "Sem observacoes adicionais.");
  const serviceName = capitalizeFirst(textValue(onboarding.sitePrimaryGoal, objective));
  const references = textValue(onboarding.siteReferences, "Sem referencias informadas.");
  const projectName = proposal?.client_company || proposal?.client_name;
  const isApproved = proposal?.status === "approved";
  const discountPercent = Number(proposal?.discount_percent ?? 0);
  const discountAmount = Number(proposal?.discount_amount ?? 0);
  const hasDiscount = discountPercent > 0 || discountAmount > 0;
  const originalAmount = Number(proposal?.base_amount ?? Number(proposal?.total_amount ?? 0) + discountAmount);
  const approvedCpf = proposal?.approved_person_cpf
    ? maskCpf(proposal.approved_person_cpf)
    : "-";
  const whatsappRaw = textValue(onboarding.contactWhatsapp, "").replace(/\D/g, "");
  const whatsappHref = whatsappRaw ? `https://wa.me/55${whatsappRaw}` : null;
  const timeline = [
    {
      title: "Alinhamento",
      description: "Alinhamento estrategico, organizacao do briefing e definicao da arquitetura.",
    },
    {
      title: "Planejamento",
      description: "Direcao visual, wireframe dos blocos principais e ajustes de conteudo.",
    },
    {
      title: "Desenvolvimento",
      description: "Implementacao das paginas, responsividade e integracoes principais.",
    },
    {
      title: "Publicacao",
      description: "Rodada final de revisao, checklist de qualidade e colocacao no ar.",
    },
  ];
  const deliverables = [
    "Arquitetura focada em posicionamento e credibilidade da marca.",
    "Design responsivo com blocos institucionais e CTAs estrategicos.",
    "Configuracao de formulario principal para novos contatos.",
    `Paginas previstas nesta proposta: ${pages.map((item) => capitalizeFirst(item)).join(", ") || "Home, Sobre, Servicos, Contato"}.`,
    "Orientacao comercial para organizacao de textos e materiais criticos do projeto.",
  ];

  const approveProposal = async () => {
    if (!proposal) {
      return;
    }

    if (
      !approveForm.personName.trim() ||
      onlyDigits(approveForm.personCpf).length !== 11 ||
      !approveForm.personBirthDate
    ) {
      setFeedback("Preencha nome, CPF valido e data de nascimento para aprovar.");
      return;
    }

    setActionLoading(true);
    setFeedback(null);

    try {
      const response = await fetch(`${apiBaseUrl}/proposals/${proposal.slug}/approve`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          person_name: approveForm.personName.trim(),
          person_cpf: onlyDigits(approveForm.personCpf),
          person_birth_date: approveForm.personBirthDate,
        }),
      });

      if (!response.ok) {
        throw new ApiError("Nao foi possivel aprovar agora.", response.status);
      }

      setFeedback("Proposta aprovada com sucesso.");
      setProposal((prev) =>
        prev
          ? {
              ...prev,
              status: "approved",
              approved_at: new Date().toISOString(),
              approved_person_name: approveForm.personName.trim(),
              approved_person_cpf: onlyDigits(approveForm.personCpf),
              approved_person_birth_date: approveForm.personBirthDate,
            }
          : prev,
      );
      setApproveModalOpen(false);
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
              <div className={styles.heroTop}>
                <span className={styles.tag}>
                  {isApproved
                    ? `Proposta aprovada em ${formatDate(proposal.approved_at)} por ${proposal.approved_person_name || proposal.client_name} CPF ${maskCpfForPublic(proposal.approved_person_cpf)}`
                    : "Proposta pronta para analise"}
                </span>
                <h1>Resumo executivo da proposta</h1>
                <p>
                  Escopo, investimento e condicoes sugeridas para {projectName}, estruturados para acelerar decisao interna e inicio de execucao.
                </p>
                {isApproved && (
                  <div className={styles.approvedBadge}>
                    Proposta ja aprovada em {formatDate(proposal.approved_at)} por {proposal.approved_person_name || proposal.client_name}
                  </div>
                )}
              </div>
              <div className={styles.heroMetrics}>
                <div className={styles.metricCard}>
                  <p>Investimento</p>
                  <strong>{money(proposal.total_amount)}</strong>
                  {hasDiscount && (
                    <span className={styles.metricDiscount}>
                      Desconto aplicado: {discountPercent.toFixed(2)}% ({money(discountAmount)})<br />
                      De {money(originalAmount)} por {money(proposal.total_amount)}
                    </span>
                  )}
                </div>
                <div className={styles.metricCard}>
                  <p>Prazo</p>
                  <strong>{proposal.internal_deadline_days ?? "-"} dias uteis</strong>
                </div>
                <div className={styles.metricCard}>
                  <p>Entrada sugerida</p>
                  <strong>{money(proposal.entry_amount)}</strong>
                </div>
                <div className={styles.metricCard}>
                  <p>Status</p>
                  <strong>{isApproved ? "Aprovada" : "Em analise"}</strong>
                </div>
              </div>
            </article>

            <article className={styles.block}>
              <span className={styles.tag}>Proposta comercial</span>
              <h2>
                Proposta Comercial {projectName}
              </h2>
              <p className={styles.legend}>
                Proposta preparada para {projectName}, com escopo, investimento e condicoes comerciais definidos para viabilizar o inicio do projeto.
              </p>

              <div className={styles.gridCards}>
                <div className={styles.infoCard}>
                  <p>Objetivo principal</p>
                  <strong>{serviceName}</strong>
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
                <div className={styles.infoCard}>
                  <p>Contato</p>
                  <strong>{proposal.client_name}</strong>
                </div>
                <div className={styles.infoCard}>
                  <p>Prazo interno</p>
                  <strong>{proposal.internal_deadline_days ?? "-"} dias uteis</strong>
                </div>
              </div>
            </article>

            <article className={styles.block}>
              <div className={styles.sectionHeader}>
                <h3>Visao geral</h3>
                <span className={styles.softTag}>Condicao sugerida</span>
              </div>
              <div className={styles.highlightGrid}>
                <div className={styles.highlightCard}>
                  <Layers3 size={17} />
                  <h4>Estrutura e prioridade</h4>
                  <p>
                    A proposta organiza entregas com foco em clareza comercial, posicionamento da marca e conversao de contato qualificado.
                  </p>
                </div>
                <div className={styles.highlightCard}>
                  <Wallet size={17} />
                  <h4>Condicao sugerida</h4>
                  <p>
                    Entrada de {money(proposal.entry_amount)} + saldo em ate 10x. Valores iniciais para escopo descrito, com refinamento no fechamento.
                  </p>
                </div>
              </div>
            </article>

            <article className={styles.block}>
              <h3>Entregaveis principais</h3>
              <p>O que voce vai receber</p>
              <div className={styles.deliverables}>
                {deliverables.map((item, index) => (
                  <div key={`${item}-${index}`}>
                    {index % 2 === 0 ? <Target size={15} /> : <CheckCircle2 size={15} />}
                    {item}
                  </div>
                ))}
              </div>
            </article>

            <article className={styles.block}>
              <h3>Cronograma visual</h3>
              <p>Como o projeto acontece</p>
              <div className={styles.timeline}>
                {timeline.map((item, index) => (
                  <div key={item.title} className={styles.timelineItem}>
                    <div className={styles.timelineBadge}>{index + 1}</div>
                    <div>
                      <h4>{item.title}</h4>
                      <p>{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className={styles.block}>
              <h3>Investimento explicado</h3>
              <div className={styles.investmentCard}>
                <ShieldCheck size={18} />
                <div>
                  <h4>Investimento final da proposta</h4>
                  <p>Valor consolidado para escopo, prazo e nivel de acompanhamento definidos nesta proposta comercial.</p>
                </div>
                <strong>{money(proposal.total_amount)}</strong>
              </div>
            </article>

            <article className={styles.block}>
              <h3>Incluido nesta proposta</h3>
              <div className={styles.premissasGrid}>
                <div className={styles.premissasCard}>
                  <Sparkles size={16} />
                  <p>
                    <strong>Direcao visual considerada:</strong> {visual}.
                  </p>
                </div>
                <div className={styles.premissasCard}>
                  <FileText size={16} />
                  <p>
                    <strong>Materiais ja disponiveis:</strong> {assets}.
                  </p>
                </div>
                <div className={styles.premissasCard}>
                  <Rocket size={16} />
                  <p>
                    <strong>Observacao principal:</strong> {notes}
                  </p>
                </div>
                <div className={styles.premissasCard}>
                  <Clock3 size={16} />
                  <p>
                    <strong>Referencias:</strong> {references}
                  </p>
                </div>
              </div>
              {whatsappHref && (
                <a href={whatsappHref} target="_blank" rel="noreferrer" className={styles.whatsappLink}>
                  Falar no WhatsApp sobre esta proposta <ArrowRight size={15} />
                </a>
              )}
            </article>

            <article className={styles.finalCard}>
              <div>
                <h3>Proximos passos para dar sequencia ao projeto</h3>
                <div className={styles.nextStepGrid}>
                  <div className={styles.nextStepCard}>
                    <span>Passo 1</span>
                    <p>Aprovacao da proposta e confirmacao para inicio do projeto.</p>
                  </div>
                  <div className={styles.nextStepCard}>
                    <span>Passo 2</span>
                    <p>Alinhamento final de detalhes e organizacao dos materiais essenciais.</p>
                  </div>
                  <div className={styles.nextStepCard}>
                    <span>Passo 3</span>
                    <p>Kickoff, inicio da producao e acompanhamento ate a publicacao.</p>
                  </div>
                </div>
                <p>Revise com calma e responda no momento certo. Voce pode aprovar, pedir ajustes ou baixar PDF pela impressao.</p>
                <p className={styles.finalMeta}>
                  Investimento: <strong>{money(proposal.total_amount)}</strong> | Cronograma:{" "}
                  <strong>{proposal.internal_deadline_days ?? "-"} dias uteis</strong>
                </p>
              </div>
            </article>

            <article className={styles.block}>
              <h3>Outros Custos</h3>
              <p>Valores recorrentes necessarios para manter o projeto ativo apos a publicacao.</p>
              <div className={styles.extraCostsGrid}>
                <div className={styles.extraCostCard}>
                  <h4>Hospedagem</h4>
                  <strong>R$ 25,00/mes ou R$ 200,00/ano</strong>
                  <p>Incluso 10 contas de email com dominio @suaempresa.com</p>
                </div>
                <div className={styles.extraCostCard}>
                  <h4>Dominio</h4>
                  <strong>R$ 40,00/ano</strong>
                  <p>Pago diretamente no site do RegistroBR, ou podemos fazer o processo sem custo para a empresa (paga apenas os R$ 40,00).</p>
                </div>
              </div>
            </article>

            <article className={styles.block}>
              <h3>Acoes da proposta</h3>
              <p>Finalize sua analise e siga com a proxima etapa.</p>
              <div className={styles.finalActions}>
                {!isApproved && (
                  <>
                    <button
                      type="button"
                      onClick={() => setApproveModalOpen(true)}
                      disabled={actionLoading}
                    >
                      Aprovar proposta
                    </button>
                    <button type="button" onClick={() => setAdjustMode((prev) => !prev)} disabled={actionLoading}>
                      Solicitar ajustes
                    </button>
                  </>
                )}
                <button type="button" onClick={() => window.print()}>
                  Baixar PDF
                </button>
              </div>

              {adjustMode && !isApproved && (
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

        {approveModalOpen && proposal && (
          <div
            className={styles.approveModalOverlay}
            onClick={() => setApproveModalOpen(false)}
            role="presentation"
          >
            <div className={styles.approveModal} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
              <h3>Confirmar aprovacao da proposta</h3>
              <p>Para fins de cadastro e contrato, confirme os dados da pessoa responsavel pela aprovacao.</p>

              <label className={styles.modalField}>
                Nome da pessoa
                <input
                  type="text"
                  value={approveForm.personName}
                  onChange={(event) =>
                    setApproveForm((prev) => ({
                      ...prev,
                      personName: event.target.value,
                    }))
                  }
                  placeholder="Nome completo"
                  maxLength={255}
                />
              </label>

              <label className={styles.modalField}>
                CPF
                <input
                  type="text"
                  value={approveForm.personCpf}
                  onChange={(event) =>
                    setApproveForm((prev) => ({
                      ...prev,
                      personCpf: maskCpf(event.target.value),
                    }))
                  }
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                />
              </label>

              <label className={styles.modalField}>
                Data de nascimento
                <input
                  type="date"
                  value={approveForm.personBirthDate}
                  onChange={(event) =>
                    setApproveForm((prev) => ({
                      ...prev,
                      personBirthDate: event.target.value,
                    }))
                  }
                  max={new Date().toISOString().slice(0, 10)}
                />
              </label>

              {isApproved && (
                <p className={styles.modalHint}>
                  Proposta ja aprovada: {proposal.approved_person_name || proposal.client_name} | CPF {approvedCpf}
                </p>
              )}

              <div className={styles.approveModalActions}>
                <button type="button" onClick={() => setApproveModalOpen(false)} disabled={actionLoading}>
                  Cancelar
                </button>
                <button type="button" onClick={() => void approveProposal()} disabled={actionLoading || isApproved}>
                  Confirmar aprovacao
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </SiteShell>
  );
}
