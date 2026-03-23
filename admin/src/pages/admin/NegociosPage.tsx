import { useEffect, useState } from "react";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import type { KanbanColumn, KanbanLead, KanbanResponse } from "../../types/admin";

export default function NegociosPage() {
  const { token } = useAuth();
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movingLeadId, setMovingLeadId] = useState<number | null>(null);

  const loadBoard = async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<KanbanResponse>("/api/admin/kanban", {}, token);
      const sortedColumns = [...response.data].sort((a, b) => a.position - b.position);
      setColumns(sortedColumns);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Nao foi possivel carregar o Kanban.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBoard();
  }, [token]);

  const moveLead = async (lead: KanbanLead, targetColumnId: number) => {
    if (!token || lead.id === movingLeadId) {
      return;
    }

    setMovingLeadId(lead.id);

    try {
      const targetColumn = columns.find((column) => column.id === targetColumnId);
      const nextOrder = targetColumn?.contacts.length ?? 0;

      await apiRequest(
        `/api/admin/kanban/contacts/${lead.id}/move`,
        {
          method: "PATCH",
          body: JSON.stringify({
            lead_kanban_column_id: targetColumnId,
            lead_order: nextOrder,
          }),
        },
        token,
      );

      await loadBoard();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Nao foi possivel mover o lead.",
      );
    } finally {
      setMovingLeadId(null);
    }
  };

  return (
    <PageShell
      title="Negocios"
      description="Kanban comercial integrado ao backend Laravel."
      actions={
        <button
          type="button"
          onClick={() => {
            void loadBoard();
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Atualizar
        </button>
      }
    >
      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Carregando Kanban...
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {columns.map((column) => (
            <section
              key={column.id}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{column.name}</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {column.contacts.length}
                </span>
              </div>

              <div className="space-y-3">
                {column.contacts.length === 0 && (
                  <p className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                    Nenhum lead nesta etapa.
                  </p>
                )}

                {column.contacts.map((lead) => (
                  <article key={lead.id} className="rounded-xl border border-slate-200 p-3">
                    <h4 className="text-sm font-semibold text-slate-900">{lead.name}</h4>
                    <p className="mt-1 text-xs text-slate-500">{lead.company ?? "Sem empresa"}</p>
                    <p className="mt-1 text-xs text-slate-500">{lead.email ?? lead.phone ?? "Sem contato"}</p>

                    <div className="mt-3">
                      <label className="mb-1 block text-xs text-slate-500">Mover para</label>
                      <select
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none ring-blue-200 transition focus:border-blue-500 focus:ring-4"
                        value={column.id}
                        onChange={(event) => {
                          const targetId = Number(event.target.value);
                          if (targetId !== column.id) {
                            void moveLead(lead, targetId);
                          }
                        }}
                        disabled={movingLeadId === lead.id}
                      >
                        {columns.map((targetColumn) => (
                          <option key={targetColumn.id} value={targetColumn.id}>
                            {targetColumn.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}
