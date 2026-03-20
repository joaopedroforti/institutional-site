import Link from "next/link";
import SiteShell from "../components/site-shell";
import styles from "../site-page.module.css";

type ProcessItem = {
  title: string;
  description: string;
  highlight: string;
};

const processItems: ProcessItem[] = [
  {
    title: "Conversa Inicial",
    description:
      "Você conta o que precisa e nós levantamos objetivo, prioridade, prazo e investimento de forma clara.",
    highlight: "Gratuita e sem compromisso",
  },
  {
    title: "Proposta Clara",
    description:
      "Documento com escopo, etapas, prazos e valores para aprovação sem letras miúdas.",
    highlight: "Tudo por escrito, sem surpresas",
  },
  {
    title: "Construção com Acompanhamento",
    description:
      "Entregas semanais em ciclos curtos para você acompanhar evolução, testar e ajustar rápido.",
    highlight: "Você vê o progresso toda semana",
  },
  {
    title: "Testes e Ajustes",
    description:
      "Validação de funcionalidades antes do lançamento para garantir estabilidade e qualidade de ponta a ponta.",
    highlight: "Tudo funciona antes de ir para o ar",
  },
  {
    title: "Entrega e Suporte",
    description:
      "Sistema em produção, treinamento da equipe e suporte real de quem construiu a solução.",
    highlight: "A gente não some depois",
  },
];

export default function ProcessPage() {
  return (
    <SiteShell>
      <section className={styles.sectionHead}>
        <p className={styles.kicker}>PROCESSO</p>
        <h2>Do primeiro contato ao sistema pronto, com previsibilidade</h2>
        <p>
          Nosso processo foi desenhado para reduzir risco e acelerar resultado. Você acompanha cada etapa com clareza de prazo, escopo e entregas.
        </p>
      </section>

      <section className={styles.section}>
        <div className={styles.timeline}>
          {processItems.map((item, index) => (
            <article className={styles.timelineItem} key={item.title}>
              <span className={styles.step}>{`0${index + 1}`}</span>
              <div>
                <p className={styles.highlight}>{item.highlight}</p>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.callout}>
          <h3>Metodologia de evolução contínua</h3>
          <p>
            Após o lançamento, monitoramos performance e seguimos evoluindo o produto com base em dados e feedback dos usuários.
          </p>
          <div className={styles.actionRow}>
            <Link href="/contato" className={styles.primaryButton}>
              Iniciar diagnóstico
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
