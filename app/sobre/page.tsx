import Link from "next/link";
import SiteShell from "../components/site-shell";
import styles from "../site-page.module.css";

export default function AboutPage() {
  return (
    <SiteShell>
      <section className={styles.sectionHead}>
        <p className={styles.kicker}>SOBRE</p>
        <h2>Consultoria tecnológica para elevar o nível de entrega da sua empresa</h2>
        <p>
          Atuamos com foco em resultado de negócio, unindo visão estratégica e execução técnica para criar soluções que realmente funcionam no dia a dia da sua operação.
        </p>
      </section>

      <section className={styles.section}>
        <div className={styles.gridThree}>
          <article className={styles.card}>
            <h3>Visão de negócio</h3>
            <p>Entendemos o contexto da empresa para propor tecnologia que resolve problema real.</p>
          </article>
          <article className={styles.card}>
            <h3>Excelência técnica</h3>
            <p>Arquitetura moderna, boas práticas de engenharia e qualidade contínua em cada entrega.</p>
          </article>
          <article className={styles.card}>
            <h3>Parceria de longo prazo</h3>
            <p>Acompanhamos evolução do produto, melhorias e sustentação para crescimento sustentável.</p>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.gridTwo}>
          <article className={styles.panel}>
            <h3>Como atuamos</h3>
            <ul className={styles.list}>
              <li>Diagnóstico técnico e de processos</li>
              <li>Planejamento de arquitetura e roadmap</li>
              <li>Execução com acompanhamento próximo</li>
              <li>Mensuração de impacto e evolução contínua</li>
            </ul>
          </article>
          <article className={styles.panel}>
            <h3>O que você ganha</h3>
            <ul className={styles.list}>
              <li>Mais produtividade operacional</li>
              <li>Redução de erros e retrabalho</li>
              <li>Decisões baseadas em dados</li>
              <li>Escalabilidade com segurança</li>
            </ul>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.callout}>
          <h3>Pronto para evoluir seu ambiente tecnológico?</h3>
          <p>Vamos mapear prioridades e desenhar um plano de execução que cabe na sua realidade.</p>
          <div className={styles.actionRow}>
            <Link href="/contato" className={styles.primaryButton}>
              Falar com especialista
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
