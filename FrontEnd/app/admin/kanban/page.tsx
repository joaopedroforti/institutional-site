"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  FaArrowsUpDownLeftRight,
  FaCirclePlus,
  FaPen,
  FaTrash,
  FaXmark,
} from "react-icons/fa6";
import { useSuperadmin } from "../components/superadmin-context";
import { Contact, LeadKanbanColumn } from "../components/superadmin-types";
import styles from "../system.module.css";

type ColumnFormState = {
  mode: "create" | "edit";
  columnId?: number;
  name: string;
  color: string;
};

const defaultColumnForm: ColumnFormState = {
  mode: "create",
  name: "",
  color: "#5b6ef1",
};

export default function SuperadminKanbanPage() {
  const {
    kanbanColumns,
    createKanbanColumn,
    updateKanbanColumn,
    deleteKanbanColumn,
    moveLead,
    updateLead,
  } = useSuperadmin();
  const [draggedLeadId, setDraggedLeadId] = useState<number | null>(null);
  const [columnForm, setColumnForm] = useState<ColumnFormState>(defaultColumnForm);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Contact | null>(null);
  const [leadDraft, setLeadDraft] = useState<Partial<Contact>>({});

  const colorOptions = ["#5b6ef1", "#52b4ff", "#8a7dff", "#ffb347", "#39c98d", "#ff7f8a"];

  const totalLeads = useMemo(
    () => kanbanColumns.reduce((sum, column) => sum + column.contacts.length, 0),
    [kanbanColumns],
  );

  function openCreateColumnModal() {
    setColumnForm(defaultColumnForm);
    setShowColumnModal(true);
  }

  function openEditColumnModal(column: LeadKanbanColumn) {
    setColumnForm({
      mode: "edit",
      columnId: column.id,
      name: column.name,
      color: column.color,
    });
    setShowColumnModal(true);
  }

  async function handleColumnSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (columnForm.mode === "create") {
      await createKanbanColumn({
        name: columnForm.name,
        color: columnForm.color,
      });
    } else if (columnForm.columnId) {
      await updateKanbanColumn(columnForm.columnId, {
        name: columnForm.name,
        color: columnForm.color,
      });
    }

    setShowColumnModal(false);
    setColumnForm(defaultColumnForm);
  }

  async function handleDrop(columnId: number, order: number) {
    if (!draggedLeadId) {
      return;
    }

    await moveLead(draggedLeadId, columnId, order);
    setDraggedLeadId(null);
  }

  function openLeadModal(lead: Contact) {
    setSelectedLead(lead);
    setLeadDraft({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      message: lead.message,
      internal_notes: lead.internal_notes,
    });
  }

  async function handleLeadSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedLead) {
      return;
    }

    await updateLead(selectedLead.id, leadDraft);
    setSelectedLead(null);
    setLeadDraft({});
  }

  return (
    <>
      <section className={styles.kanbanTopbar}>
        <div>
          <span className={styles.panelEyebrow}>Lead pipeline</span>
          <h2>Kanban comercial do site</h2>
          <p>{totalLeads} leads no pipeline, com colunas persistidas no banco e cards arrastaveis.</p>
        </div>
        <button className={styles.primaryActionButton} type="button" onClick={openCreateColumnModal}>
          <FaCirclePlus aria-hidden="true" />
          <span>Nova coluna</span>
        </button>
      </section>

      <section className={styles.kanbanBoard}>
        {kanbanColumns.map((column) => (
          <article className={styles.kanbanColumn} key={column.id}>
            <header className={styles.kanbanColumnHeader} style={{ borderTopColor: column.color }}>
              <div>
                <span className={styles.kanbanColumnName}>{column.name}</span>
                <p>{column.contacts.length} lead(s)</p>
              </div>
              <div className={styles.kanbanColumnActions}>
                <button type="button" className={styles.iconButton} onClick={() => openEditColumnModal(column)}>
                  <FaPen aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => void deleteKanbanColumn(column.id)}
                  disabled={column.is_default}
                  title={column.is_default ? "Coluna padrao nao pode ser removida" : "Remover coluna"}
                >
                  <FaTrash aria-hidden="true" />
                </button>
              </div>
            </header>

            <div
              className={styles.kanbanDropzone}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => void handleDrop(column.id, 0)}
            >
              Soltar no topo
            </div>

            <div className={styles.kanbanCards}>
              {column.contacts.map((lead, index) => (
                <div key={lead.id} className={styles.kanbanCardWrap}>
                  <article
                    className={styles.kanbanCard}
                    draggable
                    onDragStart={() => setDraggedLeadId(lead.id)}
                    onDragEnd={() => setDraggedLeadId(null)}
                    onClick={() => openLeadModal(lead)}
                  >
                    <div className={styles.kanbanCardGrip}>
                      <FaArrowsUpDownLeftRight aria-hidden="true" />
                    </div>
                    <strong>{lead.name}</strong>
                    <span>{lead.company || "Sem empresa"}</span>
                    <p>{lead.email}</p>
                  </article>

                  <div
                    className={styles.kanbanDropzoneInline}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => void handleDrop(column.id, index + 1)}
                  >
                    Soltar aqui
                  </div>
                </div>
              ))}

              {column.contacts.length === 0 ? <div className={styles.emptyState}>Sem leads nessa coluna.</div> : null}
            </div>

            <div
              className={styles.kanbanDropzone}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => void handleDrop(column.id, column.contacts.length)}
            >
              Soltar no fim
            </div>
          </article>
        ))}
      </section>

      {showColumnModal ? (
        <div className={styles.modalBackdrop} onClick={() => setShowColumnModal(false)}>
          <div className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.panelEyebrow}>Kanban column</span>
                <h3>{columnForm.mode === "create" ? "Nova coluna" : "Editar coluna"}</h3>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => setShowColumnModal(false)}>
                <FaXmark aria-hidden="true" />
              </button>
            </div>

            <form className={styles.modalForm} onSubmit={handleColumnSubmit}>
              <label className={styles.fieldGroup}>
                <span>Nome da coluna</span>
                <input
                  className={styles.modalInput}
                  value={columnForm.name}
                  onChange={(event) => setColumnForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>

              <div className={styles.fieldGroup}>
                <span>Cor</span>
                <div className={styles.colorGrid}>
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={columnForm.color === color ? styles.colorSwatchActive : styles.colorSwatch}
                      style={{ backgroundColor: color }}
                      onClick={() => setColumnForm((current) => ({ ...current, color }))}
                    />
                  ))}
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryGhostButton} onClick={() => setShowColumnModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.primaryActionButton}>
                  Salvar coluna
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedLead ? (
        <div className={styles.modalBackdrop} onClick={() => setSelectedLead(null)}>
          <div className={styles.modalCardLarge} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.panelEyebrow}>Lead detail</span>
                <h3>{selectedLead.name}</h3>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => setSelectedLead(null)}>
                <FaXmark aria-hidden="true" />
              </button>
            </div>

            <form className={styles.modalForm} onSubmit={handleLeadSave}>
              <div className={styles.modalGrid}>
                <label className={styles.fieldGroup}>
                  <span>Nome</span>
                  <input
                    className={styles.modalInput}
                    value={leadDraft.name ?? ""}
                    onChange={(event) => setLeadDraft((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                <label className={styles.fieldGroup}>
                  <span>E-mail</span>
                  <input
                    className={styles.modalInput}
                    value={leadDraft.email ?? ""}
                    onChange={(event) => setLeadDraft((current) => ({ ...current, email: event.target.value }))}
                  />
                </label>
                <label className={styles.fieldGroup}>
                  <span>Telefone</span>
                  <input
                    className={styles.modalInput}
                    value={leadDraft.phone ?? ""}
                    onChange={(event) => setLeadDraft((current) => ({ ...current, phone: event.target.value }))}
                  />
                </label>
                <label className={styles.fieldGroup}>
                  <span>Empresa</span>
                  <input
                    className={styles.modalInput}
                    value={leadDraft.company ?? ""}
                    onChange={(event) => setLeadDraft((current) => ({ ...current, company: event.target.value }))}
                  />
                </label>
              </div>

              <label className={styles.fieldGroup}>
                <span>Mensagem do lead</span>
                <textarea
                  className={styles.modalTextarea}
                  value={leadDraft.message ?? ""}
                  onChange={(event) => setLeadDraft((current) => ({ ...current, message: event.target.value }))}
                />
              </label>

              <label className={styles.fieldGroup}>
                <span>Notas internas</span>
                <textarea
                  className={styles.modalTextarea}
                  value={leadDraft.internal_notes ?? ""}
                  onChange={(event) => setLeadDraft((current) => ({ ...current, internal_notes: event.target.value }))}
                />
              </label>

              <div className={styles.leadInfoGrid}>
                <div className={styles.leadInfoCard}>
                  <span>Coluna atual</span>
                  <strong>{selectedLead.kanban_column?.name || "Sem coluna"}</strong>
                </div>
                <div className={styles.leadInfoCard}>
                  <span>Origem</span>
                  <strong>{selectedLead.source_url || "Formulario do site"}</strong>
                </div>
                <div className={styles.leadInfoCard}>
                  <span>Sessao</span>
                  <strong>{selectedLead.visitor_session?.session_key || "Nao identificada"}</strong>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryGhostButton} onClick={() => setSelectedLead(null)}>
                  Fechar
                </button>
                <button type="submit" className={styles.primaryActionButton}>
                  Salvar lead
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
