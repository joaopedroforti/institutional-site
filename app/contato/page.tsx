import SiteShell from "../components/site-shell";
import styles from "./contato.module.css";

export default function ContactPage() {
  return (
    <SiteShell>
      <section className={styles.head}>
        <p className={styles.kicker}>CONTATO</p>
        <h1>Vamos transformar seu desafio em uma solução digital de alto impacto</h1>
        <p>
          Envie os detalhes do seu projeto para receber um direcionamento técnico claro, com visão de escopo, prioridades e próximos passos de execução.
        </p>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <h2>Fale com nosso time</h2>
          <p>E-mail: contato@seudominio.com</p>
          <p>WhatsApp: +55 (19) 98221-4340</p>
          <p>Atendimento para novos projetos, evolução de plataformas e suporte técnico especializado.</p>
        </article>

        <article className={styles.formCard}>
          <h2>Solicitar proposta</h2>
          <form className={styles.form}>
            <input className={styles.input} type="text" placeholder="Nome completo" />
            <input className={styles.input} type="text" placeholder="Celular / WhatsApp" />
            <input className={styles.input} type="text" placeholder="E-mail e nome da empresa" />
            <textarea className={styles.textarea} placeholder="Como podemos ajudar? Descreva brevemente seu desafio atual." />
            <button className={styles.button} type="button">
              Enviar solicitação
            </button>
          </form>
        </article>
      </section>
    </SiteShell>
  );
}
