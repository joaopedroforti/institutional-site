"use client";

import { useSuperadmin } from "../components/superadmin-context";
import styles from "../system.module.css";

function getStatusLabel(status: string) {
  switch (status) {
    case "em_andamento":
      return "Em andamento";
    case "contatado":
      return "Contatado";
    case "arquivado":
      return "Arquivado";
    default:
      return "Novo";
  }
}

export default function SuperadminCrmPage() {
  const { contacts, summary, updateContactStatus } = useSuperadmin();
  const recentContacts = contacts.slice(0, 8);
  const crmHealthItems = [
    {
      label: "Leads novos",
      value: summary.contacts_pending,
      tone: "warning",
    },
    {
      label: "Leads totais",
      value: summary.contacts_total,
      tone: "primary",
    },
    {
      label: "Visitantes identificados",
      value: summary.sessions_identified,
      tone: "success",
    },
  ];

  return (
    <section className={styles.crmGrid}>
      <article className={styles.panelWide}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.panelEyebrow}>CRM board</span>
            <h2>Fila comercial</h2>
          </div>
          <span className={styles.panelHint}>Leads recebidos no modo contato</span>
        </div>

        <div className={styles.leadTable}>
          <div className={styles.leadTableHead}>
            <span>Lead</span>
            <span>Empresa</span>
            <span>Origem</span>
            <span>Status</span>
          </div>
          {recentContacts.length === 0 ? <div className={styles.emptyState}>Nenhum lead recebido ainda.</div> : null}
          {recentContacts.map((contact) => (
            <div className={styles.leadRow} key={contact.id}>
              <div className={styles.leadMain}>
                <strong>{contact.name}</strong>
                <span>{contact.email}</span>
              </div>
              <div className={styles.leadCell}>{contact.company || "Sem empresa"}</div>
              <div className={styles.leadCell}>{contact.source_url || "Formulario"}</div>
              <div className={styles.leadStatusWrap}>
                <select
                  className={styles.statusSelect}
                  value={contact.status}
                  onChange={(event) => void updateContactStatus(contact.id, event.target.value)}
                >
                  <option value="novo">Novo</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="contatado">Contatado</option>
                  <option value="arquivado">Arquivado</option>
                </select>
                <span className={styles.statusInline}>{getStatusLabel(contact.status)}</span>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className={styles.panelSideStack}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>CRM health</span>
              <h2>Saude comercial</h2>
            </div>
          </div>
          <div className={styles.healthList}>
            {crmHealthItems.map((item) => (
              <div className={styles.healthItem} key={item.label}>
                <span className={`${styles.healthDot} ${styles[`healthDot${item.tone.charAt(0).toUpperCase()}${item.tone.slice(1)}`]}`} />
                <div>
                  <small>{item.label}</small>
                  <strong>{item.value}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>
    </section>
  );
}
