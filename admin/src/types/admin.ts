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
  filters?: {
    from: string;
    to: string;
  };
  daily_sessions: Array<{ date: string; total: number }>;
  daily_page_views?: Array<{ date: string; total: number }>;
  daily_interactions?: Array<{ date: string; total: number }>;
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
  tags?: Array<{ id: number; name: string; slug: string; color?: string | null }>;
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
    onboarding_deadlines?: OnboardingDeadlineSetting[];
  };
};

export type SellerAnalyticsItem = {
  seller: {
    id: number;
    name: string;
    username: string;
    email: string;
  };
  metrics: {
    leads_received: number;
    leads_in_progress: number;
    proposals_created: number;
    proposals_sent: number;
    proposals_approved: number;
    proposals_reproved: number;
    approved_count: number;
    reproved_count: number;
    sold_value: number;
    avg_ticket: number;
    conversion_rate: number;
    avg_discount_percent: number;
    discount_amount: number;
    avg_response_minutes: number | null;
    response_samples: number;
    pipeline_counts?: {
      comercial: number;
      desenvolvimento: number;
      followup: number;
      cs: number;
    };
    proposal_status_counts?: {
      draft: number;
      pending_validation: number;
      sent: number;
      approved: number;
      adjustment_requested: number;
    };
  };
};

export type SellerAnalyticsResponse = {
  data: {
    filters: {
      seller_id: number | null;
      from: string | null;
      to: string | null;
    };
    totals: {
      leads_received: number;
      leads_in_progress: number;
      proposals_created: number;
      proposals_sent: number;
      proposals_approved: number;
      proposals_reproved: number;
      approved_count: number;
      reproved_count: number;
      sold_value: number;
      avg_ticket: number;
      conversion_rate: number;
      avg_discount_percent: number;
      discount_amount: number;
      response_samples: number;
      avg_response_minutes: number | null;
    };
    items: SellerAnalyticsItem[];
  };
};

export type BudgetRecord = {
  id: number;
  identifier: string;
  slug: string;
  status: string;
  requires_admin_validation?: boolean;
  is_visible_to_seller?: boolean;
  project_type: string;
  title: string;
  description?: string | null;
  objective?: string | null;
  visual_direction?: string | null;
  onboarding_answers?: Record<string, unknown> | null;
  selected_pages?: string[] | null;
  base_amount?: string | number | null;
  addons_amount?: string | number | null;
  timeline_adjustment?: string | number | null;
  valid_until: string | null;
  internal_due_date: string | null;
  internal_deadline_days: number | null;
  total_amount: string | number;
  entry_amount: string | number;
  discount_percent?: string | number;
  discount_amount?: string | number;
  admin_validated_at?: string | null;
  admin_validated_by?: number | null;
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
    pricing_settings?: Record<
      string,
      {
        max_discount_percent: number;
        requires_admin_validation: boolean;
      }
    >;
  };
};

export type ProposalSettingsResponse = {
  data: {
    onboarding_deadlines: OnboardingDeadlineSetting[];
  };
};

export type PricingProjectSetting = {
  id?: number;
  project_type: "site" | "sistema" | "automacao" | string;
  max_discount_percent: number;
  requires_admin_validation: boolean;
};

export type PricingRuleItem = {
  id?: number;
  project_type: "site" | "sistema" | "automacao" | string;
  rule_key: string;
  label: string;
  amount: number;
  sort_order: number;
  is_active: boolean;
};

export type PricingSettingsResponse = {
  data: {
    project_settings: PricingProjectSetting[];
    rules: Record<string, PricingRuleItem[]>;
  };
};

export type GeneralSettings = {
  company_name: string;
  contact_email: string;
  contact_phone: string;
  contact_whatsapp: string;
  contact_whatsapp_url: string;
  contact_address: string;
};

export type GeneralSettingsResponse = {
  data: GeneralSettings;
};

export type MetaAdvancedMatchingFields = {
  city_state_zip: boolean;
  country: boolean;
  birth_date: boolean;
  email: boolean;
  external_id: boolean;
  gender: boolean;
  first_name_last_name: boolean;
  phone: boolean;
};

export type IntegrationsSettings = {
  meta_pixel: {
    enabled: boolean;
    pixel_id: string;
    automatic_advanced_matching: boolean;
    advanced_matching_fields: MetaAdvancedMatchingFields;
    conversions_api_enabled: boolean;
    access_token: string;
    api_version: string;
    test_event_code: string;
  };
  gemini: {
    enabled: boolean;
    api_key: string;
    model: string;
    system_prompt: string;
  };
};

export type IntegrationsSettingsResponse = {
  data: IntegrationsSettings;
};

