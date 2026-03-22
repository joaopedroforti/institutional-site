"use client";

import styles from "../system.module.css";

function buildLinePath(values: number[], width: number, height: number) {
  if (values.length === 0) {
    return "";
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const step = values.length > 1 ? width / (values.length - 1) : width;

  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function DashboardLineChart({ values }: { values: number[] }) {
  const width = 520;
  const height = 170;
  const linePath = buildLinePath(values, width, height);

  return (
    <svg viewBox={`0 0 ${width} ${height + 18}`} className={styles.lineChart} role="img" aria-label="Grafico de crescimento">
      <defs>
        <linearGradient id="line-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5b6ef1" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#5b6ef1" stopOpacity="0.03" />
        </linearGradient>
      </defs>
      {[0.2, 0.4, 0.6, 0.8].map((mark) => (
        <line key={mark} x1="0" x2={width} y1={height * mark} y2={height * mark} className={styles.chartGrid} />
      ))}
      <path d={`${linePath} L ${width} ${height} L 0 ${height} Z`} className={styles.areaPath} />
      <path d={linePath} className={styles.linePath} />
      {values.map((value, index) => {
        const max = Math.max(...values, 1);
        const min = Math.min(...values, 0);
        const range = Math.max(max - min, 1);
        const x = values.length > 1 ? (index * width) / (values.length - 1) : width / 2;
        const y = height - ((value - min) / range) * height;

        return <circle key={`${value}-${index}`} cx={x} cy={y} r="4.5" className={styles.linePoint} />;
      })}
    </svg>
  );
}

export function DonutChart({ identified, anonymous }: { identified: number; anonymous: number }) {
  const total = Math.max(identified + anonymous, 1);
  const identifiedRatio = identified / total;
  const circumference = 2 * Math.PI * 54;
  const identifiedDash = circumference * identifiedRatio;

  return (
    <div className={styles.donutWrap}>
      <svg viewBox="0 0 140 140" className={styles.donutChart} role="img" aria-label="Grafico de identificacao">
        <circle cx="70" cy="70" r="54" className={styles.donutBase} />
        <circle
          cx="70"
          cy="70"
          r="54"
          className={styles.donutAccent}
          strokeDasharray={`${identifiedDash} ${circumference - identifiedDash}`}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
        />
      </svg>
      <div className={styles.donutCenter}>
        <strong>{Math.round(identifiedRatio * 100)}%</strong>
        <span>identificados</span>
      </div>
    </div>
  );
}
