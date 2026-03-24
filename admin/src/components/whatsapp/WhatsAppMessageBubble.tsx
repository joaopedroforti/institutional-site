import { useEffect, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, Check, Clock3, FileDown } from "lucide-react";
import type { WhatsAppMessageRecord } from "../../types/admin";
import { formatTime } from "./utils";
import { API_BASE_URL } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import WhatsAppAudioPlayer from "./WhatsAppAudioPlayer";

type Props = {
  message: WhatsAppMessageRecord;
};

export default function WhatsAppMessageBubble({ message }: Props) {
  const isOutbound = message.direction === "outbound";
  const isUnknownUnsupportedMessage = (message.body ?? "").trim() === "[UNKNOWN]";
  const isUnsupportedStickerMessage = (message.body ?? "").trim() === "[STICKER]" || message.message_type === "sticker";
  const normalizedStatus = String(message.status ?? "").toUpperCase();
  const [imageOpen, setImageOpen] = useState(false);
  const [resolvedMediaUrl, setResolvedMediaUrl] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState(false);
  const [loadNonce, setLoadNonce] = useState(0);
  const { token } = useAuth();

  const requiresProxy = useMemo(() => {
    if (!message.media_url) {
      return false;
    }

    return !message.media_url.startsWith("data:");
  }, [message.media_url]);

  useEffect(() => {
    setResolvedMediaUrl(null);
    setMediaError(false);

    if (!message.media_url) {
      return;
    }

    if (!requiresProxy) {
      setResolvedMediaUrl(message.media_url);
      return;
    }

    if (!token) {
      setMediaError(true);
      return;
    }

    let active = true;
    let blobUrl: string | null = null;

    const load = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/whatsapp/messages/${message.id}/media`, {
          headers: {
            Accept: "*/*",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Falha ao carregar midia");
        }

        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);
        if (active) {
          setResolvedMediaUrl(blobUrl);
        }
      } catch {
        if (active) {
          setMediaError(true);
        }
      }
    };

    void load();

    return () => {
      active = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [message.id, message.media_url, requiresProxy, token, loadNonce]);

  const displayMediaUrl = useMemo(() => {
    if (!message.media_url) {
      return null;
    }

    if (requiresProxy) {
      return resolvedMediaUrl;
    }

    return message.media_url;
  }, [message.media_url, requiresProxy, resolvedMediaUrl]);

  return (
    <>
      <div className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
        <div
          className={`max-w-[75%] rounded-2xl border px-3 py-2 text-sm ${
            isOutbound
              ? "border-blue-200 bg-blue-600 text-white"
              : "border-slate-200 bg-white text-slate-700"
          }`}
        >
          {message.message_type === "image" && message.media_url && (
            <button
              type="button"
              onClick={() => {
                if (displayMediaUrl) {
                  setImageOpen(true);
                } else if (mediaError) {
                  setLoadNonce((prev) => prev + 1);
                }
              }}
              className="mb-2 block overflow-hidden rounded-lg border border-slate-200/50"
              title="Clique para ampliar"
            >
              {!displayMediaUrl && !mediaError ? (
                <div className="flex h-28 w-36 items-center justify-center text-xs text-slate-500">Carregando imagem...</div>
              ) : mediaError && !displayMediaUrl ? (
                <div className="flex h-28 w-36 items-center justify-center text-center text-xs text-slate-500">
                  Falha ao carregar imagem. Clique para tentar novamente.
                </div>
              ) : (
                <img
                  src={displayMediaUrl ?? ""}
                  alt="Imagem"
                  className="max-h-56 rounded-lg object-contain transition hover:scale-[1.01]"
                />
              )}
            </button>
          )}

          {message.message_type === "audio" && (displayMediaUrl || message.media_url) && (
            <div className="mb-2">
              {displayMediaUrl ? (
                <WhatsAppAudioPlayer src={displayMediaUrl} isOutbound={isOutbound} />
              ) : (
                <p className={`text-xs ${isOutbound ? "text-blue-100" : "text-slate-500"}`}>Carregando audio...</p>
              )}
            </div>
          )}

          {message.message_type === "document" && (
            <div className={`mb-2 rounded-lg border px-2.5 py-2 ${isOutbound ? "border-blue-300/70 bg-blue-500/30" : "border-slate-200 bg-slate-50"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className={`truncate text-xs font-semibold ${isOutbound ? "text-white" : "text-slate-800"}`}>
                    {message.media_filename || "Documento"}
                  </p>
                  <p className={`text-[11px] ${isOutbound ? "text-blue-100" : "text-slate-500"}`}>
                    {message.media_mime || "arquivo"}
                  </p>
                </div>
                {displayMediaUrl && (
                  <a
                    href={displayMediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                      isOutbound ? "border-white/30 text-white hover:bg-white/15" : "border-slate-300 text-slate-700 hover:bg-slate-100"
                    }`}
                    title="Abrir/baixar documento"
                  >
                    <FileDown size={14} />
                  </a>
                )}
              </div>
            </div>
          )}

          {isUnknownUnsupportedMessage ? (
            <div
              className={`mb-1 flex items-start gap-2 rounded-lg border px-2.5 py-2 ${
                isOutbound ? "border-amber-200/70 bg-amber-100/10 text-amber-50" : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <p className="italic leading-5">Essa mensagem não é suportada pelo sistema WEB, por favor verifique em seu dispositivo</p>
            </div>
          ) : isUnsupportedStickerMessage ? (
            <div
              className={`mb-1 flex items-start gap-2 rounded-lg border px-2.5 py-2 ${
                isOutbound ? "border-amber-200/70 bg-amber-100/10" : "border-amber-200 bg-amber-50"
              }`}
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <p className="italic leading-5">Você recebeu um sticker incompativel com o sistema. Para vizualizar, acesse pelo dispositivo movel</p>
            </div>
          ) : (
            message.body && <p className="whitespace-pre-wrap break-words leading-5">{message.body}</p>
          )}

          {!message.body && message.message_type !== "text" && message.message_type !== "sticker" && (
            <p className={`text-xs ${isOutbound ? "text-blue-100" : "text-slate-500"}`}>
              [{message.message_type.toUpperCase()}]
            </p>
          )}

          <div className={`mt-1 flex items-center justify-end text-[11px] ${isOutbound ? "text-blue-100" : "text-slate-400"}`}>
            <span>{formatTime(message.sent_at ?? message.created_at)}</span>
            {isOutbound && message.status && (
              <span className="ml-2 inline-flex items-center gap-1">
                {normalizedStatus === "PENDING" && (
                  <>
                    <Clock3 size={12} />
                    <span>Enviando</span>
                  </>
                )}
                {normalizedStatus === "FAILED" && (
                  <>
                    <AlertCircle size={12} />
                    <span>Falha</span>
                  </>
                )}
                {normalizedStatus !== "PENDING" && normalizedStatus !== "FAILED" && <Check size={12} />}
              </span>
            )}
          </div>
        </div>
      </div>

      {imageOpen && displayMediaUrl && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setImageOpen(false)}
        >
          <img
            src={displayMediaUrl}
            alt="Imagem ampliada"
            className="max-h-[92vh] max-w-[92vw] rounded-xl border border-white/20 bg-white object-contain"
          />
        </div>
      )}
    </>
  );
}
