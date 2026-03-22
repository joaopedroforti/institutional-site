"use client";

import { useSuperadmin } from "../components/superadmin-context";
import styles from "../system.module.css";

function formatDate(value: string | null) {
  if (!value) {
    return "Sem registro";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function SuperadminSessionsPage() {
  const { sessions } = useSuperadmin();
  const recentSessions = sessions.slice(0, 8);

  return (
    <section className={styles.panelWide}>
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.panelEyebrow}>User flow</span>
          <h2>Jornada das sessoes</h2>
        </div>
        <span className={styles.panelHint}>Paginas visitadas, dados identificados e eventos do usuario</span>
      </div>

      <div className={styles.sessionGrid}>
        {recentSessions.length === 0 ? <div className={styles.emptyState}>Nenhuma sessao registrada ainda.</div> : null}
        {recentSessions.map((session) => (
          <article className={styles.sessionCard} key={session.id}>
            <div className={styles.sessionHeader}>
              <div>
                <strong>{session.identified_name || session.identified_email || session.session_key.slice(0, 12)}</strong>
                <p>{session.identified_company || "Visitante sem empresa identificada"}</p>
              </div>
              <span className={styles.sessionBadge}>{session.total_page_views} paginas</span>
            </div>

            <div className={styles.sessionMeta}>
              <span>Landing: {session.landing_page || "Nao informado"}</span>
              <span>Ultima rota: {session.last_path || "Nao informado"}</span>
              <span>Ultima atividade: {formatDate(session.last_seen_at)}</span>
            </div>

            <div className={styles.timeline}>
              {session.page_visits.slice(0, 3).map((visit) => (
                <div className={styles.timelineItem} key={visit.id}>
                  <strong>{visit.path}</strong>
                  <span>{visit.title || "Pagina sem titulo"} - {formatDate(visit.visited_at)}</span>
                </div>
              ))}
              {session.interaction_events.slice(0, 3).map((event) => (
                <div className={styles.timelineItem} key={event.id}>
                  <strong>{event.event_type}</strong>
                  <span>{event.label || event.page_path || "Interacao sem rotulo"} - {formatDate(event.occurred_at)}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
