"use client";

import styles from "../system.module.css";

type TableRow = {
  id: string;
  main: string;
  secondary: string;
  status: string;
  statusTone?: "default" | "success" | "warning" | "muted";
};

type StatRow = {
  label: string;
  value: string | number;
};

type ModulePlaceholderProps = {
  title: string;
  description: string;
  tableHeaders: [string, string, string];
  rows: TableRow[];
  stats: StatRow[];
};

function getBadgeClassName(tone: TableRow["statusTone"]) {
  if (tone === "success") {
    return styles.badgeSuccess;
  }

  if (tone === "warning") {
    return styles.badgeWarning;
  }

  if (tone === "muted") {
    return styles.badgeMuted;
  }

  return styles.badge;
}

export default function ModulePlaceholder({
  title,
  description,
  tableHeaders,
  rows,
  stats,
}: ModulePlaceholderProps) {
  return (
    <section className={styles.moduleGrid}>
      <article className={styles.moduleSection}>
        <h2 className={styles.moduleTitle}>{title}</h2>
        <p className={styles.moduleDescription}>{description}</p>

        <table className={styles.moduleTable}>
          <thead>
            <tr>
              <th>{tableHeaders[0]}</th>
              <th>{tableHeaders[1]}</th>
              <th>{tableHeaders[2]}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.main}</strong>
                  <div className={styles.moduleDescription}>{row.secondary}</div>
                </td>
                <td>{row.id}</td>
                <td>
                  <span className={getBadgeClassName(row.statusTone)}>{row.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <aside className={styles.moduleSection}>
        <h3 className={styles.moduleTitle}>Resumo rapido</h3>
        <p className={styles.moduleDescription}>Indicadores operacionais para leitura imediata do modulo.</p>
        <div className={styles.statList}>
          {stats.map((stat) => (
            <div className={styles.statItem} key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}
