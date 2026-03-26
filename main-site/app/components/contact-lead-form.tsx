"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { getPageLabel, getStoredVisitorSessionKey, trackInteraction } from "../lib/analytics";
import styles from "./contact-lead-form.module.css";

type ContactLeadFormProps = {
  buttonLabel?: string;
  source?: string;
};

const initialValues = {
  name: "",
  phone: "",
  email: "",
  company: "",
  message: "",
};

export default function ContactLeadForm({
  buttonLabel = "Enviar solicitacao",
  source = "site",
}: ContactLeadFormProps) {
  const [values, setValues] = useState(initialValues);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [hasTrackedOpen, setHasTrackedOpen] = useState(false);
  const [draftCaptured, setDraftCaptured] = useState(false);

  const pagePath = typeof window !== "undefined" ? window.location.pathname : "/";
  const pageLabel = useMemo(() => getPageLabel(pagePath), [pagePath]);

  const canCaptureDraft = useMemo(
    () => Boolean(values.name.trim() && values.email.trim() && values.phone.trim()),
    [values.email, values.name, values.phone],
  );

  useEffect(() => {
    if (!canCaptureDraft || draftCaptured || status === "loading" || status === "success") {
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          await apiFetch("/contacts", {
            method: "POST",
            body: JSON.stringify({
              ...values,
              session_key: getStoredVisitorSessionKey(),
              source_url: window.location.href,
              referrer: document.referrer || null,
              metadata: {
                source,
                capture_kind: "draft",
                page_name: pageLabel,
              },
            }),
          });

          await trackInteraction({
            eventType: "lead_form_abandoned_captured",
            element: "form",
            label: source,
            pagePath,
            metadata: {
              event_name: `Formulario ${pageLabel} preenchido sem envio`,
              where: pageLabel,
            },
          });
          setDraftCaptured(true);
        } catch {
          // nao bloqueia experiencia do usuario
        }
      })();
    }, 1300);

    return () => window.clearTimeout(timer);
  }, [canCaptureDraft, draftCaptured, pageLabel, pagePath, source, status, values]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setFeedback("");

    if (!values.email && !values.phone) {
      setStatus("error");
      setFeedback("Informe pelo menos e-mail ou WhatsApp para continuarmos.");
      return;
    }

    try {
      await apiFetch("/contacts", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          session_key: getStoredVisitorSessionKey(),
          source_url: window.location.href,
          referrer: document.referrer || null,
          metadata: {
            source,
            capture_kind: "submitted",
            page_name: pageLabel,
          },
        }),
      });

      void trackInteraction({
        eventType: "lead_form_submitted",
        element: "form",
        label: source,
        pagePath,
        metadata: {
          event_name: `Enviou formulario ${pageLabel}`,
          where: pageLabel,
        },
      });

      setValues(initialValues);
      setStatus("success");
      setFeedback("Solicitação enviada. Vamos analisar e retornar para você.");
      setSuccessModalOpen(true);
    } catch (error) {
      setStatus("error");
      setFeedback(error instanceof Error ? error.message : "Nao foi possivel enviar sua solicitacao.");
    }
  }

  function trackOpenIfNeeded() {
    if (hasTrackedOpen) {
      return;
    }

    setHasTrackedOpen(true);
    void trackInteraction({
      eventType: "lead_form_fill_started",
      element: "form",
      label: source,
      pagePath,
      metadata: {
        event_name: `Preencheu formulario ${pageLabel}`,
        where: pageLabel,
      },
    });
  }

  return (
    <>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.grid}>
          <input
            className={styles.input}
            type="text"
            placeholder="Nome completo"
            value={values.name}
            onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
            onFocus={trackOpenIfNeeded}
            required
          />
          <input
            className={styles.input}
            type="text"
            placeholder="Celular / WhatsApp"
            value={values.phone}
            onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
            onFocus={trackOpenIfNeeded}
          />
        </div>
        <div className={styles.grid}>
          <input
            className={styles.input}
            type="email"
            placeholder="E-mail"
            value={values.email}
            onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
            onFocus={trackOpenIfNeeded}
          />
          <input
            className={styles.input}
            type="text"
            placeholder="Empresa"
            value={values.company}
            onChange={(event) => setValues((current) => ({ ...current, company: event.target.value }))}
            onFocus={trackOpenIfNeeded}
          />
        </div>
        <textarea
          className={styles.textarea}
          placeholder="Como podemos ajudar? Descreva brevemente seu desafio atual."
          value={values.message}
          onChange={(event) => setValues((current) => ({ ...current, message: event.target.value }))}
          onFocus={trackOpenIfNeeded}
          required
        />

        {status === "error" ? <p className={styles.feedbackError}>{feedback}</p> : null}

        <button className={styles.button} type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Enviando..." : buttonLabel}
        </button>
      </form>

      {successModalOpen ? (
        <div className={styles.successModalBackdrop} onClick={() => setSuccessModalOpen(false)}>
          <div
            className={styles.successModalCard}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Solicitação enviada"
          >
            <p className={styles.successModalTitle}>Solicitação Enviada</p>
            <p className={styles.successModalText}>Entraremos em contato o mais rápido possível.</p>
            <button
              type="button"
              className={styles.successModalButton}
              onClick={() => setSuccessModalOpen(false)}
            >
              Fechar
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
