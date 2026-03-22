import { ReactNode } from "react";
import SuperadminShell from "./components/superadmin-shell";

export default function SuperadminLayout({ children }: { children: ReactNode }) {
  return <SuperadminShell>{children}</SuperadminShell>;
}
