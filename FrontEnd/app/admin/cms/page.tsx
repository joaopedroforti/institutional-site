"use client";

import { FaBolt, FaChartPie, FaEnvelopeOpenText, FaPenRuler } from "react-icons/fa6";
import { useSuperadmin } from "../components/superadmin-context";
import styles from "../system.module.css";

export default function SuperadminCmsPage() {
  const { summary, dashboard } = useSuperadmin();
  const topPages = dashboard?.top_pages ?? [];

  return (
    <section className={styles.crmGrid}>
      <article className={styles.panelWide}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.panelEyebrow}>CMS modules</span>
            <h2>Areas do sistema</h2>
          </div>
          <span className={styles.panelHint}>Base pronta para evoluir conteudo, SEO, banners e paginas</span>
        </div>

        <div className={styles.cmsCards}>
          <div className={styles.cmsCard}>
            <FaEnvelopeOpenText aria-hidden="true" />
            <div>
              <strong>Inbox Comercial</strong>
              <span>{summary.contacts_total} leads no CRM</span>
            </div>
          </div>
          <div className={styles.cmsCard}>
            <FaChartPie aria-hidden="true" />
            <div>
              <strong>Metricas e SEO</strong>
              <span>{summary.page_views_total} page views registrados</span>
            </div>
          </div>
          <div className={styles.cmsCard}>
            <FaBolt aria-hidden="true" />
            <div>
              <strong>Automacoes</strong>
              <span>{summary.interactions_total} eventos rastreados</span>
            </div>
          </div>
          <div className={styles.cmsCard}>
            <FaPenRuler aria-hidden="true" />
            <div>
              <strong>Editor de paginas</strong>
              <span>Estrutura pronta para evoluir conteudo institucional</span>
            </div>
          </div>
        </div>
      </article>

      <article className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.panelEyebrow}>Conteudo quente</span>
            <h2>Paginas em destaque</h2>
          </div>
        </div>
        <div className={styles.progressList}>
          {topPages.length === 0 ? <div className={styles.emptyState}>Sem paginas com trafego ainda.</div> : null}
          {topPages.slice(0, 6).map((item) => (
            <div className={styles.progressRow} key={item.path}>
              <div className={styles.progressHead}>
                <strong>{item.path}</strong>
                <span>{item.total}</span>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${(item.total / Math.max(...topPages.map((entry) => entry.total), 1)) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
