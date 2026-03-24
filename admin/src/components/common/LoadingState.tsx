import { Loader2 } from "lucide-react";

type LoadingStateProps = {
  label?: string;
  fullScreen?: boolean;
  className?: string;
};

export default function LoadingState({
  label = "Carregando...",
  fullScreen = false,
  className = "",
}: LoadingStateProps) {
  const base = fullScreen
    ? "flex min-h-screen items-center justify-center bg-slate-100"
    : "rounded-2xl border border-slate-200 bg-white p-6";

  return (
    <div className={`${base} ${className}`}>
      <div className="flex items-center gap-3 text-slate-600">
        <Loader2 size={18} className="animate-spin text-blue-600" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}
