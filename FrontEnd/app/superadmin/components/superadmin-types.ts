export type Summary = {
  contacts_total: number;
  contacts_pending: number;
  sessions_total: number;
  sessions_identified: number;
  page_views_total: number;
  interactions_total: number;
};

export type MetricItem = {
  path?: string;
  event_type?: string;
  total: number;
};

export type Contact = {
  id: number;
  name: string;
  phone: string | null;
  email: string;
  company: string | null;
  message: string;
  internal_notes?: string | null;
  status: string;
  lead_order?: number;
  lead_kanban_column_id?: number | null;
  kanban_column?: {
    id: number;
    name: string;
    slug: string;
    color: string;
  } | null;
  source_url: string | null;
  created_at: string;
  visitor_session?: {
    session_key: string;
    identified_email: string | null;
  } | null;
};

export type SessionItem = {
  id: number;
  session_key: string;
  landing_page: string | null;
  last_path: string | null;
  identified_name: string | null;
  identified_email: string | null;
  identified_phone: string | null;
  identified_company: string | null;
  total_page_views: number;
  total_interactions: number;
  created_at: string;
  last_seen_at: string | null;
  page_visits: Array<{
    id: number;
    path: string;
    title: string | null;
    visited_at: string;
  }>;
  interaction_events: Array<{
    id: number;
    event_type: string;
    label: string | null;
    page_path: string | null;
    occurred_at: string;
  }>;
};

export type DashboardResponse = {
  summary: Summary;
  top_pages: MetricItem[];
  top_events: MetricItem[];
  recent_contacts: Contact[];
  recent_sessions: SessionItem[];
};

export type SessionsResponse = {
  data: SessionItem[];
};

export type ContactsResponse = {
  data: Contact[];
};

export type LeadKanbanColumn = {
  id: number;
  name: string;
  slug: string;
  color: string;
  position: number;
  is_default: boolean;
  contacts: Contact[];
};

export type KanbanBoardResponse = {
  data: LeadKanbanColumn[];
};
