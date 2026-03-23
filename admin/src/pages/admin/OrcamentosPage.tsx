import { useEffect, useState } from "react";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import type { ContactsResponse } from "../../types/admin";

export default function OrcamentosPage() {
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
            : "Nao foi possivel carregar orcamentos.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  return (
    <PageShell
      title="Orcamentos"
      description="Lista operacional de leads para transformar em orcamentos."
    >
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        {loading && <p className="text-sm text-slate-600">Carregando dados...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-2 font-medium">Lead</th>
                  <th className="px-3 py-2 font-medium">Empresa</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-slate-100 text-slate-700">
                    <td className="px-3 py-3">{contact.name}</td>
                    <td className="px-3 py-3">{contact.company ?? "-"}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                        {contact.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">{new Date(contact.created_at).toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageShell>
  );
}
