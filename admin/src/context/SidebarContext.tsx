import { createContext, useContext, useEffect, useMemo, useState } from "react";

type SidebarContextType = {
  isExpanded: boolean;
  isHovered: boolean;
  isMobileOpen: boolean;
  isMobile: boolean;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  setIsHovered: (value: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const STORAGE_KEY = "forticorp_admin_sidebar_expanded";

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "0") {
      setIsExpanded(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, isExpanded ? "1" : "0");
  }, [isExpanded]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 900;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const value = useMemo<SidebarContextType>(
    () => ({
      isExpanded,
      isHovered,
      isMobileOpen,
      isMobile,
      toggleSidebar: () => setIsExpanded((prev) => !prev),
      toggleMobileSidebar: () => setIsMobileOpen((prev) => !prev),
      closeMobileSidebar: () => setIsMobileOpen(false),
      setIsHovered,
    }),
    [isExpanded, isHovered, isMobileOpen, isMobile],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }

  return context;
}
