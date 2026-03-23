import { useEffect, useMemo, useState } from "react";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import type { ContactsResponse } from "../../types/admin";

export default function PropostasPage() {
  const { token } = useAuth();
  const [contacts, setContacts] = useState<ContactsResponse["data"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await apiRequest<ContactsResponse>("/api/admin/contacts", {}, token);
        setContacts(response.data);
      } catch (requestError) {
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "Nao foi possivel carregar propostas.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  const summary = useMemo(() => {
    const total = contacts.length;
    const novos = contacts.filter((contact) => contact.status === "novo").length;
    const aprovados = contacts.filter((contact) => contact.status.includes("aprov")).length;

    return { total, novos, aprovados };
  }, [contacts]);

  return (
    <PageShell
      title="Propostas"
      description="Painel de acompanhamento de propostas comerciais."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.total}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Em avaliacao</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.novos}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Aprovadas</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.aprovados}</p>
        </article>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        {loading && <p className="text-sm text-slate-600">Carregando propostas...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <ul className="space-y-3">
            {contacts.slice(0, 12).map((contact) => (
              <li
                key={contact.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
                  <p className="text-xs text-slate-500">{contact.company ?? "Sem empresa"}</p>
                </div>
                <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                  {contact.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
