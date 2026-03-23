import { FormEvent, useEffect, useMemo, useState } from "react";
import {
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
  Activity,
  HandCoins,
  FolderKanban,
  NotebookPen,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import type {
  KanbanColumn,
  KanbanLead,
  KanbanResponse,
  LostReasonOption,
  PipeOption,
} from "../../types/admin";

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

type LeadModalTab = "movimentacao" | "orcamentos" | "onboarding" | "notas";
type EditableLeadField = "name" | "company" | "email" | "phone" | "responsavel" | null;

const LEAD_MODAL_TABS: Array<{ key: LeadModalTab; label: string; icon: typeof Activity }> = [
  { key: "movimentacao", label: "Movimentacao", icon: Activity },
  { key: "orcamentos", label: "Orcamentos", icon: HandCoins },
  { key: "onboarding", label: "Dados / Onboarding", icon: FolderKanban },
  { key: "notas", label: "Notas internas", icon: NotebookPen },
];

const PIPE_LABELS: Record<string, string> = {
  comercial: "Comercial",
  desenvolvimento: "Desenvolvimento",
  followup: "FollowUp",
  cs: "CS",
};

const CONTACT_TAG_LABELS: Record<string, string> = {
  whatsapp_click: "Botao WhatsApp",
  contact_form_submit: "Formulario de contato",
  onboarding_form_submit: "Formulario onboarding",
  cta_click: "Botao CTA",
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

function detectContactTags(lead: KanbanLead, details?: Record<string, unknown> | null): string[] {
  const tags = new Set<string>();

  const source = `${lead.source_url ?? ""} ${(lead.metadata?.source ?? "") as string}`.toLowerCase();

  if (source.includes("whatsapp") || source.includes("zap") || source.includes("wa.me")) {
    tags.add("Botao WhatsApp");
  }

  if (source.includes("contato") || source.includes("contact")) {
    tags.add("Formulario de contato");
  }

  if (source.includes("onboarding")) {
    tags.add("Formulario onboarding");
  }

  const timeline = (details?.tracking as { timeline?: Array<Record<string, unknown>> } | undefined)?.timeline ?? [];
  timeline.slice(0, 40).forEach((item) => {
    const eventType = String(item.event_type ?? "");
    const label = CONTACT_TAG_LABELS[eventType];
    if (label) {
      tags.add(label);
    }
  });

  if (tags.size === 0) {
    tags.add("Site institucional");
  }

  return Array.from(tags).slice(0, 4);
}

function buildOnboardingUrl(baseUrl: string, lead: KanbanLead): string {
  const normalized = baseUrl.replace(/\/$/, "");
  const url = new URL("/onboarding", normalized);

  url.searchParams.set("lead_id", String(lead.id));

  if (lead.email) {
    url.searchParams.set("email", lead.email);
  }

  if (lead.phone) {
    url.searchParams.set("phone", lead.phone);
  }

  if (lead.name) {
    url.searchParams.set("name", lead.name);
  }

  if (lead.company) {
    url.searchParams.set("company", lead.company);
  }

  return url.toString();
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

  const [pendingLostMove, setPendingLostMove] = useState<{
    leadId: number;
    mode: "reject";
  } | null>(null);
  const [lostReasonValue, setLostReasonValue] = useState("");
  const [lostReasonCustom, setLostReasonCustom] = useState("");

  const [draggedLead, setDraggedLead] = useState<KanbanLead | null>(null);
  const [onboardingPrompt, setOnboardingPrompt] = useState<{ url: string; leadName: string } | null>(null);
  const [copiedOnboardingUrl, setCopiedOnboardingUrl] = useState(false);
  const [selectedLead, setSelectedLead] = useState<KanbanLead | null>(null);
  const [leadDetails, setLeadDetails] = useState<Record<string, unknown> | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<LeadModalTab>("movimentacao");
  const [editingField, setEditingField] = useState<EditableLeadField>(null);
  const [internalNotesDraft, setInternalNotesDraft] = useState("");
  const [newNoteDraft, setNewNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [isSavingLeadInfo, setIsSavingLeadInfo] = useState(false);
  const [leadEditForm, setLeadEditForm] = useState({ name: "", email: "", phone: "", company: "" });
  const [assignedUserId, setAssignedUserId] = useState<string>("");

  const userOptions = useMemo(
    () => extractUserOptions(leadDetails, user?.name, user?.id),
    [leadDetails, user?.id, user?.name],
  );

  const loadBase = async () => {
    if (!token) {
      return;
    }

    const [pipesResp, reasonsResp] = await Promise.all([
      apiRequest<{ data: PipeOption[] }>("/api/admin/pipes", {}, token),
      apiRequest<{ data: LostReasonOption[] }>("/api/admin/kanban/lost-reasons", {}, token),
    ]);

    setPipes(pipesResp.data);
    setLostReasons(reasonsResp.data);
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

    if (pipeParam !== pipeline) {
      setPipeline(pipeParam);
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

  const mainSiteBaseUrl = import.meta.env.VITE_MAIN_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  const performMove = async (lead: KanbanLead, targetColumn: KanbanColumn) => {
    if (!token) {
      return;
    }

    setSavingMove(true);
    try {
      await apiRequest(
        `/api/admin/kanban/contacts/${lead.id}/move`,
        {
          method: "PATCH",
          body: JSON.stringify({
            lead_kanban_column_id: targetColumn.id,
            lead_order: 9999,
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
          url: buildOnboardingUrl(mainSiteBaseUrl, lead),
          leadName: lead.name,
        });
      }
    } catch (requestError) {
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
    setActiveTab("movimentacao");
    setEditingField(null);

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

  const handleDropToColumn = async (targetColumn: KanbanColumn) => {
    if (!draggedLead || savingMove) {
      return;
    }

    await performMove(draggedLead, targetColumn);
    setDraggedLead(null);
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
      await loadBoard(pipeline);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Falha ao salvar configuracoes.");
    } finally {
      setSavingMove(false);
    }
  };

  const currentLeadStageSlug = String(selectedLead?.status ?? "");
  const currentLeadPipe = String(selectedLead?.pipeline ?? pipeline);

  const canApproveOrReject = currentLeadPipe === "comercial";
  const canProjectDelivered = currentLeadPipe === "desenvolvimento" && currentLeadStageSlug === "entrega";
  const canProjectFinalize = currentLeadPipe === "cs" && currentLeadStageSlug !== "projeto-finalizado";

  const pipeLabel = useMemo(() => PIPE_LABELS[pipeline] ?? "Comercial", [pipeline]);

  const cardTags = useMemo(
    () => (selectedLead ? detectContactTags(selectedLead, leadDetails) : []),
    [selectedLead, leadDetails],
  );

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

  return (
    <PageShell>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <section className="rounded-xl border border-slate-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <select
              value={pipeline}
              onChange={(event) => {
                void handlePipelineChange(event.target.value);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
            >
              {pipes.map((pipe) => (
                <option key={pipe.key} value={pipe.key}>
                  {pipe.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Settings2 size={16} />
              Configurar Pipe
            </button>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600"
            >
              <Plus size={16} />
              Adicionar
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Carregando kanban...</div>
      ) : (
        <section className="overflow-x-auto">
          <div className="grid min-w-[1200px] grid-flow-col auto-cols-[340px] gap-3">
            {columns.map((column) => (
              <article
                key={column.id}
                className="rounded-xl border border-slate-200 bg-white"
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  void handleDropToColumn(column);
                }}
              >
                <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{column.name}</h3>
                    <p className="text-xs text-slate-500">{column.contacts.length} cards</p>
                  </div>
                </header>

                <div className="max-h-[70vh] space-y-3 overflow-y-auto p-3">
                  {column.contacts.map((lead) => {
                    const tags = detectContactTags(lead, null);
                    const hasEmail = Boolean(lead.email);
                    const hasPhone = Boolean(lead.phone);
                    const whatsapp = hasPhone ? cleanPhoneForWa(lead.phone ?? "") : "";

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => setDraggedLead(lead)}
                        onClick={() => {
                          void openLeadDetails(lead);
                        }}
                        className="relative cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
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
                    );
                  })}
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
              <button type="button" onClick={() => setIsSettingsOpen(false)}>
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
                      onClick={() => removeSettingsColumn(index)}
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
                onClick={() => setIsSettingsOpen(false)}
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
            <div className="flex items-center justify-end bg-gradient-to-r from-blue-900 via-blue-700 to-blue-400 px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-white">
                <span className="rounded-md border border-white/30 bg-white/15 px-2 py-1">
                  Entrada: {formatDate(String(leadDetails?.created_at ?? selectedLead.created_at ?? ""))}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-white/30 bg-white/15 px-2 py-1">
                  <Clock3 size={12} />
                  {timeSince(String(leadDetails?.created_at ?? selectedLead.created_at ?? ""))}
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
                <span className="rounded-md border border-white/30 bg-white/15 px-2 py-1">
                  {selectedCardIndex >= 0 ? selectedCardIndex + 1 : 1}/{Math.max(1, visibleCards.length)}
                </span>
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

            <div className="grid gap-3 border-b border-slate-200 px-4 py-3 md:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-lg font-semibold text-slate-900">
                  {editingField === "name" ? (
                    <input
                      autoFocus
                      value={leadEditForm.name}
                      onBlur={() => setEditingField(null)}
                      onChange={(event) => setLeadEditForm((prev) => ({ ...prev, name: event.target.value }))}
                      className="rounded-md border border-slate-300 px-2 py-1 text-base"
                    />
                  ) : (
                    <button type="button" onClick={() => setEditingField("name")} className="hover:text-blue-700">
                      {leadEditForm.name || selectedLead.name}
                    </button>
                  )}

                  <span>|</span>

                  {editingField === "company" ? (
                    <input
                      autoFocus
                      value={leadEditForm.company}
                      onBlur={() => setEditingField(null)}
                      onChange={(event) => setLeadEditForm((prev) => ({ ...prev, company: event.target.value }))}
                      className="rounded-md border border-slate-300 px-2 py-1 text-base"
                    />
                  ) : (
                    <button type="button" onClick={() => setEditingField("company")} className="hover:text-blue-700">
                      {leadEditForm.company || "Sem empresa"}
                    </button>
                  )}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <Mail size={14} />
                  {editingField === "email" ? (
                    <input
                      autoFocus
                      value={leadEditForm.email}
                      onBlur={() => setEditingField(null)}
                      onChange={(event) => setLeadEditForm((prev) => ({ ...prev, email: event.target.value }))}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                  ) : (
                    <button type="button" onClick={() => setEditingField("email")} className="hover:text-blue-700">
                      {leadEditForm.email || "Sem e-mail"}
                    </button>
                  )}

                  <span>|</span>
                  <MessageCircle size={14} className="text-green-700" />
                  {editingField === "phone" ? (
                    <input
                      autoFocus
                      value={leadEditForm.phone}
                      onBlur={() => setEditingField(null)}
                      onChange={(event) => setLeadEditForm((prev) => ({ ...prev, phone: event.target.value }))}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingField("phone")}
                      className="font-medium text-green-700 hover:underline"
                    >
                      {leadEditForm.phone || "Sem WhatsApp"}
                    </button>
                  )}
                  {!!leadEditForm.phone && (
                    <a
                      href={`https://wa.me/55${cleanPhoneForWa(leadEditForm.phone)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-green-200 px-2 py-0.5 text-xs text-green-700 hover:bg-green-50"
                    >
                      abrir
                    </a>
                  )}
                </div>
              </div>

              <div className="min-w-[280px]">
                <label className="mb-1 block text-xs font-medium text-slate-600">Responsavel</label>
                {editingField === "responsavel" ? (
                  <select
                    autoFocus
                    value={assignedUserId}
                    onBlur={() => setEditingField(null)}
                    onChange={(event) => setAssignedUserId(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  >
                    <option value="">Sem responsavel</option>
                    {userOptions.map((option) => (
                      <option key={`a-${option.id}`} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingField("responsavel")}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {userOptions.find((option) => String(option.id) === assignedUserId)?.name ?? "Sem responsavel"}
                  </button>
                )}

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {cardTags.map((tag) => (
                    <span key={`modal-tag-${tag}`} className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[240px_1fr]">
              <aside className="flex min-h-0 flex-row gap-2 overflow-x-auto rounded-2xl border border-blue-800 bg-gradient-to-b from-blue-900 via-blue-800 to-blue-700 p-3 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
                {LEAD_MODAL_TABS.map((tab) => {
                  const Icon = tab.icon;

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex min-w-[190px] items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition lg:min-w-0 lg:justify-start ${
                        activeTab === tab.key
                          ? "bg-white/20 text-white shadow-md"
                          : "border border-white/20 bg-white/10 text-blue-50 hover:bg-white/20"
                      }`}
                    >
                      <Icon size={16} />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </aside>

              <section className="min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="h-full overflow-y-auto p-3">
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
                      Reprovar
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
                      Aprovar
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
    </PageShell>
  );
}
