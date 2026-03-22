"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";
import styles from "./login.module.css";

const superadminTokenStorageKey = "forticorp-superadmin-token";

type LoginResponse = {
  token: string;
};

export default function SuperadminLoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("jpedroforti");
  const [password, setPassword] = useState("18241214");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const existingToken = window.localStorage.getItem(superadminTokenStorageKey);

    if (existingToken) {
      router.replace("/superadmin/dashboard");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          login,
          password,
        }),
      });

      window.localStorage.setItem(superadminTokenStorageKey, response.token);
      router.replace("/superadmin/dashboard");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nao foi possivel autenticar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <span className={styles.eyebrow}>FortiCorp Superadmin</span>
        <h1>Painel de operacao e inteligencia</h1>
        <p>
          Acompanhe contatos recebidos, sessoes dos visitantes, paginas mais acessadas e interacoes reais do site em um unico lugar.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            type="text"
            placeholder="Usuario ou e-mail"
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            required
          />
          <input
            className={styles.input}
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error ? <p className={styles.error}>{error}</p> : null}
          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar no superadmin"}
          </button>
        </form>
      </section>
    </main>
  );
}
