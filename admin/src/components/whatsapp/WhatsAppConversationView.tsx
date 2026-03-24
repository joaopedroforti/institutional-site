import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import type { WhatsAppConversationRecord, WhatsAppMessageRecord } from "../../types/admin";
import WhatsAppMessageBubble from "./WhatsAppMessageBubble";
import WhatsAppComposer from "./WhatsAppComposer";
import { conversationDisplayName } from "./utils";
import { User, X } from "lucide-react";

type Props = {
  conversation: WhatsAppConversationRecord | null;
  messages: WhatsAppMessageRecord[];
  loading?: boolean;
  loadingOlder?: boolean;
  hasOlderMessages?: boolean;
  disabled?: boolean;
  headerActions?: ReactNode;
  onLoadOlderMessages?: () => Promise<void>;
  onSendText: (text: string) => Promise<void>;
  onSendImage: (payload: { base64: string; mime: string; filename?: string; caption?: string }) => Promise<void>;
  onSendDocument: (payload: { base64: string; mime: string; filename?: string; caption?: string }) => Promise<void>;
  onSendAudio: (payload: { base64: string; mime: string; filename?: string }) => Promise<void>;
  quickReplies?: Array<{ id: number; title: string; content: string }>;
};

export default function WhatsAppConversationView({
  conversation,
  messages,
  loading,
  loadingOlder,
  hasOlderMessages,
  disabled,
  headerActions,
  onLoadOlderMessages,
  onSendText,
  onSendImage,
  onSendDocument,
  onSendAudio,
  quickReplies,
}: Props) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [avatarZoomOpen, setAvatarZoomOpen] = useState(false);
  const loadingOlderRef = useRef(false);
  const preserveScrollRef = useRef<{ top: number; height: number } | null>(null);

  const title = useMemo(() => {
    if (!conversation) {
      return "Selecione uma conversa";
    }

    return conversationDisplayName(conversation);
  }, [conversation]);

  useEffect(() => {
    const container = listRef.current;
    if (!container) {
      return;
    }

    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (nearBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, conversation?.id]);

  useEffect(() => {
    const container = listRef.current;
    if (!container) {
      return;
    }

    if (preserveScrollRef.current) {
      const previous = preserveScrollRef.current;
      preserveScrollRef.current = null;
      const diff = container.scrollHeight - previous.height;
      container.scrollTop = previous.top + diff;
      return;
    }
  }, [messages.length]);

  useEffect(() => {
    const container = listRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [conversation?.id]);

  const handleScroll = async () => {
    const container = listRef.current;
    if (!container || !onLoadOlderMessages || !hasOlderMessages || loadingOlderRef.current || loadingOlder) {
      return;
    }

    if (container.scrollTop > 64) {
      return;
    }

    loadingOlderRef.current = true;
    preserveScrollRef.current = {
      top: container.scrollTop,
      height: container.scrollHeight,
    };
    try {
      await onLoadOlderMessages();
    } finally {
      loadingOlderRef.current = false;
    }
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (conversation?.contact?.profile_picture_url) {
                setAvatarZoomOpen(true);
              }
            }}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-slate-500"
            title={conversation?.contact?.profile_picture_url ? "Ampliar foto" : "Sem foto"}
          >
            {conversation?.contact?.profile_picture_url ? (
              <img
                src={conversation.contact.profile_picture_url}
                alt={title}
                className="h-full w-full object-cover"
              />
            ) : (
              <User size={16} />
            )}
          </button>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-900">{title}</h3>
            {conversation && <p className="truncate text-xs text-slate-500">{conversation.phone || conversation.remote_jid}</p>}
          </div>
        </div>
        {conversation && <div className="flex items-center gap-2">{headerActions}</div>}
      </div>

      <div ref={listRef} onScroll={() => { void handleScroll(); }} className="flex-1 space-y-3 overflow-y-auto p-4">
        {!conversation && <p className="text-sm text-slate-500">Selecione uma conversa para começar.</p>}
        {conversation && loading && <p className="text-sm text-slate-500">Carregando mensagens...</p>}
        {conversation && !loading && loadingOlder && (
          <p className="text-center text-xs text-slate-400">Carregando mensagens antigas...</p>
        )}
        {conversation && !loading && messages.length === 0 && (
          <p className="text-sm text-slate-500">Nenhuma mensagem ainda. Envie a primeira mensagem.</p>
        )}
        {messages.map((message) => (
          <WhatsAppMessageBubble key={message.id} message={message} />
        ))}
      </div>

      <WhatsAppComposer
        disabled={!conversation || disabled}
        onSendText={onSendText}
        onSendImage={onSendImage}
        onSendDocument={onSendDocument}
        onSendAudio={onSendAudio}
        quickReplies={quickReplies}
      />

      {avatarZoomOpen && conversation?.contact?.profile_picture_url && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setAvatarZoomOpen(false);
            }
          }}
        >
          <div className="relative max-h-full max-w-3xl rounded-2xl border border-white/20 bg-white/5 p-2">
            <button
              type="button"
              onClick={() => setAvatarZoomOpen(false)}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/70 text-white hover:bg-slate-900"
            >
              <X size={16} />
            </button>
            <img
              src={conversation.contact.profile_picture_url}
              alt={title}
              className="max-h-[80vh] w-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
