import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, ExternalLink, FileText, Mail, Phone, UserCircle2, Sparkles, ShieldCheck, AlertTriangle, Search, SlidersHorizontal, Plus, ClipboardList, LayoutList, Globe, Cpu, Workflow, CalendarClock, MessageSquareText } from "lucide-react";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import type { BudgetRecord, BudgetsResponse } from "../../types/admin";
import { Modal } from "../../components/ui/modal";
import LoadingState from "../../components/common/LoadingState";

function money(value: string | number): string {
  return `R$ ${Number(value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "Rascunho",
    sent: "Publicado",
    request: "Solicitacao",
    pending_validation: "Pendente validacao",
    approved: "Aprovado",
    adjustment_requested: "Ajuste solicitado",
  };

  return map[status] ?? status;
}

function statusPillClass(status: string): string {
  if (status === "approved") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "pending_validation") {
    return "bg-orange-100 text-orange-800";
  }

  if (status === "request") {
    return "bg-amber-100 text-amber-800";
  }

  if (status === "adjustment_requested") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-blue-50 text-blue-700";
}

const SELLER_PROJECT_TYPES = [
  { value: "site", title: "Site", description: "Proposta com calculo automatico pelo briefing.", icon: Globe },
  { value: "sistema", title: "Sistema", description: "Projeto sob escopo funcional e valor definido pelo vendedor.", icon: Cpu },
  { value: "automacao", title: "Automacao", description: "Fluxos automatizados com escopo e valor comercial.", icon: Workflow },
] as const;

const SELLER_SITE_OBJECTIVES = [
  { value: "apresentar", title: "Apresentar empresa" },
  { value: "leads", title: "Gerar leads" },
  { value: "vender", title: "Vender online" },
  { value: "portfolio", title: "Mostrar portfolio" },
  { value: "agendamento", title: "Receber agendamentos" },
] as const;

const SELLER_SITE_PAGES = ["Home", "Sobre", "Servicos", "Portfolio", "Depoimentos", "Blog", "FAQ", "Contato"] as const;

const SELLER_SITE_DEADLINES = [
  { value: "urgente", title: "Urgente" },
  { value: "mes", title: "Ainda este mes" },
  { value: "30-60", title: "Entre 30 e 60 dias" },
  { value: "sem-pressa", title: "Sem pressa" },
] as const;

const SELLER_SITE_VISUALS = [
  { value: "minimalista", title: "Moderna e minimalista" },
  { value: "premium", title: "Sofisticada e premium" },
  { value: "comercial", title: "Direta e comercial" },
  { value: "criativa", title: "Criativa e marcante" },
] as const;

function toggleCsvValue(current: string, value: string): string {
  const list = current
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (list.includes(value)) {
    return list.filter((item) => item !== value).join(", ");
  }

  return [...list, value].join(", ");
}

export default function OrcamentosPage() {
  const { token, user } = useAuth();
  const [budgets, setBudgets] = useState<BudgetsResponse["data"]["budgets"]>([]);
  const [notifications, setNotifications] = useState<BudgetsResponse["data"]["notifications"]>([]);
  const [discountDrafts, setDiscountDrafts] = useState<Record<number, string>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"proposals" | "requests">("proposals");
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [generatingRequest, setGeneratingRequest] = useState(false);
  const [requestToGenerate, setRequestToGenerate] = useState<BudgetRecord | null>(null);
  const [savingPendingBudget, setSavingPendingBudget] = useState(false);
  const [pendingBudgetDraft, setPendingBudgetDraft] = useState({
    total_amount: "",
    internal_deadline_days: "",
  });
  const [requestGenerationForm, setRequestGenerationForm] = useState({
    title: "",
    description: "",
    total_amount: "",
    internal_deadline_days: "",
    valid_until: "",
  });
  const [manualForm, setManualForm] = useState({
    project_type: "site",
    mode: "proposal",
    title: "",
    description: "",
    total_amount: "",
    internal_deadline_days: "",
    valid_until: "",
    contact_name: "",
    contact_company: "",
    contact_email: "",
    contact_phone: "",
    siteObjective: "",
    sitePages: "",
    siteDeadline: "",
    siteVisual: "",
    siteNotes: "",
    systemType: "",
    systemFeatures: "",
    automationType: "",
    automationDescription: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<BudgetsResponse>("/api/admin/budgets", {}, token);
      setBudgets(response.data.budgets);
      setNotifications(response.data.notifications);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel carregar propostas.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const approved = budgets.filter((budget) => budget.status === "approved").length;
    const adjustment = budgets.filter((budget) => budget.status === "adjustment_requested").length;
    const pendingValidation = budgets.filter((budget) => budget.status === "pending_validation").length;

    return {
      total: budgets.length,
      approved,
      adjustment,
      pendingValidation,
    };
  }, [budgets]);

  const isAdmin = Boolean(user?.roles?.includes("admin"));
  const selectedBudget = useMemo(
    () => budgets.find((budget) => budget.id === selectedBudgetId) ?? null,
    [budgets, selectedBudgetId],
  );
  const selectedBudgetLocked = selectedBudget?.status === "approved";

  useEffect(() => {
    if (!selectedBudget) {
      return;
    }

    setPendingBudgetDraft({
      total_amount: String(selectedBudget.total_amount ?? ""),
      internal_deadline_days: selectedBudget.internal_deadline_days ? String(selectedBudget.internal_deadline_days) : "",
    });
  }, [selectedBudget?.id, selectedBudget?.total_amount, selectedBudget?.internal_deadline_days]);

  const markNotificationRead = async (id: number) => {
    if (!token) {
      return;
    }

    try {
      await apiRequest(`/api/admin/notifications/${id}/read`, { method: "PATCH" }, token);
      await load();
    } catch {
      // silencioso
    }
  };

  const validateBudget = async (id: number) => {
    if (!token) {
      return;
    }

    setError(null);
    try {
      await apiRequest(`/api/admin/budgets/${id}/validate`, { method: "PATCH" }, token);
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel validar a proposta.");
    }
  };

  const updatePendingBudget = async (id: number) => {
    if (!token) {
      return;
    }

    const totalAmount = Number(pendingBudgetDraft.total_amount);
    const deadline = Number(pendingBudgetDraft.internal_deadline_days);

    if (Number.isNaN(totalAmount) || totalAmount <= 0) {
      setError("Informe um valor total valido maior que zero.");
      return;
    }

    if (Number.isNaN(deadline) || deadline <= 0) {
      setError("Informe um prazo interno valido em dias.");
      return;
    }

    setSavingPendingBudget(true);
    setError(null);
    try {
      await apiRequest(
        `/api/admin/budgets/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            total_amount: totalAmount,
            internal_deadline_days: deadline,
          }),
        },
        token,
      );

      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel atualizar valor e prazo.");
    } finally {
      setSavingPendingBudget(false);
    }
  };

  const applyDiscount = async (id: number) => {
    if (!token) {
      return;
    }

    const draft = Number(discountDrafts[id] ?? 0);
    if (Number.isNaN(draft) || draft < 0) {
      setError("Informe uma porcentagem de desconto valida.");
      return;
    }

    setError(null);
    try {
      await apiRequest(
        `/api/admin/budgets/${id}/discount`,
        {
          method: "PATCH",
          body: JSON.stringify({
            discount_percent: draft,
          }),
        },
        token,
      );

      await load();
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        const rawMessage = requestError.message.toLowerCase();
        if (rawMessage.includes("aprovada")) {
          setError("Proposta aprovada nao pode mais ser alterada.");
          return;
        }
        if (rawMessage.includes("max") || rawMessage.includes("limite") || rawMessage.includes("desconto")) {
          setError("Percentual de desconto nao autorizado para este orcamento.");
          return;
        }
        setError(requestError.message);
        return;
      }
      setError("Nao foi possivel aplicar o desconto.");
    }
  };

  const filteredBudgets = useMemo(() => {
    const source = activeTab === "proposals"
      ? budgets.filter((budget) => budget.status !== "request")
      : budgets.filter((budget) => budget.status === "request");
    const query = search.trim().toLowerCase();

    return source.filter((budget) => {
      const statusMatches = statusFilter === "all" ? true : budget.status === statusFilter;
      if (!statusMatches) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        budget.identifier,
        budget.title,
        budget.client_name,
        budget.client_company ?? "",
        budget.client_email ?? "",
        budget.client_phone ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeTab, budgets, search, statusFilter]);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(filteredBudgets.length / pageSize)), [filteredBudgets.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount]);

  const visibleBudgets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBudgets.slice(start, start + pageSize);
  }, [currentPage, filteredBudgets]);

  const openGenerateRequestModal = (budget: BudgetRecord) => {
    setRequestToGenerate(budget);
    setRequestGenerationForm({
      title: budget.title || "",
      description: budget.description || "",
      total_amount: budget.total_amount ? String(budget.total_amount) : "",
      internal_deadline_days: budget.internal_deadline_days ? String(budget.internal_deadline_days) : "",
      valid_until: budget.valid_until ?? "",
    });
  };

  const submitGenerateRequest = async () => {
    if (!token || !requestToGenerate) {
      return;
    }

    setGeneratingRequest(true);
    setError(null);
    try {
      await apiRequest(
        `/api/admin/budgets/${requestToGenerate.id}/generate`,
        {
          method: "PATCH",
          body: JSON.stringify({
            title: requestGenerationForm.title,
            description: requestGenerationForm.description || null,
            total_amount:
              requestToGenerate.project_type === "site"
                ? null
                : (requestGenerationForm.total_amount ? Number(requestGenerationForm.total_amount) : null),
            internal_deadline_days: requestGenerationForm.internal_deadline_days
              ? Number(requestGenerationForm.internal_deadline_days)
              : null,
            valid_until: requestGenerationForm.valid_until || null,
          }),
        },
        token,
      );

      setRequestToGenerate(null);
      await load();
      setActiveTab("proposals");
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel gerar proposta.");
    } finally {
      setGeneratingRequest(false);
    }
  };

  const submitManualBudget = async () => {
    if (!token) {
      return;
    }

    setSavingManual(true);
    setError(null);

    try {
      const answers: Record<string, unknown> = {};
      if (manualForm.project_type === "site") {
        if (manualForm.siteObjective.trim()) answers.siteObjective = manualForm.siteObjective.trim();
        if (manualForm.sitePages.trim()) answers.sitePages = manualForm.sitePages.split(",").map((item) => item.trim()).filter(Boolean);
        if (manualForm.siteDeadline) answers.siteDeadline = manualForm.siteDeadline;
        if (manualForm.siteVisual) answers.siteVisual = manualForm.siteVisual;
        if (manualForm.siteNotes.trim()) answers.siteNotes = manualForm.siteNotes.trim();
      }

      if (manualForm.project_type === "sistema") {
        if (manualForm.systemType) answers.systemType = manualForm.systemType;
        if (manualForm.systemFeatures.trim()) answers.systemFeatures = manualForm.systemFeatures.trim();
      }

      if (manualForm.project_type === "automacao") {
        if (manualForm.automationType) answers.automationType = manualForm.automationType;
        if (manualForm.automationDescription.trim()) answers.automationDescription = manualForm.automationDescription.trim();
      }

      await apiRequest(
        "/api/admin/budgets/manual",
        {
          method: "POST",
          body: JSON.stringify({
            project_type: manualForm.project_type,
            mode: manualForm.mode,
            title: manualForm.title,
            description: manualForm.description || null,
            total_amount: manualForm.total_amount ? Number(manualForm.total_amount) : null,
            internal_deadline_days: manualForm.internal_deadline_days ? Number(manualForm.internal_deadline_days) : null,
            valid_until: manualForm.valid_until || null,
            contact: {
              name: manualForm.contact_name || null,
              company: manualForm.contact_company || null,
              email: manualForm.contact_email || null,
              phone: manualForm.contact_phone || null,
            },
            answers,
          }),
        },
        token,
      );

      setManualModalOpen(false);
      setManualForm({
        project_type: "site",
        mode: "proposal",
        title: "",
        description: "",
        total_amount: "",
        internal_deadline_days: "",
        valid_until: "",
        contact_name: "",
        contact_company: "",
        contact_email: "",
        contact_phone: "",
        siteObjective: "",
        sitePages: "",
        siteDeadline: "",
        siteVisual: "",
        siteNotes: "",
        systemType: "",
        systemFeatures: "",
        automationType: "",
        automationDescription: "",
      });
      await load();
      setActiveTab(manualForm.mode === "request" ? "requests" : "proposals");
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel cadastrar proposta manual.");
    } finally {
      setSavingManual(false);
    }
  };

  return (
    <PageShell title="Propostas" description="Listagem de propostas, status comercial e ajustes solicitados.">
      {error && (
        <div className="pointer-events-none fixed right-4 top-4 z-[100100]">
          <div className="pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg">
            <div className="mt-0.5 size-2 rounded-full bg-red-500" />
            <p className="flex-1">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="rounded px-1 text-red-500 transition hover:bg-red-100 hover:text-red-700"
              aria-label="Fechar alerta"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 p-5 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-blue-100">Modulo Comercial</p>
            <h2 className="mt-1 text-2xl font-semibold">Gestao de Propostas</h2>
            <p className="mt-1 text-sm text-blue-50">
              Visualize validacoes, ajustes e valores em uma unica central de acompanhamento comercial.
            </p>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5">
            <p className="text-xs uppercase tracking-wide text-blue-100">Volume total</p>
            <p className="mt-1 text-2xl font-semibold text-white">{summary.total}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Sparkles size={16} />
            <p className="text-xs uppercase tracking-wide">Total de propostas</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.total}</p>
        </div>
        <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-orange-700">
            <AlertTriangle size={16} />
            <p className="text-xs uppercase tracking-wide">Pendentes de validacao</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-orange-700">{summary.pendingValidation}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-700">
            <ShieldCheck size={16} />
            <p className="text-xs uppercase tracking-wide">Aprovadas</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{summary.approved}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-700">
            <Bell size={16} />
            <p className="text-xs uppercase tracking-wide">Com ajuste solicitado</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-amber-700">{summary.adjustment}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Bell size={16} className="text-blue-700" />
          <h3 className="text-base font-semibold text-slate-900">Notificacoes de evento</h3>
        </div>
        {notifications.length === 0 && <p className="text-sm text-slate-500">Nenhuma notificacao pendente.</p>}
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div key={notification.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-amber-900">{notification.title}</p>
                  <p className="text-sm text-amber-800">{notification.message}</p>
                  {Boolean(notification.payload?.adjustment_message) && (
                    <p className="mt-1 text-xs text-amber-900">
                      Ajuste solicitado: {String(notification.payload?.adjustment_message ?? "")}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void markNotificationRead(notification.id);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-amber-300 px-2 py-1 text-xs text-amber-800 hover:bg-amber-100"
                >
                  <CheckCircle2 size={14} />
                  Marcar lida
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Tabela de propostas</h3>
            <p className="text-xs text-slate-500">Busca, filtro e visualizacao detalhada em largura total.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setManualModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600"
            >
              <Plus size={14} />
              Cadastrar manual
            </button>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {filteredBudgets.length} resultados
            </div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setActiveTab("proposals")}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${
              activeTab === "proposals"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <LayoutList size={16} />
            <div>
              <p className="text-sm font-semibold">Propostas</p>
              <p className="text-[11px] opacity-80">Propostas ativas, enviadas e aprovadas</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("requests")}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${
              activeTab === "requests"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <ClipboardList size={16} />
            <div>
              <p className="text-sm font-semibold">Solicitacao de Propostas</p>
              <p className="text-[11px] opacity-80">Solicitacoes vindas do onboarding sem proposta pronta</p>
            </div>
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex w-full flex-col gap-2 md:flex-row md:items-center">
            <div className="flex w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2">
              <Search size={15} className="text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por cliente, titulo, identificador..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2">
              <SlidersHorizontal size={15} className="text-slate-400" />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="bg-transparent text-sm outline-none"
              >
                <option value="all">Todos os status</option>
                {activeTab === "requests" && <option value="request">Solicitacao</option>}
                <option value="pending_validation">Pendente validacao</option>
                <option value="sent">Publicado</option>
                <option value="approved">Aprovado</option>
                <option value="adjustment_requested">Ajuste solicitado</option>
                <option value="draft">Rascunho</option>
              </select>
            </div>
          </div>
        </div>

        {loading && <LoadingState label="Carregando propostas..." className="p-4" />}

        {!loading && activeTab === "proposals" && (
          <div className="w-full overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full table-fixed text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <th className="px-3 py-2 font-medium">Identificador</th>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">Titulo</th>
                  <th className="px-3 py-2 font-medium">Valor total</th>
                  <th className="px-3 py-2 font-medium">Entrada 50%</th>
                  <th className="px-3 py-2 font-medium">Prazo interno</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Proposta</th>
                  <th className="px-3 py-2 font-medium">Acao</th>
                </tr>
              </thead>
              <tbody>
                {visibleBudgets.map((budget) => (
                  <tr
                    key={budget.id}
                    className={`border-b border-slate-100 transition hover:bg-slate-50 ${
                      budget.status === "approved" ? "bg-emerald-50/70" : "bg-white"
                    }`}
                  >
                    <td className="px-3 py-3 font-medium text-slate-900">{budget.identifier}</td>
                    <td className="px-3 py-3 text-slate-700">
                      <p className="truncate font-medium">{budget.client_name}</p>
                      <p className="truncate text-xs text-slate-500">{budget.client_company ?? "Sem empresa"}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      <p className="truncate">{budget.title}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      <p>{money(budget.total_amount)}</p>
                      {Number(budget.discount_percent ?? 0) > 0 && (
                        <p className="mt-0.5 text-[11px] text-emerald-700">
                          Desconto aplicado: {Number(budget.discount_percent ?? 0).toFixed(2)}% (
                          {money(budget.discount_amount ?? 0)})
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{money(budget.entry_amount)}</td>
                    <td className="px-3 py-3 text-slate-700">
                      {budget.internal_deadline_days ? `${budget.internal_deadline_days} dias uteis` : "-"}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${statusPillClass(budget.status)}`}
                      >
                        {statusLabel(budget.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {budget.slug ? (
                        <a
                          href={`http://localhost:3000/proposta/${budget.slug}?internal=1`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <ExternalLink size={13} />
                          Abrir
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500">Sem link</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBudgetId(budget.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <FileText size={13} />
                        Ver detalhes
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && filteredBudgets.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-slate-500">
                      Nenhuma proposta encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && activeTab === "requests" && (
          <div className="w-full overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full table-fixed text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <th className="px-3 py-2 font-medium">Identificador</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">Descricao</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Acao</th>
                </tr>
              </thead>
              <tbody>
                {visibleBudgets.map((budget) => (
                  <tr key={budget.id} className="border-b border-slate-100 bg-white transition hover:bg-slate-50">
                    <td className="px-3 py-3 font-medium text-slate-900">{budget.identifier}</td>
                    <td className="px-3 py-3 uppercase text-slate-700">{budget.project_type}</td>
                    <td className="px-3 py-3 text-slate-700">
                      <p className="truncate font-medium">{budget.client_name}</p>
                      <p className="truncate text-xs text-slate-500">{budget.client_company ?? "Sem empresa"}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      <p className="line-clamp-2 text-xs">{budget.description || budget.objective || "Sem descricao"}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusPillClass(budget.status)}`}>
                        {statusLabel(budget.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => openGenerateRequestModal(budget)}
                        className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      >
                        Gerar proposta
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && filteredBudgets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                      Nenhuma solicitacao encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredBudgets.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Exibindo {(currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, filteredBudgets.length)} de {filteredBudgets.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-xs text-slate-600">
                Pagina {currentPage} de {pageCount}
              </span>
              <button
                type="button"
                disabled={currentPage >= pageCount}
                onClick={() => setCurrentPage((prev) => Math.min(pageCount, prev + 1))}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Proxima
              </button>
            </div>
          </div>
        )}
      </section>

      <Modal
        isOpen={Boolean(requestToGenerate)}
        onClose={() => setRequestToGenerate(null)}
        className="mx-4 w-full max-w-3xl p-0"
      >
        {requestToGenerate && (
          <div className="max-h-[88vh] overflow-y-auto">
            <div className="rounded-t-3xl border-b border-slate-200 bg-slate-50 px-6 py-5">
              <h3 className="text-lg font-semibold text-slate-900">Gerar proposta a partir da solicitacao</h3>
              <p className="mt-1 text-sm text-slate-600">
                {requestToGenerate.identifier} • {requestToGenerate.project_type.toUpperCase()}
              </p>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs text-slate-500">Titulo da proposta</span>
                  <input
                    value={requestGenerationForm.title}
                    onChange={(event) => setRequestGenerationForm((prev) => ({ ...prev, title: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs text-slate-500">Validade</span>
                  <input
                    type="date"
                    value={requestGenerationForm.valid_until}
                    onChange={(event) => setRequestGenerationForm((prev) => ({ ...prev, valid_until: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="text-sm text-slate-700 md:col-span-2">
                  <span className="mb-1 block text-xs text-slate-500">Descricao do projeto</span>
                  <textarea
                    rows={3}
                    value={requestGenerationForm.description}
                    onChange={(event) => setRequestGenerationForm((prev) => ({ ...prev, description: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs text-slate-500">Prazo interno (dias)</span>
                  <input
                    type="number"
                    min={1}
                    value={requestGenerationForm.internal_deadline_days}
                    onChange={(event) => setRequestGenerationForm((prev) => ({ ...prev, internal_deadline_days: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                {requestToGenerate.project_type !== "site" && (
                  <label className="text-sm text-slate-700">
                    <span className="mb-1 block text-xs text-slate-500">Valor total</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={requestGenerationForm.total_amount}
                      onChange={(event) => setRequestGenerationForm((prev) => ({ ...prev, total_amount: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Respostas do onboarding</p>
                <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap text-xs text-slate-700">
                  {JSON.stringify(requestToGenerate.onboarding_answers ?? {}, null, 2)}
                </pre>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRequestToGenerate(null)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void submitGenerateRequest();
                  }}
                  disabled={generatingRequest}
                  className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {generatingRequest ? "Gerando..." : "Gerar proposta"}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        className="mx-4 w-full max-w-4xl p-0"
      >
        <div className="max-h-[88vh] overflow-y-auto">
          <div className="rounded-t-3xl border-b border-slate-200 bg-slate-50 px-6 py-5">
            <h3 className="text-lg font-semibold text-slate-900">Cadastro manual</h3>
            <p className="mt-1 text-sm text-slate-600">Crie proposta ou solicitacao manual para site, sistema ou automacao.</p>
          </div>

          <div className="space-y-4 px-6 py-5">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">1. Tipo de projeto</p>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                {SELLER_PROJECT_TYPES.map((item) => {
                  const Icon = item.icon;
                  const active = manualForm.project_type === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() =>
                        setManualForm((prev) => ({
                          ...prev,
                          project_type: item.value,
                          mode: item.value === "site" ? "proposal" : prev.mode,
                        }))
                      }
                      className={`rounded-xl border p-3 text-left transition ${
                        active ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white">
                        <Icon size={16} />
                      </div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs opacity-90">{item.description}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">2. Contexto comercial</p>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs text-slate-500">Modo</span>
                  <select
                    value={manualForm.mode}
                    onChange={(event) => setManualForm((prev) => ({ ...prev, mode: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="proposal">Proposta</option>
                    <option value="request">Solicitacao</option>
                  </select>
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs text-slate-500">Validade</span>
                  <input type="date" value={manualForm.valid_until} onChange={(event) => setManualForm((prev) => ({ ...prev, valid_until: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs text-slate-500">Prazo interno (dias)</span>
                  <input type="number" min={1} value={manualForm.internal_deadline_days} onChange={(event) => setManualForm((prev) => ({ ...prev, internal_deadline_days: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">3. Dados da proposta</p>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs text-slate-500">Titulo</span>
                  <input value={manualForm.title} onChange={(event) => setManualForm((prev) => ({ ...prev, title: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <label className="text-sm text-slate-700 md:col-span-2">
                  <span className="mb-1 block text-xs text-slate-500">Descricao do projeto</span>
                  <textarea rows={3} value={manualForm.description} onChange={(event) => setManualForm((prev) => ({ ...prev, description: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">4. Contato do lead</p>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm text-slate-700"><span className="mb-1 block text-xs text-slate-500">Nome</span><input value={manualForm.contact_name} onChange={(event) => setManualForm((prev) => ({ ...prev, contact_name: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                <label className="text-sm text-slate-700"><span className="mb-1 block text-xs text-slate-500">Empresa</span><input value={manualForm.contact_company} onChange={(event) => setManualForm((prev) => ({ ...prev, contact_company: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                <label className="text-sm text-slate-700"><span className="mb-1 block text-xs text-slate-500">Email</span><input value={manualForm.contact_email} onChange={(event) => setManualForm((prev) => ({ ...prev, contact_email: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                <label className="text-sm text-slate-700"><span className="mb-1 block text-xs text-slate-500">Telefone/WhatsApp</span><input value={manualForm.contact_phone} onChange={(event) => setManualForm((prev) => ({ ...prev, contact_phone: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
              </div>
            </section>

            {manualForm.project_type === "site" && (
              <section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
                <div className="mb-3 flex items-center gap-2 text-blue-800">
                  <CalendarClock size={16} />
                  <p className="text-xs font-semibold uppercase tracking-wide">Briefing para vendedor • Site</p>
                </div>

                <div className="mb-3">
                  <p className="mb-2 text-xs font-medium text-slate-600">Objetivo principal</p>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    {SELLER_SITE_OBJECTIVES.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setManualForm((prev) => ({ ...prev, siteObjective: item.value }))}
                        className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                          manualForm.siteObjective === item.value
                            ? "border-blue-200 bg-white text-blue-700"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {item.title}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-3">
                  <p className="mb-2 text-xs font-medium text-slate-600">Paginas previstas</p>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {SELLER_SITE_PAGES.map((page) => {
                      const selected = manualForm.sitePages.split(",").map((item) => item.trim()).filter(Boolean).includes(page);
                      return (
                        <button
                          key={page}
                          type="button"
                          onClick={() =>
                            setManualForm((prev) => ({
                              ...prev,
                              sitePages: toggleCsvValue(prev.sitePages, page),
                            }))
                          }
                          className={`rounded-lg border px-2 py-2 text-xs transition ${
                            selected ? "border-blue-200 bg-white text-blue-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-medium text-slate-600">Prazo comercial</p>
                    <div className="space-y-2">
                      {SELLER_SITE_DEADLINES.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setManualForm((prev) => ({ ...prev, siteDeadline: item.value }))}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
                            manualForm.siteDeadline === item.value
                              ? "border-blue-200 bg-white text-blue-700"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {item.title}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium text-slate-600">Direcao visual</p>
                    <div className="space-y-2">
                      {SELLER_SITE_VISUALS.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setManualForm((prev) => ({ ...prev, siteVisual: item.value }))}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
                            manualForm.siteVisual === item.value
                              ? "border-blue-200 bg-white text-blue-700"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {item.title}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs text-slate-500">Observacoes comerciais para proposta</span>
                  <textarea rows={2} value={manualForm.siteNotes} onChange={(event) => setManualForm((prev) => ({ ...prev, siteNotes: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
                </label>

                <p className="mt-3 text-xs font-medium text-blue-700">Para site, o valor da proposta sera calculado automaticamente com as escolhas acima.</p>
              </section>
            )}

            {manualForm.project_type === "sistema" && (
              <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
                <div className="mb-3 flex items-center gap-2 text-indigo-800">
                  <Cpu size={16} />
                  <p className="text-xs font-semibold uppercase tracking-wide">Briefing para vendedor • Sistema</p>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="text-sm text-slate-700">
                    <span className="mb-1 block text-xs text-slate-500">Tipo de sistema</span>
                    <input value={manualForm.systemType} onChange={(event) => setManualForm((prev) => ({ ...prev, systemType: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" placeholder="Web, Local, SaaS..." />
                  </label>
                  <label className="text-sm text-slate-700 md:col-span-2">
                    <span className="mb-1 block text-xs text-slate-500">Funcionalidades e escopo esperado</span>
                    <textarea rows={4} value={manualForm.systemFeatures} onChange={(event) => setManualForm((prev) => ({ ...prev, systemFeatures: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
                  </label>
                </div>
              </section>
            )}

            {manualForm.project_type === "automacao" && (
              <section className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4">
                <div className="mb-3 flex items-center gap-2 text-cyan-800">
                  <MessageSquareText size={16} />
                  <p className="text-xs font-semibold uppercase tracking-wide">Briefing para vendedor • Automacao</p>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="text-sm text-slate-700">
                    <span className="mb-1 block text-xs text-slate-500">Tipo de automacao</span>
                    <input value={manualForm.automationType} onChange={(event) => setManualForm((prev) => ({ ...prev, automationType: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" placeholder="WhatsApp, Webhook, Sistema x Sistema..." />
                  </label>
                  <label className="text-sm text-slate-700 md:col-span-2">
                    <span className="mb-1 block text-xs text-slate-500">Descricao detalhada do fluxo</span>
                    <textarea rows={4} value={manualForm.automationDescription} onChange={(event) => setManualForm((prev) => ({ ...prev, automationDescription: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
                  </label>
                </div>
              </section>
            )}

            {manualForm.project_type !== "site" && manualForm.mode === "proposal" && (
              <label className="text-sm text-slate-700">
                <span className="mb-1 block text-xs text-slate-500">Valor total da proposta</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={manualForm.total_amount}
                  onChange={(event) => setManualForm((prev) => ({ ...prev, total_amount: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setManualModalOpen(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  void submitManualBudget();
                }}
                disabled={savingManual}
                className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {savingManual ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(selectedBudget)}
        onClose={() => {
          setSelectedBudgetId(null);
        }}
        className="mx-4 w-full max-w-4xl p-0"
      >
        {selectedBudget && (
          <div className="max-h-[88vh] overflow-y-auto">
            <div className="rounded-t-3xl border-b border-blue-900/40 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 px-6 py-5 text-white">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-blue-100">Proposta</p>
                  <h3 className="mt-1 text-xl font-semibold text-white">{selectedBudget.title}</h3>
                  <p className="mt-1 text-sm text-blue-100">
                    {selectedBudget.identifier} • {selectedBudget.project_type.toUpperCase()}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusPillClass(selectedBudget.status)}`}
                >
                  {statusLabel(selectedBudget.status)}
                </span>
              </div>
            </div>

            <div className="space-y-5 bg-slate-50 px-6 py-5">
              <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Valor total</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{money(selectedBudget.total_amount)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Entrada sugerida</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{money(selectedBudget.entry_amount)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Desconto atual</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {Number(selectedBudget.discount_percent ?? 0).toFixed(2)}%
                  </p>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-slate-900">Visao interna (vendedor/administrador)</h4>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-2 text-sm text-slate-700">
                    <p className="inline-flex items-center gap-2">
                      <UserCircle2 size={15} className="text-slate-500" />
                      {selectedBudget.client_name}
                    </p>
                    {selectedBudget.client_email && (
                      <p className="inline-flex items-center gap-2">
                        <Mail size={15} className="text-slate-500" />
                        {selectedBudget.client_email}
                      </p>
                    )}
                    {selectedBudget.client_phone && (
                      <p className="inline-flex items-center gap-2">
                        <Phone size={15} className="text-slate-500" />
                        {selectedBudget.client_phone}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1 text-sm text-slate-700">
                    <p>
                      <span className="text-slate-500">Empresa:</span> {selectedBudget.client_company ?? "Sem empresa"}
                    </p>
                    <p>
                      <span className="text-slate-500">Prazo interno:</span>{" "}
                      {selectedBudget.internal_deadline_days ? `${selectedBudget.internal_deadline_days} dias uteis` : "-"}
                    </p>
                    <p>
                      <span className="text-slate-500">Validade:</span> {selectedBudget.valid_until ?? "-"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-slate-900">Acoes comerciais</h4>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {selectedBudget.slug ? (
                    <a
                      href={`http://localhost:3000/proposta/${selectedBudget.slug}?internal=1`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <ExternalLink size={13} />
                      Abrir proposta publica
                    </a>
                  ) : (
                    <span className="text-xs text-slate-500">Sem link de proposta</span>
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-slate-900">Aplicar desconto</h4>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedBudgetLocked
                    ? "Proposta aprovada: descontos e alteracoes estao bloqueados."
                    : "Informe o percentual desejado. O sistema valida automaticamente a permissao para este tipo de projeto."}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={discountDrafts[selectedBudget.id] ?? ""}
                    disabled={selectedBudgetLocked}
                    onChange={(event) =>
                      setDiscountDrafts((prev) => ({
                        ...prev,
                        [selectedBudget.id]: event.target.value,
                      }))
                    }
                    placeholder="Desconto (%)"
                    className="w-36 rounded-md border border-slate-300 px-2.5 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <button
                    type="button"
                    disabled={selectedBudgetLocked}
                    onClick={() => {
                      void applyDiscount(selectedBudget.id);
                    }}
                    className="rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    Aplicar desconto
                  </button>
                </div>
              </section>

              {selectedBudget.status === "pending_validation" && (
                <section className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                  <h4 className="text-sm font-semibold text-orange-900">Ajustar antes de liberar para vendedor</h4>
                  <p className="mt-1 text-xs text-orange-800">
                    Edite valor e prazo enquanto a proposta estiver pendente de validacao.
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <label className="text-sm text-slate-700 md:col-span-2">
                      <span className="mb-1 block text-xs text-slate-500">Valor total</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={pendingBudgetDraft.total_amount}
                        onChange={(event) =>
                          setPendingBudgetDraft((prev) => ({
                            ...prev,
                            total_amount: event.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm text-slate-700">
                      <span className="mb-1 block text-xs text-slate-500">Prazo interno (dias)</span>
                      <input
                        type="number"
                        min={1}
                        value={pendingBudgetDraft.internal_deadline_days}
                        onChange={(event) =>
                          setPendingBudgetDraft((prev) => ({
                            ...prev,
                            internal_deadline_days: event.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm"
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        void updatePendingBudget(selectedBudget.id);
                      }}
                      disabled={savingPendingBudget}
                      className="rounded-md border border-orange-300 bg-white px-3 py-2 text-xs font-medium text-orange-800 hover:bg-orange-100 disabled:opacity-60"
                    >
                      {savingPendingBudget ? "Salvando ajustes..." : "Salvar ajustes de valor e prazo"}
                    </button>
                  </div>
                </section>
              )}

              {isAdmin && (
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <h4 className="text-sm font-semibold text-slate-900">Validacao administrativa</h4>
                  <div className="mt-3">
                    {selectedBudget.status === "pending_validation" ? (
                      <button
                        type="button"
                        onClick={() => {
                          void validateBudget(selectedBudget.id);
                        }}
                        className="rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-medium text-orange-700 hover:bg-orange-100"
                      >
                        Validar e liberar para vendedor
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">Esta proposta ja esta validada ou nao exige validacao.</span>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
