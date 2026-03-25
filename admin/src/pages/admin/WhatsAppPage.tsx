import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Filter, MoreVertical, Pencil, Plus, Search, Settings2, Tag, Trash2, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import PageShell from "./PageShell";
import { useAuth } from "../../context/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import LoadingState from "../../components/common/LoadingState";
import AlertModal from "../../components/common/AlertModal";
import type {
  SellersResponse,
  WhatsAppConversationPayloadResponse,
  WhatsAppConversationRecord,
  WhatsAppConversationsResponse,
  WhatsAppMessageRecord,
  WhatsAppQuickReplyRecord,
  WhatsAppTagRecord,
} from "../../types/admin";
import WhatsAppConversationList from "../../components/whatsapp/WhatsAppConversationList";
import WhatsAppConversationView from "../../components/whatsapp/WhatsAppConversationView";
import WhatsAppStartConversationModal from "../../components/whatsapp/WhatsAppStartConversationModal";
import { conversationDisplayName } from "../../components/whatsapp/utils";

type FilterKey = "all" | "unread" | "mine" | "unassigned";
type ConfirmIntent = "info" | "warning" | "danger";

type ConfirmDialogState = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  intent?: ConfirmIntent;
  onConfirm: () => Promise<void> | void;
};

type RealtimeUpdatesResponse = {
  data: {
    messages: WhatsAppMessageRecord[];
    conversations: WhatsAppConversationRecord[];
    last_message_id: number;
  };
};

const CONVERSATIONS_CACHE_PREFIX = "forticorp_whatsapp_conversations_cache_v1";
const CONVERSATIONS_CACHE_TTL_MS = 3 * 60 * 1000;
const CONVERSATIONS_BOOTSTRAP_CACHE_KEY = "forticorp_whatsapp_conversations_bootstrap_v1";
const CONVERSATIONS_BOOTSTRAP_LIMIT = 10;

function mergeConversations(
  current: WhatsAppConversationRecord[],
  incoming: WhatsAppConversationRecord[],
): WhatsAppConversationRecord[] {
  const map = new Map<number, WhatsAppConversationRecord>();

  current.forEach((conversation) => {
    map.set(conversation.id, conversation);
  });

  incoming.forEach((conversation) => {
    const previous = map.get(conversation.id);
    map.set(conversation.id, {
      ...(previous ?? {}),
      ...conversation,
    });
  });

  return Array.from(map.values()).sort((a, b) => {
    const aTs = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const bTs = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return bTs - aTs;
  });
}

function mergeMessages(current: WhatsAppMessageRecord[], incoming: WhatsAppMessageRecord[]): WhatsAppMessageRecord[] {
  const map = new Map<number, WhatsAppMessageRecord>();

  current.forEach((message) => {
    map.set(message.id, message);
  });

  incoming.forEach((message) => {
    map.set(message.id, message);
  });

  const toTs = (message: WhatsAppMessageRecord): number => {
    const raw = message.sent_at ?? message.created_at;
    const ts = raw ? new Date(raw).getTime() : Number.NaN;
    if (!Number.isNaN(ts)) {
      return ts;
    }
    return message.id;
  };

  return Array.from(map.values()).sort((a, b) => {
    const diff = toTs(a) - toTs(b);
    if (diff !== 0) {
      return diff;
    }
    return a.id - b.id;
  });
}

function previewFromMessageType(type: WhatsAppMessageRecord["message_type"], body?: string | null): string {
  if (type === "text") {
    return (body ?? "").trim() || "Mensagem";
  }

  if (type === "image") {
    return "Imagem";
  }

  if (type === "audio") {
    return "Áudio";
  }

  if (type === "document") {
    return "Documento";
  }

  if (type === "video") {
    return "Vídeo";
  }

  if (type === "sticker") {
    return "Sticker";
  }

  return "Mensagem";
}

