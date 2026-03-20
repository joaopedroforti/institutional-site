import Link from "next/link";
import SiteShell from "./components/site-shell";
import styles from "./site-page.module.css";

export default function Home() {
  return (
    <SiteShell>
      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <p className={styles.kicker}>CONSULTORIA TECNOLÓGICA</p>
          <h1>Sua empresa merece mais do que improviso.</h1>
          <p>
            Apoiamos sua empresa para encontrar as melhores soluções tecnológicas diante dos desafios do mercado. Projetamos e desenvolvemos sistemas com foco em performance, escalabilidade e resultado de negócio.
          </p>
          <div className={styles.actionRow}>
            <Link href="/contato" className={styles.primaryButton}>
              Quero começar meu projeto
            </Link>
            <Link href="/servicos" className={styles.secondaryButton}>
              Ver serviços
            </Link>
          </div>
        </div>
        <aside className={styles.heroAside}>
          <h2>O que a sua empresa precisa em tecnologia</h2>
          <ul>
            <li>Sistemas web e portais internos sob medida</li>
            <li>Aplicativos para operação, vendas e atendimento</li>
            <li>Integrações com banco, nota fiscal, ERP e WhatsApp</li>
            <li>Manutenção, sustentação e evolução contínua</li>
          </ul>
        </aside>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <p className={styles.kicker}>DIFERENCIAIS</p>
          <h2>Tecnologia de ponta explicada de forma simples</h2>
          <p>
            Você não precisa entender de programação para ter uma solução de alto nível. Cuidamos da parte técnica e entregamos um sistema bonito, seguro e fácil de usar pela sua equipe.
          </p>
        </div>
        <div className={styles.gridThree}>
          <article className={styles.card}>
            <h3>Funciona em qualquer tela</h3>
            <p>Acesse do celular, tablet ou computador, sem instalar nada.</p>
          </article>
          <article className={styles.card}>
            <h3>Disponível 24 horas</h3>
            <p>Sistema online para sua operação continuar rodando em qualquer horário.</p>
          </article>
          <article className={styles.card}>
            <h3>Dados protegidos</h3>
            <p>Práticas de segurança de nível corporativo para manter informações críticas protegidas.</p>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.callout}>
          <h3>Projetos personalizados e sustentação contínua</h3>
          <p>
            Nossa estrutura atende desde melhorias em aplicativos existentes até desenvolvimento completo de grandes projetos em múltiplas plataformas.
          </p>
          <div className={styles.actionRow}>
            <Link href="/processo" className={styles.secondaryButton}>
              Entender processo
            </Link>
            <Link href="/sobre" className={styles.secondaryButton}>
              Conhecer empresa
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
