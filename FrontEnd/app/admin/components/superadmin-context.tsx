"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "../../lib/api";
import { clearAdminToken, getAdminToken } from "../../lib/admin-auth";
import {
  Contact,
  ContactsResponse,
  DashboardResponse,
  KanbanBoardResponse,
  LeadKanbanColumn,
  SessionItem,
  SessionsResponse,
  Summary,
} from "./superadmin-types";

type SuperadminContextValue = {
  dashboard: DashboardResponse | null;
  contacts: Contact[];
  sessions: SessionItem[];
  kanbanColumns: LeadKanbanColumn[];
  summary: Summary;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  updateContactStatus: (contactId: number, status: string) => Promise<void>;
  createKanbanColumn: (payload: { name: string; color: string }) => Promise<void>;
  updateKanbanColumn: (columnId: number, payload: { name: string; color: string }) => Promise<void>;
  deleteKanbanColumn: (columnId: number) => Promise<void>;
  moveLead: (contactId: number, columnId: number, order: number) => Promise<void>;
  updateLead: (contactId: number, payload: Partial<Contact>) => Promise<void>;
};

const emptySummary: Summary = {
  contacts_total: 0,
  contacts_pending: 0,
  sessions_total: 0,
  sessions_identified: 0,
  page_views_total: 0,
  interactions_total: 0,
};

const SuperadminContext = createContext<SuperadminContextValue | null>(null);

export function SuperadminProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [kanbanColumns, setKanbanColumns] = useState<LeadKanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function clearAuthState() {
    clearAdminToken();
    setToken(null);
    setDashboard(null);
    setContacts([]);
    setSessions([]);
    setKanbanColumns([]);
    setError("");
  }

  function isAuthError(errorValue: unknown) {
    return errorValue instanceof ApiError && (errorValue.status === 401 || errorValue.status === 403);
  }

  async function loadData(authToken: string) {
    const [dashboardResponse, contactsResponse, sessionsResponse, kanbanResponse] = await Promise.all([
      apiFetch<DashboardResponse>("/admin/dashboard", { token: authToken }),
      apiFetch<ContactsResponse>("/admin/contacts", { token: authToken }),
      apiFetch<SessionsResponse>("/admin/sessions", { token: authToken }),
      apiFetch<KanbanBoardResponse>("/admin/kanban", { token: authToken }),
    ]);

    setDashboard(dashboardResponse);
    setContacts(contactsResponse.data);
    setSessions(sessionsResponse.data);
    setKanbanColumns(kanbanResponse.data);
    setError("");
  }

  useEffect(() => {
    const storedToken = getAdminToken();

    if (!storedToken) {
      clearAuthState();
      setLoading(false);
      router.replace("/admin/login");
      return;
    }

    setToken(storedToken);

    void (async () => {
      try {
        await loadData(storedToken);
      } catch (loadError) {
        if (isAuthError(loadError)) {
          clearAuthState();
          setLoading(false);
          router.replace("/admin/login");
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Nao foi possivel carregar o painel.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function refresh() {
    if (!token) {
      router.replace("/admin/login");
      return;
    }

    setLoading(true);

    try {
      await loadData(token);
    } catch (refreshError) {
      if (isAuthError(refreshError)) {
        clearAuthState();
        router.replace("/admin/login");
        return;
      }

      setError(refreshError instanceof Error ? refreshError.message : "Nao foi possivel atualizar o painel.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    if (token) {
      try {
        await apiFetch("/auth/logout", {
          method: "POST",
          token,
        });
      } catch {
        // Mantemos o logout local mesmo se a API nao responder.
      }
    }

    clearAuthState();
    router.replace("/admin/login");
  }

  async function updateContactStatus(contactId: number, status: string) {
    if (!token) {
      router.replace("/admin/login");
      return;
    }

    try {
      const response = await apiFetch<{ data: Contact }>("/admin/contacts/" + contactId, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          status,
          contacted_at: status === "contatado" ? new Date().toISOString() : null,
        }),
      });

      setContacts((current) =>
        current.map((contact) => (contact.id === contactId ? { ...contact, ...response.data } : contact)),
      );
      await refresh();
    } catch (updateError) {
      if (isAuthError(updateError)) {
        clearAuthState();
        router.replace("/admin/login");
        return;
      }

      setError(updateError instanceof Error ? updateError.message : "Nao foi possivel atualizar o status.");
    }
  }

  async function createKanbanColumn(payload: { name: string; color: string }) {
    if (!token) {
      router.replace("/admin/login");
      return;
    }

    try {
      await apiFetch("/admin/kanban/columns", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });

      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Nao foi possivel criar a coluna.");
    }
  }

  async function updateKanbanColumn(columnId: number, payload: { name: string; color: string }) {
    if (!token) {
      router.replace("/admin/login");
      return;
    }

    try {
      await apiFetch(`/admin/kanban/columns/${columnId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(payload),
      });

      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Nao foi possivel atualizar a coluna.");
    }
  }

  async function deleteKanbanColumn(columnId: number) {
    if (!token) {
      router.replace("/admin/login");
      return;
    }

    try {
      await apiFetch(`/admin/kanban/columns/${columnId}`, {
        method: "DELETE",
        token,
      });

      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Nao foi possivel remover a coluna.");
    }
  }

  async function moveLead(contactId: number, columnId: number, order: number) {
    if (!token) {
      router.replace("/admin/login");
      return;
    }

    try {
      await apiFetch(`/admin/kanban/contacts/${contactId}/move`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          lead_kanban_column_id: columnId,
          lead_order: order,
        }),
      });

      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Nao foi possivel mover o lead.");
    }
  }

  async function updateLead(contactId: number, payload: Partial<Contact>) {
    if (!token) {
      router.replace("/admin/login");
      return;
    }

    try {
      await apiFetch(`/admin/contacts/${contactId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(payload),
      });

      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Nao foi possivel atualizar o lead.");
    }
  }

  return (
    <SuperadminContext.Provider
      value={{
        dashboard,
        contacts,
        sessions,
        kanbanColumns,
        summary: dashboard?.summary ?? emptySummary,
        loading,
        error,
        refresh,
        logout,
        updateContactStatus,
        createKanbanColumn,
        updateKanbanColumn,
        deleteKanbanColumn,
        moveLead,
        updateLead,
      }}
    >
      {children}
    </SuperadminContext.Provider>
  );
}

export function useSuperadmin() {
  const context = useContext(SuperadminContext);

  if (!context) {
    throw new Error("useSuperadmin deve ser usado dentro de SuperadminProvider.");
  }

  return context;
}
