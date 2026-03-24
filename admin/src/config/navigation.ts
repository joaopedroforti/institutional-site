import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  GitBranch,
  ClipboardList,
  Gauge,
  MessageCircleMore,
  Users,
  UserCog,
  SlidersHorizontal,
  Settings2,
  Settings,
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
    label: "Propostas",
    path: "/admin/orcamentos",
    icon: ClipboardList,
  },
  {
    label: "WhatsApp",
    path: "/admin/whatsapp",
    icon: MessageCircleMore,
  },
  {
    label: "Analitico",
    path: "/admin/analitico",
    icon: BarChart3,
  },
  {
    label: "Configuracoes",
    icon: Users,
    children: [
      {
        label: "Vendedores",
        path: "/admin/configuracoes/vendedores",
        icon: UserCog,
      },
      {
        label: "Propostas",
        path: "/admin/configuracoes/propostas",
        icon: Settings2,
      },
      {
        label: "Configuracoes Gerais",
        path: "/admin/configuracoes/gerais",
        icon: Settings,
      },
      {
        label: "Precificacao",
        path: "/admin/configuracoes/precificacao",
        icon: SlidersHorizontal,
      },
      {
        label: "WhatsApp",
        path: "/admin/configuracoes/whatsapp",
        icon: MessageCircleMore,
      },
    ],
  },
];
