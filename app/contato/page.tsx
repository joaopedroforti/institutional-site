import SiteShell from "../components/site-shell";
import styles from "../site-page.module.css";

export default function ContactPage() {
  return (
    <SiteShell>
      <section className={styles.sectionHead}>
        <p className={styles.kicker}>CONTATO</p>
        <h2>Quero começar meu projeto</h2>
        <p>
          Conte o que você precisa. Retornamos com direcionamento técnico, prazo estimado e próximos passos para iniciar com segurança.
        </p>
      </section>

      <section className={styles.section}>
        <div className={styles.gridTwo}>
          <article className={styles.contactBox}>
            <h3>Atendimento direto</h3>
            <p>E-mail: contato@seudominio.com</p>
            <p>WhatsApp: +55 (00) 00000-0000</p>
            <p>Horário comercial com suporte para operações críticas.</p>
          </article>

          <article className={styles.formBox}>
            <h3>Briefing inicial</h3>
            <form className={styles.form}>
              <input className={styles.input} type="text" placeholder="Nome" />
              <input className={styles.input} type="email" placeholder="E-mail" />
              <input className={styles.input} type="text" placeholder="Empresa" />
              <textarea className={styles.textarea} placeholder="Descreva seu projeto" />
              <button className={styles.primaryButton} type="button">
                Enviar solicitação
              </button>
            </form>
            <p className={styles.note}>Este formulário é visual. Podemos integrar com seu canal real de atendimento.</p>
          </article>
        </div>
      </section>
    </SiteShell>
  );
}
