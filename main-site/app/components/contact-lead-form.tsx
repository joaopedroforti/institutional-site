"use client";

import { FormEvent, useState } from "react";
import { apiFetch } from "../lib/api";
import { getStoredVisitorSessionKey, trackInteraction } from "../lib/analytics";
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
  const [hasTrackedOpen, setHasTrackedOpen] = useState(false);

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
          },
        }),
      });

      void trackInteraction({
        eventType: "contact_form_submit",
        element: "form",
        label: source,
        pagePath: window.location.pathname,
      });

      setValues(initialValues);
      setStatus("success");
      setFeedback("Solicitacao enviada. Vamos analisar e retornar para voce.");
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
      eventType: "contact_form_open",
      element: "form",
      label: source,
      pagePath: window.location.pathname,
    });
  }

  return (
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

      {status === "success" ? <p className={styles.feedbackSuccess}>{feedback}</p> : null}
      {status === "error" ? <p className={styles.feedbackError}>{feedback}</p> : null}

      <button className={styles.button} type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Enviando..." : buttonLabel}
      </button>
    </form>
  );
}
