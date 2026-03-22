"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { getAdminToken, setAdminToken } from "../../lib/admin-auth";
import styles from "./login.module.css";

type LoginResponse = {
  token: string;
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("jpedroforti");
  const [password, setPassword] = useState("18241214");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const existingToken = getAdminToken();

    if (existingToken) {
      router.replace("/admin/dashboard");
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

      setAdminToken(response.token);
      window.location.assign("/admin/dashboard");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nao foi possivel autenticar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <Image
          src="/images/logo/logo.png"
          alt="FortiCorp"
          width={260}
          height={74}
          className={styles.logo}
          priority
        />

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            type="text"
            placeholder="Usuario"
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
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
