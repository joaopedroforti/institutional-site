"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ApiError, apiFetch } from "../../../lib/api";
import { getAdminToken } from "../../../lib/admin-auth";
import styles from "../../system.module.css";

type LeadProfileResponse = {
  data: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    status: string;
    lead_score: number;
    score_band: string;
    source_url: string | null;
    created_at: string;
    message: string;
    internal_notes: string | null;
    tracking_summary: {
      sessions_count: number;
      total_page_views: number;
      last_page_accessed: string | null;
      last_access_at: string | null;
      accessed_contact_page: boolean;
      accessed_proposal: boolean;
      proposal_accesses: number;
      returned_after_proposal: boolean;
      navigation_depth: number;
      origin: {
        referrer: string | null;
        utm_source: string | null;
        utm_medium: string | null;
        utm_campaign: string | null;
      };
      top_pages: Array<{ path: string; total: number }>;
    };
    tracking: {
      timeline: Array<{
        type: string;
        event_type: string;
        label: string | null;
        at: string | null;
      }>;
    };
  };
};

function formatDate(value: string | null) {
  if (!value) {
    return "Sem registro";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminLeadProfilePage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lead, setLead] = useState<LeadProfileResponse["data"] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLeadProfile() {
      const token = getAdminToken();

      if (!token || !params.id) {
        if (!cancelled) {
          setError("Sessao invalida. Entre novamente.");
          setLoading(false);
        }
        return;
      }

      try {
        const response = await apiFetch<LeadProfileResponse>(`/admin/contacts/${params.id}`, {
          token,
        });

        if (!cancelled) {
          setLead(response.data);
        }
      } catch (requestError) {
        const message =
          requestError instanceof ApiError ? requestError.message : "Nao foi possivel carregar o perfil do lead.";

        if (!cancelled) {
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLeadProfile();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const topPages = useMemo(() => lead?.tracking_summary.top_pages ?? [], [lead?.tracking_summary.top_pages]);

  if (loading) {
    return <section className={styles.panel}>Carregando perfil do lead...</section>;
  }

  if (error || !lead) {
    return <section className={styles.errorPanel}>{error || "Lead nao encontrado."}</section>;
  }

  return (
    <section className={styles.moduleGrid}>
      <article className={styles.moduleSection}>
        <h2 className={styles.moduleTitle}>{lead.name}</h2>
        <p className={styles.moduleDescription}>
          {lead.email || "Sem e-mail"} • {lead.phone || "Sem WhatsApp"} • score {lead.lead_score} ({lead.score_band})
        </p>

        <table className={styles.moduleTable}>
          <thead>
            <tr>
              <th>Campo</th>
              <th>Valor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Empresa</td>
              <td>{lead.company || "Sem empresa"}</td>
              <td><span className={styles.badgeMuted}>Cadastro</span></td>
            </tr>
            <tr>
              <td>Origem</td>
              <td>{lead.source_url || "Nao informado"}</td>
              <td><span className={styles.badge}>Origem</span></td>
            </tr>
            <tr>
              <td>Ultima acao</td>
              <td>{formatDate(lead.tracking_summary.last_access_at)}</td>
              <td><span className={styles.badgeSuccess}>Atividade</span></td>
            </tr>
          </tbody>
        </table>
      </article>

      <aside className={styles.moduleSection}>
        <h3 className={styles.moduleTitle}>Rastreamento consolidado</h3>
        <div className={styles.statList}>
          <div className={styles.statItem}><span>Sessoes</span><strong>{lead.tracking_summary.sessions_count}</strong></div>
          <div className={styles.statItem}><span>Paginas acessadas</span><strong>{lead.tracking_summary.total_page_views}</strong></div>
          <div className={styles.statItem}><span>Acessou contato</span><strong>{lead.tracking_summary.accessed_contact_page ? "Sim" : "Nao"}</strong></div>
          <div className={styles.statItem}><span>Acessou proposta</span><strong>{lead.tracking_summary.accessed_proposal ? "Sim" : "Nao"}</strong></div>
          <div className={styles.statItem}><span>Retornou apos proposta</span><strong>{lead.tracking_summary.returned_after_proposal ? "Sim" : "Nao"}</strong></div>
        </div>
      </aside>

      <article className={styles.moduleSection}>
        <h3 className={styles.moduleTitle}>Paginas mais visitadas</h3>
        {topPages.length === 0 ? <div className={styles.emptyState}>Sem paginas registradas.</div> : null}
        <div className={styles.progressList}>
          {topPages.map((item) => (
            <div className={styles.progressRow} key={item.path}>
              <div className={styles.progressHead}>
                <strong>{item.path}</strong>
                <span>{item.total}</span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${(item.total / Math.max(...topPages.map((entry) => entry.total), 1)) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className={styles.moduleSection}>
        <h3 className={styles.moduleTitle}>Timeline de atividade</h3>
        <div className={styles.timeline}>
          {lead.tracking.timeline.slice(0, 15).map((event, index) => (
            <div className={styles.timelineItem} key={`${event.event_type}-${index}`}>
              <strong>{event.event_type}</strong>
              <span>{event.label || "Sem descricao"} - {formatDate(event.at)}</span>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
