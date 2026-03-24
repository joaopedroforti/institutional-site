export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function conversationDisplayName(conversation: {
  subject?: string | null;
  contact?: { display_name?: string | null; push_name?: string | null; phone?: string | null } | null;
  phone?: string | null;
}): string {
  return (
    conversation.subject ||
    conversation.contact?.display_name ||
    conversation.contact?.push_name ||
    conversation.contact?.phone ||
    conversation.phone ||
    "Sem nome"
  );
}

export function toDataUrl(base64: string, mime: string) {
  if (base64.startsWith("data:")) {
    return base64;
  }

  return `data:${mime};base64,${base64}`;
}

export function normalizeConversationPreview(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) {
    return "Sem mensagens";
  }

  const normalized = raw.toLowerCase();
  const map: Record<string, string> = {
    "[mensagem]": "Mensagem",
    "mensagem": "Mensagem",
    "[image]": "Imagem",
    "[imagem]": "Imagem",
    "imagem": "Imagem",
    "[audio]": "Áudio",
    "audio": "Áudio",
    "áudio": "Áudio",
    "[video]": "Vídeo",
    "video": "Vídeo",
    "vídeo": "Vídeo",
    "[document]": "Documento",
    "[documento]": "Documento",
    "document": "Documento",
    "documento": "Documento",
    "[sticker]": "Sticker",
    "sticker": "Sticker",
  };

  if (map[normalized]) {
    return map[normalized];
  }

  return raw.replace(/\s+/g, " ");
}
