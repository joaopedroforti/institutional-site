import { useEffect } from "react";
import { AlertTriangle, Info, Loader2, ShieldAlert } from "lucide-react";

type AlertModalIntent = "info" | "warning" | "danger";

type AlertModalProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  intent?: AlertModalIntent;
  loading?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
};

const INTENT_STYLES: Record<AlertModalIntent, { icon: typeof Info; iconClass: string; buttonClass: string }> = {
  info: {
    icon: Info,
    iconClass: "bg-blue-100 text-blue-700",
    buttonClass: "bg-blue-700 hover:bg-blue-600",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "bg-amber-100 text-amber-700",
    buttonClass: "bg-amber-600 hover:bg-amber-500",
  },
  danger: {
    icon: ShieldAlert,
    iconClass: "bg-red-100 text-red-700",
    buttonClass: "bg-red-700 hover:bg-red-600",
  },
};

export default function AlertModal({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  intent = "warning",
  loading = false,
  onConfirm,
  onClose,
}: AlertModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    };

    document.addEventListener("keydown", onEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "unset";
    };
  }, [open, loading, onClose]);

  if (!open) {
    return null;
  }

  const style = INTENT_STYLES[intent];
  const Icon = style.icon;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${style.iconClass}`}>
            <Icon size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {description && <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              void onConfirm();
            }}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${style.buttonClass}`}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
