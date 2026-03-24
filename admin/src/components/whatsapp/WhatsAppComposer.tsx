import { type ChangeEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { FileText, ImagePlus, Mic, SendHorizonal, Square } from "lucide-react";

type Props = {
  disabled?: boolean;
  onSendText: (text: string) => Promise<void>;
  onSendImage: (payload: { base64: string; mime: string; filename?: string; caption?: string }) => Promise<void>;
  onSendDocument: (payload: { base64: string; mime: string; filename?: string; caption?: string }) => Promise<void>;
  onSendAudio: (payload: { base64: string; mime: string; filename?: string }) => Promise<void>;
  quickReplies?: Array<{ id: number; title: string; content: string }>;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
    reader.readAsDataURL(file);
  });
}

export default function WhatsAppComposer({ disabled, onSendText, onSendImage, onSendDocument, onSendAudio, quickReplies = [] }: Props) {
  const TEXTAREA_MAX_HEIGHT = 220;
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<{
    kind: "image";
    base64: string;
    mime: string;
    filename?: string;
    previewUrl: string;
  } | null>(null);
  const [pendingDocument, setPendingDocument] = useState<{
    kind: "document";
    base64: string;
    mime: string;
    filename?: string;
    size: number;
  } | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);

  const focusTextArea = () => {
    window.setTimeout(() => {
      if (!disabled) {
        textAreaRef.current?.focus();
      }
    }, 0);
  };

  const resizeTextArea = () => {
    const element = textAreaRef.current;
    if (!element) {
      return;
    }

    element.style.height = "auto";
    const nextHeight = Math.min(Math.max(element.scrollHeight, 40), TEXTAREA_MAX_HEIGHT);
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > TEXTAREA_MAX_HEIGHT ? "auto" : "hidden";
  };

  const slashQuery = text.trim().startsWith("/") ? text.trim().slice(1).toLowerCase() : null;
  const filteredQuickReplies =
    slashQuery !== null
      ? quickReplies
          .filter((reply) =>
            `${reply.title} ${reply.content}`.toLowerCase().includes(slashQuery),
          )
          .slice(0, 8)
      : [];

  const sendMessage = async () => {
    const content = text.trim();
    const hasPendingImage = Boolean(pendingImage);
    const hasPendingDocument = Boolean(pendingDocument);

    if ((!content && !hasPendingImage && !hasPendingDocument) || sending || disabled) {
      return;
    }

    setSending(true);
    try {
      if (pendingImage) {
        await onSendImage({
          base64: pendingImage.base64,
          mime: pendingImage.mime,
          filename: pendingImage.filename,
          caption: content || undefined,
        });
        setPendingImage(null);
      } else if (pendingDocument) {
        await onSendDocument({
          base64: pendingDocument.base64,
          mime: pendingDocument.mime,
          filename: pendingDocument.filename,
          caption: content || undefined,
        });
        setPendingDocument(null);
      } else {
        await onSendText(content);
      }
      setText("");
    } finally {
      setSending(false);
      focusTextArea();
    }
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || disabled || sending) {
      return;
    }

    setSending(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const [, base64 = ""] = dataUrl.split(",");
      setPendingImage({
        kind: "image",
        base64,
        mime: file.type || "image/jpeg",
        filename: file.name,
        previewUrl: dataUrl,
      });
      setPendingDocument(null);
    } finally {
      setSending(false);
    }
  };

  const handleDocumentChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || disabled || sending) {
      return;
    }

    setSending(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const [, base64 = ""] = dataUrl.split(",");
      setPendingDocument({
        kind: "document",
        base64,
        mime: file.type || "application/octet-stream",
        filename: file.name,
        size: file.size,
      });
      setPendingImage(null);
    } finally {
      setSending(false);
    }
  };

  const stopMediaStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const startRecording = async () => {
    if (disabled || sending || recording) {
      return;
    }

    setRecordError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const preferredMimeTypes = [
        "audio/webm;codecs=opus",
        "audio/ogg;codecs=opus",
        "audio/webm",
        "audio/ogg",
      ];
      const mimeType = preferredMimeTypes.find((type) => MediaRecorder.isTypeSupported(type));

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(mediaChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        mediaChunksRef.current = [];
        stopMediaStream();

        if (blob.size === 0) {
          setRecording(false);
          setRecordError("Nao foi possivel capturar audio.");
          return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = String(reader.result ?? "");
          const [, base64 = ""] = dataUrl.split(",");

          setSending(true);
          try {
            await onSendAudio({
              base64,
              mime: blob.type || "audio/webm",
              filename: `audio-${Date.now()}.webm`,
            });
          } finally {
            setSending(false);
            setRecording(false);
          }
        };
        reader.onerror = () => {
          setRecording(false);
          setRecordError("Falha ao processar audio gravado.");
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      stopMediaStream();
      setRecording(false);
      setRecordError("Permissao de microfone negada ou indisponivel.");
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      setRecording(false);
      stopMediaStream();
      return;
    }

    recorder.stop();
  };

  const handleTextKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    if (event.shiftKey) {
      return;
    }

    event.preventDefault();
    void sendMessage();
  };

  useEffect(() => {
    if (!disabled) {
      focusTextArea();
    }
  }, [disabled]);

  useEffect(() => {
    resizeTextArea();
  }, [text]);

  useEffect(() => {
    return () => {
      stopMediaStream();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="border-t border-slate-200 bg-white p-3">
      {pendingImage && (
        <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-medium text-slate-600">Imagem selecionada (envie pelo botao principal)</p>
          <div className="flex flex-wrap items-end gap-3">
            <img src={pendingImage.previewUrl} alt="Preview de envio" className="max-h-40 rounded-lg border border-slate-200 object-contain" />
            <button
              type="button"
              onClick={() => setPendingImage(null)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {pendingDocument && (
        <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-medium text-slate-600">Documento selecionado (envie pelo botao principal)</p>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{pendingDocument.filename ?? "documento"}</p>
              <p className="text-xs text-slate-500">{(pendingDocument.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              type="button"
              onClick={() => setPendingDocument(null)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={disabled || sending}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          title="Enviar imagem"
        >
          <ImagePlus size={18} />
        </button>

        <button
          type="button"
          onClick={() => documentInputRef.current?.click()}
          disabled={disabled || sending}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          title="Anexar documento"
        >
          <FileText size={18} />
        </button>

        <button
          type="button"
          onClick={() => {
            if (recording) {
              stopRecording();
              return;
            }
            void startRecording();
          }}
          disabled={disabled || sending}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition disabled:opacity-60 ${
            recording
              ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
              : "border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
          title={recording ? "Parar gravacao" : "Gravar audio"}
        >
          {recording ? <Square size={16} /> : <Mic size={18} />}
        </button>

        <textarea
          ref={textAreaRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleTextKeyDown}
          rows={1}
          placeholder="Digite uma mensagem"
          className="min-h-10 max-h-[220px] flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          disabled={disabled || sending}
        />

        <button
          type="button"
          onClick={() => {
            void sendMessage();
          }}
          disabled={disabled || sending || (!pendingImage && !pendingDocument && text.trim().length === 0)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          title="Enviar"
        >
          <SendHorizonal size={18} />
        </button>
      </div>

      {slashQuery !== null && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-500">
            Respostas rapidas. Use variaveis: {"{primeiro_nome}"} e {"{nome_completo}"}
          </div>
          <div className="max-h-52 overflow-y-auto p-1.5">
            {filteredQuickReplies.length === 0 ? (
              <p className="px-2 py-2 text-xs text-slate-500">Nenhuma resposta rapida encontrada para "{slashQuery}".</p>
            ) : (
              filteredQuickReplies.map((reply) => (
                <button
                  key={reply.id}
                  type="button"
                  onClick={() => setText(reply.content)}
                  className="mb-1 block w-full rounded-lg px-2 py-2 text-left hover:bg-slate-50"
                >
                  <p className="truncate text-xs font-semibold text-slate-800">{reply.title}</p>
                  <p className="truncate text-xs text-slate-500">{reply.content}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleImageChange(event)} />
      <input
        ref={documentInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv,application/zip,application/x-rar-compressed"
        className="hidden"
        onChange={(event) => void handleDocumentChange(event)}
      />
      {recordError && <p className="mt-2 text-xs text-red-600">{recordError}</p>}
      {recording && <p className="mt-2 text-xs font-medium text-red-600">Gravando audio... clique no quadrado para enviar.</p>}
    </div>
  );
}
