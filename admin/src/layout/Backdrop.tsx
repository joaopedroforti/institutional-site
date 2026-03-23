import { useSidebar } from "../context/SidebarContext";

export default function Backdrop() {
  const { isMobileOpen, closeMobileSidebar } = useSidebar();

  if (!isMobileOpen) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label="Fechar menu"
      onClick={closeMobileSidebar}
      className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
    />
  );
}
