"use client";

import {
  FaComments,
  FaFolderTree,
  FaLaptopCode,
  FaSignal,
  FaUserGroup,
} from "react-icons/fa6";
import { useSuperadmin } from "../components/superadmin-context";
import { DashboardLineChart, DonutChart } from "../components/superadmin-visuals";
import styles from "../system.module.css";

export default function SuperadminDashboardPage() {
  const { summary } = useSuperadmin();

  const chartValues = [
    Math.max(summary.contacts_total, 1),
    Math.max(summary.contacts_pending + 1, 1),
    Math.max(Math.round(summary.sessions_total * 0.45), 1),
    Math.max(Math.round(summary.page_views_total * 0.4), 1),
    Math.max(Math.round(summary.page_views_total * 0.58), 1),
    Math.max(Math.round(summary.page_views_total * 0.75), 1),
    Math.max(summary.interactions_total, 1),
  ];

  const identified = summary.sessions_identified;
  const anonymous = Math.max(summary.sessions_total - identified, 0);

  return (
    <>
      <section className={styles.metricStrip}>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}><FaComments aria-hidden="true" /></span>
          <div>
            <span className={styles.metricLabel}>Leads totais</span>
            <strong>{summary.contacts_total}</strong>
            <p>{summary.contacts_pending} aguardando retorno</p>
          </div>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}><FaUserGroup aria-hidden="true" /></span>
          <div>
            <span className={styles.metricLabel}>Sessoes</span>
            <strong>{summary.sessions_total}</strong>
            <p>{identified} identificadas</p>
          </div>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}><FaFolderTree aria-hidden="true" /></span>
          <div>
            <span className={styles.metricLabel}>Page views</span>
            <strong>{summary.page_views_total}</strong>
            <p>Fluxo de navegacao capturado</p>
          </div>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}><FaLaptopCode aria-hidden="true" /></span>
          <div>
            <span className={styles.metricLabel}>Interacoes</span>
            <strong>{summary.interactions_total}</strong>
            <p>Cliques e acoes registradas</p>
          </div>
        </article>
      </section>

      <section className={styles.analyticsGrid}>
        <article className={styles.panelLarge}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>Dashboard metrics</span>
              <h2>Visao consolidada do sistema</h2>
            </div>
            <span className={styles.panelBadge}>
              <FaSignal aria-hidden="true" />
              Operacao monitorada
            </span>
          </div>
          <div className={styles.chartLegend}>
            <span><i className={styles.legendDotPrimary} /> Trafego consolidado</span>
            <span><i className={styles.legendDotSoft} /> Conversao e interesse</span>
          </div>
          <DashboardLineChart values={chartValues} />
          <div className={styles.chartFooter}>
            <span>S1</span>
            <span>S2</span>
            <span>S3</span>
            <span>S4</span>
            <span>S5</span>
            <span>S6</span>
            <span>Hoje</span>
          </div>
        </article>

        <article className={styles.panelSide}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>Identity ratio</span>
              <h2>Mapa de identificacao</h2>
            </div>
          </div>
          <DonutChart identified={identified} anonymous={anonymous} />
          <div className={styles.donutMeta}>
            <div>
              <i className={styles.legendDotPrimary} />
              <span>Identificados</span>
              <strong>{identified}</strong>
            </div>
            <div>
              <i className={styles.legendDotSoft} />
              <span>Anonimos</span>
              <strong>{anonymous}</strong>
            </div>
          </div>
        </article>
      </section>
    </>
  );
}
