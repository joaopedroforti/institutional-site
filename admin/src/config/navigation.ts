import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  GitBranch,
  ClipboardList,
  FileText,
  Gauge,
  Users,
} from "lucide-react";

export type SidebarItem = {
  label: string;
  path: string;
  icon: LucideIcon;
};

export type SidebarGroup = {
  label: string;
  path?: string;
  icon: LucideIcon;
  children?: SidebarItem[];
};

export const SIDEBAR_ITEMS: SidebarGroup[] = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: Gauge,
  },
  {
    label: "Pipes",
    path: "/admin/pipes",
    icon: GitBranch,
  },
  {
    label: "Orcamentos",
    path: "/admin/orcamentos",
    icon: ClipboardList,
  },
  {
    label: "Propostas",
    path: "/admin/propostas",
    icon: FileText,
  },
  {
    label: "Analitico",
    path: "/admin/analitico",
    icon: BarChart3,
  },
  {
    label: "Configuracoes",
    path: "/admin/configuracoes",
    icon: Users,
  },
];
