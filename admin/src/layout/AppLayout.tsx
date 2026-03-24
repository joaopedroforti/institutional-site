import { Outlet } from "react-router";
import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import Backdrop from "./Backdrop";
import GlobalWhatsAppNotifier from "../components/whatsapp/GlobalWhatsAppNotifier";

function LayoutBody() {
  const { isExpanded, isHovered, isMobile } = useSidebar();
  const contentOffset = isMobile ? 0 : isExpanded || isHovered ? 256 : 80;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/60">
      <AppSidebar />
      <Backdrop />
      <GlobalWhatsAppNotifier />

      <div
        className="fixed right-0 top-0 z-0 overflow-x-hidden overflow-y-auto transition-[left] duration-300"
        style={{
          left: `${contentOffset}px`,
          bottom: 0,
        }}
      >
        <AppHeader />
        <main className="px-2 pb-3 pt-2 md:px-3 md:pb-4 md:pt-3">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function AppLayout() {
  return (
    <SidebarProvider>
      <LayoutBody />
    </SidebarProvider>
  );
}
