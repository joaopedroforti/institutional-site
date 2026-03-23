import { useEffect, useState } from "react";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import type { SessionsResponse } from "../../types/admin";

export default function AnaliticoPage() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<SessionsResponse["data"]>([]);
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
        const response = await apiRequest<SessionsResponse>("/api/admin/sessions", {}, token);
        setSessions(response.data);
      } catch (requestError) {
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "Nao foi possivel carregar o analitico.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  return (
    <PageShell
      title="Analitico"
      description="Rastreamento de sessoes e comportamento dos visitantes."
    >
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        {loading && <p className="text-sm text-slate-600">Carregando sessoes...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-2 font-medium">Visitante</th>
                  <th className="px-3 py-2 font-medium">E-mail</th>
                  <th className="px-3 py-2 font-medium">Ultima pagina</th>
                  <th className="px-3 py-2 font-medium">Views</th>
                  <th className="px-3 py-2 font-medium">Interacoes</th>
                  <th className="px-3 py-2 font-medium">Atualizado em</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 40).map((session) => (
                  <tr key={session.id} className="border-b border-slate-100 text-slate-700">
                    <td className="px-3 py-3">{session.identified_name ?? "Anonimo"}</td>
                    <td className="px-3 py-3">{session.identified_email ?? "-"}</td>
                    <td className="max-w-xs truncate px-3 py-3">{session.last_path ?? "-"}</td>
                    <td className="px-3 py-3">{session.total_page_views}</td>
                    <td className="px-3 py-3">{session.total_interactions}</td>
                    <td className="px-3 py-3">
                      {session.last_seen_at
                        ? new Date(session.last_seen_at).toLocaleString("pt-BR")
                        : "-"}
                    </td>
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
