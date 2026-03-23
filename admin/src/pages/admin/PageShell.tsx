import type { ReactNode } from "react";

type PageShellProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export default function PageShell({ children }: PageShellProps) {
  return <section className="space-y-3">{children}</section>;
}