export default function WhatsAppPage() {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<WhatsAppConversationRecord[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversationRecord | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessageRecord[]>([]);
  const [users, setUsers] = useState<Array<{ id: number; name: string }>>([]);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [assignedUserFilter, setAssignedUserFilter] = useState<string>("");

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [savingAssign, setSavingAssign] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [savingRename, setSavingRename] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [tagSelection, setTagSelection] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#2563eb");
  const [savingTag, setSavingTag] = useState(false);
  const [allTags, setAllTags] = useState<WhatsAppTagRecord[]>([]);
  const [quickReplies, setQuickReplies] = useState<WhatsAppQuickReplyRecord[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"tags" | "quickReplies">("tags");
  const [creatingTag, setCreatingTag] = useState(false);
  const [tagForm, setTagForm] = useState({ name: "", color: "#2563eb" });
  const [creatingQuickReply, setCreatingQuickReply] = useState(false);
  const [quickReplyForm, setQuickReplyForm] = useState({ title: "", content: "" });
  const [editingQuickReplyId, setEditingQuickReplyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [newConversationOpen, setNewConversationOpen] = useState(false);

  const selectedConversationIdRef = useRef<number | null>(null);
  const latestMessageIdRef = useRef(0);
  const tempMessageIdRef = useRef(-1);
  const messageCacheRef = useRef<Record<number, WhatsAppMessageRecord[]>>({});
  const hasOlderMapRef = useRef<Record<number, boolean>>({});
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const pendingConversationQueryRef = useRef<number | null>(null);
  const conversationRequestAbortRef = useRef<AbortController | null>(null);
  const conversationRequestSeqRef = useRef(0);

  const conversationsCacheKey = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase() || "__empty__";
    const assigned = assignedUserFilter || "__any__";
    return `${CONVERSATIONS_CACHE_PREFIX}:${activeFilter}:${assigned}:${normalizedSearch}`;
  }, [activeFilter, assignedUserFilter, search]);

  const applyConversationList = useCallback((list: WhatsAppConversationRecord[]) => {
    setConversations(list);

    if (list.length === 0) {
      setSelectedConversation(null);
      setMessages([]);
      return;
    }

    if (!selectedConversationIdRef.current) {
      setSelectedConversation(list[0]);
      return;
    }

    const selected = list.find((item) => item.id === selectedConversationIdRef.current);
    if (selected) {
      setSelectedConversation(selected);
    } else {
      setSelectedConversation(list[0]);
    }
  }, []);

  const createPendingMessage = useCallback(
    (
      conversationId: number,
      messageType: WhatsAppMessageRecord["message_type"],
      payload: {
        body?: string | null;
        mediaUrl?: string | null;
        mediaMime?: string | null;
        mediaFilename?: string | null;
      } = {},
    ): WhatsAppMessageRecord => {
      const id = tempMessageIdRef.current;
      tempMessageIdRef.current -= 1;
      const nowIso = new Date().toISOString();

      return {
        id,
        whatsapp_instance_id: selectedConversation?.whatsapp_instance_id ?? 0,
        whatsapp_conversation_id: conversationId,
        whatsapp_contact_id: selectedConversation?.whatsapp_contact_id ?? null,
        external_message_id: null,
        remote_jid: selectedConversation?.remote_jid ?? "",
        direction: "outbound",
        message_type: messageType,
        body: payload.body ?? null,
        media_url: payload.mediaUrl ?? null,
        media_mime: payload.mediaMime ?? null,
        media_filename: payload.mediaFilename ?? null,
        media_size: null,
        audio_duration: null,
        from_me: true,
        sender_name: null,
        sender_phone: null,
        sent_at: nowIso,
        status: "PENDING",
        created_at: nowIso,
        updated_at: nowIso,
      };
    },
    [selectedConversation],
  );

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversation?.id ?? null;
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (!selectedConversation) {
      setEditingName(false);
      setRenameDraft("");
      setActionsMenuOpen(false);
      setTagSelection("");
      setNewTagName("");
      setNewTagColor("#2563eb");
      return;
    }

    setRenameDraft(selectedConversation.contact?.display_name ?? selectedConversation.subject ?? "");
    setActionsMenuOpen(false);
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (!actionsMenuOpen) {
      return;
    }

    const onClickOutside = (event: MouseEvent) => {
      if (!actionsMenuRef.current) {
        return;
      }

      if (!actionsMenuRef.current.contains(event.target as Node)) {
        setActionsMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, [actionsMenuOpen]);

  const loadUsers = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const response = await apiRequest<SellersResponse>("/api/admin/sellers", {}, token);
      setUsers(response.data.sellers.map((seller) => ({ id: seller.id, name: seller.name })));
    } catch {
      // silencioso
    }
  }, [token]);

  const loadTags = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const response = await apiRequest<{ data: WhatsAppTagRecord[] }>("/api/admin/whatsapp/tags", {}, token);
      setAllTags(response.data ?? []);
    } catch {
      // silencioso
    }
  }, [token]);

  const loadQuickReplies = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const response = await apiRequest<{ data: WhatsAppQuickReplyRecord[] }>("/api/admin/whatsapp/quick-replies", {}, token);
      setQuickReplies(response.data ?? []);
    } catch {
      // silencioso
    }
  }, [token]);

  const loadConversations = useCallback(async () => {
    if (!token) {
      setLoadingConversations(false);
      return;
    }

    if (conversations.length === 0) {
      try {
        const bootstrapRaw = sessionStorage.getItem(CONVERSATIONS_BOOTSTRAP_CACHE_KEY);
        if (bootstrapRaw) {
          const bootstrap = JSON.parse(bootstrapRaw) as { ts?: number; data?: WhatsAppConversationRecord[] };
          const isFresh = typeof bootstrap.ts === "number" && Date.now() - bootstrap.ts < CONVERSATIONS_CACHE_TTL_MS;
          if (isFresh && Array.isArray(bootstrap.data) && bootstrap.data.length > 0) {
            applyConversationList(bootstrap.data.slice(0, CONVERSATIONS_BOOTSTRAP_LIMIT));
          }
        }
      } catch {
        // ignore bootstrap cache errors
      }
    }

    setLoadingConversations(conversations.length === 0);
    setError(null);

    try {
      try {
        const cachedRaw = sessionStorage.getItem(conversationsCacheKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw) as { ts?: number; data?: WhatsAppConversationRecord[] };
          const isFresh = typeof cached.ts === "number" && Date.now() - cached.ts < CONVERSATIONS_CACHE_TTL_MS;
          if (isFresh && Array.isArray(cached.data) && cached.data.length > 0) {
            applyConversationList(cached.data);
            setLoadingConversations(false);
            return;
          }
        }
      } catch {
        // cache inválido, segue fluxo normal
      }

      const params = new URLSearchParams();
      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (activeFilter !== "all") {
        params.set("filter", activeFilter);
      }

      if (assignedUserFilter) {
        params.set("assigned_user_id", assignedUserFilter);
      }

      const queryString = params.toString();
      const response = await apiRequest<WhatsAppConversationsResponse>(
        `/api/admin/whatsapp/conversations${queryString ? `?${queryString}` : ""}`,
        {},
        token,
      );

      const list = response.data;
      applyConversationList(list);
      try {
        sessionStorage.setItem(
          conversationsCacheKey,
          JSON.stringify({
            ts: Date.now(),
            data: list,
          }),
        );
        sessionStorage.setItem(
          CONVERSATIONS_BOOTSTRAP_CACHE_KEY,
          JSON.stringify({
            ts: Date.now(),
            data: list.slice(0, CONVERSATIONS_BOOTSTRAP_LIMIT),
          }),
        );
      } catch {
        // cache cheio/indisponível
      }
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Falha ao carregar conversas.");
    } finally {
      setLoadingConversations(false);
    }
  }, [token, search, activeFilter, assignedUserFilter, conversationsCacheKey, applyConversationList, conversations.length]);

  const loadConversation = useCallback(
    async (conversationId: number) => {
      if (!token) {
        return;
      }

      conversationRequestAbortRef.current?.abort();
      const controller = new AbortController();
      conversationRequestAbortRef.current = controller;
      const requestSeq = conversationRequestSeqRef.current + 1;
      conversationRequestSeqRef.current = requestSeq;

      setLoadingMessages(true);
      try {
        const cached = messageCacheRef.current[conversationId] ?? [];
        if (cached.length > 0) {
          setMessages(cached);
        }

        const response = await apiRequest<WhatsAppConversationPayloadResponse>(
          `/api/admin/whatsapp/conversations/${conversationId}`,
          { signal: controller.signal },
          token,
        );

        if (
          controller.signal.aborted ||
          requestSeq !== conversationRequestSeqRef.current ||
          selectedConversationIdRef.current !== conversationId
        ) {
          return;
        }

        setSelectedConversation({
          ...response.data,
          unread_count: 0,
        });
        const mergedMessages = mergeMessages(cached, response.messages ?? []);
        setMessages(mergedMessages);
        messageCacheRef.current[conversationId] = mergedMessages;
        hasOlderMapRef.current[conversationId] = mergedMessages.length >= 10;
        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  ...response.data,
                  unread_count: 0,
                }
              : conversation,
          ),
        );

        const maxId = mergedMessages.reduce((max, current) => Math.max(max, current.id), 0);
        latestMessageIdRef.current = maxId;
      } catch (requestError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(requestError instanceof ApiError ? requestError.message : "Falha ao carregar mensagens.");
      } finally {
        if (requestSeq === conversationRequestSeqRef.current) {
          setLoadingMessages(false);
        }
      }
    },
    [token],
  );

  const loadOlderMessages = useCallback(async () => {
    if (!token || !selectedConversation || loadingOlderMessages) {
      return;
    }

    const conversationId = selectedConversation.id;
    const current = messageCacheRef.current[conversationId] ?? messages;
    const oldestId = current.length > 0 ? Math.min(...current.map((item) => item.id)) : null;
    if (!oldestId || hasOlderMapRef.current[conversationId] === false) {
      return;
    }

    setLoadingOlderMessages(true);
    try {
      const response = await apiRequest<{ data: WhatsAppMessageRecord[] }>(
        `/api/admin/whatsapp/conversations/${conversationId}/messages?before_id=${oldestId}&per_page=40&mark_read=0`,
        {},
        token,
      );

      const olderChunk = [...(response.data ?? [])].reverse();
      if (olderChunk.length === 0) {
        hasOlderMapRef.current[conversationId] = false;
        return;
      }

      const next = mergeMessages(olderChunk, current);
      messageCacheRef.current[conversationId] = next;
      setMessages(next);
      hasOlderMapRef.current[conversationId] = olderChunk.length >= 40;
    } catch {
      // silencioso no scroll incremental
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [token, selectedConversation, loadingOlderMessages, messages]);

  useEffect(() => {
    void loadUsers();
    void loadTags();
    void loadQuickReplies();
  }, [loadUsers, loadTags, loadQuickReplies]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadConversations();
    }, 240);

    return () => window.clearTimeout(timer);
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedConversation?.id) {
      return;
    }

    void loadConversation(selectedConversation.id);
  }, [selectedConversation?.id, loadConversation]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        conversationsCacheKey,
        JSON.stringify({
          ts: Date.now(),
          data: conversations,
        }),
      );
    } catch {
      // ignore cache persistence errors
    }
  }, [conversations, conversationsCacheKey]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const conversationParam = params.get("conversation");
    const targetId = conversationParam ? Number(conversationParam) : Number.NaN;

    if (Number.isFinite(targetId) && targetId > 0) {
      pendingConversationQueryRef.current = targetId;
      params.delete("conversation");
      navigate(
        {
          pathname: location.pathname,
          search: params.toString() ? `?${params.toString()}` : "",
        },
        { replace: true },
      );
    }
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    const targetId = pendingConversationQueryRef.current;
    if (!targetId) {
      return;
    }

    const targetConversation = conversations.find((item) => item.id === targetId);
    if (!targetConversation) {
      return;
    }

    setSelectedConversation({
      ...targetConversation,
      unread_count: 0,
    });
    setConversations((prev) =>
      prev.map((item) =>
        item.id === targetId
          ? {
              ...item,
              unread_count: 0,
            }
          : item,
      ),
    );

    pendingConversationQueryRef.current = null;
  }, [conversations]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let inFlight = false;
    let activeController: AbortController | null = null;

    const interval = window.setInterval(() => {
      if (inFlight) {
        return;
      }

      inFlight = true;
      const selectedId = selectedConversationIdRef.current;
      const params = new URLSearchParams();
      params.set("after_message_id", String(latestMessageIdRef.current));
      if (selectedId) {
        params.set("conversation_id", String(selectedId));
      }

      activeController = new AbortController();
      void apiRequest<RealtimeUpdatesResponse>(
        `/api/admin/whatsapp/realtime/updates?${params.toString()}`,
        { signal: activeController.signal },
        token,
      )
        .then((response) => {
          const incomingConversations = response.data.conversations ?? [];
          if (incomingConversations.length > 0) {
            setConversations((prev) => {
              const merged = mergeConversations(prev, incomingConversations);
              if (!selectedId) {
                return merged;
              }

              return merged.map((conversation) =>
                conversation.id === selectedId
                  ? {
                      ...conversation,
                      unread_count: 0,
                    }
                  : conversation,
              );
            });

            if (selectedId) {
              const incomingSelected = incomingConversations.find((conversation) => conversation.id === selectedId);
              if (incomingSelected) {
                setSelectedConversation((prev) => ({ ...(prev ?? incomingSelected), ...incomingSelected, unread_count: 0 }));
              }
            }
          }

          const incomingMessages = response.data.messages ?? [];
          if (incomingMessages.length > 0 && selectedId) {
            const scoped = incomingMessages.filter((message) => message.whatsapp_conversation_id === selectedId);
            if (scoped.length > 0) {
              setMessages((prev) => {
                const merged = mergeMessages(prev, scoped);
                messageCacheRef.current[selectedId] = merged;
                return merged;
              });
            }
          }

          if ((response.data.last_message_id ?? 0) > latestMessageIdRef.current) {
            latestMessageIdRef.current = response.data.last_message_id;
          }
        })
        .catch(() => {
          // silencioso no polling
        })
        .finally(() => {
          inFlight = false;
        });
    }, 7000);

    return () => {
      window.clearInterval(interval);
      activeController?.abort();
    };
  }, [token]);

  useEffect(
    () => () => {
      conversationRequestAbortRef.current?.abort();
    },
    [],
  );

  const sendText = useCallback(
    async (text: string) => {
      if (!token || !selectedConversation) {
        return;
      }
      setError(null);
      const conversationId = selectedConversation.id;
      const pendingMessage = createPendingMessage(conversationId, "text", { body: text });
      setMessages((prev) => {
        const merged = mergeMessages(prev, [pendingMessage]);
        messageCacheRef.current[conversationId] = merged;
        return merged;
      });
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                last_message_at: pendingMessage.sent_at,
                last_message_preview: previewFromMessageType("text", text),
              }
            : conversation,
        ),
      );

      void (async () => {
        try {
          const response = await apiRequest<{ data: WhatsAppMessageRecord }>(
            `/api/admin/whatsapp/conversations/${conversationId}/messages/text`,
            {
              method: "POST",
              body: JSON.stringify({ text }),
            },
            token,
          );

          setMessages((prev) => {
            const withoutPending = prev.filter((message) => message.id !== pendingMessage.id);
            const merged = mergeMessages(withoutPending, [response.data]);
            messageCacheRef.current[conversationId] = merged;
            return merged;
          });
          latestMessageIdRef.current = Math.max(latestMessageIdRef.current, response.data.id);
          setConversations((prev) =>
            prev.map((conversation) =>
              conversation.id === conversationId
                ? {
                    ...conversation,
                    last_message_at: response.data.sent_at ?? response.data.created_at,
                    last_message_preview: response.data.body ?? "[Mensagem]",
                  }
                : conversation,
            ),
          );
        } catch (requestError) {
          setMessages((prev) => {
            const next = prev.map((message) =>
              message.id === pendingMessage.id ? { ...message, status: "FAILED" } : message,
            );
            messageCacheRef.current[conversationId] = next;
            return next;
          });
          setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel enviar mensagem.");
        }
      })();
    },
    [token, selectedConversation, createPendingMessage],
  );

  const sendImage = useCallback(
    async (payload: { base64: string; mime: string; filename?: string; caption?: string }) => {
      if (!token || !selectedConversation) {
        return;
      }
      setError(null);
      const conversationId = selectedConversation.id;
      const pendingMessage = createPendingMessage(conversationId, "image", {
        body: payload.caption ?? null,
        mediaUrl: `data:${payload.mime};base64,${payload.base64}`,
        mediaMime: payload.mime,
        mediaFilename: payload.filename ?? null,
      });
      setMessages((prev) => {
        const merged = mergeMessages(prev, [pendingMessage]);
        messageCacheRef.current[conversationId] = merged;
        return merged;
      });
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                last_message_at: pendingMessage.sent_at,
                last_message_preview: previewFromMessageType("image", payload.caption),
              }
            : conversation,
        ),
      );

      void (async () => {
        try {
          const response = await apiRequest<{ data: WhatsAppMessageRecord }>(
            `/api/admin/whatsapp/conversations/${conversationId}/messages/image`,
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

          setMessages((prev) => {
            const withoutPending = prev.filter((message) => message.id !== pendingMessage.id);
            const merged = mergeMessages(withoutPending, [response.data]);
            messageCacheRef.current[conversationId] = merged;
            return merged;
          });
          latestMessageIdRef.current = Math.max(latestMessageIdRef.current, response.data.id);
        } catch (requestError) {
          setMessages((prev) => {
            const next = prev.map((message) =>
              message.id === pendingMessage.id ? { ...message, status: "FAILED" } : message,
            );
            messageCacheRef.current[conversationId] = next;
            return next;
          });
          setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel enviar imagem.");
        }
      })();
    },
    [token, selectedConversation, createPendingMessage],
  );

  const sendAudio = useCallback(
    async (payload: { base64: string; mime: string; filename?: string }) => {
      if (!token || !selectedConversation) {
        return;
      }
      setError(null);
      const conversationId = selectedConversation.id;
      const pendingMessage = createPendingMessage(conversationId, "audio", {
        mediaUrl: `data:${payload.mime};base64,${payload.base64}`,
        mediaMime: payload.mime,
        mediaFilename: payload.filename ?? null,
      });
      setMessages((prev) => {
        const merged = mergeMessages(prev, [pendingMessage]);
        messageCacheRef.current[conversationId] = merged;
        return merged;
      });
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                last_message_at: pendingMessage.sent_at,
                last_message_preview: previewFromMessageType("audio"),
              }
            : conversation,
        ),
      );

      void (async () => {
        try {
          const response = await apiRequest<{ data: WhatsAppMessageRecord }>(
            `/api/admin/whatsapp/conversations/${conversationId}/messages/audio`,
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

          setMessages((prev) => {
            const withoutPending = prev.filter((message) => message.id !== pendingMessage.id);
            const merged = mergeMessages(withoutPending, [response.data]);
            messageCacheRef.current[conversationId] = merged;
            return merged;
          });
          latestMessageIdRef.current = Math.max(latestMessageIdRef.current, response.data.id);
        } catch (requestError) {
          setMessages((prev) => {
            const next = prev.map((message) =>
              message.id === pendingMessage.id ? { ...message, status: "FAILED" } : message,
            );
            messageCacheRef.current[conversationId] = next;
            return next;
          });
          setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel enviar audio.");
        }
      })();
    },
    [token, selectedConversation, createPendingMessage],
  );

  const sendDocument = useCallback(
    async (payload: { base64: string; mime: string; filename?: string; caption?: string }) => {
      if (!token || !selectedConversation) {
        return;
      }
      setError(null);
      const conversationId = selectedConversation.id;
      const pendingMessage = createPendingMessage(conversationId, "document", {
        body: payload.caption ?? null,
        mediaUrl: `data:${payload.mime};base64,${payload.base64}`,
        mediaMime: payload.mime,
        mediaFilename: payload.filename ?? null,
      });
      setMessages((prev) => {
        const merged = mergeMessages(prev, [pendingMessage]);
        messageCacheRef.current[conversationId] = merged;
        return merged;
      });
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                last_message_at: pendingMessage.sent_at,
                last_message_preview: previewFromMessageType("document", payload.caption),
              }
            : conversation,
        ),
      );

      void (async () => {
        try {
          const response = await apiRequest<{ data: WhatsAppMessageRecord }>(
            `/api/admin/whatsapp/conversations/${conversationId}/messages/document`,
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

          setMessages((prev) => {
            const withoutPending = prev.filter((message) => message.id !== pendingMessage.id);
            const merged = mergeMessages(withoutPending, [response.data]);
            messageCacheRef.current[conversationId] = merged;
            return merged;
          });
          latestMessageIdRef.current = Math.max(latestMessageIdRef.current, response.data.id);
        } catch (requestError) {
          setMessages((prev) => {
            const next = prev.map((message) =>
              message.id === pendingMessage.id ? { ...message, status: "FAILED" } : message,
            );
            messageCacheRef.current[conversationId] = next;
            return next;
          });
          setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel enviar documento.");
        }
      })();
    },
    [token, selectedConversation, createPendingMessage],
  );

  const startConversation = useCallback(
    async (payload: { phone: string; display_name?: string }) => {
      if (!token) {
        return;
      }

      const response = await apiRequest<{ data: WhatsAppConversationRecord }>(
        "/api/admin/whatsapp/conversations/start",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        token,
      );

      const conversation = response.data;
      setConversations((prev) => mergeConversations(prev, [conversation]));
      setSelectedConversation(conversation);
      await loadConversation(conversation.id);
    },
    [token, loadConversation],
  );

  const assignConversation = useCallback(
    async (assignedUserId: string) => {
      if (!token || !selectedConversation) {
        return;
      }

      setSavingAssign(true);
      setError(null);

      try {
        const response = await apiRequest<{ data: WhatsAppConversationRecord }>(
          `/api/admin/whatsapp/conversations/${selectedConversation.id}/assign`,
          {
            method: "PATCH",
            body: JSON.stringify({
              assigned_user_id: assignedUserId ? Number(assignedUserId) : null,
            }),
          },
          token,
        );

        setSelectedConversation(response.data);
        setConversations((prev) =>
          prev.map((conversation) => (conversation.id === response.data.id ? { ...conversation, ...response.data } : conversation)),
        );
      } catch (requestError) {
        setError(requestError instanceof ApiError ? requestError.message : "Falha ao reatribuir conversa.");
      } finally {
        setSavingAssign(false);
      }
    },
    [token, selectedConversation],
  );

  const renameConversation = useCallback(async () => {
    if (!token || !selectedConversation) {
      return;
    }

    setSavingRename(true);
    setError(null);

    try {
      const response = await apiRequest<{ data: WhatsAppConversationRecord }>(
        `/api/admin/whatsapp/conversations/${selectedConversation.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            display_name: renameDraft.trim() || null,
          }),
        },
        token,
      );

      setSelectedConversation(response.data);
      setConversations((prev) =>
        prev.map((conversation) => (conversation.id === response.data.id ? { ...conversation, ...response.data } : conversation)),
      );
      setEditingName(false);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel renomear contato.");
    } finally {
      setSavingRename(false);
    }
  }, [token, selectedConversation, renameDraft]);

  const confirmDialogAction = useCallback(async () => {
    if (!confirmDialog) {
      return;
    }

    setConfirmLoading(true);
    try {
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } finally {
      setConfirmLoading(false);
    }
  }, [confirmDialog]);

  const deleteConversation = useCallback(async () => {
    if (!token || !selectedConversation) {
      return;
    }
    setActionsMenuOpen(false);

    setDeletingConversation(true);
    setError(null);

    try {
      await apiRequest<{ message: string }>(
        `/api/admin/whatsapp/conversations/${selectedConversation.id}`,
        {
          method: "DELETE",
        },
        token,
      );

      setConversations((prev) => {
        delete messageCacheRef.current[selectedConversation.id];
        delete hasOlderMapRef.current[selectedConversation.id];
        const next = prev.filter((conversation) => conversation.id !== selectedConversation.id);
        if (next.length > 0) {
          setSelectedConversation(next[0]);
        } else {
          setSelectedConversation(null);
          setMessages([]);
        }
        return next;
      });
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel excluir conversa.");
    } finally {
      setDeletingConversation(false);
    }
  }, [token, selectedConversation]);

  const requestDeleteConversation = useCallback(() => {
    if (!selectedConversation) {
      return;
    }

    setConfirmDialog({
      title: "Excluir conversa",
      description: `Deseja realmente excluir a conversa com ${conversationDisplayName(selectedConversation)}?`,
      confirmLabel: "Excluir conversa",
      cancelLabel: "Cancelar",
      intent: "danger",
      onConfirm: async () => {
        await deleteConversation();
      },
    });
  }, [selectedConversation, deleteConversation]);

  const addTagToConversation = useCallback(async () => {
    if (!token || !selectedConversation) {
      return;
    }

    if (!tagSelection) {
      return;
    }

    setSavingTag(true);
    setError(null);
    try {
      let tagId: number | null = null;

      if (tagSelection === "__new__") {
        const name = newTagName.trim();
        if (!name) {
          setError("Informe o nome da nova tag.");
          return;
        }

        const created = await apiRequest<{ data: WhatsAppTagRecord }>(
          "/api/admin/whatsapp/tags",
          {
            method: "POST",
            body: JSON.stringify({
              name,
              color: newTagColor,
            }),
          },
          token,
        );
        tagId = created.data.id;
      } else {
        tagId = Number(tagSelection);
        if (!Number.isFinite(tagId) || tagId <= 0) {
          setError("Selecione uma tag valida.");
          return;
        }
      }

      const response = await apiRequest<{ data: WhatsAppConversationRecord }>(
        `/api/admin/whatsapp/conversations/${selectedConversation.id}/tags`,
        {
          method: "POST",
          body: JSON.stringify({ tag_id: tagId }),
        },
        token,
      );

      setSelectedConversation(response.data);
      setConversations((prev) =>
        prev.map((conversation) => (conversation.id === response.data.id ? { ...conversation, ...response.data } : conversation)),
      );
      setTagSelection("");
      setNewTagName("");
      setNewTagColor("#2563eb");
      await loadTags();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel adicionar tag.");
    } finally {
      setSavingTag(false);
    }
  }, [token, selectedConversation, tagSelection, newTagName, newTagColor, loadTags]);

  const removeTagFromConversation = useCallback(async (tagId: number) => {
    if (!token || !selectedConversation) {
      return;
    }

    setSavingTag(true);
    setError(null);
    try {
      const response = await apiRequest<{ data: WhatsAppConversationRecord }>(
        `/api/admin/whatsapp/conversations/${selectedConversation.id}/tags/${tagId}`,
        {
          method: "DELETE",
        },
        token,
      );

      setSelectedConversation(response.data);
      setConversations((prev) =>
        prev.map((conversation) => (conversation.id === response.data.id ? { ...conversation, ...response.data } : conversation)),
      );
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel remover tag.");
    } finally {
      setSavingTag(false);
    }
  }, [token, selectedConversation]);

  const createQuickReply = useCallback(async () => {
    if (!token) {
      return;
    }

    const title = quickReplyForm.title.trim();
    const content = quickReplyForm.content.trim();
    if (!title || !content) {
      return;
    }

    setCreatingQuickReply(true);
    setError(null);
    try {
      if (editingQuickReplyId) {
        await apiRequest<{ data: WhatsAppQuickReplyRecord }>(
          `/api/admin/whatsapp/quick-replies/${editingQuickReplyId}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              title,
              content,
              is_active: true,
            }),
          },
          token,
        );
      } else {
        await apiRequest<{ data: WhatsAppQuickReplyRecord }>(
          "/api/admin/whatsapp/quick-replies",
          {
            method: "POST",
            body: JSON.stringify({
              title,
              content,
              is_active: true,
            }),
          },
          token,
        );
      }

      setQuickReplyForm({ title: "", content: "" });
      setEditingQuickReplyId(null);
      await loadQuickReplies();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel salvar resposta rapida.");
    } finally {
      setCreatingQuickReply(false);
    }
  }, [token, quickReplyForm, loadQuickReplies, editingQuickReplyId]);

  const deleteQuickReply = useCallback(async (id: number) => {
    if (!token) {
      return;
    }

    try {
      await apiRequest(`/api/admin/whatsapp/quick-replies/${id}`, { method: "DELETE" }, token);
      await loadQuickReplies();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel remover resposta rapida.");
    }
  }, [token, loadQuickReplies]);

  const requestDeleteQuickReply = useCallback((reply: WhatsAppQuickReplyRecord) => {
    setConfirmDialog({
      title: "Excluir mensagem rapida",
      description: `A mensagem rapida "${reply.title}" sera removida permanentemente.`,
      confirmLabel: "Excluir",
      cancelLabel: "Cancelar",
      intent: "danger",
      onConfirm: async () => {
        await deleteQuickReply(reply.id);
      },
    });
  }, [deleteQuickReply]);

  const createTag = useCallback(async () => {
    if (!token) {
      return;
    }

    const name = tagForm.name.trim();
    if (!name) {
      return;
    }

    setCreatingTag(true);
    setError(null);
    try {
      await apiRequest(
        "/api/admin/whatsapp/tags",
        {
          method: "POST",
          body: JSON.stringify({
            name,
            color: tagForm.color,
          }),
        },
        token,
      );
      setTagForm({ name: "", color: "#2563eb" });
      await loadTags();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel criar tag.");
    } finally {
      setCreatingTag(false);
    }
  }, [token, tagForm, loadTags]);

  const deleteTag = useCallback(async (id: number) => {
    if (!token) {
      return;
    }

    try {
      await apiRequest(`/api/admin/whatsapp/tags/${id}`, { method: "DELETE" }, token);
      await loadTags();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Nao foi possivel remover tag.");
    }
  }, [token, loadTags]);

  const requestDeleteTag = useCallback((tag: WhatsAppTagRecord) => {
    setConfirmDialog({
      title: "Excluir tag",
      description: `A tag "${tag.name}" sera removida e nao podera ser recuperada.`,
      confirmLabel: "Excluir tag",
      cancelLabel: "Cancelar",
      intent: "danger",
      onConfirm: async () => {
        await deleteTag(tag.id);
      },
    });
  }, [deleteTag]);

  const filterChips = useMemo(
    () => [
      { key: "all" as const, label: "Todos" },
      { key: "unread" as const, label: "Nao lidas" },
      { key: "mine" as const, label: "Minhas" },
      { key: "unassigned" as const, label: "Sem responsavel" },
    ],
    [],
  );

  return (
    <PageShell>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <section className="grid h-[calc(100vh-150px)] min-h-0 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[340px_1fr]">
        <aside className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">Conversas</h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                title="Configuracoes do WhatsApp"
              >
                <Settings2 size={14} />
              </button>
              <button
                type="button"
                onClick={() => setNewConversationOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-600"
              >
                <Plus size={14} />
                Nova
              </button>
            </div>
          </div>

          <div className="mb-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
            <Search size={14} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar conversa"
              className="w-full bg-transparent text-sm text-slate-700 outline-none"
            />
          </div>

          <div className="mb-2 flex flex-wrap gap-1">
            {filterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setActiveFilter(chip.key)}
                className={`rounded-full border px-2 py-1 text-xs ${
                  activeFilter === chip.key
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="mb-3 flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={assignedUserFilter}
              onChange={(event) => setAssignedUserFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-700"
            >
              <option value="">Por vendedor/atendente</option>
              {users.map((seller) => (
                <option key={`seller-${seller.id}`} value={seller.id}>
                  {seller.name}
                </option>
              ))}
            </select>
          </div>

          {loadingConversations && conversations.length === 0 ? (
            <LoadingState label="Carregando conversas..." className="p-4" />
          ) : conversations.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
              Nenhuma conversa encontrada.
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <WhatsAppConversationList
              conversations={conversations}
              selectedConversationId={selectedConversation?.id ?? null}
              onSelect={(conversation) => {
                setSelectedConversation({
                  ...conversation,
                  unread_count: 0,
                });
                setConversations((prev) =>
                  prev.map((item) =>
                    item.id === conversation.id
                      ? {
                          ...item,
                          unread_count: 0,
                        }
                      : item,
                  ),
                );
              }}
            />
          </div>
          )}
        </aside>

        <section className="min-h-0 overflow-hidden">
          <WhatsAppConversationView
            conversation={selectedConversation}
            messages={messages}
            loading={loadingMessages}
            loadingOlder={loadingOlderMessages}
            hasOlderMessages={selectedConversation ? (hasOlderMapRef.current[selectedConversation.id] ?? true) : false}
            onLoadOlderMessages={loadOlderMessages}
            headerActions={
              selectedConversation ? (
                <>
                  {editingName ? (
                    <>
                      <input
                        value={renameDraft}
                        onChange={(event) => setRenameDraft(event.target.value)}
                        className="w-40 rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-700"
                        placeholder="Nome do contato"
                        maxLength={255}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          void renameConversation();
                        }}
                        disabled={savingRename}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                        title="Salvar nome"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingName(false);
                          setRenameDraft(selectedConversation.contact?.display_name ?? selectedConversation.subject ?? "");
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                        title="Cancelar"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <></>
                  )}

                  <select
                    value={selectedConversation.assigned_user_id ? String(selectedConversation.assigned_user_id) : ""}
                    onChange={(event) => {
                      void assignConversation(event.target.value);
                    }}
                    disabled={savingAssign}
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-700 disabled:opacity-60"
                    title="Responsavel pela conversa"
                  >
                    <option value="">Sem responsavel</option>
                    {users.map((seller) => (
                      <option key={`assign-${seller.id}`} value={seller.id}>
                        {seller.name}
                      </option>
                    ))}
                    </select>

                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-2 py-1">
                    <Tag size={13} className="text-slate-500" />
                    <select
                      value={tagSelection}
                      onChange={(event) => setTagSelection(event.target.value)}
                      className="w-36 bg-transparent text-xs text-slate-700 outline-none"
                    >
                      <option value="">Selecionar tag</option>
                      {allTags.map((tag) => (
                        <option key={`conv-tag-opt-${tag.id}`} value={tag.id}>
                          {tag.name}
                        </option>
                      ))}
                      <option value="__new__">+ Cadastrar nova</option>
                    </select>
                    {tagSelection === "__new__" && (
                      <>
                        <input
                          value={newTagName}
                          onChange={(event) => setNewTagName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void addTagToConversation();
                            }
                          }}
                          placeholder="Nome"
                          className="w-24 rounded border border-slate-200 px-1.5 py-1 text-xs text-slate-700 outline-none"
                        />
                        <input
                          type="color"
                          value={newTagColor}
                          onChange={(event) => setNewTagColor(event.target.value)}
                          className="h-6 w-7 rounded border border-slate-300 bg-transparent p-0.5"
                          title="Cor da nova tag"
                        />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        void addTagToConversation();
                      }}
                      disabled={savingTag || !tagSelection || (tagSelection === "__new__" && !newTagName.trim())}
                      className="rounded-md bg-blue-600 px-1.5 py-1 text-[10px] font-semibold text-white disabled:opacity-60"
                    >
                      +
                    </button>
                  </div>

                  <div className="relative" ref={actionsMenuRef}>
                    <button
                      type="button"
                      onClick={() => setActionsMenuOpen((prev) => !prev)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                      title="Acoes"
                    >
                      <MoreVertical size={15} />
                    </button>

                    {actionsMenuOpen && (
                      <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingName(true);
                            setActionsMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
                        >
                          <Pencil size={13} />
                          Renomear contato
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            requestDeleteConversation();
                          }}
                          disabled={deletingConversation}
                          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          <Trash2 size={13} />
                          Excluir conversa
                        </button>
                      </div>
                    )}
                  </div>

                  {(selectedConversation.tags ?? []).length > 0 && (
                    <div className="flex max-w-[360px] flex-wrap items-center gap-1">
                      {(selectedConversation.tags ?? []).map((tag) => (
                        <button
                          key={`tag-${tag.id}`}
                          type="button"
                          onClick={() => {
                            void removeTagFromConversation(tag.id);
                          }}
                          title="Clique para remover tag"
                          className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700"
                        >
                          <span>{tag.name}</span>
                          <X size={10} />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : null
            }
            onSendText={sendText}
            onSendImage={sendImage}
            onSendDocument={sendDocument}
            onSendAudio={sendAudio}
            quickReplies={quickReplies}
            onOpenLeadCard={() => {
              if (!selectedConversation?.lead_id) {
                return;
              }

              const pipeline = selectedConversation.lead?.pipeline || "comercial";
              navigate(`/admin/pipes?pipe=${pipeline}&lead=${selectedConversation.lead_id}`);
            }}
          />
        </section>
      </section>

      <WhatsAppStartConversationModal
        open={newConversationOpen}
        onClose={() => setNewConversationOpen(false)}
        onStart={startConversation}
      />

      {settingsOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Configuracoes do WhatsApp</h3>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <X size={15} />
              </button>
            </div>

            <div className="mb-3 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSettingsTab("tags")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  settingsTab === "tags" ? "bg-blue-600 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Tags
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab("quickReplies")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  settingsTab === "quickReplies" ? "bg-blue-600 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Mensagens rapidas
              </button>
            </div>

            {settingsTab === "tags" ? (
              <>
                <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_120px_auto]">
                  <input
                    value={tagForm.name}
                    onChange={(event) => setTagForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Texto da tag"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="color"
                    value={tagForm.color}
                    onChange={(event) => setTagForm((prev) => ({ ...prev, color: event.target.value }))}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void createTag();
                    }}
                    disabled={creatingTag}
                    className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60"
                  >
                    {creatingTag ? "Salvando..." : "Salvar tag"}
                  </button>
                </div>

                <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
                  {allTags.length === 0 && (
                    <p className="px-2 py-3 text-sm text-slate-500">Nenhuma tag cadastrada.</p>
                  )}
                  {allTags.map((tag) => (
                    <div key={`tag-setting-${tag.id}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-full border border-slate-200" style={{ backgroundColor: tag.color ?? "#2563eb" }} />
                        <span className="text-sm font-medium text-slate-800">{tag.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          requestDeleteTag(tag);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <input
                    value={quickReplyForm.title}
                    onChange={(event) => setQuickReplyForm((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="Titulo da resposta"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void createQuickReply();
                    }}
                    disabled={creatingQuickReply}
                    className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60"
                  >
                    {creatingQuickReply
                      ? "Salvando..."
                      : editingQuickReplyId
                        ? "Salvar edicao"
                        : "Salvar resposta"}
                  </button>
                </div>
                <textarea
                  value={quickReplyForm.content}
                  onChange={(event) => setQuickReplyForm((prev) => ({ ...prev, content: event.target.value }))}
                  placeholder="Texto da resposta (use {primeiro_nome} e {nome_completo})"
                  rows={4}
                  className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {editingQuickReplyId && (
                  <div className="mb-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingQuickReplyId(null);
                        setQuickReplyForm({ title: "", content: "" });
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancelar edicao
                    </button>
                  </div>
                )}

                <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
                  {quickReplies.length === 0 && (
                    <p className="px-2 py-3 text-sm text-slate-500">Nenhuma resposta rapida cadastrada.</p>
                  )}
                  {quickReplies.map((reply) => (
                    <div key={`reply-${reply.id}`} className="rounded-lg border border-slate-200 bg-white p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{reply.title}</p>
                          <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{reply.content}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuickReplyId(reply.id);
                              setQuickReplyForm({
                                title: reply.title ?? "",
                                content: reply.content ?? "",
                              });
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                            title="Editar resposta rapida"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              requestDeleteQuickReply(reply);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-300 text-red-700 hover:bg-red-50"
                            title="Excluir resposta rapida"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <AlertModal
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title ?? "Confirmar acao"}
        description={confirmDialog?.description}
        confirmLabel={confirmDialog?.confirmLabel}
        cancelLabel={confirmDialog?.cancelLabel}
        intent={confirmDialog?.intent}
        loading={confirmLoading}
        onConfirm={confirmDialogAction}
        onClose={() => {
          if (confirmLoading) {
            return;
          }

          setConfirmDialog(null);
        }}
      />
    </PageShell>
  );
}
