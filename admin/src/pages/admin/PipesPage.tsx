import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Plus,
  Settings2,
  X,
  Copy,
  ExternalLink,
  GripVertical,
  CheckCircle2,
  XCircle,
  Rocket,
  Clock3,
  Save,
  ChevronLeft,
  ChevronRight,
  Mail,
  MessageCircle,
  Tag,
  Activity,
  HandCoins,
  FolderKanban,
  NotebookPen,
  Flame,
  Timer,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import { withMainSiteUrl } from "../../config/runtime";
import LoadingState from "../../components/common/LoadingState";
import AlertModal from "../../components/common/AlertModal";
import type {
  KanbanColumn,
  KanbanLead,
  KanbanResponse,
  LostReasonOption,
  PipeOption,
  SourceMappingsResponse,
  SourceTagMappingRule,
  WhatsAppConversationPayloadResponse,
  WhatsAppConversationRecord,
  WhatsAppMessageRecord,
  WhatsAppQuickReplyRecord,
  WhatsAppTagRecord,
} from "../../types/admin";
import WhatsAppConversationView from "../../components/whatsapp/WhatsAppConversationView";

type EditableColumn = {
  id: number | string;
  name: string;
  color: string;
  is_locked: boolean;
};

type LeadDetailsResponse = {
  data: Record<string, unknown>;
};

type UserOption = {
  id: number;
  name: string;
};

type LeadModalTab = "movimentacao" | "orcamentos" | "onboarding" | "notas" | "whatsapp";
type EditableLeadField = "name" | "company" | "email" | "phone" | "responsavel" | null;

const LEAD_MODAL_TABS: Array<{ key: LeadModalTab; label: string; icon: typeof Activity }> = [
  { key: "movimentacao", label: "Movimentacao", icon: Activity },
  { key: "orcamentos", label: "Orcamentos", icon: HandCoins },
  { key: "onboarding", label: "Dados / Onboarding", icon: FolderKanban },
  { key: "notas", label: "Notas internas", icon: NotebookPen },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
];

const PIPE_LABELS: Record<string, string> = {
  comercial: "Comercial",
  desenvolvimento: "Desenvolvimento",
  followup: "FollowUp",
  cs: "CS",
};

const CONTACT_TAG_LABELS: Record<string, string> = {
  whatsapp_click: "Botao WhatsApp",
  whatsapp_button_click: "Botao WhatsApp",
  whatsapp_form_submitted: "Formulario WhatsApp",
  contact_form_submit: "Formulario de contato",
  lead_form_submitted: "Formulario enviado",
  lead_form_fill_started: "Formulario iniciado",
  lead_form_abandoned_captured: "Lead parcial capturado",
  onboarding_form_submit: "Formulario onboarding",
  cta_click: "Botao CTA",
  cta_request_proposal_click: "Solicitar proposta",
  proposal_open: "Acesso proposta",
  proposal_reopen: "Reabriu proposta",
  proposal_view: "Visualizou proposta",
};

const ONBOARDING_PROJECT_LABELS: Record<string, string> = {
  site: "Site",
  sistema: "Sistema",
  automacao: "Automacao",
};

const ONBOARDING_FIELD_LABELS: Record<string, string> = {
  siteObjective: "Objetivo do site",
  sitePages: "Paginas desejadas",
  siteDeadline: "Prazo",
  siteVisual: "Direcao visual",
  siteAssets: "Materiais disponiveis",
  siteReferences: "Referencias",
  siteNotes: "Observacoes",
  systemType: "Tipo de sistema",
  systemAiNeed: "Uso de inteligencia artificial",
  systemFeatures: "Funcionalidades esperadas",
  systemIntegrationNeed: "Precisa de integracao",
  systemIntegrationDetails: "Detalhes da integracao",
  systemAssets: "Materiais disponiveis",
  automationType: "Tipo de automacao",
  automationDescription: "Descricao da automacao",
};

const ONBOARDING_VALUE_LABELS: Record<string, Record<string, string>> = {
  siteObjective: {
    apresentar: "Apresentar minha empresa",
    leads: "Gerar leads",
    vender: "Vender online",
    portfolio: "Mostrar portfolio",
    agendamento: "Receber agendamentos",
  },
  siteDeadline: {
    urgente: "Urgente",
    mes: "Ainda este mes",
    "30-60": "Entre 30 e 60 dias",
    "sem-pressa": "Sem pressa",
  },
  siteVisual: {
    minimalista: "Moderna e minimalista",
    premium: "Sofisticada e premium",
    comercial: "Direta e comercial",
    criativa: "Criativa e marcante",
  },
  systemType: {
    web: "Sistema Web",
    local: "Sistema local",
  },
  systemAiNeed: {
    sim: "Preciso",
    nao: "Nao preciso",
    talvez: "Nao tenho certeza",
  },
  systemIntegrationNeed: {
    sim: "Sim",
    nao: "Nao",
  },
  automationType: {
    "sistema-sistema": "Sistema x Sistema",
    whatsapp: "WhatsApp",
    webhooks: "Webhooks",
    outro: "Outro tipo",
  },
};

const ONBOARDING_FIELDS_BY_PROJECT: Record<string, string[]> = {
  site: ["siteObjective", "sitePages", "siteDeadline", "siteVisual", "siteAssets", "siteReferences", "siteNotes"],
  sistema: ["systemType", "systemAiNeed", "systemFeatures", "systemIntegrationNeed", "systemIntegrationDetails", "systemAssets"],
  automacao: ["automationType", "automationDescription"],
};

function daysInStage(value: string | null): number {
  if (!value) {
    return 0;
  }

  const entered = new Date(value).getTime();
  if (Number.isNaN(entered)) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - entered) / (1000 * 60 * 60 * 24)));
}

function timeSince(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  const ms = Date.now() - date.getTime();
  if (Number.isNaN(ms) || ms < 0) {
    return "-";
  }

  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("pt-BR");
}

