export type DashboardSummary = {
  contacts_total: number;
  contacts_pending: number;
  sessions_total: number;
  sessions_identified: number;
  page_views_total: number;
  interactions_total: number;
  proposal_accesses_total: number;
  leads_hot: number;
  leads_warm: number;
  leads_cold: number;
};

export type DashboardResponse = {
  summary: DashboardSummary;
  daily_sessions: Array<{ date: string; total: number }>;
  top_pages: Array<{ path: string; total: number }>;
  top_events: Array<{ event_type: string; total: number }>;
  leads_by_status: Array<{ status: string; total: number }>;
  top_sources: Array<{ source: string; total: number }>;
};

export type KanbanLead = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  pipeline: string;
  lead_order: number;
  stage_entered_at: string | null;
  source_url?: string | null;
  referrer?: string | null;
  deal_value?: string | number | null;
  lost_reason?: string | null;
  lead_score?: number | null;
  score_band?: "hot" | "warm" | "cold" | string | null;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, unknown> | null;
};

export type KanbanColumn = {
  id: number;
  name: string;
  slug: string;
  color: string;
  position: number;
  pipeline?: string;
  is_locked?: boolean;
  is_initial?: boolean;
  contacts: KanbanLead[];
};

export type KanbanResponse = {
  pipeline: string;
  data: KanbanColumn[];
};

export type PipeOption = {
  key: string;
  label: string;
};

export type LostReasonOption = {
  id: number;
  name: string;
  is_active: boolean;
};

export type SessionRecord = {
  id: number;
  session_key: string;
  identified_name: string | null;
  identified_email: string | null;
  identified_phone: string | null;
  landing_page: string | null;
  last_path: string | null;
  total_page_views: number;
  total_interactions: number;
  last_seen_at: string | null;
};

export type SessionsResponse = {
  data: SessionRecord[];
};

export type ContactsResponse = {
  data: Array<{
    id: number;
    name: string;
    email: string | null;
    company: string | null;
    status: string;
    created_at: string;
  }>;
};

export type SellerProfile = {
  is_active: boolean;
  receives_leads: boolean;
  distribution_weight: number;
  commission_percent: string | number;
  participates_in_commission: boolean;
  monthly_revenue_goal: string | number;
  monthly_sales_goal: number;
};

export type SellerMetrics = {
  leads_received: number;
  leads_in_progress: number;
  proposals_created: number;
  approved_count: number;
  reproved_count: number;
  sold_value_month: number;
  ticket_avg: number;
  conversion_rate: number;
  commission_accumulated: number;
  goal_progress: number;
};

export type SellerRecord = {
  id: number;
  name: string;
  username: string;
  email: string;
  is_admin: boolean;
  is_seller: boolean;
  profile: SellerProfile;
  metrics: SellerMetrics;
};

export type DistributionSettings = {
  id: number;
  is_enabled: boolean;
  fallback_rule: "unassigned" | "default_user";
  fallback_user_id: number | null;
};

export type OnboardingDeadlineSetting = {
  id: number;
  option_key: "urgente" | "mes" | "30-60" | "sem-pressa" | string;
  label: string;
  internal_days: number;
};

export type SellersResponse = {
  data: {
    sellers: SellerRecord[];
    distribution: DistributionSettings;
    onboarding_deadlines: OnboardingDeadlineSetting[];
  };
};

export type BudgetRecord = {
  id: number;
  identifier: string;
  slug: string;
  status: string;
  project_type: string;
  title: string;
  valid_until: string | null;
  internal_due_date: string | null;
  internal_deadline_days: number | null;
  total_amount: string | number;
  entry_amount: string | number;
  adjustment_message: string | null;
  contact_request_id: number;
  client_name: string;
  client_company: string | null;
  client_email: string | null;
  client_phone: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminNotificationRecord = {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  payload?: Record<string, unknown> | null;
  created_at: string;
};

export type BudgetsResponse = {
  data: {
    budgets: BudgetRecord[];
    notifications: AdminNotificationRecord[];
  };
};
