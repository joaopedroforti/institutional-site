import Image from "next/image";
import SiteShell from "../components/site-shell";
import styles from "./historia.module.css";

export default function HistoryPage() {
  return (
    <SiteShell>
      <section className={`${styles.hero} ${styles.head}`}>
        <p className={styles.kicker}>HISTÓRIA</p>
        <h1>Uma trajetória construída com tecnologia, consistência e resultado</h1>
      </section>

      <section className={styles.grid}>
        <article className={styles.story}>
          <p>
            Apaixonado por programação, nosso fundador João Pedro Forti atua na área desde 2015. No início da jornada, desenvolvia projetos para pequenas empresas em troca de aprendizado prático, mergulhando em desafios reais para acelerar evolução técnica.
          </p>
          <p>
            Esse período consolidou uma base sólida em desenvolvimento de sistemas, criação de aplicações web, integração de processos e estruturação de soluções digitais sob medida para negócios em crescimento.
          </p>
          <p>
            Hoje atendemos empresas de diferentes segmentos com serviços de desenvolvimento, automação e sustentação tecnológica. Também expandimos nossa atuação com produtos SaaS próprios, reforçando uma visão orientada à inovação, escalabilidade e performance contínua.
          </p>
        </article>

        <aside className={styles.photoCard}>
          <Image
            src="/images/joaopedroforti.jpeg"
            alt="João Pedro Forti"
            width={680}
            height={840}
            className={styles.photo}
          />
          <p className={styles.photoCaption}>João Pedro Forti, fundador e especialista em desenvolvimento de sistemas.</p>
        </aside>
      </section>

      <article className={styles.highlight}>
        <p>
          Nossa missão é transformar tecnologia em vantagem competitiva para empresas que precisam de sistemas confiáveis, processos digitais eficientes e crescimento sustentável. Cada projeto é construído com foco em estratégia, experiência do usuário e excelência técnica.
        </p>
      </article>
    </SiteShell>
  );
}