function formatMoney(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return "-";
  }

  return `R$ ${numeric.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function cleanPhoneForWa(phone: string): string {
  return phone.replace(/\D/g, "");
}

function scoreStyles(band?: string | null): string {
  if (band === "hot") {
    return "bg-emerald-600 text-white ring-4 ring-emerald-100";
  }

  if (band === "warm") {
    return "bg-amber-500 text-white ring-4 ring-amber-100";
  }

  return "bg-slate-500 text-white ring-4 ring-slate-100";
}

function detectContactTags(
  lead: KanbanLead,
  details?: Record<string, unknown> | null,
  mappingRules: SourceTagMappingRule[] = [],
): string[] {
  const tags = new Set<string>();

  (lead.tags ?? []).forEach((tag) => {
    if (tag?.name) {
      tags.add(tag.name);
    }
  });

  const source = `${lead.source_url ?? ""} ${(lead.metadata?.source ?? "") as string}`.toLowerCase();
  const isDirectWhatsAppLead = source.includes("whatsapp:inbound") || Boolean(lead.metadata?.auto_created_from_whatsapp);

  if (mappingRules.length > 0) {
    mappingRules
      .filter((rule) => Boolean(rule.is_active) && rule.contains && rule.label)
      .sort((a, b) => Number(b.priority ?? 0) - Number(a.priority ?? 0))
      .forEach((rule) => {
        const needle = String(rule.contains ?? "").toLowerCase().trim();
        if (needle !== "" && source.includes(needle)) {
          tags.add(String(rule.label));
        }
      });
  } else {
    if (isDirectWhatsAppLead) {
      tags.add("WhatsApp Direto");
    } else if (source.includes("whatsapp") || source.includes("zap") || source.includes("wa.me")) {
      tags.add("Botao WhatsApp");
    }

    if (source.includes("contato") || source.includes("contact")) {
      tags.add("Formulario de contato");
    }

    if (source.includes("onboarding")) {
      tags.add("Formulario onboarding");
    }
  }

  const timeline = (details?.tracking as { timeline?: Array<Record<string, unknown>> } | undefined)?.timeline ?? [];
  timeline.slice(0, 40).forEach((item) => {
    const eventType = String(item.event_type ?? "");
    const label = CONTACT_TAG_LABELS[eventType];
    if (label) {
      tags.add(label);
    }
  });

  if (isDirectWhatsAppLead) {
    tags.delete("Botao WhatsApp");
  }

  if (tags.size === 0) {
    tags.add("Site institucional");
  }

  return Array.from(tags).slice(0, 4);
}

function extractUserOptions(details: Record<string, unknown> | null, currentUserName?: string, currentUserId?: number): UserOption[] {
  const map = new Map<number, string>();

  if (currentUserId && currentUserName) {
    map.set(currentUserId, currentUserName);
  }

  const assigned = details?.assigned_user as Record<string, unknown> | undefined;
  if (assigned?.id && assigned?.name) {
    map.set(Number(assigned.id), String(assigned.name));
  }

  const closer = details?.responsible_closer_user as Record<string, unknown> | undefined;
  if (closer?.id && closer?.name) {
    map.set(Number(closer.id), String(closer.name));
  }

  const history = Array.isArray(details?.history) ? (details?.history as Array<Record<string, unknown>>) : [];
  history.forEach((item) => {
    const actor = item.actor_user as Record<string, unknown> | undefined;
    if (actor?.id && actor?.name) {
      map.set(Number(actor.id), String(actor.name));
    }
  });

  return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
}

function formatOnboardingAnswer(field: string, rawValue: unknown): string {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return "-";
  }

  if (Array.isArray(rawValue)) {
    if (rawValue.length === 0) {
      return "-";
    }

    return rawValue
      .map((value) => {
        const normalized = String(value);
        return ONBOARDING_VALUE_LABELS[field]?.[normalized] ?? normalized;
      })
      .join(", ");
  }

  const normalized = String(rawValue);
  return ONBOARDING_VALUE_LABELS[field]?.[normalized] ?? normalized;
}

export default function PipesPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [pipes, setPipes] = useState<PipeOption[]>([]);
  const [pipeline, setPipeline] = useState("comercial");
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMove, setSavingMove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lostReasons, setLostReasons] = useState<LostReasonOption[]>([]);

  const [leadForm, setLeadForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
    source: "",
    deal_value: "",
  });

  const [settingsColumns, setSettingsColumns] = useState<EditableColumn[]>([]);
  const [deletedColumnIds, setDeletedColumnIds] = useState<number[]>([]);
  const [pendingColumnRemovalIndex, setPendingColumnRemovalIndex] = useState<number | null>(null);

  const [pendingLostMove, setPendingLostMove] = useState<{
    leadId: number;
    mode: "reject";
  } | null>(null);
  const [lostReasonValue, setLostReasonValue] = useState("");
  const [lostReasonCustom, setLostReasonCustom] = useState("");

  const [draggedLead, setDraggedLead] = useState<KanbanLead | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [onboardingPrompt, setOnboardingPrompt] = useState<{ url: string; leadName: string } | null>(null);
  const [copiedOnboardingUrl, setCopiedOnboardingUrl] = useState(false);
  const [selectedLead, setSelectedLead] = useState<KanbanLead | null>(null);
  const [leadDetails, setLeadDetails] = useState<Record<string, unknown> | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [copiedProposalUrl, setCopiedProposalUrl] = useState(false);

  const [activeTab, setActiveTab] = useState<LeadModalTab>("movimentacao");
  const [editingField, setEditingField] = useState<EditableLeadField>(null);
  const [internalNotesDraft, setInternalNotesDraft] = useState("");
  const [newNoteDraft, setNewNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [isSavingLeadInfo, setIsSavingLeadInfo] = useState(false);
  const [leadEditForm, setLeadEditForm] = useState({ name: "", email: "", phone: "", company: "" });
  const [assignedUserId, setAssignedUserId] = useState<string>("");
  const [whatsappConversation, setWhatsappConversation] = useState<WhatsAppConversationRecord | null>(null);
  const [whatsappMessages, setWhatsappMessages] = useState<WhatsAppMessageRecord[]>([]);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [whatsappSending, setWhatsappSending] = useState(false);
  const [whatsappQuickReplies, setWhatsappQuickReplies] = useState<WhatsAppQuickReplyRecord[]>([]);
  const [tagCatalog, setTagCatalog] = useState<WhatsAppTagRecord[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [tagColorDraft, setTagColorDraft] = useState("#2563eb");
  const [savingTag, setSavingTag] = useState(false);
  const [sourceMappingRules, setSourceMappingRules] = useState<SourceTagMappingRule[]>([]);
  const leadQueryToOpenRef = useRef<number | null>(null);
  const selectedLeadIdRef = useRef<number | null>(null);
  const whatsappConversationAbortRef = useRef<AbortController | null>(null);
  const whatsappConversationRequestSeqRef = useRef(0);

  const userOptions = useMemo(
    () => extractUserOptions(leadDetails, user?.name, user?.id),
    [leadDetails, user?.id, user?.name],
  );

  useEffect(() => {
    const suppressGlobalNotifier = Boolean(selectedLead) && activeTab === "whatsapp";
    window.dispatchEvent(
      new CustomEvent("forticorp:whatsapp-context", {
        detail: { suppressGlobalNotifier },
      }),
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent("forticorp:whatsapp-context", {
          detail: { suppressGlobalNotifier: false },
        }),
      );
    };
  }, [selectedLead, activeTab]);

  useEffect(() => {
    selectedLeadIdRef.current = selectedLead?.id ?? null;
  }, [selectedLead?.id]);

  const loadBase = async () => {
    if (!token) {
      return;
    }

    const [pipesResp, reasonsResp, quickRepliesResp, tagResp, sourceMappingsResp] = await Promise.all([
      apiRequest<{ data: PipeOption[] }>("/api/admin/pipes", {}, token),
      apiRequest<{ data: LostReasonOption[] }>("/api/admin/kanban/lost-reasons", {}, token),
      apiRequest<{ data: WhatsAppQuickReplyRecord[] }>("/api/admin/whatsapp/quick-replies", {}, token),
      apiRequest<{ data: WhatsAppTagRecord[] }>("/api/admin/whatsapp/tags", {}, token),
      apiRequest<SourceMappingsResponse>("/api/admin/settings/source-mappings", {}, token),
    ]);

    setPipes(pipesResp.data);
    setLostReasons(reasonsResp.data);
    setWhatsappQuickReplies(quickRepliesResp.data ?? []);
    setTagCatalog(tagResp.data ?? []);
    setSourceMappingRules(sourceMappingsResp.data.rules ?? []);
  };

  const loadBoard = async (pipe: string, syncSettings = true, silent = false) => {
    if (!token) {
      return;
    }

    if (!silent) {
      setLoading(true);
    }

    setError(null);

    try {
      const response = await apiRequest<KanbanResponse>(`/api/admin/kanban?pipeline=${pipe}`, {}, token);
      const sorted = [...response.data].sort((a, b) => a.position - b.position);
      setColumns(sorted);

      if (syncSettings) {
        setSettingsColumns(
          sorted.map((col) => ({
            id: col.id,
            name: col.name,
            color: col.color,
            is_locked: Boolean(col.is_locked),
          })),
        );
        setDeletedColumnIds([]);
      }
    } catch (requestError) {
      if (!silent) {
        setError(requestError instanceof ApiError ? requestError.message : "Falha ao carregar pipe.");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const refreshSelectedLeadDetails = async () => {
    if (!token || !selectedLead) {
      return;
    }

    try {
      const response = await apiRequest<LeadDetailsResponse>(`/api/admin/contacts/${selectedLead.id}`, {}, token);
      setLeadDetails(response.data);
    } catch {
      // silencioso no polling
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pipeParam = params.get("pipe") ?? "comercial";
    const leadParam = params.get("lead");
    const leadId = leadParam ? Number(leadParam) : Number.NaN;

    if (pipeParam !== pipeline) {
      setPipeline(pipeParam);
    }

    if (Number.isFinite(leadId) && leadId > 0) {
      leadQueryToOpenRef.current = leadId;
    }
  }, [location.search, pipeline]);

  useEffect(() => {
    const boot = async () => {
      if (!token) {
        return;
      }

      try {
        await loadBase();
        await loadBoard(pipeline);
      } catch {
        setError("Nao foi possivel iniciar o modulo de pipes.");
      }
    };

    void boot();
  }, [token, pipeline]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const timer = window.setInterval(() => {
      if (isAddOpen || isSettingsOpen || pendingLostMove) {
        return;
      }

      void loadBoard(pipeline, false, true);
      if (selectedLead) {
        void refreshSelectedLeadDetails();
      }
    }, 30000);

    return () => window.clearInterval(timer);
  }, [token, pipeline, isAddOpen, isSettingsOpen, pendingLostMove, selectedLead]);

  useEffect(() => {
    const pendingLeadId = leadQueryToOpenRef.current;
    if (!pendingLeadId || columns.length === 0) {
      return;
    }

    const lead = columns
      .flatMap((column) => column.contacts ?? [])
      .find((item) => item.id === pendingLeadId);

    if (!lead) {
      return;
    }

    leadQueryToOpenRef.current = null;
    void openLeadDetails(lead);

    const params = new URLSearchParams(location.search);
    params.delete("lead");
    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : "",
      },
      { replace: true },
    );
  }, [columns, location.pathname, location.search, navigate]);

  const handlePipelineChange = async (next: string) => {
    navigate(`/admin/pipes?pipe=${next}`);
  };

  const submitLead = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    try {
      await apiRequest(
        "/api/admin/kanban/leads",
        {
          method: "POST",
          body: JSON.stringify({
            ...leadForm,
            pipeline,
            deal_value: leadForm.deal_value ? Number(leadForm.deal_value) : null,
          }),
        },
        token,
      );

      setIsAddOpen(false);
      setLeadForm({ name: "", email: "", phone: "", company: "", message: "", source: "", deal_value: "" });
      await loadBoard(pipeline);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel criar o lead.");
    }
  };

  const applyOptimisticLeadMove = (
    boardColumns: KanbanColumn[],
    lead: KanbanLead,
    targetColumn: KanbanColumn,
    targetIndex: number,
  ): KanbanColumn[] => {
    const cloned = boardColumns.map((column) => ({
      ...column,
      contacts: [...(column.contacts ?? [])],
    }));

    const sourceColumnIndex = cloned.findIndex((column) => (column.contacts ?? []).some((item) => item.id === lead.id));
    if (sourceColumnIndex < 0) {
      return boardColumns;
    }

    const sourceColumn = cloned[sourceColumnIndex];
    const sourceContacts = [...(sourceColumn.contacts ?? [])];
    const sourceLeadIndex = sourceContacts.findIndex((item) => item.id === lead.id);
    if (sourceLeadIndex < 0) {
      return boardColumns;
    }

    const [movingLead] = sourceContacts.splice(sourceLeadIndex, 1);
    sourceColumn.contacts = sourceContacts;

    const targetColumnIndex = cloned.findIndex((column) => column.id === targetColumn.id);
    if (targetColumnIndex < 0) {
      return boardColumns;
    }

    const targetContacts = [...(cloned[targetColumnIndex].contacts ?? [])];
    const normalizedIndex = Math.max(0, Math.min(targetIndex, targetContacts.length));
    targetContacts.splice(normalizedIndex, 0, {
      ...movingLead,
      status: targetColumn.slug,
      pipeline: targetColumn.pipeline ?? movingLead.pipeline,
    });

    const normalizedTargetContacts = targetContacts.map((item, index) => ({
      ...item,
      lead_order: index,
    }));
    cloned[targetColumnIndex].contacts = normalizedTargetContacts;

    if (sourceColumnIndex !== targetColumnIndex) {
      cloned[sourceColumnIndex].contacts = (cloned[sourceColumnIndex].contacts ?? []).map((item, index) => ({
        ...item,
        lead_order: index,
      }));
    }

    return cloned;
  };

  const performMove = async (lead: KanbanLead, targetColumn: KanbanColumn, leadOrder = 9999) => {
    if (!token) {
      return;
    }

    setSavingMove(true);
    const snapshotColumns = columns.map((column) => ({
      ...column,
      contacts: [...(column.contacts ?? [])],
    }));
    setColumns((prev) => applyOptimisticLeadMove(prev, lead, targetColumn, leadOrder));

    try {
      await apiRequest(
        `/api/admin/kanban/contacts/${lead.id}/move`,
        {
          method: "PATCH",
          body: JSON.stringify({
            lead_kanban_column_id: targetColumn.id,
          lead_order: leadOrder,
          }),
        },
        token,
      );

      await loadBoard(pipeline, false, true);
      await refreshSelectedLeadDetails();
      setEditingField(null);

      if (pipeline === "comercial" && targetColumn.slug === "onboarding") {
        setCopiedOnboardingUrl(false);
        setOnboardingPrompt({
          url: withMainSiteUrl("/onboarding"),
          leadName: lead.name,
        });
      }
    } catch (requestError) {
      setColumns(snapshotColumns);
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel mover card.");
    } finally {
      setSavingMove(false);
    }
  };

  const performTransition = async (
    leadId: number,
    action: "approve" | "reject" | "project_delivered" | "project_finalized",
    lostReason?: string,
  ) => {
    if (!token) {
      return;
    }

    setSavingMove(true);
    try {
      await apiRequest(
        `/api/admin/kanban/contacts/${leadId}/transition`,
        {
          method: "POST",
          body: JSON.stringify({
            action,
            lost_reason: lostReason ?? null,
          }),
        },
        token,
      );

      setPendingLostMove(null);
      setLostReasonValue("");
      setLostReasonCustom("");
      await loadBoard(pipeline, false, true);
      await refreshSelectedLeadDetails();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel concluir a transicao.");
    } finally {
      setSavingMove(false);
    }
  };

  const openLeadDetails = async (lead: KanbanLead) => {
    if (!token) {
      return;
    }

    setSelectedLead(lead);
    setLeadDetails(null);
    setDetailsLoading(true);
    setCopiedProposalUrl(false);
    setActiveTab("movimentacao");
    setEditingField(null);
    setWhatsappConversation(null);
    setWhatsappMessages([]);

    try {
      const response = await apiRequest<LeadDetailsResponse>(`/api/admin/contacts/${lead.id}`, {}, token);
      setLeadDetails(response.data);
      setInternalNotesDraft(String(response.data.internal_notes ?? ""));
      setNewNoteDraft("");
      setLeadEditForm({
        name: String(response.data.name ?? lead.name ?? ""),
        email: String(response.data.email ?? lead.email ?? ""),
        phone: String(response.data.phone ?? lead.phone ?? ""),
        company: String(response.data.company ?? lead.company ?? ""),
      });
      setAssignedUserId(response.data.assigned_user_id ? String(response.data.assigned_user_id) : "");
    } catch {
      setLeadDetails(null);
      setError("Nao foi possivel carregar o perfil do card.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const saveLeadDetails = async () => {
    if (!token || !selectedLead) {
      return;
    }

    if (!leadEditForm.email.trim() && !leadEditForm.phone.trim()) {
      setError("O lead precisa ter ao menos e-mail ou WhatsApp.");
      return;
    }

    setIsSavingLeadInfo(true);

    try {
      await apiRequest(
        `/api/admin/contacts/${selectedLead.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: leadEditForm.name,
            email: leadEditForm.email || null,
            phone: leadEditForm.phone || null,
            company: leadEditForm.company || null,
            internal_notes: internalNotesDraft || null,
            assigned_user_id: assignedUserId ? Number(assignedUserId) : null,
          }),
        },
        token,
      );

      await loadBoard(pipeline, false, true);
      await refreshSelectedLeadDetails();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel salvar dados do lead.");
    } finally {
      setIsSavingLeadInfo(false);
    }
  };

  const handleDropToColumn = async (targetColumn: KanbanColumn, targetIndex?: number, droppedLeadId?: number) => {
    const fallbackLead =
      typeof droppedLeadId === "number" && Number.isFinite(droppedLeadId)
        ? columns.flatMap((column) => column.contacts ?? []).find((lead) => lead.id === droppedLeadId) ?? null
        : null;
    const movingLead = draggedLead ?? fallbackLead;

    if (!movingLead || savingMove) {
      return;
    }

    const sourceColumn = columns.find((column) => (column.contacts ?? []).some((lead) => lead.id === movingLead.id));
    const sourceIndex = sourceColumn?.contacts.findIndex((lead) => lead.id === movingLead.id) ?? -1;

    let nextOrder = typeof targetIndex === "number" ? targetIndex : targetColumn.contacts.length;
    if (sourceColumn && sourceColumn.id === targetColumn.id && sourceIndex >= 0 && sourceIndex < nextOrder) {
      nextOrder -= 1;
    }

    if (sourceColumn && sourceColumn.id === targetColumn.id && sourceIndex === nextOrder) {
      setDraggedLead(null);
      setDragOverColumnId(null);
      setDragOverIndex(null);
      return;
    }

    await performMove(movingLead, targetColumn, Math.max(0, nextOrder));
    setDraggedLead(null);
    setDragOverColumnId(null);
    setDragOverIndex(null);
  };

  const saveLostReasonAndReject = async () => {
    if (!token || !pendingLostMove) {
      return;
    }

    let finalReason = lostReasonValue;

    if (lostReasonValue === "__custom__") {
      finalReason = lostReasonCustom.trim();
      if (!finalReason) {
        setError("Informe o motivo personalizado.");
        return;
      }

      try {
        await apiRequest(
          "/api/admin/kanban/lost-reasons",
          {
            method: "POST",
            body: JSON.stringify({ name: finalReason }),
          },
          token,
        );
      } catch {
        // segue mesmo se ja existir
      }
    }

    if (!finalReason || finalReason === "__custom__") {
      setError("Selecione um motivo para continuar.");
      return;
    }

    await performTransition(pendingLostMove.leadId, "reject", finalReason);
    await loadBase();
  };

  const addInternalNote = async () => {
    if (!token || !selectedLead) {
      return;
    }

    const note = newNoteDraft.trim();
    if (!note) {
      return;
    }

    setSavingNote(true);
    try {
      await apiRequest(
        `/api/admin/contacts/${selectedLead.id}/notes`,
        {
          method: "POST",
          body: JSON.stringify({ note }),
        },
        token,
      );

      setNewNoteDraft("");
      await refreshSelectedLeadDetails();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel salvar anotacao.");
    } finally {
      setSavingNote(false);
    }
  };

  const loadLeadWhatsAppConversation = async () => {
    if (!token || !selectedLead) {
      return;
    }

    whatsappConversationAbortRef.current?.abort();
    const controller = new AbortController();
    whatsappConversationAbortRef.current = controller;
    const requestSeq = whatsappConversationRequestSeqRef.current + 1;
    whatsappConversationRequestSeqRef.current = requestSeq;
    const leadId = selectedLead.id;

    setWhatsappLoading(true);

    try {
      const leadConversation = await apiRequest<{ data: WhatsAppConversationRecord | null }>(
        `/api/admin/whatsapp/leads/${selectedLead.id}/conversation`,
        { signal: controller.signal },
        token,
      );

      if (
        controller.signal.aborted ||
        requestSeq !== whatsappConversationRequestSeqRef.current ||
        selectedLeadIdRef.current !== leadId
      ) {
        return;
      }

      if (!leadConversation.data) {
        setWhatsappConversation(null);
        setWhatsappMessages([]);
        return;
      }

      const payload = await apiRequest<WhatsAppConversationPayloadResponse>(
        `/api/admin/whatsapp/conversations/${leadConversation.data.id}`,
        { signal: controller.signal },
        token,
      );

      if (
        controller.signal.aborted ||
        requestSeq !== whatsappConversationRequestSeqRef.current ||
        selectedLeadIdRef.current !== leadId
      ) {
        return;
      }

      setWhatsappConversation(payload.data);
      setWhatsappMessages(payload.messages);
    } catch (requestError) {
      if (controller.signal.aborted) {
        return;
      }

      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel carregar conversa do WhatsApp.");
    } finally {
      if (requestSeq === whatsappConversationRequestSeqRef.current) {
        setWhatsappLoading(false);
      }
    }
  };

  const startLeadWhatsAppConversation = async () => {
    if (!token || !selectedLead) {
      return;
    }

    const phone = String(leadEditForm.phone || selectedLead.phone || "").trim();
    if (!phone) {
      setError("Este lead nao possui WhatsApp valido para iniciar conversa.");
      return;
    }

    setWhatsappLoading(true);

    try {
      const response = await apiRequest<{ data: WhatsAppConversationRecord }>(
        "/api/admin/whatsapp/conversations/start",
        {
          method: "POST",
          body: JSON.stringify({
            phone,
            display_name: leadEditForm.name || selectedLead.name,
          }),
        },
        token,
      );

      const payload = await apiRequest<WhatsAppConversationPayloadResponse>(
        `/api/admin/whatsapp/conversations/${response.data.id}`,
        {},
        token,
      );

      setWhatsappConversation(payload.data);
      setWhatsappMessages(payload.messages);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel iniciar conversa no WhatsApp.");
    } finally {
      setWhatsappLoading(false);
    }
  };

  const sendLeadWhatsAppText = async (text: string) => {
    if (!token || !whatsappConversation) {
      return;
    }

    setWhatsappSending(true);
    try {
      const response = await apiRequest<{ data: WhatsAppMessageRecord }>(
        `/api/admin/whatsapp/conversations/${whatsappConversation.id}/messages/text`,
        {
          method: "POST",
          body: JSON.stringify({ text }),
        },
        token,
      );

      setWhatsappMessages((prev) =>
        [...prev, response.data].sort((a, b) => a.id - b.id),
      );
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel enviar mensagem.");
    } finally {
      setWhatsappSending(false);
    }
  };

  const sendLeadWhatsAppImage = async (payload: { base64: string; mime: string; filename?: string; caption?: string }) => {
    if (!token || !whatsappConversation) {
      return;
    }

    setWhatsappSending(true);
    try {
      const response = await apiRequest<{ data: WhatsAppMessageRecord }>(
        `/api/admin/whatsapp/conversations/${whatsappConversation.id}/messages/image`,
        {
          method: "POST",
          body: JSON.stringify({
            media_base64: payload.base64,
            media_mime: payload.mime,
            filename: payload.filename,
            caption: payload.caption,
          }),
        },
        token,
      );

      setWhatsappMessages((prev) =>
        [...prev, response.data].sort((a, b) => a.id - b.id),
      );
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel enviar imagem.");
    } finally {
      setWhatsappSending(false);
    }
  };

  const sendLeadWhatsAppAudio = async (payload: { base64: string; mime: string; filename?: string }) => {
    if (!token || !whatsappConversation) {
      return;
    }

    setWhatsappSending(true);
    try {
      const response = await apiRequest<{ data: WhatsAppMessageRecord }>(
        `/api/admin/whatsapp/conversations/${whatsappConversation.id}/messages/audio`,
        {
          method: "POST",
          body: JSON.stringify({
            media_base64: payload.base64,
            media_mime: payload.mime,
            filename: payload.filename,
          }),
        },
        token,
      );

      setWhatsappMessages((prev) =>
        [...prev, response.data].sort((a, b) => a.id - b.id),
      );
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel enviar audio.");
    } finally {
      setWhatsappSending(false);
    }
  };

  const sendLeadWhatsAppDocument = async (payload: { base64: string; mime: string; filename?: string; caption?: string }) => {
    if (!token || !whatsappConversation) {
      return;
    }

    setWhatsappSending(true);
    try {
      const response = await apiRequest<{ data: WhatsAppMessageRecord }>(
        `/api/admin/whatsapp/conversations/${whatsappConversation.id}/messages/document`,
        {
          method: "POST",
          body: JSON.stringify({
            media_base64: payload.base64,
            media_mime: payload.mime,
            filename: payload.filename,
            caption: payload.caption,
          }),
        },
        token,
      );

      setWhatsappMessages((prev) =>
        [...prev, response.data].sort((a, b) => a.id - b.id),
      );
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel enviar documento.");
    } finally {
      setWhatsappSending(false);
    }
  };

  const addLeadTag = async () => {
    if (!token || !selectedLead) {
      return;
    }

    const value = tagDraft.trim();
    if (!value) {
      return;
    }

    setSavingTag(true);
    try {
      const matched = tagCatalog.find((tag) => tag.name.toLowerCase() === value.toLowerCase() || tag.slug === value.toLowerCase());
      await apiRequest(
        `/api/admin/contacts/${selectedLead.id}/tags`,
        {
          method: "POST",
          body: JSON.stringify(
            matched
              ? { tag_id: matched.id }
              : { name: value, color: tagColorDraft },
          ),
        },
        token,
      );

      setTagDraft("");
      await Promise.all([refreshSelectedLeadDetails(), loadBoard(pipeline, false, true), loadBase()]);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel adicionar tag.");
    } finally {
      setSavingTag(false);
    }
  };

  const removeLeadTag = async (tagId: number) => {
    if (!token || !selectedLead) {
      return;
    }

    setSavingTag(true);
    try {
      await apiRequest(
        `/api/admin/contacts/${selectedLead.id}/tags/${tagId}`,
        { method: "DELETE" },
        token,
      );
      await Promise.all([refreshSelectedLeadDetails(), loadBoard(pipeline, false, true)]);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel remover tag.");
    } finally {
      setSavingTag(false);
    }
  };

  const moveSettingsColumn = (index: number, direction: -1 | 1) => {
    setSettingsColumns((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) {
        return prev;
      }

      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const removeSettingsColumn = (index: number) => {
    setSettingsColumns((prev) => {
      const item = prev[index];
      if (item?.is_locked) {
        return prev;
      }

      if (typeof item.id === "number") {
        setDeletedColumnIds((deleted) => [...deleted, item.id as number]);
      }

      return prev.filter((_, i) => i !== index);
    });
  };

  const savePipeSettings = async () => {
    if (!token) {
      return;
    }

    setSavingMove(true);
    setError(null);

    try {
      const local = [...settingsColumns];

      for (const column of local) {
        if (typeof column.id === "string") {
          const created = await apiRequest<{ data: KanbanColumn }>(
            "/api/admin/kanban/columns",
            {
              method: "POST",
              body: JSON.stringify({
                pipeline,
                name: column.name,
                color: column.color,
              }),
            },
            token,
          );

          column.id = created.data.id;
        }
      }

      for (const column of local) {
        if (typeof column.id === "number") {
          await apiRequest(
            `/api/admin/kanban/columns/${column.id}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                name: column.name,
                color: column.color,
              }),
            },
            token,
          );
        }
      }

      for (const id of deletedColumnIds) {
        await apiRequest(`/api/admin/kanban/columns/${id}`, { method: "DELETE" }, token);
      }

      await apiRequest(
        "/api/admin/kanban/columns/reorder",
        {
          method: "PATCH",
          body: JSON.stringify({
            pipeline,
            column_ids: local.map((col) => Number(col.id)),
          }),
        },
        token,
      );

      setIsSettingsOpen(false);
      setPendingColumnRemovalIndex(null);
      await loadBoard(pipeline);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Falha ao salvar configuracoes.");
    } finally {
      setSavingMove(false);
    }
  };

  const currentLeadStageSlug = String((leadDetails?.status as string | undefined) ?? selectedLead?.status ?? "");
  const currentLeadPipe = String((leadDetails?.pipeline as string | undefined) ?? selectedLead?.pipeline ?? pipeline);

  const canApproveOrReject = currentLeadPipe === "comercial";
  const canProjectDelivered = currentLeadPipe === "desenvolvimento" && currentLeadStageSlug === "entrega";
  const canProjectFinalize = currentLeadPipe === "cs" && currentLeadStageSlug !== "projeto-finalizado";

  const pipeLabel = useMemo(() => PIPE_LABELS[pipeline] ?? "Comercial", [pipeline]);
  const allVisibleCards = useMemo(() => columns.flatMap((column) => column.contacts ?? []), [columns]);
  const highPriorityCards = useMemo(
    () => allVisibleCards.filter((lead) => Number(lead.lead_score ?? 0) >= 80).length,
    [allVisibleCards],
  );
  const stalledCards = useMemo(
    () => allVisibleCards.filter((lead) => daysInStage(lead.stage_entered_at) >= 7).length,
    [allVisibleCards],
  );
  const averageScore = useMemo(() => {
    if (allVisibleCards.length === 0) {
      return 0;
    }

    const total = allVisibleCards.reduce((sum, lead) => sum + Number(lead.lead_score ?? 0), 0);
    return total / allVisibleCards.length;
  }, [allVisibleCards]);

  const modalStageColumns = useMemo(
    () =>
      [...columns]
        .filter((column) => (column.pipeline ?? pipeline) === currentLeadPipe)
        .sort((a, b) => a.position - b.position),
    [columns, currentLeadPipe, pipeline],
  );

  const cardTags = useMemo(() => {
    if (!selectedLead) {
      return [];
    }

    const explicitTags = ((leadDetails?.tags as Array<Record<string, unknown>> | undefined) ?? (selectedLead.tags as Array<Record<string, unknown>> | undefined) ?? [])
      .map((tag) => String(tag.name ?? ""))
      .filter(Boolean);

    if (explicitTags.length > 0) {
      return explicitTags;
    }

    return detectContactTags(selectedLead, leadDetails, sourceMappingRules);
  }, [selectedLead, leadDetails, sourceMappingRules]);

  const timelineItems = useMemo(() => {
    const tracking = leadDetails?.tracking as { timeline?: Array<Record<string, unknown>> } | undefined;
    const timeline = tracking?.timeline ?? [];
    const history = Array.isArray(leadDetails?.history) ? (leadDetails?.history as Array<Record<string, unknown>>) : [];

    if (timeline.length > 0) {
      return timeline.slice(0, 100);
    }

    return history.slice(0, 100).map((item) => ({
      event_type: item.event_type,
      label: item.event_label,
      at: item.occurred_at,
      payload: item.payload,
    }));
  }, [leadDetails]);

  const trackingSummary = (leadDetails?.tracking_summary as Record<string, unknown> | undefined) ?? {};
  const proposalSlug = useMemo(() => {
    const metadata = (leadDetails?.metadata as Record<string, unknown> | undefined) ?? {};
    const value = metadata.proposal_slug;
    return value ? String(value) : "";
  }, [leadDetails]);
  const proposalUrl = proposalSlug ? withMainSiteUrl(`/proposta/${proposalSlug}`) : "";
  const modalContentClass = activeTab === "whatsapp" ? "h-full overflow-hidden p-3" : "h-full overflow-y-auto p-3";
  const onboardingMeta = useMemo(() => {
    const metadata = (leadDetails?.metadata as Record<string, unknown> | undefined) ?? {};
    return (metadata.onboarding as Record<string, unknown> | undefined) ?? null;
  }, [leadDetails]);

  const onboardingAnswers = useMemo(() => {
    if (!onboardingMeta) {
      return {};
    }

    return (onboardingMeta.answers as Record<string, unknown> | undefined) ?? {};
  }, [onboardingMeta]);

  const onboardingProjectType = useMemo(() => String(onboardingMeta?.project_type ?? ""), [onboardingMeta]);

  const onboardingFields = useMemo(() => {
    if (!onboardingProjectType) {
      return [];
    }

    const configured = ONBOARDING_FIELDS_BY_PROJECT[onboardingProjectType] ?? [];
    return configured.filter((field) => {
      const value = onboardingAnswers[field];
      if (value === null || value === undefined || value === "") {
        return false;
      }

      if (Array.isArray(value) && value.length === 0) {
        return false;
      }

      return true;
    });
  }, [onboardingAnswers, onboardingProjectType]);

  const groupedActivity = useMemo(() => {
    const groups: Array<
      | { type: "navigation"; items: Array<Record<string, unknown>>; startAt: string }
      | { type: "event"; item: Record<string, unknown> }
    > = [];

    let buffer: Array<Record<string, unknown>> = [];

    const flushNavigation = () => {
      if (buffer.length === 0) {
        return;
      }

      groups.push({
        type: "navigation",
        items: [...buffer],
        startAt: String(buffer[buffer.length - 1]?.at ?? buffer[0]?.at ?? ""),
      });
      buffer = [];
    };

    timelineItems.forEach((item) => {
      const isNavigation = String(item.type ?? "") === "page_visit";

      if (isNavigation) {
        buffer.push(item);
        return;
      }

      flushNavigation();
      groups.push({ type: "event", item });
    });

    flushNavigation();
    return groups;
  }, [timelineItems]);

  const internalNotesHistory = useMemo(() => {
    const history = Array.isArray(leadDetails?.history) ? (leadDetails.history as Array<Record<string, unknown>>) : [];
    return history.filter((item) => String(item.event_type ?? "") === "internal_note_added");
  }, [leadDetails]);

  const visibleCards = useMemo(
    () =>
      columns
        .flatMap((column) => column.contacts ?? [])
        .sort((a, b) => {
          if ((a.lead_order ?? 0) !== (b.lead_order ?? 0)) {
            return (a.lead_order ?? 0) - (b.lead_order ?? 0);
          }

          return (a.id ?? 0) - (b.id ?? 0);
        }),
    [columns],
  );

  const selectedCardIndex = useMemo(
    () => visibleCards.findIndex((card) => card.id === selectedLead?.id),
    [visibleCards, selectedLead?.id],
  );

  const navigateModalCard = (direction: -1 | 1) => {
    if (!selectedLead || visibleCards.length === 0) {
      return;
    }

    const currentIndex = selectedCardIndex >= 0 ? selectedCardIndex : 0;
    const nextIndex = (currentIndex + direction + visibleCards.length) % visibleCards.length;
    const nextLead = visibleCards[nextIndex];

    if (nextLead) {
      void openLeadDetails(nextLead);
    }
  };

  useEffect(() => {
    if (!selectedLead) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable;

      if (isTyping) {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        navigateModalCard(1);
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        navigateModalCard(-1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedLead, selectedCardIndex, visibleCards]);

  useEffect(() => {
    if (!selectedLead || activeTab !== "whatsapp") {
      return;
    }

    void loadLeadWhatsAppConversation();
  }, [activeTab, selectedLead?.id]);

  useEffect(() => {
    if (!token || activeTab !== "whatsapp" || !whatsappConversation) {
      return;
    }

    let inFlight = false;
    let activeController: AbortController | null = null;

    const timer = window.setInterval(() => {
      if (inFlight) {
        return;
      }

      inFlight = true;
      activeController = new AbortController();
      void apiRequest<{ data: WhatsAppMessageRecord[] }>(
        `/api/admin/whatsapp/conversations/${whatsappConversation.id}/messages?per_page=120`,
        { signal: activeController.signal },
        token,
      )
        .then((response) => {
          setWhatsappMessages((prev) => {
            const map = new Map<number, WhatsAppMessageRecord>();
            prev.forEach((message) => map.set(message.id, message));
            response.data.forEach((message) => map.set(message.id, message));
            return Array.from(map.values()).sort((a, b) => a.id - b.id);
          });
        })
        .catch(() => {
          // polling silencioso
        })
        .finally(() => {
          inFlight = false;
        });
    }, 7000);

    return () => {
      window.clearInterval(timer);
      activeController?.abort();
    };
  }, [token, activeTab, whatsappConversation?.id]);

  useEffect(
    () => () => {
      whatsappConversationAbortRef.current?.abort();
    },
    [],
  );

  return (
    <PageShell>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Visualizando</span>
            <select
              value={pipeline}
              onChange={(event) => {
                void handlePipelineChange(event.target.value);
              }}
              className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
            >
              {pipes.map((pipe) => (
                <option key={pipe.key} value={pipe.key}>
                  {pipe.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 p-5 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-blue-100">Pipe Comercial</p>
            <h2 className="mt-1 text-2xl font-semibold">Gestao de Negocios - {pipeLabel}</h2>
            <p className="mt-1 text-sm text-blue-50">
              Controle o funil com visao de prioridade, tempo em etapa e distribuicao em tempo real.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/20"
            >
              <Settings2 size={16} />
              Configurar Pipe
            </button>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              <Plus size={16} />
              Novo Card
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <BarChart3 size={16} />
            <span className="text-xs uppercase tracking-wide">Cards no pipe</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{allVisibleCards.length}</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600">
            <Flame size={16} />
            <span className="text-xs uppercase tracking-wide text-slate-500">Prioridade alta</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{highPriorityCards}</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600">
            <Timer size={16} />
            <span className="text-xs uppercase tracking-wide text-slate-500">Parados (+7 dias)</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stalledCards}</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600">
            <Rocket size={16} />
            <span className="text-xs uppercase tracking-wide text-slate-500">Score medio</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{averageScore.toFixed(0)}</p>
        </article>
      </section>

      {loading ? (
        <LoadingState label="Carregando kanban..." className="rounded-xl p-4" />
      ) : (
        <section className="overflow-x-auto pb-1">
          <div className="grid min-w-[1240px] grid-flow-col auto-cols-[360px] gap-4">
            {columns.map((column) => (
              <article
                key={column.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverColumnId(column.id);
                  setDragOverIndex(column.contacts.length);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const droppedLeadId = Number(event.dataTransfer.getData("text/plain"));
                  void handleDropToColumn(
                    column,
                    dragOverColumnId === column.id ? (dragOverIndex ?? column.contacts.length) : column.contacts.length,
                    Number.isFinite(droppedLeadId) ? droppedLeadId : undefined,
                  );
                }}
                onDragLeave={(event) => {
                  if (event.currentTarget.contains(event.relatedTarget as Node)) {
                    return;
                  }
                  if (dragOverColumnId === column.id) {
                    setDragOverColumnId(null);
                    setDragOverIndex(null);
                  }
                }}
              >
                <header className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Etapa</p>
                      <h3 className="text-sm font-semibold text-slate-900">{column.name}</h3>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {column.contacts.length}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <span>{column.contacts.length} cards nesta etapa</span>
                    <span>•</span>
                    <span>
                      Media de {column.contacts.length > 0
                        ? Math.round(
                            column.contacts.reduce((sum, lead) => sum + daysInStage(lead.stage_entered_at), 0) /
                              column.contacts.length,
                          )
                        : 0} dias
                    </span>
                  </div>
                </header>

                <div className="max-h-[70vh] space-y-3 overflow-y-auto bg-slate-50/70 p-3">
                  {column.contacts.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-6 text-center text-sm text-slate-500">
                      Nenhum card nesta etapa.
                    </div>
                  )}
                  {dragOverColumnId === column.id && dragOverIndex === 0 && (
                    <div className="rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/70 px-3 py-3 text-center text-xs font-medium text-blue-700">
                      Solte aqui para posicionar no topo
                    </div>
                  )}
                  {column.contacts.map((lead, index) => {
                    const tags = detectContactTags(lead, null, sourceMappingRules);
                    const hasEmail = Boolean(lead.email);
                    const hasPhone = Boolean(lead.phone);
                    const whatsapp = hasPhone ? cleanPhoneForWa(lead.phone ?? "") : "";
                    const proposalApproved =
                      column.slug === "orcamento" && String(lead.metadata?.proposal_status ?? "") === "approved";

                    return (
                      <div key={lead.id}>
                        {dragOverColumnId === column.id && dragOverIndex === index && (
                          <div className="mb-2 rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/70 px-3 py-3 text-center text-xs font-medium text-blue-700">
                            Solte aqui para reposicionar
                          </div>
                        )}
                        <div
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", String(lead.id));
                            setDraggedLead(lead);
                            setDragOverColumnId(column.id);
                            setDragOverIndex(index);
                          }}
                          onDragEnd={() => {
                            setDraggedLead(null);
                            setDragOverColumnId(null);
                            setDragOverIndex(null);
                          }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setDragOverColumnId(column.id);
                            setDragOverIndex(index);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            const droppedLeadId = Number(event.dataTransfer.getData("text/plain"));
                            void handleDropToColumn(column, index, Number.isFinite(droppedLeadId) ? droppedLeadId : undefined);
                          }}
                          onClick={() => {
                            void openLeadDetails(lead);
                          }}
                          className={`relative cursor-pointer rounded-xl border p-3 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md ${
                            proposalApproved ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"
                          }`}
                        >
                          <span
                            className={`absolute -right-3 -top-3 inline-flex h-8 min-w-8 items-center justify-center rounded-full px-1 text-[11px] font-semibold ${scoreStyles(lead.score_band)}`}
                            title={`Score ${lead.lead_score ?? 0}`}
                          >
                            {lead.lead_score ?? 0}
                          </span>

                          <div className="pr-8">
                            <h4 className="text-sm font-semibold text-slate-900">
                              {lead.name}
                              {lead.company ? ` - ${lead.company}` : ""}
                            </h4>

                            <div className="mt-1 text-xs text-slate-600">
                              {hasEmail && <span>{lead.email}</span>}
                              {hasEmail && hasPhone && <span className="px-1">|</span>}
                              {hasPhone && (
                                <a
                                  href={`https://wa.me/55${whatsapp}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-medium text-green-700 hover:underline"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {lead.phone}
                                </a>
                              )}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {tags.map((tag) => (
                                <span
                                  key={`${lead.id}-${tag}`}
                                  className="rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>

                            <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
                              <Clock3 size={12} />
                              <span>{formatDate(lead.stage_entered_at)}</span>
                              <span>•</span>
                              <span>{daysInStage(lead.stage_entered_at)} dias</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {dragOverColumnId === column.id && dragOverIndex === column.contacts.length && column.contacts.length > 0 && (
                    <div className="rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/70 px-3 py-3 text-center text-xs font-medium text-blue-700">
                      Solte aqui para posicionar no final
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {isAddOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4">
          <form onSubmit={submitLead} className="w-full max-w-lg rounded-xl bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Adicionar negocio manual</h3>
              <button type="button" onClick={() => setIsAddOpen(false)}>
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                ["name", "Nome", "text"],
                ["company", "Empresa", "text"],
                ["email", "Email", "email"],
                ["phone", "WhatsApp", "text"],
                ["source", "Origem", "text"],
                ["deal_value", "Valor", "number"],
              ].map(([key, label, type]) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
                  <input
                    type={type}
                    value={leadForm[key as keyof typeof leadForm]}
                    onChange={(event) =>
                      setLeadForm((prev) => ({ ...prev, [key]: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700">
              Regra: o lead precisa ter ao menos e-mail ou WhatsApp.
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                Cancelar
              </button>
              <button type="submit" className="rounded-lg bg-blue-700 px-3 py-2 text-sm text-white">
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[85] bg-slate-900/30">
          <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Configurar etapas do pipe {pipeLabel}</h3>
              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen(false);
                  setPendingColumnRemovalIndex(null);
                }}
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            <div className="space-y-2">
              {settingsColumns.map((column, index) => (
                <div key={column.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="grid grid-cols-12 items-center gap-2">
                    <button
                      type="button"
                      className="col-span-1 text-slate-400"
                      onClick={() => moveSettingsColumn(index, -1)}
                      title="Subir"
                    >
                      <GripVertical size={16} />
                    </button>
                    <input
                      value={column.name}
                      disabled={column.is_locked}
                      onChange={(event) =>
                        setSettingsColumns((prev) =>
                          prev.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)),
                        )
                      }
                      className="col-span-7 rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
                    />
                    <input
                      value={column.color}
                      disabled={column.is_locked}
                      onChange={(event) =>
                        setSettingsColumns((prev) =>
                          prev.map((item, i) => (i === index ? { ...item, color: event.target.value } : item)),
                        )
                      }
                      className="col-span-3 rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
                    />
                    <button
                      type="button"
                      disabled={column.is_locked}
                      onClick={() => setPendingColumnRemovalIndex(index)}
                      className="col-span-1 text-xs text-red-600 disabled:text-slate-300"
                    >
                      X
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setSettingsColumns((prev) => [
                  ...prev,
                  { id: `new-${Date.now()}`, name: "Nova Etapa", color: "#5b6ef1", is_locked: false },
                ])
              }
              className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              + Adicionar etapa
            </button>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen(false);
                  setPendingColumnRemovalIndex(null);
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  void savePipeSettings();
                }}
                className="rounded-lg bg-blue-700 px-3 py-2 text-sm text-white"
              >
                Salvar
              </button>
            </div>
          </aside>
        </div>
      )}

      {pendingLostMove && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4">
            <h3 className="text-base font-semibold text-slate-900">Motivo de perda</h3>
            <p className="mt-1 text-sm text-slate-500">Selecione ou cadastre um motivo para enviar ao FollowUp.</p>

            <select
              value={lostReasonValue}
              onChange={(event) => setLostReasonValue(event.target.value)}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Selecione...</option>
              {lostReasons.map((reason) => (
                <option key={reason.id} value={reason.name}>
                  {reason.name}
                </option>
              ))}
              <option value="__custom__">Cadastrar novo motivo</option>
            </select>

            {lostReasonValue === "__custom__" && (
              <input
                value={lostReasonCustom}
                onChange={(event) => setLostReasonCustom(event.target.value)}
                placeholder="Digite o novo motivo"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingLostMove(null);
                  setLostReasonValue("");
                  setLostReasonCustom("");
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  void saveLostReasonAndReject();
                }}
                className="rounded-lg bg-blue-700 px-3 py-2 text-sm text-white"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {onboardingPrompt && (
        <div
          className="fixed inset-0 z-[92] flex items-center justify-center bg-slate-900/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOnboardingPrompt(null);
            }
          }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Card movido para Onboarding</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Compartilhe este link com {onboardingPrompt.leadName} para preencher o briefing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOnboardingPrompt(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <X size={15} />
              </button>
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="break-all font-mono text-xs text-slate-700">{onboardingPrompt.url}</p>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(onboardingPrompt.url);
                    setCopiedOnboardingUrl(true);
                  } catch {
                    setCopiedOnboardingUrl(false);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Copy size={15} />
                {copiedOnboardingUrl ? "URL copiada" : "Copiar URL"}
              </button>
              <a
                href={onboardingPrompt.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600"
              >
                <ExternalLink size={15} />
                Abrir onboarding
              </a>
            </div>
          </div>
        </div>
      )}

      {selectedLead && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedLead(null);
              setLeadDetails(null);
            }
          }}
        >
          <div
            className="flex h-[88vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="border-b border-blue-900/40 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 px-4 py-3 text-white">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/12 text-base font-semibold text-white">
                    {(leadEditForm.name || selectedLead.name || "L")
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xl font-semibold leading-none">
                      {editingField === "name" ? (
                        <input
                          autoFocus
                          value={leadEditForm.name}
                          onBlur={() => setEditingField(null)}
                          onChange={(event) => setLeadEditForm((prev) => ({ ...prev, name: event.target.value }))}
                          className="w-full rounded-md border border-white/30 bg-white/20 px-2 py-1 text-base text-white"
                        />
                      ) : (
                        <button type="button" onClick={() => setEditingField("name")} className="truncate text-left hover:text-blue-100">
                          {leadEditForm.name || selectedLead.name}
                        </button>
                      )}
                    </div>
                    <div className="mt-1 truncate text-xs uppercase tracking-wide text-blue-100">
                      {editingField === "company" ? (
                        <input
                          autoFocus
                          value={leadEditForm.company}
                          onBlur={() => setEditingField(null)}
                          onChange={(event) => setLeadEditForm((prev) => ({ ...prev, company: event.target.value }))}
                          className="w-full rounded-md border border-white/30 bg-white/20 px-2 py-1 text-xs uppercase tracking-wide text-white"
                        />
                      ) : (
                        <button type="button" onClick={() => setEditingField("company")} className="truncate text-left hover:text-blue-50">
                          {leadEditForm.company || "SEM EMPRESA"}
                        </button>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-blue-100">
                      <Mail size={12} />
                      {editingField === "email" ? (
                        <input
                          autoFocus
                          value={leadEditForm.email}
                          onBlur={() => setEditingField(null)}
                          onChange={(event) => setLeadEditForm((prev) => ({ ...prev, email: event.target.value }))}
                          className="rounded-md border border-white/30 bg-white/20 px-2 py-1 text-xs text-white"
                        />
                      ) : (
                        <button type="button" onClick={() => setEditingField("email")} className="hover:text-white">
                          {leadEditForm.email || "Sem e-mail"}
                        </button>
                      )}
                      {leadEditForm.email && leadEditForm.phone ? <span className="opacity-70">|</span> : null}
                      <MessageCircle size={12} />
                      {editingField === "phone" ? (
                        <input
                          autoFocus
                          value={leadEditForm.phone}
                          onBlur={() => setEditingField(null)}
                          onChange={(event) => setLeadEditForm((prev) => ({ ...prev, phone: event.target.value }))}
                          className="rounded-md border border-white/30 bg-white/20 px-2 py-1 text-xs text-white"
                        />
                      ) : (
                        <button type="button" onClick={() => setEditingField("phone")} className="hover:text-white">
                          {leadEditForm.phone || "Sem WhatsApp"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-white">
                  <span className="rounded-md border border-white/30 bg-white/15 px-2 py-1">
                    {selectedCardIndex >= 0 ? selectedCardIndex + 1 : 1}/{Math.max(1, visibleCards.length)}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigateModalCard(-1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/30 bg-white/20 hover:bg-white/30"
                    title="Card anterior"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateModalCard(1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/30 bg-white/20 hover:bg-white/30"
                    title="Proximo card"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLead(null);
                      setLeadDetails(null);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/30 bg-white/20 hover:bg-white/30"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-2 border-t border-white/15 pt-2 md:grid-cols-[1fr_auto] md:items-start">
                <div className="flex flex-wrap items-center gap-2 text-xs text-blue-100">
                  <span className="rounded-md border border-white/25 bg-white/10 px-2 py-1">
                    Entrada: {formatDate(String(leadDetails?.created_at ?? selectedLead.created_at ?? ""))}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-white/25 bg-white/10 px-2 py-1">
                    <Clock3 size={12} />
                    {timeSince(String(leadDetails?.created_at ?? selectedLead.created_at ?? ""))}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-start gap-2 text-xs text-blue-100 md:justify-end">
                  <div className="inline-flex items-center gap-1 rounded-md border border-white/25 bg-white/10 px-2 py-1">
                    <span className="text-[11px] uppercase tracking-wide text-blue-100">Responsavel</span>
                    <select
                      value={assignedUserId}
                      onChange={(event) => setAssignedUserId(event.target.value)}
                      className="rounded bg-transparent px-1 py-0.5 text-xs text-white outline-none"
                    >
                      <option value="" className="text-slate-900">Sem responsavel</option>
                      {userOptions.map((option) => (
                        <option key={`header-a-${option.id}`} value={option.id} className="text-slate-900">
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-md border border-white/25 bg-white/10 px-2 py-1">
                    <Tag size={12} />
                    <input
                      value={tagDraft}
                      onChange={(event) => setTagDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void addLeadTag();
                        }
                      }}
                      list="lead-modal-tag-options"
                      placeholder="Tag"
                      className="w-24 bg-transparent text-xs text-white placeholder:text-blue-200 outline-none"
                    />
                    <datalist id="lead-modal-tag-options">
                      {tagCatalog.map((tag) => (
                        <option key={`tag-opt-${tag.id}`} value={tag.name} />
                      ))}
                    </datalist>
                    <input
                      type="color"
                      value={tagColorDraft}
                      onChange={(event) => setTagColorDraft(event.target.value)}
                      className="h-5 w-5 rounded border border-white/30 bg-transparent p-0"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void addLeadTag();
                      }}
                      disabled={savingTag}
                      className="rounded border border-white/30 px-1.5 py-0.5 text-[10px] text-white hover:bg-white/15 disabled:opacity-60"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 md:justify-end">
                    {cardTags.map((tag) => {
                      const matched = tagCatalog.find((item) => item.name === tag);
                      return (
                        <button
                          key={`header-tag-${tag}`}
                          type="button"
                          onClick={() => {
                            if (matched) {
                              void removeLeadTag(matched.id);
                            }
                          }}
                          className="rounded-md border border-white/25 bg-white/10 px-2 py-0.5 text-[10px] text-white hover:bg-white/15"
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-2 flex justify-end">
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-blue-100">Valor do negocio</p>
                  <p className="text-3xl font-semibold leading-none text-white">
                    {formatMoney(leadDetails?.deal_value ?? selectedLead.deal_value)}
                  </p>
                </div>
              </div>

              <div
                className="mt-3 grid items-center gap-1 rounded-lg bg-white/10 p-1"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(modalStageColumns.length, 1)}, minmax(0, 1fr))`,
                }}
              >
                {modalStageColumns.map((stage) => {
                  const isActive = stage.slug === currentLeadStageSlug;
                  return (
                    <button
                      key={`stage-tab-${stage.id}`}
                      type="button"
                      onClick={() => {
                        if (isActive || savingMove) {
                          return;
                        }
                        void performMove(selectedLead, stage);
                        setSelectedLead((prev) =>
                          prev
                            ? {
                                ...prev,
                                status: stage.slug,
                                pipeline: stage.pipeline ?? prev.pipeline,
                              }
                            : prev,
                        );
                      }}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                        isActive
                          ? "bg-white text-blue-900"
                          : "text-blue-100 hover:bg-white/20"
                      }`}
                    >
                      {stage.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 p-4 lg:grid-cols-[200px_1fr]">
              <aside className="flex min-h-0 flex-row gap-2 border-b border-slate-200 bg-slate-50 p-3 lg:flex-col lg:border-b-0 lg:border-r lg:border-slate-200">
                {LEAD_MODAL_TABS.map((tab) => {
                  const Icon = tab.icon;

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex min-w-[170px] items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition lg:min-w-0 lg:justify-start ${
                        activeTab === tab.key
                          ? "bg-blue-700 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Icon size={16} />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </aside>

              <section className="min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className={modalContentClass}>
                  {detailsLoading && <p className="text-sm text-slate-500">Carregando perfil...</p>}

                  {!detailsLoading && activeTab === "movimentacao" && (
                    <div className="space-y-2">
                      {groupedActivity.length === 0 && <p className="text-sm text-slate-500">Sem atividades registradas.</p>}
                      {groupedActivity.map((group, index) => {
                        if (group.type === "navigation") {
                          return (
                            <div key={`nav-${index}`} className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                              <p className="text-sm font-semibold text-blue-800">
                                Navegacao {formatDate(group.startAt)}
                              </p>
                              <ul className="mt-2 space-y-1 text-sm text-blue-900">
                                {group.items.map((item, itemIndex) => (
                                  <li key={`nav-item-${index}-${itemIndex}`}>/{String(item.label ?? "").replace(/^\//, "")}</li>
                                ))}
                              </ul>
                            </div>
                          );
                        }

                        return (
                          <div key={`evt-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                            <p className="text-sm font-medium text-slate-900">{String(group.item.label ?? group.item.event_type ?? "Evento")}</p>
                            <p className="mt-1 text-xs text-slate-500">{formatDate(String(group.item.at ?? ""))}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!detailsLoading && activeTab === "orcamentos" && (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <p className="text-sm font-semibold text-slate-900">Orcamento atual</p>
                        <p className="text-sm text-slate-600">Valor: {formatMoney(leadDetails?.deal_value ?? selectedLead.deal_value)}</p>
                        <p className="text-xs text-slate-500">Acessos em proposta: {String(trackingSummary.proposal_accesses ?? 0)}</p>
                        {proposalUrl ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <a
                              href={proposalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-medium text-white hover:bg-blue-600"
                            >
                              <ExternalLink size={14} />
                              Abrir proposta
                            </a>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(proposalUrl);
                                  setCopiedProposalUrl(true);
                                } catch {
                                  setCopiedProposalUrl(false);
                                }
                              }}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100"
                            >
                              <Copy size={14} />
                              {copiedProposalUrl ? "Link copiado" : "Copiar link"}
                            </button>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-slate-500">Proposta ainda nao gerada para este lead.</p>
                        )}
                      </div>
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <p className="text-sm font-semibold text-slate-900">Historico de orcamentos</p>
                        <p className="text-sm text-slate-500">Estrutura pronta para listar versoes, valores e status.</p>
                        <button
                          type="button"
                          className="mt-3 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700"
                        >
                          Fazer outro orcamento
                        </button>
                      </div>
                    </div>
                  )}

                  {!detailsLoading && activeTab === "onboarding" && (
                    <div className="space-y-3">
                      {!onboardingMeta && (
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-500">
                          Este lead ainda nao possui dados de onboarding preenchidos.
                        </div>
                      )}

                      {onboardingMeta && (
                        <>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                              <p className="text-xs font-medium text-slate-500">Tipo de projeto</p>
                              <p className="text-sm font-semibold text-slate-900">
                                {ONBOARDING_PROJECT_LABELS[onboardingProjectType] ?? onboardingProjectType ?? "-"}
                              </p>
                            </div>
                            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                              <p className="text-xs font-medium text-slate-500">Segmento</p>
                              <p className="text-sm text-slate-800">
                                {String(onboardingMeta.segment ?? "-")}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-lg border border-slate-100 bg-white p-3">
                            <p className="text-sm font-semibold text-slate-900">Dados do briefing</p>
                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                              {onboardingFields.length === 0 && (
                                <p className="text-sm text-slate-500">Nenhuma resposta registrada neste onboarding.</p>
                              )}

                              {onboardingFields.map((field) => (
                                <div key={field} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                  <p className="text-xs font-medium text-slate-500">
                                    {ONBOARDING_FIELD_LABELS[field] ?? field}
                                  </p>
                                  <p className="mt-1 text-sm text-slate-800 break-words">
                                    {formatOnboardingAnswer(field, onboardingAnswers[field])}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-lg border border-slate-100 bg-white p-3">
                            <p className="text-sm font-semibold text-slate-900">Contato informado</p>
                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                <p className="text-xs font-medium text-slate-500">Nome</p>
                                <p className="text-sm text-slate-800">{leadEditForm.name || "-"}</p>
                              </div>
                              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                <p className="text-xs font-medium text-slate-500">Empresa ou marca</p>
                                <p className="text-sm text-slate-800">{leadEditForm.company || "-"}</p>
                              </div>
                              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                <p className="text-xs font-medium text-slate-500">E-mail</p>
                                <p className="text-sm text-slate-800 break-all">{leadEditForm.email || "-"}</p>
                              </div>
                              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                <p className="text-xs font-medium text-slate-500">WhatsApp</p>
                                <p className="text-sm text-slate-800">{leadEditForm.phone || "-"}</p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {!detailsLoading && activeTab === "notas" && (
                    <div className="space-y-3">
                      <textarea
                        value={newNoteDraft}
                        onChange={(event) => setNewNoteDraft(event.target.value)}
                        rows={5}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Adicionar anotacao interna..."
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            void addInternalNote();
                          }}
                          disabled={savingNote}
                          className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60"
                        >
                          {savingNote ? "Salvando..." : "Adicionar anotacao"}
                        </button>
                      </div>

                      <div className="space-y-2">
                        {internalNotesHistory.length === 0 && (
                          <p className="text-sm text-slate-500">Nenhuma anotacao registrada.</p>
                        )}
                        {internalNotesHistory.map((item, index) => {
                          const actor = item.actor_user as Record<string, unknown> | undefined;
                          const payload = item.payload as Record<string, unknown> | undefined;

                          return (
                            <div key={`note-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                              <p className="text-sm text-slate-800">{String(payload?.note ?? item.label ?? "-")}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {String(actor?.name ?? "Sistema")} • {formatDate(String(item.occurred_at ?? ""))}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!detailsLoading && activeTab === "whatsapp" && (
                    <div className="h-full min-h-0">
                      {!leadEditForm.phone && !selectedLead.phone ? (
                        <div className="flex h-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-center">
                          <p className="text-sm font-medium text-slate-700">Sem WhatsApp valido neste lead.</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Adicione um numero no perfil para liberar a conversa.
                          </p>
                        </div>
                      ) : whatsappConversation ? (
                        <WhatsAppConversationView
                          conversation={whatsappConversation}
                          messages={whatsappMessages}
                          loading={whatsappLoading}
                          disabled={whatsappSending}
                          onSendText={sendLeadWhatsAppText}
                          onSendImage={sendLeadWhatsAppImage}
                          onSendDocument={sendLeadWhatsAppDocument}
                          onSendAudio={sendLeadWhatsAppAudio}
                          quickReplies={whatsappQuickReplies}
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-center">
                          <p className="text-sm font-medium text-slate-700">Nenhuma conversa encontrada para este numero.</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Voce pode iniciar uma conversa agora e seguir o atendimento pelo CRM.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              void startLeadWhatsAppConversation();
                            }}
                            disabled={whatsappLoading}
                            className="mt-3 rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60"
                          >
                            {whatsappLoading ? "Iniciando..." : "Iniciar conversa"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </section>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isSavingLeadInfo}
                  onClick={() => {
                    void saveLeadDetails();
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  <Save size={15} />
                  Salvar alteracoes
                </button>

                {canApproveOrReject && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedLead) {
                          return;
                        }

                        setPendingLostMove({
                          leadId: selectedLead.id,
                          mode: "reject",
                        });
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                    >
                      <XCircle size={16} />
                      Perder
                    </button>
                    <button
                      type="button"
                      disabled={savingMove || !selectedLead}
                      onClick={() => {
                        if (!selectedLead) {
                          return;
                        }

                        void performTransition(selectedLead.id, "approve");
                      }}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                    >
                      <CheckCircle2 size={16} />
                      Ganhar
                    </button>
                  </>
                )}

                {canProjectDelivered && (
                  <button
                    type="button"
                    disabled={savingMove || !selectedLead}
                    onClick={() => {
                      if (!selectedLead) {
                        return;
                      }

                      void performTransition(selectedLead.id, "project_delivered");
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60"
                  >
                    <Rocket size={16} />
                    Projeto Entregue
                  </button>
                )}

                {canProjectFinalize && (
                  <button
                    type="button"
                    disabled={savingMove || !selectedLead}
                    onClick={() => {
                      if (!selectedLead) {
                        return;
                      }

                      void performTransition(selectedLead.id, "project_finalized");
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-60"
                  >
                    <CheckCircle2 size={16} />
                    Projeto Finalizado
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        open={pendingColumnRemovalIndex !== null}
        title="Remover etapa do pipe"
        description="Ao confirmar, essa etapa sera removida da configuracao atual. Essa acao pode impactar o fluxo dos cards."
        confirmLabel="Remover etapa"
        cancelLabel="Cancelar"
        intent="danger"
        onConfirm={async () => {
          if (pendingColumnRemovalIndex === null) {
            return;
          }

          removeSettingsColumn(pendingColumnRemovalIndex);
          setPendingColumnRemovalIndex(null);
        }}
        onClose={() => setPendingColumnRemovalIndex(null)}
      />
    </PageShell>
  );
}
