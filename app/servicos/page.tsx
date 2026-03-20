import Link from "next/link";
import SiteShell from "../components/site-shell";
import styles from "../site-page.module.css";

type ServiceItem = {
  title: string;
  description: string;
};

const serviceItems: ServiceItem[] = [
  {
    title: "Soluções Digitais",
    description:
      "Implementamos tecnologias personalizadas que otimizam a operação e preparam o negócio para escalar com inteligência.",
  },
  {
    title: "Desenvolvimento de Aplicativos",
    description:
      "Transformamos ideias em aplicativos web e mobile que encantam usuários, fortalecem marcas e geram resultados reais.",
  },
  {
    title: "Desenvolvimento de Software",
    description:
      "Criamos softwares sob medida que impulsionam eficiência e inovação para sua empresa.",
  },
  {
    title: "Outsourcing",
    description:
      "Especialistas para expandir seu time com agilidade, qualidade e foco no crescimento.",
  },
  {
    title: "RPA e Automação",
    description:
      "Automatizamos tarefas repetitivas para reduzir custos e aumentar produtividade.",
  },
  {
    title: "Projetos e Sustentação",
    description:
      "Da melhoria contínua ao desenvolvimento completo de produtos digitais em qualquer plataforma.",
  },
];

export default function ServicesPage() {
  return (
    <SiteShell>
      <section className={styles.sectionHead}>
        <p className={styles.kicker}>SERVIÇOS</p>
        <h2>Desenvolvimento de projetos personalizados para sua empresa</h2>
        <p>
          Profissionais especializados e altamente qualificados, alinhados aos objetivos do cliente, com melhores práticas, metodologias e processos de mercado.
        </p>
      </section>

      <section className={styles.section}>
        <div className={styles.gridTwo}>
          {serviceItems.map((item) => (
            <article key={item.title} className={styles.card}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.panel}>
          <h3>Integração com seu ecossistema</h3>
          <p>
            Conectamos sistemas com nota fiscal, bancos, WhatsApp, ERPs e outras ferramentas para eliminar retrabalho manual e acelerar a operação.
          </p>
          <div className={styles.actionRow}>
            <Link href="/contato" className={styles.primaryButton}>
              Solicitar proposta
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
