import type { WhatsAppConversationRecord } from "../../types/admin";
import { conversationDisplayName, formatDateTime, normalizeConversationPreview } from "./utils";
import { User } from "lucide-react";

type Props = {
  conversations: WhatsAppConversationRecord[];
  selectedConversationId?: number | null;
  onSelect: (conversation: WhatsAppConversationRecord) => void;
};

export default function WhatsAppConversationList({ conversations, selectedConversationId, onSelect }: Props) {
  return (
    <div className="space-y-1">
      {conversations.map((conversation) => {
        const selected = selectedConversationId === conversation.id;
        const previewText = normalizeConversationPreview(conversation.last_message_preview);
        const secondaryText = conversation.phone || conversation.remote_jid;

        return (
          <button
            key={conversation.id}
            type="button"
            onClick={() => onSelect(conversation)}
            className={`w-full rounded-lg border px-2.5 py-2 text-left transition ${
              selected
                ? "border-blue-300 bg-blue-50"
                : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-slate-500">
                  {conversation.contact?.profile_picture_url ? (
                    <img
                      src={conversation.contact.profile_picture_url}
                      alt={conversationDisplayName(conversation)}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <User size={14} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{conversationDisplayName(conversation)}</p>
                  <p className="truncate text-xs text-slate-500">{secondaryText}</p>
                </div>
              </div>
              <span className="shrink-0 text-[11px] text-slate-400">{formatDateTime(conversation.last_message_at)}</span>
            </div>

            <div className="mt-0.5 flex items-center justify-between gap-2">
              <p className="truncate text-xs text-slate-500">{previewText}</p>
              {conversation.unread_count > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-semibold text-white">
                  {conversation.unread_count}
                </span>
              )}
            </div>

            <div className="mt-0.5 flex items-center justify-between text-[11px] text-slate-400">
              <span className="truncate">{conversation.assigned_user?.name ?? "Sem responsável"}</span>
            </div>

            {(conversation.tags ?? []).length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {(conversation.tags ?? []).slice(0, 3).map((tag) => (
                  <span
                    key={`conversation-${conversation.id}-tag-${tag.id}`}
                    className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                    style={{
                      borderColor: `${tag.color ?? "#2563eb"}40`,
                      backgroundColor: `${tag.color ?? "#2563eb"}20`,
                      color: tag.color ?? "#1d4ed8",
                    }}
                  >
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: tag.color ?? "#2563eb" }}
                    />
                    {tag.name}
                  </span>
                ))}
                {(conversation.tags?.length ?? 0) > 3 && (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    +{(conversation.tags?.length ?? 0) - 3}
                  </span>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
