import SiteShell from "../components/site-shell";
import ContactLeadForm from "../components/contact-lead-form";
import styles from "./contato.module.css";

export default function ContactPage() {
  return (
    <SiteShell>
      <section className={styles.head} data-reveal>
        <p className={styles.kicker}>CONTATO</p>
        <h1>Vamos transformar seu desafio em uma solução digital de alto impacto</h1>
        <p>
          Envie os detalhes do seu projeto para receber um direcionamento técnico claro, com visão de escopo, prioridades e próximos passos de execução.
        </p>
      </section>

      <section className={styles.grid}>
        <article className={styles.card} data-reveal>
          <h2>Fale com nosso time</h2>
          <p>E-mail: contato@seudominio.com</p>
          <p>WhatsApp: +55 (19) 98221-4340</p>
          <p>Atendimento para novos projetos, evolução de plataformas e suporte técnico especializado.</p>
        </article>

        <article className={styles.formCard} data-reveal>
          <h2>Solicitar proposta</h2>
          <div className={styles.form}>
            <ContactLeadForm buttonLabel="Enviar solicitacao" source="pagina-contato" />
          </div>
        </article>
      </section>
    </SiteShell>
  );
}
