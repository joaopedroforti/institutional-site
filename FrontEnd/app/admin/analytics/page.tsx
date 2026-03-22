"use client";

import { useSuperadmin } from "../components/superadmin-context";
import styles from "../system.module.css";

export default function SuperadminAnalyticsPage() {
  const { dashboard } = useSuperadmin();
  const topPages = dashboard?.top_pages ?? [];
  const topEvents = dashboard?.top_events ?? [];
  const topPageMax = Math.max(...topPages.map((item) => item.total), 1);
  const topEventMax = Math.max(...topEvents.map((item) => item.total), 1);

  return (
    <>
      <section className={styles.operationsGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>Top pages</span>
              <h2>Paginas mais acessadas</h2>
            </div>
          </div>
          <div className={styles.progressList}>
            {topPages.length === 0 ? <div className={styles.emptyState}>Sem dados de paginas ainda.</div> : null}
            {topPages.slice(0, 8).map((item) => (
              <div className={styles.progressRow} key={item.path}>
                <div className={styles.progressHead}>
                  <strong>{item.path}</strong>
                  <span>{item.total}</span>
                </div>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${(item.total / topPageMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>Top events</span>
              <h2>Eventos mais frequentes</h2>
            </div>
          </div>
          <div className={styles.progressList}>
            {topEvents.length === 0 ? <div className={styles.emptyState}>Sem eventos registrados ainda.</div> : null}
            {topEvents.slice(0, 8).map((item) => (
              <div className={styles.progressRow} key={item.event_type}>
                <div className={styles.progressHead}>
                  <strong>{item.event_type}</strong>
                  <span>{item.total}</span>
                </div>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFillAlt} style={{ width: `${(item.total / topEventMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
