import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { MessageCircleMore, X } from "lucide-react";
import { ApiError, apiRequest } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import type { WhatsAppConversationRecord, WhatsAppMessageRecord } from "../../types/admin";
import { conversationDisplayName, normalizeConversationPreview } from "./utils";

type RealtimeUpdatesResponse = {
  data: {
    messages: WhatsAppMessageRecord[];
    conversations: WhatsAppConversationRecord[];
    last_message_id: number;
  };
};

type ToastPayload = {
  messageId: number;
  conversationId: number;
  title: string;
  photoUrl: string | null;
  preview: string;
};

const LAST_SEEN_MESSAGE_ID_KEY = "forticorp_whatsapp_notifier_last_seen_message_id_v1";

function previewFromMessage(message: WhatsAppMessageRecord): string {
  const body = (message.body ?? "").trim();
  if (body.length > 0) {
    return normalizeConversationPreview(body);
  }

  if (message.message_type === "image") {
    return "Imagem";
  }
  if (message.message_type === "audio") {
    return "Áudio";
  }
  if (message.message_type === "document") {
    return "Documento";
  }
  if (message.message_type === "video") {
    return "Vídeo";
  }
  if (message.message_type === "sticker") {
    return "Sticker";
  }

  return "Nova mensagem";
}

function playNotificationSound(): void {
  try {
    const context = new AudioContext();
    const now = context.currentTime;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    gain.connect(context.destination);

    const oscA = context.createOscillator();
    oscA.type = "sine";
    oscA.frequency.setValueAtTime(880, now);
    oscA.connect(gain);
    oscA.start(now);
    oscA.stop(now + 0.14);

    const oscB = context.createOscillator();
    oscB.type = "sine";
    oscB.frequency.setValueAtTime(660, now + 0.16);
    oscB.connect(gain);
    oscB.start(now + 0.16);
    oscB.stop(now + 0.32);

    window.setTimeout(() => {
      void context.close();
    }, 450);
  } catch {
    // ignore sound playback issues (autoplay restrictions, unsupported context)
  }
}

export default function GlobalWhatsAppNotifier() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [suppressInLeadWhatsAppModal, setSuppressInLeadWhatsAppModal] = useState(false);
  const afterMessageIdRef = useRef(0);
  const newestNotifiedMessageIdRef = useRef(0);

  const shouldSuppress = useMemo(() => {
    if (location.pathname.startsWith("/admin/whatsapp")) {
      return true;
    }

    if (suppressInLeadWhatsAppModal) {
      return true;
    }

    return false;
  }, [location.pathname, suppressInLeadWhatsAppModal]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(LAST_SEEN_MESSAGE_ID_KEY);
      const parsed = raw ? Number(raw) : 0;
      if (Number.isFinite(parsed) && parsed > 0) {
        afterMessageIdRef.current = parsed;
        newestNotifiedMessageIdRef.current = parsed;
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const onContext = (event: Event) => {
      const customEvent = event as CustomEvent<{ suppressGlobalNotifier?: boolean }>;
      setSuppressInLeadWhatsAppModal(Boolean(customEvent.detail?.suppressGlobalNotifier));
    };

    window.addEventListener("forticorp:whatsapp-context", onContext as EventListener);

    return () => {
      window.removeEventListener("forticorp:whatsapp-context", onContext as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setToast(null);
      return;
    }

    let active = true;
    let inFlight = false;
    let activeController: AbortController | null = null;

    const poll = async () => {
      if (inFlight) {
        return;
      }

      inFlight = true;
      activeController = new AbortController();

      try {
        const params = new URLSearchParams();
        params.set("after_message_id", String(afterMessageIdRef.current));
        const response = await apiRequest<RealtimeUpdatesResponse>(
          `/api/admin/whatsapp/realtime/updates?${params.toString()}`,
          { signal: activeController.signal },
          token,
        );

        if (!active) {
          return;
        }

        const lastMessageId = Number(response.data.last_message_id ?? afterMessageIdRef.current);
        if (Number.isFinite(lastMessageId) && lastMessageId > afterMessageIdRef.current) {
          afterMessageIdRef.current = lastMessageId;
          try {
            sessionStorage.setItem(LAST_SEEN_MESSAGE_ID_KEY, String(lastMessageId));
          } catch {
            // ignore
          }
        }

        const incoming = (response.data.messages ?? [])
          .filter((message) => message.direction === "inbound" && !message.from_me)
          .sort((a, b) => a.id - b.id);

        if (incoming.length === 0) {
          return;
        }

        const latest = incoming[incoming.length - 1];
        if (!latest || latest.id <= newestNotifiedMessageIdRef.current) {
          return;
        }

        newestNotifiedMessageIdRef.current = latest.id;

        if (shouldSuppress) {
          return;
        }

        const conversation = (response.data.conversations ?? []).find(
          (item) => item.id === latest.whatsapp_conversation_id,
        );

        setToast({
          messageId: latest.id,
          conversationId: latest.whatsapp_conversation_id,
          title: conversation ? conversationDisplayName(conversation) : (latest.sender_name ?? "Novo contato"),
          photoUrl: conversation?.contact?.profile_picture_url ?? null,
          preview: previewFromMessage(latest),
        });
        playNotificationSound();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setToast(null);
        }
      } finally {
        inFlight = false;
      }
    };

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 5000);

    return () => {
      active = false;
      activeController?.abort();
      window.clearInterval(timer);
    };
  }, [token, shouldSuppress]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToast((current) => (current?.messageId === toast.messageId ? null : current));
    }, 12000);

    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast) {
    return null;
  }

  return (
    <button
      type="button"
      className="fixed bottom-4 left-4 z-[120] flex w-[min(360px,calc(100vw-2rem))] items-start gap-3 rounded-2xl border border-emerald-200 bg-white px-3 py-3 text-left shadow-xl ring-1 ring-emerald-100 transition hover:-translate-y-0.5 hover:shadow-2xl"
      onClick={() => {
        navigate(`/admin/whatsapp?conversation=${toast.conversationId}`);
        setToast(null);
      }}
      title="Abrir conversa no WhatsApp"
    >
      <div className="relative mt-0.5">
        <span className="absolute -inset-1 rounded-full bg-emerald-300/55 animate-ping" aria-hidden="true" />
        <span className="relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
          {toast.photoUrl ? (
            <img src={toast.photoUrl} alt={toast.title} className="h-full w-full object-cover" />
          ) : (
            <MessageCircleMore size={17} />
          )}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{toast.title}</p>
        <p className="mt-0.5 truncate text-sm text-slate-600">{toast.preview}</p>
      </div>

      <span
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setToast(null);
        }}
        aria-label="Fechar alerta"
      >
        <X size={14} />
      </span>
    </button>
  );
}