export type ScoreRulesSettings = {
  utm_source_bonus: number;
  page_view_weight: number;
  page_view_cap: number;
  contact_page_bonus: number;
  proposal_access_weight: number;
  proposal_access_cap: number;
  returned_after_proposal_bonus: number;
  form_submit_weight: number;
  form_submit_cap: number;
  whatsapp_click_weight: number;
  whatsapp_click_cap: number;
  cta_click_weight: number;
  cta_click_cap: number;
  whatsapp_form_weight: number;
  whatsapp_form_cap: number;
  onboarding_deadline_bonus_cap: number;
  low_activity_penalty: number;
  hot_min_score: number;
  warm_min_score: number;
  draft_max_score: number;
  draft_score_band: string;
  inbound_whatsapp_score: number;
  inbound_whatsapp_band: string;
};

export type ScoreRulesResponse = {
  data: ScoreRulesSettings;
};

export type SourceTagMappingRule = {
  contains: string;
  label: string;
  priority: number;
  is_active: boolean;
};

export type SourceMappingsResponse = {
  data: {
    rules: SourceTagMappingRule[];
  };
};

export type WhatsAppContactRecord = {
  id: number;
  display_name: string | null;
  push_name: string | null;
  phone: string | null;
  profile_picture_url: string | null;
};

export type WhatsAppConversationRecord = {
  id: number;
  whatsapp_instance_id: number;
  whatsapp_contact_id: number | null;
  remote_jid: string;
  phone: string | null;
  subject: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  assigned_user_id: number | null;
  lead_id: number | null;
  deal_id: number | null;
  status: string | null;
  assigned_user?: { id: number; name: string } | null;
  lead?: { id: number; name: string; phone?: string | null; pipeline?: string | null; status?: string | null } | null;
  contact?: WhatsAppContactRecord | null;
  tags?: Array<{ id: number; name: string; slug: string; color?: string | null }>;
};

export type WhatsAppTagRecord = {
  id: number;
  name: string;
  slug: string;
  color?: string | null;
};

export type WhatsAppQuickReplyRecord = {
  id: number;
  title: string;
  content: string;
  is_active: boolean;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type WhatsAppMessageRecord = {
  id: number;
  whatsapp_instance_id: number;
  whatsapp_conversation_id: number;
  whatsapp_contact_id: number | null;
  external_message_id: string | null;
  remote_jid: string;
  direction: "inbound" | "outbound";
  message_type: "text" | "image" | "audio" | "document" | "video" | "sticker" | "unknown";
  body: string | null;
  media_url: string | null;
  media_mime: string | null;
  media_filename: string | null;
  media_size: number | null;
  audio_duration: number | null;
  from_me: boolean;
  sender_name: string | null;
  sender_phone: string | null;
  sent_at: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

export type WhatsAppOverviewResponse = {
  data: {
    instance: {
      id: number;
      instance_name: string;
      status: string;
      sign_messages: boolean;
      profile_name: string | null;
      profile_status: string | null;
      profile_picture_url: string | null;
      phone: string | null;
      last_synced_at: string | null;
    };
    totals: {
      conversations: number;
      unread_conversations: number;
      messages_today: number;
    };
  };
};

export type WhatsAppConversationsResponse = {
  data: WhatsAppConversationRecord[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type WhatsAppMessagesResponse = {
  data: WhatsAppMessageRecord[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type WhatsAppConversationPayloadResponse = {
  data: WhatsAppConversationRecord;
  messages: WhatsAppMessageRecord[];
};

export type WhatsAppGeminiInsightsResponse = {
  data: {
    conversation_id: number;
    enabled: boolean;
    summary: string;
    productivity_score: number;
    productivity_band: "vermelha" | "laranja" | "verde" | string;
    recommended_formality: "formal" | "equilibrado" | "informal" | string;
    language_guidance: string[];
    next_steps: string[];
    risk_flags: string[];
  };
};

export type WhatsAppSettingsResponse = {
  data: {
    instance: {
      id: number;
      instance_name: string;
      is_active?: boolean;
      status: string;
      profile_name: string | null;
      profile_status: string | null;
      profile_picture_url: string | null;
      phone: string | null;
      last_connection_state: string | null;
      last_synced_at: string | null;
      sign_messages: boolean;
      settings?: {
        id: number;
        sign_messages: boolean;
        config_json?: Record<string, unknown> | null;
      } | null;
    };
    settings: {
      id: number;
      sign_messages: boolean;
      config_json?: Record<string, unknown> | null;
    };
    evolution: {
      instance: string;
      base_url: string;
      realtime_mode: string;
      polling_interval: number;
      webhook_url: string | null;
    };
  };
};

export type WhatsAppProfileResponse = {
  data: {
    instance: {
      id: number;
      instance_name: string;
      status: string;
      profile_name: string | null;
      profile_status: string | null;
      profile_picture_url: string | null;
      phone: string | null;
      last_connection_state: string | null;
      last_synced_at: string | null;
    };
    remote_status?: Record<string, unknown>;
    remote_profile?: Record<string, unknown>;
    remote_response?: Record<string, unknown>;
  };
};
