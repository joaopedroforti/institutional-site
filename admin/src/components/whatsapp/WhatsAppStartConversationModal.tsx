import { FormEvent, useState } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onStart: (payload: { phone: string; display_name?: string }) => Promise<void>;
};

export default function WhatsAppStartConversationModal({ open, onClose, onStart }: Props) {
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) {
    return null;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (!phone.trim() || saving) {
      return;
    }

    setSaving(true);
    try {
      await onStart({
        phone: phone.trim(),
        display_name: displayName.trim() || undefined,
      });
      setPhone("");
      setDisplayName("");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <form
        onSubmit={(event) => {
          void submit(event);
        }}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Nova conversa</h3>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-sm text-slate-700">
            <span className="mb-1 block text-xs text-slate-500">WhatsApp</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="5511999990000"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>

          <label className="block text-sm text-slate-700">
            <span className="mb-1 block text-xs text-slate-500">Nome do contato (opcional)</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">
            {saving ? "Criando..." : "Iniciar"}
          </button>
        </div>
      </form>
    </div>
  );
}
